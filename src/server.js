// 서버 시작 포인트

require("dotenv").config();
const app = require("./app");
const db = require("./config/db");

const PORT = process.env.PORT || 3000;

// 서버 시작
const startServer = async () => {
  try {
    // DB 연결 확인 (db.js에서 이미 처리됨)
    await db.authenticate();

    app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ 서버 시작 실패:", error);
    process.exit(1);
  }
};

startServer();
