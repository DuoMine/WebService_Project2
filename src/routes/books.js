// src/routes/books.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parseSort } from "../utils/sort.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

const { Books, Authors, Categories, BookAuthors, BookCategories, Sellers } = models;

// GET /books 정렬 허용 필드 매핑
const BOOK_SORT_FIELDS = {
  id: "id",
  title: "title",
  price: "price",
  publication_date: "publication_date",
};

/**
 * @openapi
 * /books:
 *   post:
 *     tags: [Books]
 *     summary: 도서 등록 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, publisher, summary, isbn, price, publicationDate, sellerId, authorIds, categoryIds]
 *             properties:
 *               title: { type: string, example: "책 제목" }
 *               publisher: { type: string, example: "출판사" }
 *               summary: { type: string, example: "요약" }
 *               isbn: { type: string, example: "9781234567890" }
 *               price: { type: integer, example: 15000 }
 *               publicationDate: { type: string, format: date, example: "2024-01-01" }
 *               sellerId: { type: integer, example: 1 }
 *               authorIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 2]
 *               categoryIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [3, 4]
 *     responses:
 *       201:
 *         description: 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookId: { type: integer, example: 10 }
 *       400:
 *         description: validation failed
 *       409:
 *         description: duplicate resource (isbn)
 */
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const {
    title,
    publisher,
    summary,
    isbn,
    price,
    publicationDate,
    sellerId,
    authorIds,
    categoryIds,
  } = req.body ?? {};

  const errors = {};
  if (!title) errors.title = "title is required";
  if (!publisher) errors.publisher = "publisher is required";
  if (!summary) errors.summary = "summary is required";
  if (!isbn) errors.isbn = "isbn is required";
  if (price == null) errors.price = "price is required";
  if (!publicationDate) errors.publicationDate = "publicationDate is required";

  const sid = parseInt(sellerId, 10);
  if (!Number.isFinite(sid) || sid <= 0) errors.sellerId = "sellerId must be a positive integer";

  if (!Array.isArray(authorIds) || authorIds.length === 0) errors.authorIds = "authorIds must be non-empty array";
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) errors.categoryIds = "categoryIds must be non-empty array";

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  const t = await Books.sequelize.transaction();
  try {
    // seller 존재 검증
    const seller = await Sellers.findOne({
      where: { id: sid, deleted_at: null },
      transaction: t,
    });
    if (!seller) {
      if (!t.finished) await t.rollback();
      return sendError(res, 400, "VALIDATION_FAILED", "invalid sellerId", {
        sellerId: "seller not found",
      });
    }

    // ✅ (1) ISBN 유니크 사전검사 -> 409
    const existsIsbn = await Books.findOne({
      where: { isbn, deleted_at: null },
      attributes: ["id"],
      transaction: t,
    });
    if (existsIsbn) {
      if (!t.finished) await t.rollback();
      return sendError(res, 409, "DUPLICATE_RESOURCE", "isbn already exists", { isbn });
    }

    const book = await Books.create(
      {
        title,
        publisher,
        summary,
        isbn,
        price,
        seller_id: sid,
        publication_date: publicationDate,
      },
      { transaction: t }
    );

    await BookAuthors.bulkCreate(
      authorIds.map((aid) => ({ book_id: book.id, author_id: aid })),
      { transaction: t }
    );

    await BookCategories.bulkCreate(
      categoryIds.map((cid) => ({ book_id: book.id, category_id: cid })),
      { transaction: t }
    );

    await t.commit();
    return sendOk(res, { bookId: book.id }, 201);
  } catch (err) {
    if (!t.finished) await t.rollback();

    console.error("POST /books error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create book");
  }
});

/**
 * @openapi
 * /books:
 *   get:
 *     tags: [Books]
 *     summary: 도서 목록 조회
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         description: "허용: id,title,price,publication_date (예: price,DESC)"
 *         schema: { type: string, example: "id,ASC" }
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: sellerId
 *         schema: { type: integer }
 *       - in: query
 *         name: query
 *         description: "title/publisher LIKE 검색"
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       title: { type: string }
 *                       price: { type: integer }
 *                       seller:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: integer }
 *                           businessName: { type: string }
 *                           email: { type: string }
 *                       authors:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: integer }
 *                             penName: { type: string }
 *                 page: { type: integer }
 *                 size: { type: integer }
 *                 totalElements: { type: integer }
 *                 totalPages: { type: integer }
 *                 sort: { type: string }
 *       400:
 *         description: invalid query
 */
router.get("/", async (req, res) => {
  try {
    const { page, size, offset } = parsePagination(req.query);

    const { categoryId, query } = req.query;
    const sellerIdRaw = req.query.sellerId;

    const where = { deleted_at: null };

    if (sellerIdRaw !== undefined) {
      const sid = parseInt(sellerIdRaw, 10);
      if (!Number.isFinite(sid) || sid <= 0) {
        return sendError(res, 400, "VALIDATION_FAILED", "invalid query", {
          sellerId: "sellerId must be a positive integer",
        });
      }
      where.seller_id = sid;
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: q } },
        { publisher: { [Op.like]: q } },
      ];
    }

    const include = [
      {
        model: Sellers,
        as: "seller",
        attributes: ["id", "business_name", "email"],
      },
      {
        model: Authors,
        as: "authors",
        attributes: ["id", "pen_name"],
        through: { attributes: [] },
      },
      categoryId
        ? {
            model: Categories,
            as: "categories",
            attributes: ["id", "name"],
            through: { attributes: [] },
            where: { id: categoryId },
          }
        : {
            model: Categories,
            as: "categories",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
    ];

    const { order, sort } = parseSort(req.query.sort, BOOK_SORT_FIELDS, "id,ASC");

    const { rows, count } = await Books.findAndCountAll({
      where,
      include,
      offset,
      limit: size,
      distinct: true,
      order,
    });

    const content = rows.map((b) => ({
      id: b.id,
      title: b.title,
      price: b.price,
      seller: b.seller
        ? {
            id: b.seller.id,
            businessName: b.seller.business_name,
            email: b.seller.email,
          }
        : null,
      authors: (b.authors || []).map((a) => ({
        id: a.id,
        penName: a.pen_name,
      })),
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
    console.error("GET /books error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get books list");
  }
});

/**
 * @openapi
 * /books/{bookId}:
 *   get:
 *     tags: [Books]
 *     summary: 도서 상세 조회
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 성공
 *       400:
 *         description: invalid bookId
 *       404:
 *         description: book not found
 */
router.get("/:bookId", async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) return sendError(res, 400, "BAD_REQUEST", "invalid bookId");

    const book = await Books.findOne({
      where: { id: bookId, deleted_at: null },
      include: [
        {
          model: Sellers,
          as: "seller",
          attributes: ["id", "business_name", "email", "phone_number"],
        },
        {
          model: Authors,
          as: "authors",
          attributes: ["id", "pen_name"],
          through: { attributes: [] },
        },
        {
          model: Categories,
          as: "categories",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!book) return sendError(res, 404, "NOT_FOUND", "book not found");

    return sendOk(res, {
      id: book.id,
      title: book.title,
      publisher: book.publisher,
      summary: book.summary,
      isbn: book.isbn,
      price: book.price,
      publicationDate: book.publication_date,
      seller: book.seller
        ? {
            id: book.seller.id,
            businessName: book.seller.business_name,
            email: book.seller.email,
            phoneNumber: book.seller.phone_number,
          }
        : null,
      authors: (book.authors || []).map((a) => ({
        id: a.id,
        penName: a.pen_name,
      })),
      categories: (book.categories || []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    });
  } catch (err) {
    console.error("GET /books/:bookId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get book");
  }
});

/**
 * @openapi
 * /books/{bookId}:
 *   put:
 *     tags: [Books]
 *     summary: 도서 수정 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price: { type: integer, example: 12000 }
 *               summary: { type: string, example: "요약 수정" }
 *               sellerId: { type: integer, example: 2 }
 *     responses:
 *       200:
 *         description: 성공
 *       400:
 *         description: validation failed
 *       404:
 *         description: book not found
 */
router.put("/:bookId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) return sendError(res, 400, "BAD_REQUEST", "invalid bookId");

    const book = await Books.findOne({ where: { id: bookId, deleted_at: null } });
    if (!book) return sendError(res, 404, "NOT_FOUND", "book not found");

    const { price, summary, sellerId } = req.body ?? {};
    const errors = {};

    if (price !== undefined && price !== null) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) errors.price = "price must be a non-negative number";
    }
    if (summary !== undefined && summary !== null) {
      if (typeof summary !== "string") errors.summary = "summary must be a string";
    }

    let sid;
    if (sellerId !== undefined) {
      sid = parseInt(sellerId, 10);
      if (!Number.isFinite(sid) || sid <= 0) errors.sellerId = "sellerId must be a positive integer";
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
    }

    if (sellerId !== undefined) {
      const seller = await Sellers.findOne({ where: { id: sid, deleted_at: null } });
      if (!seller) {
        return sendError(res, 400, "VALIDATION_FAILED", "invalid sellerId", {
          sellerId: "seller not found",
        });
      }
      book.seller_id = sid;
    }

    if (price !== undefined && price !== null) book.price = Number(price);
    if (summary !== undefined && summary !== null) book.summary = summary;

    await book.save();
    return sendOk(res, "도서 정보가 수정되었습니다");
  } catch (err) {
    console.error("PUT /books/:bookId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update book");
  }
});

/**
 * @openapi
 * /books/{bookId}/categories:
 *   put:
 *     tags: [Books]
 *     summary: 도서 카테고리 교체 (ADMIN)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryIds]
 *             properties:
 *               categoryIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: 성공
 *       400:
 *         description: validation failed
 *       404:
 *         description: book not found
 */
router.put("/:bookId/categories", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);
  if (!bookId) return sendError(res, 400, "BAD_REQUEST", "invalid bookId");

  const { categoryIds } = req.body ?? {};
  const errors = {};

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    errors.categoryIds = "categoryIds must be non-empty array";
  }

  const ids = Array.isArray(categoryIds)
    ? categoryIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  if (Array.isArray(categoryIds) && ids.length !== categoryIds.length) {
    errors.categoryIds = "categoryIds must be an array of positive integers";
  }

  if (Object.keys(errors).length > 0) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid body", errors);
  }

  const t = await Books.sequelize.transaction();
  try {
    const book = await Books.findOne({
      where: { id: bookId, deleted_at: null },
      transaction: t,
    });
    if (!book) {
      await t.rollback();
      return sendError(res, 404, "NOT_FOUND", "book not found");
    }

    const found = await Categories.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ["id"],
      transaction: t,
    });

    if (found.length !== ids.length) {
      await t.rollback();
      return sendError(res, 400, "VALIDATION_FAILED", "invalid categoryIds", {
        categoryIds: "some categories not found",
      });
    }

    await BookCategories.destroy({ where: { book_id: bookId }, transaction: t });
    await BookCategories.bulkCreate(
      ids.map((cid) => ({ book_id: bookId, category_id: cid })),
      { transaction: t }
    );

    await t.commit();
    return sendOk(res, "도서 카테고리가 수정되었습니다");
  } catch (err) {
    console.error("PUT /books/:bookId/categories error:", err);
    await t.rollback();
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update book categories");
  }
});

/**
 * @openapi
 * /books/{bookId}:
 *   delete:
 *     tags: [Books]
 *     summary: 도서 삭제 (ADMIN, Soft Delete)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 성공
 *       400:
 *         description: invalid bookId
 *       404:
 *         description: book not found
 */
router.delete("/:bookId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) return sendError(res, 400, "BAD_REQUEST", "invalid bookId");

    const book = await Books.findOne({ where: { id: bookId, deleted_at: null } });
    if (!book) return sendError(res, 404, "NOT_FOUND", "book not found");

    book.deleted_at = new Date();
    await book.save();

    return sendOk(res, "도서가 삭제되었습니다");
  } catch (err) {
    console.error("DELETE /books/:bookId error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete book");
  }
});

export default router;
