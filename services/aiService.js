// // services/aiService.js
// const OpenAI = require("openai");
// const logger = require("../utils/logger.js");

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const parseTaskFromMessage = async (message) => {
//   try {
//     const prompt = `
// Parse the following message and extract task information. Return JSON with the following structure:
// {
//   "title": "task title",
//   "description": "detailed description",
//   "dueDate": "YYYY-MM-DD or null",
//   "priority": "low|medium|high|urgent",
//   "assignees": ["email1", "email2"] or [],
//   "project": "project name or null",
//   "tags": ["tag1", "tag2"] or []
// }

// Message: "${message}"

// If this doesn't look like a task, return null.
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.1,
//       max_tokens: 500,
//     });

//     const content = response.choices[0].message.content.trim();

//     if (content === "null") {
//       return null;
//     }

//     const taskData = JSON.parse(content);
//     logger.info("AI parsed task:", taskData);

//     return taskData;
//   } catch (error) {
//     logger.error("AI parsing error:", error);
//     return null;
//   }
// };

// const parseUploadedText = async (text) => {
//   try {
//     const prompt = `
// Analyze the following text (meeting notes, chat log, etc.) and extract any task updates, new tasks, or status changes.

// Return JSON with this structure:
// {
//   "updates": [
//     {
//       "type": "status_update|new_task|reassign|blocker",
//       "taskTitle": "existing task title or new task title",
//       "details": "specific details about the update",
//       "assignee": "email or null",
//       "status": "pending|in_progress|completed|blocked",
//       "dueDate": "YYYY-MM-DD or null"
//     }
//   ]
// }

// Text: "${text}"

// If no task-related information is found, return {"updates": []}.
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.1,
//       max_tokens: 1000,
//     });

//     const content = response.choices[0].message.content.trim();
//     const parsedData = JSON.parse(content);

//     logger.info("AI parsed upload:", parsedData);

//     return parsedData;
//   } catch (error) {
//     logger.error("AI upload parsing error:", error);
//     return { updates: [] };
//   }
// };

// module.exports = {
//   parseTaskFromMessage,
//   parseUploadedText,
// };

// services/aiService.js
const OpenAI = require("openai");
const TaskService = require("./taskService");
const User = require("../models/User");
const Task = require("../models/Task");
const TaskAssignee = require("../models/TaskAssignee");
const logger = require("../utils/logger");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parseTaskFromMessage = async (message) => {
  try {
    const prompt = `
Parse the following WhatsApp message and extract task information. Return JSON with the following structure:
{
  "title": "task title",
  "description": "detailed description",
  "dueDate": "YYYY-MM-DD or null",
  "priority": "low|medium|high|urgent",
  "assignees": ["email1", "email2"] or [],
  "project": "project name or null",
  "tags": ["tag1", "tag2"] or [],
  "action": "create_task|update_status|query_tasks|help"
}

Message: "${message}"

Common patterns:
- "Create task: [title] by [date], assign to [email], [priority] priority"
- "Update task: [title] to [status]"
- "Show my tasks" or "List tasks"
- "Task status: [title] completed"
- "Help" or "?"

If this doesn't look like a task-related command, return {"action": "help"}.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content.trim();

    let taskData;
    try {
      taskData = JSON.parse(content);
    } catch (parseError) {
      logger.error("AI response parsing error:", parseError);
      return { action: "help" };
    }

    logger.info("AI parsed task:", taskData);

    return taskData;
  } catch (error) {
    logger.error("AI parsing error:", error);
    return { action: "help" };
  }
};

const processTaskQuery = async (query, phoneNumber) => {
  try {
    // Find user by phone number
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return "❌ You're not registered in the system. Please contact your admin to add your phone number to your account.";
    }

    const parsedQuery = await parseTaskFromMessage(query);

    switch (parsedQuery.action) {
      case "create_task":
        if (parsedQuery.title) {
          const task = await TaskService.createTaskFromWhatsApp(
            parsedQuery,
            phoneNumber
          );
          if (task) {
            return `✅ Task created: "${task.title}"\nDue: ${
              task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "Not set"
            }\nPriority: ${task.priority}`;
          }
        }
        return "❌ I couldn't create the task. Please check the format and try again.";

      case "update_status":
        return await handleStatusUpdate(parsedQuery, user);

      case "query_tasks":
        return await handleTaskQuery(user);

      case "help":
      default:
        return getHelpMessage();
    }
  } catch (error) {
    logger.error("Process task query error:", error);
    return "❌ Sorry, I encountered an error processing your request. Please try again.";
  }
};

const handleStatusUpdate = async (parsedQuery, user) => {
  try {
    if (!parsedQuery.title) {
      return "❌ Please specify which task you want to update.";
    }

    // Find the task
    const tasks = await TaskService.getUserTasks(user._id, {
      title: parsedQuery.title,
    });

    if (tasks.length === 0) {
      return `❌ No task found with title "${parsedQuery.title}". Please check the task name.`;
    }

    if (tasks.length > 1) {
      const taskList = tasks
        .map((t, i) => `${i + 1}. ${t.title} (${t.status})`)
        .join("\n");
      return `🤔 Multiple tasks found. Please be more specific:\n\n${taskList}`;
    }

    const task = tasks[0];
    const oldStatus = task.status;

    // Update the task status
    if (parsedQuery.status) {
      await TaskService.updateTaskStatus(
        task._id,
        parsedQuery.status,
        user._id
      );
      return `✅ Task "${task.title}" status updated from "${oldStatus}" to "${parsedQuery.status}"`;
    }

    return `📋 Current status of "${task.title}": ${task.status}`;
  } catch (error) {
    logger.error("Handle status update error:", error);
    return "❌ Error updating task status. Please try again.";
  }
};

const handleTaskQuery = async (user) => {
  try {
    const tasks = await TaskService.getUserTasks(user._id);

    if (tasks.length === 0) {
      return "📋 You have no tasks assigned at the moment.";
    }

    const tasksByStatus = {
      pending: tasks.filter((t) => t.status === "pending"),
      in_progress: tasks.filter((t) => t.status === "in_progress"),
      completed: tasks.filter((t) => t.status === "completed"),
      blocked: tasks.filter((t) => t.status === "blocked"),
    };

    let response = `📋 Your Tasks Summary (Total: ${tasks.length})\n\n`;

    if (tasksByStatus.pending.length > 0) {
      response += `⏳ Pending (${tasksByStatus.pending.length}):\n`;
      response +=
        tasksByStatus.pending
          .slice(0, 3)
          .map(
            (t) =>
              `• ${t.title} ${
                t.dueDate
                  ? `(Due: ${new Date(t.dueDate).toLocaleDateString()})`
                  : ""
              }`
          )
          .join("\n") + "\n\n";
    }

    if (tasksByStatus.in_progress.length > 0) {
      response += `🔄 In Progress (${tasksByStatus.in_progress.length}):\n`;
      response +=
        tasksByStatus.in_progress
          .slice(0, 3)
          .map(
            (t) =>
              `• ${t.title} ${
                t.dueDate
                  ? `(Due: ${new Date(t.dueDate).toLocaleDateString()})`
                  : ""
              }`
          )
          .join("\n") + "\n\n";
    }

    if (tasksByStatus.blocked.length > 0) {
      response += `🚫 Blocked (${tasksByStatus.blocked.length}):\n`;
      response +=
        tasksByStatus.blocked
          .slice(0, 3)
          .map((t) => `• ${t.title}`)
          .join("\n") + "\n\n";
    }

    if (tasksByStatus.completed.length > 0) {
      response += `✅ Recently Completed (${tasksByStatus.completed.length}):\n`;
      response +=
        tasksByStatus.completed
          .slice(0, 2)
          .map((t) => `• ${t.title}`)
          .join("\n") + "\n\n";
    }

    response += `\n💡 Reply with task name for details, or "help" for commands.`;

    return response;
  } catch (error) {
    logger.error("Handle task query error:", error);
    return "❌ Error retrieving your tasks. Please try again.";
  }
};

const getHelpMessage = () => {
  return `🤖 WhatsApp Task Manager Help\n\n📝 Create Tasks:\n"Create task: Review documents by Friday, assign to john@company.com, high priority"\n\n📊 Update Status:\n"Update task: Review documents to completed"\n"Task status: [task name] in progress"\n\n📋 View Tasks:\n"Show my tasks"\n"List pending tasks"\n\n🆘 Get Help:\n"Help" or "?"\n\n💡 Tips:\n• Be specific with task names\n• Use email addresses for assignments\n• Include deadlines when possible\n• Mention priority (low, medium, high, urgent)`;
};

const parseUploadedText = async (text) => {
  try {
    const prompt = `
Analyze the following text (meeting notes, chat log, email, etc.) and extract any task updates, new tasks, status changes, or action items.

Return JSON with this structure:
{
  "updates": [
    {
      "type": "status_update|new_task|reassign|blocker|deadline_change",
      "taskTitle": "existing task title or new task title",
      "details": "specific details about the update",
      "assignee": "email or null",
      "status": "pending|in_progress|completed|blocked",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "low|medium|high|urgent",
      "project": "project name or null",
      "blockerReason": "reason if type is blocker"
    }
  ]
}

Text: "${text}"

Look for:
- Action items and TODO mentions
- Status updates (completed, started, blocked)
- Assignment changes
- Deadline mentions
- Priority indicators
- Project references

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

const generateTaskSummary = async (tasks, period = "week") => {
  try {
    const taskData = tasks.map((task) => ({
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignees: task.assignees?.map((a) => a.name || a.email) || [],
      project: task.project,
    }));

    const prompt = `
Generate a concise ${period}ly task summary report based on the following task data:

${JSON.stringify(taskData, null, 2)}

Create a WhatsApp-friendly summary including:
1. Overall progress overview
2. Key completed items
3. Upcoming deadlines
4. Blocked or overdue items
5. Priority recommendations

Keep it under 500 words and use emojis for readability.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error("Generate task summary error:", error);
    return "❌ Unable to generate task summary at this time.";
  }
};

const suggestTaskOptimization = async (userTasks) => {
  try {
    const taskAnalysis = userTasks.map((task) => ({
      title: task.title,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    }));

    const prompt = `
Analyze the following user task data and provide optimization suggestions:

${JSON.stringify(taskAnalysis, null, 2)}

Provide WhatsApp-friendly suggestions for:
1. Time management improvements
2. Priority adjustments
3. Deadline optimization
4. Productivity patterns

Keep response under 300 words with actionable advice.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 400,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error("Suggest task optimization error:", error);
    return "💡 Unable to generate optimization suggestions at this time.";
  }
};

module.exports = {
  parseTaskFromMessage,
  processTaskQuery,
  parseUploadedText,
  generateTaskSummary,
  suggestTaskOptimization,
};
