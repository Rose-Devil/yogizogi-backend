// src/modules/user/user.repository.js

let users = [
  {
    id: 1,
    name: "홍길동",
    nickname: "gildong",
    email: "test@test.com",
    bio: "로컬 테스트 유저",
  },
];

let posts = [
  { id: 1, user_id: 1, title: "첫 번째 글" },
  { id: 2, user_id: 1, title: "두 번째 글" },
];

let comments = [
  { id: 1, user_id: 1, post_id: 1, content: "좋은 글이네요" },
  { id: 2, user_id: 1, post_id: 2, content: "동의합니다" },
];

const getUserInfo = async (userId) => {
  return users.find((u) => u.id === userId);
};

const getMyPosts = async (userId) => {
  return posts.filter((p) => p.user_id === userId);
};

const getMyComments = async (userId) => {
  return comments.filter((c) => c.user_id === userId);
};

const deleteMyPost = async (userId, postId) => {
  const index = posts.findIndex(
    (p) => p.id === Number(postId) && p.user_id === userId
  );
  if (index === -1) return false;

  posts.splice(index, 1);
  return true;
};

const deleteMyComment = async (userId, commentId) => {
  const index = comments.findIndex(
    (c) => c.id === Number(commentId) && c.user_id === userId
  );
  if (index === -1) return false;

  comments.splice(index, 1);
  return true;
};
const updateNickname = async (userId, nickname) => {
  const user = users.find((u) => u.id === userId);
  if (!user) return false;

  user.nickname = nickname;
  return true;
};

module.exports = {
  getUserInfo,
  getMyPosts,
  getMyComments,
  deleteMyPost,
  deleteMyComment,
  updateNickname,
};
