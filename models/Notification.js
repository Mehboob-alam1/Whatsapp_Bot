const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    type: {
      type: String,
      enum: [
        "invitation_sent",
        "invitation_accepted",
        "invitation_rejected",
        "team_update",
        "comment",
        "task_assigned",
        "custom",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String, // e.g. "/teams/:id", "/tasks/:id"
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
