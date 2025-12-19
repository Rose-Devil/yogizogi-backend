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

// ✅ Swagger Components(스키마)도 같이 두면 문서가 깔끔해짐
/**
 * @swagger
 * components:
 *   schemas:
 *     AuthSignupRequest:
 *       type: object
 *       required: [email, password, nickname]
 *       properties:
 *         email: { type: string, example: "test@example.com" }
 *         password: { type: string, example: "1234" }
 *         nickname: { type: string, example: "shin" }
 *         url: { type: string, nullable: true, example: null }
 *     AuthLoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, example: "test@example.com" }
 *         password: { type: string, example: "1234" }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         accessToken: { type: string }
 *         user:
 *           type: object
 *           properties:
 *             id: { type: number }
 *             email: { type: string }
 *             nickname: { type: string }
 *             url: { type: string, nullable: true }
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/AuthSignupRequest" }
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Set-Cookie:
 *             description: refresh_token이 HttpOnly 쿠키로 설정됨
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/AuthResponse" }
 */
router.post("/signup", authController.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/AuthLoginRequest" }
 *     responses:
 *       200:
 *         description: OK
 *         headers:
 *           Set-Cookie:
 *             description: refresh_token이 HttpOnly 쿠키로 설정됨
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/AuthResponse" }
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 내 정보 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/me", authController.me);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Silent Refresh (쿠키 refresh_token로 accessToken 재발급)
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃 (refresh_token 쿠키 삭제)
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/logout", authController.logout);

module.exports = router;
