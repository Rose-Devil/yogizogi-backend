const app = require("./app");
const { config } = require("./config/env");
const { checkDbConnection } = require("./config/db");

(async () => {
  await checkDbConnection();

  app.listen(config.host.port, () => {
    console.log(`Server listening on http://localhost:${config.host.port}`);
  });
})();
