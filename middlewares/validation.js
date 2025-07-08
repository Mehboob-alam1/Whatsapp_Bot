// middlewares/validation.js
const { body, param, query } = require("express-validator");

const validateRegister = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["admin", "team_member"])
    .withMessage("Invalid role"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Valid phone number is required"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const validateTask = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title is required and must be under 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be under 2000 characters"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Valid due date is required"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "completed", "blocked"])
    .withMessage("Invalid status"),
  body("assignees")
    .optional()
    .isArray()
    .withMessage("Assignees must be an array"),
  body("project")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Project name must be under 100 characters"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("estimatedHours")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Estimated hours must be a positive number"),
];

const validateBlocker = [
  body("taskId").isMongoId().withMessage("Valid task ID is required"),
  body("description")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Description is required and must be under 1000 characters"),
  body("type")
    .optional()
    .isIn(["technical", "resource", "dependency", "external", "other"])
    .withMessage("Invalid type"),
  body("severity")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid severity"),
];

const validateDependency = [
  body("taskId").isMongoId().withMessage("Valid task ID is required"),
  body("blockedByTaskId")
    .isMongoId()
    .withMessage("Valid blocked by task ID is required"),
  body("type")
    .optional()
    .isIn([
      "finish_to_start",
      "start_to_start",
      "finish_to_finish",
      "start_to_finish",
    ])
    .withMessage("Invalid dependency type"),
];

const validateObjectId = [
  param("id").isMongoId().withMessage("Valid ID is required"),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateTask,
  validateBlocker,
  validateDependency,
  validateObjectId,
};
