import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://realtime-chat-app-a5t3.onrender.com",
    ],
    credentials: true,
  },
});

const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Receiver confirms that a message reached their device
  socket.on("messageDelivered", async ({ messageId } = {}) => {
    try {
      if (!userId || !messageId) return;

      const message = await Message.findById(messageId);

      // Only the intended receiver can confirm delivery
      if (!message || String(message.receiverId) !== String(userId)) {
        return;
      }

      if (message.status === "sent") {
        message.status = "delivered";
        message.deliveredAt = new Date();
        await message.save();
      }

      const senderSocketId = getReceiverSocketId(
        String(message.senderId)
      );

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageStatusUpdated", {
          messageIds: [String(message._id)],
          status: message.status,
        });
      }
    } catch (error) {
      console.error("Message delivery status error:", error.message);
    }
  });

  // Receiver opens the conversation and marks messages as read
  socket.on("markMessagesSeen", async ({ senderId } = {}) => {
    try {
      if (!userId || !senderId) return;

      const unreadMessages = await Message.find({
        senderId,
        receiverId: userId,
        status: { $ne: "seen" },
      }).select("_id");

      if (unreadMessages.length === 0) return;

      const messageIds = unreadMessages.map((message) =>
        String(message._id)
      );

      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((message) => message._id) },
          receiverId: userId,
        },
        {
          $set: {
            status: "seen",
            seenAt: new Date(),
          },
        }
      );

      const senderSocketId = getReceiverSocketId(String(senderId));

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageStatusUpdated", {
          messageIds,
          status: "seen",
        });
      }
    } catch (error) {
      console.error("Message seen status error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);

    // Don't remove a newer connection for the same user
    if (userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };