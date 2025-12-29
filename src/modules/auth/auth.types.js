const { body } = require("express-validator");

const validateLogin = [
  body("email").trim().isEmail().withMessage("이메일 형식 확인"),
  body("password").trim().isLength({ min: 4 }).withMessage("최소 4자이상 입력"),
];

const validateSignup = [
  ...validateLogin,
  body("nickname").trim().notEmpty().withMessage("nickname을 입력"),
  body("signupTicket").notEmpty().withMessage("이메일 인증이 필요합니다."),
];

const validateEmailOnly = [
  body("email").trim().isEmail().withMessage("이메일 형식 확인"),
];

const validateVerifyCode = [
  body("email").trim().isEmail().withMessage("이메일 형식 확인"),
  body("code").trim().isLength({ min: 6, max: 6 }).withMessage("6자리 코드 입력"),
];

const validateChangePasswordConfirm = [
  body("oldPassword").trim().isLength({ min: 4 }).withMessage("기존 비밀번호 입력"),
  body("newPassword").trim().isLength({ min: 8 }).withMessage("새 비밀번호는 8자 이상 권장"),
  body("code").trim().isLength({ min: 6, max: 6 }).withMessage("6자리 코드 입력"),
];

module.exports = {
  validateLogin,
  validateSignup,
  validateEmailOnly,
  validateVerifyCode,
  validateChangePasswordConfirm,
};
