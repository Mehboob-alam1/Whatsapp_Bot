// routes/tasks.js
const express = require("express");
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getGanttData,
} = require("../controllers/taskController.js");
const { auth } = require("../middlewares/auth.js");
const {
  validateTask,
  validateObjectId,
} = require("../middlewares/validation.js");

const router = express.Router();

router.post("/", auth, validateTask, createTask);
router.get("/", auth, getTasks);
router.get("/gantt", auth, getGanttData);
router.get("/:id", auth, validateObjectId, getTask);
router.put("/:id", auth, validateObjectId, validateTask, updateTask);
router.delete("/:id", auth, validateObjectId, deleteTask);

module.exports = router;
