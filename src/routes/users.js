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

const ALLOWED_GENDER = ["MALE", "FEMALE", "UNKNOWN"];
const ALLOWED_ROLE = ["USER", "ADMIN"];
const ALLOWED_STATUS = ["ACTIVE", "DELETED", "SUSPENDED"];
const ALLOWED_SHOW = ["active", "all"];

// ------------------------------
// validation helpers
// ------------------------------
function normalizeNullableString(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return Symbol("NOT_STRING");
  const t = v.trim();
  return t ? t : null;
}

function validateAdminCreateBody(body) {
  const errors = {};

  // email
  if (!body.email || typeof body.email !== "string") errors.email = "email is required";
  else if (!body.email.trim()) errors.email = "email must be non-empty string";
  else if (body.email.trim().length > 100) errors.email = "email must be <= 100 chars";

  // password
  if (!body.password || typeof body.password !== "string") errors.password = "password is required";
  else if (body.password.length < 8 || body.password.length > 64)
    errors.password = "password length must be 8~64";

  // name
  if (!body.name || typeof body.name !== "string") errors.name = "name is required";
  else if (!body.name.trim()) errors.name = "name must be non-empty string";
  else if (body.name.trim().length > 50) errors.name = "name must be <= 50 chars";

  // birth_year
  const birth = Number(body.birth_year);
  if (!Number.isInteger(birth)) errors.birth_year = "birth_year must be integer";
  else if (birth < 1900 || birth > new Date().getFullYear()) {
    errors.birth_year = "birth_year must be between 1900 and current year";
  }

  // gender
  if (body.gender !== undefined) {
    if (body.gender === null) errors.gender = "gender cannot be null";
    else if (!ALLOWED_GENDER.includes(body.gender)) {
      errors.gender = `gender must be one of ${ALLOWED_GENDER.join(", ")}`;
    }
  }

  // region_code
  if (!body.region_code || typeof body.region_code !== "string") errors.region_code = "region_code is required";
  else if (!body.region_code.trim()) errors.region_code = "region_code must be non-empty string";
  else if (body.region_code.trim().length > 10) errors.region_code = "region_code must be <= 10 chars";

  // role
  if (body.role !== undefined) {
    if (body.role === null) errors.role = "role cannot be null";
    else if (!ALLOWED_ROLE.includes(body.role)) {
      errors.role = `role must be one of ${ALLOWED_ROLE.join(", ")}`;
    }
  }

  // status
  if (body.status !== undefined) {
    if (body.status === null) errors.status = "status cannot be null";
    else if (!ALLOWED_STATUS.includes(body.status)) {
      errors.status = `status must be one of ${ALLOWED_STATUS.join(", ")}`;
    }
  }

  // phone_number (string|null|undefined)
  if (body.phone_number !== undefined) {
    if (body.phone_number === null) {
      // ok
    } else if (typeof body.phone_number !== "string") {
      errors.phone_number = "phone_number must be string or null";
    } else if (body.phone_number.trim().length > 20) {
      errors.phone_number = "phone_number must be <= 20 chars";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const phoneNormalized = normalizeNullableString(body.phone_number);
  if (phoneNormalized === Symbol("NOT_STRING")) {
    // 이미 errors에서 잡히긴 하는데 혹시 방어
    return { ok: false, errors: { phone_number: "phone_number must be string or null" } };
  }

  return {
    ok: true,
    value: {
      email: body.email.trim(),
      password: body.password,
      name: body.name.trim(),
      birth_year: birth,
      gender: body.gender || "UNKNOWN",
      region_code: body.region_code.trim(),
      phone_number: phoneNormalized ?? null,
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
    else if (!body.name.trim()) errors.name = "name must be non-empty string";
    else if (body.name.trim().length > 50) errors.name = "name must be <= 50 chars";
  }

  if (body.region_code !== undefined) {
    if (body.region_code === null) errors.region_code = "region_code cannot be null";
    else if (typeof body.region_code !== "string") errors.region_code = "region_code must be string";
    else if (!body.region_code.trim()) errors.region_code = "region_code must be non-empty string";
    else if (body.region_code.trim().length > 10) errors.region_code = "region_code must be <= 10 chars";
  }

  if (body.gender !== undefined) {
    if (body.gender === null) errors.gender = "gender cannot be null";
    else if (!ALLOWED_GENDER.includes(body.gender)) {
      errors.gender = `gender must be one of ${ALLOWED_GENDER.join(", ")}`;
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
    else if (body.phone_number.trim().length > 20) errors.phone_number = "phone_number must be <= 20 chars";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const phoneNormalized = normalizeNullableString(body.phone_number);
  if (phoneNormalized === Symbol("NOT_STRING")) {
    return { ok: false, errors: { phone_number: "phone_number must be string or null" } };
  }

  return {
    ok: true,
    value: {
      name: body.name !== undefined ? body.name.trim() : undefined,
      region_code: body.region_code !== undefined ? body.region_code.trim() : undefined,
      gender: body.gender !== undefined ? body.gender : undefined,
      birth_year: body.birth_year !== undefined ? Number(body.birth_year) : undefined,
      phone_number: body.phone_number !== undefined ? phoneNormalized : undefined,
    },
  };
}

function validateAdminPatchBody(body) {
  const errors = {};

  if (body.email !== undefined) {
    if (body.email === null) errors.email = "email cannot be null";
    else if (typeof body.email !== "string") errors.email = "email must be string";
    else if (!body.email.trim()) errors.email = "email must be non-empty string";
    else if (body.email.trim().length > 100) errors.email = "email must be <= 100 chars";
  }

  if (body.name !== undefined) {
    if (body.name === null) errors.name = "name cannot be null";
    else if (typeof body.name !== "string") errors.name = "name must be string";
    else if (!body.name.trim()) errors.name = "name must be non-empty string";
    else if (body.name.trim().length > 50) errors.name = "name must be <= 50 chars";
  }

  if (body.region_code !== undefined) {
    if (body.region_code === null) errors.region_code = "region_code cannot be null";
    else if (typeof body.region_code !== "string") errors.region_code = "region_code must be string";
    else if (!body.region_code.trim()) errors.region_code = "region_code must be non-empty string";
    else if (body.region_code.trim().length > 10) errors.region_code = "region_code must be <= 10 chars";
  }

  if (body.gender !== undefined) {
    if (body.gender === null) errors.gender = "gender cannot be null";
    else if (!ALLOWED_GENDER.includes(body.gender)) {
      errors.gender = `gender must be one of ${ALLOWED_GENDER.join(", ")}`;
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
    else if (body.phone_number.trim().length > 20) errors.phone_number = "phone_number must be <= 20 chars";
  }

  if (body.role !== undefined) {
    if (body.role === null) errors.role = "role cannot be null";
    else if (!ALLOWED_ROLE.includes(body.role)) errors.role = `role must be one of ${ALLOWED_ROLE.join(", ")}`;
  }

  if (body.status !== undefined) {
    if (body.status === null) errors.status = "status cannot be null";
    else if (!ALLOWED_STATUS.includes(body.status))
      errors.status = `status must be one of ${ALLOWED_STATUS.join(", ")}`;
  }

  if (body.password !== undefined) {
    if (body.password === null) errors.password = "password cannot be null";
    else if (typeof body.password !== "string") errors.password = "password must be string";
    else if (body.password.length < 8 || body.password.length > 64) errors.password = "password length must be 8~64";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const phoneNormalized = normalizeNullableString(body.phone_number);
  if (phoneNormalized === Symbol("NOT_STRING")) {
    return { ok: false, errors: { phone_number: "phone_number must be string or null" } };
  }

  return {
    ok: true,
    value: {
      email: body.email !== undefined ? body.email.trim() : undefined,
      name: body.name !== undefined ? body.name.trim() : undefined,
      region_code: body.region_code !== undefined ? body.region_code.trim() : undefined,
      gender: body.gender !== undefined ? body.gender : undefined,
      birth_year: body.birth_year !== undefined ? Number(body.birth_year) : undefined,
      phone_number: body.phone_number !== undefined ? phoneNormalized : undefined,
      role: body.role !== undefined ? body.role : undefined,
      status: body.status !== undefined ? body.status : undefined,
      password: body.password !== undefined ? body.password : undefined,
    },
  };
}

function validateAdminListQuery(q) {
  const errors = {};
  const show = String(q.show ?? "active").toLowerCase();

  const role = q.role !== undefined ? String(q.role).trim() : "";
  const status = q.status !== undefined ? String(q.status).trim() : "";

  if (!ALLOWED_SHOW.includes(show)) errors.show = `show must be one of ${ALLOWED_SHOW.join(", ")}`;
  if (role && !ALLOWED_ROLE.includes(role)) errors.role = `role must be one of ${ALLOWED_ROLE.join(", ")}`;
  if (status && !ALLOWED_STATUS.includes(status)) errors.status = `status must be one of ${ALLOWED_STATUS.join(", ")}`;

  return { ok: Object.keys(errors).length === 0, errors, value: { show, role, status } };
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
  const { ok, value, errors } = validateMePatchBody(req.body ?? {});
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

  const vq = validateAdminListQuery(req.query ?? {});
  if (!vq.ok) return sendError(res, 400, "VALIDATION_FAILED", "invalid query", vq.errors);

  const show = vq.value.show;
  const keyword = String(req.query.keyword ?? "").trim();
  const role = vq.value.role;
  const status = vq.value.status;
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
      content: rows.map(toUserSafe),
      page,
      size,
      totalElements: count,
      totalPages: Math.ceil(count / size),
      sort,
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
  const { ok, value, errors } = validateAdminCreateBody(req.body ?? {});
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

  const { ok, value, errors } = validateAdminPatchBody(req.body ?? {});
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
