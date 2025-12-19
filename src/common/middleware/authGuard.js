// src/common/middleware/authGuard.js
const { verifyToken } = require("../utils/jwt");

function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  // Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증 토큰이 없습니다." });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ message: "인증 토큰이 없습니다." });
  }

  try {
    const decoded = verifyToken(token);

    // access만 허용 (refresh로 API 호출 방지)
    if (decoded.typ && decoded.typ !== "access") {
      return res.status(401).json({ message: "Access Token이 아닙니다." });
    }

    // ✅ 호환성: 기존 코드(req.id) + 다른 브랜치 코드(req.user.id) 둘 다 지원
    req.id = decoded.id;
    req.user = { id: decoded.id };
    req.token = token;

    return next();
  } catch (e) {
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
}

module.exports = { authGuard };
