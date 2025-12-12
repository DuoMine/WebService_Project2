// src/routes/books.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();

const {
  Books,
  Authors,
  Categories,
  BookAuthors,
  BookCategories,
} = models;

// ✅ 성공 응답 공통 포맷 (isSuccess, message, payload)
function sendOk(res, message, payload = undefined) {
  return res.json({
    isSuccess: true,
    message,
    ...(payload !== undefined ? { payload } : {}),
  });
}

// 간단한 페이지네이션 헬퍼
function buildPagination(page, size, total) {
  return {
    currentPage: page,
    totalPages: Math.ceil(total / size),
    totalElements: total,
    size,
  };
}

// ---------------------------------------------------------------------
// 2.1 도서 등록 (POST /books)  - ADMIN 권한
// ---------------------------------------------------------------------
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const {
    title,
    publisher,
    summary,
    isbn,
    price,
    publicationDate,
    authorIds,
    categoryIds,
  } = req.body;

  // 최소 검증 (명세 기준 필수값) :contentReference[oaicite:1]{index=1}
  const errors = {};
  if (!title) errors.title = "title is required";
  if (!publisher) errors.publisher = "publisher is required";
  if (!summary) errors.summary = "summary is required";
  if (!isbn) errors.isbn = "isbn is required";
  if (price == null) errors.price = "price is required";
  if (!publicationDate) errors.publicationDate = "publicationDate is required";
  if (!Array.isArray(authorIds) || authorIds.length === 0) {
    errors.authorIds = "authorIds must be non-empty array";
  }
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    errors.categoryIds = "categoryIds must be non-empty array";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  const t = await Books.sequelize.transaction();

  try {
    const book = await Books.create(
      {
        title,
        publisher,
        summary,
        isbn,
        price,
        publication_date: publicationDate,
      },
      { transaction: t }
    );

    // 작가 연결
    const baRows = authorIds.map((aid) => ({
      book_id: book.id,
      author_id: aid,
    }));
    await BookAuthors.bulkCreate(baRows, { transaction: t });

    // 카테고리 연결
    const bcRows = categoryIds.map((cid) => ({
      book_id: book.id,
      category_id: cid,
    }));
    await BookCategories.bulkCreate(bcRows, { transaction: t });

    await t.commit();

    return sendOk(res, "도서가 등록되었습니다.", {
      bookId: book.id,
    });
  } catch (err) {
    console.error("POST /books error:", err);
    await t.rollback();
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create book"
    );
  }
});

// ---------------------------------------------------------------------
// 2.2 도서 목록 조회 (GET /books)
// ---------------------------------------------------------------------
router.get("/", async (req, res) => {
  try{
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(50, Math.max(1, parseInt(req.query.size ?? "10", 10)));
    const offset = (page - 1) * size;

    const { sortBy, categoryId, query } = req.query;

    const where = {
      // soft delete 가정
      deleted_at: null,
    };

    // 카테고리 필터링은 조인으로 처리
    const include = [
      {
        model: Authors,
        attributes: ["id", "pen_name"],
        through: { attributes: [] },
      },
    ];

    if (categoryId) {
      include.push({
        model: Categories,
        attributes: ["id", "name"],
        through: { attributes: [] },
        where: { id: categoryId },
      });
    } else {
      include.push({
        model: Categories,
        attributes: ["id", "name"],
        through: { attributes: [] },
      });
    }

    // 검색어 (제목 / 출판사 / 작가명) :contentReference[oaicite:2]{index=2}
    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: q } },
        { publisher: { [Op.like]: q } },
      ];
      // 작가 이름 검색은 include 쪽 where로 넣으려면 조금 더 복잡해지니까
      // 필요하면 나중에 Authors include에 separate where 추가
    }

    // 정렬
    let order = [["id", "ASC"]];
    if (sortBy === "publicationDate") {
      order = [["publication_date", "DESC"]];
    } else if (sortBy === "price") {
      order = [["price", "ASC"]];
    } else if (sortBy === "title") {
      order = [["title", "ASC"]];
    }

    const { rows, count } = await Books.findAndCountAll({
      where,
      include,
      offset,
      limit: size,
      distinct: true, // join 때문에 count 중복 방지
      order,
    });

    const content = rows.map((b) => ({
      id: b.id,
      title: b.title,
      price: b.price,
      authors: (b.Authors || []).map((a) => ({
        id: a.id,
        penName: a.pen_name,
      })),
    }));

    return sendOk(res, "도서 목록 조회 성공", {
      content,
      pagination: buildPagination(page, size, count),
    });
  } catch (err) {
    console.error("GET /books error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get books list"
    );
  }
});

// ---------------------------------------------------------------------
// 2.3 도서 상세 조회 (GET /books/:bookId)
// ---------------------------------------------------------------------
router.get("/:bookId", async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid bookId");
    }

    const book = await Books.findOne({
      where: { id: bookId, deleted_at: null },
      include: [
        {
          model: Authors,
          attributes: ["id", "pen_name"],
          through: { attributes: [] },
        },
        {
          model: Categories,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!book) {
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    const payload = {
      id: book.id,
      title: book.title,
      publisher: book.publisher,
      summary: book.summary,
      isbn: book.isbn,
      price: book.price,
      publicationDate: book.publication_date,
      authors: (book.Authors || []).map((a) => ({
        id: a.id,
        penName: a.pen_name,
      })),
      categories: (book.Categories || []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    };

    return sendOk(res, "도서 상세 조회 성공", payload);
  } catch (err) {
    console.error("GET /books/:bookId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to get book"
    );
  }
});

// ---------------------------------------------------------------------
// 2.4 도서 수정 (PUT /books/:bookId) - ADMIN
// ---------------------------------------------------------------------
router.put("/:bookId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid bookId");
    }

    const book = await Books.findOne({
      where: { id: bookId, deleted_at: null },
    });
    if (!book) {
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    const { price, summary } = req.body;

    if (price != null) book.price = price;
    if (summary != null) book.summary = summary;

    await book.save();

    return sendOk(res, "도서 정보가 수정되었습니다.");
  } catch (err) {
    console.error("PUT /books/:bookId error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to update book"
    );
  }
});

// ---------------------------------------------------------------------
// 2.5 도서 삭제 (DELETE /books/:bookId) - ADMIN / Soft Delete
// ---------------------------------------------------------------------
router.delete(
  "/:bookId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId, 10);
      if (!bookId) {
        return sendError(res, 400, "BAD_REQUEST", "invalid bookId");
      }

      const book = await Books.findOne({
        where: { id: bookId, deleted_at: null },
      });
      if (!book) {
        return sendError(res, 404, "NOT_FOUND", "book not found");
      }

      // Soft Delete 명세라서 deleted_at 세팅으로 처리 :contentReference[oaicite:3]{index=3}
      book.deleted_at = new Date();
      await book.save();

      return sendOk(res, "도서가 삭제되었습니다.");
    } catch (err) {
      console.error("DELETE /books/:bookId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to delete book"
      );
    }
  }
);

export default router;
