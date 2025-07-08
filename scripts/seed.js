// scripts/seed.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");
const Task = require("../models/Task.js");
const TaskAssignee = require("../models/TaskAssignee.js");
require("dotenv").config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/whatsapp-task-manager"
    );

    // Clear existing data
    await User.deleteMany({});
    await Task.deleteMany({});
    await TaskAssignee.deleteMany({});

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Admin User",
      email: "admin@taskmanager.com",
      phone: "+1234567890",
      password: adminPassword,
      role: "admin",
    });

    // Create team members
    const teamMemberPassword = await bcrypt.hash("password123", 10);
    const teamMembers = await User.insertMany([
      {
        name: "John Doe",
        email: "john@taskmanager.com",
        phone: "+1234567891",
        password: teamMemberPassword,
        role: "team_member",
      },
      {
        name: "Jane Smith",
        email: "jane@taskmanager.com",
        phone: "+1234567892",
        password: teamMemberPassword,
        role: "team_member",
      },
      {
        name: "Mike Johnson",
        email: "mike@taskmanager.com",
        phone: "+1234567893",
        password: teamMemberPassword,
        role: "team_member",
      },
    ]);

    // Create sample tasks
    const tasks = await Task.insertMany([
      {
        title: "Set up development environment",
        description:
          "Install Node.js, MongoDB, and configure the development environment",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "completed",
        priority: "high",
        createdBy: admin._id,
        project: "Setup",
        tags: ["development", "setup"],
      },
      {
        title: "Implement user authentication",
        description:
          "Create JWT-based authentication system with login and registration",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: "in_progress",
        priority: "high",
        createdBy: admin._id,
        project: "Authentication",
        tags: ["backend", "security"],
      },
      {
        title: "Design task management UI",
        description:
          "Create wireframes and mockups for the task management interface",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: "pending",
        priority: "medium",
        createdBy: admin._id,
        project: "Frontend",
        tags: ["design", "ui"],
      },
      {
        title: "WhatsApp integration testing",
        description: "Test WhatsApp webhook integration and message parsing",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: "pending",
        priority: "urgent",
        createdBy: admin._id,
        project: "Integration",
        tags: ["whatsapp", "testing"],
      },
    ]);

    // Assign tasks to team members
    await TaskAssignee.insertMany([
      {
        taskId: tasks[0]._id,
        userId: teamMembers[0]._id,
        assignedBy: admin._id,
      },
      {
        taskId: tasks[1]._id,
        userId: teamMembers[1]._id,
        assignedBy: admin._id,
      },
      {
        taskId: tasks[2]._id,
        userId: teamMembers[2]._id,
        assignedBy: admin._id,
      },
      {
        taskId: tasks[3]._id,
        userId: teamMembers[0]._id,
        assignedBy: admin._id,
      },
    ]);

    console.log("Database seeded successfully!");
    console.log("Admin credentials: admin@taskmanager.com / admin123");
    console.log("Team member credentials: john@taskmanager.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
