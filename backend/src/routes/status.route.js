
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createStatus,
  getStatuses,
  viewStatus,
  reactToStatus,
  deleteStatus,
} from "../controllers/status.controller.js";

const router = express.Router();

router.get("/", protectRoute, getStatuses);
router.post("/", protectRoute, createStatus);
router.post("/:id/view", protectRoute, viewStatus);
router.post("/:id/react", protectRoute, reactToStatus);
router.delete("/:id", protectRoute, deleteStatus);

export default router;
