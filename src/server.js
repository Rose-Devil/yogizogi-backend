// src/server.js
const app = require("./app");
const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");

(async () => {
  const port = config.host.port;

  try {
    await checkDbConnection();

    app.listen(port, () => {
      console.log(`🚀 Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ 서버 시작 실패:", error);
    process.exit(1);
  }
})();
