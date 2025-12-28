// PostTag 모델

const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const PostTag = sequelize.define(
  "PostTag",
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
    tag_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "PostTag",
    timestamps: false,
    indexes: [
      {
        name: "uk_post_tag",
        unique: true,
        fields: ["post_id", "tag_id"],
      },
    ],
  }
);

module.exports = PostTag;
