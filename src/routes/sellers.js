// src/routes/sellers.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Sellers } = models;

const SELLER_SORT_FIELDS = {
  id: "id",
  business_name: "business_name",
  email: "email",
  created_at: "created_at",
  updated_at: "updated_at",
};

function toSellerRow(s) {
  return {
    id: s.id,
    businessName: s.business_name,
    businessNumber: s.business_number,
    email: s.email,
    phoneNumber: s.phone_number,
    address: s.address,
    payoutBank: s.payout_bank,
    payoutAccount: s.payout_account,
    payoutHolder: s.payout_holder,
    commissionRate: s.commission_rate,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    deletedAt: s.deleted_at,
  };
}

/**
 * @openapi
 * tags:
 *   - name: Sellers
 *     description: 판매자 관리 API
 */

/**
 * @openapi
 * /sellers:
 *   post:
 *     tags: [Sellers]
 *     summary: 판매자 등록 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, businessNumber, email]
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: 테스트출판사
 *               businessNumber:
 *                 type: string
 *                 example: 123-45-67890
 *               email:
 *                 type: string
 *                 example: seller@example.com
 *               phoneNumber:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *               payoutBank:
 *                 type: string
 *                 nullable: true
 *               payoutAccount:
 *                 type: string
 *                 nullable: true
 *               payoutHolder:
 *                 type: string
 *                 nullable: true
 *               commissionRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 90
 *     responses:
 *       201:
 *         description: 판매자 생성 성공
 *       400:
 *         description: VALIDATION_FAILED
 *       401:
 *         description: UNAUTHORIZED
 *       403:
 *         description: FORBIDDEN
 *       409:
 *         description: DUPLICATE_RESOURCE
 *       500:
 *         description: failed to create seller
 */
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const {
    businessName,
    businessNumber,
    email,
    phoneNumber,
    address,
    payoutBank,
    payoutAccount,
    payoutHolder,
    commissionRate,
  } = req.body ?? {};

  const errors = {};

  // required
  if (typeof businessName !== "string" || !businessName.trim()) {
    errors.businessName = "businessName is required";
  }
  if (typeof businessNumber !== "string" || !businessNumber.trim()) {
    errors.businessNumber = "businessNumber is required";
  }
  if (typeof email !== "string" || !email.trim()) {
    errors.email = "email is required";
  }

  // optional string/null
  if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== "string") {
    errors.phoneNumber = "phoneNumber must be string or null";
  }
  if (address !== undefined && address !== null && typeof address !== "string") {
    errors.address = "address must be string or null";
  }
  if (payoutBank !== undefined && payoutBank !== null && typeof payoutBank !== "string") {
    errors.payoutBank = "payoutBank must be string or null";
  }
  if (payoutAccount !== undefined && payoutAccount !== null && typeof payoutAccount !== "string") {
    errors.payoutAccount = "payoutAccount must be string or null";
  }
  if (payoutHolder !== undefined && payoutHolder !== null && typeof payoutHolder !== "string") {
    errors.payoutHolder = "payoutHolder must be string or null";
  }

  // ✅ commissionRate: optional number, 0~90 (PUT와 동일)
  if (commissionRate !== undefined && commissionRate !== null) {
    const r = Number(commissionRate);
    if (!Number.isFinite(r) || r < 0 || r > 90) {
      errors.commissionRate = "commissionRate must be between 0 and 90";
    }
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  try {
    const dup = await Sellers.findOne({
      where: {
        deleted_at: null,
        [Op.or]: [{ business_number: businessNumber.trim() }, { email: email.trim() }],
      },
    });
    if (dup) {
      return sendError(res, 409, "DUPLICATE_RESOURCE", "seller already exists");
    }

    const now = new Date();
    const seller = await Sellers.create({
      business_name: businessName.trim(),
      business_number: businessNumber.trim(),
      email: email.trim(),
      phone_number: phoneNumber ?? null,
      address: address ?? null,
      payout_bank: payoutBank ?? null,
      payout_account: payoutAccount ?? null,
      payout_holder: payoutHolder ?? null,
      commission_rate: commissionRate ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return sendOk(res, { sellerId: seller.id }, 201);
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      const details = {};
      for (const e of err.errors ?? []) {
        if (e.path) details[e.path] = "duplicate";
      }
      return sendError(res, 409, "DUPLICATE_RESOURCE", "seller already exists", details);
    }

    console.error("POST /sellers error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create seller");
  }
});

/**
 * @openapi
 * /sellers:
 *   get:
 *     tags: [Sellers]
 *     summary: 판매자 목록 조회 (공개)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: businessName / email / businessNumber 검색
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         example: id,ASC
 *     responses:
 *       200:
 *         description: 조회 성공
 *       500:
 *         description: failed to get sellers
 */
// ----------------------------
// GET /sellers
// ----------------------------
router.get("/", async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);
  const q = (req.query.q || "").toString().trim();

  const where = { deleted_at: null };
  if (q) {
    where[Op.or] = [
      { business_name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { business_number: { [Op.like]: `%${q}%` } },
    ];
  }

  const { order, sort } = parseSort(req.query.sort, SELLER_SORT_FIELDS, "id,ASC");

  try {
    const { rows, count } = await Sellers.findAndCountAll({
      where,
      limit: size,
      offset,
      order,
    });

    const content = rows.map((s) => ({
      id: s.id,
      businessName: s.business_name,
      businessNumber: s.business_number,
      email: s.email,
      phoneNumber: s.phone_number,
      createdAt: s.created_at,
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
    console.error("GET /sellers error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get sellers");
  }
});

/**
 * @openapi
 * /sellers/{sellerId}:
 *   get:
 *     tags: [Sellers]
 *     summary: 판매자 상세 조회 (공개)
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 조회 성공
 *       400:
 *         description: invalid sellerId
 *       404:
 *         description: seller not found
 *       500:
 *         description: failed to get seller
 */
// ----------------------------
// GET /sellers/:sellerId
// ----------------------------
router.get("/:sellerId", async (req, res) => {
  const sellerId = parseInt(req.params.sellerId, 10);
  if (!sellerId) return sendError(res, 400, "BAD_REQUEST", "invalid sellerId");

  try {
    const s = await Sellers.findOne({ where: { id: sellerId, deleted_at: null } });
    if (!s) return sendError(res, 404, "NOT_FOUND", "seller not found");

    return sendOk(res, toSellerRow(s));
  } catch (err) {
    console.error("GET /sellers/:sellerId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get seller");
  }
});

/**
 * @openapi
 * /sellers/{sellerId}:
 *   put:
 *     tags: [Sellers]
 *     summary: 판매자 수정 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName: { type: string }
 *               phoneNumber: { type: string, nullable: true }
 *               address: { type: string, nullable: true }
 *               payoutBank: { type: string, nullable: true }
 *               payoutAccount: { type: string, nullable: true }
 *               payoutHolder: { type: string, nullable: true }
 *               commissionRate: { type: number }
 *     responses:
 *       200:
 *         description: 수정 성공
 *       400:
 *         description: VALIDATION_FAILED
 *       401:
 *         description: UNAUTHORIZED
 *       403:
 *         description: FORBIDDEN
 *       404:
 *         description: seller not found
 *       500:
 *         description: failed to update seller
 */
// ----------------------------
// PUT /sellers/:sellerId (ADMIN)
// ----------------------------
router.put("/:sellerId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const sellerId = parseInt(req.params.sellerId, 10);
  if (!Number.isFinite(sellerId) || sellerId <= 0) {
    return sendError(res, 400, "BAD_REQUEST", "invalid sellerId");
  }

  const {
    businessName,
    businessNumber,
    email,
    phoneNumber,
    address,
    payoutBank,
    payoutAccount,
    payoutHolder,
    commissionRate,
  } = req.body ?? {};

  const errors = {};
  if (businessNumber !== undefined) errors.businessNumber = "businessNumber cannot be updated";
  if (email !== undefined) errors.email = "email cannot be updated";

  if (businessName !== undefined && (typeof businessName !== "string" || !businessName.trim())) {
    errors.businessName = "businessName must be non-empty string";
  }

  if (commissionRate !== undefined) {
    const r = Number(commissionRate);
    if (!Number.isFinite(r) || r < 0 || r > 90) {
      errors.commissionRate = "commissionRate must be between 0 and 90";
    }
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  try {
    const s = await Sellers.findOne({ where: { id: sellerId, deleted_at: null } });
    if (!s) return sendError(res, 404, "NOT_FOUND", "seller not found");

    if (businessName !== undefined) s.business_name = businessName.trim();
    if (phoneNumber !== undefined) s.phone_number = phoneNumber;
    if (address !== undefined) s.address = address;
    if (payoutBank !== undefined) s.payout_bank = payoutBank;
    if (payoutAccount !== undefined) s.payout_account = payoutAccount;
    if (payoutHolder !== undefined) s.payout_holder = payoutHolder;
    if (commissionRate !== undefined) s.commission_rate = Number(commissionRate);

    s.updated_at = new Date();
    await s.save();

    return sendOk(res, "판매자 정보가 수정되었습니다");
  } catch (err) {
    console.error("PUT /sellers/:sellerId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update seller");
  }
});

/**
 * @openapi
 * /sellers/{sellerId}:
 *   delete:
 *     tags: [Sellers]
 *     summary: 판매자 삭제 (ADMIN, soft delete)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       400:
 *         description: invalid sellerId
 *       401:
 *         description: UNAUTHORIZED
 *       403:
 *         description: FORBIDDEN
 *       404:
 *         description: seller not found
 *       500:
 *         description: failed to delete seller
 */
// ----------------------------
// DELETE /sellers/:sellerId (ADMIN)
// ----------------------------
router.delete("/:sellerId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const sellerId = parseInt(req.params.sellerId, 10);
  if (!sellerId) return sendError(res, 400, "BAD_REQUEST", "invalid sellerId");

  try {
    const s = await Sellers.findOne({ where: { id: sellerId, deleted_at: null } });
    if (!s) return sendError(res, 404, "NOT_FOUND", "seller not found");

    s.deleted_at = new Date();
    s.updated_at = new Date();
    await s.save();

    return sendOk(res, "판매자가 삭제되었습니다");
  } catch (err) {
    console.error("DELETE /sellers/:sellerId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete seller");
  }
});

export default router;
