// services/aiService.js
const OpenAI = require("openai");
const logger = require("../utils/logger.js");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parseTaskFromMessage = async (message) => {
  try {
    const prompt = `
Parse the following message and extract task information. Return JSON with the following structure:
{
  "title": "task title",
  "description": "detailed description",
  "dueDate": "YYYY-MM-DD or null",
  "priority": "low|medium|high|urgent",
  "assignees": ["email1", "email2"] or [],
  "project": "project name or null",
  "tags": ["tag1", "tag2"] or []
}

Message: "${message}"

If this doesn't look like a task, return null.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content.trim();

    if (content === "null") {
      return null;
    }

    const taskData = JSON.parse(content);
    logger.info("AI parsed task:", taskData);

    return taskData;
  } catch (error) {
    logger.error("AI parsing error:", error);
    return null;
  }
};

const parseUploadedText = async (text) => {
  try {
    const prompt = `
Analyze the following text (meeting notes, chat log, etc.) and extract any task updates, new tasks, or status changes.

Return JSON with this structure:
{
  "updates": [
    {
      "type": "status_update|new_task|reassign|blocker",
      "taskTitle": "existing task title or new task title",
      "details": "specific details about the update",
      "assignee": "email or null",
      "status": "pending|in_progress|completed|blocked",
      "dueDate": "YYYY-MM-DD or null"
    }
  ]
}

Text: "${text}"

If no task-related information is found, return {"updates": []}.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content.trim();
    const parsedData = JSON.parse(content);

    logger.info("AI parsed upload:", parsedData);

    return parsedData;
  } catch (error) {
    logger.error("AI upload parsing error:", error);
    return { updates: [] };
  }
};

module.exports = {
  parseTaskFromMessage,
  parseUploadedText,
};
