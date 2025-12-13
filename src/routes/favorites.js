// src/routes/favorites.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";

const router = Router();
const { Favorites, Books } = models;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "10", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}
// ----------------------------
// POST /favorites
// body: { bookId }
// ----------------------------
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const bookId = parseInt(req.body?.bookId, 10);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return sendError(res, 400, "BAD_REQUEST", "bookId must be positive integer");
  }

  try {
    const book = await Books.findByPk(bookId);
    if (!book) return sendError(res, 404, "NOT_FOUND", "book not found");

    // 1) (권장) DB에 UNIQUE(user_id, book_id) 있다면 그냥 create하고 중복이면 409
    // 2) 지금은 안전하게 사전 체크도 유지 (레이스컨디션은 완벽히 못 막음)
    const existing = await Favorites.findOne({ where: { user_id: userId, book_id: bookId } });
    if (existing) {
      return sendError(res, 409, "CONFLICT", "already favorited");
    }

    const fav = await Favorites.create({
      user_id: userId,
      book_id: bookId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return sendOk(res, {
      id: fav.id,
      userId: fav.user_id,
      bookId: fav.book_id,
      createdAt: fav.created_at,
    }, 201);
  } catch (err) {
    console.error("POST /favorites error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to add favorite");
  }
});

/**
 * GET /favorites?page=1&size=10
 */
router.get("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size, offset } = parsePagination(req.query);

  try {
    const { rows, count } = await Favorites.findAndCountAll({
      where: { user_id: userId },
      include: [{ model: Books, as: "book", attributes: ["id", "title", "price"] }],
      order: [["created_at", "DESC"]],
      limit: size,
      offset,
    });

    const content = rows.map((fav) => ({
      id: fav.id,
      bookId: fav.book_id,
      createdAt: fav.created_at,
      book: fav.book
        ? {
            id: fav.book.id,
            title: fav.book.title,
            price: fav.book.price,
          }
        : null,
    }));

    return sendOk(res, {
      content,
      page,
      size,
      totalElements: count,
      totalPages: Math.ceil(count / size),
    });
  } catch (err) {
    console.error("GET /favorites error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list favorites");
  }
});

/**
 * GET /favorites/:id (ADMIN)
 */
router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const favoriteId = parseInt(req.params.id, 10);

  if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
    return sendError(res, 400, "BAD_REQUEST", "id must be positive integer");
  }

  try {
    const favorite = await Favorites.findByPk(favoriteId, {
      include: [
        {
          model: Books,
          as: "book",
          attributes: ["id", "title", "price"],
        },
        {
          model: models.Users,
          as: "user",
          attributes: ["id", "email"],
        },
      ],
    });

    if (!favorite) {
      return sendError(res, 404, "NOT_FOUND", "favorite not found");
    }

    return sendOk(res, {
      id: favorite.id,
      createdAt: favorite.created_at,
      user: favorite.user
        ? {
            id: favorite.user.id,
            email: favorite.user.email,
          }
        : null,
      book: favorite.book
        ? {
            id: favorite.book.id,
            title: favorite.book.title,
            price: favorite.book.price,
          }
        : null,
    });
  } catch (err) {
    console.error("GET /favorites/:id (ADMIN) error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get favorite");
  }
});

/**
 * DELETE /favorites/:favoriteId
 */
router.delete("/:favoriteId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const favoriteId = parseInt(req.params.favoriteId, 10);

  if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
    return sendError(res, 400, "BAD_REQUEST", "favoriteId must be positive integer");
  }

  try {
    const deleted = await Favorites.destroy({ where: { id: favoriteId, user_id: userId } });
    if (!deleted) return sendError(res, 404, "NOT_FOUND", "favorite not found");

    return sendOk(res, { deleted: true });
  } catch (err) {
    console.error("DELETE /favorites/:favoriteId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete favorite");
  }
});

export default router;
