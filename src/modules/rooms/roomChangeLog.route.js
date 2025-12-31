const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const { requireRoomRole } = require("./rooms.middleware");
const controller = require("./roomChangeLog.controller");

const router = express.Router({ mergeParams: true });

router.use(authGuard);

router.get("/", requireRoomRole("VIEWER"), controller.list);

module.exports = router;

