// src/routes/orders.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { Op } from "sequelize";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Orders, OrderItems, Books, sequelize, CartItems, UserCoupons, Coupons, OrderCoupons } = models;

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 주문 목록 정렬 허용 필드
const orderSortMap = {
  created_at: "created_at",
  total_amount: "total_amount",
  status: "status",
};

// 주문 상세의 items 정렬 허용 필드
const itemSortMap = {
  id: "id",
  book_id: "book_id",
  quantity: "quantity",
  unit_price: "unit_price",
  total_amount: "total_amount",
  created_at: "created_at",
};
/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: 주문 생성 (내 카트 기준)
 *     description: |
 *       - 결제 개념 없음. 생성 시 status=CREATED.
 *       - 내 카트 활성 아이템(is_active=1)을 스냅샷으로 order_items에 생성한다.
 *       - 주문 생성 후 내 카트 활성 아이템은 비활성화(is_active=0) 처리한다.
 *       - coupon_id를 주면 (UserCoupons: ISSUED) + (Coupons: ACTIVE) + (기간 유효) 일 때만 적용한다.
 *       - 적용 성공 시 user_coupons는 USED로 변경되고 order_coupons에 사용 기록이 남는다.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coupon_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *     responses:
 *       200:
 *         description: 주문 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId: { type: integer, example: 10 }
 *                 subtotalAmount: { type: integer, example: 30000 }
 *                 couponDiscount: { type: integer, example: 3000 }
 *                 totalAmount: { type: integer, example: 27000 }
 *                 itemsCount: { type: integer, example: 2 }
 *                 couponId: { type: integer, nullable: true, example: 1 }
 *       400:
 *         description: |
 *           BAD_REQUEST
 *           - invalid coupon_id
 *           - cart is empty
 *           - some books not found
 *           - invalid or unusable coupon
 *       401: { description: UNAUTHORIZED }
 *       500: { description: INTERNAL_SERVER_ERROR }
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  // 쿠폰 id (없으면 null)
  const couponIdRaw = req.body?.coupon_id;
  const couponId = couponIdRaw ? parseInt(couponIdRaw, 10) : null;
  if (couponIdRaw !== undefined && (!Number.isFinite(couponId) || couponId <= 0)) {
    return sendError(res, 400, "BAD_REQUEST", "invalid coupon_id");
  }

  try {
    const result = await (sequelize ?? Orders.sequelize).transaction(async (t) => {
      // 1) 카트 아이템 로드 (활성만)
      const cartItems = await CartItems.findAll({
        where: { cart_user_id: userId, is_active: 1 },
        transaction: t,
      });

      const total = await CartItems.count({ transaction: t });
      const mine = await CartItems.count({ where: { cart_user_id: userId }, transaction: t });
      const mineActive = await CartItems.count({
        where: { cart_user_id: userId, is_active: 1 },
        transaction: t,
      });

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

      // 3.5) 쿠폰 검증 + 할인 계산
      let couponDiscount = 0;
      let usedUserCouponId = null;
      let appliedCouponId = null;

      if (couponId) {
        const now = new Date();

        // 유저가 보유(ISSUED) + 쿠폰 유효(ACTIVE + 기간)인지 확인
        const userCoupon = await UserCoupons.findOne({
          where: {
            user_id: userId,
            coupon_id: couponId,
            status: "ISSUED",
          },
          include: [
            {
              model: Coupons,
              required: true,
              where: {
                status: "ACTIVE",
                start_at: { [Op.lte]: now },
                end_at: { [Op.gte]: now },
              },
            },
          ],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!userCoupon) {
          throw Object.assign(new Error("invalid or unusable coupon"), { code: "INVALID_COUPON" });
        }

        const rate = Number(userCoupon.coupon.discount_rate);
        if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
          throw new Error("invalid coupon discount_rate");
        }

        couponDiscount = Math.floor((subtotalAmount * rate) / 100);

        usedUserCouponId = userCoupon.id;
        appliedCouponId = userCoupon.coupon_id;
      }

      const totalAmount = subtotalAmount - couponDiscount;
      if (totalAmount < 0) throw new Error("totalAmount cannot be negative");

      // 4) orders 생성
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

      // 5.5) 쿠폰 사용 기록
      if (appliedCouponId) {
        await OrderCoupons.create(
          {
            order_id: createdOrder.id,
            coupon_id: appliedCouponId,
            amount: couponDiscount,
            user_coupon_id: usedUserCouponId,
            created_at: new Date(),
          },
          { transaction: t }
        );

        const [updated] = await UserCoupons.update(
          { status: "USED", used_at: new Date() },
          {
            where: { id: usedUserCouponId, status: "ISSUED" },
            transaction: t,
          }
        );
        if (updated !== 1) {
          throw new Error("failed to mark user coupon as USED");
        }
      }

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
        couponId: appliedCouponId,
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
    if (err?.code === "INVALID_COUPON") {
      return sendError(res, 400, "BAD_REQUEST", "invalid or unusable coupon");
    }
    console.error("POST /orders error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create order");
  }
});

/**
 * @openapi
 * /orders/detail/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: 내 주문 상세 조회 (items 포함)
 *     description: |
 *       - 내 주문 1건을 조회하고 주문 아이템(items)을 함께 반환한다.
 *       - items 정렬은 query sort로 적용한다. (예: sort=id,ASC)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 주문 ID
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "id,ASC" }
 *         description: "items 정렬 (허용: id, book_id, quantity, unit_price, total_amount, created_at)"
 *     responses:
 *       200: description: 조회 성공
 *       400: description: BAD_REQUEST (invalid order id)
 *       401: description: UNAUTHORIZED
 *       404: description: NOT_FOUND (order not found)
 *       500: description: INTERNAL_SERVER_ERROR
 */
router.get("/detail/:id", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const orderId = parseId(req.params.id);
  if (!orderId) return sendError(res, 400, "BAD_REQUEST", "invalid order id");

  const { order: itemOrder, sort } = parseSort(req.query.sort, itemSortMap, "id,ASC");

  try {
    const foundOrder = await Orders.findOne({
      where: { id: orderId, user_id: userId },
      include: [{ model: OrderItems, as: "items" }],
      order: [[{ model: OrderItems, as: "items" }, ...itemOrder[0]]],
    });

    if (!foundOrder) return sendError(res, 404, "NOT_FOUND", "order not found");

    return sendOk(res, {
      orderId: foundOrder.id,
      status: foundOrder.status,
      subtotalAmount: foundOrder.subtotal_amount,
      couponDiscount: foundOrder.coupon_discount,
      totalAmount: foundOrder.total_amount,
      createdAt: foundOrder.created_at,
      sort,
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
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: 내 주문 목록 조회 (페이지네이션 + 정렬)
 *     description: |
 *       - 내 주문 목록을 페이지네이션으로 조회한다.
 *       - status 필터와 정렬(sort)을 지원한다.
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
 *         schema: { type: string, example: "created_at,DESC" }
 *         description: "허용: created_at,total_amount,status"
 *       - in: query
 *         name: status
 *         schema: { type: string, example: "CREATED" }
 *         description: "CREATED | CANCELLED"
 *     responses:
 *       200: description: 조회 성공
 *       401: description: UNAUTHORIZED
 *       500: description: INTERNAL_SERVER_ERROR
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
      order,
    });

    return sendOk(res, {
      content: rows.map((o) => ({
        orderId: o.id,
        status: o.status,
        subtotalAmount: o.subtotal_amount,
        couponDiscount: o.coupon_discount,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      })),
      page, 
      size, 
      totalElements: count,
      totalPages: Math.ceil(count / size), 
      sort,
    });
  } catch (err) {
    console.error("GET /orders error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list orders");
  }
});

/**
 * @openapi
 * /orders/{userId}:
 *   get:
 *     tags: [Orders]
 *     summary: 특정 유저 주문 목록 조회 (ADMIN)
 *     description: |
 *       - 관리자 권한으로 특정 유저의 주문 목록을 조회한다.
 *       - 페이지네이션/정렬/status 필터 지원.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *         description: 대상 유저 ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "created_at,DESC" }
 *         description: "허용: created_at,total_amount,status"
 *       - in: query
 *         name: status
 *         schema: { type: string, example: "CREATED" }
 *         description: "CREATED | CANCELLED"
 *     responses:
 *       200: description: 조회 성공
 *       400: description: BAD_REQUEST (invalid userId)
 *       401: description: UNAUTHORIZED
 *       403: description: FORBIDDEN
 *       500: description: INTERNAL_SERVER_ERROR
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
      order,
    });

    return sendOk(res, {
      content: rows.map((o) => ({
        orderId: o.id,
        status: o.status,
        subtotalAmount: o.subtotal_amount,
        couponDiscount: o.coupon_discount,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      })),
      page, 
      size, 
      totalElements: count,
      totalPages: Math.ceil(count / size),
      sort,
    });
  } catch (err) {
    console.error("GET /orders/:userId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list orders");
  }
});

/**
 * @openapi
 * /orders/{orderId}:
 *   delete:
 *     tags: [Orders]
 *     summary: 주문 취소 (내 주문, CREATED만 가능)
 *     description: |
 *       - 내 주문만 취소 가능.
 *       - status가 CREATED인 주문만 CANCELLED로 변경 가능.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *         description: 주문 ID
 *     responses:
 *       200:
 *         description: 취소 성공
 *       400:
 *         description: |
 *           BAD_REQUEST
 *           - invalid orderId
 *           - only CREATED orders can be cancelled
 *       401:
 *         description: UNAUTHORIZED
 *       404:
 *         description: NOT_FOUND (order not found)
 *       500:
 *         description: INTERNAL_SERVER_ERROR
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
