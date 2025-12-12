// src/routes/adminUsers.js
import { Router } from "express";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

const router = Router();
const { Users } = models;

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
  const size = Math.min(100, Math.max(1, parseInt(query.size ?? "20", 10)));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

/**
 * GET /admin/users
 * query: page, size, q, status
 * - q: email or name LIKE 검색
 * - status: ACTIVE / INACTIVE / SUSPENDED 등
 */
router.get(
  "/admin/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const { page, size, offset } = parsePagination(req.query);
    const q = (req.query.q || "").toString().trim();
    const status = (req.query.status || "").toString().trim();

    const where = {
      deleted_at: { [Op.is]: null },
    };

    if (q) {
      where[Op.or] = [
        { email: { [Op.like]: `%${q}%` } },
        { name: { [Op.like]: `%${q}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    try {
      const { rows, count } = await Users.findAndCountAll({
        where,
        offset,
        limit: size,
        order: [["created_at", "DESC"]],
      });

      const content = rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        birthYear: u.birth_year,
        gender: u.gender,
        regionCode: u.region_code,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
      }));

      return sendOk(res, "사용자 목록 조회 성공", {
        content,
        pagination: buildPagination(page, size, count),
      });
    } catch (err) {
      console.error("GET /admin/users error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to get user list"
      );
    }
  }
);

/**
 * GET /admin/users/:userId
 * - 특정 유저 상세
 */
router.get(
  "/admin/users/:userId",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid userId");
    }

    try {
      const user = await Users.findOne({
        where: { id: userId, deleted_at: { [Op.is]: null } },
      });

      if (!user) {
        return sendError(res, 404, "NOT_FOUND", "user not found");
      }

      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        birthYear: user.birth_year,
        gender: user.gender,
        regionCode: user.region_code,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

      return sendOk(res, "사용자 상세 조회 성공", payload);
    } catch (err) {
      console.error("GET /admin/users/:userId error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to get user detail"
      );
    }
  }
);

/**
 * PUT /admin/users/:userId/status
 * body: { status }
 * - status: ACTIVE / INACTIVE / SUSPENDED 등
 */
router.put(
  "/admin/users/:userId/status",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return sendError(res, 400, "BAD_REQUEST", "invalid userId");
    }

    const { status } = req.body ?? {};
    const allowedStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"];

    if (!status || !allowedStatus.includes(status)) {
      return sendError(
        res,
        400,
        "VALIDATION_FAILED",
        `status must be one of: ${allowedStatus.join(", ")}`
      );
    }

    try {
      const user = await Users.findOne({
        where: { id: userId, deleted_at: { [Op.is]: null } },
      });

      if (!user) {
        return sendError(res, 404, "NOT_FOUND", "user not found");
      }

      user.status = status;
      user.updated_at = new Date();
      await user.save();

      return sendOk(res, "사용자 상태가 변경되었습니다.", {
        userId: user.id,
        status: user.status,
      });
    } catch (err) {
      console.error("PUT /admin/users/:userId/status error:", err);
      return sendError(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "failed to update user status"
      );
    }
  }
);

export default router;
