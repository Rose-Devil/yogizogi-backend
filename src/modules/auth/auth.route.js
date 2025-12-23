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
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nickname
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@test.com
 *               password:
 *                 type: string
 *                 minLength: 4
 *                 example: "1234"
 *               nickname:
 *                 type: string
 *                 example: "테스트"
 *               url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/profile.jpg"
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 입력값 검증 실패
 *       409:
 *         description: 이미 존재하는 이메일
 */
router.post("/signup", validateSignup, validateRequest, authController.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@test.com
 *               password:
 *                 type: string
 *                 minLength: 4
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       400:
 *         description: 입력값 검증 실패
 *       401:
 *         description: 이메일 또는 비밀번호가 일치하지 않음
 */
router.post("/login", validateLogin, validateRequest, authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 내 정보 조회
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 내 정보 조회 성공
 *       401:
 *         description: 인증 실패
 */
router.get("/me", authGuard, authController.me);

// refresh는 access 없어도 됨(쿠키 기반)
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Silent Refresh (쿠키의 refresh token으로 새 access token 발급)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 새 access token 발급 성공
 *       401:
 *         description: Refresh token이 유효하지 않음
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post("/logout", authController.logout);

module.exports = router;
