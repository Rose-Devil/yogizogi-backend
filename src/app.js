// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { config } = require("./config/env");

// Middleware
const { errorHandler } = require("./common/middleware/errorHandler");

// Routers
const authRouter = require("./modules/auth/auth.route");
const postRouters = require("./modules/post/post.route");
const userRouter = require("./modules/user/user.route");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin:
      config.cors.origins.length === 1 ? config.cors.origins[0] : config.cors.origins,
    credentials: true,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouters);
app.use("/api/user", userRouter);

app.get("/", (req, res) => {
  res.json({ message: "Yogizogi Backend API" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);

module.exports = app;
