const express = require("express");
const {
  sendInvitation,
  getInvitationsForTeam,
  deleteInvitation,
  acceptInvitation,
  rejectInvitation,
} = require("../controllers/invitationController.js");

const router = express.Router();

// Send invitation
router.post("/", sendInvitation);

// Get all invitations for a team
router.get("/team/:teamId", getInvitationsForTeam);

// Accept invitation
router.post("/accept/:token", acceptInvitation);

// Reject invitation
router.post("/reject/:token", rejectInvitation);

// Delete invitation
router.delete("/:id", deleteInvitation);

module.exports = router;
