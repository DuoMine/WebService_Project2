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


// import usersRouter from "./routes/users.js";
// app.use("/users", usersRouter);

// Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
