// src/routes/users.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { sendError } from "../utils/http.js";
import  bcrypt from "bcrypt";

const { Users } = models;
const router = Router();

function validateUserCreateBody(body) {
  const errors = {};

  if (!body.email || typeof body.email !== "string") {
    errors.email = "email is required";
  } else if (body.email.length > 100) {
    errors.email = "email must be <= 100 chars";
  }

  if (!body.password || typeof body.password !== "string") {
    errors.password = "password is required";
  } else if (body.password.length < 8 || body.password.length > 64) {
    errors.password = "password length must be 8~64";
  }

  if (!body.name || typeof body.name !== "string") {
    errors.name = "name is required";
  } else if (body.name.length > 50) {
    errors.name = "name must be <= 50 chars";
  }

  const birth = Number(body.birth_year);
  if (!Number.isInteger(birth)) {
    errors.birth_year = "birth_year must be integer";
  } else if (birth < 1900 || birth > new Date().getFullYear()) {
    errors.birth_year = "birth_year must be between 1900 and current year";
  }

  const allowedGender = ["MALE", "FEMALE", "UNKNOWN"];
  if (body.gender && !allowedGender.includes(body.gender)) {
    errors.gender = `gender must be one of ${allowedGender.join(", ")}`;
  }

  if (!body.region_code || typeof body.region_code !== "string") {
    errors.region_code = "region_code is required";
  } else if (body.region_code.length > 10) {
    errors.region_code = "region_code must be <= 10 chars";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
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
      phone_number: body.phone_number?.trim() || null,
    },
  };
}

/**
 * GET /api/v1/users/me
 * 내 정보 조회 (로그인 필요)
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = req.user; // requireAuth에서 넣어줌

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      birth_year: user.birth_year,
      gender: user.gender,
      region_code: user.region_code,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /api/v1/users
 * 전체 사용자 목록 (ADMIN만 허용)
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await Users.findAll({
      where: { deleted_at: null },
      order: [["id", "ASC"]],
      attributes: {
        exclude: ["password_hash"],
      },
    });

    return res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

// ------------------------------
// POST /users  (ADMIN 전용)
// ------------------------------
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { ok, value, errors } = validateUserCreateBody(req.body);
  if (!ok) {
    return sendError(res, 400, "VALIDATION_FAILED", "invalid request body", errors);
  }

  try {
    // email 중복
    const existing = await Users.findOne({ where: { email: value.email } });
    if (existing) {
      return sendError(
        res,
        409,
        "DUPLICATE_RESOURCE",
        "email already in use",
        { email: value.email }
      );
    }

    // phone_number 중복 (있을 경우만)
    if (value.phone_number) {
      const existingPhone = await Users.findOne({
        where: { phone_number: value.phone_number },
      });
      if (existingPhone) {
        return sendError(
          res,
          409,
          "DUPLICATE_RESOURCE",
          "phone_number already in use",
          { phone_number: value.phone_number }
        );
      }
    }

    // 비밀번호 해싱
    const password_hash = await bcrypt.hash(value.password, 10);

    // 유저 생성
    const user = await Users.create({
      email: value.email,
      password_hash,
      name: value.name,
      phone_number: value.phone_number,
      birth_year: value.birth_year,
      gender: value.gender,
      region_code: value.region_code,
      role: "USER",       // 관리자가 만드는 것도 기본 USER
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      birth_year: user.birth_year,
      gender: user.gender,
      region_code: user.region_code,
      phone_number: user.phone_number,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("POST /users error:", err);
    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "failed to create user"
    );
  }
});

/**
 * PUT /api/v1/users/:id
 * 자신의 정보 수정 OR 관리자용 수정
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const authUser = req.user;

    // 일반 유저는 자기 자신만 수정 가능
    if (authUser.role !== "ADMIN" && authUser.id !== targetId) {
      return res.status(403).json({ message: "permission denied" });
    }

    const user = await Users.findOne({
      where: { id: targetId, deleted_at: null },
    });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const { name, region_code, gender, birth_year } = req.body;

    await user.update({
      name,
      region_code,
      gender,
      birth_year,
    });

    return res.json({ message: "updated", user });
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Hard delete는 위험 → soft delete로 처리
 * ADMIN 전용
 */
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const targetId = Number(req.params.id);

    const user = await Users.findOne({
      where: { id: targetId, deleted_at: null },
    });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    await user.update({ deleted_at: new Date() });
    return res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

export default router;
