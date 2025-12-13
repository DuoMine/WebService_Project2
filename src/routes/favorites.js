// src/routes/favorites.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Favorites, Books } = models;

/**
 * @openapi
 * /favorites:
 *   post:
 *     tags: [Favorites]
 *     summary: 찜(즐겨찾기) 추가
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookId]
 *             properties:
 *               bookId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: 생성 성공
 *       400:
 *         description: bookId must be positive integer
 *       404:
 *         description: book not found
 *       409:
 *         description: already favorited
 *       500:
 *         description: failed to add favorite
 */
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

    return sendOk(
      res,
      {
        id: fav.id,
        userId: fav.user_id,
        bookId: fav.book_id,
        createdAt: fav.created_at,
      },
      201
    );
  } catch (err) {
    console.error("POST /favorites error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to add favorite");
  }
});

/**
 * @openapi
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: 내 찜 목록 조회 (페이지네이션)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: 성공
 *       500:
 *         description: failed to list favorites
 */
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
      sort: "created_at,DESC"
    });
  } catch (err) {
    console.error("GET /favorites error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list favorites");
  }
});

/**
 * @openapi
 * /favorites/{id}:
 *   get:
 *     tags: [Favorites]
 *     summary: 찜 단건 조회 (ADMIN)
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
 *         description: id must be positive integer
 *       404:
 *         description: favorite not found
 *       500:
 *         description: failed to get favorite
 */
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
 * @openapi
 * /favorites/{favoriteId}:
 *   delete:
 *     tags: [Favorites]
 *     summary: 내 찜 삭제
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       400:
 *         description: favoriteId must be positive integer
 *       404:
 *         description: favorite not found
 *       500:
 *         description: failed to delete favorite
 */
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

    return sendOk(res, "찜이 취소되었습니다");
  } catch (err) {
    console.error("DELETE /favorites/:favoriteId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete favorite");
  }
});

export default router;
