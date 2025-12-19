const express = require("express");
const cors = require("cors");
const userRouter = require("./modules/user/user.route");
const errorHandler = require("./common/middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/user", userRouter);

// 에러 핸들러 (맨 마지막)
app.use(errorHandler);

module.exports = app;
