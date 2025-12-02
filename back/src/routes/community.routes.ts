import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  getFeed,
  createPost,
  getChallenges,
  createChallenge,
  getComments,
  addComment,
  toggleLike,
  getRankings,
  getMyChallenges,
  getChatMessages
} from "../controllers/community.controller";

// ✅ [수정] 디스크 저장소 설정 (파일을 uploads 폴더에 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // back/uploads 폴더에 저장
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지를 위해 UUID + 확장자 조합 사용
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

const router = Router();

router.get("/feed", getFeed);
router.post("/posts", requireAuth, upload.single('image'), createPost); // ✅ 이미지 업로드 미들웨어

router.get("/posts/:postId/comments", getComments);
router.post("/posts/:postId/comments", requireAuth, addComment);
router.post("/posts/:postId/like", requireAuth, toggleLike);
router.get("/challenges", getChallenges);
router.post("/challenges", requireAuth, createChallenge);
router.get("/rankings", getRankings);
router.get("/my-challenges", requireAuth, getMyChallenges);
router.get("/rooms/:roomId/messages", getChatMessages);
export default router;