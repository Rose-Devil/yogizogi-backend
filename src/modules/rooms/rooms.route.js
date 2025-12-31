const express = require("express");
const { body } = require("express-validator");
const { authGuard } = require("../../common/middleware/authGuard");
const roomsController = require("./rooms.controller");
const invitesController = require("../invites/invites.controller");

const router = express.Router();

router.use(authGuard);

router.get("/", roomsController.list);

router.post(
  "/",
  [
    body("title").isString().trim().isLength({ min: 1, max: 255 }).withMessage("title이 필요합니다."),
    body("description").optional().isString().isLength({ max: 500 }).withMessage("description이 올바르지 않습니다."),
    body("travelStartDate").optional({ nullable: true }).isISO8601().withMessage("travelStartDate 형식이 올바르지 않습니다."),
    body("travelEndDate").optional({ nullable: true }).isISO8601().withMessage("travelEndDate 형식이 올바르지 않습니다."),
  ],
  roomsController.create
);

router.get("/:roomId", roomsController.detail);
router.post("/:roomId/invites", invitesController.create);
router.post("/:roomId/members/:userId/role", roomsController.changeMemberRole);

module.exports = router;
