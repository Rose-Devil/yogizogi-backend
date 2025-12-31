const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const { requireRoomRole } = require("../rooms/rooms.middleware");
const itineraryController = require("./itinerary.controller");

const router = express.Router({ mergeParams: true });

router.use(authGuard);

router.get("/", requireRoomRole("VIEWER"), itineraryController.list);
router.post("/", requireRoomRole("EDITOR"), itineraryController.create);
router.patch("/reorder", requireRoomRole("EDITOR"), itineraryController.reorder);
router.patch("/:itemId", requireRoomRole("EDITOR"), itineraryController.patch);
router.delete("/:itemId", requireRoomRole("EDITOR"), itineraryController.remove);

module.exports = router;
