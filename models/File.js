// models/File.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blocker",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ taskId: 1 });
fileSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model("File", fileSchema);
