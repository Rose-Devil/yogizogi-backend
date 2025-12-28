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

const updateNickname = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({ message: "nickname required" });
    }

    await userService.updateNickname(userId, nickname);

    res.json({ nickname });
  } catch (err) {
    next(err);
  }
};// 프로필 전체 수정
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { nickname, profileImage } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { nickname, profileImage },
    { new: true }
  );

  res.json(updatedUser);
};

module.exports = {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateNickname,
  updateProfile
};
