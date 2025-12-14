// /api/auth/*
// X_Server router/auth.mjs 흐름 유지
const express = require("express");
const authController = require("./auth.controller");
const { validateLogin, validateSignup } = require("./auth.types");
const { validateRequest } = require("../../common/middleware/validateRequest");
const { authGuard } = require("../../common/middleware/authGuard");

const router = express.Router();

// 회원가입
router.post("/signup", validateSignup, validateRequest, authController.signup);

// 로그인
router.post("/login", validateLogin, validateRequest, authController.login);

// 로그인 유지 (X_Server는 POST /me)
router.post("/me", authGuard, authController.me);

module.exports = router;
