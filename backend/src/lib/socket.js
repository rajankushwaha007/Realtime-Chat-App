import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

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

// One user can have multiple connected browser windows
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  const sockets = userSocketMap.get(String(userId));
  return sockets?.size ? [...sockets] : null;
}

const getOnlineUserIds = () => [...userSocketMap.keys()];

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  if (!userId) return;

  const id = String(userId);
  let sockets = userSocketMap.get(id);
  const wasOnline = Boolean(sockets?.size);

  if (!sockets) sockets = new Set();
  sockets.add(socket.id);
  userSocketMap.set(id, sockets);

  console.log("A user connected:", socket.id);

  if (!wasOnline) {
    try {
      await User.findByIdAndUpdate(id, { lastSeen: null });
    } catch (error) {
      console.error("Online status error:", error.message);
    }

    io.emit("userStatusUpdated", {
      userId: id,
      isOnline: true,
      lastSeen: null,
    });
  }

  io.emit("getOnlineUsers", getOnlineUserIds());

  // Send current online status and last seen for all users
  try {
    const users = await User.find({}, "_id lastSeen").lean();

    socket.emit(
      "initialUserStatuses",
      users.map((user) => ({
        userId: String(user._id),
        isOnline: userSocketMap.has(String(user._id)),
        lastSeen: user.lastSeen,
      }))
    );
  } catch (error) {
    console.error("Initial user statuses error:", error.message);
  }

  // Message delivered
  socket.on("messageDelivered", async ({ messageId } = {}) => {
    try {
      if (!messageId) return;

      const message = await Message.findById(messageId);

      if (
        !message ||
        String(message.receiverId) !== id
      ) {
        return;
      }

      if (message.status === "sent") {
        const updated = await Message.findOneAndUpdate(
          { _id: messageId, status: "sent" },
          {
            $set: {
              status: "delivered",
              deliveredAt: new Date(),
            },
          },
          { new: true }
        );

        if (updated) message.status = updated.status;
        else {
          const latest = await Message.findById(messageId);
          if (!latest) return;
          message.status = latest.status;
        }
      }

      const senderSockets = getReceiverSocketId(
        String(message.senderId)
      );

      if (senderSockets) {
        io.to(senderSockets).emit("messageStatusUpdated", {
          messageIds: [String(message._id)],
          status: message.status,
        });
      }
    } catch (error) {
      console.error("Message delivery status error:", error.message);
    }
  });

  // Mark messages as seen
  socket.on("markMessagesSeen", async ({ senderId } = {}) => {
    try {
      if (!senderId) return;

      const unreadMessages = await Message.find({
        senderId,
        receiverId: id,
        status: { $ne: "seen" },
      }).select("_id");

      if (unreadMessages.length === 0) return;

      const messageIds = unreadMessages.map((message) =>
        String(message._id)
      );

      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((message) => message._id) },
          receiverId: id,
          status: { $ne: "seen" },
        },
        {
          $set: {
            status: "seen",
            seenAt: new Date(),
          },
        }
      );

      const senderSockets = getReceiverSocketId(String(senderId));

      if (senderSockets) {
        io.to(senderSockets).emit("messageStatusUpdated", {
          messageIds,
          status: "seen",
        });
      }
    } catch (error) {
      console.error("Message seen status error:", error.message);
    }
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected:", socket.id);

    const currentSockets = userSocketMap.get(id);
    if (!currentSockets) return;

    currentSockets.delete(socket.id);

    // Stay online if another window is still connected
    if (currentSockets.size === 0) {
      userSocketMap.delete(id);
      const lastSeen = new Date();

      try {
        await User.findByIdAndUpdate(id, { lastSeen });
      } catch (error) {
        console.error("Last seen update error:", error.message);
      }

      io.emit("userStatusUpdated", {
        userId: id,
        isOnline: false,
        lastSeen,
      });
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { io, app, server };