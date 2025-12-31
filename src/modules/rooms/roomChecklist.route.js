const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const { requireRoomRole } = require("./rooms.middleware");
const checklistController = require("./roomChecklist.controller");

const router = express.Router({ mergeParams: true });

router.use(authGuard);

router.get("/", requireRoomRole("VIEWER"), checklistController.list);
router.post("/", requireRoomRole("EDITOR"), checklistController.create);
router.patch("/:itemId", requireRoomRole("EDITOR"), checklistController.patch);
router.delete("/:itemId", requireRoomRole("EDITOR"), checklistController.remove);

module.exports = router;

