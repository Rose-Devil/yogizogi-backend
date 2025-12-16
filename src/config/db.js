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

async function checkDbConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log("✅ MySQL 연결 성공");
  } finally {
    conn.release();
  }
}

module.exports = { pool, checkDbConnection };
