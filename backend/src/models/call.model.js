import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "ringing",
        "completed",
        "missed",
        "rejected",
        "no_answer",
      ],
      default: "ringing",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    answeredAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    // History hidden only for the user who deletes it
    hiddenFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);

export default Call;