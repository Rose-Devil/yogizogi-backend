const express = require("express");
const mzController = require("./mz.controller");
const { authGuard } = require("../../common/middleware/authGuard");

const router = express.Router();

// POST /api/ai/mz-convert
router.post("/mz-convert", authGuard, mzController.convertText);

module.exports = router;
