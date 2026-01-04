const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const { sequelize } = require("../config/db");
// 중요: 모델들을 모두 불러와야 매핑이 됨
const Comment = require("../modules/interaction/comment.model");
const TravelPost = require("../modules/post/travelPost.model");
const User = require("../modules/user/user.model");
const PostLike = require("../modules/post/postLike.model");
const PostImage = require("../modules/post/postImage.model");
const Tag = require("../modules/post/tag.model");
const PostTag = require("../modules/post/postTag.model");
const Checklist = require("../modules/checklist/checklistItem.model");
const ChecklistItem = require("../modules/checklist/checklistItem.model");
const ChecklistMember = require("../modules/checklist/checklistMember.model");
const ChecklistRoom = require("../modules/checklist/checklistRoom.model");
const UserSettings = require("../modules/user/userSettings.model");

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

