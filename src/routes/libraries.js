// src/routes/libraries.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

const { Libraries, Books } = models;

// 공통 성공 응답 헬퍼

const LIBRARY_SORT_FIELDS = {
  id: "id",
  created_at: "created_at",
  updated_at: "updated_at",

  // 조인된 Books로 정렬하고 싶으면 별칭을 명확히 썊
  book_title: [{ model: Books, as: "book" }, "title"],
};

// ---------------------------------------------------------------------
// 5.1 라이브러리에 도서 추가 (POST /libraries)
// body: { bookId }
// ---------------------------------------------------------------------
router.post("", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const bookId = Number(req.body?.bookId);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "bookId must be positive integer");
  }

  try {
    // 책 존재 + soft delete 체크
    const book = await Books.findOne({
      where: { id: bookId, deleted_at: { [Op.is]: null } },
      attributes: ["id", "title"],
    });
    if (!book) return sendError(res, 404, "NOT_FOUND", "book not found");

    // carts랑 똑같이: 이미 있으면 재사용
    const existing = await Libraries.findOne({
      where: { user_id: userId, book_id: bookId },
      include: [{ model: Books, as: "book", attributes: ["id", "title"] }],
    });

    if (existing) {
      return sendOk(res, {
        itemId: existing.id,
        bookId: existing.book_id,
        bookTitle: existing.book?.title ?? null,
        addedAt: existing.created_at,
        duplicated: true,
      });
    }

    const now = new Date();
    const created = await Libraries.create({
      user_id: userId,
      book_id: bookId,
      created_at: now,
      updated_at: now,
    });

    return sendOk(
      res,
      {
        itemId: created.id,
        bookId: created.book_id,
        bookTitle: book.title,
        addedAt: created.created_at,
        duplicated: false,
      },
      201
    );
  } catch (err) {
    console.error("POST /libraries error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to add library item");
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

  const { order, sort } = parseSort(req.query.sort, LIBRARY_SORT_FIELDS, "created_at,DESC");
  try {
    const { rows, count } = await Libraries.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Books,
          as: "book",
          attributes: ["title"],
        },
      ],
      order,
      limit: size,
      offset,
    });

    const content = rows.map((row) => ({
      libraryId: row.id,
      bookId: row.book_id,
      bookTitle: row.book?.title ?? null,
      addedAt: row.created_at,
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
// 5.2-1 라이브러리 단건 조회 (GET /libraries/:libraryId)
// 응답 payload:
// {
//   libraryId,
//   bookId,
//   bookTitle,
//   addedAt
// }
// ---------------------------------------------------------------------
router.get("/:libraryId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const libraryId = Number(req.params.libraryId);

  if (!libraryId || !Number.isInteger(libraryId)) {
    return sendError(res, 400, "VALIDATION_FAILED", "libraryId must be integer");
  }

  try {
    const row = await Libraries.findOne({
      where: { id: libraryId, user_id: userId },
      include: [
        {
          model: Books,
          as: "book",
          attributes: ["id", "title"],
          where: { deleted_at: { [Op.is]: null } },
          required: false, // 책이 soft delete 됐어도 라이브러리 row는 보여줄지 여부
        },
      ],
    });

    if (!row) {
      return sendError(res, 404, "NOT_FOUND", "library item not found");
    }

    return sendOk(res, {
      libraryId: row.id,
      bookId: row.book_id,
      bookTitle: row.book?.title ?? null,
      addedAt: row.created_at,
    });
  } catch (err) {
    console.error("GET /libraries/:libraryId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get library item");
  }
});

// ----------------------------
// 라이브러리 도서 삭제(DELETE /libraries/:itemId)
// ----------------------------
router.delete("/:itemId", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const itemId = Number(req.params.itemId);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "itemId must be positive integer");
  }

  try {
    const deleted = await Libraries.destroy({
      where: { id: itemId, user_id: userId },
    });

    if (!deleted) return sendError(res, 404, "NOT_FOUND", "library item not found");

    return sendOk(res, "도서가 삭제되었습니다");
  } catch (err) {
    console.error("DELETE /libraries/:itemId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete library item");
  }
});
export default router;
