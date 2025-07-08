// // routes/whatsapp.js
// const express = require("express");
// const {
//   handleWebhook,
//   verifyWebhook,
// } = require("../controllers/whatsappController.js");

// const router = express.Router();

// router.post("/webhook", handleWebhook);
// router.get("/webhook", verifyWebhook);

// module.exports = router;

// routes/whatsapp.js
const express = require("express");
const {
  handleWebhook,
  handleTaskQuery,
  sendTaskReminder,
  verifyWebhook,
  getWebhookStatus,
} = require("../controllers/whatsappController.js");
const { auth, adminAuth } = require("../middlewares/auth.js");
const TelnyxService = require("../services/telnyxService.js");

const router = express.Router();

// Webhook endpoints (public)
router.post("/webhook", handleWebhook);
router.get("/webhook", verifyWebhook);

// Admin endpoints (protected)
router.get("/status", auth, adminAuth, getWebhookStatus);
router.post("/query", auth, handleTaskQuery);
router.post("/reminder/:taskId", auth, sendTaskReminder);

// Bulk notification endpoints
router.post("/notify/overdue", auth, adminAuth, async (req, res) => {
  try {
    const TaskService = require("../services/taskService.js");
    const notifications = await TaskService.sendOverdueNotifications();

    res.json({
      message: "Overdue notifications sent",
      sent: notifications.filter((n) => n.status === "sent").length,
      failed: notifications.filter((n) => n.status === "failed").length,
      details: notifications,
    });
  } catch (error) {
    logger.error("Send overdue notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notify/upcoming", auth, adminAuth, async (req, res) => {
  try {
    const TaskService = require("../services/taskService.js");
    const { days = 3 } = req.body;

    // Get all users
    const User = require("../models/User.js");
    const users = await User.find({ isActive: true, phone: { $exists: true } });

    const notifications = [];

    for (const user of users) {
      try {
        const upcomingTasks = await TaskService.getUpcomingTasks(
          user._id,
          days
        );

        if (upcomingTasks.length > 0) {
          const message = `⏰ Upcoming Tasks (Next ${days} days):\n\n${upcomingTasks
            .map(
              (task) =>
                `📋 ${task.title}\n📅 Due: ${new Date(
                  task.dueDate
                ).toLocaleDateString()}\n🔥 Priority: ${task.priority}`
            )
            .join("\n\n")}\n\nStay on track! 💪`;

          await TelnyxService.sendWhatsAppMessage(user.phone, message);
          notifications.push({
            userId: user._id,
            phone: user.phone,
            status: "sent",
          });
        }
      } catch (error) {
        notifications.push({
          userId: user._id,
          phone: user.phone,
          status: "failed",
          error: error.message,
        });
      }
    }

    res.json({
      message: "Upcoming task notifications sent",
      sent: notifications.filter((n) => n.status === "sent").length,
      failed: notifications.filter((n) => n.status === "failed").length,
      details: notifications,
    });
  } catch (error) {
    logger.error("Send upcoming notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/broadcast", auth, adminAuth, async (req, res) => {
  try {
    const { message, userIds, roles } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const User = require("../models/User");
    let query = { isActive: true, phone: { $exists: true } };

    if (userIds && userIds.length > 0) {
      query._id = { $in: userIds };
    }

    if (roles && roles.length > 0) {
      query.role = { $in: roles };
    }

    const users = await User.find(query);
    const notifications = [];

    for (const user of users) {
      try {
        await TelnyxService.sendWhatsAppMessage(user.phone, message);
        notifications.push({
          userId: user._id,
          phone: user.phone,
          status: "sent",
        });
      } catch (error) {
        notifications.push({
          userId: user._id,
          phone: user.phone,
          status: "failed",
          error: error.message,
        });
      }
    }

    res.json({
      message: "Broadcast sent",
      sent: notifications.filter((n) => n.status === "sent").length,
      failed: notifications.filter((n) => n.status === "failed").length,
      details: notifications,
    });
  } catch (error) {
    logger.error("Broadcast error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/template", auth, adminAuth, async (req, res) => {
  try {
    const { templateName, recipients, parameters = [] } = req.body;

    if (!templateName || !recipients || recipients.length === 0) {
      return res
        .status(400)
        .json({ error: "Template name and recipients are required" });
    }

    const notifications = [];

    for (const recipient of recipients) {
      try {
        await TelnyxService.sendWhatsAppTemplate(
          recipient,
          templateName,
          parameters
        );
        notifications.push({ phone: recipient, status: "sent" });
      } catch (error) {
        notifications.push({
          phone: recipient,
          status: "failed",
          error: error.message,
        });
      }
    }

    res.json({
      message: "Template messages sent",
      sent: notifications.filter((n) => n.status === "sent").length,
      failed: notifications.filter((n) => n.status === "failed").length,
      details: notifications,
    });
  } catch (error) {
    logger.error("Template send error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Interactive message endpoints
router.post("/interactive/task-actions/:taskId", auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const TaskService = require("../services/taskService");
    const task = await TaskService.getTaskWithAssignees(taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await TelnyxService.sendTaskActionButtons(phone, task);

    res.json({ message: "Interactive message sent" });
  } catch (error) {
    logger.error("Send interactive message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/interactive/task-list", auth, async (req, res) => {
  try {
    const { phone, userId } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const TaskService = require("../services/taskService");
    const tasks = await TaskService.getUserTasks(userId || req.user.userId);

    await TelnyxService.sendTaskListMenu(phone, tasks);

    res.json({ message: "Task list sent" });
  } catch (error) {
    logger.error("Send task list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Analytics endpoint
router.get("/analytics", auth, adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // This would typically query your message logs/analytics
    // For now, return basic webhook status
    const status = await TelnyxService.getWebhookStatus();

    res.json({
      webhook: status,
      period: { startDate, endDate },
      // Add more analytics as needed
      summary: {
        totalUsers: await require("../models/User").countDocuments({
          phone: { $exists: true },
        }),
        activeWebhook: status.configured,
      },
    });
  } catch (error) {
    logger.error("Get analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
