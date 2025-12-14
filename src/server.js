// 서버 시작 포인트
// 서버 시작 포인트
const app = require("./app");
const { config } = require("./config/env");

app.listen(config.host.port, () => {
  console.log(`Server listening on http://localhost:${config.host.port}`);
});
