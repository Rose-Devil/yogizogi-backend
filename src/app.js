// Express 앱 설정 (미들웨어, 라우터 연결)
// Express 앱 설정 (미들웨어, 라우터 연결)
const express = require("express");
const { errorHandler } = require("./common/middleware/errorHandler");
const authRouter = require("./modules/auth/auth.route");

const app = express();

// JSON body 파싱
app.use(express.json());

// 라우터
app.use("/auth", authRouter);

// 에러 핸들러(마지막)
app.use(errorHandler);

module.exports = app;
