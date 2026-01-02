// src/server.js
require("dotenv").config();
const http = require("http");

const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");
const app = require("./app");
const { createWsServer } = require("./ws/server");

(async () => {
  const port = config.host.port;

  try {
    await checkDbConnection();

    // 서버 시작 시 좋아요 수 동기화 (한 번만 실행)
    const { syncLikeCounts } = require("./scripts/sync-like-counts");
    try {
      await syncLikeCounts();
    } catch (syncError) {
      console.warn("좋아요 수 동기화 중 오류 발생 (서버는 계속 실행됩니다):", syncError.message);
    }

    app.listen(port, () => {
      console.log(`🚀 Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();

