// utils/scheduler.js
const cron = require("node-cron");
const TaskService = require("../services/taskService.js");
const AIService = require("../services/aiService.js");
const TelnyxService = require("../services/telnyxService.js");
const User = require("../models/User.js");
const logger = require("./logger.js");

class TaskScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    // Send overdue notifications daily at 9 AM
    this.scheduleJob("overdue-notifications", "0 9 * * *", async () => {
      try {
        logger.info("Running overdue notifications job");
        await TaskService.sendOverdueNotifications();
      } catch (error) {
        logger.error("Overdue notifications job failed:", error);
      }
    });

    // Send upcoming task reminders daily at 8 AM
    this.scheduleJob("upcoming-reminders", "0 8 * * *", async () => {
      try {
        logger.info("Running upcoming task reminders job");
        const users = await User.find({
          isActive: true,
          phone: { $exists: true, $ne: null },
        });

        for (const user of users) {
          const upcomingTasks = await TaskService.getUpcomingTasks(user._id, 3);

          if (upcomingTasks.length > 0) {
            const message = `🌅 Good morning! You have ${
              upcomingTasks.length
            } task(s) due in the next 3 days:\n\n${upcomingTasks
              .map(
                (task) =>
                  `📋 ${task.title}\n📅 Due: ${new Date(
                    task.dueDate
                  ).toLocaleDateString()}\n🔥 ${task.priority}`
              )
              .join("\n\n")}\n\nHave a productive day! 💪`;

            await TelnyxService.sendWhatsAppMessage(user.phone, message);
          }
        }
      } catch (error) {
        logger.error("Upcoming reminders job failed:", error);
      }
    });

    // Send weekly task summary on Mondays at 9 AM
    this.scheduleJob("weekly-summary", "0 9 * * MON", async () => {
      try {
        logger.info("Running weekly task summary job");
        const users = await User.find({
          isActive: true,
          phone: { $exists: true, $ne: null },
        });

        for (const user of users) {
          const tasks = await TaskService.getUserTasks(user._id);
          const statistics = await TaskService.getTaskStatistics(user._id);

          if (tasks.length > 0) {
            const summary = await AIService.generateTaskSummary(tasks, "week");
            const statsMessage = `📊 Weekly Stats:\n• Total: ${statistics.total}\n• Completed: ${statistics.completed} (${statistics.completionRate}%)\n• In Progress: ${statistics.inProgress}\n• Pending: ${statistics.pending}\n• Blocked: ${statistics.blocked}\n\n${summary}`;

            await TelnyxService.sendWhatsAppMessage(user.phone, statsMessage);
          }
        }
      } catch (error) {
        logger.error("Weekly summary job failed:", error);
      }
    });

    // Check for blocked tasks every 4 hours
    this.scheduleJob("blocked-tasks-check", "0 */4 * * *", async () => {
      try {
        logger.info("Running blocked tasks check job");
        const Task = require("../models/Task");
        const TaskAssignee = require("../models/TaskAssignee");

        const blockedTasks = await Task.find({ status: "blocked" })
          .populate("createdBy", "name email")
          .lean();

        for (const task of blockedTasks) {
          const assignees = await TaskAssignee.find({ taskId: task._id })
            .populate("userId", "name email phone")
            .lean();

          const blockDuration = Math.floor(
            (new Date() - new Date(task.updatedAt)) / (1000 * 60 * 60 * 24)
          );

          if (blockDuration >= 3) {
            // Blocked for 3+ days
            for (const assignee of assignees) {
              if (assignee.userId.phone) {
                const message = `🚨 Attention Required!\n\n📋 "${task.title}" has been blocked for ${blockDuration} days.\n\nPlease review the blockers and take action to unblock this task.`;
                await TelnyxService.sendWhatsAppMessage(
                  assignee.userId.phone,
                  message
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error("Blocked tasks check job failed:", error);
      }
    });

    // Send end-of-day summary at 6 PM on weekdays
    this.scheduleJob("daily-summary", "0 18 * * MON-FRI", async () => {
      try {
        logger.info("Running daily summary job");
        const users = await User.find({
          isActive: true,
          phone: { $exists: true, $ne: null },
        });

        for (const user of users) {
          const todayTasks = await TaskService.getUserTasks(user._id, {
            updatedAt: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          });

          const completedToday = todayTasks.filter(
            (t) => t.status === "completed"
          ).length;
          const totalActive = todayTasks.filter(
            (t) => t.status !== "completed"
          ).length;

          if (todayTasks.length > 0) {
            const message = `🌅 Daily Summary\n\n✅ Completed today: ${completedToday}\n📋 Active tasks: ${totalActive}\n\n${
              completedToday > 0
                ? "Great progress today! 🎉"
                : "Keep pushing forward! 💪"
            }\n\nSee you tomorrow!`;
            await TelnyxService.sendWhatsAppMessage(user.phone, message);
          }
        }
      } catch (error) {
        logger.error("Daily summary job failed:", error);
      }
    });

    // Performance optimization suggestions monthly
    this.scheduleJob("monthly-optimization", "0 9 1 * *", async () => {
      try {
        logger.info("Running monthly optimization suggestions job");
        const users = await User.find({
          isActive: true,
          phone: { $exists: true, $ne: null },
        });

        for (const user of users) {
          const userTasks = await TaskService.getUserTasks(user._id);
          const suggestions = await AIService.suggestTaskOptimization(
            userTasks
          );

          if (suggestions) {
            const message = `🚀 Monthly Productivity Insights\n\n${suggestions}\n\nKeep optimizing your workflow! 📈`;
            await TelnyxService.sendWhatsAppMessage(user.phone, message);
          }
        }
      } catch (error) {
        logger.error("Monthly optimization job failed:", error);
      }
    });

    this.isInitialized = true;
    logger.info("Task scheduler initialized with all cron jobs");
  }

  scheduleJob(name, schedule, task) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).destroy();
    }

    const job = cron.schedule(schedule, task, {
      scheduled: true,
      timezone: process.env.TIMEZONE || "UTC",
    });

    this.jobs.set(name, job);
    logger.info(`Scheduled job: ${name} with pattern: ${schedule}`);
  }

  stopJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
      logger.info(`Stopped job: ${name}`);
    }
  }

  startJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).start();
      logger.info(`Started job: ${name}`);
    }
  }

  removeJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).destroy();
      this.jobs.delete(name);
      logger.info(`Removed job: ${name}`);
    }
  }

  listJobs() {
    return Array.from(this.jobs.keys());
  }

  getJobStatus(name) {
    const job = this.jobs.get(name);
    return job
      ? {
          name,
          running: job.running || false,
          scheduled: true,
        }
      : null;
  }

  // Manual trigger methods for testing
  async triggerOverdueNotifications() {
    try {
      await TaskService.sendOverdueNotifications();
      return { success: true, message: "Overdue notifications sent" };
    } catch (error) {
      logger.error("Manual overdue notifications failed:", error);
      return { success: false, error: error.message };
    }
  }

  async triggerWeeklySummary(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.phone) {
        throw new Error("User not found or phone not configured");
      }

      const tasks = await TaskService.getUserTasks(userId);
      const summary = await AIService.generateTaskSummary(tasks, "week");

      await TelnyxService.sendWhatsAppMessage(user.phone, summary);
      return { success: true, message: "Weekly summary sent" };
    } catch (error) {
      logger.error("Manual weekly summary failed:", error);
      return { success: false, error: error.message };
    }
  }

  async triggerUpcomingReminders(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.phone) {
        throw new Error("User not found or phone not configured");
      }

      const upcomingTasks = await TaskService.getUpcomingTasks(userId, 7);

      if (upcomingTasks.length > 0) {
        const message = `📅 Upcoming Tasks (Next 7 days):\n\n${upcomingTasks
          .map(
            (task) =>
              `📋 ${task.title}\n📅 Due: ${new Date(
                task.dueDate
              ).toLocaleDateString()}\n🔥 Priority: ${task.priority}`
          )
          .join("\n\n")}`;

        await TelnyxService.sendWhatsAppMessage(user.phone, message);
        return { success: true, message: "Upcoming reminders sent" };
      } else {
        return { success: true, message: "No upcoming tasks found" };
      }
    } catch (error) {
      logger.error("Manual upcoming reminders failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Shutdown method
  shutdown() {
    for (const [name, job] of this.jobs) {
      job.destroy();
      logger.info(`Destroyed job: ${name}`);
    }
    this.jobs.clear();
    this.isInitialized = false;
    logger.info("Task scheduler shut down");
  }
}

const scheduler = new TaskScheduler();

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down scheduler...");
  scheduler.shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down scheduler...");
  scheduler.shutdown();
  process.exit(0);
});

module.exports = scheduler;
