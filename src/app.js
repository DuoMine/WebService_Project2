// src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { initDb } from "./config/db.js";
import { createRequire } from "module";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import booksRouter from "./routes/books.js";
import reviewsRouter from "./routes/reviews.js";
import favoritesRouter from "./routes/favorites.js";
import ordersRouter from "./routes/orders.js";
import librariesRouter from "./routes/libraries.js";
import authorsRouter from "./routes/authors.js";
import categoriesRouter from "./routes/categories.js";
import sellersRouter from "./routes/sellers.js";
import cartsRouter from "./routes/carts.js";
import couponsRouter from "./routes/coupons.js";

import { globalLimiter, authLimiter } from "./middlewares/rateLimit.js";

dotenv.config();

export async function createApp() {
  const app = express();
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json");

  // DB 연결
  await initDb();

  // 공통 미들웨어
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(globalLimiter);

  // Health Check
  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      version: pkg.version,
      time: new Date().toISOString(),
    });
  });

  // Routes
  app.use("/auth", authLimiter, authRouter);
  app.use("/users", usersRouter);
  app.use("/books", booksRouter);
  app.use("/reviews", reviewsRouter);
  app.use("/favorites", favoritesRouter);
  app.use("/orders", ordersRouter);
  app.use("/libraries", librariesRouter);
  app.use("/authors", authorsRouter);
  app.use("/categories", categoriesRouter);
  app.use("/sellers", sellersRouter);
  app.use("/carts", cartsRouter);
  app.use("/coupons", couponsRouter);

  // Swagger
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Error handler
  app.use(errorHandler);

  return app;
}
