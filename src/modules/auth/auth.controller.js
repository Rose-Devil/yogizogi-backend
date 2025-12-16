const authService = require("./auth.service");

// 회원가입
async function signup(req, res, next) {
  try {
    const { email, password, nickname, url } = req.body;
    const result = await authService.signup({ email, password, nickname, url });
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

// 로그인
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

// 로그인 유지
async function me(req, res, next) {
  try {
    const result = await authService.me(req.id, req.token);
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

module.exports = { signup, login, me };
