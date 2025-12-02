// back/src/controllers/auth.controller.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../db.js";
import type { JwtPayload } from "../middleware/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "team_caffeine_jwt_secret_key";


export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email과 password는 필수입니다." });
    }

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

      // 1. users 생성
      await conn.execute(
        "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
        [email, passwordHash, displayName ?? null]
      );

      const [userRows] = await conn.execute(
        "SELECT id, email, display_name FROM users WHERE email = ?",
        [email]
      );
      const user = (userRows as any[])[0];
      const userId = user.id as string;

      await conn.execute(
        "INSERT INTO profiles (user_id, display_name) VALUES (?, ?)",
        [userId, displayName ?? null]
      );

      await conn.execute(
        "INSERT INTO user_powder (user_id, amount) VALUES (?, ?)",
        [userId, 1000]
      );

      await conn.commit();

      const token = jwt.sign(
        { userId } as JwtPayload,
        JWT_SECRET,
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

    // [수정] 상수 JWT_SECRET 사용
    const token = jwt.sign(
      { userId: user.id } as JwtPayload,
      JWT_SECRET,
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


export const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { email, displayName, googleId } = req.body as {
      email?: string;
      displayName?: string;
      googleId?: string;
    };

    console.log("[Google Login] req.body:", req.body);

    if (!email || !googleId) {
      return res
        .status(400)
        .json({ message: "Google 계정 정보가 올바르지 않습니다." });
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        "SELECT id, email, display_name FROM users WHERE email = ?",
        [email]
      );
      let user: any;

      if ((rows as any[]).length > 0) {
        user = (rows as any[])[0];
      } else {

        const randomPasswordHash = await bcrypt.hash(
          `google-${googleId}-${Date.now()}`,
          10
        );

        await conn.execute(
          "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
          [email, randomPasswordHash, displayName ?? null]
        );

        const [userRows] = await conn.execute(
          "SELECT id, email, display_name FROM users WHERE email = ?",
          [email]
        );
        user = (userRows as any[])[0];

        try {
          await conn.execute(
            "INSERT INTO profiles (user_id, display_name) VALUES (?, ?)",
            [user.id, displayName ?? null]
          );
        } catch (e) {
          console.warn(
            "[Google Login] profiles 테이블 insert 실패 (무시 가능):",
            e
          );
        }

        try {
          await conn.execute(
            "INSERT INTO user_powder (user_id, amount) VALUES (?, ?)",
            [user.id, 1000]
          );
        } catch (e) {
          console.warn("[Google Login] 가루 지급 실패:", e);
        }
      }

      await conn.commit();

      const token = jwt.sign(
        { userId: user.id } as JwtPayload,
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name ?? displayName,
        },
      });
    } catch (err) {
      await conn.rollback();
      console.error("[Google Login] 트랜잭션 에러:", err);
      return res
        .status(500)
        .json({ message: "Google 로그인 처리 중 오류가 발생했습니다." });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[Google Login] 서버 에러:", err);
    if (err instanceof Error) {
      return res.status(500).json({ message: err.message });
    }
    return res.status(500).json({ message: "서버 에러" });
  }
};