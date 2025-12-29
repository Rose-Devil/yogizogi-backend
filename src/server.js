// src/server.js
require("dotenv").config();
const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");
const app = require("./app");

(async () => {
  const port = config.host.port;

  try {
    await checkDbConnection();

    app.listen(port, () => {
      console.log(`🚀 Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();
