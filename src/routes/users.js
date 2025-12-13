// src/routes/users.js
import { Router } from "express";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError, sendOk } from "../utils/http.js";
import { parsePagination } from "../utils/pagination.js";
import { parseSort } from "../utils/sort.js";

const { Users } = models;
const router = Router();

/**
 * 공통: user json 응답에서 민감정보 제거
 */
function toUserSafe(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone_number: u.phone_number,
    birth_year: u.birth_year,
    gender: u.gender,
    region_code: u.region_code,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
    deleted_at: u.deleted_at,
  };
}

function parseId(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------
// validation
// ------------------------------
function validateAdminCreateBody(body) {
  const errors = {};

  if (!body.email || typeof body.email !== "string") errors.email = "email is required";
  else if (body.email.length > 100) errors.email = "email must be <= 100 chars";

  if (!body.password || typeof body.password !== "string") errors.password = "password is required";
  else if (body.password.length < 8 || body.password.length > 64) errors.password = "password length must be 8~64";

  if (!body.name || typeof body.name !== "string") errors.name = "name is required";
  else if (body.name.length > 50) errors.name = "name must be <= 50 chars";

  const birth = Number(body.birth_year);
  if (!Number.isInteger(birth)) errors.birth_year = "birth_year must be integer";
  else if (birth < 1900 || birth > new Date().getFullYear()) {
    errors.birth_year = "birth_year must be between 1900 and current year";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender && !allowedGender.includes(body.gender)) {
    errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (!body.region_code || typeof body.region_code !== "string") errors.region_code = "region_code is required";
  else if (body.region_code.length > 10) errors.region_code = "region_code must be <= 10 chars";

  const allowedRole = ["USER", "ADMIN"];
  if (body.role && !allowedRole.includes(body.role)) {
    errors.role = `role must be one of ${allowedRole.join(", ")}`;
  }

  // 너 프로젝트 전체에서 status를 ACTIVE/DELETED로 쓰는 편이 안전
  const allowedStatus = ["ACTIVE", "DELETED", "SUSPENDED"];
  if (body.status && !allowedStatus.includes(body.status)) {
    errors.status = `status must be one of ${allowedStatus.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      email: body.email.trim(),
      password: body.password,
      name: body.name.trim(),
      birth_year: birth,
      gender: body.gender || "UNKNOWN",
      region_code: body.region_code.trim(),
      phone_number: body.phone_number?.trim() || null,
      role: body.role || "USER",
      status: body.status || "ACTIVE",
    },
  };
}

function validateMePatchBody(body) {
  const errors = {};

  // me에서는 email/role/status/password 변경 금지
  if (body.email !== undefined) errors.email = "email cannot be changed here";
  if (body.role !== undefined) errors.role = "role cannot be changed here";
  if (body.status !== undefined) errors.status = "status cannot be changed here";
  if (body.password !== undefined) errors.password = "password change is not supported here";

  if (body.name !== undefined) {
    if (body.name === null) errors.name = "name cannot be null";
    else if (typeof body.name !== "string") errors.name = "name must be string";
    else if (body.name.length > 50) errors.name = "name must be <= 50 chars";
  }

  if (body.region_code !== undefined) {
    if (body.region_code === null) errors.region_code = "region_code cannot be null";
    else if (typeof body.region_code !== "string") errors.region_code = "region_code must be string";
    else if (body.region_code.length > 10) errors.region_code = "region_code must be <= 10 chars";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender !== undefined) {
    if (body.gender === null) {
      // null 허용하려면 여기서 허용해도 됨. 지금은 금지.
      errors.gender = "gender cannot be null";
    } else if (!allowedGender.includes(body.gender)) {
      errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
    }
  }

  if (body.birth_year !== undefined) {
    if (body.birth_year === null) errors.birth_year = "birth_year cannot be null";
    else {
      const birth = Number(body.birth_year);
      if (!Number.isInteger(birth)) errors.birth_year = "birth_year must be integer";
      else if (birth < 1900 || birth > new Date().getFullYear()) {
        errors.birth_year = "birth_year must be between 1900 and current year";
      }
    }
  }

  if (body.phone_number !== undefined) {
    if (body.phone_number === null) {
      // null 허용
    } else if (typeof body.phone_number !== "string") errors.phone_number = "phone_number must be string or null";
    else if (body.phone_number.length > 20) errors.phone_number = "phone_number must be <= 20 chars";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: body.name !== undefined ? body.name?.trim() : undefined,
      region_code: body.region_code !== undefined ? body.region_code?.trim() : undefined,
      gender: body.gender !== undefined ? body.gender : undefined,
      birth_year: body.birth_year !== undefined ? Number(body.birth_year) : undefined,
      phone_number: body.phone_number !== undefined ? (body.phone_number === null ? null : body.phone_number.trim()) : undefined,
    },
  };
}

function validateAdminPatchBody(body) {
  const errors = {};

  if (body.email !== undefined) {
    if (body.email === null) errors.email = "email cannot be null";
    else if (typeof body.email !== "string") errors.email = "email must be string";
    else if (body.email.length > 100) errors.email = "email must be <= 100 chars";
  }

  if (body.name !== undefined) {
    if (body.name === null) errors.name = "name cannot be null";
    else if (typeof body.name !== "string") errors.name = "name must be string";
    else if (body.name.length > 50) errors.name = "name must be <= 50 chars";
  }

  if (body.region_code !== undefined) {
    if (body.region_code === null) errors.region_code = "region_code cannot be null";
    else if (typeof body.region_code !== "string") errors.region_code = "region_code must be string";
    else if (body.region_code.length > 10) errors.region_code = "region_code must be <= 10 chars";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender !== undefined) {
    if (body.gender === null) errors.gender = "gender cannot be null";
    else if (!allowedGender.includes(body.gender)) errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (body.birth_year !== undefined) {
    if (body.birth_year === null) errors.birth_year = "birth_year cannot be null";
    else {
      const birth = Number(body.birth_year);
      if (!Number.isInteger(birth)) errors.birth_year = "birth_year must be integer";
      else if (birth < 1900 || birth > new Date().getFullYear()) {
        errors.birth_year = "birth_year must be between 1900 and current year";
      }
    }
  }

  if (body.phone_number !== undefined) {
    if (body.phone_number === null) {
      // null 허용
    } else if (typeof body.phone_number !== "string") errors.phone_number = "phone_number must be string or null";
    else if (body.phone_number.length > 20) errors.phone_number = "phone_number must be <= 20 chars";
  }

  const allowedRole = ["USER", "ADMIN"];
  if (body.role !== undefined) {
    if (body.role === null) errors.role = "role cannot be null";
    else if (!allowedRole.includes(body.role)) errors.role = `role must be one of ${allowedRole.join(", ")}`;
  }

  const allowedStatus = ["ACTIVE", "DELETED", "SUSPENDED"];
  if (body.status !== undefined) {
    if (body.status === null) errors.status = "status cannot be null";
    else if (!allowedStatus.includes(body.status)) errors.status = `status must be one of ${allowedStatus.join(", ")}`;
  }

  if (body.password !== undefined) {
    if (body.password === null) errors.password = "password cannot be null";
    else if (typeof body.password !== "string") errors.password = "password must be string";
    else if (body.password.length < 8 || body.password.length > 64) errors.password = "password length must be 8~64";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      email: body.email !== undefined ? body.email?.trim() : undefined,
      name: body.name !== undefined ? body.name?.trim() : undefined,
      region_code: body.region_code !== undefined ? body.region_code?.trim() : undefined,
      gender: body.gender !== undefined ? body.gender : undefined,
      birth_year: body.birth_year !== undefined ? Number(body.birth_year) : undefined,
      phone_number: body.phone_number !== undefined ? (body.phone_number === null ? null : body.phone_number.trim()) : undefined,
      role: body.role !== undefined ? body.role : undefined,
      status: body.status !== undefined ? body.status : undefined,
      password: body.password !== undefined ? body.password : undefined,
    },
  };
}

const ADMIN_USER_SORT_MAP = {
  id: "id",
  email: "email",
  name: "name",
  role: "role",
  status: "status",
  created_at: "created_at",
  updated_at: "updated_at",
};

// ======================================================
// ME (USER, ADMIN)
// ======================================================

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: 내 정보 조회
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: ok }
 */
router.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  try {
    const me = await Users.findOne({
      where: { id: userId, deleted_at: { [Op.is]: null } },
    });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "user not found");
    return sendOk(res, toUserSafe(me));
  } catch (err) {
    console.error("GET /users/me error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get me");
  }
});

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: 내 정보 수정 (이메일/권한/상태/비번 변경 불가)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone_number: { type: string, nullable: true }
 *               birth_year: { type: integer }
 *               gender: { type: string, enum: [MALE, FEMALE, UNKNOWN] }
 *               region_code: { type: string }
 *     responses:
 *       200: { description: ok }
 */
router.patch("/me", requireAuth, async (req, res) => {
  const { ok, value, errors } = validateMePatchBody(req.body);
  if (!ok) return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);

  const userId = req.auth.userId;

  try {
    const me = await Users.findOne({
      where: { id: userId, deleted_at: { [Op.is]: null } },
    });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    // phone 중복 체크
    if (value.phone_number !== undefined && value.phone_number !== me.phone_number) {
      if (value.phone_number !== null) {
        const dupPhone = await Users.findOne({
          where: {
            phone_number: value.phone_number,
            deleted_at: { [Op.is]: null },
            id: { [Op.ne]: me.id },
          },
        });
        if (dupPhone) {
          return sendError(res, 409, "DUPLICATE_RESOURCE", "phone_number already in use", {
            phone_number: value.phone_number,
          });
        }
      }
    }

    const patch = {};
    for (const k of ["name", "region_code", "gender", "birth_year", "phone_number"]) {
      if (value[k] !== undefined) patch[k] = value[k];
    }
    patch.updated_at = new Date();

    await me.update(patch);
    return sendOk(res, toUserSafe(me));
  } catch (err) {
    console.error("PATCH /users/me error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update user");
  }
});

/**
 * @openapi
 * /users/me:
 *   delete:
 *     tags: [Users]
 *     summary: 회원 탈퇴 (soft delete)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       204: { description: no content }
 */
router.delete("/me", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  try {
    const me = await Users.findOne({
      where: { id: userId, deleted_at: { [Op.is]: null } },
    });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    await me.update({
      status: "DELETED",
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /users/me error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete user");
  }
});

// ======================================================
// ADMIN
// ======================================================

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: 유저 목록 조회 (ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, DELETED, SUSPENDED] }
 *       - in: query
 *         name: region_code
 *         schema: { type: string }
 *       - in: query
 *         name: show
 *         schema: { type: string, enum: [active, all], example: active }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "created_at,DESC" }
 *     responses:
 *       200: { description: ok }
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { page, size, offset } = parsePagination(req.query, { defaultSize: 20, maxSize: 200 });

  const show = String(req.query.show ?? "active").toLowerCase(); // active|all
  const keyword = String(req.query.keyword ?? "").trim();
  const role = String(req.query.role ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const region_code = String(req.query.region_code ?? "").trim();

  const where = {};

  if (show !== "all") where.deleted_at = { [Op.is]: null };

  if (keyword) {
    where[Op.or] = [
      { email: { [Op.like]: `%${keyword}%` } },
      { name: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;
  if (region_code) where.region_code = region_code;

  const { order, sort } = parseSort(req.query.sort, ADMIN_USER_SORT_MAP, "id,ASC");

  try {
    const { rows, count } = await Users.findAndCountAll({
      where,
      order,
      limit: size,
      offset,
    });

    return sendOk(res, {
      items: rows.map(toUserSafe),
      meta: { page, size, total: count, sort },
    });
  } catch (err) {
    console.error("GET /users error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list users");
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: 유저 생성 (ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, birth_year, region_code]
 *     responses:
 *       201: { description: created }
 */
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { ok, value, errors } = validateAdminCreateBody(req.body);
  if (!ok) return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);

  try {
    const existing = await Users.findOne({
      where: { email: value.email, deleted_at: { [Op.is]: null } },
    });
    if (existing) {
      return sendError(res, 409, "DUPLICATE_RESOURCE", "email already in use", { email: value.email });
    }

    if (value.phone_number) {
      const existingPhone = await Users.findOne({
        where: { phone_number: value.phone_number, deleted_at: { [Op.is]: null } },
      });
      if (existingPhone) {
        return sendError(res, 409, "DUPLICATE_RESOURCE", "phone_number already in use", {
          phone_number: value.phone_number,
        });
      }
    }

    const password_hash = await bcrypt.hash(value.password, 10);

    const user = await Users.create({
      email: value.email,
      password_hash,
      name: value.name,
      phone_number: value.phone_number,
      birth_year: value.birth_year,
      gender: value.gender,
      region_code: value.region_code,
      role: value.role,
      status: value.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    return sendOk(res, toUserSafe(user), 201);
  } catch (err) {
    console.error("POST /users error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create user");
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: 유저 상세 조회 (ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: ok }
 */
router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 400, "BAD_REQUEST", "invalid user id");

  try {
    const user = await Users.findOne({
      where: { id, deleted_at: { [Op.is]: null } },
      attributes: { exclude: ["password_hash"] },
    });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    return sendOk(res, toUserSafe(user));
  } catch (err) {
    console.error("GET /users/:id error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get user");
  }
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: 유저 수정 (ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: ok }
 */
router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 400, "BAD_REQUEST", "invalid user id");

  const { ok, value, errors } = validateAdminPatchBody(req.body);
  if (!ok) return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);

  try {
    const user = await Users.findOne({
      where: { id, deleted_at: { [Op.is]: null } },
    });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    if (value.email !== undefined && value.email !== user.email) {
      const dup = await Users.findOne({
        where: {
          email: value.email,
          deleted_at: { [Op.is]: null },
          id: { [Op.ne]: id },
        },
      });
      if (dup) return sendError(res, 409, "DUPLICATE_RESOURCE", "email already in use", { email: value.email });
    }

    if (value.phone_number !== undefined && value.phone_number !== user.phone_number) {
      if (value.phone_number !== null) {
        const dupPhone = await Users.findOne({
          where: {
            phone_number: value.phone_number,
            deleted_at: { [Op.is]: null },
            id: { [Op.ne]: id },
          },
        });
        if (dupPhone) {
          return sendError(res, 409, "DUPLICATE_RESOURCE", "phone_number already in use", {
            phone_number: value.phone_number,
          });
        }
      }
    }

    const patch = {};
    for (const k of ["email", "name", "region_code", "gender", "birth_year", "phone_number", "role", "status"]) {
      if (value[k] !== undefined) patch[k] = value[k];
    }

    if (value.password !== undefined) {
      patch.password_hash = await bcrypt.hash(value.password, 10);
    }

    patch.updated_at = new Date();

    await user.update(patch);
    return sendOk(res, toUserSafe(user));
  } catch (err) {
    console.error("PATCH /users/:id error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update user");
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: 유저 삭제(soft) (ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: no content }
 */
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return sendError(res, 400, "BAD_REQUEST", "invalid user id");

  try {
    const user = await Users.findOne({
      where: { id, deleted_at: { [Op.is]: null } },
    });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    await user.update({
      status: "DELETED",
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to delete user");
  }
});

export default router;
