// 요청 검증 미들웨어
// X_Server middleware/validator.mjs처럼 "첫 에러 메시지 하나만" 내려주는 방식
const { validationResult } = require("express-validator");

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  // 에러 없으면 다음으로
  if (errors.isEmpty()) return next();

  // X_Server처럼 첫 번째 에러 메시지만 내려줌
  return res.status(400).json({ message: errors.array()[0].msg });
}

module.exports = { validateRequest };
