// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// Middleware
const { errorHandler } = require("./common/middleware/errorHandler");

// Routers
const authRouter = require("./modules/auth/auth.route");
const postRouters = require("./modules/post/post.route");
const userRouter = require("./modules/user/user.route");

const app = express();

// 기본 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS (쿠키 사용 시 credentials 필수)
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API 라우터
app.use("/api/auth", authRouter);
app.use("/api/posts", postRouters);
app.use("/api/user", userRouter);

// 기본 라우트
app.get("/", (req, res) => {
  res.json({ message: "Yogizogi Backend API" });
});

// 404 핸들러 (라우터 다음, 에러 핸들러 전에)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// 에러 핸들러 (맨 마지막)
app.use(errorHandler);

module.exports = app;
