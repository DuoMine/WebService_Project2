// src/routes/comments.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();

const { Comments, CommentLikes, Reviews, Users } = models;

// 공통 성공 응답
function sendOk(res, message, payload = undefined) {
  return res.json({
    isSuccess: true,
    message,
    ...(payload !== undefined ? { payload } : {}),
  });
}

function buildPagination(page, size, total) {
  return {
    currentPage: page,
    totalPages: Math.ceil(total / size),
    totalElements: total,
    size,
  };
}

// ---------------------------------------------------------------------
// 4.1 댓글 작성 (POST /reviews/:reviewId/comments)
// ---------------------------------------------------------------------
router.post(
  "/reviews/:reviewId/comments",
  requireAuth,
  async (req, res) => {
    const reviewId = parseInt(req.params.reviewId, 10);
    if (!reviewId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid reviewId");
    }

    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return sendError(
        res,
        400,
        "VALIDATION_FAILED",
        "content is required"
      );
    }

    try {
      // 리뷰 존재 여부 체크
      const review = await Reviews.findOne({
        where: { id: reviewId, deleted_at: { [Op.is]: null } },
      });
      if (!review) {
        return sendError(res, 404, "NOT_FOUND", "review not found");
      }

      const now = new Date();
      const comment = await Comments.create({
        review_id: reviewId,
        user_id: req.auth.userId,
        content: content.trim(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      return sendOk(res, "댓글이 작성되었습니다.", {
        commentId: comment.id,
      });
    } catch (err) {
      console.error("POST /reviews/:reviewId/comments error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to create comment"
      );
    }
  }
);

// ---------------------------------------------------------------------
// 4.2 댓글 목록 조회 (GET /reviews/:reviewId/comments)
// ---------------------------------------------------------------------
router.get("/reviews/:reviewId/comments", async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  if (!reviewId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid reviewId");
  }

  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
    const offset = (page - 1) * size;

    const where = {
      review_id: reviewId,
      deleted_at: { [Op.is]: null },
    };

    const { rows, count } = await Comments.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Users,
          attributes: ["id", "name"], // 이름 컬럼명 맞춰서 수정
        },
      ],
    });

    const content = rows.map((c) => ({
      id: c.id,
      authorName: c.User?.name ?? null,
      content: c.content,
      createdAt: c.created_at,
    }));

    return sendOk(res, "댓글 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /reviews/:reviewId/comments error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get comment list"
    );
  }
});

// ---------------------------------------------------------------------
// 4.3 내 댓글 목록 조회 (GET /users/me/comments)
// ---------------------------------------------------------------------
router.get("/users/me/comments", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
    const offset = (page - 1) * size;

    const where = {
      user_id: req.auth.userId,
      deleted_at: { [Op.is]: null },
    };

    const { rows, count } = await Comments.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Reviews,
          attributes: ["id", "comment"], // 리뷰 내용 컬럼명에 맞춰서 수정 (예: "content"면 바꾸기)
        },
      ],
    });

    const content = rows.map((c) => ({
      commentId: c.id,
      reviewContent: c.Review?.comment ?? null, // 위에서 지정한 컬럼명과 맞추기
      myComment: c.content,
      createdAt: c.created_at,
    }));

    return sendOk(res, "내 댓글 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /users/me/comments error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get my comments"
    );
  }
});

// ---------------------------------------------------------------------
// 4.4 댓글 수정 (PUT /comments/:commentId)
// ---------------------------------------------------------------------
router.put("/comments/:commentId", requireAuth, async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (!commentId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid commentId");
  }

  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "content must be non-empty string"
    );
  }

  try {
    const comment = await Comments.findOne({
      where: { id: commentId, deleted_at: { [Op.is]: null } },
    });
    if (!comment) {
      return sendError(res, 404, "NOT_FOUND", "comment not found");
    }

    if (comment.user_id !== req.auth.userId && req.auth.role !== "ADMIN") {
      return sendError(res, 403, "FORBIDDEN", "not your comment");
    }

    comment.content = content.trim();
    comment.updated_at = new Date();
    await comment.save();

    return sendOk(res, "댓글이 수정되었습니다.");
  } catch (err) {
    console.error("PUT /comments/:commentId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to update comment"
    );
  }
});

// ---------------------------------------------------------------------
// 4.5 댓글 삭제 (DELETE /comments/:commentId) - soft delete
// ---------------------------------------------------------------------
router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (!commentId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid commentId");
  }

  try {
    const comment = await Comments.findOne({
      where: { id: commentId, deleted_at: { [Op.is]: null } },
    });
    if (!comment) {
      return sendError(res, 404, "NOT_FOUND", "comment not found");
    }

    if (comment.user_id !== req.auth.userId && req.auth.role !== "ADMIN") {
      return sendError(res, 403, "FORBIDDEN", "not your comment");
    }

    comment.deleted_at = new Date();
    await comment.save();

    return sendOk(res, "댓글이 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /comments/:commentId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to delete comment"
    );
  }
});

// ---------------------------------------------------------------------
// 4.6 댓글 좋아요 등록/취소 (POST /comments/:commentId/like)
// ---------------------------------------------------------------------
router.post("/comments/:commentId/like", requireAuth, async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (!commentId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid commentId");
  }

  try {
    const comment = await Comments.findOne({
      where: { id: commentId, deleted_at: { [Op.is]: null } },
    });
    if (!comment) {
      return sendError(res, 404, "NOT_FOUND", "comment not found");
    }

    const userId = req.auth.userId;
    const existing = await CommentLikes.findOne({
      where: { comment_id: commentId, user_id: userId },
    });

    let isLiked;
    let message;

    if (existing) {
      // 이미 좋아요 → 취소
      await existing.destroy();
      isLiked = false;
      message = "좋아요를 취소했습니다.";
    } else {
      await CommentLikes.create({
        comment_id: commentId,
        user_id: userId,
        created_at: new Date(),
      });
      isLiked = true;
      message = "좋아요를 눌렀습니다.";
    }

    // 최신 좋아요 수
    const likeCount = await CommentLikes.count({
      where: { comment_id: commentId },
    });

    return sendOk(res, message, { isLiked, likeCount });
  } catch (err) {
    console.error("POST /comments/:commentId/like error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to toggle like"
    );
  }
});

export default router;
