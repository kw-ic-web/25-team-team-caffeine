import "dotenv/config";
import pino from "pino";
import { createServer } from "http"; // ✅ 추가
import { Server } from "socket.io"; // ✅ 추가
import { pool } from "./db"; // ✅ DB 연결 추가
import { v4 as uuidv4 } from "uuid"; // ✅ UUID 추가

import { createApp } from "./app";

const app = createApp();
const log = pino();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") ?? "http://localhost:8080",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const { roomId, userId, message, profiles } = data;
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
        profiles: profiles
      };

      io.to(roomId).emit("receive_message", messagePayload);
      
    } catch (err) {
      console.error("Socket DB Error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

const port = process.env.PORT || 4000;

httpServer.listen(port, () => {
  log.info(`API & Socket server started on :${port}`);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Team Caffeine API is running" });
});
