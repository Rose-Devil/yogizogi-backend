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

// 상세
router.get("/join/preview", checklistController.getInvitePreview);
router.post("/join", checklistController.join);
router.post("/join/request-otp", checklistController.requestJoinOtp);
router.post("/join/verify-otp", checklistController.verifyJoinOtp);

router.get("/:id", checklistController.detail);
router.get("/:id/invite", checklistController.getInviteCode);

// 아이템 추가
router.post("/:id/items", checklistController.addItem);

// 아이템 상태 업데이트
router.patch("/:id/items/:itemId", checklistController.updateItemStatus);

// 아이템 삭제
router.delete("/:id/items/:itemId", checklistController.removeItem);
router.delete("/:id/leave", checklistController.leave);

module.exports = router;

module.exports = router;
