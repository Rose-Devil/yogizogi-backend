// src/config/db.js
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

// server.js에서 await checkDbConnection()으로 호출
async function checkDbConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    console.log("✅ MySQL 연결 성공");
  } catch (error) {
    console.error("❌ MySQL 연결 실패:", error);
    throw error; // server.js에서 catch해서 종료하도록
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, checkDbConnection };
