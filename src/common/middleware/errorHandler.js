// 에러 핸들러 미들웨어

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  // Sequelize Validation Error
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: "입력값 검증 실패",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Sequelize Unique Constraint Error
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "이미 존재하는 데이터입니다.",
      errors: err.errors.map((e) => ({
        field: err.errors[0].path,
      })),
    });
  }

  // Multer Error (파일 업로드)
  if (err.name === "MulterError") {
    return res.status(400).json({
      sucess: false,
      message: "파일 업로드 실패",
      error: err.message,
    });
  }

  // Default Error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "서버 내부 오류",
    error: process.env,
  });
};

module.exports = errorHandler;
