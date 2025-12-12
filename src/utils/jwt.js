// src/utils/jwt.js
import jwt from "jsonwebtoken";

const {
  JWT_ACCESS_SECRET = "dev-access-secret",
  JWT_REFRESH_SECRET = "dev-refresh-secret",
  JWT_ACCESS_EXPIRES_IN = "900s", // 15분
  JWT_REFRESH_EXPIRES_IN = "7d",  // 7일
  COOKIE_SECURE = "false",        // 배포 환경에서 https면 true
} = process.env;

// 쿠키 이름 고정
export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

// 공통 쿠키 옵션 (과제/JCloud 기준으로 보수적으로)
function baseCookieOptions() {
  const isSecure = COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
  };
}

export function getAccessCookieOptions() {
  // access는 세션 쿠키로 두는 게 깔끔함 (maxAge 생략)
  return {
    ...baseCookieOptions(),
  };
}

export function getRefreshCookieOptions() {
  // refresh는 7일 지속
  return {
    ...baseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
