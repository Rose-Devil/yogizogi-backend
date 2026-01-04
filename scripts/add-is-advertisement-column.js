// 데이터베이스에 is_advertisement 컬럼 추가 스크립트
// 실행: node scripts/add-is-advertisement-column.js
// 또는 서버 시작 시 자동 실행

const mysql = require("mysql2/promise");
const { config } = require("../src/config/env");

async function addAdvertisementColumn() {
  let connection;
  try {
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
    });

    console.log("✅ 데이터베이스 연결 성공");

    // 컬럼이 이미 있는지 확인
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'TravelPost' 
       AND COLUMN_NAME = 'is_advertisement'`,
      [config.db.name]
    );

    if (columns.length > 0) {
      console.log("ℹ️  is_advertisement 컬럼이 이미 존재합니다.");
      return;
    }

    // 컬럼 추가
    await connection.query(`
      ALTER TABLE TravelPost 
      ADD COLUMN is_advertisement BOOLEAN NOT NULL DEFAULT FALSE 
      COMMENT '광고성 게시글 여부' 
      AFTER is_deleted
    `);

    console.log("✅ is_advertisement 컬럼 추가 완료");

    // 인덱스 추가 (이미 있으면 에러 무시)
    try {
      await connection.query(`
        CREATE INDEX idx_post_advertisement 
        ON TravelPost(is_advertisement, is_deleted, created_at)
      `);
      console.log("✅ 인덱스 추가 완료");
    } catch (indexError) {
      if (indexError.code === "ER_DUP_KEYNAME") {
        console.log("ℹ️  인덱스가 이미 존재합니다.");
      } else {
        throw indexError;
      }
    }

    console.log("✅ 모든 작업 완료!");
  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("ℹ️  컬럼이 이미 존재합니다.");
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log("✅ 데이터베이스 연결 종료");
    }
  }
}

// 모듈로 export (서버 시작 시 자동 실행용)
module.exports = { addAdvertisementColumn };

// 직접 실행 시 (npm run migrate:advertisement)
if (require.main === module) {
  addAdvertisementColumn()
    .then(() => {
      console.log("✅ 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 스크립트 실행 실패:", error);
      process.exit(1);
    });
}

