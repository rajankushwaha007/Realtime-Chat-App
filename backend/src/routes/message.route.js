
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
    getMessages,
    getUsersForSidebar,
    sendMessage,
    editMessage,
    deleteMessage,
    deleteMessageForMe,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

// Edit a message
router.patch("/edit/:id", protectRoute, editMessage);

// Delete a message
router.delete("/delete/:id", protectRoute, deleteMessage);

// Delete only for me
router.patch("/delete-for-me/:id", protectRoute, deleteMessageForMe)

export default router;
