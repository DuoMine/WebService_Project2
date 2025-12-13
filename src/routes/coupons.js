// src/routes/coupons.js
import { Router } from "express";
import { Op } from "sequelize";
import { models, sequelize } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Coupons, UserCoupons, Users, OrderCoupons } = models;

function parseId(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const COUPON_SORT_MAP = {
  created_at: "created_at",
  start_at: "start_at",
  end_at: "end_at",
  discount_rate: "discount_rate",
  status: "status",
};

const USER_COUPON_SORT_MAP = {
  issued_at: "issued_at",
  used_at: "used_at",
  status: "status",
};

/** 쿠폰 생성 검증 */
function validateCouponCreate(body) {
  const errors = {};
  const rate = body?.discount_rate;
  const startAt = body?.start_at;
  const endAt = body?.end_at;
  const status = body?.status;

  if (!Number.isInteger(rate) || rate < 1 || rate > 100) {
    errors.discount_rate = "discount_rate must be integer 1~100";
  }

  const s = new Date(startAt);
  const e = new Date(endAt);
  if (!startAt || Number.isNaN(s.getTime())) errors.start_at = "start_at is invalid datetime";
  if (!endAt || Number.isNaN(e.getTime())) errors.end_at = "end_at is invalid datetime";
  if (!errors.start_at && !errors.end_at && s >= e) errors.period = "start_at must be before end_at";

  if (status !== undefined) {
    const allowed = ["SCHEDULED", "ACTIVE", "PAUSED", "ENDED"];
    if (typeof status !== "string" || !allowed.includes(status)) {
      errors.status = `status must be one of ${allowed.join(", ")}`;
    }
  }

  if (body?.name !== undefined && body?.name !== null && typeof body?.name !== "string") {
    errors.name = "name must be string or null";
  }

  return errors;
}

function validateAssignBody(body) {
  const errors = {};
  const userIds = body?.user_ids;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    errors.user_ids = "user_ids must be non-empty array";
    return errors;
  }
  const cleaned = userIds
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (cleaned.length === 0) errors.user_ids = "user_ids has no valid ids";
  return errors;
}

/**
 * @openapi
 * tags:
 *   - name: Coupons
 *     description: 쿠폰/유저쿠폰 관리 API
 *
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: access_token
 */

/**
 * @openapi
 * /coupons:
 *   post:
 *     tags: [Coupons]
 *     summary: 쿠폰 생성 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [discount_rate, start_at, end_at]
 *             properties:
 *               name:
 *                 type: string
 *                 nullable: true
 *                 example: 겨울 10% 할인
 *               discount_rate:
 *                 type: integer
 *                 example: 10
 *               start_at:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-12-01T00:00:00.000Z
 *               end_at:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-12-31T23:59:59.000Z
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, ACTIVE, PAUSED, ENDED]
 *                 example: SCHEDULED
 *     responses:
 *       201: { description: 생성 성공 }
 *       400: { description: BAD_REQUEST }
 *       401: { description: UNAUTHORIZED }
 *       403: { description: FORBIDDEN }
 *       500: { description: failed to create coupon }
 */
// 쿠폰 생성 (ADMIN)
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const errors = validateCouponCreate(req.body);
  if (Object.keys(errors).length) {
    return sendError(res, 400, "BAD_REQUEST", "invalid body", { errors });
  }

  try {
    const now = new Date();
    const c = await Coupons.create({
      name: req.body.name ?? null,
      discount_rate: req.body.discount_rate,
      start_at: new Date(req.body.start_at),
      end_at: new Date(req.body.end_at),
      status: req.body.status ?? "SCHEDULED",
      created_at: now,
      updated_at: now,
    });

    return sendOk(
      res,
      {
        id: c.id,
        name: c.name,
        discount_rate: c.discount_rate,
        start_at: c.start_at,
        end_at: c.end_at,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at,
      },
      201
    );
  } catch (err) {
    console.error("POST /coupons error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create coupon");
  }
});

/**
 * @openapi
 * /coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: 쿠폰 목록 조회 (ADMIN)
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
 *         name: status
 *         schema: { type: string, enum: [SCHEDULED, ACTIVE, PAUSED, ENDED] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         example: created_at,DESC
 *     responses:
 *       200: { description: 조회 성공 }
 *       401: { description: UNAUTHORIZED }
 *       403: { description: FORBIDDEN }
 *       500: { description: failed to list coupons }
 */
// 쿠폰 리스트 (ADMIN)
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);

  const { order, sort } = parseSort(req.query.sort, COUPON_SORT_MAP, "created_at,DESC");

  const where = {};
  if (req.query.status) where.status = req.query.status;

  if (req.query.q && typeof req.query.q === "string" && req.query.q.trim()) {
    where.name = { [Op.like]: `%${req.query.q.trim()}%` };
  }

  try {
    const { rows, count } = await Coupons.findAndCountAll({
      where,
      limit: size,
      offset,
      order,
    });

    return sendOk(res, {
      items: rows.map((c) => ({
        id: c.id,
        name: c.name,
        discount_rate: c.discount_rate,
        start_at: c.start_at,
        end_at: c.end_at,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      page,
      size,
      totalElements: count,
      totalPages: Math.ceil(count / size),
      sort,
    });
  } catch (err) {
    console.error("GET /coupons error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list coupons");
  }
});

/**
 * @openapi
 * /coupons/{couponId}/assign:
 *   post:
 *     tags: [Coupons]
 *     summary: 유저에게 쿠폰 지급 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_ids]
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1,2,3]
 *     responses:
 *       200: { description: 지급 결과 반환 }
 *       400: { description: BAD_REQUEST }
 *       401: { description: UNAUTHORIZED }
 *       403: { description: FORBIDDEN }
 *       404: { description: coupon not found }
 *       500: { description: failed to assign coupon }
 */
// ✅ 유저 쿠폰 할당 (ADMIN) - 경로 수정!
router.post("/:couponId/assign", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const couponId = parseId(req.params.couponId);
  if (!couponId) return sendError(res, 400, "BAD_REQUEST", "invalid couponId");

  const errors = validateAssignBody(req.body);
  if (Object.keys(errors).length) {
    return sendError(res, 400, "BAD_REQUEST", "invalid body", { errors });
  }

  const userIds = [...new Set(req.body.user_ids.map((x) => parseInt(x, 10)))].filter((n) => n > 0);

  try {
    const coupon = await Coupons.findByPk(couponId);
    if (!coupon) return sendError(res, 404, "NOT_FOUND", "coupon not found");

    const users = await Users.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ["id"],
    });
    const validIds = new Set(users.map((u) => u.id));
    const invalid = userIds.filter((id) => !validIds.has(id));
    const targets = userIds.filter((id) => validIds.has(id));

    const existed = await UserCoupons.findAll({
      where: { coupon_id: couponId, user_id: { [Op.in]: targets } },
      attributes: ["user_id"],
    });
    const existedSet = new Set(existed.map((x) => x.user_id));

    const toInsert = targets.filter((id) => !existedSet.has(id));

    const now = new Date();
    if (toInsert.length > 0) {
      await UserCoupons.bulkCreate(
        toInsert.map((uid) => ({
          user_id: uid,
          coupon_id: couponId,
          status: "ISSUED",
          issued_at: now,
        })),
        { validate: true }
      );
    }

    return sendOk(res, {
      coupon_id: couponId,
      assigned: toInsert,
      skipped: targets.filter((id) => existedSet.has(id)),
      invalid,
    });
  } catch (err) {
    console.error("POST /coupons/:couponId/assign error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to assign coupon");
  }
});

/**
 * @openapi
 * /coupons/{userId}:
 *   get:
 *     tags: [Coupons]
 *     summary: 유저의 쿠폰 목록 조회 (본인 또는 ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: show
 *         schema: { type: string, enum: [issued, all], default: issued }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         example: issued_at,DESC
 *     responses:
 *       200: { description: 조회 성공 }
 *       403: { description: cannot view other user's coupons }
 *       404: { description: invalid userId }
 *       500: { description: failed to list user coupons }
 */
// 유저 쿠폰 확인 (본인 또는 ADMIN)
router.get("/:userId", requireAuth, async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return sendError(res, 400, "BAD_REQUEST", "invalid userId");

  const auth = req.auth;
  const isAdmin = auth?.role === "ADMIN";
  if (!isAdmin && auth?.userId !== userId) {
    return sendError(res, 403, "FORBIDDEN", "cannot view other user's coupons");
  }

  const show = String(req.query.show ?? "issued").toLowerCase(); // issued | all
  const where = { user_id: userId };
  if (show !== "all") where.status = "ISSUED";

  const sortResult = parseSort(req.query.sort, USER_COUPON_SORT_MAP, "issued_at,DESC");

  try {
    const rows = await UserCoupons.findAll({
      where,
      include: [
        {
          model: Coupons,
          attributes: ["id", "name", "discount_rate", "start_at", "end_at", "status"],
        },
      ],
      order: sortResult.order,
    });

    return sendOk(res, {
      user_id: userId,
      sort: sortResult.sort,
      items: rows.map((uc) => ({
        id: uc.id,
        coupon_id: uc.coupon_id,
        status: uc.status,
        issued_at: uc.issued_at,
        used_at: uc.used_at,
        coupon: uc.coupon
          ? {
              id: uc.coupon.id,
              name: uc.coupon.name,
              discount_rate: uc.coupon.discount_rate,
              start_at: uc.coupon.start_at,
              end_at: uc.coupon.end_at,
              status: uc.coupon.status,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error("GET /coupons/:userId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list user coupons");
  }
});

/**
 * @openapi
 * /coupons/refresh:
 *   patch:
 *     tags: [Coupons]
 *     summary: 쿠폰 상태 일괄 갱신 (ADMIN) - SCHEDULED->ACTIVE, ACTIVE->ENDED
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: 갱신 결과 }
 *       401: { description: UNAUTHORIZED }
 *       403: { description: FORBIDDEN }
 *       500: { description: failed to refresh coupons status }
 */
// 쿠폰 상태 갱신 (ADMIN)
router.patch("/refresh", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const now = new Date();

  try {
    const result = await (sequelize ?? Coupons.sequelize).transaction(async (t) => {
      const toActivate = await Coupons.findAll({
        where: {
          status: "SCHEDULED",
          start_at: { [Op.lte]: now },
          end_at: { [Op.gte]: now },
        },
        attributes: ["id"],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const activateIds = toActivate.map((c) => c.id);

      const toEnd = await Coupons.findAll({
        where: {
          status: "ACTIVE",
          end_at: { [Op.lt]: now },
        },
        attributes: ["id"],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const endIds = toEnd.map((c) => c.id);

      let activated = 0;
      let ended = 0;

      if (activateIds.length > 0) {
        const [cnt] = await Coupons.update(
          { status: "ACTIVE", updated_at: now },
          { where: { id: { [Op.in]: activateIds } }, transaction: t }
        );
        activated = cnt;
      }

      if (endIds.length > 0) {
        const [cnt] = await Coupons.update(
          { status: "ENDED", updated_at: now },
          { where: { id: { [Op.in]: endIds } }, transaction: t }
        );
        ended = cnt;
      }

      return { activated, ended, activateIds, endIds };
    });

    return sendOk(res, {
      activated: result.activated,
      ended: result.ended,
      activated_ids: result.activateIds,
      ended_ids: result.endIds,
      executed_at: now,
    });
  } catch (err) {
    console.error("PATCH /coupons/refresh error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to refresh coupons status");
  }
});

/**
 * @openapi
 * /coupons/{couponId}:
 *   delete:
 *     tags: [Coupons]
 *     summary: 쿠폰 삭제 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: 삭제 성공 }
 *       404: { description: coupon not found }
 *       409: { description: coupon already used in orders; cannot delete }
 *       500: { description: failed to delete coupon }
 */
// 쿠폰 삭제 (ADMIN)
router.delete("/:couponId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const couponId = parseId(req.params.couponId);
  if (!couponId) return sendError(res, 400, "BAD_REQUEST", "invalid couponId");

  try {
    const coupon = await Coupons.findByPk(couponId);
    if (!coupon) return sendError(res, 404, "NOT_FOUND", "coupon not found");

    const used = await OrderCoupons.count({ where: { coupon_id: couponId } });
    if (used > 0) {
      return sendError(res, 409, "CONFLICT", "coupon already used in orders; cannot delete");
    }

    await sequelize.transaction(async (t) => {
      await UserCoupons.destroy({ where: { coupon_id: couponId }, transaction: t });
      await Coupons.destroy({ where: { id: couponId }, transaction: t });
    });

    return sendOk(res, { deleted: true, coupon_id: couponId });
  } catch (err) {
    console.error("DELETE /coupons/:couponId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete coupon");
  }
});

export default router;
