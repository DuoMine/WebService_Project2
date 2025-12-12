// src/routes/coupons.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();

const { Coupons, UserCoupons } = models;

// ----------------------------
// 공통 헬퍼
// ----------------------------
function sendOk(res, message, payload = undefined) {
  return res.json({
    isSuccess: true,
    message,
    ...(payload !== undefined ? { payload } : {}),
  });
}

function buildPagination(page, size, total) {
  return {
    currentPage: page,
    totalPages: Math.ceil(total / size),
    totalElements: total,
    size,
  };
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "10", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

// ----------------------------
// 쿠폰 바디 검증 (생성/수정 공통)
// ----------------------------
function validateCouponBody(body, { partial = false } = {}) {
  const errors = {};
  const result = {};

  const fields = [
    "name",           // 쿠폰 이름
    "code",           // 코드 (선택)
    "discountType",   // 'PERCENT' | 'AMOUNT'
    "discountValue",  // 숫자
    "minOrderAmount", // 최소 주문 금액 (optional)
    "maxDiscountAmount", // 최대 할인 금액 (optional, 퍼센트일 때)
    "validFrom",      // 시작일 (ISO string)
    "validUntil",     // 종료일 (ISO string)
    "totalCount",     // 발급 가능 총 수량 (optional, null이면 무제한)
  ];

  function has(key) {
    return Object.hasOwn(body ?? {}, key);
  }

  // 필수 체크는 partial=false일 때만
  function required(key) {
    return !partial || has(key);
  }

  // name
  if (required("name") && has("name")) {
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      errors.name = "name must be non-empty string";
    } else {
      result.name = body.name.trim();
    }
  }

  // code (선택)
  if (has("code")) {
    if (body.code == null || body.code === "") {
      result.code = null;
    } else if (typeof body.code !== "string") {
      errors.code = "code must be string";
    } else {
      result.code = body.code.trim();
    }
  }

  // discountType
  if (required("discountType") && has("discountType")) {
    const allowed = ["PERCENT", "AMOUNT"];
    if (!allowed.includes(body.discountType)) {
      errors.discountType = `discountType must be one of ${allowed.join(", ")}`;
    } else {
      result.discount_type = body.discountType;
    }
  }

  // discountValue
  if (required("discountValue") && has("discountValue")) {
    const v = Number(body.discountValue);
    if (!Number.isFinite(v) || v <= 0) {
      errors.discountValue = "discountValue must be positive number";
    } else {
      result.discount_value = v;
    }
  }

  // minOrderAmount
  if (has("minOrderAmount")) {
    if (body.minOrderAmount == null || body.minOrderAmount === "") {
      result.min_order_amount = null;
    } else {
      const v = Number(body.minOrderAmount);
      if (!Number.isFinite(v) || v < 0) {
        errors.minOrderAmount = "minOrderAmount must be >= 0";
      } else {
        result.min_order_amount = v;
      }
    }
  }

  // maxDiscountAmount
  if (has("maxDiscountAmount")) {
    if (body.maxDiscountAmount == null || body.maxDiscountAmount === "") {
      result.max_discount_amount = null;
    } else {
      const v = Number(body.maxDiscountAmount);
      if (!Number.isFinite(v) || v < 0) {
        errors.maxDiscountAmount = "maxDiscountAmount must be >= 0";
      } else {
        result.max_discount_amount = v;
      }
    }
  }

  // validFrom / validUntil
  if (required("validFrom") && has("validFrom")) {
    const d = new Date(body.validFrom);
    if (Number.isNaN(d.getTime())) {
      errors.validFrom = "validFrom must be valid datetime string";
    } else {
      result.valid_from = d;
    }
  }

  if (required("validUntil") && has("validUntil")) {
    const d = new Date(body.validUntil);
    if (Number.isNaN(d.getTime())) {
      errors.validUntil = "validUntil must be valid datetime string";
    } else {
      result.valid_until = d;
    }
  }

  // totalCount
  if (has("totalCount")) {
    if (body.totalCount == null || body.totalCount === "") {
      result.total_count = null; // null = 무제한 발급
    } else {
      const v = Number(body.totalCount);
      if (!Number.isInteger(v) || v < 0) {
        errors.totalCount = "totalCount must be integer >= 0 (or null)";
      } else {
        result.total_count = v;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: result };
}

// ---------------------------------------------------------------------
// [ADMIN] 쿠폰 생성  - POST /coupons
// ---------------------------------------------------------------------
router.post("/coupons", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { ok, value, errors } = validateCouponBody(req.body, {
    partial: false,
  });
  if (!ok) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "invalid request body",
      errors
    );
  }

  try {
    // 코드가 있으면 중복 체크
    if (value.code) {
      const existing = await Coupons.findOne({
        where: {
          code: value.code,
          deleted_at: { [Op.is]: null },
        },
      });
      if (existing) {
        return sendError(
          res,
          409,
          "DUPLICATE_RESOURCE",
          "coupon code already exists"
        );
      }
    }

    const now = new Date();
    const coupon = await Coupons.create({
      ...value,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return sendOk(res, "쿠폰이 생성되었습니다.", { couponId: coupon.id });
  } catch (err) {
    console.error("POST /coupons error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create coupon"
    );
  }
});

// ---------------------------------------------------------------------
// [ADMIN] 쿠폰 목록 조회 - GET /coupons
// query: page, size, status, q
// ---------------------------------------------------------------------
router.get("/coupons", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);
  const status = (req.query.status || "").toString().trim(); // ACTIVE / INACTIVE 등 가정
  const q = (req.query.q || "").toString().trim();

  const where = {
    deleted_at: { [Op.is]: null },
  };

  if (status) {
    where.status = status;
  }
  if (q) {
    where.name = { [Op.like]: `%${q}%` };
  }

  try {
    const { rows, count } = await Coupons.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [["created_at", "DESC"]],
    });

    const content = rows.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      status: c.status,
      validFrom: c.valid_from,
      validUntil: c.valid_until,
      totalCount: c.total_count,
    }));

    return sendOk(res, "쿠폰 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /coupons error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get coupons"
    );
  }
});

// ---------------------------------------------------------------------
// [ADMIN] 쿠폰 상세 조회 - GET /coupons/:couponId
// ---------------------------------------------------------------------
router.get(
  "/coupons/:couponId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const couponId = parseInt(req.params.couponId, 10);
    if (!couponId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid couponId");
    }

    try {
      const coupon = await Coupons.findOne({
        where: { id: couponId, deleted_at: { [Op.is]: null } },
      });

      if (!coupon) {
        return sendError(res, 404, "NOT_FOUND", "coupon not found");
      }

      const payload = {
        id: coupon.id,
        name: coupon.name,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minOrderAmount: coupon.min_order_amount,
        maxDiscountAmount: coupon.max_discount_amount,
        validFrom: coupon.valid_from,
        validUntil: coupon.valid_until,
        totalCount: coupon.total_count,
        status: coupon.status,
      };

      return sendOk(res, "쿠폰 상세 조회 성공", payload);
    } catch (err) {
      console.error("GET /coupons/:couponId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to get coupon"
      );
    }
  }
);

// ---------------------------------------------------------------------
// [ADMIN] 쿠폰 수정 - PUT /coupons/:couponId
// ---------------------------------------------------------------------
router.put(
  "/coupons/:couponId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const couponId = parseInt(req.params.couponId, 10);
    if (!couponId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid couponId");
    }

    const { ok, value, errors } = validateCouponBody(req.body, {
      partial: true,
    });
    if (!ok) {
      return sendError(
        res,
        400,
        "VALIDATION_FAILED",
        "invalid request body",
        errors
      );
    }

    try {
      const coupon = await Coupons.findOne({
        where: { id: couponId, deleted_at: { [Op.is]: null } },
      });

      if (!coupon) {
        return sendError(res, 404, "NOT_FOUND", "coupon not found");
      }

      // code 변경 시 중복 체크
      if (value.code && value.code !== coupon.code) {
        const existing = await Coupons.findOne({
          where: {
            code: value.code,
            id: { [Op.ne]: coupon.id },
            deleted_at: { [Op.is]: null },
          },
        });
        if (existing) {
          return sendError(
            res,
            409,
            "DUPLICATE_RESOURCE",
            "coupon code already exists"
          );
        }
      }

      Object.assign(coupon, value, { updated_at: new Date() });
      await coupon.save();

      return sendOk(res, "쿠폰 정보가 수정되었습니다.");
    } catch (err) {
      console.error("PUT /coupons/:couponId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to update coupon"
      );
    }
  }
);

// ---------------------------------------------------------------------
// [ADMIN] 쿠폰 삭제 (soft delete) - DELETE /coupons/:couponId
// ---------------------------------------------------------------------
router.delete(
  "/coupons/:couponId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const couponId = parseInt(req.params.couponId, 10);
    if (!couponId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid couponId");
    }

    try {
      const coupon = await Coupons.findOne({
        where: { id: couponId, deleted_at: { [Op.is]: null } },
      });

      if (!coupon) {
        return sendError(res, 404, "NOT_FOUND", "coupon not found");
      }

      coupon.deleted_at = new Date();
      coupon.status = "INACTIVE";
      await coupon.save();

      return sendOk(res, "쿠폰이 삭제되었습니다.");
    } catch (err) {
      console.error("DELETE /coupons/:couponId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to delete coupon"
      );
    }
  }
);

// =====================================================================
//                           유저 쿠폰 영역
// =====================================================================

import { Op } from "sequelize";
// 위쪽에 이미 Op import 돼 있으면 이 줄은 생략

// 유효한 쿠폰인지 체크하는 헬퍼
async function ensureCouponUsable(couponId) {
  const now = new Date();
  const coupon = await Coupons.findOne({
    where: {
      id: couponId,
      status: "ACTIVE",
      deleted_at: { [Op.is]: null },
      valid_from: { [Op.lte]: now },
      valid_until: { [Op.gte]: now },
    },
  });
  return coupon;
}

/**
 * 1) 내 쿠폰 목록 조회
 * GET /coupons/me
 */
router.get("/coupons/me", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size, offset } = parsePagination(req.query);
  const status = (req.query.status || "").toString().trim(); // AVAILABLE / USED / EXPIRED

  const where = { user_id: userId };
  if (status) where.status = status;

  try {
    const { rows, count } = await UserCoupons.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [["issued_at", "DESC"]],
      include: [
        {
          model: Coupons,
          attributes: [
            "id",
            "name",
            "code",
            "discount_type",
            "discount_value",
            "valid_from",
            "valid_until",
          ],
        },
      ],
    });

    const content = rows.map((uc) => ({
      userCouponId: uc.id,
      status: uc.status,
      issuedAt: uc.issued_at,
      usedAt: uc.used_at,
      expiresAt: uc.expires_at,
      coupon: uc.Coupon
        ? {
            id: uc.Coupon.id,
            name: uc.Coupon.name,
            code: uc.Coupon.code,
            discountType: uc.Coupon.discount_type,
            discountValue: uc.Coupon.discount_value,
            validFrom: uc.Coupon.valid_from,
            validUntil: uc.Coupon.valid_until,
          }
        : null,
    }));

    return sendOk(res, "내 쿠폰 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /coupons/me error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get my coupons"
    );
  }
});

/**
 * 2) 특정 유저의 쿠폰 목록 조회 (관리자용)
 * GET /coupons/:userId
 */
router.get(
  "/coupons/:userId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid userId");
    }

    const { page, size, offset } = parsePagination(req.query);
    const status = (req.query.status || "").toString().trim();

    const where = { user_id: userId };
    if (status) where.status = status;

    try {
      const { rows, count } = await UserCoupons.findAndCountAll({
        where,
        offset,
        limit: size,
        order: [["issued_at", "DESC"]],
        include: [
          {
            model: Coupons,
            attributes: [
              "id",
              "name",
              "code",
              "discount_type",
              "discount_value",
              "valid_from",
              "valid_until",
            ],
          },
        ],
      });

      const content = rows.map((uc) => ({
        userCouponId: uc.id,
        status: uc.status,
        issuedAt: uc.issued_at,
        usedAt: uc.used_at,
        expiresAt: uc.expires_at,
        coupon: uc.Coupon
          ? {
              id: uc.Coupon.id,
              name: uc.Coupon.name,
              code: uc.Coupon.code,
              discountType: uc.Coupon.discount_type,
              discountValue: uc.Coupon.discount_value,
              validFrom: uc.Coupon.valid_from,
              validUntil: uc.Coupon.valid_until,
            }
          : null,
      }));

      return sendOk(res, "유저 쿠폰 목록 조회 성공", {
        content,
        pagination: buildPagination(page, size, count),
      });
    } catch (err) {
      console.error("GET /coupons/:userId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to get user coupons"
      );
    }
  }
);

/**
 * 3) 특정 유저에게 쿠폰 발급 (관리자용)
 * POST /coupons/:userId/:couponId
 */
router.post(
  "/coupons/:userId/:couponId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const couponId = parseInt(req.params.couponId, 10);

    if (!userId || !couponId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid userId or couponId");
    }

    try {
      const coupon = await ensureCouponUsable(couponId);
      if (!coupon) {
        return sendError(res, 400, "BAD_REQUEST", "coupon is not usable");
      }

      // 총 발급 수량 제한
      if (coupon.total_count != null) {
        const issuedCount = await UserCoupons.count({
          where: { coupon_id: couponId },
        });
        if (issuedCount >= coupon.total_count) {
          return sendError(
            res,
            400,
            "LIMIT_EXCEEDED",
            "coupon total count exceeded"
          );
        }
      }

      // 같은 쿠폰이 AVAILABLE 상태로 이미 있으면 중복 발급 막기 (원하면 제거 가능)
      const existing = await UserCoupons.findOne({
        where: {
          coupon_id: couponId,
          user_id: userId,
          status: "AVAILABLE",
        },
      });

      if (existing) {
        return sendError(
          res,
          400,
          "ALREADY_OWNED",
          "user already has this coupon"
        );
      }

      const now = new Date();
      const userCoupon = await UserCoupons.create({
        user_id: userId,
        coupon_id: couponId,
        status: "AVAILABLE",
        issued_at: now,
        used_at: null,
        expires_at: coupon.valid_until,
        created_at: now,
        updated_at: now,
      });

      return sendOk(res, "유저에게 쿠폰이 발급되었습니다.", {
        userCouponId: userCoupon.id,
      });
    } catch (err) {
      console.error("POST /coupons/:userId/:couponId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to issue coupon"
      );
    }
  }
);

/**
 * (선택) 내 쿠폰 사용 처리
 * POST /coupons/me/:userCouponId/use
 * - 실제로는 주문/결제 로직에서 함께 처리하는 게 자연스럽고,
 *   이 엔드포인트는 디버그용으로만 써도 된다.
 */
router.post(
  "/coupons/me/:userCouponId/use",
  requireAuth,
  async (req, res) => {
    const userId = req.auth.userId;
    const userCouponId = parseInt(req.params.userCouponId, 10);
    if (!userCouponId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid userCouponId");
    }

    try {
      const uc = await UserCoupons.findOne({
        where: { id: userCouponId, user_id: userId },
        include: [{ model: Coupons }],
      });

      if (!uc) {
        return sendError(res, 404, "NOT_FOUND", "user coupon not found");
      }

      if (uc.status !== "AVAILABLE") {
        return sendError(
          res,
          400,
          "BAD_REQUEST",
          "coupon is not available to use"
        );
      }

      const now = new Date();
      if (uc.expires_at && uc.expires_at < now) {
        uc.status = "EXPIRED";
        uc.updated_at = now;
        await uc.save();
        return sendError(res, 400, "BAD_REQUEST", "coupon expired");
      }

      uc.status = "USED";
      uc.used_at = now;
      uc.updated_at = now;
      await uc.save();

      return sendOk(res, "쿠폰이 사용 처리되었습니다.");
    } catch (err) {
      console.error("POST /coupons/me/:userCouponId/use error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to use coupon"
      );
    }
  }
);