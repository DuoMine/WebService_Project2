import express, { application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { initDb } from "./config/db.js";
import { createRequire } from "module";
import authRouter from "./routes/auth.js"
import usersRouter from "./routes/users.js"; 
import booksRouter from "./routes/books.js";
import reviewsRouter from "./routes/reviews.js";
import commentsRouter from "./routes/comments.js";
import favoritesRouter from "./routes/favorites.js";
import ordersRouter from "./routes/orders.js";
import librariesRouter from "./routes/libraries.js";
import likesRouter from "./routes/likes.js";
import authorsRouter from "./routes/authors.js";
import categoriesRouter from "./routes/categories.js";
import paymentsRouter from "./routes/payments.js";
import sellersRouter from "./routes/sellers.js";
import cartsRouter from "./routes/carts.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

// DB 연결
await initDb();

// 공통 미들웨어
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "OK", version: pkg.version, time: new Date().toISOString() });
});

// TODO: 각 리소스 라우트 연결
app.use("/auth", authRouter);  
app.use("/users", usersRouter); 
app.use("/books", booksRouter);
app.use("/reviews", reviewsRouter);
app.use("/comments", commentsRouter);
app.use("/favorites", favoritesRouter);
app.use("/orders", ordersRouter);
app.use("/libraries", librariesRouter);
app.use("/likes", likesRouter);
app.use("/authors", authorsRouter);
app.use("/categories", categoriesRouter);
app.use("/payments", paymentsRouter);
app.use("/sellers", sellersRouter);
app.use("/carts", cartsRouter);

// Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
