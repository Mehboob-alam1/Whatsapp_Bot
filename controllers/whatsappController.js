// // controllers/whatsappController.js
// const AIService = require("../services/aiService.js");
// const TaskService = require("../services/taskService.js");
// const logger = require("../utils/logger.js");

// const handleWebhook = async (req, res) => {
//   try {
//     const { Body, From, To } = req.body;

//     if (!Body || !From) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     logger.info(`WhatsApp message received from ${From}: ${Body}`);

//     // Process message with AI
//     const taskData = await AIService.parseTaskFromMessage(Body);

//     if (taskData) {
//       // Create task
//       await TaskService.createTaskFromWhatsApp(taskData, From);

//       // Send confirmation (you can implement Twilio response here)
//       logger.info(`Task created from WhatsApp: ${taskData.title}`);
//     }

//     res.status(200).json({ message: "Message processed" });
//   } catch (error) {
//     logger.error("WhatsApp webhook error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const verifyWebhook = (req, res) => {
//   // For Twilio webhook verification
//   res.status(200).send("OK");
// };

// module.exports = { handleWebhook, verifyWebhook };

// controllers/whatsappController.js
const AIService = require("../services/aiService.js");
const TaskService = require("../services/taskService.js");
const TelnyxService = require("../services/telnyxService.js");
const logger = require("../utils/logger.js");

const handleWebhook = async (req, res) => {
  try {
    // Telnyx webhook verification
    if (req.body.data && req.body.data.event_type === "message.received") {
      const message = req.body.data.payload;

      if (!message.text || !message.from) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { text, from, to } = message;

      logger.info(
        `WhatsApp message received from ${from.phone_number}: ${text.body}`
      );

      // Process message with AI
      const taskData = await AIService.parseTaskFromMessage(text.body);

      if (taskData) {
        // Create task
        const task = await TaskService.createTaskFromWhatsApp(
          taskData,
          from.phone_number
        );

        if (task) {
          // Send confirmation via Telnyx
          await TelnyxService.sendWhatsAppMessage(
            from.phone_number,
            `✅ Task created successfully: "${task.title}"\n\nDue: ${
              task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "Not set"
            }\nPriority: ${task.priority}\nStatus: ${task.status}`
          );

          logger.info(`Task created from WhatsApp: ${taskData.title}`);
        } else {
          // Send error message
          await TelnyxService.sendWhatsAppMessage(
            from.phone_number,
            "❌ Sorry, I couldn't create the task. Please make sure you're registered in the system."
          );
        }
      } else {
        // Send help message for unrecognized input
        await TelnyxService.sendWhatsAppMessage(
          from.phone_number,
          `🤖 I didn't understand that as a task. Try formatting like:\n\n"Create task: Review documents by Friday, assign to john@company.com, high priority"\n\nOr try:\n• "Show my tasks"\n• "Task status update: [task name] completed"\n• "Help"`
        );
      }
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    logger.error("WhatsApp webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleTaskQuery = async (req, res) => {
  try {
    const { phone, query } = req.body;

    if (!phone || !query) {
      return res.status(400).json({ error: "Phone and query are required" });
    }

    const response = await AIService.processTaskQuery(query, phone);

    await TelnyxService.sendWhatsAppMessage(phone, response);

    res.json({ message: "Query processed and response sent" });
  } catch (error) {
    logger.error("Task query error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendTaskReminder = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await TaskService.getTaskWithAssignees(taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const reminderMessage = `⏰ Task Reminder\n\n📋 ${task.title}\n📅 Due: ${
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"
    }\n🔥 Priority: ${task.priority}\n📊 Status: ${task.status}\n\n${
      task.description || ""
    }`;

    const notifications = [];

    // Send to all assignees
    for (const assignee of task.assignees) {
      if (assignee.phone) {
        try {
          await TelnyxService.sendWhatsAppMessage(
            assignee.phone,
            reminderMessage
          );
          notifications.push({ user: assignee.email, status: "sent" });
        } catch (error) {
          logger.error(`Failed to send reminder to ${assignee.phone}:`, error);
          notifications.push({
            user: assignee.email,
            status: "failed",
            error: error.message,
          });
        }
      }
    }

    res.json({
      message: "Reminders processed",
      notifications,
      task: task.title,
    });
  } catch (error) {
    logger.error("Send reminder error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const verifyWebhook = (req, res) => {
  // Telnyx webhook verification
  const challenge = req.query.challenge;
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(200).send("OK");
  }
};

const getWebhookStatus = async (req, res) => {
  try {
    const status = await TelnyxService.getWebhookStatus();
    res.json(status);
  } catch (error) {
    logger.error("Get webhook status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  handleWebhook,
  handleTaskQuery,
  sendTaskReminder,
  verifyWebhook,
  getWebhookStatus,
};
