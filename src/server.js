// src/server.js
const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");
const app = require("./app");

(async () => {
  const port = config.host.port;

  try {
    await checkDbConnection();

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      console.log(`Swagger UI: http://localhost:${port}/docs`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();
