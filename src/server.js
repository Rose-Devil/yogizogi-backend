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

    const server = http.createServer(app);
    createWsServer({ httpServer: server, path: "/ws" });

    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      console.log(`WS listening on ws://localhost:${port}/ws`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();

