// src/routes/reviews.js
import { Router } from "express";
import { Op, literal } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendOk, sendError } from "../utils/http.js";
import { parsePagination } from "../utils/pagination.js";
import { parseSort } from "../utils/sort.js";

const router = Router();
const { Reviews, Comments, ReviewLikes, CommentLikes } = models;

function parseId(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isAdmin(req) {
  return req.auth?.role === "ADMIN";
}

function canMutate(req, ownerUserId) {
  return isAdmin(req) || Number(req.auth?.userId) === Number(ownerUserId);
}

function validateReviewCreate(body) {
  const errors = {};
  if (!body.bookId || !Number.isInteger(body.bookId) || body.bookId <= 0)
    errors.bookId = "bookId must be positive integer";
  if (body.rating === undefined || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
    errors.rating = "rating must be integer 1~5";
  if (body.comment !== undefined && body.comment !== null && typeof body.comment !== "string")
    errors.comment = "comment must be string or null";
  return errors;
}

function validateReviewPatch(body) {
  const errors = {};
  if (body.rating !== undefined && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5))
    errors.rating = "rating must be integer 1~5";
  if (body.comment !== undefined && body.comment !== null && typeof body.comment !== "string")
    errors.comment = "comment must be string or null";
  if (body.bookId !== undefined) errors.bookId = "bookId cannot be changed";
  return errors;
}

function validateCommentCreate(body) {
  const errors = {};
  if (body.content === undefined || typeof body.content !== "string" || !body.content.trim())
    errors.content = "content must be non-empty string";
  return errors;
}

function validateCommentPatch(body) {
  const errors = {};
  if (body.content !== undefined && (typeof body.content !== "string" || !body.content.trim()))
    errors.content = "content must be non-empty string";
  return errors;
}

/**
 * @openapi
 * /reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: 리뷰 목록 조회 (필터 + 페이지네이션 + 정렬)
 *     description: |
 *       - filters: bookId, userId, minRating, maxRating, q(코멘트 부분 LIKE)
 *       - 각 리뷰에 commentCount, likeCount, myLiked 포함
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: bookId
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *       - in: query
 *         name: minRating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: maxRating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: q
 *         description: "review.comment LIKE 검색"
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         description: "허용: created_at, updated_at, rating (예: created_at,DESC)"
 *         schema: { type: string, example: "created_at,DESC" }
 *     responses:
 *       200:
 *         description: 성공
 *       500:
 *         description: failed to fetch reviews
 */
router.get("/", requireAuth, async (req, res) => {
  const { page, size, offset } = parsePagination(req.query, { defaultSize: 20, maxSize: 50 });

  const fieldMap = {
    created_at: "created_at",
    updated_at: "updated_at",
    rating: "rating",
  };
  const { order, sort } = parseSort(req.query.sort, fieldMap, "created_at,DESC");

  const where = {};
  const bookId = req.query.bookId ? parseId(req.query.bookId) : null;
  const userId = req.query.userId ? parseId(req.query.userId) : null;
  const minRating = req.query.minRating ? parseInt(req.query.minRating, 10) : null;
  const maxRating = req.query.maxRating ? parseInt(req.query.maxRating, 10) : null;
  const q = String(req.query.q ?? "").trim();

  if (bookId) where.book_id = bookId;
  if (userId) where.user_id = userId;
  if (Number.isFinite(minRating) || Number.isFinite(maxRating)) {
    where.rating = {};
    if (Number.isFinite(minRating)) where.rating[Op.gte] = minRating;
    if (Number.isFinite(maxRating)) where.rating[Op.lte] = maxRating;
  }
  if (q) where.comment = { [Op.like]: `%${q}%` };

  try {
    const total = await Reviews.count({ where });
    const me = Number(req.auth.userId);

    const items = await Reviews.findAll({
      where,
      limit: size,
      offset,
      order,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*)
              FROM comments c
              WHERE c.review_id = reviews.id
                AND c.deleted_at IS NULL
            )`),
            "commentCount",
          ],
          [
            literal(`(
              SELECT COUNT(*)
              FROM review_likes rl
              WHERE rl.review_id = reviews.id
                AND rl.is_active = 1
            )`),
            "likeCount",
          ],
          [
            literal(`(
              SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
              FROM review_likes rl2
              WHERE rl2.review_id = reviews.id
                AND rl2.user_id = ${me}
                AND rl2.is_active = 1
            )`),
            "myLiked",
          ],
        ],
      },
    });

    return sendOk(res, { items, meta: { page, size, total, sort } });
  } catch (err) {
    console.error("GET /reviews error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to fetch reviews");
  }
});

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: 리뷰 생성
 *     description: "한 유저가 한 책에 대해 리뷰를 1개만 허용(유니크 제약이 있다고 가정)."
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookId, rating]
 *             properties:
 *               bookId:
 *                 type: integer
 *                 example: 1
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 nullable: true
 *                 example: "재밌어요"
 *     responses:
 *       201:
 *         description: 생성 성공
 *       400:
 *         description: invalid body
 *       409:
 *         description: review already exists for this book
 *       500:
 *         description: failed to create review
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  const body = req.body ?? {};
  const payload = {
    bookId: parseId(body.bookId),
    rating: body.rating !== undefined ? parseInt(body.rating, 10) : undefined,
    comment: body.comment ?? null,
  };

  const errors = validateReviewCreate(payload);
  if (Object.keys(errors).length) return sendError(res, 400, "BAD_REQUEST", "invalid body", errors);

  try {
    const created = await Reviews.create({
      user_id: userId,
      book_id: payload.bookId,
      rating: payload.rating,
      comment: payload.comment,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return sendOk(res, created, 201);
  } catch (err) {
    if (String(err?.name).includes("SequelizeUniqueConstraintError")) {
      return sendError(res, 409, "CONFLICT", "review already exists for this book");
    }
    console.error("POST /reviews error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to create review");
  }
});

/**
 * @openapi
 * /reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: 리뷰 상세 조회 (likeCount/commentCount/myLiked 포함)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 성공
 *       400:
 *         description: invalid review id
 *       404:
 *         description: review not found
 */
router.get("/:id", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  try {
    const me = Number(req.auth.userId);

    const review = await Reviews.findOne({
      where: { id: reviewId },
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*)
              FROM comments c
              WHERE c.review_id = reviews.id
                AND c.deleted_at IS NULL
            )`),
            "commentCount",
          ],
          [
            literal(`(
              SELECT COUNT(*)
              FROM review_likes rl
              WHERE rl.review_id = reviews.id
                AND rl.is_active = 1
            )`),
            "likeCount",
          ],
          [
            literal(`(
              SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
              FROM review_likes rl2
              WHERE rl2.review_id = reviews.id
                AND rl2.user_id = ${me}
                AND rl2.is_active = 1
            )`),
            "myLiked",
          ],
        ],
      },
    });

    if (!review) return sendError(res, 404, "NOT_FOUND", "review not found");
    return sendOk(res, review);
  } catch (err) {
    console.error("GET /reviews/:id error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to fetch review");
  }
});

/**
 * @openapi
 * /reviews/{id}:
 *   patch:
 *     tags: [Reviews]
 *     summary: 리뷰 수정 (본인 또는 ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 nullable: true
 *                 example: "수정된 후기"
 *               bookId:
 *                 description: "변경 불가(보내면 400)"
 *                 type: integer
 *     responses:
 *       200:
 *         description: 수정 성공
 *       403:
 *         description: no permission
 *       404:
 *         description: review not found
 */
router.patch("/:id", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  const body = req.body ?? {};
  const payload = {
    rating: body.rating !== undefined ? parseInt(body.rating, 10) : undefined,
    comment: body.comment !== undefined ? body.comment : undefined,
    bookId: body.bookId,
  };

  const errors = validateReviewPatch(payload);
  if (Object.keys(errors).length) return sendError(res, 400, "BAD_REQUEST", "invalid body", errors);

  try {
    const review = await Reviews.findOne({ where: { id: reviewId } });
    if (!review) return sendError(res, 404, "NOT_FOUND", "review not found");

    if (!canMutate(req, review.user_id)) return sendError(res, 403, "FORBIDDEN", "no permission");

    await review.update({
      ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
      ...(payload.comment !== undefined ? { comment: payload.comment } : {}),
      updated_at: new Date(),
    });

    return sendOk(res, review);
  } catch (err) {
    console.error("PATCH /reviews/:id error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to update review");
  }
});

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: 리뷰 삭제 (본인 또는 ADMIN) - 하드 삭제
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       403:
 *         description: no permission
 *       404:
 *         description: review not found
 */
router.delete("/:id", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  try {
    const review = await Reviews.findOne({ where: { id: reviewId } });
    if (!review) return sendError(res, 404, "NOT_FOUND", "review not found");

    if (!canMutate(req, review.user_id)) return sendError(res, 403, "FORBIDDEN", "no permission");

    await Reviews.destroy({ where: { id: reviewId } });
    return sendOk(res, { ok: true });
  } catch (err) {
    console.error("DELETE /reviews/:id error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to delete review");
  }
});

/**
 * @openapi
 * /reviews/{reviewId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: 특정 리뷰의 댓글 목록 조회 (페이지네이션 + likeCount/myLiked)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         description: "허용: created_at, updated_at (기본 created_at,ASC)"
 *         schema: { type: string, example: "created_at,ASC" }
 *     responses:
 *       200:
 *         description: 성공
 *       404:
 *         description: review not found
 */
router.get("/:reviewId/comments", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  const { page, size, offset } = parsePagination(req.query, { defaultSize: 20, maxSize: 100 });

  const fieldMap = { created_at: "created_at", updated_at: "updated_at" };
  const { order, sort } = parseSort(req.query.sort, fieldMap, "created_at,ASC");

  try {
    const exists = await Reviews.count({ where: { id: reviewId } });
    if (!exists) return sendError(res, 404, "NOT_FOUND", "review not found");

    const total = await Comments.count({ where: { review_id: reviewId, deleted_at: null } });
    const me = Number(req.auth.userId);

    const items = await Comments.findAll({
      where: { review_id: reviewId, deleted_at: null },
      limit: size,
      offset,
      order,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(*)
              FROM comment_likes cl
              WHERE cl.comment_id = comments.id
                AND cl.is_active = 1
            )`),
            "likeCount",
          ],
          [
            literal(`(
              SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
              FROM comment_likes cl2
              WHERE cl2.comment_id = comments.id
                AND cl2.user_id = ${me}
                AND cl2.is_active = 1
            )`),
            "myLiked",
          ],
        ],
      },
    });

    return sendOk(res, { items, meta: { page, size, total, sort } });
  } catch (err) {
    console.error("GET /reviews/:reviewId/comments error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to fetch comments");
  }
});

/**
 * @openapi
 * /reviews/{reviewId}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: 댓글 생성 (리뷰에 종속)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "댓글입니다"
 *     responses:
 *       201:
 *         description: 생성 성공
 *       404:
 *         description: review not found
 */
router.post("/:reviewId/comments", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  const body = req.body ?? {};
  const payload = { content: body.content };

  const errors = validateCommentCreate(payload);
  if (Object.keys(errors).length) return sendError(res, 400, "BAD_REQUEST", "invalid body", errors);

  try {
    const exists = await Reviews.count({ where: { id: reviewId } });
    if (!exists) return sendError(res, 404, "NOT_FOUND", "review not found");

    const created = await Comments.create({
      review_id: reviewId,
      user_id: req.auth.userId,
      content: payload.content.trim(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    return sendOk(res, created, 201);
  } catch (err) {
    console.error("POST /reviews/:reviewId/comments error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to create comment");
  }
});

/**
 * @openapi
 * /reviews/{reviewId}/comments/{commentId}:
 *   patch:
 *     tags: [Comments]
 *     summary: 댓글 수정 (본인 또는 ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "수정된 댓글"
 *     responses:
 *       200:
 *         description: 수정 성공
 *       403:
 *         description: no permission
 *       404:
 *         description: comment not found
 */
router.patch("/:reviewId/comments/:commentId", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  const commentId = parseId(req.params.commentId);
  if (!reviewId || !commentId) return sendError(res, 400, "BAD_REQUEST", "invalid id");

  const body = req.body ?? {};
  const payload = { content: body.content };

  const errors = validateCommentPatch(payload);
  if (Object.keys(errors).length) return sendError(res, 400, "BAD_REQUEST", "invalid body", errors);

  try {
    const comment = await Comments.findOne({
      where: { id: commentId, review_id: reviewId, deleted_at: null },
    });
    if (!comment) return sendError(res, 404, "NOT_FOUND", "comment not found");

    if (!canMutate(req, comment.user_id)) return sendError(res, 403, "FORBIDDEN", "no permission");

    await comment.update({
      ...(payload.content !== undefined ? { content: payload.content.trim() } : {}),
      updated_at: new Date(),
    });

    return sendOk(res, comment);
  } catch (err) {
    console.error("PATCH /reviews/:reviewId/comments/:commentId error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to update comment");
  }
});

/**
 * @openapi
 * /reviews/{reviewId}/comments/{commentId}:
 *   delete:
 *     tags: [Comments]
 *     summary: 댓글 삭제 (본인 또는 ADMIN) - soft delete
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       403:
 *         description: no permission
 *       404:
 *         description: comment not found
 */
router.delete("/:reviewId/comments/:commentId", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  const commentId = parseId(req.params.commentId);
  if (!reviewId || !commentId) return sendError(res, 400, "BAD_REQUEST", "invalid id");

  try {
    const comment = await Comments.findOne({
      where: { id: commentId, review_id: reviewId, deleted_at: null },
    });
    if (!comment) return sendError(res, 404, "NOT_FOUND", "comment not found");

    if (!canMutate(req, comment.user_id)) return sendError(res, 403, "FORBIDDEN", "no permission");

    await comment.update({ deleted_at: new Date(), updated_at: new Date() });
    return sendOk(res, { ok: true });
  } catch (err) {
    console.error("DELETE /reviews/:reviewId/comments/:commentId error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to delete comment");
  }
});

/**
 * @openapi
 * /reviews/{reviewId}/likes:
 *   post:
 *     tags: [ReviewLikes]
 *     summary: 리뷰 좋아요 ON
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 좋아요 성공
 *       404:
 *         description: review not found
 *   delete:
 *     tags: [ReviewLikes]
 *     summary: 리뷰 좋아요 OFF
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 좋아요 취소 성공
 */
router.post("/:reviewId/likes", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  try {
    const exists = await Reviews.count({ where: { id: reviewId } });
    if (!exists) return sendError(res, 404, "NOT_FOUND", "review not found");

    const userId = req.auth.userId;
    const row = await ReviewLikes.findOne({ where: { review_id: reviewId, user_id: userId } });

    if (!row) {
      await ReviewLikes.create({
        review_id: reviewId,
        user_id: userId,
        is_active: 1,
        created_at: new Date(),
      });
    } else if (Number(row.is_active) !== 1) {
      await row.update({ is_active: 1 });
    }

    return sendOk(res, "좋아요를 눌렀습니다");
  } catch (err) {
    console.error("POST /reviews/:reviewId/likes error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to like review");
  }
});

router.delete("/:reviewId/likes", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  if (!reviewId) return sendError(res, 400, "BAD_REQUEST", "invalid review id");

  try {
    const userId = req.auth.userId;
    const row = await ReviewLikes.findOne({ where: { review_id: reviewId, user_id: userId } });
    if (row && Number(row.is_active) === 1) {
      await row.update({ is_active: 0 });
    }
    return sendOk(res, "좋아요를 취소했습니다");
  } catch (err) {
    console.error("DELETE /reviews/:reviewId/likes error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to unlike review");
  }
});

/**
 * @openapi
 * /reviews/{reviewId}/comments/{commentId}/likes:
 *   post:
 *     tags: [CommentLikes]
 *     summary: 댓글 좋아요 ON
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 좋아요 성공
 *       404:
 *         description: comment not found
 *   delete:
 *     tags: [CommentLikes]
 *     summary: 댓글 좋아요 OFF
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 좋아요 취소 성공
 */
router.post("/:reviewId/comments/:commentId/likes", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  const commentId = parseId(req.params.commentId);
  if (!reviewId || !commentId) return sendError(res, 400, "BAD_REQUEST", "invalid id");

  try {
    const comment = await Comments.findOne({
      where: { id: commentId, review_id: reviewId, deleted_at: null },
    });
    if (!comment) return sendError(res, 404, "NOT_FOUND", "comment not found");

    const userId = req.auth.userId;
    const row = await CommentLikes.findOne({ where: { comment_id: commentId, user_id: userId } });

    if (!row) {
      await CommentLikes.create({
        comment_id: commentId,
        user_id: userId,
        is_active: 1,
        created_at: new Date(),
      });
    } else if (Number(row.is_active) !== 1) {
      await row.update({ is_active: 1 });
    }

    return sendOk(res, "좋아요를 눌렀습니다");
  } catch (err) {
    console.error("POST /reviews/:reviewId/comments/:commentId/likes error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to like comment");
  }
});

router.delete("/:reviewId/comments/:commentId/likes", requireAuth, async (req, res) => {
  const reviewId = parseId(req.params.reviewId);
  const commentId = parseId(req.params.commentId);
  if (!reviewId || !commentId) return sendError(res, 400, "BAD_REQUEST", "invalid id");

  try {
    const userId = req.auth.userId;
    const row = await CommentLikes.findOne({ where: { comment_id: commentId, user_id: userId } });
    if (row && Number(row.is_active) === 1) {
      await row.update({ is_active: 0 });
    }
    return sendOk(res, "좋아요를 취소했습니다");
  } catch (err) {
    console.error("DELETE /reviews/:reviewId/comments/:commentId/likes error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "failed to unlike comment");
  }
});

export default router;
