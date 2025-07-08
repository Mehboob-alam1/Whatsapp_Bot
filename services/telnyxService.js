// services/telnyxService.js
const axios = require("axios");
const logger = require("../utils/logger");

class TelnyxService {
  constructor() {
    this.apiKey = process.env.TELNYX_API_KEY;
    this.whatsappProfileId = process.env.TELNYX_WHATSAPP_PROFILE_ID;
    this.baseURL = "https://api.telnyx.com/v2";

    if (!this.apiKey) {
      logger.warn("Telnyx API key not configured");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async sendWhatsAppMessage(to, text, options = {}) {
    try {
      if (!this.apiKey || !this.whatsappProfileId) {
        logger.warn("Telnyx not configured, skipping message send");
        return null;
      }

      // Ensure phone number is in correct format
      const phoneNumber = this.formatPhoneNumber(to);

      const payload = {
        from: this.whatsappProfileId,
        to: phoneNumber,
        text: text,
        type: "text",
        ...options,
      };

      const response = await this.client.post("/messages", payload);

      logger.info(
        `WhatsApp message sent to ${phoneNumber}: ${text.substring(0, 50)}...`
      );

      return response.data;
    } catch (error) {
      logger.error(
        "Telnyx send message error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async sendWhatsAppTemplate(
    to,
    templateName,
    parameters = [],
    language = "en"
  ) {
    try {
      if (!this.apiKey || !this.whatsappProfileId) {
        logger.warn("Telnyx not configured, skipping template send");
        return null;
      }

      const phoneNumber = this.formatPhoneNumber(to);

      const payload = {
        from: this.whatsappProfileId,
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: language,
          },
          components:
            parameters.length > 0
              ? [
                  {
                    type: "body",
                    parameters: parameters.map((param) => ({
                      type: "text",
                      text: param,
                    })),
                  },
                ]
              : [],
        },
      };

      const response = await this.client.post("/messages", payload);

      logger.info(`WhatsApp template sent to ${phoneNumber}: ${templateName}`);

      return response.data;
    } catch (error) {
      logger.error(
        "Telnyx send template error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async sendTaskNotification(to, task, type = "created") {
    const messages = {
      created: `🆕 New Task Created\n\n📋 ${task.title}\n📅 Due: ${
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"
      }\n🔥 Priority: ${task.priority}\n\n${task.description || ""}`,

      updated: `📝 Task Updated\n\n📋 ${task.title}\n📊 Status: ${
        task.status
      }\n🔥 Priority: ${task.priority}\n📅 Due: ${
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"
      }`,

      completed: `✅ Task Completed\n\n📋 ${task.title}\n🎉 Great work! This task has been marked as completed.`,

      overdue: `⚠️ Task Overdue\n\n📋 ${task.title}\n📅 Was due: ${
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Unknown"
      }\n🔥 Priority: ${
        task.priority
      }\n\nPlease update the status or extend the deadline.`,

      blocked: `🚫 Task Blocked\n\n📋 ${task.title}\n❌ This task is currently blocked and needs attention.\n\nPlease check the blocker details in the system.`,
    };

    const message = messages[type] || messages.created;
    return await this.sendWhatsAppMessage(to, message);
  }

  async sendBulkTaskReminders(tasks) {
    const results = [];

    for (const task of tasks) {
      for (const assignee of task.assignees) {
        if (assignee.phone) {
          try {
            await this.sendTaskNotification(assignee.phone, task, "reminder");
            results.push({
              taskId: task._id,
              phone: assignee.phone,
              status: "sent",
            });
          } catch (error) {
            results.push({
              taskId: task._id,
              phone: assignee.phone,
              status: "failed",
              error: error.message,
            });
          }
        }
      }
    }

    return results;
  }

  async getMessageStatus(messageId) {
    try {
      const response = await this.client.get(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      logger.error(
        "Get message status error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getWebhookStatus() {
    try {
      const response = await this.client.get("/messaging_profiles");
      const profile = response.data.data.find(
        (p) => p.id === this.whatsappProfileId
      );

      return {
        configured: !!this.apiKey && !!this.whatsappProfileId,
        profileId: this.whatsappProfileId,
        profileName: profile?.name || "Unknown",
        webhookUrl: profile?.webhook_url || null,
        status: profile?.enabled ? "active" : "inactive",
      };
    } catch (error) {
      logger.error(
        "Get webhook status error:",
        error.response?.data || error.message
      );
      return {
        configured: false,
        error: error.message,
      };
    }
  }

  formatPhoneNumber(phone) {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "");

    // Ensure it starts with +
    if (!cleaned.startsWith("+")) {
      cleaned = `+${cleaned}`;
    }

    return cleaned;
  }

  async validateWebhookSignature(payload, signature) {
    // Implement Telnyx webhook signature validation
    // This is important for security in production
    const crypto = require("crypto");

    if (!process.env.TELNYX_WEBHOOK_SECRET) {
      logger.warn("Telnyx webhook secret not configured");
      return true; // Skip validation if secret not set
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.TELNYX_WEBHOOK_SECRET)
      .update(payload, "utf8")
      .digest("hex");

    return signature === expectedSignature;
  }

  async sendInteractiveMessage(to, options) {
    try {
      const phoneNumber = this.formatPhoneNumber(to);

      const payload = {
        from: this.whatsappProfileId,
        to: phoneNumber,
        type: "interactive",
        interactive: options,
      };

      const response = await this.client.post("/messages", payload);

      logger.info(`Interactive WhatsApp message sent to ${phoneNumber}`);

      return response.data;
    } catch (error) {
      logger.error(
        "Telnyx send interactive message error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async sendTaskActionButtons(to, task) {
    const interactiveMessage = {
      type: "button",
      body: {
        text: `📋 ${task.title}\n\n📊 Current Status: ${task.status}\n🔥 Priority: ${task.priority}\n\nChoose an action:`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `start_task_${task._id}`,
              title: "▶️ Start Task",
            },
          },
          {
            type: "reply",
            reply: {
              id: `complete_task_${task._id}`,
              title: "✅ Complete",
            },
          },
          {
            type: "reply",
            reply: {
              id: `block_task_${task._id}`,
              title: "🚫 Report Block",
            },
          },
        ],
      },
    };

    return await this.sendInteractiveMessage(to, interactiveMessage);
  }

  async sendTaskListMenu(to, tasks) {
    if (tasks.length === 0) {
      return await this.sendWhatsAppMessage(
        to,
        "📋 You have no tasks assigned at the moment."
      );
    }

    if (tasks.length <= 10) {
      // Send as buttons for small lists
      const buttons = tasks.slice(0, 3).map((task, index) => ({
        type: "reply",
        reply: {
          id: `view_task_${task._id}`,
          title: `${index + 1}. ${task.title.substring(0, 20)}`,
        },
      }));

      const interactiveMessage = {
        type: "button",
        body: {
          text: `📋 Your Tasks (${tasks.length}):\n\n${tasks
            .map((task, i) => `${i + 1}. ${task.title} (${task.status})`)
            .join("\n")}`,
        },
        action: { buttons },
      };

      return await this.sendInteractiveMessage(to, interactiveMessage);
    } else {
      // Send as text for larger lists
      const taskList = tasks
        .map(
          (task, i) =>
            `${i + 1}. ${task.title} (${task.status}) - ${task.priority}`
        )
        .join("\n");

      return await this.sendWhatsAppMessage(
        to,
        `📋 Your Tasks (${tasks.length}):\n\n${taskList}\n\nReply with task number for details.`
      );
    }
  }
}

module.exports = new TelnyxService();
