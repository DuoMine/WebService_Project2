// src/routes/authors.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const { Authors } = models;

// ----------------------------
// helpers
// ----------------------------

const AUTHOR_SORT_MAP = {
  id: "id",
  createdAt: "created_at",
  penName: "pen_name",
  birthYear: "birth_year",
};

function parseId(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @openapi
 * tags:
 *   - name: Authors
 *     description: 작가 API
 */

/**
 * @openapi
 * /authors:
 *   post:
 *     tags: [Authors]
 *     summary: 작가 등록 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [penName]
 *             properties:
 *               penName:
 *                 type: string
 *                 example: 김작가
 *               birthYear:
 *                 type: integer
 *                 nullable: true
 *                 example: 1998
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: 장편소설 위주로 집필
 *     responses:
 *       200:
 *         description: 등록 성공
 *       400:
 *         description: VALIDATION_FAILED
 *       401:
 *         description: UNAUTHORIZED
 *       403:
 *         description: FORBIDDEN
 *       500:
 *         description: failed to create author
 */
// ----------------------------
// POST /authors (ADMIN) - 작가 생성
// body: { penName, birthYear?, description? }
// ----------------------------
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { penName, birthYear, description } = req.body ?? {};
  const errors = {};

  if (!penName || typeof penName !== "string" || !penName.trim()) {
    errors.penName = "penName is required";
  } else if (penName.trim().length > 100) {
    errors.penName = "penName must be <= 100 chars";
  }

  if (birthYear !== undefined && birthYear !== null) {
    const by = parseInt(birthYear, 10);
    if (!Number.isFinite(by)) errors.birthYear = "birthYear must be a number";
    else if (by < 0 || by > 2100) errors.birthYear = "birthYear out of range";
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== "string") errors.description = "description must be string";
    else if (description.length > 2000) errors.description = "description must be <= 2000 chars";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
  }

  try {
    const now = new Date();
    const author = await Authors.create({
      pen_name: penName.trim(),
      birth_year: birthYear === undefined || birthYear === null ? null : parseInt(birthYear, 10),
      description: description === undefined ? null : (description?.trim() || null),
      created_at: now,
    });

    return sendOk(res, "작가가 등록되었습니다.", { authorId: author.id });
  } catch (err) {
    console.error("POST /authors error:", err);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create author");
  }
});

/**
 * @openapi
 * /authors:
 *   get:
 *     tags: [Authors]
 *     summary: 작가 목록 조회 (공개)
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
 *         description: pen_name / description LIKE 검색
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: "id|createdAt|penName|birthYear + ,ASC|DESC (예: createdAt,DESC)"
 *         example: createdAt,DESC
 *     responses:
 *       200:
 *         description: 조회 성공
 *       500:
 *         description: failed to get authors
 */
// ----------------------------
// GET /authors - 목록 + 검색 (공개)
// query: page, size, q, sort
// ----------------------------
router.get("/", async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);
  const q = (req.query.q || "").toString().trim();

  const where = {};
  if (q) {
    where[Op.or] = [
      { pen_name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
    ];
  }

  const { order, sort } = parseSort(req.query.sort, AUTHOR_SORT_MAP, "createdAt,DESC");

  try {
    const { rows, count } = await Authors.findAndCountAll({
      where,
      limit: size,
      offset,
      order,
    });

    const content = rows.map((a) => ({
      id: a.id,
      penName: a.pen_name,
      birthYear: a.birth_year,
      description: a.description,
      createdAt: a.created_at,
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
    console.error("GET /authors error:", err);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get authors");
  }
});

/**
 * @openapi
 * /authors/{authorId}:
 *   get:
 *     tags: [Authors]
 *     summary: 작가 상세 조회 (공개)
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 조회 성공
 *       400:
 *         description: invalid authorId
 *       404:
 *         description: author not found
 *       500:
 *         description: failed to get author
 */
// ----------------------------
// GET /authors/:authorId - 상세 (공개)
// ----------------------------
router.get("/:authorId", async (req, res) => {
  const authorId = parseId(req.params.authorId);
  if (!authorId) return sendError(res, 400, "BAD_REQUEST", "invalid authorId");

  try {
    const author = await Authors.findOne({ where: { id: authorId } });
    if (!author) return sendError(res, 404, "NOT_FOUND", "author not found");

    return sendOk(res, {
      id: author.id,
      penName: author.pen_name,
      birthYear: author.birth_year,
      description: author.description,
      createdAt: author.created_at,
    });
  } catch (err) {
    console.error("GET /authors/:authorId error:", err);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get author");
  }
});

/**
 * @openapi
 * /authors/{authorId}:
 *   put:
 *     tags: [Authors]
 *     summary: 작가 수정 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               penName:
 *                 type: string
 *                 example: 김작가(개정)
 *               birthYear:
 *                 type: integer
 *                 nullable: true
 *                 example: 2001
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: 소개 수정
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
 *         description: author not found
 *       500:
 *         description: failed to update author
 */
// ----------------------------
// PUT /authors/:authorId (ADMIN) - 수정
// body: { penName?, birthYear?, description? }
// ----------------------------
router.put("/:authorId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const authorId = parseId(req.params.authorId);
  if (!authorId) return sendError(res, 400, "BAD_REQUEST", "invalid authorId");

  const { penName, birthYear, description } = req.body ?? {};
  const errors = {};

  if (penName !== undefined) {
    if (typeof penName !== "string" || !penName.trim()) errors.penName = "penName must be non-empty string";
    else if (penName.trim().length > 100) errors.penName = "penName must be <= 100 chars";
  }

  if (birthYear !== undefined) {
    if (birthYear === null || birthYear === "") {
      // null로 지우는 건 허용
    } else {
      const by = parseInt(birthYear, 10);
      if (!Number.isFinite(by)) errors.birthYear = "birthYear must be a number";
      else if (by < 0 || by > 2100) errors.birthYear = "birthYear out of range";
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== "string") errors.description = "description must be string";
    else if (description.length > 2000) errors.description = "description must be <= 2000 chars";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
  }

  try {
    const author = await Authors.findOne({ where: { id: authorId } });
    if (!author) return sendError(res, 404, "NOT_FOUND", "author not found");

    if (penName !== undefined) author.pen_name = penName.trim();
    if (birthYear !== undefined) {
      author.birth_year = birthYear === null || birthYear === "" ? null : parseInt(birthYear, 10);
    }
    if (description !== undefined) author.description = description?.trim() || null;

    await author.save();
    return sendOk(res, "작가 정보가 수정되었습니다.");
  } catch (err) {
    console.error("PUT /authors/:authorId error:", err);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update author");
  }
});

/**
 * @openapi
 * /authors/{authorId}:
 *   delete:
 *     tags: [Authors]
 *     summary: 작가 삭제 (ADMIN, hard delete)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       400:
 *         description: invalid authorId
 *       401:
 *         description: UNAUTHORIZED
 *       403:
 *         description: FORBIDDEN
 *       404:
 *         description: author not found
 *       500:
 *         description: failed to delete author
 */
// ----------------------------
// DELETE /authors/:authorId (ADMIN) - 삭제 (hard delete)
// ----------------------------
router.delete("/:authorId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const authorId = parseId(req.params.authorId);
  if (!authorId) return sendError(res, 400, "BAD_REQUEST", "invalid authorId");

  try {
    const author = await Authors.findOne({ where: { id: authorId } });
    if (!author) return sendError(res, 404, "NOT_FOUND", "author not found");

    await author.destroy(); // ✅ deleted_at 컬럼 없으니 hard delete
    return sendOk(res, "작가가 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /authors/:authorId error:", err);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete author");
  }
});

export default router;
