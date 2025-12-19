// src/modules/auth/auth.route.js
const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const { validateLogin, validateSignup } = require("./auth.types");
const { validateRequest } = require("../../common/middleware/validateRequest");
const { authGuard } = require("../../common/middleware/authGuard");

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입
 */
router.post("/signup", validateSignup, validateRequest, authController.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 */
router.post("/login", validateLogin, validateRequest, authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 내 정보 조회
 *     security:
 *       - bearerAuth: []
 */
router.get("/me", authGuard, authController.me);

// refresh는 access 없어도 됨(쿠키 기반)
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Silent Refresh
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 */
router.post("/logout", authController.logout);

module.exports = router;
