// PostImage 모델

const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const PostImage = sequelize.define(
  "PostImage",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "노출 순서",
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "PostImage",
    timestamps: false,
    indexes: [
      {
        name: "idx_postimage_post_sort",
        fields: ["post_id", "sort_order"],
      },
    ],
  }
);

module.exports = PostImage;
