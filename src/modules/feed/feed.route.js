// /api/feed
const express = require("express");
const feedController = require("./feed.controller");

const router = express.Router();

// GET /api/feed
router.get("/", feedController.list);

module.exports = router;

