// src/routes/reviews.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();

const { Reviews, ReviewLikes, Books, Users } = models;

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
// 3.1 리뷰 작성 (POST /books/:bookId/reviews)
// ---------------------------------------------------------------------
router.post("/books/:bookId/reviews", requireAuth, async (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);
  if (!bookId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid bookId");
  }

  const { rating, comment } = req.body;
  const errors = {};
  if (rating == null) {
    errors.rating = "rating is required";
  } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "rating must be integer 1~5";
  }
  if (!comment || typeof comment !== "string" || !comment.trim()) {
    errors.comment = "comment is required";
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  try {
    // 도서 존재 여부 체크
    const book = await Books.findOne({
      where: { id: bookId, deleted_at: { [Op.is]: null } },
    });
    if (!book) {
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    const now = new Date();
    const review = await Reviews.create({
      book_id: bookId,
      user_id: req.auth.userId,
      rating,
      comment: comment.trim(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return sendOk(res, "리뷰가 작성되었습니다.", {
      reviewId: review.id,
    });
  } catch (err) {
    console.error("POST /books/:bookId/reviews error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create review"
    );
  }
});

// ---------------------------------------------------------------------
// 3.2 리뷰 목록 조회 (GET /books/:bookId/reviews)
//    - 특정 도서의 리뷰들 (public으로 열어둠)
// ---------------------------------------------------------------------
router.get("/books/:bookId/reviews", async (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);
  if (!bookId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid bookId");
  }

  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
    const offset = (page - 1) * size;

    const where = {
      book_id: bookId,
      deleted_at: { [Op.is]: null },
    };

    const { rows, count } = await Reviews.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Users,
          attributes: ["id", "name"], // name 컬럼명 맞춰서 수정
        },
      ],
    });

    const content = rows.map((r) => ({
      id: r.id,
      authorName: r.User?.name ?? null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));

    return sendOk(res, "리뷰 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /books/:bookId/reviews error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get review list"
    );
  }
});

// ---------------------------------------------------------------------
// 3.3 내 리뷰 목록 조회 (GET /users/me/reviews)
// ---------------------------------------------------------------------
router.get("/users/me/reviews", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
    const offset = (page - 1) * size;

    const where = {
      user_id: req.auth.userId,
      deleted_at: { [Op.is]: null },
    };

    const { rows, count } = await Reviews.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Books,
          attributes: ["id", "title"],
        },
      ],
    });

    const content = rows.map((r) => ({
      reviewId: r.id,
      bookTitle: r.Book?.title ?? null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));

    return sendOk(res, "내 리뷰 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /users/me/reviews error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get my reviews"
    );
  }
});

// ---------------------------------------------------------------------
// 3.4 리뷰 수정 (PUT /reviews/:reviewId)
// ---------------------------------------------------------------------
router.put("/reviews/:reviewId", requireAuth, async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  if (!reviewId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid reviewId");
  }

  const { comment } = req.body;
  if (!comment || typeof comment !== "string" || !comment.trim()) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "comment must be non-empty string"
    );
  }

  try {
    const review = await Reviews.findOne({
      where: { id: reviewId, deleted_at: { [Op.is]: null } },
    });
    if (!review) {
      return sendError(res, 404, "NOT_FOUND", "review not found");
    }

    if (review.user_id !== req.auth.userId && req.auth.role !== "ADMIN") {
      return sendError(res, 403, "FORBIDDEN", "not your review");
    }

    review.comment = comment.trim();
    review.updated_at = new Date();
    await review.save();

    return sendOk(res, "리뷰가 수정되었습니다.");
  } catch (err) {
    console.error("PUT /reviews/:reviewId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to update review"
    );
  }
});

// ---------------------------------------------------------------------
// 3.5 리뷰 삭제 (DELETE /reviews/:reviewId) - soft delete
// ---------------------------------------------------------------------
router.delete("/reviews/:reviewId", requireAuth, async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  if (!reviewId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid reviewId");
  }

  try {
    const review = await Reviews.findOne({
      where: { id: reviewId, deleted_at: { [Op.is]: null } },
    });
    if (!review) {
      return sendError(res, 404, "NOT_FOUND", "review not found");
    }

    if (review.user_id !== req.auth.userId && req.auth.role !== "ADMIN") {
      return sendError(res, 403, "FORBIDDEN", "not your review");
    }

    review.deleted_at = new Date();
    await review.save();

    return sendOk(res, "리뷰가 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /reviews/:reviewId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to delete review"
    );
  }
});

// ---------------------------------------------------------------------
// 3.6 리뷰 좋아요 등록/취소 (POST /reviews/:reviewId/like)
// ---------------------------------------------------------------------
router.post("/reviews/:reviewId/like", requireAuth, async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  if (!reviewId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid reviewId");
  }

  try {
    const review = await Reviews.findOne({
      where: { id: reviewId, deleted_at: { [Op.is]: null } },
    });
    if (!review) {
      return sendError(res, 404, "NOT_FOUND", "review not found");
    }

    const userId = req.auth.userId;

    const existing = await ReviewLikes.findOne({
      where: { review_id: reviewId, user_id: userId },
    });

    let isLiked;
    let message;

    if (existing) {
      // 이미 좋아요 → 취소
      await existing.destroy();
      isLiked = false;
      message = "좋아요를 취소했습니다.";
    } else {
      await ReviewLikes.create({
        review_id: reviewId,
        user_id: userId,
        created_at: new Date(),
      });
      isLiked = true;
      message = "좋아요를 눌렀습니다.";
    }

    return sendOk(res, message, { isLiked });
  } catch (err) {
    console.error("POST /reviews/:reviewId/like error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to toggle like"
    );
  }
});

export default router;
