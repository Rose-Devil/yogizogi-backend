const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const TravelPost = sequelize.define(
  "TravelPost",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    author_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "작성자 ID",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "여행 지역 (서울, 부산, 제주 등)",
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    people_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "인원 수",
      validate: {
        min: 1,
      },
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "대표 이미지 경로",
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    like_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "캐싱용 좋아요 수",
    },
    comment_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "캐싱용 댓글 수",
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "소프트 삭제 여부",
    },
    is_advertisement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "광고성 게시글 여부",
    },
    ai_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "AI 분석 결과 (여행글 판단, 일정, 코디 등)",
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "TravelPost",
    timestamps: false,
    indexes: [
      {
        name: "idx_post_author_id",
        fields: ["author_id"],
      },
      {
        name: "idx_post_region",
        fields: ["region"],
      },
      {
        name: "idx_post_likes_created",
        fields: [
          { name: "like_count", order: "DESC" },
          { name: "created_at", order: "DESC" },
        ],
      },
      {
        name: "idx_post_active_created",
        fields: ["is_deleted", { name: "created_at", order: "DESC" }],
      },
    ],
    validate: {
      dateRangeCheck() {
        if (
          this.start_date &&
          this.end_date &&
          this.start_date > this.end_date
        ) {
          throw new Error("시작일은 종료일보다 이전이어야 합니다");
        }
      },
    },
  }
);

module.exports = TravelPost;
