// src/routes/authors.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
const router = Router();
const { Authors } = models;

// ----------------------------
// helpers
// ----------------------------

function parsePagination(query) {
  const page = Math.max(0, parseInt(query.page ?? "1", 10)); // ✅ 0-based
  const size = Math.min(50, Math.max(1, parseInt(query.size ?? "20", 10)));
  const offset = (page-1) * size;
  return { page, size, offset };
}

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

  const { order, sort } = parseSort(
    req.query.sort,
    AUTHOR_SORT_MAP,
    "createdAt,DESC"
  );

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
      author.birth_year =
        birthYear === null || birthYear === "" ? null : parseInt(birthYear, 10);
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
