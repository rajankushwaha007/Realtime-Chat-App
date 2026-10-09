
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
generateAIReplies,
generateChatSummary,
} from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/smart-reply", protectRoute, generateAIReplies);
router.post("/summary", protectRoute, generateChatSummary);

export default router;
