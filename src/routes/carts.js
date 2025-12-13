// src/routes/carts.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";

const router = Router();
const { Carts, CartItems, Books } = models;

const CART_SORT_FIELDS = {
  created_at: "created_at",      // 담은 순서
  quantity: "quantity",          // 수량
  book_price: "book.price",      // 책 가격
};

function getUserId(req) {
  return req.user_id ?? req.user?.id ?? null;
}

// ----------------------------
// GET /carts/me  - 내 장바구니 조회
// ----------------------------
router.get( "/me", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { page, size, offset } = parsePagination(req.query);
    const { order, sort } = parseSort(
      req.query.sort,
      CART_SORT_FIELDS,
      "created_at,DESC"
    );

    try {
      const { rows, count } = await CartItems.findAndCountAll({
        where: {
          cart_user_id: userId,
          is_active: 1,
        },
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
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to get cart"
      );
    }
  }
);

// ----------------------------
// POST /carts  - 카트에 담기
// body: { bookId, quantity? }  (quantity 없으면 1)
// 규칙:
// - 책 존재해야 함 (deleted_at=null)
// - 이미 담겨 있으면 quantity 증가
// - 없으면 새로 생성
// ----------------------------
// POST /carts
// body: { bookId, quantity? }
router.post( "", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { bookId, quantity } = req.body ?? {};

    const errors = {};
    const bid = parseInt(bookId, 10);
    const qty = quantity == null ? 1 : parseInt(quantity, 10);

    if (!Number.isFinite(bid) || bid <= 0) {
      errors.bookId = "bookId must be a positive integer";
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.quantity = "quantity must be a positive integer";
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
    }

    const t = await CartItems.sequelize.transaction();
    try {
      // 책 존재 확인
      const book = await Books.findOne({
        where: { id: bid, deleted_at: null },
        transaction: t,
      });
      if (!book) {
        await t.rollback();
        return sendError(res, 404, "NOT_FOUND", "book not found");
      }

      // 기존 cart_item 조회 (active / inactive 모두)
      const existing = await CartItems.findOne({
        where: {
          cart_user_id: userId,
          book_id: bid,
        },
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
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to add cart item"
      );
    }
  }
);


// --------------------------------------------------
// GET /carts/:userId  (ADMIN)
// 특정 유저 카트 조회
// --------------------------------------------------
router.get( "/:userId", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      return sendError(res, 400, "BAD_REQUEST", "invalid userId");
    }

    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
    const offset = (page - 1) * size;

    try {
      // 카트 존재 확인
      const cart = await Carts.findOne({
        where: { user_id: userId },
      });

      if (!cart) {
        return sendOk(res, {
          content: [],
          page,
          size,
          totalElements: 0,
          totalPages: 0,
        });
      }

      const { rows, count } = await CartItems.findAndCountAll({
        where: {
          cart_user_id: userId,
          is_active: 1,
        },
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
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to get cart"
      );
    }
  }
);

// ----------------------------
// PUT /carts/:cartItemId  - 수량 변경 (내 것만)
// body: { quantity }
// ----------------------------
router.put("/:cartItemId", requireAuth, async (req, res) => {
  const userId = req.user.id;
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
      where: {
        id: cartItemId,
        cart_user_id: userId,
        is_active: 1,
      },
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


// ----------------------------
// DELETE /carts/:cartItemId  - 항목 삭제(soft: is_active=false)
// ----------------------------
router.delete("/:cartItemId", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const cartItemId = parseInt(req.params.cartItemId, 10);
  if (!cartItemId) return sendError(res, 400, "BAD_REQUEST", "invalid cartItemId");

  try {
    const item = await CartItems.findOne({
      where: {
        id: cartItemId,
        cart_user_id: userId,
        is_active: 1,
      },
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

// ----------------------------
// DELETE /carts/me  - 내 카트 비우기(전체 soft delete)
// ----------------------------
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
