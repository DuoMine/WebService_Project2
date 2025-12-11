// src/middlewares/auth.js
import crypto from "crypto";
import {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAccessCookieOptions,
} from "../utils/jwt.js";
import { models } from "../config/db.js";
import { Op } from "sequelize";

const { Users, UserRefreshTokens } = models;

function sendError(res, status, code, message, details = undefined) {
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    path: res.req.originalUrl,
    status,
    code,
    message,
    details,
  });
}

// refresh 토큰 해시 함수 (auth.js랑 동일하게)
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Access Token 검증 + 자동 refresh + 유저 로드
export async function requireAuth(req, res, next) {
  // 1순위: 쿠키
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];

  // 2순위: Authorization: Bearer ...
  const auth = req.headers["authorization"];
  const headerToken =
    auth && auth.startsWith("Bearer ")
      ? auth.slice("Bearer ".length).trim()
      : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return sendError(res, 401, "UNAUTHORIZED", "access token missing");
  }

  try {
    // 1차 시도: access 토큰 검증
    const decoded = verifyAccessToken(token);
    const userId = decoded.sub;

    const user = await Users.findOne({
      where: {
        id: userId,
        status: "ACTIVE",
        deleted_at: { [Op.is]: null },
      },
    });

    if (!user) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "user not found or inactive"
      );
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      tokenExp: decoded.exp,
      payload: decoded,
    };
    req.user = user;

    return next();
  } catch (err) {
    // access 토큰이 만료된 경우에만 자동 refresh 시도
    if (err.name !== "TokenExpiredError") {
      console.error("requireAuth error:", err);
      return sendError(
        res,
        401,
        "TOKEN_EXPIRED",
        "invalid or expired access token"
      );
    }

    // 🔹 여기서부터는 "만료" 케이스: refresh 쿠키로 재발급 시도
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!refreshToken) {
        return sendError(
          res,
          401,
          "TOKEN_EXPIRED",
          "access token expired, refresh token missing"
        );
      }

      const decodedRt = verifyRefreshToken(refreshToken); // { sub, jti }
      const tokenId = decodedRt.jti;
      const userId = decodedRt.sub;

      const row = await UserRefreshTokens.findOne({
        where: { id: tokenId, user_id: userId },
      });

      if (!row || row.revoked_at || row.expires_at < new Date()) {
        return sendError(
          res,
          401,
          "TOKEN_EXPIRED",
          "refresh token expired or revoked"
        );
      }

      const incomingHash = hashToken(refreshToken);
      if (row.refresh_token_hash !== incomingHash) {
        return sendError(
          res,
          401,
          "UNAUTHORIZED",
          "invalid refresh token"
        );
      }

      const user = await Users.findOne({
        where: {
          id: userId,
          status: "ACTIVE",
          deleted_at: { [Op.is]: null },
        },
      });

      if (!user) {
        return sendError(
          res,
          401,
          "UNAUTHORIZED",
          "user not found or inactive"
        );
      }

      // 새 access 토큰 발급
      const newAccessToken = signAccessToken(user);

      // 쿠키 갱신 (브라우저용)
      res.cookie(
        ACCESS_COOKIE_NAME,
        newAccessToken,
        getAccessCookieOptions()
      );

      // 새 토큰 decode 해서 req.auth 채우기
      const newDecoded = verifyAccessToken(newAccessToken);

      req.auth = {
        userId: user.id,
        role: user.role,
        tokenExp: newDecoded.exp,
        payload: newDecoded,
      };
      req.user = user;

      return next();
    } catch (refreshErr) {
      console.error("requireAuth auto-refresh error:", refreshErr);
      return sendError(
        res,
        401,
        "TOKEN_EXPIRED",
        "invalid or expired refresh token"
      );
    }
  }
}

// Role 체크 (ADMIN 전용 등)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return sendError(res, 401, "UNAUTHORIZED", "authentication required");
    }

    if (!roles.includes(req.auth.role)) {
      return sendError(res, 403, "FORBIDDEN", "insufficient permission", {
        required: roles,
        actual: req.auth.role,
      });
    }

    next();
  };
}
