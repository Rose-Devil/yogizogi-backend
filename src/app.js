// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// ✅ 추가: swagger ui, spec
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const { errorHandler } = require("./common/middleware/errorHandler");
const authRouter = require("./modules/auth/auth.route");

const app = express();

app.use(express.json());
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
app.use(errorHandler);

module.exports = app;
