import type { Response } from "express";

import { pool } from "../db";
import type { AuthedRequest } from "../middleware/auth";

// 내 파우더 조회
export const getMyPowder = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const [rows] = await pool.execute(
      "SELECT amount FROM user_powder WHERE user_id = ?",
      [req.userId]
    );

    const data = rows as any[];

    if (data.length === 0) {
      // 없으면 0으로 초기화
      await pool.execute(
        "INSERT INTO user_powder (user_id, amount) VALUES (?, ?)",
        [req.userId, 0]
      );
      return res.json({ amount: 0 });
    }

    return res.json({ amount: data[0].amount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 파우더 증감 (delta 만큼 더하거나 빼기)
export const updateMyPowder = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const { delta } = req.body;

    if (typeof delta !== "number") {
      return res.status(400).json({ message: "delta 숫자가 필요합니다." });
    }

    // 없으면 생성, 있으면 업데이트
    await pool.execute(
      `INSERT INTO user_powder (user_id, amount)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount)`,
      [req.userId, delta]
    );

    // 최신 값 다시 조회
    const [rows] = await pool.execute(
      "SELECT amount FROM user_powder WHERE user_id = ?",
      [req.userId]
    );
    const data = rows as any[];

    return res.json({ amount: data[0].amount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};
