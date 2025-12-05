import "dotenv/config";
import pino from "pino";
import { createServer } from "http";
import { Server } from "socket.io";
import { pool } from "./db";
import { v4 as uuidv4 } from "uuid";
import { createApp } from "./app";

const app = createApp();
const log = pino();

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
  });
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") ?? "https://team07.kwweb.org",
    credentials: true,
  },
});



async function upsertParticipant(roomId: string, userId: string, petId: string) {
  if (!roomId || !userId || !petId) return;

  try {
    const [exists]: any = await pool.query(
      "SELECT id FROM chat_participants WHERE room_id = ? AND user_id = ?",
      [roomId, userId]
    );

    if (exists.length > 0) {
      await pool.query(
        "UPDATE chat_participants SET pet_id = ?, joined_at = NOW() WHERE room_id = ? AND user_id = ?",
        [petId, roomId, userId]
      );
    } else {
      const partId = uuidv4();
      await pool.query(
        "INSERT INTO chat_participants (id, room_id, user_id, pet_id, joined_at) VALUES (?, ?, ?, ?, NOW())",
        [partId, roomId, userId, petId]
      );
    }
  } catch (err) {
    console.error("Participant Upsert Error:", err);
  }
}

async function broadcastRoomPets(roomId: string) {
  try {
    const [rows] = await pool.query(
      `SELECT 
         cp.user_id as userId, 
         p.id as petId,
         p.name as petName,
         p.level,
         p.rarity,
         p.stars
       FROM chat_participants cp
       JOIN pets p ON cp.pet_id = p.id
       WHERE cp.room_id = ?`,
      [roomId]
    );

    const participants = rows as any[];

    const roomPets = participants.map((p) => ({
      userId: p.userId,
      pet: {
        id: p.petId,
        name: p.petName,
        level: p.level,
        rarity: p.rarity,
        stars: p.stars ?? 0,
      },
    }));

    io.to(roomId).emit("room_users", roomPets);
    
  } catch (err) {
    console.error("Broadcast Pets Error:", err);
  }
}

io.on("connection", (socket) => {
  
  socket.on("join_room", async (data) => {
    let roomId, user, pet;

    if (typeof data === "string") {
      roomId = data;
    } else {
      roomId = data.roomId;
      user = data.user;
      pet = data.pet;
    }

    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    if (user && pet) {
      await upsertParticipant(roomId, user.id, pet.id);
    }

    await broadcastRoomPets(roomId);
  });

  socket.on("send_message", async (data) => {
    try {
      const { roomId, userId, message, profiles, petId } = data;
      if (petId) {
        await upsertParticipant(roomId, userId, petId);
      }

      const msgId = uuidv4();
      const createdAt = new Date();
      await pool.query(
        `INSERT INTO chat_messages (id, room_id, user_id, message, created_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [msgId, roomId, userId, message, createdAt]
      );

      const messagePayload = {
        id: msgId,
        user_id: userId,
        message: message,
        created_at: createdAt.toISOString(),
        profiles: profiles,
      };

      io.to(roomId).emit("receive_message", messagePayload);

      await broadcastRoomPets(roomId);

    } catch (err) {
      console.error("Socket DB Error:", err);
    }
  });

  socket.on("click_pet", async (data) => {
    const { petId, fromUserId, petName } = data;

    if (!petId || !fromUserId) return;

    try {
      const [rows]: any = await pool.query(
        `SELECT id FROM pet_clicks 
         WHERE pet_id = ? AND clicked_by_user_id = ? 
         AND DATE(click_date) = CURDATE()`,
        [petId, fromUserId]
      );

      if (rows.length > 0) {
        socket.emit("click_response", { 
          success: false, 
          message: "오늘은 이미 이 펫을 쓰다듬었습니다." 
        });
        return;
      }

      const clickId = uuidv4();
      await pool.query(
        `INSERT INTO pet_clicks (id, pet_id, clicked_by_user_id, click_date) 
         VALUES (?, ?, ?, NOW())`,
        [clickId, petId, fromUserId]
      );

      await pool.query(
        `UPDATE pets SET experience = experience + 15 WHERE id = ?`,
        [petId]
      );

      socket.emit("click_response", { 
        success: true, 
        message: `${petName}의 경험치가 15 올랐습니다! ✨` 
      });

    } catch (err) {
      console.error("Pet Click Error:", err);
      socket.emit("click_response", { 
        success: false, 
        message: "오류가 발생했습니다." 
      });
    }
  });
  socket.on("disconnect", () => {
  });
});

const port = process.env.PORT || 4000;

httpServer.listen(port, () => {
  log.info(`API & Socket server started on :${port}`);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Team Caffeine API is running" });
});
