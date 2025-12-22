// src/modules/upload/upload.route.js
const express = require("express");
const router = express.Router();
const { getPresignedUrl } = require("../upload/upload.controller");

router.post("/presigned-url", getPresignedUrl);

module.exports = router;
