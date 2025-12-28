const express = require("express");
const checklistController = require("./checklist.controller");
const { authGuard } = require("../../common/middleware/authGuard");

const router = express.Router();

router.get("/", authGuard, checklistController.list);
router.post("/", authGuard, checklistController.create);
router.get("/:id", authGuard, checklistController.detail);
router.post("/:id/items", authGuard, checklistController.addItem);
router.patch("/:id/items/:itemId", authGuard, checklistController.updateItemStatus);
router.delete("/:id/items/:itemId", authGuard, checklistController.removeItem);

module.exports = router;

