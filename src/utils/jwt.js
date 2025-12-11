// src/utils/jwt.js
import jwt from "jsonwebtoken";

const {
  JWT_ACCESS_SECRET = "dev-access-secret",
  JWT_REFRESH_SECRET = "dev-refresh-secret",
  JWT_ACCESS_EXPIRES_IN = "900s",     // 15분
  JWT_REFRESH_EXPIRES_IN = "7d",      // 7일
} = process.env;

// 🔹 쿠키 이름 고정
export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

// 🔹 공통: 환경에 따라 secure / sameSite 다르게
function baseCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,              // HTTPS면 true
    sameSite: isProd ? "none" : "lax",
    path: "/",                   // 전체에 대해 유효
    // maxAge는 안 줘도 됨 (세션 쿠키). 필요하면 아래에서 추가로 세팅.
  };
}

export function getAccessCookieOptions() {
  return {
    ...baseCookieOptions(),
    // 필요하면 여기서 maxAge 지정 (예: 15분)
    // maxAge: 15 * 60 * 1000,
  };
}

export function getRefreshCookieOptions() {
  return {
    ...baseCookieOptions(),
    // 필요하면 여기서 maxAge 지정 (예: 7일)
    // maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function signAccessToken(user) {
  const payload = {
    sub: String(user.id),
    role: user.role,
  };

  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
}

export function signRefreshToken(user, tokenId) {
  const payload = {
    sub: String(user.id),
    jti: tokenId, // refresh token row id
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
