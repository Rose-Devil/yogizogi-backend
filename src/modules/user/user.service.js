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

module.exports = {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateProfileSettings,
};
