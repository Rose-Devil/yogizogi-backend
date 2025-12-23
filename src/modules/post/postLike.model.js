// postLike 모델

const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

// 좋아요 정보
const PostLike = sequelize.define(
  "PostLike",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "좋아요 누른 사용자 ID",
    },
    post_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "좋아요 대상 게시글 ID",
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "좋아요 생성 시간",
    },
  },
  {
    tableName: "PostLike",
    timestamps: false,
    indexes: [
      {
        name: "idx_postlike_post_id",
        fields: ["post_id"],
      },
      {
        name: "idx_postlike_user_id",
        fields: ["user_id"],
      },
      {
        name: "uk_user_post_like",
        unique: true,
        fields: ["user_id", "post_id"],
      },
    ],
  }
);

module.exports = PostLike;
