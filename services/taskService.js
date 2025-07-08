// // services/taskService.js
// const Task = require("../models/Task.js");
// const TaskAssignee = require("../models/TaskAssignee.js");
// const User = require("../models/User.js");
// const logger = require("../utils/logger.js");

// const createTaskFromWhatsApp = async (taskData, phoneNumber) => {
//   try {
//     // Find user by phone number
//     const user = await User.findOne({ phone: phoneNumber });
//     if (!user) {
//       logger.warn(`User not found for phone: ${phoneNumber}`);
//       return null;
//     }

//     const task = new Task({
//       title: taskData.title,
//       description: taskData.description,
//       dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
//       priority: taskData.priority || "medium",
//       createdBy: user._id,
//       project: taskData.project,
//       tags: taskData.tags || [],
//     });

//     await task.save();

//     // Assign users to task if specified
//     if (taskData.assignees && taskData.assignees.length > 0) {
//       const assigneeUsers = await User.find({
//         email: { $in: taskData.assignees },
//       });

//       if (assigneeUsers.length > 0) {
//         const assignments = assigneeUsers.map((assigneeUser) => ({
//           taskId: task._id,
//           userId: assigneeUser._id,
//           assignedBy: user._id,
//         }));

//         await TaskAssignee.insertMany(assignments);
//       }
//     }

//     logger.info(`Task created from WhatsApp: ${task.title}`);
//     return task;
//   } catch (error) {
//     logger.error("Create task from WhatsApp error:", error);
//     throw error;
//   }
// };

// const processUploadedText = async (text, userId) => {
//   try {
//     const AIService = require("./aiService");
//     const parsedData = await AIService.parseUploadedText(text);

//     const results = [];

//     for (const update of parsedData.updates) {
//       if (update.type === "new_task") {
//         // Create new task
//         const task = new Task({
//           title: update.taskTitle,
//           description: update.details,
//           dueDate: update.dueDate ? new Date(update.dueDate) : null,
//           status: update.status || "pending",
//           createdBy: userId,
//         });

//         await task.save();

//         // Assign if specified
//         if (update.assignee) {
//           const assigneeUser = await User.findOne({ email: update.assignee });
//           if (assigneeUser) {
//             await TaskAssignee.create({
//               taskId: task._id,
//               userId: assigneeUser._id,
//               assignedBy: userId,
//             });
//           }
//         }

//         results.push({ type: "created", task });
//       } else if (update.type === "status_update") {
//         // Update existing task
//         const task = await Task.findOne({
//           title: new RegExp(update.taskTitle, "i"),
//         });

//         if (task) {
//           task.status = update.status;
//           await task.save();
//           results.push({ type: "updated", task });
//         }
//       }
//     }

//     return results;
//   } catch (error) {
//     logger.error("Process uploaded text error:", error);
//     throw error;
//   }
// };

// module.exports = {
//   createTaskFromWhatsApp,
//   processUploadedText,
// };

// services/taskService.js
const Task = require("../models/Task");
const TaskAssignee = require("../models/TaskAssignee");
const User = require("../models/User");
const Blocker = require("../models/Blocker");
const TelnyxService = require("./telnyxService");
const logger = require("../utils/logger");

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

        // Send notifications to assignees via WhatsApp
        for (const assigneeUser of assigneeUsers) {
          if (assigneeUser.phone && assigneeUser.phone !== phoneNumber) {
            try {
              await TelnyxService.sendTaskNotification(
                assigneeUser.phone,
                task,
                "created"
              );
            } catch (error) {
              logger.error(
                `Failed to send notification to ${assigneeUser.phone}:`,
                error
              );
            }
          }
        }
      }
    } else {
      // Auto-assign to creator
      await TaskAssignee.create({
        taskId: task._id,
        userId: user._id,
        assignedBy: user._id,
      });
    }

    logger.info(`Task created from WhatsApp: ${task.title}`);
    return task;
  } catch (error) {
    logger.error("Create task from WhatsApp error:", error);
    throw error;
  }
};

const getUserTasks = async (userId, filters = {}) => {
  try {
    // Get user's assigned tasks
    const userTaskIds = await TaskAssignee.find({ userId })
      .select("taskId")
      .lean();

    const taskIds = userTaskIds.map((ta) => ta.taskId);

    const query = { _id: { $in: taskIds } };

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.project) query.project = new RegExp(filters.project, "i");
    if (filters.title) query.title = new RegExp(filters.title, "i");

    const tasks = await Task.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Get assignees for each task
    const allAssignees = await TaskAssignee.find({ taskId: { $in: taskIds } })
      .populate("userId", "name email phone")
      .lean();

    // Group assignees by task
    const assigneesByTask = {};
    allAssignees.forEach((assignee) => {
      const taskId = assignee.taskId.toString();
      if (!assigneesByTask[taskId]) assigneesByTask[taskId] = [];
      assigneesByTask[taskId].push(assignee.userId);
    });

    // Add assignees to tasks
    tasks.forEach((task) => {
      task.assignees = assigneesByTask[task._id.toString()] || [];
    });

    return tasks;
  } catch (error) {
    logger.error("Get user tasks error:", error);
    throw error;
  }
};

const getTaskWithAssignees = async (taskId) => {
  try {
    const task = await Task.findById(taskId)
      .populate("createdBy", "name email phone")
      .lean();

    if (!task) return null;

    // Get assignees
    const assignees = await TaskAssignee.find({ taskId })
      .populate("userId", "name email phone")
      .lean();

    task.assignees = assignees.map((a) => a.userId);

    return task;
  } catch (error) {
    logger.error("Get task with assignees error:", error);
    throw error;
  }
};

const updateTaskStatus = async (taskId, status, updatedBy) => {
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const oldStatus = task.status;
    task.status = status;

    if (status === "completed") {
      task.actualHours = task.actualHours || 0;
    }

    await task.save();

    // Get assignees for notifications
    const assignees = await TaskAssignee.find({ taskId })
      .populate("userId", "name email phone")
      .lean();

    // Send notifications to assignees (except the updater)
    for (const assignee of assignees) {
      if (
        assignee.userId._id.toString() !== updatedBy.toString() &&
        assignee.userId.phone
      ) {
        try {
          await TelnyxService.sendTaskNotification(
            assignee.userId.phone,
            task,
            "updated"
          );
        } catch (error) {
          logger.error(
            `Failed to send status update notification to ${assignee.userId.phone}:`,
            error
          );
        }
      }
    }

    // If task completed, send completion notification
    if (status === "completed") {
      const updater = await User.findById(updatedBy).select("name email phone");
      for (const assignee of assignees) {
        if (assignee.userId.phone) {
          try {
            await TelnyxService.sendTaskNotification(
              assignee.userId.phone,
              task,
              "completed"
            );
          } catch (error) {
            logger.error(
              `Failed to send completion notification to ${assignee.userId.phone}:`,
              error
            );
          }
        }
      }
    }

    logger.info(
      `Task ${taskId} status updated from ${oldStatus} to ${status} by ${updatedBy}`
    );
    return task;
  } catch (error) {
    logger.error("Update task status error:", error);
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
          priority: update.priority || "medium",
          createdBy: userId,
          project: update.project,
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

            // Send notification
            if (assigneeUser.phone) {
              try {
                await TelnyxService.sendTaskNotification(
                  assigneeUser.phone,
                  task,
                  "created"
                );
              } catch (error) {
                logger.error(
                  `Failed to send notification to ${assigneeUser.phone}:`,
                  error
                );
              }
            }
          }
        }

        results.push({ type: "created", task });
      } else if (update.type === "status_update") {
        // Update existing task
        const task = await Task.findOne({
          title: new RegExp(update.taskTitle, "i"),
        });

        if (task) {
          const oldStatus = task.status;
          task.status = update.status;
          await task.save();

          // Send notifications
          const assignees = await TaskAssignee.find({ taskId: task._id })
            .populate("userId", "name email phone")
            .lean();

          for (const assignee of assignees) {
            if (assignee.userId.phone) {
              try {
                await TelnyxService.sendTaskNotification(
                  assignee.userId.phone,
                  task,
                  "updated"
                );
              } catch (error) {
                logger.error(`Failed to send update notification:`, error);
              }
            }
          }

          results.push({ type: "updated", task, oldStatus });
        }
      } else if (update.type === "blocker") {
        // Create blocker
        const task = await Task.findOne({
          title: new RegExp(update.taskTitle, "i"),
        });

        if (task) {
          const blocker = new Blocker({
            taskId: task._id,
            reportedBy: userId,
            description: update.blockerReason || update.details,
            type: "other",
            severity: "medium",
          });

          await blocker.save();

          // Update task status to blocked
          task.status = "blocked";
          await task.save();

          // Send notifications
          const assignees = await TaskAssignee.find({ taskId: task._id })
            .populate("userId", "name email phone")
            .lean();

          for (const assignee of assignees) {
            if (assignee.userId.phone) {
              try {
                await TelnyxService.sendTaskNotification(
                  assignee.userId.phone,
                  task,
                  "blocked"
                );
              } catch (error) {
                logger.error(`Failed to send blocker notification:`, error);
              }
            }
          }

          results.push({ type: "blocked", task, blocker });
        }
      } else if (update.type === "deadline_change") {
        // Update task deadline
        const task = await Task.findOne({
          title: new RegExp(update.taskTitle, "i"),
        });

        if (task && update.dueDate) {
          const oldDueDate = task.dueDate;
          task.dueDate = new Date(update.dueDate);
          await task.save();

          results.push({ type: "deadline_updated", task, oldDueDate });
        }
      }
    }

    return results;
  } catch (error) {
    logger.error("Process uploaded text error:", error);
    throw error;
  }
};

const getOverdueTasks = async () => {
  try {
    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed"] },
    })
      .populate("createdBy", "name email")
      .lean();

    // Get assignees for each task
    const taskIds = overdueTasks.map((task) => task._id);
    const assignees = await TaskAssignee.find({ taskId: { $in: taskIds } })
      .populate("userId", "name email phone")
      .lean();

    // Group assignees by task
    const assigneesByTask = {};
    assignees.forEach((assignee) => {
      const taskId = assignee.taskId.toString();
      if (!assigneesByTask[taskId]) assigneesByTask[taskId] = [];
      assigneesByTask[taskId].push(assignee.userId);
    });

    // Add assignees to tasks
    overdueTasks.forEach((task) => {
      task.assignees = assigneesByTask[task._id.toString()] || [];
    });

    return overdueTasks;
  } catch (error) {
    logger.error("Get overdue tasks error:", error);
    throw error;
  }
};

const sendOverdueNotifications = async () => {
  try {
    const overdueTasks = await getOverdueTasks();
    const notifications = [];

    for (const task of overdueTasks) {
      for (const assignee of task.assignees) {
        if (assignee.phone) {
          try {
            await TelnyxService.sendTaskNotification(
              assignee.phone,
              task,
              "overdue"
            );
            notifications.push({
              taskId: task._id,
              phone: assignee.phone,
              status: "sent",
            });
          } catch (error) {
            notifications.push({
              taskId: task._id,
              phone: assignee.phone,
              status: "failed",
              error: error.message,
            });
          }
        }
      }
    }

    logger.info(
      `Sent ${
        notifications.filter((n) => n.status === "sent").length
      } overdue notifications`
    );
    return notifications;
  } catch (error) {
    logger.error("Send overdue notifications error:", error);
    throw error;
  }
};

const getTaskStatistics = async (userId = null) => {
  try {
    let query = {};

    if (userId) {
      const userTaskIds = await TaskAssignee.find({ userId })
        .select("taskId")
        .lean();
      query._id = { $in: userTaskIds.map((ta) => ta.taskId) };
    }

    const [total, pending, inProgress, completed, blocked, overdue] =
      await Promise.all([
        Task.countDocuments(query),
        Task.countDocuments({ ...query, status: "pending" }),
        Task.countDocuments({ ...query, status: "in_progress" }),
        Task.countDocuments({ ...query, status: "completed" }),
        Task.countDocuments({ ...query, status: "blocked" }),
        Task.countDocuments({
          ...query,
          dueDate: { $lt: new Date() },
          status: { $nin: ["completed"] },
        }),
      ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      blocked,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  } catch (error) {
    logger.error("Get task statistics error:", error);
    throw error;
  }
};

const getUpcomingTasks = async (userId, days = 7) => {
  try {
    const userTaskIds = await TaskAssignee.find({ userId })
      .select("taskId")
      .lean();

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const upcomingTasks = await Task.find({
      _id: { $in: userTaskIds.map((ta) => ta.taskId) },
      dueDate: {
        $gte: new Date(),
        $lte: endDate,
      },
      status: { $nin: ["completed"] },
    })
      .populate("createdBy", "name email")
      .sort({ dueDate: 1 })
      .lean();

    return upcomingTasks;
  } catch (error) {
    logger.error("Get upcoming tasks error:", error);
    throw error;
  }
};

module.exports = {
  createTaskFromWhatsApp,
  getUserTasks,
  getTaskWithAssignees,
  updateTaskStatus,
  processUploadedText,
  getOverdueTasks,
  sendOverdueNotifications,
  getTaskStatistics,
  getUpcomingTasks,
};
