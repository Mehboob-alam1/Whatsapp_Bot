const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    members: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "collaborator"],
          default: "collaborator",
        },
      },
    ],
  },
  { timestamps: true }
);

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
