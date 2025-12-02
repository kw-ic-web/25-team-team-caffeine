// back/src/controllers/users.controller.ts
import type { Response } from "express";

import { pool } from "../db.js";
import type { AuthedRequest } from "../middleware/auth.js";

export const getCurrentUser = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const [rows] = await pool.execute(
      `SELECT u.id,
              u.email,
              u.display_name,
              p.display_name AS profile_display_name
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    const user = users[0];

    return res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name ?? user.profile_display_name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

export const listUsers = async (_req: AuthedRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, display_name FROM users ORDER BY created_at DESC"
    );

    const users = rows as any[];

    return res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

export const updateCurrentUser = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { display_name } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
      return res.status(400).json({ message: "유효한 닉네임을 입력해주세요." });
    }

    await pool.execute(
      "UPDATE users SET display_name = ? WHERE id = ?",
      [display_name, userId]
    );
    return res.json({
      id: userId,
      displayName: display_name,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};