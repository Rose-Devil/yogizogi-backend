// src/app.js (또는 프로젝트의 app.js)
const express = require("express");
const { errorHandler } = require("./common/middleware/errorHandler");
const authRouter = require("./modules/auth/auth.route");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express(); // ✅ app 선언을 먼저

// JSON body 파싱
app.use(express.json());

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 라우터
app.use("/api/auth", authRouter); // ✅ 추천: /api/auth 로 통일

// 에러 핸들러(마지막)
app.use(errorHandler);

module.exports = app;
