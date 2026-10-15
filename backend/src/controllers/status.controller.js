
import mongoose from "mongoose";
import Status from "../models/status.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

const emitStatusUpdate = (statusId) => {
  io.emit("statusUpdated", { statusId: String(statusId) });
};

// Create text or image status
export const createStatus = async (req, res) => {
  try {
    const { type, text, image } = req.body;

    if (type === "text") {
      if (!text || !text.trim()) {
        return res.status(400).json({
          message: "Status text is required",
        });
      }

      if (text.trim().length > 700) {
        return res.status(400).json({
          message: "Status text cannot exceed 700 characters",
        });
      }
    } else if (type === "image") {
      if (
        typeof image !== "string" ||
        !image.startsWith("data:image/")
      ) {
        return res.status(400).json({
          message: "A valid image is required",
        });
      }
    } else {
      return res.status(400).json({
        message: "Status type must be text or image",
      });
    }

    let mediaUrl = "";

    if (type === "image") {
      const upload = await cloudinary.uploader.upload(image, {
        folder: "chatty-statuses",
        resource_type: "image",
      });

      mediaUrl = upload.secure_url;
    }

    const status = await Status.create({
      userId: req.user._id,
      type,
      text: type === "text" ? text.trim() : "",
      mediaUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populatedStatus = await Status.findById(status._id)
      .populate("userId", "fullName profilePic");

    emitStatusUpdate(status._id);

    return res.status(201).json(populatedStatus);
  } catch (error) {
    console.error("createStatus error:", error.message);
    return res.status(500).json({
      message: "Failed to create status",
    });
  }
};

// Get all active statuses
export const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "fullName profilePic")
      .populate("viewers.userId", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic")
      .sort({ createdAt: 1 });


    const result = statuses.map((status) => {
      const item = status.toObject();

      const isOwner =
        String(item.userId?._id) === String(req.user._id);

      item.hasViewed = item.viewers.some(
        (viewer) =>
          String(
            typeof viewer.userId === "object"
              ? viewer.userId?._id
              : viewer.userId
          ) === String(req.user._id)
      );

      // Only the owner can see the complete viewer list.
      if (!isOwner) {
        item.viewers = [];
      }

      return item;
    });


    return res.status(200).json(result);
  } catch (error) {
    console.error("getStatuses error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch statuses",
    });
  }
};

// Mark another user's status as viewed
export const viewStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid status ID" });
    }

    const status = await Status.findOne({
      _id: req.params.id,
      expiresAt: { $gt: new Date() },
    });

    if (!status) {
      return res.status(404).json({ message: "Status not found or expired" });
    }

    if (String(status.userId) === String(req.user._id)) {
      return res.status(200).json({ message: "This is your own status" });
    }

    const alreadyViewed = status.viewers.some(
      (viewer) => String(viewer.userId) === String(req.user._id)
    );

    if (!alreadyViewed) {
      status.viewers.push({
        userId: req.user._id,
        viewedAt: new Date(),
      });

      await status.save();
      emitStatusUpdate(status._id);
    }

    return res.status(200).json({ message: "Status viewed" });
  } catch (error) {
    console.error("viewStatus error:", error.message);
    return res.status(500).json({ message: "Failed to mark status as viewed" });
  }
};

// Add or change the current user's reaction
export const reactToStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid status ID" });
    }

    const status = await Status.findOne({
      _id: req.params.id,
      expiresAt: { $gt: new Date() },
    });

    if (!status) {
      return res.status(404).json({
        message: "Status not found or expired",
      });
    }

    const existingIndex = status.reactions.findIndex(
      (reaction) => String(reaction.userId) === String(req.user._id)
    );

    if (existingIndex !== -1) {
      status.reactions.splice(existingIndex, 1);
    } else {
      status.reactions.push({
        userId: req.user._id,
        emoji: "❤️",
      });
    }

    await status.save();
    emitStatusUpdate(status._id);

    return res.status(200).json({
      message: existingIndex !== -1 ? "Like removed" : "Status liked",
      liked: existingIndex === -1,
    });
  } catch (error) {
    console.error("reactToStatus error:", error.message);
    return res.status(500).json({
      message: "Failed to react to status",
    });
  }
};

// Delete only your own status
export const deleteStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid status ID" });
    }

    const status = await Status.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!status) {
      return res.status(404).json({
        message: "Status not found or you cannot delete this status",
      });
    }

    emitStatusUpdate(status._id);

    return res.status(200).json({ message: "Status deleted" });
  } catch (error) {
    console.error("deleteStatus error:", error.message);
    return res.status(500).json({ message: "Failed to delete status" });
  }
}
