// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Middleware
const { errorHandler } = require("./common/middleware/errorHandler");

// Routers
const authRouter = require("./modules/auth/auth.route");
const postRouters = require("./modules/post/post.route");
const userRouter = require("./modules/user/user.route");
const uploadRouter = require("./modules/upload/upload.route");
// const likeRouter = require("./modules/post/postLike.route");

const app = express();

// 기본 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS (쿠키 사용 시 credentials 필수)
// 프록시 연동 안정성을 위해 localhost와 127.0.0.1 모두 허용
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없는 경우(같은 출처 요청) 또는 허용된 출처인 경우
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// API 라우터
app.use("/api/auth", authRouter);
app.use("/api/posts", postRouters);
app.use("/api/user", userRouter);
app.use("/api/upload", uploadRouter);
// app.use("/api/like", likeRouter);

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
