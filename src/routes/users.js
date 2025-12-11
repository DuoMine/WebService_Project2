// src/routes/users.js
import { Router } from "express";
import { models } from "../config/db.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

const { Users } = models;
const router = Router();

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
