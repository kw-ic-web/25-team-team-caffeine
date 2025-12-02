// back/src/controllers/auth.controller.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../db.js";
import type { JwtPayload } from "../middleware/auth.js";

// =======================
// 이메일 회원가입
// =======================
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

// =======================
// 이메일 로그인
// =======================
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

// =======================
// Google 로그인 (OAuth2로 받은 프로필 기반)
// =======================
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

    if (!process.env.JWT_SECRET) {
      console.error("[Google Login] JWT_SECRET not set");
      return res
        .status(500)
        .json({ message: "JWT_SECRET 환경변수가 설정되어 있지 않습니다." });
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1) 이미 가입된 유저인지 확인
      const [rows] = await conn.execute(
        "SELECT id, email, display_name FROM users WHERE email = ?",
        [email]
      );
      let user: any;

      if ((rows as any[]).length > 0) {
        user = (rows as any[])[0];
        console.log("[Google Login] Existing user:", user.id, user.email);
      } else {
        console.log("[Google Login] New user, insert:", email);

        // 2) 없으면 새로 생성 (랜덤 비밀번호)
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

        // profiles 테이블도 쓰는 구조면 같이 생성
        try {
          await conn.execute(
            "INSERT INTO profiles (user_id, display_name) VALUES (?, ?)",
            [user.id, displayName ?? null]
          );
        } catch (e) {
          // profiles 테이블이 없을 수도 있으니, 여기서만 잡고 로그만 남김
          console.warn(
            "[Google Login] profiles 테이블 insert 실패 (무시 가능):",
            e
          );
        }
      }

      await conn.commit();

      // 3) JWT 발급
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
    // 어떤 에러인지 프론트에서 바로 보이도록 메시지도 내려줌
    if (err instanceof Error) {
      return res.status(500).json({ message: err.message });
    }
    return res.status(500).json({ message: "서버 에러" });
  }
};