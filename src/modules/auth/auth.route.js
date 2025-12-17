// src/modules/auth/auth.route.js
const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const { validateLogin, validateSignup } = require("./auth.types");
const { validateRequest } = require("../../common/middleware/validateRequest");
const { authGuard } = require("../../common/middleware/authGuard");

router.post("/signup", validateSignup, validateRequest, authController.signup);
router.post("/login", validateLogin, validateRequest, authController.login);

router.post("/me", authGuard, authController.me);

// refresh는 access 없어도 됨(쿠키 기반)
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
