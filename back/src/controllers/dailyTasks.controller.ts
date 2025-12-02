import { Request, Response } from "express";
import { pool } from "../db.js";
import { v4 as uuidv4 } from "uuid";

function generateUUID() {
  if (typeof uuidv4 === 'function') return uuidv4();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type AuthedRequest = Request & { user?: { id: string } };

function isValidDateStr(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function checkIsScheduled(goal: any, ymd: string, dayOfWeek: number): boolean {
  if (goal.due_date) {
    let goalDue = "";
    
    if (typeof goal.due_date === 'string') {
       goalDue = goal.due_date.substring(0, 10);
    } else {
       const utc = goal.due_date.getTime() + (goal.due_date.getTimezoneOffset() * 60000);
       const kstGap = 9 * 60 * 60 * 1000; 
       const kstDate = new Date(utc + kstGap);
       
       const y = kstDate.getFullYear();
       const m = String(kstDate.getMonth() + 1).padStart(2, "0");
       const d = String(kstDate.getDate()).padStart(2, "0");
       goalDue = `${y}-${m}-${d}`;
    }
  
    if (goalDue < ymd) return false; 
  }

  const type = goal.schedule_type || "none";
  if (type === "none" || type === "daily") {
    return true; 
  } 
  
  if (type === "specific_days") {
    let days: number[] = [];
    try {
      if (typeof goal.schedule_days === 'string') {
         const clean = goal.schedule_days.replace(/[\[\]"]/g, ''); 
         if (clean.trim()) days = clean.split(',').map(Number);
      } else if (Array.isArray(goal.schedule_days)) {
         days = goal.schedule_days;
      }
    } catch (e) {}
    return days.includes(dayOfWeek);
  } 
  
  if (type === "final_day_only") {
    if (goal.due_date) {
       let goalDue = "";
       if (typeof goal.due_date === 'string') {
          goalDue = goal.due_date.substring(0, 10);
       } else {
          const utc = goal.due_date.getTime() + (goal.due_date.getTimezoneOffset() * 60000);
          const kstDate = new Date(utc + (9 * 60 * 60 * 1000));
          const y = kstDate.getFullYear();
          const m = String(kstDate.getMonth() + 1).padStart(2, "0");
          const d = String(kstDate.getDate()).padStart(2, "0");
          goalDue = `${y}-${m}-${d}`;
       }
       return goalDue === ymd;
    }
    return false;
  }

  return true;
}

export async function getTodayDailyTasks(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let ymd = req.query.date as string;
    
    if (!ymd || !isValidDateStr(ymd)) {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kstGap = 9 * 60 * 60 * 1000;
      const kstDate = new Date(utc + kstGap);
      const y = kstDate.getFullYear();
      const m = String(kstDate.getMonth() + 1).padStart(2, "0");
      const d = String(kstDate.getDate()).padStart(2, "0");
      ymd = `${y}-${m}-${d}`;
    }

    const startOfDay = `${ymd} 00:00:00`;
    const endOfDay = `${ymd} 23:59:59`;
    const dayOfWeek = new Date(ymd).getDay();

    console.log(`[DailyTask] 조회 - User: ${userId}, Date: ${ymd}`);
    const [goalRows] = await pool.query(
      `SELECT id, title, schedule_type, schedule_days, due_date 
       FROM goals 
       WHERE user_id = ? AND completed = 0`,
      [userId]
    );

    const tasksToCreate: string[] = [];

    for (const g of goalRows as any[]) {
      if (checkIsScheduled(g, ymd, dayOfWeek)) {
        tasksToCreate.push(g.id);
      }
    }
    for (const goalId of tasksToCreate) {
      const [existing] = await pool.query(
        `SELECT id FROM daily_tasks 
         WHERE user_id = ? AND goal_id = ? 
         AND task_date >= ? AND task_date <= ?`,
        [userId, goalId, startOfDay, endOfDay]
      );

      if ((existing as any[]).length === 0) {
        await pool.query(
          `INSERT INTO daily_tasks (id, user_id, goal_id, task_date, completed, failed, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, NOW(), NOW())`,
          [generateUUID(), userId, goalId, ymd] 
        );
      }
    }
    const [rows] = await pool.query(
      `SELECT DISTINCT
        dt.id, dt.goal_id, 
        DATE_FORMAT(dt.task_date, '%Y-%m-%d') as task_date, 
        dt.completed, dt.failed,
        g.title, g.difficulty, g.powder_reward, g.daily_powder_reward, g.total_days, g.completed_days,
        g.schedule_type, g.schedule_days, g.due_date,
        dt.created_at
       FROM daily_tasks dt
       JOIN goals g ON BINARY g.id = BINARY dt.goal_id
       WHERE dt.user_id = ? 
         AND dt.task_date >= ? AND dt.task_date <= ?
       ORDER BY dt.created_at ASC`,
      [userId, startOfDay, endOfDay]
    );

    const validResults = (rows as any[]).filter(r => {
        return checkIsScheduled(r, ymd, dayOfWeek);
    });

    const result = validResults.map((r) => ({
      id: r.id,
      goal_id: r.goal_id,
      task_date: r.task_date,
      completed: !!r.completed,
      failed: !!r.failed,
      goal: {
        id: r.goal_id,
        title: r.title,
        difficulty: r.difficulty,
        daily_powder_reward: 0, 
        powder_reward: r.powder_reward,
        total_days: r.total_days,
        completed_days: r.completed_days,
        due_date: r.due_date
      }
    }));

    res.json(result);

  } catch (err: any) {
    console.error("[DailyTask] Server Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function completeDailyTask(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const taskId = req.params.id;

    const [rows] = await pool.query(
      `SELECT 
          dt.task_date, dt.completed, 
          g.id as goal_id, g.powder_reward, g.total_days, g.completed_days, g.due_date
       FROM daily_tasks dt
       JOIN goals g ON BINARY g.id = BINARY dt.goal_id
       WHERE dt.id = ? AND dt.user_id = ?`,
      [taskId, userId]
    );
    
    if ((rows as any[]).length === 0) return res.status(404).json({ message: "Task not found" });
    const task = (rows as any[])[0];

    if (task.completed) return res.json({ message: "Already completed" });

    await pool.query(
      `UPDATE daily_tasks SET completed = 1, failed = 0 WHERE id = ?`,
      [taskId]
    );

    await pool.query(
        `UPDATE goals SET completed_days = completed_days + 1 WHERE id = ?`,
        [task.goal_id]
    );

    let rewardGiven = 0;
    let isFinalDay = false;

    let taskDateStr = "";
    if (task.task_date instanceof Date) taskDateStr = task.task_date.toISOString().split('T')[0];
    else taskDateStr = String(task.task_date).substring(0, 10);

    let dueDateStr = "";
    if (task.due_date) {
        if (task.due_date instanceof Date) dueDateStr = task.due_date.toISOString().split('T')[0];
        else dueDateStr = String(task.due_date).substring(0, 10);
    }

    if (dueDateStr && taskDateStr >= dueDateStr) {
        isFinalDay = true;
        const finalCompleted = (task.completed_days || 0) + 1;
        const totalDays = task.total_days || 1;
        const progressRate = Math.min(finalCompleted / totalDays, 1);
        
        rewardGiven = Math.floor(task.powder_reward * progressRate);

        if (rewardGiven > 0) {
            await pool.query(
                `INSERT INTO user_powder (id, user_id, amount, created_at, updated_at)
                 VALUES (UUID(), ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE amount = amount + ?`,
                [userId, rewardGiven, rewardGiven]
            );
        }

        await pool.query(`UPDATE goals SET completed = 1 WHERE id = ?`, [task.goal_id]);
    }

    res.json({ 
        message: "ok", 
        reward: rewardGiven, 
        isFinalDay 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function failDailyTask(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const taskId = req.params.id;

    const [rows] = await pool.query(
        `SELECT completed, failed FROM daily_tasks WHERE id = ? AND user_id = ?`,
        [taskId, userId]
    );
    if ((rows as any[]).length === 0) return res.status(404).json({ message: "Task not found" });
    const task = (rows as any[])[0];
    if (task.failed) return res.json({ message: "Already failed" });

    await pool.query(
      `UPDATE daily_tasks SET failed = 1, completed = 0 WHERE id = ?`,
      [taskId]
    );
    res.json({ message: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}