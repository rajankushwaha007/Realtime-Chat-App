import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Call from "../models/call.model.js";

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

  // Notify the other user when typing starts
  socket.on("typing", ({ receiverId } = {}) => {
    if (!receiverId || String(receiverId) === id) return;

    const receiverSockets = getReceiverSocketId(String(receiverId));

    if (receiverSockets) {
      io.to(receiverSockets).emit("userTyping", {
        userId: id,
      });
    }
  });

  // Notify the other user when typing stops
  socket.on("stopTyping", ({ receiverId } = {}) => {
    if (!receiverId || String(receiverId) === id) return;

    const receiverSockets = getReceiverSocketId(String(receiverId));

    if (receiverSockets) {
      io.to(receiverSockets).emit("userStoppedTyping", {
        userId: id,
      });
    }
  });

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

  // Add or update a reaction on a message
  socket.on("messageReaction", async ({ messageId, emoji } = {}) => {
    try {
      if (!messageId || typeof emoji !== "string") return;

      const allowedEmojis = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

      if (!allowedEmojis.includes(emoji)) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      const senderId = String(message.senderId);
      const receiverId = String(message.receiverId);

      // Only participants in this conversation can react
      if (id !== senderId && id !== receiverId) return;

      const existingReaction = message.reactions.find(
        (reaction) => String(reaction.userId) === id
      );

      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          message.reactions = message.reactions.filter(
            (reaction) => String(reaction.userId) !== id
          );
        } else {
          existingReaction.emoji = emoji;
        }
      } else {
        message.reactions.push({ userId: id, emoji });
      }

      await message.save();

      const participantSockets = [
        ...new Set([
          ...(getReceiverSocketId(senderId) || []),
          ...(getReceiverSocketId(receiverId) || []),
        ]),
      ];

      if (participantSockets.length > 0) {
        io.to(participantSockets).emit("messageReactionUpdated", {
          messageId: String(message._id),
          reactions: message.reactions.map((reaction) => ({
            userId: String(reaction.userId),
            emoji: reaction.emoji,
          })),
        });
      }
    } catch (error) {
      console.error("Message reaction error:", error.message);
    }
  });


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

      // Use the same timestamp for the database and real-time event
      const seenAt = new Date();

      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((message) => message._id) },
          receiverId: id,
          status: { $ne: "seen" },
        },
        {
          $set: {
            status: "seen",
            seenAt,
          },
        }
      );

      const senderSockets = getReceiverSocketId(String(senderId));

      if (senderSockets) {
        io.to(senderSockets).emit("messageStatusUpdated", {
          messageIds,
          status: "seen",
          seenAt,
        });
      }
    } catch (error) {
      console.error("Message seen status error:", error.message);
    }
  });

  // ================= CALL SIGNALING =================


  // ================= CALL SIGNALING =================

  // Start an audio or video call and save its history
  socket.on("callUser", async ({ toUserId, offer, callType, callId } = {}) => {
    try {
      if (
        !mongoose.isValidObjectId(id) ||
        !mongoose.isValidObjectId(toUserId) ||
        String(toUserId) === id ||
        !offer ||
        !["audio", "video"].includes(callType) ||
        typeof callId !== "string" ||
        !callId.trim()
      ) {
        return;
      }

      // Create one history record per callId
      const call = await Call.findOneAndUpdate(
        { callId },
        {
          $setOnInsert: {
            callerId: id,
            receiverId: toUserId,
            callType,
            status: "ringing",
            startedAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      // Do not allow a callId to be reused by different users
      if (
        String(call.callerId) !== id ||
        String(call.receiverId) !== String(toUserId) ||
        call.callType !== callType ||
        call.status !== "ringing"
      ) {
        return;
      }

      const receiverSockets = getReceiverSocketId(String(toUserId));

      if (!receiverSockets) {
        await Call.updateOne(
          { _id: call._id, status: "ringing" },
          {
            $set: {
              status: "missed",
              endedAt: new Date(),
              durationSeconds: 0,
            },
          }
        );

        socket.emit("callUnavailable", { callId });
        return;
      }

      const caller = await User.findById(id).select("fullName profilePic");

      io.to(receiverSockets).emit("incomingCall", {
        callId,
        fromUserId: id,
        fromName: caller?.fullName || "Chat user",
        fromProfilePic: caller?.profilePic || "",
        offer,
        callType,
      });
    } catch (error) {
      console.error("Start call error:", error.message);
    }
  });

  // Receiver accepts the call
  socket.on("answerCall", async ({ toUserId, answer, callId } = {}) => {
    try {
      if (
        !mongoose.isValidObjectId(toUserId) ||
        !answer ||
        typeof callId !== "string"
      ) {
        return;
      }

      const receiverSockets = getReceiverSocketId(String(toUserId));
      if (!receiverSockets) return;

      const call = await Call.findOneAndUpdate(
        {
          callId,
          callerId: toUserId,
          receiverId: id,
          status: "ringing",
          answeredAt: null,
        },
        { $set: { answeredAt: new Date() } },
        { new: true }
      );

      if (!call) return;

      io.to(receiverSockets).emit("callAccepted", {
        callId,
        fromUserId: id,
        answer,
      });
    } catch (error) {
      console.error("Answer call error:", error.message);
    }
  });

  // Relay WebRTC ICE candidates
  socket.on("iceCandidate", ({ toUserId, candidate, callId } = {}) => {
    if (
      !toUserId ||
      !candidate ||
      typeof callId !== "string"
    ) {
      return;
    }

    const receiverSockets = getReceiverSocketId(String(toUserId));
    if (!receiverSockets) return;

    io.to(receiverSockets).emit("iceCandidate", {
      callId,
      fromUserId: id,
      candidate,
    });
  });

  // Receiver rejects the incoming call
  socket.on("rejectCall", async ({ toUserId, callId } = {}) => {
    try {
      if (
        !mongoose.isValidObjectId(toUserId) ||
        typeof callId !== "string"
      ) {
        return;
      }

      const call = await Call.findOneAndUpdate(
        {
          callId,
          callerId: toUserId,
          receiverId: id,
          status: "ringing",
          answeredAt: null,
        },
        {
          $set: {
            status: "rejected",
            endedAt: new Date(),
            durationSeconds: 0,
          },
        },
        { new: true }
      );

      if (!call) return;

      const receiverSockets = getReceiverSocketId(String(toUserId));

      if (receiverSockets) {
        io.to(receiverSockets).emit("callRejected", {
          callId,
          fromUserId: id,
        });
      }
    } catch (error) {
      console.error("Reject call error:", error.message);
    }
  });

  // End an active call or cancel a call that was not answered
  socket.on("endCall", async ({ toUserId, callId } = {}) => {
    try {
      if (
        !mongoose.isValidObjectId(toUserId) ||
        typeof callId !== "string"
      ) {
        return;
      }

      const call = await Call.findOne({
        callId,
        $or: [
          { callerId: id, receiverId: toUserId },
          { callerId: toUserId, receiverId: id },
        ],
        endedAt: null,
      });

      if (call) {
        const endedAt = new Date();
        const answeredAt = call.answeredAt;
        const durationSeconds = answeredAt
          ? Math.max(
            0,
            Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000)
          )
          : 0;

        await Call.updateOne(
          { _id: call._id, endedAt: null },
          {
            $set: {
              status: answeredAt ? "completed" : "no_answer",
              endedAt,
              durationSeconds,
            },
          }
        );
      }

      const receiverSockets = getReceiverSocketId(String(toUserId));

      if (receiverSockets) {
        io.to(receiverSockets).emit("callEnded", {
          callId,
          fromUserId: id,
        });
      }
    } catch (error) {
      console.error("End call error:", error.message);
    }
  });

  // ================= END CALL SIGNALING =================
  socket.on("endCall", ({ toUserId, callId } = {}) => {
    if (!toUserId || typeof callId !== "string") return;

    const receiverSockets = getReceiverSocketId(String(toUserId));
    if (!receiverSockets) return;

    io.to(receiverSockets).emit("callEnded", {
      callId,
      fromUserId: id,
    });
  });

  // ================= END CALL SIGNALING =================

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