// src/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const { config } = require("./config/env");
const { errorHandler } = require("./common/middleware/errorHandler");

const authRouter = require("./modules/auth/auth.route");
const postRouters = require("./modules/post/post.route");
const checklistRouter = require("./modules/checklist/checklist.route");
const userRouter = require("./modules/user/user.route");
const likeRouter = require("./modules/interaction/like.route");
const placesRouter = require("./modules/places/places.route");
const searchRouter = require("./routes/search.route");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/checklists", checklistRouter);
app.use("/api/posts", postRouters);
app.use("/api", require("./modules/interaction/comment.route"));
app.use("/api/user", userRouter);
app.use("/api", likeRouter);
app.use("/api", placesRouter);
app.use("/api/ai", require("./modules/ai/mz.route"));
app.use("/api/search", searchRouter);

app.get("/", (req, res) => {
  res.json({ message: "Yogizogi Backend API" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);

module.exports = app;
