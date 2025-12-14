// DB 연결 설정
// MySQL 연결 (mongoose 절대 없음)
// mysql2/promise pool을 사용해서 커넥션 풀 생성
const mysql = require("mysql2/promise");
const { config } = require("./env");

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };

