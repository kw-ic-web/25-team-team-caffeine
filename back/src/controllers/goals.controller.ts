import type { Response } from "express";

import { pool } from "../db";
import type { AuthedRequest } from "../middleware/auth";

// 내 목표 리스트 조회
export const listMyGoals = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
      [req.userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 목표 생성
export const createGoal = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const { title, difficulty, powderReward, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: "title은 필수입니다." });
    }

    const diff = difficulty ?? 1;
    const reward = powderReward ?? 100;

    const [result] = await pool.execute(
      `INSERT INTO goals (user_id, title, difficulty, powder_reward, due_date)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, title, diff, reward, dueDate ?? null]
    );

    const insertResult = result as any;

    return res.status(201).json({
      id: insertResult.insertId ?? null, // id를 UUID로 쓰면 다시 select해서 가져와도 됨
      title,
      difficulty: diff,
      powderReward: reward,
      dueDate: dueDate ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 목표 수정 (진행도/완료 상태 등)
export const updateGoal = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const goalId = req.params.id;
    const { title, completed, progress, difficulty, powderReward, dueDate } =
      req.body;

    // PATCH 느낌으로, 들어온 값만 업데이트
    const fields: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(title);
    }
    if (completed !== undefined) {
      fields.push("completed = ?");
      values.push(completed ? 1 : 0);
    }
    if (progress !== undefined) {
      fields.push("progress = ?");
      values.push(progress);
    }
    if (difficulty !== undefined) {
      fields.push("difficulty = ?");
      values.push(difficulty);
    }
    if (powderReward !== undefined) {
      fields.push("powder_reward = ?");
      values.push(powderReward);
    }
    if (dueDate !== undefined) {
      fields.push("due_date = ?");
      values.push(dueDate);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "수정할 필드가 없습니다." });
    }

    values.push(goalId, req.userId);

    const [result] = await pool.execute(
      `UPDATE goals
       SET ${fields.join(", ")}
       WHERE id = ? AND user_id = ?`,
      values
    );

    const r = result as any;
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "목표를 찾을 수 없습니다." });
    }

    return res.json({ message: "updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 목표 삭제
export const deleteGoal = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const goalId = req.params.id;

    const [result] = await pool.execute(
      "DELETE FROM goals WHERE id = ? AND user_id = ?",
      [goalId, req.userId]
    );

    const r = result as any;
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "목표를 찾을 수 없습니다." });
    }

    return res.json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};
