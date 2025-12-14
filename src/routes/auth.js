// src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { models } from "../config/db.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAccessCookieOptions,
  getRefreshCookieOptions,
} from "../utils/jwt.js";
import { sendError } from "../utils/http.js";

const router = Router();
const { Users, UserRefreshTokens, Carts } = models;

// 토큰 해시
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// "900", "900s", "15m" 같은 값을 seconds로
function parseExpiresToSeconds(raw, fallbackSeconds) {
  const s = String(raw ?? "").trim();
  if (!s) return fallbackSeconds;

  // pure number
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  // number + unit
  const m = s.match(/^(\d+)\s*([smhd])$/i);
  if (!m) return fallbackSeconds;

  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 60 * 60;
  if (unit === "d") return n * 24 * 60 * 60;
  return fallbackSeconds;
}

const ACCESS_EXPIRES_SECONDS = parseExpiresToSeconds(process.env.JWT_ACCESS_EXPIRES_IN, 900);

// ----------------------------
// 회원가입 검증
// ----------------------------
function validateRegisterBody(body) {
  const errors = {};

  if (!body.email || typeof body.email !== "string") {
    errors.email = "email is required";
  } else if (body.email.length > 100) {
    errors.email = "email must be <= 100 chars";
  }

  if (!body.password || typeof body.password !== "string") {
    errors.password = "password is required";
  } else if (body.password.length < 8 || body.password.length > 64) {
    errors.password = "password length must be 8~64";
  }

  if (!body.name || typeof body.name !== "string") {
    errors.name = "name is required";
  } else if (body.name.length > 50) {
    errors.name = "name must be <= 50 chars";
  }

  const birth = Number(body.birth_year);
  if (!birth || !Number.isInteger(birth)) {
    errors.birth_year = "birth_year must be integer";
  } else if (birth < 1900 || birth > new Date().getFullYear()) {
    errors.birth_year = "birth_year must be between 1900 and current year";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender && !allowedGender.includes(body.gender)) {
    errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (!body.region_code || typeof body.region_code !== "string") {
    errors.region_code = "region_code is required";
  } else if (body.region_code.length > 10) {
    errors.region_code = "region_code must be <= 10 chars";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      email: body.email.trim(),
      password: body.password,
      name: body.name.trim(),
      birth_year: birth,
      gender: body.gender || "UNKNOWN",
      region_code: body.region_code.trim(),
      phone_number: body.phone_number?.trim() || null,
    },
  };
}

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: 인증/토큰 API
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: 회원가입
 *     security: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, birth_year, region_code]
 *             properties:
 *               email: { type: string, example: user1@example.com }
 *               password: { type: string, example: "password1234" }
 *               name: { type: string, example: "사용자1" }
 *               phone_number: { type: string, nullable: true }
 *               birth_year: { type: integer, example: 2000 }
 *               gender: { type: string, enum: [MALE, FEMALE, UNKNOWN] }
 *               region_code: { type: string, example: "KR-11" }
 *     responses:
 *       201: { description: Created }
 *       400: { description: VALIDATION_FAILED }
 *       409: { description: DUPLICATE_RESOURCE }
 *       500: { description: INTERNAL_SERVER_ERROR }
 */
router.post("/register", async (req, res) => {
  const { ok, value, errors } = validateRegisterBody(req.body);
  if (!ok) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
  }

  const t = await Users.sequelize.transaction();
  try {
    const { email, phone_number } = value;

    const existing = await Users.findOne({ where: { email }, transaction: t });
    if (existing) {
      await t.rollback();
      return sendError(res, 409, "DUPLICATE_RESOURCE", "email already in use", { email });
    }

    if (phone_number) {
      const existingPhone = await Users.findOne({ where: { phone_number }, transaction: t });
      if (existingPhone) {
        await t.rollback();
        return sendError(res, 409, "DUPLICATE_RESOURCE", "phone_number already in use", { phone_number });
      }
    }

    const password_hash = await bcrypt.hash(value.password, 10);

    const user = await Users.create(
      {
        email: value.email,
        password_hash,
        name: value.name,
        phone_number: value.phone_number,
        birth_year: value.birth_year,
        gender: value.gender,
        region_code: value.region_code,
        role: "USER",
        status: "ACTIVE",
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await Carts.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        created_at: new Date(),
        updated_at: new Date(),
      },
      transaction: t,
    });

    await t.commit();

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      birth_year: user.birth_year,
      gender: user.gender,
      region_code: user.region_code,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("register error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to register user");
  }
});

// ----------------------------
// 로그인 검증
// ----------------------------
function validateLoginBody(body) {
  const errors = {};
  if (!body.email || typeof body.email !== "string") errors.email = "email is required";
  if (!body.password || typeof body.password !== "string") errors.password = "password is required";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { email: body.email.trim(), password: body.password } };
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 로그인
 *     security: [] 
 *     description: |
 *       - 성공 시 access_token, refresh_token 쿠키 설정
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "user1@example.com" }
 *               password: { type: string, example: "password1234" }
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       400:
 *         description: invalid body
 *       401:
 *         description: invalid credentials
 *       500:
 *         description: failed to login
 */
router.post("/login", async (req, res) => {
  const { ok, value, errors } = validateLoginBody(req.body);
  if (!ok) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
  }

  try {
    const user = await Users.findOne({
      where: { email: value.email, status: "ACTIVE" },
    });

    if (!user) return sendError(res, 401, "UNAUTHORIZED", "invalid email or password");

    const match = await bcrypt.compare(value.password, user.password_hash);
    if (!match) return sendError(res, 401, "UNAUTHORIZED", "invalid email or password");

    // refresh row 생성
    const placeholderHash = hashToken(crypto.randomUUID());
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshRow = await UserRefreshTokens.create({
      user_id: user.id,
      refresh_token_hash: placeholderHash,
      user_agent: req.headers["user-agent"]?.slice(0, 150) || null,
      ip_address: req.ip?.slice(0, 45) || null,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, refreshRow.id);

    refreshRow.refresh_token_hash = hashToken(refreshToken);
    await refreshRow.save();

    // 쿠키 세팅
    res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.json({
      token_type: "Bearer",
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_EXPIRES_SECONDS,
    });
  } catch (err) {
    console.error("login error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to login");
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 액세스 토큰 재발급 (refresh_token은 쿠키 또는 body)
 *     security: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: ok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token_type: { type: string, example: "Bearer" }
 *                 access_token: { type: string }
 *                 expires_in: { type: integer, example: 900 }
 *       400: { description: refresh_token is required }
 *       401: { description: invalid or expired refresh token }
 */
router.post("/refresh", async (req, res) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
  const fromBody = req.body?.refresh_token;
  const refresh_token = fromCookie || fromBody;

  if (!refresh_token || typeof refresh_token !== "string") {
    return sendError(res, 400, "BAD_REQUEST", "refresh_token is required");
  }

  try {
    const decoded = verifyRefreshToken(refresh_token); // { sub, jti, ... }
    const tokenId = decoded.jti;
    const userId = decoded.sub;

    const row = await UserRefreshTokens.findOne({
      where: { id: tokenId, user_id: userId },
    });

    if (!row || row.revoked_at || row.expires_at < new Date()) {
      return sendError(res, 401, "TOKEN_EXPIRED", "refresh token expired or revoked");
    }

    const incomingHash = hashToken(refresh_token);
    if (row.refresh_token_hash !== incomingHash) {
      return sendError(res, 401, "UNAUTHORIZED", "invalid refresh token");
    }

    const user = await Users.findByPk(userId);
    if (!user || user.status !== "ACTIVE") {
      return sendError(res, 401, "UNAUTHORIZED", "user not active");
    }

    // 새 Access Token 발급
    const accessToken = signAccessToken(user);

    // 쿠키 갱신
    res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
    res.cookie(REFRESH_COOKIE_NAME, refresh_token, getRefreshCookieOptions());

    return res.json({
      token_type: "Bearer",
      access_token: accessToken,
      expires_in: ACCESS_EXPIRES_SECONDS,
    });
  } catch (err) {
    console.error("refresh error:", err);
    return sendError(res, 401, "TOKEN_EXPIRED", "invalid or expired refresh token");
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 로그아웃 (refresh revoke + 쿠키 삭제)
 *     security: []   # access token 없어도 허용
 *     responses:
 *       204: { description: No Content }
 */
router.post("/logout", async (req, res) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];

  if (fromCookie) {
    try {
      const decoded = verifyRefreshToken(fromCookie);
      await UserRefreshTokens.update(
        { revoked_at: new Date() },
        { where: { id: decoded.jti, user_id: decoded.sub, revoked_at: null } }
      );
    } catch (_) {
      // 토큰이 망가져 있으면 그냥 쿠키만 지움
    }
  }

  // 쿠키 삭제
  res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });

  return res.status(204).send();
});

export default router;
