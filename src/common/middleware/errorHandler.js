// 에러 핸들러 미들웨어
// 예상치 못한 에러 처리(선택이지만 실무에선 권장)
function errorHandler(err, req, res, next) {
    console.error("[ERROR]", err);
  
    // 이미 응답이 나간 경우
    if (res.headersSent) return next(err);
  
    return res.status(500).json({ message: "서버 오류" });
  }
  
  module.exports = { errorHandler };
  