// DTO
// X_Server router/auth.mjs의 validateLogin/validateSignup을 그대로 가져온 버전
const { body } = require("express-validator");

const validateLogin = [
  body("userid")
    .trim()
    .isLength({ min: 4 })
    .withMessage("최소 4자이상 입력")
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage("특수문자 사용불가"),
  body("password").trim().isLength({ min: 4 }).withMessage("최소 4자이상 입력"),
];

const validateSignup = [
  ...validateLogin,
  body("name").trim().notEmpty().withMessage("name을 입력"),
  body("email").trim().isEmail().withMessage("이메일 형식 확인"),
  // url은 선택값(없어도 됨)
];

module.exports = { validateLogin, validateSignup };
