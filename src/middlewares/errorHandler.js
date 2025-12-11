export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";

  const body = {
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    status,
    code,
    message: err.message || "Internal server error",
  };

  if (err.details) body.details = err.details;

  console.error("🔥 ERROR", status, code, err.stack);

  res.status(status).json(body);
}
