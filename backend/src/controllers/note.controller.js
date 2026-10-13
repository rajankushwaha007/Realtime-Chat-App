
import mongoose from "mongoose";
import Note from "../models/note.model.js";

// Get all notes of logged-in user
export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      userId: req.user._id,
    }).sort({ updatedAt: -1 });

    return res.status(200).json(notes);
  } catch (error) {
    console.error("Get notes error:", error.message);
    return res.status(500).json({ message: "Failed to fetch notes" });
  }
};

// Create a note
export const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Note title is required" });
    }

    if (
      content !== undefined &&
      typeof content !== "string"
    ) {
      return res.status(400).json({ message: "Invalid note content" });
    }

    const note = await Note.create({
      userId: req.user._id,
      title: title.trim(),
      content: content ?? "",
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error("Create note error:", error.message);
    return res.status(500).json({ message: "Failed to create note" });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }

    if (title === undefined && content === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Note title is required" });
      }
      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string") {
        return res.status(400).json({ message: "Invalid note content" });
      }
      updates.content = content;
    }

    const note = await Note.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    return res.status(200).json(note);
  } catch (error) {
    console.error("Update note error:", error.message);
    return res.status(500).json({ message: "Failed to update note" });
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }

    const note = await Note.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Delete note error:", error.message);
    return res.status(500).json({ message: "Failed to delete note" });
  }
};
