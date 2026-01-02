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
