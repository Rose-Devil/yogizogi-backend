// 좋아요 수 동기화 스크립트
// 모든 게시글의 like_count를 PostLike 테이블의 실제 개수로 업데이트

const { TravelPost, PostLike } = require("../modules/post/models");
const { sequelize } = require("../config/db");

async function syncLikeCounts() {
  try {
    console.log("좋아요 수 동기화 시작...");

    // 모든 게시글 조회
    const posts = await TravelPost.findAll({
      where: { is_deleted: false },
    });

    console.log(`총 ${posts.length}개의 게시글을 확인합니다.`);

    let updated = 0;

    for (const post of posts) {
      // 실제 좋아요 개수 조회
      const actualLikeCount = await PostLike.count({
        where: { post_id: post.id },
      });

      // like_count가 실제 개수와 다르면 업데이트
      if (post.like_count !== actualLikeCount) {
        await post.update({ like_count: actualLikeCount });
        updated++;
        console.log(
          `게시글 ID ${post.id}: ${post.like_count} → ${actualLikeCount}`
        );
      }
    }

    console.log(`동기화 완료: ${updated}개의 게시글 업데이트됨`);
  } catch (error) {
    console.error("좋아요 수 동기화 실패:", error);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  syncLikeCounts()
    .then(() => {
      console.log("스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("스크립트 실행 실패:", error);
      process.exit(1);
    });
}

module.exports = { syncLikeCounts };


