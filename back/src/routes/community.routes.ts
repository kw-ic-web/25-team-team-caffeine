import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getFeed,
  createPost,
  getChallenges,
  createChallenge,
  getComments,
  addComment,
  toggleLike,
  getRankings
} from "../controllers/community.controller";

const router = Router();

// 피드 (게시글)
router.get("/feed", getFeed); 
router.post("/posts", requireAuth, createPost);

// 댓글/좋아요
router.get("/posts/:postId/comments", getComments);
router.post("/posts/:postId/comments", requireAuth, addComment);
router.post("/posts/:postId/like", requireAuth, toggleLike);

// 도전방 (채팅방)
router.get("/challenges", getChallenges);
router.post("/challenges", requireAuth, createChallenge);

// 랭킹
router.get("/rankings", getRankings);

export default router;