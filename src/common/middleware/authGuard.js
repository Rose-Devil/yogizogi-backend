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

    // access only (prevent calling APIs with refresh token)
    if (decoded.typ && decoded.typ !== "access") {
      return res.status(401).json({ message: "Access Token이 아닙니다." });
    }

    req.id = decoded.id;
    req.user = { id: decoded.id };
    req.token = token;

    return next();
  } catch {
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
}

module.exports = { authGuard };
