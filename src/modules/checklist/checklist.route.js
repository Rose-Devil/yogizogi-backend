const express = require("express");
const router = express.Router();
const { authGuard } = require("../../common/middleware/authGuard");
const checklistController = require("./checklist.controller");

router.use(authGuard);

router.get("/", checklistController.list);
router.post("/", checklistController.create);
router.post("/join", checklistController.join);

router.get("/:id", checklistController.detail);

router.post("/:id/items", checklistController.addItem);
router.patch("/:id/items/:itemId", checklistController.updateItemStatus);
router.delete("/:id/items/:itemId", checklistController.removeItem);

router.get("/:id/locations", checklistController.listLocations);
router.post("/:id/locations", checklistController.addLocation);
router.delete("/:id/locations", checklistController.clearLocations);
router.delete("/:id/locations/:locationId", checklistController.removeLocation);
router.patch("/:id/locations/reorder", checklistController.reorderLocations);

module.exports = router;
