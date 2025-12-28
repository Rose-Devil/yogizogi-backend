const { body } = require("express-validator");

const validateLogin = [
  body("email").trim().isEmail().withMessage("이메일 형식 확인"),
  body("password").trim().isLength({ min: 4 }).withMessage("최소 4자이상 입력"),
];

const validateSignup = [
  ...validateLogin,
  body("nickname").trim().notEmpty().withMessage("nickname을 입력"),
  // url은 선택
];

module.exports = { validateLogin, validateSignup };
