const commentService = require("./comment.service");

class CommentController {
    // 댓글 작성
    createComment = async (req, res, next) => {
        try {
            const { postId } = req.params;
            const { content } = req.body;
            const userId = req.user?.id || 1; // fallback for unauthenticated requests

            const comment = await commentService.createComment(
                postId,
                userId,
                content,
                null
            );

            res.status(201).json({ success: true, data: comment });
        } catch (error) {
            next(error);
        }
    };

    // 대댓글 작성
    createReply = async (req, res, next) => {
        try {
            const { commentId } = req.params; // 부모 댓글 ID
            const { content, postId } = req.body; // postId도 body로 받거나 parent에서 조회 가능하지만 명시적으로 받음
            const userId = req.user?.id || 1; // fallback for unauthenticated requests

            const reply = await commentService.createComment(
                postId,
                userId,
                content,
                commentId
            );

            res.status(201).json({ success: true, data: reply });
        } catch (error) {
            next(error);
        }
    };

    // 댓글 목록 조회
    getComments = async (req, res, next) => {
        try {
            const { postId } = req.params;
            const comments = await commentService.getComments(postId);
            res.status(200).json({ success: true, data: comments });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new CommentController();
