const { body } = require("express-validator");

const validateLogin = [
  body("email").trim().isEmail().withMessage("?대찓???뺤떇 ?뺤씤"),
  body("password").trim().isLength({ min: 4 }).withMessage("理쒖냼 4?먯씠???낅젰"),
];

const validateSignup = [
  ...validateLogin,
  body("nickname").trim().notEmpty().withMessage("nickname???낅젰"),
  body("signupTicket").notEmpty().withMessage("?대찓???몄쬆???꾩슂?⑸땲??"),
];

const validateEmailOnly = [
  body("email").trim().isEmail().withMessage("?대찓???뺤떇 ?뺤씤"),
];

const validateVerifyCode = [
  body("email").trim().isEmail().withMessage("?대찓???뺤떇 ?뺤씤"),
  body("code").trim().isLength({ min: 6, max: 6 }).withMessage("6?먮━ 肄붾뱶 ?낅젰"),
];

const validateChangePasswordConfirm = [
  body("oldPassword")
    .optional()
    .trim()
    .isLength({ min: 4 })
    .withMessage("湲곗〈 鍮꾨?踰덊샇 ?낅젰"),
  body("newPassword")
    .trim()
    .isLength({ min: 8 })
    .withMessage("??鍮꾨?踰덊샇??8???댁긽 沅뚯옣"),
  body("code").trim().isLength({ min: 6, max: 6 }).withMessage("6?먮━ 肄붾뱶 ?낅젰"),
];

module.exports = {
  validateLogin,
  validateSignup,
  validateEmailOnly,
  validateVerifyCode,
  validateChangePasswordConfirm,
};
