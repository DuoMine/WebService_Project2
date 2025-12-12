// src/routes/authors.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();
const { Authors } = models;

// 공통 헬퍼
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
// POST /authors  (ADMIN) - 작가 등록
// body: { penName, realName?, bio? }
// ----------------------------
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { penName, realName, bio } = req.body ?? {};
  const errors = {};

  if (!penName || typeof penName !== "string" || !penName.trim()) {
    errors.penName = "penName is required";
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
    const now = new Date();
    const author = await Authors.create({
      pen_name: penName.trim(),
      real_name: realName?.trim() || null,
      bio: bio?.trim() || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    return sendOk(res, "작가가 등록되었습니다.", {
      authorId: author.id,
    });
  } catch (err) {
    console.error("POST /authors error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create author"
    );
  }
});

// ----------------------------
// GET /authors  - 작가 목록 + 검색
// query: page, size, q(검색어)
// ----------------------------
router.get("/", async (req, res) => {
  const { page, size, offset } = parsePagination(req.query);
  const q = (req.query.q || "").toString().trim();

  const where = {
    deleted_at: { [Op.is]: null },
  };

  if (q) {
    where[Op.or] = [
      { pen_name: { [Op.like]: `%${q}%` } },
      { real_name: { [Op.like]: `%${q}%` } },
    ];
  }

  try {
    const { rows, count } = await Authors.findAndCountAll({
      where,
      limit: size,
      offset,
      order: [["pen_name", "ASC"]],
    });

    const content = rows.map((a) => ({
      id: a.id,
      penName: a.pen_name,
      realName: a.real_name,
    }));

    return sendOk(res, "작가 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /authors error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get authors"
    );
  }
});

// ----------------------------
// GET /authors/:authorId  - 작가 상세
// ----------------------------
router.get("/:authorId", async (req, res) => {
  const authorId = parseInt(req.params.authorId, 10);
  if (!authorId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid authorId");
  }

  try {
    const author = await Authors.findOne({
      where: { id: authorId, deleted_at: { [Op.is]: null } },
    });

    if (!author) {
      return sendError(res, 404, "NOT_FOUND", "author not found");
    }

    return sendOk(res, "작가 상세 조회 성공", {
      id: author.id,
      penName: author.pen_name,
      realName: author.real_name,
      bio: author.bio,
    });
  } catch (err) {
    console.error("GET /authors/:authorId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get author"
    );
  }
});

// ----------------------------
// PUT /authors/:authorId  (ADMIN) - 작가 수정
// body: { penName?, realName?, bio? }
// ----------------------------
router.put("/:authorId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const authorId = parseInt(req.params.authorId, 10);
  if (!authorId) {
    return sendError(res, 400, "BAD_REQUEST", "invalid authorId");
  }

  const { penName, realName, bio } = req.body ?? {};
  const errors = {};

  if (penName !== undefined) {
    if (typeof penName !== "string" || !penName.trim()) {
      errors.penName = "penName must be non-empty string";
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
    const author = await Authors.findOne({
      where: { id: authorId, deleted_at: { [Op.is]: null } },
    });

    if (!author) {
      return sendError(res, 404, "NOT_FOUND", "author not found");
    }

    if (penName !== undefined) author.pen_name = penName.trim();
    if (realName !== undefined) author.real_name = realName?.trim() || null;
    if (bio !== undefined) author.bio = bio?.trim() || null;
    author.updated_at = new Date();

    await author.save();

    return sendOk(res, "작가 정보가 수정되었습니다.");
  } catch (err) {
    console.error("PUT /authors/:authorId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to update author"
    );
  }
});

// ----------------------------
// DELETE /authors/:authorId  (ADMIN) - soft delete
// ----------------------------
router.delete(
  "/:authorId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const authorId = parseInt(req.params.authorId, 10);
    if (!authorId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid authorId");
    }

    try {
      const author = await Authors.findOne({
        where: { id: authorId, deleted_at: { [Op.is]: null } },
      });

      if (!author) {
        return sendError(res, 404, "NOT_FOUND", "author not found");
      }

      author.deleted_at = new Date();
      await author.save();

      return sendOk(res, "작가가 삭제되었습니다.");
    } catch (err) {
      console.error("DELETE /authors/:authorId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to delete author"
      );
    }
  }
);

export default router;
