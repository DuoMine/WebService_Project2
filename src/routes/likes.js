// src/routes/likes.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();

const { ReviewLikes, CommentLikes, Reviews, Comments } = models;

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

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "10", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

// ---------------------------------------------------------------------
// GET /likes  → 내 좋아요 목록 조회
// ---------------------------------------------------------------------
router.get("/likes", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size } = parsePagination(req.query);

  try {
    // 리뷰 좋아요
    const reviewLikes = await ReviewLikes.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Reviews,
          attributes: ["id", "comment"], // 리뷰 내용 컬럼명 맞춰 수정 필요
        },
      ],
    });

    // 댓글 좋아요
    const commentLikes = await CommentLikes.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Comments,
          attributes: ["id", "content"],
        },
      ],
    });

    const fromReviews = reviewLikes.map((rl) => ({
      likeId: rl.id,
      targetType: "REVIEW",
      targetId: rl.review_id,
      targetContent: rl.Review?.comment ?? null,
      likedAt: rl.created_at,
    }));

    const fromComments = commentLikes.map((cl) => ({
      likeId: cl.id,
      targetType: "COMMENT",
      targetId: cl.comment_id,
      targetContent: cl.Comment?.content ?? null,
      likedAt: cl.created_at,
    }));

    // 합치고 최신순 정렬
    const all = [...fromReviews, ...fromComments].sort(
      (a, b) => new Date(b.likedAt) - new Date(a.likedAt)
    );

    const total = all.length;
    const start = (page - 1) * size;
    const end = start + size;
    const content = all.slice(start, end);

    return sendOk(res, "좋아요 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, total),
    });
  } catch (err) {
    console.error("GET /likes error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get likes");
  }
});

export default router;
