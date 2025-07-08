// controllers/taskController.js
const Task = require("../models/Task.js");
const TaskAssignee = require("../models/TaskAssignee.js");
const User = require("../models/User.js");
const Blocker = require("../models/Blocker.js");
const Dependency = require("../models/Dependency.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      dueDate,
      priority,
      assignees,
      project,
      tags,
      estimatedHours,
    } = req.body;

    const task = new Task({
      title,
      description,
      dueDate,
      priority,
      createdBy: req.user.userId,
      project,
      tags,
      estimatedHours,
    });

    await task.save();

    // Assign users to task
    if (assignees && assignees.length > 0) {
      const assignments = assignees.map((userId) => ({
        taskId: task._id,
        userId,
        assignedBy: req.user.userId,
      }));

      await TaskAssignee.insertMany(assignments);
    }

    const populatedTask = await Task.findById(task._id)
      .populate("createdBy", "name email")
      .lean();

    // Get assignees
    const taskAssignees = await TaskAssignee.find({ taskId: task._id })
      .populate("userId", "name email")
      .lean();

    populatedTask.assignees = taskAssignees.map((ta) => ta.userId);

    logger.info(`Task created: ${task.title} by ${req.user.userId}`);

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    logger.error("Create task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignee,
      project,
      page = 1,
      limit = 50,
    } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = new RegExp(project, "i");

    let taskQuery = Task.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    let tasks = await taskQuery.lean();

    // If assignee filter is provided, filter by assignee
    if (assignee) {
      const assigneeTaskIds = await TaskAssignee.find({ userId: assignee })
        .select("taskId")
        .lean();

      const assigneeTaskIdSet = new Set(
        assigneeTaskIds.map((ta) => ta.taskId.toString())
      );
      tasks = tasks.filter((task) =>
        assigneeTaskIdSet.has(task._id.toString())
      );
    }

    // If user is not admin, only show their assigned tasks
    if (req.user.role !== "admin") {
      const userTaskIds = await TaskAssignee.find({ userId: req.user.userId })
        .select("taskId")
        .lean();

      const userTaskIdSet = new Set(
        userTaskIds.map((ta) => ta.taskId.toString())
      );
      tasks = tasks.filter((task) => userTaskIdSet.has(task._id.toString()));
    }

    // Get assignees for each task
    const taskIds = tasks.map((task) => task._id);
    const assignees = await TaskAssignee.find({ taskId: { $in: taskIds } })
      .populate("userId", "name email")
      .lean();

    // Group assignees by task
    const assigneesByTask = {};
    assignees.forEach((assignee) => {
      const taskId = assignee.taskId.toString();
      if (!assigneesByTask[taskId]) assigneesByTask[taskId] = [];
      assigneesByTask[taskId].push(assignee.userId);
    });

    // Add assignees to tasks
    tasks.forEach((task) => {
      task.assignees = assigneesByTask[task._id.toString()] || [];
    });

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Get assignees
    const assignees = await TaskAssignee.find({ taskId: id })
      .populate("userId", "name email")
      .lean();

    // Get blockers
    const blockers = await Blocker.find({ taskId: id })
      .populate("reportedBy", "name email")
      .populate("resolvedBy", "name email")
      .lean();

    // Get dependencies
    const dependencies = await Dependency.find({ taskId: id })
      .populate("blockedByTaskId", "title status")
      .populate("createdBy", "name email")
      .lean();

    task.assignees = assignees.map((a) => a.userId);
    task.blockers = blockers;
    task.dependencies = dependencies;

    res.json({ task });
  } catch (error) {
    logger.error("Get task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if user has permission to update
    if (
      req.user.role !== "admin" &&
      task.createdBy.toString() !== req.user.userId
    ) {
      // Check if user is assigned to this task
      const isAssigned = await TaskAssignee.findOne({
        taskId: id,
        userId: req.user.userId,
      });

      if (!isAssigned) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this task" });
      }
    }

    // Update task
    Object.assign(task, updates);
    await task.save();

    // Update assignees if provided
    if (updates.assignees) {
      await TaskAssignee.deleteMany({ taskId: id });

      if (updates.assignees.length > 0) {
        const assignments = updates.assignees.map((userId) => ({
          taskId: id,
          userId,
          assignedBy: req.user.userId,
        }));

        await TaskAssignee.insertMany(assignments);
      }
    }

    logger.info(`Task updated: ${task.title} by ${req.user.userId}`);

    res.json({ message: "Task updated successfully", task });
  } catch (error) {
    logger.error("Update task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check permission
    if (
      req.user.role !== "admin" &&
      task.createdBy.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this task" });
    }

    // Delete related data
    await TaskAssignee.deleteMany({ taskId: id });
    await Blocker.deleteMany({ taskId: id });
    await Dependency.deleteMany({
      $or: [{ taskId: id }, { blockedByTaskId: id }],
    });

    await Task.findByIdAndDelete(id);

    logger.info(`Task deleted: ${task.title} by ${req.user.userId}`);

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    logger.error("Delete task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getGanttData = async (req, res) => {
  try {
    const { project } = req.query;

    const filter = {};
    if (project) filter.project = new RegExp(project, "i");

    const tasks = await Task.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Get assignees for each task
    const taskIds = tasks.map((task) => task._id);
    const assignees = await TaskAssignee.find({ taskId: { $in: taskIds } })
      .populate("userId", "name email")
      .lean();

    // Get dependencies
    const dependencies = await Dependency.find({ taskId: { $in: taskIds } })
      .populate("blockedByTaskId", "title")
      .lean();

    // Group data by task
    const assigneesByTask = {};
    assignees.forEach((assignee) => {
      const taskId = assignee.taskId.toString();
      if (!assigneesByTask[taskId]) assigneesByTask[taskId] = [];
      assigneesByTask[taskId].push(assignee.userId);
    });

    const dependenciesByTask = {};
    dependencies.forEach((dep) => {
      const taskId = dep.taskId.toString();
      if (!dependenciesByTask[taskId]) dependenciesByTask[taskId] = [];
      dependenciesByTask[taskId].push(dep.blockedByTaskId);
    });

    // Format for Gantt view
    const ganttData = tasks.map((task) => ({
      id: task._id,
      title: task.title,
      assignees: assigneesByTask[task._id.toString()] || [],
      dueDate: task.dueDate,
      dependencies: dependenciesByTask[task._id.toString()] || [],
      status: task.status,
      priority: task.priority,
      project: task.project,
    }));

    res.json({ ganttData });
  } catch (error) {
    logger.error("Get Gantt data error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getGanttData,
};
