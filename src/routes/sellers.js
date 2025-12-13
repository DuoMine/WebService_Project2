// src/routes/sellers.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";

const router = Router();
const { Sellers } = models;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "10", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

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

// ----------------------------
// POST /sellers (ADMIN) - 판매자 등록
// body: { businessName, businessNumber, email, phoneNumber?, address?, payoutBank?, payoutAccount?, payoutHolder?, commissionRate? }
// ----------------------------
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
  if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
    errors.businessName = "businessName is required";
  }
  if (!businessNumber || typeof businessNumber !== "string" || !businessNumber.trim()) {
    errors.businessNumber = "businessNumber is required";
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    errors.email = "email is required";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  try {
    // 중복 체크(대충): 사업자번호, 이메일
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
    console.error("POST /sellers error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create seller");
  }
});

// ----------------------------
// GET /sellers - 판매자 목록 (공개)
// query: page, size, q, sort
// 응답: content,page,size,totalElements,totalPages,sort
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

// ----------------------------
// GET /sellers/:sellerId - 판매자 상세 (공개)
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

// ----------------------------
// PUT /sellers/:sellerId (ADMIN) - 판매자 수정
// body: { businessName?, businessNumber?, email?, phoneNumber?, address?, payoutBank?, payoutAccount?, payoutHolder?, commissionRate? }
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

  // 수정 가능한 필드 검증
  if (businessName !== undefined) {
    if (typeof businessName !== "string" || !businessName.trim()) {
      errors.businessName = "businessName must be non-empty string";
    }
  }

  if (phoneNumber !== undefined) {
    if (phoneNumber !== null && typeof phoneNumber !== "string") {
      errors.phoneNumber = "phoneNumber must be a string or null";
    }
  }

  if (address !== undefined) {
    if (address !== null && typeof address !== "string") {
      errors.address = "address must be a string or null";
    }
  }

  if (payoutBank !== undefined) {
    if (payoutBank !== null && typeof payoutBank !== "string") {
      errors.payoutBank = "payoutBank must be a string or null";
    }
  }

  if (payoutAccount !== undefined) {
    if (payoutAccount !== null && typeof payoutAccount !== "string") {
      errors.payoutAccount = "payoutAccount must be a string or null";
    }
  }

  if (payoutHolder !== undefined) {
    if (payoutHolder !== null && typeof payoutHolder !== "string") {
      errors.payoutHolder = "payoutHolder must be a string or null";
    }
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

    // ✅ 반영
    if (businessName !== undefined) s.business_name = businessName.trim();
    if (phoneNumber !== undefined) s.phone_number = phoneNumber; // null 허용
    if (address !== undefined) s.address = address;               // null 허용
    if (payoutBank !== undefined) s.payout_bank = payoutBank;     // null 허용
    if (payoutAccount !== undefined) s.payout_account = payoutAccount; // null 허용
    if (payoutHolder !== undefined) s.payout_holder = payoutHolder;    // null 허용
    if (commissionRate !== undefined) s.commission_rate = Number(commissionRate);

    s.updated_at = new Date();
    await s.save();

    return sendOk(res, {});
  } catch (err) {
    console.error("PUT /sellers/:sellerId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update seller");
  }
});

// ----------------------------
// DELETE /sellers/:sellerId (ADMIN) - soft delete
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
