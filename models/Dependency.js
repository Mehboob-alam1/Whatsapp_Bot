// models/Dependency.js
const mongoose = require("mongoose");

const dependencySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    blockedByTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "finish_to_start",
        "start_to_start",
        "finish_to_finish",
        "start_to_finish",
      ],
      default: "finish_to_start",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

dependencySchema.index({ taskId: 1, blockedByTaskId: 1 }, { unique: true });

module.exports = mongoose.model("Dependency", dependencySchema);
