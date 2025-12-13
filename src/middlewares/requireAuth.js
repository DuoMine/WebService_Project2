// src/middlewares/requireAuth.js
import { verifyAccessToken, ACCESS_COOKIE_NAME } from "../utils/jwt.js";
import { sendError } from "../utils/http.js";
import { models } from "../config/db.js";
import { Op } from "sequelize";

const { Users } = models;

// Access Token 검증 + 유저 로드 (자동 refresh 제거: 과제용으로 명확하게)
export async function requireAuth(req, res, next) {
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];

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
      return sendError(res, 401, "UNAUTHORIZED", "user not found or inactive");
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
    // 만료 vs 위조/형식오류 분리
    if (err?.name === "TokenExpiredError") {
      return sendError(res, 401, "TOKEN_EXPIRED", "access token expired");
    }
    console.error("requireAuth error:", err);
    return sendError(res, 401, "UNAUTHORIZED", "invalid access token");
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
