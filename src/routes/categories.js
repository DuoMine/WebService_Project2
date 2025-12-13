// src/routes/categories.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Categories } = models;

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: 카테고리 등록 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: 소설
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *     responses:
 *       200:
 *         description: 카테고리 생성 성공
 *       400:
 *         description: validation failed
 *       409:
 *         description: category name already exists
 *       500:
 *         description: failed to create category
 */
// ----------------------------
// POST /categories (ADMIN)
// ----------------------------
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, parentId } = req.body ?? {};
  const errors = {};

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.name = "name is required";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
  }

  try {
    const exists = await Categories.findOne({ where: { name: name.trim() } });
    if (exists) {
      return sendError(res, 409, "DUPLICATE_RESOURCE", "category name already exists");
    }

    const now = new Date();
    const cat = await Categories.create({
      name: name.trim(),
      parent_id: parentId ?? null,
      created_at: now,
    });

    return sendOk(res, "카테고리가 생성되었습니다");
  } catch (err) {
    console.error("POST /categories error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create category");
  }
});

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: 카테고리 목록 조회
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
 *     responses:
 *       200:
 *         description: 조회 성공
 *       500:
 *         description: failed to get categories
 */
// ----------------------------
// GET /categories
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
      sort: "name,ASC",
    });
  } catch (err) {
    console.error("GET /categories error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get categories");
  }
});

/**
 * @openapi
 * /categories/{categoryId}:
 *   get:
 *     tags: [Categories]
 *     summary: 카테고리 상세 조회
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 조회 성공
 *       400:
 *         description: invalid categoryId
 *       404:
 *         description: category not found
 *       500:
 *         description: failed to get category
 */
// ----------------------------
// GET /categories/:categoryId
// ----------------------------
router.get("/:categoryId", async (req, res) => {
  const categoryId = parseInt(req.params.categoryId, 10);
  if (!categoryId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
  }

  try {
    const cat = await Categories.findOne({ where: { id: categoryId } });
    if (!cat) return sendError(res, 404, "NOT_FOUND", "category not found");

    return sendOk(res, {
      id: cat.id,
      name: cat.name,
      parentId: cat.parent_id,
      createdAt: cat.created_at,
    });
  } catch (err) {
    console.error("GET /categories/:categoryId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get category");
  }
});

/**
 * @openapi
 * /categories/{categoryId}:
 *   put:
 *     tags: [Categories]
 *     summary: 카테고리 수정 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: 수정 성공
 *       400:
 *         description: validation failed
 *       404:
 *         description: category not found
 *       500:
 *         description: failed to update category
 */
// ----------------------------
// PUT /categories/:categoryId (ADMIN)
// ----------------------------
router.put("/:categoryId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const categoryId = parseInt(req.params.categoryId, 10);
  if (!categoryId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
  }

  const { name, parentId } = req.body ?? {};
  const errors = {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    errors.name = "name must be non-empty string";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
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
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update category");
  }
});

/**
 * @openapi
 * /categories/{categoryId}:
 *   delete:
 *     tags: [Categories]
 *     summary: 카테고리 삭제 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       400:
 *         description: invalid categoryId
 *       404:
 *         description: category not found
 *       500:
 *         description: failed to delete category
 */
// ----------------------------
// DELETE /categories/:categoryId (ADMIN)
// ----------------------------
router.delete("/:categoryId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const categoryId = parseInt(req.params.categoryId, 10);
  if (!categoryId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid categoryId");
  }

  try {
    const cat = await Categories.findOne({ where: { id: categoryId } });
    if (!cat) return sendError(res, 404, "NOT_FOUND", "category not found");

    await cat.save(); // (현재 로직 기준)
    return sendOk(res, "카테고리가 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /categories/:categoryId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete category");
  }
});

export default router;
