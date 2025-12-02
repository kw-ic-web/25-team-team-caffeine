import { Request, Response } from "express";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

type AuthedRequest = Request & { user?: { id: string } };

function generateUUID() {
  if (typeof uuidv4 === 'function') return uuidv4();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const getFeed = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const [posts] = await pool.query(`
      SELECT p.*, u.display_name 
      FROM posts p
      JOIN users u ON BINARY p.user_id = BINARY u.id
      ORDER BY p.created_at DESC
    `);
    const [likes] = await pool.query(`SELECT post_id, COUNT(*) as count FROM post_likes GROUP BY post_id`);
    const [comments] = await pool.query(`SELECT post_id, COUNT(*) as count FROM post_comments GROUP BY post_id`);
    
    let likedPostIds: string[] = [];
    if (userId) {
      const [myLikes] = await pool.query(`SELECT post_id FROM post_likes WHERE user_id = ?`, [userId]);
      likedPostIds = (myLikes as any[]).map((row) => row.post_id);
    }

    const likeCounts: Record<string, number> = {};
    (likes as any[]).forEach((row) => (likeCounts[row.post_id] = row.count));

    const commentCounts: Record<string, number> = {};
    (comments as any[]).forEach((row) => (commentCounts[row.post_id] = row.count));

    res.json({
      posts,
      likeCounts,
      commentCounts,
      likedPostIds,
    });
  } catch (err: any) {
    console.error("[Community] Feed Error:", err.message);
    if(err.sql) console.error("[SQL]:", err.sql);
    res.status(500).json({ message: "Server error" });
  }
};

export const createPost = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { content } = req.body; 
    let imageUrl = null;
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const id = generateUUID();

    await pool.query(
      `INSERT INTO posts (id, user_id, content, image_url, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id, userId, content, imageUrl]
    );

    const [rows] = await pool.query(`
        SELECT p.*, u.display_name 
        FROM posts p 
        JOIN users u ON BINARY p.user_id = BINARY u.id 
        WHERE p.id = ?`, 
        [id]
    );
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getChallenges = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, 
        name as title, 
        category, 
        deadline, 
        created_at 
      FROM chat_rooms 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err: any) {
    console.error("[Community] Challenge Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
export const createChallenge = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { title, category, deadline } = req.body;
    const id = generateUUID();
    const challengeId = generateUUID(); 

    await pool.query(
      `INSERT INTO chat_rooms (id, name, category, deadline, challenge_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, title, category, deadline || null, challengeId]
    );

    await pool.query(
      `INSERT INTO chat_participants (id, room_id, user_id, joined_at)
       VALUES (?, ?, ?, NOW())`,
      [generateUUID(), id, userId]
    );

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const [rows] = await pool.query(
      `SELECT c.*, u.display_name 
       FROM post_comments c
       JOIN users u ON BINARY c.user_id = BINARY u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addComment = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { postId } = req.params;
    const { content } = req.body;
    const id = generateUUID();

    await pool.query(
      `INSERT INTO post_comments (id, post_id, user_id, content, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id, postId, userId, content]
    );

    const [rows] = await pool.query(
      `SELECT c.*, u.display_name 
       FROM post_comments c
       JOIN users u ON BINARY c.user_id = BINARY u.id
       WHERE c.id = ?`,
      [id]
    );

    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleLike = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { postId } = req.params;

    const [existing] = await pool.query(
      `SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?`,
      [postId, userId]
    );

    let liked = false;
    if ((existing as any[]).length > 0) {
      await pool.query(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
      liked = false;
    } else {
      await pool.query(
          `INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, NOW())`, 
          [generateUUID(), postId, userId]
      );
      liked = true;
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?`,
      [postId]
    );
    const likeCount = (countResult as any[])[0].count;

    res.json({ liked, likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRankings = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id as user_id,
        u.display_name,
        COALESCE(up.amount, 0) as total_exp,
        RANK() OVER (ORDER BY COALESCE(up.amount, 0) DESC) as ranking
      FROM users u
      LEFT JOIN user_powder up ON BINARY u.id = BINARY up.user_id
      ORDER BY total_exp DESC
      LIMIT 10
    `);

    const result = (rows as any[]).map(row => ({
        user_id: row.user_id,
        display_name: row.display_name || "모험가",
        total_exp: Number(row.total_exp),
        rank: Number(row.ranking),
        reward_garu: 0, 
        daily_exp: [0, 0, 0, 0, 0, 0, 0] 
    }));

    res.json(result);
  } catch (err: any) {
    console.error("[Community] Ranking Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyChallenges = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const [rows] = await pool.query(`
      SELECT 
        r.id, 
        r.name as title, 
        r.deadline,
        (SELECT COUNT(*) FROM chat_participants WHERE room_id = r.id) as memberCount
      FROM chat_rooms r
      JOIN chat_participants p ON r.id = p.room_id
      WHERE p.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    const result = (rows as any[]).map((row) => {
        let daysLeft = 0;
        if (row.deadline) {
            const now = new Date();
            const end = new Date(row.deadline);
            const diff = end.getTime() - now.getTime();
            daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
        return {
            id: row.id,
            title: row.title,
            daysLeft,
            memberCount: row.memberCount
        };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    console.log(`[Chat] Loading messages for Room ID: ${roomId}`);
    
    const [rows] = await pool.query(`
      SELECT 
        m.id, 
        m.user_id, 
        m.message, 
        m.created_at,
        u.display_name
      FROM chat_messages m
      JOIN users u ON BINARY m.user_id = BINARY u.id  -- ✅ [핵심 수정] BINARY 추가
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
    `, [roomId]);

    const result = (rows as any[]).map(row => ({
        id: row.id,
        user_id: row.user_id,
        message: row.message,
        created_at: row.created_at,
        profiles: {
            display_name: row.display_name || "알 수 없음"
        }
    }));

    res.json(result);
  } catch (err: any) {
    console.error("[Chat] Load Error:", err.message);
    if (err.sql) console.error("[SQL]:", err.sql);
    res.status(500).json({ message: "Server error" });
  }
};