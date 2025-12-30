const express = require("express");
const router = express.Router();
const { authGuard } = require("../../common/middleware/authGuard");
const checklistController = require("./checklist.controller");

router.use(authGuard);

router.get("/", checklistController.list);
router.post("/", checklistController.create);

// inviteCode + 이메일 OTP 기반 참여
router.post("/join/request-otp", checklistController.requestJoinOtp);
router.post("/join/verify-otp", checklistController.verifyJoinOtp);
router.post("/join", checklistController.join);

router.get("/:id/invite", checklistController.getInvite);
router.get("/:id", checklistController.detail);
router.post("/:id/items", checklistController.addItem);
router.patch("/:id/items/:itemId", checklistController.updateItemStatus);
router.delete("/:id/items/:itemId", checklistController.removeItem);

module.exports = router;
