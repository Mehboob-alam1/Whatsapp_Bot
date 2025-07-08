// scripts/test-webhook.js
const axios = require("axios");
require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

// Sample Telnyx webhook payloads for testing
const sampleWebhookPayloads = {
  messageReceived: {
    data: {
      event_type: "message.received",
      id: "test-message-id",
      occurred_at: new Date().toISOString(),
      payload: {
        id: "msg_test_123",
        record_type: "message",
        direction: "inbound",
        from: {
          phone_number: "+1234567890",
          carrier: "Telnyx",
        },
        to: [
          {
            phone_number: "+1987654321",
            carrier: "Telnyx",
          },
        ],
        text: {
          body: "Create task: Review project documentation by Friday, assign to john@example.com, high priority",
        },
        type: "text",
        webhook_url: `${SERVER_URL}/api/whatsapp/webhook`,
        webhook_failover_url: null,
        encoding: "UTF-8",
        parts: 1,
      },
    },
    meta: {
      attempt: 1,
      delivered_to: `${SERVER_URL}/api/whatsapp/webhook`,
    },
  },

  taskStatusUpdate: {
    data: {
      event_type: "message.received",
      id: "test-message-id-2",
      occurred_at: new Date().toISOString(),
      payload: {
        id: "msg_test_124",
        record_type: "message",
        direction: "inbound",
        from: {
          phone_number: "+1234567890",
          carrier: "Telnyx",
        },
        to: [
          {
            phone_number: "+1987654321",
            carrier: "Telnyx",
          },
        ],
        text: {
          body: "Update task: Review project documentation to completed",
        },
        type: "text",
        webhook_url: `${SERVER_URL}/api/whatsapp/webhook`,
        webhook_failover_url: null,
        encoding: "UTF-8",
        parts: 1,
      },
    },
    meta: {
      attempt: 1,
      delivered_to: `${SERVER_URL}/api/whatsapp/webhook`,
    },
  },

  taskQuery: {
    data: {
      event_type: "message.received",
      id: "test-message-id-3",
      occurred_at: new Date().toISOString(),
      payload: {
        id: "msg_test_125",
        record_type: "message",
        direction: "inbound",
        from: {
          phone_number: "+1234567890",
          carrier: "Telnyx",
        },
        to: [
          {
            phone_number: "+1987654321",
            carrier: "Telnyx",
          },
        ],
        text: {
          body: "Show my tasks",
        },
        type: "text",
        webhook_url: `${SERVER_URL}/api/whatsapp/webhook`,
        webhook_failover_url: null,
        encoding: "UTF-8",
        parts: 1,
      },
    },
    meta: {
      attempt: 1,
      delivered_to: `${SERVER_URL}/api/whatsapp/webhook`,
    },
  },

  helpRequest: {
    data: {
      event_type: "message.received",
      id: "test-message-id-4",
      occurred_at: new Date().toISOString(),
      payload: {
        id: "msg_test_126",
        record_type: "message",
        direction: "inbound",
        from: {
          phone_number: "+1234567890",
          carrier: "Telnyx",
        },
        to: [
          {
            phone_number: "+1987654321",
            carrier: "Telnyx",
          },
        ],
        text: {
          body: "help",
        },
        type: "text",
        webhook_url: `${SERVER_URL}/api/whatsapp/webhook`,
        webhook_failover_url: null,
        encoding: "UTF-8",
        parts: 1,
      },
    },
    meta: {
      attempt: 1,
      delivered_to: `${SERVER_URL}/api/whatsapp/webhook`,
    },
  },
};

class WebhookTester {
  constructor() {
    this.baseURL = SERVER_URL;
    this.webhookEndpoint = "/api/whatsapp/webhook";
    this.results = [];
  }

  async testWebhook(name, payload) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log("📤 Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        `${this.baseURL}${this.webhookEndpoint}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Telnyx-Webhooks/1.0",
          },
          timeout: 10000,
        }
      );

      console.log(`✅ Success: ${response.status} ${response.statusText}`);
      console.log("📥 Response:", response.data);

      this.results.push({
        test: name,
        status: "PASS",
        responseCode: response.status,
        response: response.data,
      });
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(
          `📥 Error Response: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
        this.results.push({
          test: name,
          status: "FAIL",
          responseCode: error.response.status,
          error: error.response.data,
        });
      } else {
        console.log(`📥 Network Error: ${error.message}`);
        this.results.push({
          test: name,
          status: "FAIL",
          error: error.message,
        });
      }
    }
  }

  async testServerHealth() {
    console.log("\n🏥 Testing server health...");

    try {
      const response = await axios.get(`${this.baseURL}/health`);
      console.log("✅ Server is healthy:", response.data);
      return true;
    } catch (error) {
      console.log("❌ Server health check failed:", error.message);
      return false;
    }
  }

  async testWebhookVerification() {
    console.log("\n🔐 Testing webhook verification...");

    try {
      const response = await axios.get(
        `${this.baseURL}${this.webhookEndpoint}?challenge=test123`
      );
      console.log("✅ Webhook verification successful:", response.data);
      return true;
    } catch (error) {
      console.log("❌ Webhook verification failed:", error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log("🚀 Starting Telnyx WhatsApp Webhook Tests...");
    console.log(`📍 Server URL: ${this.baseURL}`);

    // Test server health first
    const serverHealthy = await this.testServerHealth();
    if (!serverHealthy) {
      console.log(
        "❌ Server is not responding. Please start the server first."
      );
      return;
    }

    // Test webhook verification
    await this.testWebhookVerification();

    // Run webhook payload tests
    for (const [name, payload] of Object.entries(sampleWebhookPayloads)) {
      await this.testWebhook(name, payload);
      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log("\n📊 Test Summary:");
    console.log("=".repeat(50));

    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(
      `📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`
    );

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((result) => {
          console.log(`  • ${result.test}: ${result.error || "Unknown error"}`);
        });
    }

    console.log("\n💡 Next Steps:");
    if (passed === this.results.length) {
      console.log("  • All tests passed! Your webhook is working correctly.");
      console.log(
        "  • Configure your Telnyx webhook URL to point to your server."
      );
      console.log(
        "  • Update your environment variables with real Telnyx credentials."
      );
    } else {
      console.log("  • Fix the failing tests before deploying to production.");
      console.log(
        "  • Check your server logs for more detailed error information."
      );
      console.log("  • Ensure all required environment variables are set.");
    }
  }

  // Generate a test payload with custom message
  generateTestPayload(message, fromPhone = "+1234567890") {
    return {
      data: {
        event_type: "message.received",
        id: `test-${Date.now()}`,
        occurred_at: new Date().toISOString(),
        payload: {
          id: `msg_test_${Date.now()}`,
          record_type: "message",
          direction: "inbound",
          from: {
            phone_number: fromPhone,
            carrier: "Telnyx",
          },
          to: [
            {
              phone_number: "+1987654321",
              carrier: "Telnyx",
            },
          ],
          text: {
            body: message,
          },
          type: "text",
          webhook_url: `${SERVER_URL}/api/whatsapp/webhook`,
          webhook_failover_url: null,
          encoding: "UTF-8",
          parts: 1,
        },
      },
      meta: {
        attempt: 1,
        delivered_to: `${SERVER_URL}/api/whatsapp/webhook`,
      },
    };
  }

  async testCustomMessage(message, fromPhone) {
    const payload = this.generateTestPayload(message, fromPhone);
    await this.testWebhook(`Custom: "${message}"`, payload);
  }
}

// CLI interface
if (require.main === module) {
  const tester = new WebhookTester();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run all tests
    tester.runAllTests();
  } else if (args[0] === "custom") {
    // Test custom message
    const message = args[1] || "help";
    const phone = args[2] || "+1234567890";

    console.log(`🧪 Testing custom message: "${message}" from ${phone}`);
    tester.testCustomMessage(message, phone);
  } else if (args[0] === "health") {
    // Test server health only
    tester.testServerHealth();
  } else {
    console.log("Usage:");
    console.log("  node test-webhook.js                    # Run all tests");
    console.log(
      '  node test-webhook.js custom "message"   # Test custom message'
    );
    console.log(
      "  node test-webhook.js health             # Test server health"
    );
  }
}

module.exports = WebhookTester;
