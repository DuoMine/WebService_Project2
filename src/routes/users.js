// src/routes/users.js
import { Router } from "express";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";

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
  else if (birth < 1900 || birth > new Date().getFullYear()) errors.birth_year = "birth_year must be between 1900 and current year";

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender && !allowedGender.includes(body.gender)) {
    errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (!body.region_code || typeof body.region_code !== "string") errors.region_code = "region_code is required";
  else if (body.region_code.length > 10) errors.region_code = "region_code must be <= 10 chars";

  const allowedRole = ["USER", "ADMIN"]; // 필요하면 MANAGER 추가
  if (body.role && !allowedRole.includes(body.role)) {
    errors.role = `role must be one of ${allowedRole.join(", ")}`;
  }

  const allowedStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"];
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

  // me에서는 email/role/status/password 변경은 막는 게 안전
  if (body.email != null) errors.email = "email cannot be changed here";
  if (body.role != null) errors.role = "role cannot be changed here";
  if (body.status != null) errors.status = "status cannot be changed here";
  if (body.password != null) errors.password = "use /users/me/password";

  if (body.name != null) {
    if (typeof body.name !== "string") errors.name = "name must be string";
    else if (body.name.length > 50) errors.name = "name must be <= 50 chars";
  }

  if (body.region_code != null) {
    if (typeof body.region_code !== "string") errors.region_code = "region_code must be string";
    else if (body.region_code.length > 10) errors.region_code = "region_code must be <= 10 chars";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender != null && !allowedGender.includes(body.gender)) {
    errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (body.birth_year != null) {
    const birth = Number(body.birth_year);
    if (!Number.isInteger(birth)) errors.birth_year = "birth_year must be integer";
    else if (birth < 1900 || birth > new Date().getFullYear()) errors.birth_year = "birth_year must be between 1900 and current year";
  }

  if (body.phone_number != null) {
    if (typeof body.phone_number !== "string") errors.phone_number = "phone_number must be string";
    else if (body.phone_number.length > 20) errors.phone_number = "phone_number must be <= 20 chars";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: body.name?.trim(),
      region_code: body.region_code?.trim(),
      gender: body.gender,
      birth_year: body.birth_year != null ? Number(body.birth_year) : undefined,
      phone_number: body.phone_number?.trim(),
    },
  };
}

function validateAdminPatchBody(body) {
  const errors = {};

  // ADMIN은 더 넓게 수정 가능(하지만 email 중복, phone 중복 체크 필요)
  if (body.email != null) {
    if (typeof body.email !== "string") errors.email = "email must be string";
    else if (body.email.length > 100) errors.email = "email must be <= 100 chars";
  }

  if (body.name != null) {
    if (typeof body.name !== "string") errors.name = "name must be string";
    else if (body.name.length > 50) errors.name = "name must be <= 50 chars";
  }

  if (body.region_code != null) {
    if (typeof body.region_code !== "string") errors.region_code = "region_code must be string";
    else if (body.region_code.length > 10) errors.region_code = "region_code must be <= 10 chars";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender != null && !allowedGender.includes(body.gender)) {
    errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (body.birth_year != null) {
    const birth = Number(body.birth_year);
    if (!Number.isInteger(birth)) errors.birth_year = "birth_year must be integer";
    else if (birth < 1900 || birth > new Date().getFullYear()) errors.birth_year = "birth_year must be between 1900 and current year";
  }

  if (body.phone_number != null) {
    if (typeof body.phone_number !== "string") errors.phone_number = "phone_number must be string";
    else if (body.phone_number.length > 20) errors.phone_number = "phone_number must be <= 20 chars";
  }

  const allowedRole = ["USER", "ADMIN"];
  if (body.role != null && !allowedRole.includes(body.role)) {
    errors.role = `role must be one of ${allowedRole.join(", ")}`;
  }

  const allowedStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"];
  if (body.status != null && !allowedStatus.includes(body.status)) {
    errors.status = `status must be one of ${allowedStatus.join(", ")}`;
  }

  if (body.password != null) {
    if (typeof body.password !== "string") errors.password = "password must be string";
    else if (body.password.length < 8 || body.password.length > 64) errors.password = "password length must be 8~64";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      email: body.email?.trim(),
      name: body.name?.trim(),
      region_code: body.region_code?.trim(),
      gender: body.gender,
      birth_year: body.birth_year != null ? Number(body.birth_year) : undefined,
      phone_number: body.phone_number?.trim(),
      role: body.role,
      status: body.status,
      password: body.password,
    },
  };
}

// ======================================================
// ME (USER, ADMIN)
// ======================================================

/**
 * GET /users/me
 */
router.get("/me", requireAuth, async (req, res) => {
  return res.json(toUserSafe(req.user));
});

/**
 * PATCH /users/me
 */
router.patch("/me", requireAuth, async (req, res) => {
  const { ok, value, errors } = validateMePatchBody(req.body);
  if (!ok) return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);

  try {
    const me = await Users.findOne({
      where: { id: req.user.id, deleted_at: { [Op.is]: null } },
    });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    // phone 중복 체크
    if (value.phone_number != null && value.phone_number !== me.phone_number) {
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

    // undefined는 업데이트에서 제외
    const patch = {};
    for (const k of ["name", "region_code", "gender", "birth_year", "phone_number"]) {
      if (value[k] !== undefined) patch[k] = value[k];
    }
    patch.updated_at = new Date();

    await me.update(patch);
    return res.json(toUserSafe(me));
  } catch (err) {
    console.error("PATCH /users/me error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update user");
  }
});

/**
 * DELETE /users/me  (soft delete)
 */
router.delete("/me", requireAuth, async (req, res) => {
  try {
    const me = await Users.findOne({
      where: { id: req.user.id, deleted_at: { [Op.is]: null } },
    });
    if (!me) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    await me.update({
      status: "INACTIVE",
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
// ADMIN (users/ 바로 사용)
// ======================================================

/**
 * GET /users  (ADMIN)
 * query: page, size, sort, keyword, role, status, region_code, show=active|all
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const size = Math.min(200, Math.max(1, parseInt(req.query.size ?? "20", 10)));
    const offset = (page - 1) * size;

    const show = String(req.query.show ?? "active").toLowerCase(); // active|all
    const keyword = (req.query.keyword ?? "").toString().trim();
    const role = (req.query.role ?? "").toString().trim();
    const status = (req.query.status ?? "").toString().trim();
    const region_code = (req.query.region_code ?? "").toString().trim();

    const where = {};

    if (show !== "all") {
      where.deleted_at = { [Op.is]: null };
    }

    if (keyword) {
      where[Op.or] = [
        { email: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (role) where.role = role;
    if (status) where.status = status;
    if (region_code) where.region_code = region_code;

    // sort=created_at,DESC 같은 형태
    const sort = (req.query.sort ?? "id,ASC").toString();
    const [sortFieldRaw, sortDirRaw] = sort.split(",");
    const sortField = (sortFieldRaw || "id").trim();
    const sortDir = (sortDirRaw || "ASC").trim().toUpperCase() === "DESC" ? "DESC" : "ASC";

    const allowedSort = new Set(["id", "created_at", "updated_at", "email", "name", "role", "status"]);
    const order = [[allowedSort.has(sortField) ? sortField : "id", sortDir]];

    const { rows, count } = await Users.findAndCountAll({
      where,
      order,
      limit: size,
      offset,
      attributes: { exclude: ["password_hash"] },
    });

    const totalElements = count;
    const totalPages = Math.ceil(totalElements / size);

    return res.json({
      content: rows.map(toUserSafe),
      page,
      size,
      totalElements,
      totalPages,
      sort: `${allowedSort.has(sortField) ? sortField : "id"},${sortDir}`,
    });
  } catch (err) {
    console.error("GET /users error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to list users");
  }
});

/**
 * POST /users (ADMIN)
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
    });

    return res.status(201).json(toUserSafe(user));
  } catch (err) {
    console.error("POST /users error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to create user");
  }
});

/**
 * GET /users/:id (ADMIN)
 */
router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, "INVALID_QUERY_PARAM", "invalid user id");
  }

  try {
    const user = await Users.findOne({
      where: { id, deleted_at: { [Op.is]: null } },
      attributes: { exclude: ["password_hash"] },
    });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "user not found");
    return res.json(toUserSafe(user));
  } catch (err) {
    console.error("GET /users/:id error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to get user");
  }
});

/**
 * PATCH /users/:id (ADMIN)
 */
router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, "INVALID_QUERY_PARAM", "invalid user id");
  }

  const { ok, value, errors } = validateAdminPatchBody(req.body);
  if (!ok) return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);

  try {
    const user = await Users.findOne({
      where: { id, deleted_at: { [Op.is]: null } },
    });
    if (!user) return sendError(res, 404, "USER_NOT_FOUND", "user not found");

    // email 중복 체크
    if (value.email != null && value.email !== user.email) {
      const dup = await Users.findOne({
        where: {
          email: value.email,
          deleted_at: { [Op.is]: null },
          id: { [Op.ne]: id },
        },
      });
      if (dup) {
        return sendError(res, 409, "DUPLICATE_RESOURCE", "email already in use", { email: value.email });
      }
    }

    // phone 중복 체크
    if (value.phone_number != null && value.phone_number !== user.phone_number) {
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

    const patch = {};
    for (const k of ["email", "name", "region_code", "gender", "birth_year", "phone_number", "role", "status"]) {
      if (value[k] !== undefined) patch[k] = value[k];
    }

    // password 변경도 admin이 가능하게 할거면 여기서 처리
    if (value.password != null) {
      patch.password_hash = await bcrypt.hash(value.password, 10);
    }

    patch.updated_at = new Date();

    await user.update(patch);
    return res.json(toUserSafe(user));
  } catch (err) {
    console.error("PATCH /users/:id error:", err);
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "failed to update user");
  }
});

/**
 * DELETE /users/:id (ADMIN) soft delete
 */
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, "INVALID_QUERY_PARAM", "invalid user id");
  }

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
