// // JWT 인증 체크

// const jwt = require("jsonwebtoken");

// module.exports = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({ message: "Authorization header missing" });
//     }

//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({ message: "Token missing" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // ⭐ 이 줄이 핵심
//     req.user = { id: decoded.id };

//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };

// src/common/middleware/authGuard.js
module.exports = (req, res, next) => {
  // 임시 로그인 사용자
  req.user = { id: 1 };
  next();
};
