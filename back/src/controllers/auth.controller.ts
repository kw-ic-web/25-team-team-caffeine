// back/src/controllers/auth.controller.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../db";
import type { JwtPayload } from "../middleware/auth";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email과 password는 필수입니다." });
    }

    // 이메일 중복 확인
    const [existingRows] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    const existing = existingRows as any[];
    if (existing.length > 0) {
      return res.status(409).json({ message: "이미 존재하는 이메일입니다." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // users 생성
      await conn.execute(
        "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
        [email, passwordHash, displayName ?? null]
      );

      // 새로 생성된 유저 조회 (email 기준)
      const [userRows] = await conn.execute(
        "SELECT id, email, display_name FROM users WHERE email = ?",
        [email]
      );
      const user = (userRows as any[])[0];
      const userId = user.id as string;

      // profiles 생성 (user_id FK)
      await conn.execute(
        "INSERT INTO profiles (user_id, display_name) VALUES (?, ?)",
        [userId, displayName ?? null]
      );

      await conn.commit();

      const token = jwt.sign(
        { userId } as JwtPayload,
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        token,
        user: {
          id: userId,
          email: user.email,
          displayName: user.display_name ?? displayName,
        },
      });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      return res
        .status(500)
        .json({ message: "사용자 생성 중 오류가 발생했습니다." });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email과 password는 필수입니다." });
    }

    const [rows] = await pool.execute(
      "SELECT id, email, password_hash, display_name FROM users WHERE email = ?",
      [email]
    );
    const users = rows as any[];

    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const user = users[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const token = jwt.sign(
      { userId: user.id } as JwtPayload,
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

export const handleGoogleCallback = async (_req: Request, res: Response) => {
  // Google OAuth는 아직 구현하지 않았으므로, 명시적으로 501을 반환합니다.
  return res.status(501).json({
    message: "Google OAuth callback은 아직 구현되지 않았습니다.",
  });
};
