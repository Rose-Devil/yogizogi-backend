const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false,
    timezone: "+09:00",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    },
  }
);

// DB 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL 연결 성공!");
  } catch (error) {
    console.error("❌ MySQL 연결 실패:", error);
    process.exit(1);
  }
};

testConnection();

module.exports = sequelize;
