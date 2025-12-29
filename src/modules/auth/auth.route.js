// src/modules/auth/auth.route.js
const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const {
  validateLogin,
  validateSignup,
  validateEmailOnly,
  validateVerifyCode,
  validateChangePasswordConfirm,
} = require("./auth.types");

const { validateRequest } = require("../../common/middleware/validateRequest");
const { authGuard } = require("../../common/middleware/authGuard");
const { profileImageUpload } = require("../../common/middleware/upload");

router.post("/signup/request-code", validateEmailOnly, validateRequest, authController.signupRequestCode);
router.post("/signup/verify-code", validateVerifyCode, validateRequest, authController.signupVerifyCode);

router.post("/signup", validateSignup, validateRequest, authController.signup);
router.post("/login", validateLogin, validateRequest, authController.login);
router.get("/me", authGuard, authController.me);
router.post(
  "/me/profile-image",
  authGuard,
  profileImageUpload.single("image"),
  authController.updateProfileImage
);

// ✅ 비밀번호 변경(로그인 필요 + 이메일 인증)
router.post("/password/change/request-code", authGuard, authController.changePasswordRequestCode);
router.post("/password/change/confirm", authGuard, validateChangePasswordConfirm, validateRequest, authController.changePasswordConfirm);

// refresh access
router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

module.exports = router;
