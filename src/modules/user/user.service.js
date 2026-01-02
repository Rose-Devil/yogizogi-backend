const userRepository = require("./user.repository");
const userModel = require("./userSettings.model");

const getMyPage = async (userId) => {
  const user = await userModel.getProfileSettings(userId);
  const posts = await userRepository.getMyPosts(userId);
  const comments = await userRepository.getMyComments(userId);

  return { user, posts, comments };
};

const deleteMyPost = async (userId, postId) => {
  const ok = await userRepository.deleteMyPost(userId, postId);
  if (!ok) throw new Error("게시글 삭제 실패");
};

const deleteMyComment = async (userId, commentId) => {
  const ok = await userRepository.deleteMyComment(userId, commentId);
  if (!ok) throw new Error("댓글 삭제 실패");
};

/**
 * 프로필 설정 업데이트
 * - 이메일 변경 불가
 * - 비밀번호 변경은 /api/auth/password/change/* 사용
 */
const updateProfileSettings = async (userId, email, nickname, bio) => {
  const current = await userModel.getProfileSettings(userId);
  if (!current) throw { statusCode: 404, message: "사용자를 찾을 수 없음" };

  if (email != null && email !== current.email) {
    throw { statusCode: 400, message: "이메일은 변경할 수 없습니다." };
  }

  const nextNickname = nickname ?? current.nickname;
  const nextBio = bio ?? current.bio;

  return userModel.updateProfileSettings(userId, nextNickname, nextBio);
};

// 특정 사용자 프로필 조회 (공개 정보만)
const getUserProfile = async (targetUserId) => {
  const user = await userModel.getProfileSettings(targetUserId);
  if (!user) {
    throw { statusCode: 404, message: "사용자를 찾을 수 없습니다." };
  }

  const posts = await userRepository.getMyPosts(targetUserId);
  
  // 통계 계산
  const postCount = posts.length || 0;
  const totalViews = posts.reduce((sum, post) => sum + (post.view_count || 0), 0);

  // 공개 정보만 반환 (이메일 등 제외)
  return {
    user: {
      id: user.id,
      nickname: user.nickname,
      bio: user.bio,
      image: user.image || user.profile_image_url,
      joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString("ko-KR") : "",
    },
    stats: {
      postCount,
      totalViews,
    },
    trips: posts.map((post) => ({
      id: post.id,
      title: post.title,
      location: post.region,
      thumbnail: post.thumbnail_url,
      views: post.view_count || 0,
      createdAt: post.created_at ? new Date(post.created_at).toLocaleDateString("ko-KR") : "",
    })),
  };
};

module.exports = {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateProfileSettings,
  getUserProfile,
};
