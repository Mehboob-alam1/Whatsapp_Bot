// utils/helpers.js
const crypto = require("crypto");

const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString("hex");
};

const formatPhoneNumber = (phone) => {
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }

  return cleaned;
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const calculateTaskProgress = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;

  const completed = tasks.filter((task) => task.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
};

const getTaskStatistics = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
    };
  }

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
  };
};

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

module.exports = {
  generateRandomString,
  formatPhoneNumber,
  isValidEmail,
  calculateTaskProgress,
  getTaskStatistics,
  formatDate,
  addDays,
  isOverdue,
};
