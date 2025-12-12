// src/routes/orders.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/auth.js";
import { sendError, sendSuccess } from "../utils/http.js";

const router = Router();
const { Orders, OrderItems, Books } = models;

/**
 * 주문 생성 body 검증
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
      if (!it.bookId || !Number.isInteger(Number(it.bookId))) {
        errors[`items[${idx}].bookId`] = "bookId must be integer";
      }
      if (!it.quantity || !Number.isInteger(Number(it.quantity)) || it.quantity <= 0) {
        errors[`items[${idx}].quantity`] = "quantity must be positive integer";
      }
    });
  }

  if (couponId != null && !Number.isInteger(Number(couponId))) {
    errors.couponId = "couponId must be integer";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

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
 * 응답 payload: { orderId, totalAmount }
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { ok, value, errors } = validateCreateOrderBody(req.body);

  if (!ok) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "invalid request body",
      errors
    );
  }

  const { items, couponId } = value;

  try {
    // 책 정보 가져오기
    const bookIds = [...new Set(items.map((it) => it.bookId))];

    const books = await Books.findAll({
      where: { id: bookIds },
    });

    if (books.length !== bookIds.length) {
      return sendError(res, 400, "BAD_REQUEST", "some books not found");
    }

    const bookMap = new Map(books.map((b) => [b.id, b]));

    // 금액 계산 (단순 price * quantity)
    let totalAmount = 0;
    const orderItemRows = items.map((it) => {
      const book = bookMap.get(it.bookId);
      const unitPrice = Number(book.price); // 컬럼명: price 라고 가정
      const lineAmount = unitPrice * it.quantity;
      totalAmount += lineAmount;

      return {
        book_id: it.bookId,
        quantity: it.quantity,
        unit_price: unitPrice,
      };
    });

    // 쿠폰 로직은 과제에서 안따지면 생략 / TODO 표시 정도
    // TODO: couponId 적용 시 할인 금액 반영

    // 트랜잭션으로 묶는 게 베스트지만, 일단 단순 구현
    const order = await Orders.create({
      user_id: userId,
      status: "PENDING", // 결제 전 상태 (설명과 맞추기)
      total_amount: totalAmount,
      coupon_id: couponId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // orderItems 생성
    await OrderItems.bulkCreate(
      orderItemRows.map((row) => ({
        order_id: order.id,
        book_id: row.book_id,
        quantity: row.quantity,
        unit_price: row.unit_price,
        created_at: new Date(),
        updated_at: new Date(),
      }))
    );

    return sendSuccess(res, "주문이 생성되었습니다.", {
      orderId: order.id,
      totalAmount,
    });
  } catch (err) {
    console.error("POST /orders error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create order");
  }
});

/**
 * 7.2 주문 조회 (GET /orders/{orderId})
 * 응답 payload:
 * {
 *   orderId, status, totalAmount, createdAt,
 *   items: [{ bookId, title, quantity, unitPrice }]
 * }
 */
router.get("/:orderId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const orderId = Number(req.params.orderId);

  if (!orderId || !Number.isInteger(orderId)) {
    return sendError(res, 400, "VALIDATION_FAILED", "orderId must be integer");
  }

  try {
    const order = await Orders.findOne({
      where: { id: orderId, user_id: userId },
      include: [
        {
          model: OrderItems,
          as: "items",
          include: [
            {
              model: Books,
              as: "book",
              attributes: ["title"],
            },
          ],
        },
      ],
    });

    if (!order) {
      return sendError(res, 404, "NOT_FOUND", "order not found");
    }

    const payload = {
      orderId: order.id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      items: (order.items ?? []).map((item) => ({
        bookId: item.book_id,
        title: item.book?.title ?? null,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    };

    return sendSuccess(res, "주문 상세 조회 성공", payload);
  } catch (err) {
    console.error("GET /orders/:orderId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get order");
  }
});

/**
 * 7.3 주문 삭제(취소) (DELETE /orders/{orderId})
 * - 결제 전(PENDING)인 주문만 취소 가능하게 구현
 */
router.delete("/:orderId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const orderId = Number(req.params.orderId);

  if (!orderId || !Number.isInteger(orderId)) {
    return sendError(res, 400, "VALIDATION_FAILED", "orderId must be integer");
  }

  try {
    const order = await Orders.findOne({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      return sendError(res, 404, "NOT_FOUND", "order not found");
    }

    if (order.status !== "PENDING") {
      return sendError(
        res,
        400,
        "BAD_REQUEST",
        "only pending orders can be cancelled"
      );
    }

    order.status = "CANCELLED";
    order.updated_at = new Date();
    await order.save();

    return sendSuccess(res, "주문이 취소되었습니다.");
  } catch (err) {
    console.error("DELETE /orders/:orderId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to cancel order");
  }
});

export default router;
