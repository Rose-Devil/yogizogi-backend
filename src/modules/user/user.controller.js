const userService = require("./user.service");

const getMyPage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await userService.getMyPage(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const deleteMyPost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    await userService.deleteMyPost(userId, postId);
    res.json({ message: "게시글 삭제 완료" });
  } catch (err) {
    next(err);
  }
};

const deleteMyComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    await userService.deleteMyComment(userId, commentId);
    res.json({ message: "댓글 삭제 완료" });
  } catch (err) {
    next(err);
  }
};

const updateProfileSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, nickname, bio } = req.body;

    const updatedProfile = await userService.updateProfileSettings(
      userId,
      email,
      nickname,
      bio
    );

    res.json({ message: "프로필 설정 업데이트 완료", profile: updatedProfile });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateProfileSettings,
};
