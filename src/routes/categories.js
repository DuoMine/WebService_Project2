// src/routes/categories.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";

const router = Router();
const { Categories } = models;

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
  const { name, parentId } = req.body ?? {};
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
      where: { name: name.trim() },
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
      name: name,
      parent_id:  parentId ?? null,
      created_at: now,
    });

    return sendOk(res, { categoryId: cat.id });
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
// query: page, size, q, sort
// ----------------------------
router.get("/", async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);
  const q = (req.query.q || "").toString().trim();

  const where = {};
  if (q) where.name = { [Op.like]: `%${q}%` };

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
      parentId: c.parent_id,
      createdAt: c.created_at,
    }));

    return sendOk(res, {
      content,
      page,
      size,
      totalElements: count,
      totalPages: Math.ceil(count / size),
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
    const cat = await Categories.findOne({ where: { id: categoryId } });

    if (!cat) {
      return sendError(res, 404, "NOT_FOUND", "category not found");
    }

    return sendOk(res, {
      id: cat.id,
      name: cat.name,
      parentId: cat.parent_id,
      createdAt: cat.created_at,
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
router.put( "/:categoryId", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (!categoryId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
    }

    const { name, parentId } = req.body ?? {};
    const errors = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        errors.name = "name must be non-empty string";
      }
    }

    let parent_id;
    if (parentId !== undefined) {
      if (parentId === null || parentId === "") parent_id = null;
      else {
        const n = parseInt(parentId, 10);
        if (!Number.isFinite(n) || n <= 0) errors.parentId = "parentId must be a positive integer";
        else parent_id = n;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendError( res, 400, "VALIDATION_FAILED", "invalid request body", errors );
    }

    try {
      const cat = await Categories.findOne({ where: { id: categoryId } });
      if (!cat) return sendError(res, 404, "NOT_FOUND", "category not found");

      if (name !== undefined) cat.name = name.trim();
      if (parentId !== undefined) cat.parent_id = parentId ?? null;

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
router.delete( "/:categoryId", requireAuth, requireRole("ADMIN"), async (req, res) => {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (!categoryId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
    }

    try {
      const cat = await Categories.findOne({ where: { id: categoryId }, });

      if (!cat) {
        return sendError(res, 404, "NOT_FOUND", "category not found");
      }

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
