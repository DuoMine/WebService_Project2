// src/routes/payments.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();
const { Payments, Orders, UserCoupons, Coupons, Users } = models;

function sendOk(res, message, payload = undefined) {
  return res.json({
    isSuccess: true,
    message,
    ...(payload !== undefined ? { payload } : {}),
  });
}

function parsePaymentBody(body) {
  const errors = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { body: "body is required" } };
  }

  const result = {};

  // orderId
  if (!body.orderId) {
    errors.orderId = "orderId is required";
  } else {
    const v = Number(body.orderId);
    if (!Number.isInteger(v) || v <= 0) {
      errors.orderId = "orderId must be positive integer";
    } else {
      result.orderId = v;
    }
  }

  // paymentMethod
  if (!body.paymentMethod || typeof body.paymentMethod !== "string") {
    errors.paymentMethod = "paymentMethod is required (e.g. CARD, BANK, POINT)";
  } else {
    result.paymentMethod = body.paymentMethod.trim();
  }

  // userCouponId (optional)
  if (body.userCouponId != null) {
    const v = Number(body.userCouponId);
    if (!Number.isInteger(v) || v <= 0) {
      errors.userCouponId = "userCouponId must be positive integer";
    } else {
      result.userCouponId = v;
    }
  } else {
    result.userCouponId = null;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: result };
}

/**
 * POST /payments
 * body: { orderId, paymentMethod, userCouponId? }
 * - 주문 상태가 PENDING인 경우만 결제
 * - userCouponId가 있으면 해당 쿠폰을 USED로 변경
 * - Payment 레코드를 SUCCESS로 생성
 */
router.post("/payments", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  const { ok, value, errors } = parsePaymentBody(req.body);
  if (!ok) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "invalid request body",
      errors
    );
  }

  const { orderId, paymentMethod, userCouponId } = value;

  try {
    // 1) 주문 조회 (본인 주문인지 확인)
    const order = await Orders.findOne({
      where: {
        id: orderId,
        user_id: userId,
      },
    });

    if (!order) {
      return sendError(res, 404, "NOT_FOUND", "order not found");
    }

    if (order.status !== "PENDING") {
      return sendError(
        res,
        400,
        "BAD_REQUEST",
        "only PENDING orders can be paid"
      );
    }

    const orderAmount = Number(order.total_amount ?? 0);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return sendError(
        res,
        400,
        "BAD_REQUEST",
        "order amount must be positive"
      );
    }

    let usedCoupon = null;

    // 2) userCouponId 있으면 사용 가능 여부 확인 후 USED 처리
    if (userCouponId) {
      const now = new Date();
      const userCoupon = await UserCoupons.findOne({
        where: { id: userCouponId, user_id: userId },
        include: [
          {
            model: Coupons,
            where: {
              deleted_at: { [Op.is]: null },
            },
          },
        ],
      });

      if (!userCoupon) {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          "user coupon not found"
        );
      }

      if (userCoupon.status !== "AVAILABLE") {
        return sendError(
          res,
          400,
          "BAD_REQUEST",
          "coupon is not available"
        );
      }

      if (userCoupon.expires_at && userCoupon.expires_at < now) {
        // 만료 처리
        userCoupon.status = "EXPIRED";
        userCoupon.updated_at = now;
        await userCoupon.save();
        return sendError(res, 400, "BAD_REQUEST", "coupon expired");
      }

      // 여기서 실제 할인 금액 계산까지 하려면 쿠폰 타입/조건을 사용하면 됨
      // (지금은 단순히 "이 결제에 쿠폰을 사용했다"는 상태만 관리)
      userCoupon.status = "USED";
      userCoupon.used_at = now;
      userCoupon.updated_at = now;
      await userCoupon.save();

      usedCoupon = userCoupon;
    }

    // 3) Payment 레코드 생성 (여기선 항상 성공이라고 가정)
    const now = new Date();
    const payment = await Payments.create({
      order_id: order.id,
      user_id: userId,
      amount: orderAmount,
      method: paymentMethod,
      status: "SUCCESS", // SUCCESS / FAILED 등
      transaction_id: null, // 외부 PG 연동 시 여기에 트랜잭션 ID 기록
      created_at: now,
      updated_at: now,
    });

    // 4) 주문 상태를 PAID로 변경
    order.status = "PAID";
    order.updated_at = now;
    if (usedCoupon) {
      // 주문에 쿠폰 연관 컬럼이 있으면 연결
      // (예: order.coupon_id, order.user_coupon_id 등)
      if ("coupon_id" in order && usedCoupon.coupon_id) {
        order.coupon_id = usedCoupon.coupon_id;
      }
      if ("user_coupon_id" in order) {
        order.user_coupon_id = usedCoupon.id;
      }
    }
    await order.save();

    return sendOk(res, "결제가 완료되었습니다.", {
      paymentId: payment.id,
      orderId: order.id,
      amount: payment.amount,
      status: payment.status,
      usedCouponId: usedCoupon?.id ?? null,
    });
  } catch (err) {
    console.error("POST /payments error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create payment"
    );
  }
});

/**
 * GET /payments/:paymentId
 * - 본인 결제건만 조회 가능
 * - ADMIN은 아무나 조회 가능
 */
router.get("/payments/:paymentId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const role = req.auth.role;
  const paymentId = parseInt(req.params.paymentId, 10);

  if (!paymentId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid paymentId");
  }

  try {
    const payment = await Payments.findOne({
      where: { id: paymentId },
      include: [
        {
          model: Orders,
          include: [
            {
              model: Users,
              attributes: ["id", "email", "name"],
            },
          ],
        },
      ],
    });

    if (!payment) {
      return sendError(res, 404, "NOT_FOUND", "payment not found");
    }

    // 본인 또는 ADMIN만 조회 허용
    const ownerId = payment.user_id ?? payment.Order?.user_id;
    if (role !== "ADMIN" && ownerId !== userId) {
      return sendError(res, 403, "FORBIDDEN", "no permission to view payment");
    }

    const payload = {
      id: payment.id,
      orderId: payment.order_id,
      userId: payment.user_id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      orderUser: payment.Order?.User
        ? {
            id: payment.Order.User.id,
            email: payment.Order.User.email,
            name: payment.Order.User.name,
          }
        : null,
    };

    return sendOk(res, "결제 상세 조회 성공", payload);
  } catch (err) {
    console.error("GET /payments/:paymentId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get payment"
    );
  }
});

export default router;
