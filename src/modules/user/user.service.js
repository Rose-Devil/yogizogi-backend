const userRepository = require("./user.repository");
const userModel = require("./userSettings.model");

const getMyPage = async (userId) => {
  const user = await userRepository.getUserInfo(userId);
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

const updateProfileSettings = async (userId, name, nickname, bio) => {
  return await userModel.updateProfileSettings(userId, name, nickname, bio);
};

module.exports = {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateProfileSettings,
};
