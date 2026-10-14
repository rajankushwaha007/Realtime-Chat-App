
import mongoose from "mongoose";
import Call from "../models/call.model.js";

// Get logged-in user's call history
export const getCallHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const calls = await Call.find({
            $or: [{ callerId: userId }, { receiverId: userId }],
            hiddenFor: { $ne: userId },
        })
            .populate("callerId", "fullName profilePic")
            .populate("receiverId", "fullName profilePic")
            .sort({ startedAt: -1 })
            .lean();

        return res.status(200).json(calls);
    } catch (error) {
        console.error("Get call history error:", error.message);
        return res.status(500).json({ message: "Failed to fetch call history" });
    }
};

// Delete one call only from the logged-in user's history
export const deleteCall = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid call ID" });
        }

        const call = await Call.findOneAndUpdate(
            {
                _id: id,
                $or: [{ callerId: userId }, { receiverId: userId }],
                hiddenFor: { $ne: userId },
            },
            { $addToSet: { hiddenFor: userId } },
            { new: true }
        );

        if (!call) {
            return res.status(404).json({ message: "Call not found in your history" });
        }

        return res.status(200).json({ message: "Call removed from your history" });
    } catch (error) {
        console.error("Delete call error:", error.message);
        return res.status(500).json({ message: "Failed to delete call" });
    }
};

// Delete selected calls, or all calls when their IDs are selected
export const deleteSelectedCalls = async (req, res) => {
    try {
        const userId = req.user._id;
        const { callIds } = req.body;

        if (
            !Array.isArray(callIds) ||
            callIds.length === 0 ||
            !callIds.every((id) => mongoose.isValidObjectId(id))
        ) {
            return res.status(400).json({
                message: "Please provide valid call IDs",
            });
        }

        const result = await Call.updateMany(
            {
                _id: { $in: callIds },
                $or: [{ callerId: userId }, { receiverId: userId }],
                hiddenFor: { $ne: userId },
            },
            { $addToSet: { hiddenFor: userId } }
        );

        return res.status(200).json({
            message: "Selected calls removed from your history",
            deletedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Delete selected calls error:", error.message);
        return res.status(500).json({
            message: "Failed to delete selected calls",
        });
    }
};
