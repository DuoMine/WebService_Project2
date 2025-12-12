// src/utils/http.js

export function sendError(res, status, code, message, details = undefined) {
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    path: res.req?.originalUrl,
    status,
    code,
    message,
    details,
  });
}
