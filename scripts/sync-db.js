const { sequelize } = require("../src/config/db");
// 중요: 모델들을 모두 불러과야 매핑이 됨
const Comment = require("../src/modules/interaction/comment.model");
const TravelPost = require("../src/modules/post/travelPost.model");
const User = require("../src/modules/user/user.model");

async function sync() {
    try {
        console.log("🔄 DB 동기화 시작...");
        // alter: true -> 기존 데이터 유지하면서 스키마 변경
        await sequelize.sync({ alter: true });
        console.log("✅ DB 동기화 완료!");
    } catch (error) {
        console.error("❌ DB 동기화 실패:", error);
    } finally {
        await sequelize.close();
    }
}

sync();
