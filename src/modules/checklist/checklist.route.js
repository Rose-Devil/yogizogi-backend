const express = require("express")
const router = express.Router()
const { authGuard } = require("../../common/middleware/authGuard")
const checklistController = require("./checklist.controller")

// 인증 필요
router.use(authGuard)

// 목록
router.get("/", checklistController.list)

// 생성
router.post("/", checklistController.create)

// 상세
router.get("/join/preview", checklistController.getInvitePreview)
router.post("/join", checklistController.join)
router.post("/join/request-otp", checklistController.requestJoinOtp)
router.post("/join/verify-otp", checklistController.verifyJoinOtp)

router.get("/:id", checklistController.detail)
router.get("/:id/invite", checklistController.getInviteCode)

// 아이템 추가
router.post("/:id/items", checklistController.addItem)

// 아이템 상태 업데이트
router.patch("/:id/items/:itemId", checklistController.updateItemStatus)

// 아이템 삭제
router.delete("/:id/items/:itemId", checklistController.removeItem)
router.delete("/:id/leave", checklistController.leave)

module.exports = router

