import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { initDb } from "./config/db.js";
import authRouter from "./routes/auth.js"
import usersRouter from "./routes/users.js"; 
import booksRouter from "./routes/books.js";
import reviewsRouter from "./src/routes/reviews.js";
import commentsRouter from "./src/routes/comments.js";
import favoritesRouter from "./src/routes/favorites.js";
import ordersRouter from "./src/routes/orders.js";
import librariesRouter from "./src/routes/libraries.js";
import userLikesRouter from "./src/routes/userLikes.js";
import authorsRouter from "./src/routes/authors.js";
import categoriesRouter from "./src/routes/categories.js";
import paymentsRouter from "./src/routes/payments.js";
import adminUsersRouter from "./src/routes/adminUsers.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
  res.json({ status: "OK", time: new Date().toISOString() });
});

// TODO: 각 리소스 라우트 연결
app.use("/auth", authRouter);  
app.use("/users", usersRouter); 
app.use("/books", booksRouter);
app.use("/", reviewsRouter);
app.use("/", commentsRouter);
app.use("/favorites", favoritesRouter);
app.use("/orders", ordersRouter);
app.use("/libraries", librariesRouter);
app.use("/", userLikesRouter);
app.use("/authors", authorsRouter);
app.use("/categories", categoriesRouter);
app.use("/", paymentsRouter);
app.use("/", adminUsersRouter);

// Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
