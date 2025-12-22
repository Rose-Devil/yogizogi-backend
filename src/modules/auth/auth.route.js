// src/modules/auth/auth.route.js
const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const { validateLogin, validateSignup } = require("./auth.types");
const { validateRequest } = require("../../common/middleware/validateRequest");
const { authGuard } = require("../../common/middleware/authGuard");

router.post("/signup", validateSignup, validateRequest, authController.signup);
router.post("/login", validateLogin, validateRequest, authController.login);
router.get("/me", authGuard, authController.me);

// refresh??access ?????????? ???)
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
