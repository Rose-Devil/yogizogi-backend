// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// ✅ 추가: swagger ui, spec
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const { errorHandler } = require("./common/middleware/errorHandler");
const authRouter = require("./modules/auth/auth.route");
const postRouters = require("./modules/post/post.route");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ✅ Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouters);

// 기본 라우트
app.get("/", (req, res) => {
  res.json({ message: "Yogizogi Backend API" });
});

// 404 핸들러 (라우터 다음, 에러 핸들러 전에)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});
app.use(errorHandler);

module.exports = app;
