// src/routes/categories.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();
const { Categories } = models;

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
// POST /categories  (ADMIN) - 카테고리 등록
// body: { name, description? }
// ----------------------------
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, description } = req.body ?? {};
  const errors = {};

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.name = "name is required";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "invalid request body",
      errors
    );
  }

  try {
    const exists = await Categories.findOne({
      where: { name: name.trim(), deleted_at: { [Op.is]: null } },
    });

    if (exists) {
      return sendError(
        res,
        409,
        "DUPLICATE_RESOURCE",
        "category name already exists"
      );
    }

    const now = new Date();
    const cat = await Categories.create({
      name: name.trim(),
      description: description?.trim() || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return sendOk(res, "카테고리가 등록되었습니다.", {
      categoryId: cat.id,
    });
  } catch (err) {
    console.error("POST /categories error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create category"
    );
  }
});

// ----------------------------
// GET /categories  - 카테고리 목록
// query: page, size, q
// ----------------------------
router.get("/", async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);
  const q = (req.query.q || "").toString().trim();

  const where = {
    deleted_at: { [Op.is]: null },
  };

  if (q) {
    where.name = { [Op.like]: `%${q}%` };
  }

  try {
    const { rows, count } = await Categories.findAndCountAll({
      where,
      limit: size,
      offset,
      order: [["name", "ASC"]],
    });

    const content = rows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    }));

    return sendOk(res, "카테고리 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /categories error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get categories"
    );
  }
});

// ----------------------------
// GET /categories/:categoryId - 카테고리 상세
// ----------------------------
router.get("/:categoryId", async (req, res) => {
  const categoryId = parseInt(req.params.categoryId, 10);
  if (!categoryId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
  }

  try {
    const cat = await Categories.findOne({
      where: { id: categoryId, deleted_at: { [Op.is]: null } },
    });

    if (!cat) {
      return sendError(res, 404, "NOT_FOUND", "category not found");
    }

    return sendOk(res, "카테고리 상세 조회 성공", {
      id: cat.id,
      name: cat.name,
      description: cat.description,
    });
  } catch (err) {
    console.error("GET /categories/:categoryId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get category"
    );
  }
});

// ----------------------------
// PUT /categories/:categoryId  (ADMIN) - 카테고리 수정
// body: { name?, description? }
// ----------------------------
router.put(
  "/:categoryId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (!categoryId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
    }

    const { name, description } = req.body ?? {};
    const errors = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        errors.name = "name must be non-empty string";
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendError(
        res,
        400,
        "VALIDATION_FAILED",
        "invalid request body",
        errors
      );
    }

    try {
      const cat = await Categories.findOne({
        where: { id: categoryId, deleted_at: { [Op.is]: null } },
      });

      if (!cat) {
        return sendError(res, 404, "NOT_FOUND", "category not found");
      }

      if (name !== undefined) cat.name = name.trim();
      if (description !== undefined)
        cat.description = description?.trim() || null;
      cat.updated_at = new Date();

      await cat.save();

      return sendOk(res, "카테고리 정보가 수정되었습니다.");
    } catch (err) {
      console.error("PUT /categories/:categoryId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to update category"
      );
    }
  }
);

// ----------------------------
// DELETE /categories/:categoryId  (ADMIN) - soft delete
// ----------------------------
router.delete(
  "/:categoryId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (!categoryId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
    }

    try {
      const cat = await Categories.findOne({
        where: { id: categoryId, deleted_at: { [Op.is]: null } },
      });

      if (!cat) {
        return sendError(res, 404, "NOT_FOUND", "category not found");
      }

      cat.deleted_at = new Date();
      await cat.save();

      return sendOk(res, "카테고리가 삭제되었습니다.");
    } catch (err) {
      console.error("DELETE /categories/:categoryId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to delete category"
      );
    }
  }
);

export default router;
