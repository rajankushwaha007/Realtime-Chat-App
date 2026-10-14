
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getCallHistory,
  deleteCall,
  deleteSelectedCalls,
} from "../controllers/call.controller.js";

const router = express.Router();

// All call-history routes require login
router.get("/", protectRoute, getCallHistory);
router.delete("/selected", protectRoute, deleteSelectedCalls);
router.delete("/:id", protectRoute, deleteCall);

export default router;
