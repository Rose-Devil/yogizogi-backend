// Express 앱 설정 (미들웨어, 라우터 연결)

const express = require("express");
const app = express();

// 기본 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
const postRouters = require("./modules/post/post.route");

app.use("/api/posts", postRouters);

// 기본 라우트
app.get("/", (req, res) => {
  res.json({ message: "Yogizogi Backend API" });
});

// 404 핸들러 (라우터 다음, 에러 핸들러 전에 위치)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// 에러 핸들러 (마지막에 위치해야 함)
const errorHandler = require("./common/middleware/errorHandler");
app.use(errorHandler);

module.exports = app;
