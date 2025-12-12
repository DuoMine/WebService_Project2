// src/routes/libraries.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();

const { Libraries, Books } = models;

// 공통 성공 응답 헬퍼
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

// ---------------------------------------------------------------------
// 5.1 라이브러리 추가 (POST /libraries)
// body: { bookId }
// ---------------------------------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { bookId } = req.body ?? {};

  const errors = {};
  const idNum = Number(bookId);
  if (!bookId || !Number.isInteger(idNum)) {
    errors.bookId = "bookId must be integer";
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
    // 책 존재 여부 확인
    const book = await Books.findOne({
      where: { id: idNum, deleted_at: { [Op.is]: null } },
    });
    if (!book) {
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    // 동일 책이 이미 라이브러리에 있는지 확인 (중복 방지)
    const existing = await Libraries.findOne({
      where: { user_id: userId, book_id: idNum },
    });

    if (!existing) {
      const now = new Date();
      await Libraries.create({
        user_id: userId,
        book_id: idNum,
        created_at: now,
        updated_at: now,
      });
    }

    return sendOk(res, "라이브러리에 추가되었습니다.");
  } catch (err) {
    console.error("POST /libraries error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to add to library"
    );
  }
});

// ---------------------------------------------------------------------
// 5.2 라이브러리 조회 (GET /libraries)
// 응답 payload:
// {
//   content: [
//     {
//       libraryId,
//       bookId,
//       bookTitle,
//       addedAt
//     }
//   ],
//   pagination: { currentPage, totalPages, totalElements, size }
// }
// ---------------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { page, size, offset } = parsePagination(req.query);

  try {
    const { rows, count } = await Libraries.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Books,
          attributes: ["title"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: size,
      offset,
    });

    const content = rows.map((row) => ({
      libraryId: row.id,
      bookId: row.book_id,
      bookTitle: row.Book?.title ?? null,
      addedAt: row.created_at,
    }));

    return sendOk(res, "라이브러리 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /libraries error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get library list"
    );
  }
});

// ---------------------------------------------------------------------
// 5.3 라이브러리 삭제 (DELETE /libraries/:libraryId)
// ---------------------------------------------------------------------
router.delete("/:libraryId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const libraryId = Number(req.params.libraryId);

  if (!libraryId || !Number.isInteger(libraryId)) {
    return sendError(
      res,
      400,
      "VALIDATION_FAILED",
      "libraryId must be integer"
    );
  }

  try {
    const deleted = await Libraries.destroy({
      where: { id: libraryId, user_id: userId },
    });

    if (!deleted) {
      return sendError(res, 404, "NOT_FOUND", "library item not found");
    }

    return sendOk(res, "라이브러리에서 삭제되었습니다.");
  } catch (err) {
    console.error("DELETE /libraries/:libraryId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to delete library item"
    );
  }
});

export default router;
