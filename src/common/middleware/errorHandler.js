// src/common/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  // 이미 응답이 나간 경우 Express 기본 에러 처리로 넘김
  if (res.headersSent) return next(err);

  // (있을 수도 있는) Sequelize Validation Error
  if (err?.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: "입력값 검증 실패",
      errors: (err.errors || []).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // (있을 수도 있는) Sequelize Unique Constraint Error
  if (err?.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "이미 존재하는 데이터입니다.",
      errors: (err.errors || []).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Multer Error (파일 업로드)
  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: "파일 업로드 실패",
      error: err.message,
    });
  }

  // 커스텀 에러(statusCode/message) 지원
  const statusCode = err?.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err?.message || "서버 내부 오류",
  });
}

module.exports = { errorHandler };
