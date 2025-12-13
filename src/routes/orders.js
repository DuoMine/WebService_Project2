// src/routes/orders.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";

const router = Router();
const { Orders, OrderItems, Books, sequelize, CartItems } = models;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "10", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ✅ 주문 목록 정렬 허용 필드
const orderSortMap = {
  created_at: "created_at",
  total_amount: "total_amount",
  status: "status",
  // 필요하면 추가:
  // subtotal_amount: "subtotal_amount",
  // coupon_discount: "coupon_discount",
  // updated_at: "updated_at",
};

// ✅ 주문 상세의 items 정렬 허용 필드
const itemSortMap = {
  id: "id",
  book_id: "book_id",
  quantity: "quantity",
  unit_price: "unit_price",
  total_amount: "total_amount",
  created_at: "created_at",
};

// NOTE: 주문은 cart_items 스냅샷 기반, 결제 개념 없음
/**
 * 주문 생성 body 검증
 * body: { items: [{bookId, quantity}], couponId? }
 */
function validateCreateOrderBody(body) {
  const errors = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { body: "body is required" } };
  }

  const { items, couponId } = body;

  if (!Array.isArray(items) || items.length === 0) {
    errors.items = "items must be non-empty array";
  } else {
    items.forEach((it, idx) => {
      const bookIdNum = Number(it?.bookId);
      const qtyNum = Number(it?.quantity);

      if (!Number.isInteger(bookIdNum) || bookIdNum <= 0) {
        errors[`items[${idx}].bookId`] = "bookId must be positive integer";
      }
      if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
        errors[`items[${idx}].quantity`] = "quantity must be positive integer";
      }
    });
  }

  if (couponId != null && !Number.isInteger(Number(couponId))) {
    errors.couponId = "couponId must be integer";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      items: items.map((it) => ({
        bookId: Number(it.bookId),
        quantity: Number(it.quantity),
      })),
      couponId: couponId != null ? Number(couponId) : null,
    },
  };
}

/**
 * 7.1 주문 생성 (POST /orders)
 * body: { items: [{bookId, quantity}], couponId? }
 * 응답: { orderId, subtotalAmount, couponDiscount, totalAmount }
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  console.log("auth=", req.auth);
  console.log("userId=", req.auth?.userId);
  try {
    const result = await (sequelize ?? Orders.sequelize).transaction(async (t) => {
      // 1) 카트 아이템 로드 (활성만)
      const cartItems = await CartItems.findAll({
        where: { cart_user_id: userId, is_active: 1 },
        transaction: t,
      });
      const total = await CartItems.count({ transaction: t });
      const mine = await CartItems.count({ where: { cart_user_id: userId }, transaction: t });
      const mineActive = await CartItems.count({ where: { cart_user_id: userId, is_active: true }, transaction: t });
      console.log("cart_items total/mine/mineActive:", total, mine, mineActive);
      if (!cartItems || cartItems.length === 0) {
        throw Object.assign(new Error("cart is empty"), { code: "EMPTY_CART" });
      }

      // 2) 필요한 책들 로드
      const bookIds = [...new Set(cartItems.map((ci) => ci.book_id))];

      const books = await Books.findAll({
        where: { id: bookIds },
        transaction: t,
      });

      if (books.length !== bookIds.length) {
        throw Object.assign(new Error("some books not found"), { code: "BOOK_NOT_FOUND" });
      }

      const bookMap = new Map(books.map((b) => [b.id, b]));

      // 3) order_items 스냅샷 생성 + 합계 계산
      let subtotalAmount = 0;

      const orderItemRows = cartItems.map((ci) => {
        const book = bookMap.get(ci.book_id);
        const quantity = Number(ci.quantity);

        const unitPrice = Number(book.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error("invalid book price");
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("invalid cart quantity");
        }

        const lineTotal = unitPrice * quantity;
        subtotalAmount += lineTotal;

        return {
          book_id: book.id,
          title_snapshot: book.title,
          quantity,
          unit_price: unitPrice,
          total_amount: lineTotal,
          created_at: new Date(),
          updated_at: new Date(),
        };
      });

      const couponDiscount = 0;
      const totalAmount = subtotalAmount - couponDiscount;
      if (totalAmount < 0) throw new Error("totalAmount cannot be negative");

      // 4) orders 생성 (결제 없음 => CREATED가 곧 확정)
      const createdOrder = await Orders.create(
        {
          user_id: userId,
          subtotal_amount: subtotalAmount,
          coupon_discount: couponDiscount,
          total_amount: totalAmount,
          status: "CREATED",
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction: t }
      );

      // 5) order_items 생성
      await OrderItems.bulkCreate(
        orderItemRows.map((row) => ({ ...row, order_id: createdOrder.id })),
        { transaction: t }
      );

      // 6) 카트 비우기: 활성 아이템 비활성화
      await CartItems.update(
        { is_active: 0, updated_at: new Date() },
        { where: { cart_user_id: userId, is_active: 1 }, transaction: t }
      );

      return {
        orderId: createdOrder.id,
        subtotalAmount,
        couponDiscount,
        totalAmount,
        itemsCount: orderItemRows.length,
      };
    });

    return sendOk(res, result);
  } catch (err) {
    if (err?.code === "EMPTY_CART") {
      return sendError(res, 400, "BAD_REQUEST", "cart is empty");
    }
    if (err?.code === "BOOK_NOT_FOUND") {
      return sendError(res, 400, "BAD_REQUEST", "some books not found");
    }
    console.error("POST /orders error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create order");
  }
});

/**
 * 내 주문 상세 조회 (GET /orders/detail/:id)
 * - sort는 items 정렬에 사용: ?sort=id,ASC  (기본 id,ASC)
 */
router.get("/detail/:id", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const orderId = parseId(req.params.id);
  if (!orderId) return sendError(res, 400, "BAD_REQUEST", "invalid order id");

  // ✅ items 정렬
  const { order: itemOrder, sort } = parseSort(req.query.sort, itemSortMap, "id,ASC");

  try {
    const foundOrder = await Orders.findOne({
      where: { id: orderId, user_id: userId },
      include: [{ model: OrderItems, as: "items" }],
      // items 정렬 적용
      order: [[{ model: OrderItems, as: "items" }, ...itemOrder[0]]], // 첫 조건만 items에 반영
    });

    if (!foundOrder) return sendError(res, 404, "NOT_FOUND", "order not found");

    return sendOk(res, {
      orderId: foundOrder.id,
      status: foundOrder.status,
      subtotalAmount: foundOrder.subtotal_amount,
      couponDiscount: foundOrder.coupon_discount,
      totalAmount: foundOrder.total_amount,
      createdAt: foundOrder.created_at,
      sort, // ✅ items 정렬 기준
      items: (foundOrder.items ?? []).map((it) => ({
        id: it.id,
        bookId: it.book_id,
        title: it.title_snapshot,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        lineTotal: it.total_amount,
      })),
    });
  } catch (err) {
    console.error("GET /orders/detail/:id error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get order");
  }
});

/**
 * GET /orders
 * - 내 주문 목록 조회 (페이지네이션 + sort)
 * - sort: ?sort=created_at,DESC (기본)
 */
router.get("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size, offset } = parsePagination(req.query);
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;

  const where = { user_id: userId };
  if (status) where.status = status;

  const { order, sort } = parseSort(req.query.sort, orderSortMap, "created_at,DESC");

  try {
    const { rows, count } = await Orders.findAndCountAll({
      where,
      limit: size,
      offset,
      order, // ✅ 적용
    });

    return sendOk(res, {
      items: rows.map((o) => ({
        orderId: o.id,
        status: o.status,
        subtotalAmount: o.subtotal_amount,
        couponDiscount: o.coupon_discount,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      })),
      meta: { page, size, total: count, sort }, // ✅
    });
  } catch (err) {
    console.error("GET /orders error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list orders");
  }
});

/**
 * GET /orders/:userId (ADMIN)
 * - 특정 유저 주문 목록 조회 (페이지네이션 + sort)
 */
router.get("/:userId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const targetUserId = parseId(req.params.userId);
  if (!targetUserId) return sendError(res, 400, "BAD_REQUEST", "invalid userId");

  const { page, size, offset } = parsePagination(req.query);
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;

  const where = { user_id: targetUserId };
  if (status) where.status = status;

  const { order, sort } = parseSort(req.query.sort, orderSortMap, "created_at,DESC");

  try {
    const { rows, count } = await Orders.findAndCountAll({
      where,
      limit: size,
      offset,
      order, // ✅ 적용
    });

    return sendOk(res, {
      userId: targetUserId,
      items: rows.map((o) => ({
        orderId: o.id,
        status: o.status,
        subtotalAmount: o.subtotal_amount,
        couponDiscount: o.coupon_discount,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      })),
      meta: { page, size, total: count, sort }, // ✅
    });
  } catch (err) {
    console.error("GET /orders/:userId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list orders");
  }
});

/**
 * 7.3 주문 취소 (DELETE /orders/:orderId)
 * - CREATED 상태만 취소 가능
 */
router.delete("/:orderId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const orderId = parseId(req.params.orderId);
  if (!orderId) return sendError(res, 400, "VALIDATION_FAILED", "orderId must be positive integer");

  try {
    const foundOrder = await Orders.findOne({ where: { id: orderId, user_id: userId } });
    if (!foundOrder) return sendError(res, 404, "NOT_FOUND", "order not found");

    if (foundOrder.status !== "CREATED") {
      return sendError(res, 400, "BAD_REQUEST", "only CREATED orders can be cancelled");
    }

    await foundOrder.update({
      status: "CANCELLED",
      updated_at: new Date(),
    });

    return sendOk(res, "주문이 취소되었습니다.");
  } catch (err) {
    console.error("DELETE /orders/:orderId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to cancel order");
  }
});

export default router;
