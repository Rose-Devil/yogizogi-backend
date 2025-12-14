// 인증 컨트롤러
// X_Server controller/auth.mjs 흐름 유지
const authService = require("./auth.service");

// 회원가입
async function signup(req, res, next) {
  try {
    const { userid, password, name, email, url } = req.body;
    const result = await authService.signup({ userid, password, name, email, url });

    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

// 로그인
async function login(req, res, next) {
  try {
    const { userid, password } = req.body;
    const result = await authService.login({ userid, password });

    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

// 로그인 유지
async function me(req, res, next) {
  try {
    // authGuard가 req.id, req.token을 넣어줌
    const result = await authService.me(req.id, req.token);
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

module.exports = { signup, login, me };
