// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

// Middleware
const { errorHandler } = require("./common/middleware/errorHandler");

// Routers
const authRouter = require("./modules/auth/auth.route");
const postRouters = require("./modules/post/post.route");
const userRouter = require("./modules/user/user.route");
const likeRouter = require("./modules/interaction/like.route");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Local uploads (e.g. post images, profile images)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use(
  cors({
    origin: "http://localhost:5173", // 프론트 개발 서버 주소 하드코드 다시 변경.. 나중에 수정해야함..
    credentials: true,
  })
);

// API 라우터

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouters);
app.use("/api", require("./modules/interaction/comment.route")); // 댓글 라우터 추가
app.use("/api/user", userRouter);
app.use("/api", likeRouter);

app.get("/", (req, res) => {
  res.json({ message: "Yogizogi Backend API" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);

module.exports = app;
