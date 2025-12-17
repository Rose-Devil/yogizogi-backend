// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const { errorHandler } = require("./common/middleware/errorHandler");
const authRouter = require("./modules/auth/auth.route");

const app = express();

app.use(express.json());
app.use(cookieParser());

// 프론트가 다른 origin이면 credentials 필요
app.use(
  cors({
    origin: "http://localhost:3000", // 프론트 주소로 변경
    credentials: true,
  })
);

app.use("/api/auth", authRouter);
app.use(errorHandler);

module.exports = app;
