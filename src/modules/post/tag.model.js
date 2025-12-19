// Tag 모델

const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Tag = sequelize.define(
  "Tag",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "태그명",
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "Tag",
    timestamps: false,
  }
);

module.exports = Tag;
