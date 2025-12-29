const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");
// User is not a Sequelize model so we cannot import/associate it here
const TravelPost = require("../post/travelPost.model");

const Comment = sequelize.define(
    "Comment",
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        author_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: "작성자 ID",
        },
        post_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: "게시글 ID",
        },
        parent_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            comment: "부모 댓글 ID (대댓글용)",
        },
        is_ai: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "AI 작성 여부",
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
        tableName: "Comment",
        timestamps: false,
        indexes: [
            {
                name: "idx_comment_post_id",
                fields: ["post_id"],
            },
            {
                name: "idx_comment_parent_id",
                fields: ["parent_id"],
            },
        ],
    }
);

// 관계 설정
Comment.belongsTo(TravelPost, { foreignKey: "post_id", as: "post" });
Comment.belongsTo(Comment, { foreignKey: "parent_id", as: "parent" });
Comment.hasMany(Comment, { foreignKey: "parent_id", as: "replies" });

// Post 쪽에도 관계 설정
TravelPost.hasMany(Comment, { foreignKey: "post_id", as: "comments" });

module.exports = Comment;
