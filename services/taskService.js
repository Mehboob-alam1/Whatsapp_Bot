// services/taskService.js
const Task = require("../models/Task.js");
const TaskAssignee = require("../models/TaskAssignee.js");
const User = require("../models/User.js");
const logger = require("../utils/logger.js");

const createTaskFromWhatsApp = async (taskData, phoneNumber) => {
  try {
    // Find user by phone number
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      logger.warn(`User not found for phone: ${phoneNumber}`);
      return null;
    }

    const task = new Task({
      title: taskData.title,
      description: taskData.description,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      priority: taskData.priority || "medium",
      createdBy: user._id,
      project: taskData.project,
      tags: taskData.tags || [],
    });

    await task.save();

    // Assign users to task if specified
    if (taskData.assignees && taskData.assignees.length > 0) {
      const assigneeUsers = await User.find({
        email: { $in: taskData.assignees },
      });

      if (assigneeUsers.length > 0) {
        const assignments = assigneeUsers.map((assigneeUser) => ({
          taskId: task._id,
          userId: assigneeUser._id,
          assignedBy: user._id,
        }));

        await TaskAssignee.insertMany(assignments);
      }
    }

    logger.info(`Task created from WhatsApp: ${task.title}`);
    return task;
  } catch (error) {
    logger.error("Create task from WhatsApp error:", error);
    throw error;
  }
};

const processUploadedText = async (text, userId) => {
  try {
    const AIService = require("./aiService");
    const parsedData = await AIService.parseUploadedText(text);

    const results = [];

    for (const update of parsedData.updates) {
      if (update.type === "new_task") {
        // Create new task
        const task = new Task({
          title: update.taskTitle,
          description: update.details,
          dueDate: update.dueDate ? new Date(update.dueDate) : null,
          status: update.status || "pending",
          createdBy: userId,
        });

        await task.save();

        // Assign if specified
        if (update.assignee) {
          const assigneeUser = await User.findOne({ email: update.assignee });
          if (assigneeUser) {
            await TaskAssignee.create({
              taskId: task._id,
              userId: assigneeUser._id,
              assignedBy: userId,
            });
          }
        }

        results.push({ type: "created", task });
      } else if (update.type === "status_update") {
        // Update existing task
        const task = await Task.findOne({
          title: new RegExp(update.taskTitle, "i"),
        });

        if (task) {
          task.status = update.status;
          await task.save();
          results.push({ type: "updated", task });
        }
      }
    }

    return results;
  } catch (error) {
    logger.error("Process uploaded text error:", error);
    throw error;
  }
};

module.exports = {
  createTaskFromWhatsApp,
  processUploadedText,
};
