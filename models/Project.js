const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectTitle: {
    type: String,
    required: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["in_progress", "done", "at_risk", "blocked", "on_track"],
    default: "in_progress",
  },
  dueOn: {
    type: Date,
  },
  tasks: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Task",
    default: [],
  },
});

const model = mongoose.model("Project", projectSchema);

module.exports = model;
