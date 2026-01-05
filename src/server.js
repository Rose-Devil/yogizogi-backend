// src/server.js
require("dotenv").config();
const http = require("http");

const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");
const app = require("./app");
const { setupSockets } = require("./socket");

(async () => {
  const port = config.host.port;

  try {
    await checkDbConnection();


    // 서버 시작 시 데이터베이스 마이그레이션 (is_advertisement 컬럼 추가)
    const { addAdvertisementColumn } = require("../scripts/add-is-advertisement-column");
    try {
      await addAdvertisementColumn();
    } catch (migrationError) {
      console.warn("데이터베이스 마이그레이션 중 오류 발생 (서버는 계속 실행됩니다):", migrationError.message);
    }

    // 서버 시작 시 좋아요 수 동기화 (한 번만 실행)

    const { syncLikeCounts } = require("./scripts/sync-like-counts");
    try {
      await syncLikeCounts();
    } catch (syncError) {
      console.warn(
        "syncLikeCounts failed (continuing server start):",
        syncError.message
      );
    }

    const server = http.createServer(app);
    const io = setupSockets(server);
    app.set("io", io);

    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();
