// src/routes/favorites.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();
const { Favorites, Books } = models;

// 간단 페이지 파서
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "10", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

/**
 * 6.1 위시리스트 추가 (POST /favorites)
 * body: { bookId: bigint }
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { bookId } = req.body ?? {};

  if (!bookId || !Number.isInteger(Number(bookId))) {
    return sendError(res, 400, "VALIDATION_FAILED", "bookId is required");
  }

  try {
    const book = await Books.findByPk(bookId);
    if (!book) {
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    // 이미 있는지 검사 (중복 방지)
    const existing = await Favorites.findOne({
      where: { user_id: userId, book_id: bookId },
    });

    if (existing) {
      // 굳이 에러 안 던지고 그냥 성공 처리해도 됨
      return sendSuccess(res, "이미 위시리스트에 있는 도서입니다.");
    }

    await Favorites.create({
      user_id: userId,
      book_id: bookId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return sendSuccess(res, "위시리스트에 추가되었습니다.");
  } catch (err) {
    console.error("POST /favorites error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to add favorite");
  }
});

/**
 * 6.2 위시리스트 조회 (GET /favorites)
 * query: page, size
 * 응답 payload:
 * {
 *   content: [{ favoriteId, bookId, bookTitle, addedAt }],
 *   pagination: { currentPage, totalPages, totalElements, size }
 * }
 */
router.get("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size, offset } = parsePagination(req.query);

  try {
    const { rows, count } = await Favorites.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Books,
          as: "book",
          attributes: ["title"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: size,
      offset,
    });

    const totalElements = count;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));

    const content = rows.map((fav) => ({
      favoriteId: fav.id,
      bookId: fav.book_id,
      bookTitle: fav.book?.title ?? null,
      addedAt: fav.created_at,
    }));

    return sendSuccess(res, "위시리스트 조회 성공", {
      content,
      pagination: {
        currentPage: page,
        totalPages,
        totalElements,
        size,
      },
    });
  } catch (err) {
    console.error("GET /favorites error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list favorites");
  }
});

/**
 * 6.3 위시리스트 삭제 (DELETE /favorites/{favoriteId})
 */
router.delete("/:favoriteId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const favoriteId = Number(req.params.favoriteId);

  if (!favoriteId || !Number.isInteger(favoriteId)) {
    return sendError(res, 400, "VALIDATION_FAILED", "favoriteId must be integer");
  }

  try {
    const deleted = await Favorites.destroy({
      where: { id: favoriteId, user_id: userId },
    });

    if (!deleted) {
      return sendError(res, 404, "NOT_FOUND", "favorite not found");
    }

    return sendSuccess(res, "위시리스트에서 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /favorites/:favoriteId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete favorite");
  }
});

export default router;
