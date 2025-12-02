import type { Response } from "express";

import { pool } from "../db.js";
import type { AuthedRequest } from "../middleware/auth.js";

// 내 일정 목록
export const listMyEvents = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_date ASC",
      [req.userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 일정 생성
export const createEvent = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const { title, description, startDate, endDate } = req.body;

    if (!title || !startDate) {
      return res
        .status(400)
        .json({ message: "title과 startDate는 필수입니다." });
    }

    const [result] = await pool.execute(
      `INSERT INTO calendar_events (user_id, title, description, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, title, description ?? null, startDate, endDate ?? null]
    );

    const insertResult = result as any;

    return res.status(201).json({
      id: insertResult.insertId ?? null,
      title,
      description: description ?? null,
      startDate,
      endDate: endDate ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 일정 수정
export const updateEvent = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const eventId = req.params.id;
    const { title, description, startDate, endDate } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }
    if (startDate !== undefined) {
      fields.push("start_date = ?");
      values.push(startDate);
    }
    if (endDate !== undefined) {
      fields.push("end_date = ?");
      values.push(endDate);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "수정할 필드가 없습니다." });
    }

    values.push(eventId, req.userId);

    const [result] = await pool.execute(
      `UPDATE calendar_events
       SET ${fields.join(", ")}
       WHERE id = ? AND user_id = ?`,
      values
    );

    const r = result as any;
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "일정을 찾을 수 없습니다." });
    }

    return res.json({ message: "updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 일정 삭제
export const deleteEvent = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const eventId = req.params.id;

    const [result] = await pool.execute(
      "DELETE FROM calendar_events WHERE id = ? AND user_id = ?",
      [eventId, req.userId]
    );

    const r = result as any;
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "일정을 찾을 수 없습니다." });
    }

    return res.json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};
