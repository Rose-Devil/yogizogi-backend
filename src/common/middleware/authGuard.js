// src/common/middleware/authGuard.js
const { verifyToken } = require("../utils/jwt");

function authGuard(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증 토큰이 없습니다." });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    // access만 허용
    if (decoded.typ !== "access") {
      return res.status(401).json({ message: "Access Token이 아닙니다." });
    }

    req.id = decoded.id;
    req.token = token;
    next();
  } catch (e) {
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
}

module.exports = { authGuard };
