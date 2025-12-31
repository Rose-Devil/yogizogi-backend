const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const { rateLimit } = require("../../common/middleware/rateLimit");
const invitesController = require("./invites.controller");

const router = express.Router();

router.use(authGuard);

// Brute-force protection for 6-digit codes
router.post(
  "/accept",
  rateLimit({
    keyPrefix: "invites_accept",
    windowMs: 60_000,
    max: 20,
    getKey: (req) => `${req.ip}:${String(req.body?.code || "").trim().slice(0, 6) || "token"}`,
    message: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
  }),
  invitesController.accept
);

module.exports = router;

