// src/common/middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error("ERROR:", err.message);
  res.status(500).json({
    message: err.message || "서버 에러",
  });
};
