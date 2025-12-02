import "dotenv/config";
import pino from "pino";
import { createServer } from "http";
import { Server } from "socket.io";
import { pool } from "./db";
import { v4 as uuidv4 } from "uuid";
import { createApp } from "./app";

const app = createApp();
const log = pino();

// COOP 헤더 설정 (구글 로그인 등 팝업 오류 방지)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") ?? "http://localhost:5173",
    credentials: true,
  },
  transports: ["websocket"], // 웹소켓 강제 사용
});

// [DB 함수] 참여자 정보 저장/업데이트 (핵심 로직)
async function upsertParticipant(roomId: string, userId: string, petId: string) {
  if (!roomId || !userId || !petId) return;

  try {
    // 1. 이미 이 방에 참여 기록이 있는지 확인
    const [exists]: any = await pool.query(
      "SELECT id FROM chat_participants WHERE room_id = ? AND user_id = ?",
      [roomId, userId]
    );

    if (exists.length > 0) {
      // 2. 있다면 -> 펫 정보 업데이트 (최신 펫으로 교체)
      await pool.query(
        "UPDATE chat_participants SET pet_id = ?, joined_at = NOW() WHERE room_id = ? AND user_id = ?",
        [petId, roomId, userId]
      );
    } else {
      // 3. 없다면 -> 새로 등록
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

// [DB 함수] 방의 모든 펫 목록 조회
async function broadcastRoomPets(roomId: string) {
  try {
    // 방에 참여 중인 유저들의 펫 정보를 싹 긁어옴
    const [rows] = await pool.query(
      `SELECT 
         cp.user_id as userId, 
         p.id as petId,
         p.name as petName,
         p.level,
         p.rarity
       FROM chat_participants cp
       JOIN pets p ON cp.pet_id = p.id
       WHERE cp.room_id = ?`,
      [roomId]
    );

    const participants = rows as any[];

    // 프론트엔드 형식으로 변환
    const roomPets = participants.map((p) => ({
      userId: p.userId,
      pet: {
        id: p.petId,
        name: p.petName,
        level: p.level,
        rarity: p.rarity,
      },
    }));

    // [중요] 방에 있는 모든 사람에게 최신 펫 목록 전송
    io.to(roomId).emit("room_users", roomPets);
    
  } catch (err) {
    console.error("Broadcast Pets Error:", err);
  }
}

io.on("connection", (socket) => {
  
  // 1. 방 입장
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

    // 입장 시에도 DB에 저장 시도
    if (user && pet) {
      await upsertParticipant(roomId, user.id, pet.id);
    }

    // 입장 직후 최신 펫 목록 뿌리기
    await broadcastRoomPets(roomId);
  });

  // 2. 메시지 전송
  socket.on("send_message", async (data) => {
    try {
      // 프론트에서 petId를 꼭 보내줘야 함
      const { roomId, userId, message, profiles, petId } = data;

      // [핵심] 메시지를 보낼 때 DB에 펫 정보를 확실히 박아넣음
      if (petId) {
        await upsertParticipant(roomId, userId, petId);
      }

      // 메시지 저장 (채팅 로그)
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

      // 채팅 메시지 전송
      io.to(roomId).emit("receive_message", messagePayload);

      // [핵심] 채팅을 쳤다는 건 활동 중이라는 뜻이므로, 펫 목록을 최신화해서 다시 쏴줌
      // 이렇게 하면 A가 들어왔을 때 B가 채팅을 치면 B의 펫이 A에게 보임
      await broadcastRoomPets(roomId);

    } catch (err) {
      console.error("Socket DB Error:", err);
    }
  });

  // 3. 펫 클릭 (상호작용)
  socket.on("click_pet", ({ petId, targetUserId }) => {
    // 나중에 클릭 알림 구현 가능
  });

  // 4. 연결 종료
  socket.on("disconnect", () => {
    // 연결이 끊겨도 DB에는 정보가 남아있으므로 펫은 사라지지 않음 (의도된 동작)
  });
});

const port = process.env.PORT || 4000;

httpServer.listen(port, () => {
  log.info(`API & Socket server started on :${port}`);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Team Caffeine API is running" });
});
