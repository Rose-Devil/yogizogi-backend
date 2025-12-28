// src/server.js
const app = require("./app");
const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");

(async () => {
  const { address, port } = config.host;

  try {
    await checkDbConnection();

    app.listen(port, address, () => {
      const displayAddress = address === "0.0.0.0" ? "localhost" : address;
      console.log(`🚀 Server listening on http://${displayAddress}:${port}`);
    });
  } catch (error) {
    console.error("❌ 서버 시작 실패:", error);
    process.exit(1);
  }
})();
