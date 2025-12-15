// 모델 통합 export

const TravelPost = require("../travelPost.model");
const PostImage = require("../postImage.model");
const Tag = require("../tag.model");
const PostTag = require("../postTag.model");

// 모델 관계 설정
TravelPost.hasMany(PostImage, {
  foreignKey: "post_id",
  as: "images",
});

PostImage.belongsTo(TravelPost, {
  foreignKey: "post_id",
  as: "post",
});

TravelPost.belongsToMany(Tag, {
  through: PostTag,
  foreignKey: "post_id",
  otherKey: "tag_id",
  as: "tags",
});

Tag.belongsToMany(TravelPost, {
  through: PostTag,
  foreignKey: "tag_id",
  otherKey: "post_id",
  as: "posts",
});

module.exports = {
  TravelPost,
  PostImage,
  Tag,
  PostTag,
};


