// src/routes/carts.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Carts, CartItems, Books } = models;

const CART_SORT_FIELDS = {
  created_at: "created_at",
  quantity: "quantity",
  book_price: "book.price",
};

function getUserId(req) {
  return req.auth?.userId ?? req.user?.id ?? null;
}

/**
 * @openapi
 * /carts/me:
 *   get:
 *     tags: [Carts]
 *     summary: 내 장바구니 조회
 *     description: |
 *       - is_active=1 인 카트 아이템만 조회
 *       - 페이지네이션 + 정렬 지원
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         description: "허용: created_at, quantity, book_price (예: created_at,DESC)"
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 장바구니 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size, offset } = parsePagination(req.query);
  const { order, sort } = parseSort(req.query.sort, CART_SORT_FIELDS, "created_at,DESC");

  try {
    const { rows, count } = await CartItems.findAndCountAll({
      where: { cart_user_id: userId, is_active: 1 },
      include: [
        {
          model: Books,
          as: "book",
          attributes: ["id", "title", "price"],
        },
      ],
      order,
      limit: size,
      offset,
    });

    const content = rows.map((item) => ({
      cartItemId: item.id,
      book: {
        id: item.book.id,
        title: item.book.title,
        price: item.book.price,
      },
      quantity: item.quantity,
      totalPrice: item.quantity * item.book.price,
      addedAt: item.created_at,
    }));

    return sendOk(res, {
      content,
      page,
      size,
      totalElements: count,
      totalPages: Math.ceil(count / size),
      sort,
    });
  } catch (err) {
    console.error("GET /carts/me error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get cart");
  }
});

/**
 * @openapi
 * /carts:
 *   post:
 *     tags: [Carts]
 *     summary: 장바구니에 도서 담기
 *     description: |
 *       - 이미 담긴 도서는 quantity 증가
 *       - 없으면 새 cart_item 생성
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: 추가 성공
 *       400:
 *         description: validation failed
 *       404:
 *         description: book not found
 */
router.post("", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { bookId, quantity } = req.body ?? {};

  const errors = {};
  const bid = parseInt(bookId, 10);
  const qty = quantity == null ? 1 : parseInt(quantity, 10);

  if (!Number.isFinite(bid) || bid <= 0) errors.bookId = "bookId must be positive integer";
  if (!Number.isFinite(qty) || qty <= 0) errors.quantity = "quantity must be positive integer";

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  const t = await CartItems.sequelize.transaction();
  try {
    const book = await Books.findOne({
      where: { id: bid, deleted_at: null },
      transaction: t,
    });
    if (!book) {
      await t.rollback();
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    const existing = await CartItems.findOne({
      where: { cart_user_id: userId, book_id: bid },
      transaction: t,
    });

    if (existing) {
      existing.quantity += qty;
      existing.is_active = true;
      existing.updated_at = new Date();
      await existing.save({ transaction: t });
    } else {
      await CartItems.create(
        {
          cart_user_id: userId,
          book_id: bid,
          quantity: qty,
          is_active: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction: t }
      );
    }

    await t.commit();
    return sendOk(res, `아이템이 ${qty}개 추가되었습니다`);
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error("POST /carts error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to add cart item");
  }
});

/**
 * @openapi
 * /carts/{userId}:
 *   get:
 *     tags: [Carts]
 *     summary: 특정 유저 장바구니 조회 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 조회 성공
 *       400:
 *         description: invalid userId
 */
router.get("/:userId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    return sendError(res, 400, "BAD_REQUEST", "invalid userId");
  }

  const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
  const offset = (page - 1) * size;

  try {
    const { rows, count } = await CartItems.findAndCountAll({
      where: { cart_user_id: userId, is_active: 1 },
      include: [
        {
          model: Books,
          as: "book",
          attributes: ["id", "title", "price"],
        },
      ],
      limit: size,
      offset,
      order: [["created_at", "DESC"]],
    });

    const content = rows.map((item) => ({
      cartItemId: item.id,
      book: {
        id: item.book.id,
        title: item.book.title,
        price: item.book.price,
      },
      quantity: item.quantity,
      totalPrice: item.quantity * item.book.price,
      addedAt: item.created_at,
    }));

    return sendOk(res, {
      content,
      page,
      size,
      totalElements: count,
      totalPages: Math.ceil(count / size),
    });
  } catch (err) {
    console.error("GET /carts/:userId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get cart");
  }
});

/**
 * @openapi
 * /carts/{cartItemId}:
 *   put:
 *     tags: [Carts]
 *     summary: 장바구니 수량 변경
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: cart item not found
 */
router.put("/:cartItemId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const cartItemId = parseInt(req.params.cartItemId, 10);
  if (!cartItemId) return sendError(res, 400, "BAD_REQUEST", "invalid cartItemId");

  const { quantity } = req.body ?? {};
  const q = parseInt(quantity, 10);

  if (!Number.isFinite(q) || q <= 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", {
      quantity: "quantity must be a positive integer",
    });
  }

  try {
    const item = await CartItems.findOne({
      where: { id: cartItemId, cart_user_id: userId, is_active: 1 },
    });

    if (!item) return sendError(res, 404, "NOT_FOUND", "cart item not found");

    item.quantity = q;
    item.updated_at = new Date();
    await item.save();

    return sendOk(res, {});
  } catch (err) {
    console.error("PUT /carts/:cartItemId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update cart item");
  }
});

/**
 * @openapi
 * /carts/{cartItemId}:
 *   delete:
 *     tags: [Carts]
 *     summary: 장바구니 항목 삭제 (soft delete)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: cart item not found
 */
router.delete("/:cartItemId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const cartItemId = parseInt(req.params.cartItemId, 10);
  if (!cartItemId) return sendError(res, 400, "BAD_REQUEST", "invalid cartItemId");

  try {
    const item = await CartItems.findOne({
      where: { id: cartItemId, cart_user_id: userId, is_active: 1 },
    });

    if (!item) return sendError(res, 404, "NOT_FOUND", "cart item not found");

    item.is_active = false;
    item.updated_at = new Date();
    await item.save();

    return sendOk(res, {});
  } catch (err) {
    console.error("DELETE /carts/:cartItemId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete cart item");
  }
});

/**
 * @openapi
 * /carts:
 *   delete:
 *     tags: [Carts]
 *     summary: 내 장바구니 비우기
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 장바구니 초기화 성공
 */
router.delete("/", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, "UNAUTHORIZED", "missing user");

  try {
    await CartItems.update(
      { is_active: 0, updated_at: new Date() },
      { where: { cart_user_id: userId, is_active: 1 } }
    );

    return sendOk(res, {});
  } catch (err) {
    console.error("DELETE /carts error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to clear cart");
  }
});

export default router;
