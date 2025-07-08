// utils/constants.js
const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  BLOCKED: "blocked",
};

const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

const USER_ROLES = {
  ADMIN: "admin",
  TEAM_MEMBER: "team_member",
};

const BLOCKER_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
};

const BLOCKER_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

const BLOCKER_TYPE = {
  TECHNICAL: "technical",
  RESOURCE: "resource",
  DEPENDENCY: "dependency",
  EXTERNAL: "external",
  OTHER: "other",
};

const DEPENDENCY_TYPE = {
  FINISH_TO_START: "finish_to_start",
  START_TO_START: "start_to_start",
  FINISH_TO_FINISH: "finish_to_finish",
  START_TO_FINISH: "start_to_finish",
};

module.exports = {
  TASK_STATUS,
  TASK_PRIORITY,
  USER_ROLES,
  BLOCKER_STATUS,
  BLOCKER_SEVERITY,
  BLOCKER_TYPE,
  DEPENDENCY_TYPE,
};
