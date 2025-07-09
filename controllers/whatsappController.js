// controllers/whatsappController.js
const AIService = require("../services/aiService.js");
const TaskService = require("../services/taskService.js");
const logger = require("../utils/logger.js");

const handleWebhook = async (req, res) => {
  try {
    const { Body, From, To } = req.body;

    if (!Body || !From) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    logger.info(`WhatsApp message received from ${From}: ${Body}`);

    // Process message with AI
    const taskData = await AIService.parseTaskFromMessage(Body);

    if (taskData) {
      // Create task
      await TaskService.createTaskFromWhatsApp(taskData, From);

      // Send confirmation (you can implement Twilio response here)
      logger.info(`Task created from WhatsApp: ${taskData.title}`);
    }

    res.status(200).json({ message: "Message processed" });
  } catch (error) {
    logger.error("WhatsApp webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const verifyWebhook = (req, res) => {
  // For Twilio webhook verification
  res.status(200).send("OK");
};

module.exports = { handleWebhook, verifyWebhook };
