// src/middlewares/rateLimit.js
import rateLimit from "express-rate-limit";
import { sendError } from "../utils/http.js";

/**
 * 공통 rate limit 에러 핸들러
 * - 과제 에러 포맷(sendError)로 429 반환
 */
function rateLimitHandler(req, res /*, next, options */) {
  return sendError(res, 429, "TOO_MANY_REQUESTS", "too many requests");
}

/**
 * 전역
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1분
  max: 300,                 // 1분에 300회 (넉넉)
  standardHeaders: true,    // RateLimit-* 헤더
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * 인증 없는/공격 타겟 엔드포인트(로그인 등)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 30,                  // 15분에 30회
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
