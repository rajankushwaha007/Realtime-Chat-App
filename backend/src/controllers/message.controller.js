
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({
      _id: { $ne: loggedInUserId },
    })
      .select("-password")
      .lean();

    // Har user ke unread messages count karo
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: loggedInUserId,
          status: { $ne: "seen" },
          deletedFor: { $ne: loggedInUserId },
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Har conversation ka latest message find karo
    const latestMessages = await Message.aggregate([
      {
        $match: {
          deletedFor: { $ne: loggedInUserId },
          $or: [
            { senderId: loggedInUserId },
            { receiverId: loggedInUserId },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          senderId: 1,
          receiverId: 1,
          text: 1,
          image: 1,
          createdAt: 1,
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$otherUserId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
    ]);

    const unreadMap = new Map(
      unreadCounts.map((item) => [
        String(item._id),
        item.count,
      ])
    );

    const latestMap = new Map(
      latestMessages.map((item) => [
        String(item._id),
        item.lastMessage,
      ])
    );

    const enrichedUsers = users.map((user) => {
      const lastMessage = latestMap.get(String(user._id));

      return {
        ...user,
        unreadCount: unreadMap.get(String(user._id)) || 0,
        lastMessage: lastMessage
          ? {
              text: lastMessage.text || "",
              image: lastMessage.image || "",
              createdAt: lastMessage.createdAt,
            }
          : null,
        lastMessageAt: lastMessage?.createdAt || null,
      };
    });

    // Recent conversation first; users without messages go below
    enrichedUsers.sort((a, b) => {
      const timeA = a.lastMessageAt
        ? new Date(a.lastMessageAt).getTime()
        : 0;
      const timeB = b.lastMessageAt
        ? new Date(b.lastMessageAt).getTime()
        : 0;

      return timeB - timeA;
    });

    res.status(200).json(enrichedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};


export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      deletedFor: { $ne: myId },
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        message: "Message text cannot be empty",
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found or you cannot edit it",
      });
    }

    message.text = text.trim();
    message.edited = true;

    await message.save();

    const updatedMessage = message.toObject();

    for (const userIdToNotify of [message.senderId, message.receiverId]) {
      const socketIds = getReceiverSocketId(userIdToNotify);
      if (socketIds) {
        io.to(socketIds).emit("messageEdited", updatedMessage);
      }
    }

    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in editMessage:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found or you cannot delete it",
      });
    }

    const senderId = message.senderId;
    const receiverId = message.receiverId;

    await message.deleteOne();

    const deletedData = { messageId: String(messageId) };

    for (const userIdToNotify of [senderId, receiverId]) {
      const socketIds = getReceiverSocketId(userIdToNotify);
      if (socketIds) {
        io.to(socketIds).emit("messageDeleted", deletedData);
      }
    }

    return res.status(200).json({
      message: "Message deleted successfully",
      messageId: String(messageId),
    });
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessageForMe = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({
      _id: messageId,
      $or: [
        { senderId: userId },
        { receiverId: userId },
      ],
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { deletedFor: userId } }
    );

    return res.status(200).json({
      message: "Message deleted for you",
      messageId: String(messageId),
    });
  } catch (error) {
    console.error("Error in deleteMessageForMe:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};