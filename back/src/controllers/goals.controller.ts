import type { Request, Response } from "express";
import { pool } from "../db.js";
import { v4 as uuidv4 } from "uuid";

// UUID 생성 헬퍼 함수 (라이브러리 없을 시 폴백)
function generateUUID() {
  if (typeof uuidv4 === 'function') return uuidv4();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// auth 미들웨어와 호환 (req.user.id 또는 req.userId)
type AuthedRequest = Request & { userId?: string; user?: { id: string } };

// 내 목표 리스트 조회
export const listMyGoals = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    // schedule_type 등 추가된 컬럼도 모두 조회
    const [rows] = await pool.query(
      "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

export const createGoal = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const { 
      title, 
      difficulty = 1, 
      powderReward = 100, // 총 보상
      dueDate,
      schedule_type = 'none',
      schedule_days = null,
      total_days = 0 
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "title은 필수입니다." });
    }

    const id = generateUUID();

    let scheduleDaysStr = schedule_days;
    if (Array.isArray(schedule_days)) {
        scheduleDaysStr = schedule_days.join(',');
    }

    // ✅ [수정] daily_powder_reward는 이제 사용하지 않으므로 0으로 저장
    const daily_powder_reward = 0;

    await pool.query(
      `INSERT INTO goals (
        id, user_id, title, difficulty, 
        powder_reward, due_date, 
        schedule_type, schedule_days, daily_powder_reward, total_days,
        completed, progress, completed_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [
        id, userId, title, difficulty, 
        powderReward, dueDate || null, 
        schedule_type, scheduleDaysStr, daily_powder_reward, total_days
      ]
    );

    const [rows] = await pool.query(`SELECT * FROM goals WHERE id = ?`, [id]);
    return res.status(201).json((rows as any[])[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

// 목표 수정
export const updateGoal = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const goalId = req.params.id;
    const { 
      title, completed, progress, difficulty, powderReward, dueDate,
      schedule_type, schedule_days, daily_powder_reward
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (title !== undefined) { fields.push("title = ?"); values.push(title); }
    if (completed !== undefined) { fields.push("completed = ?"); values.push(completed ? 1 : 0); }
    if (progress !== undefined) { fields.push("progress = ?"); values.push(progress); }
    if (difficulty !== undefined) { fields.push("difficulty = ?"); values.push(difficulty); }
    if (powderReward !== undefined) { fields.push("powder_reward = ?"); values.push(powderReward); }
    if (dueDate !== undefined) { fields.push("due_date = ?"); values.push(dueDate); }
    
    // ✅ [수정] 수정 시에도 새로운 필드 업데이트 가능하도록 추가
    if (schedule_type !== undefined) { fields.push("schedule_type = ?"); values.push(schedule_type); }
    if (schedule_days !== undefined) { 
        let sDays = schedule_days;
        if (Array.isArray(sDays)) sDays = sDays.join(',');
        fields.push("schedule_days = ?"); 
        values.push(sDays); 
    }
    if (daily_powder_reward !== undefined) { fields.push("daily_powder_reward = ?"); values.push(daily_powder_reward); }

    if (fields.length === 0) {
      return res.status(400).json({ message: "수정할 필드가 없습니다." });
    }

    values.push(goalId, userId);

    const [result] = await pool.query(
      `UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
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
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "인증 필요" });
    }

    const goalId = req.params.id;

    // 외래키 제약조건(ON DELETE CASCADE)이 없다면 daily_tasks 먼저 삭제해야 할 수도 있음
    // 여기서는 goals만 삭제 시도 (DB 설정에 따라 daily_tasks 자동 삭제됨)
    const [result] = await pool.query(
      "DELETE FROM goals WHERE id = ? AND user_id = ?",
      [goalId, userId]
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