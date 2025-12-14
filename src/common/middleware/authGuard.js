// JWT 인증 체크
// X_Server middleware/auth.mjs의 isAuth를 MySQL 버전으로 구현
const { AUTH_ERROR, verifyJwtToken } = require("../utils/jwt");
const authRepository = require("../../modules/auth/auth.repository");

// 인증 미들웨어
async function authGuard(req, res, next) {
  // Authorization: Bearer <token>
  const authHeader = req.get("Authorization");

  if (!(authHeader && authHeader.startsWith("Bearer "))) {
    return res.status(401).json(AUTH_ERROR);
  }

  // Bearer 분리
  const token = authHeader.split(" ")[1];

  // 토큰 검증
  const decoded = verifyJwtToken(token);
  if (!decoded) {
    return res.status(401).json(AUTH_ERROR);
  }

  // (중요) 토큰 안의 id로 실제 유저 존재 확인 (X_Server 흐름 유지)
  const user = await authRepository.findById(decoded.id);
  if (!user) {
    return res.status(401).json(AUTH_ERROR);
  }

  // 다음 로직에서 쓰기 쉽게 req에 저장
  req.id = user.id;     // X_Server와 동일하게 req.id
  req.token = token;    // X_Server controller/me에서 token 반환하려면 필요
  next();
}

module.exports = { authGuard };
