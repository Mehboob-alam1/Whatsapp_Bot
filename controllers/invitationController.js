const Invitation = require("../models/Invitation.js");
const crypto = require("crypto");
// Generate a simple token
const generateToken = () => {
  return crypto.randomBytes(24).toString("hex");
};

// Send Invitation (with duplicate check)
const sendInvitation = async (req, res) => {
  const { teamId, email } = req.body;

  try {
    const existing = await Invitation.findOne({
      teamId,
      email,
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({ message: "Invitation already sent" });
    }

    const token = generateToken();

    const invitation = new Invitation({
      teamId,
      email,
      token,
    });

    await invitation.save();

    // In real app, you'd send an email here:
    // sendEmail(email, `You've been invited. Accept here: /accept/${token}`)

    res.status(201).json({ message: "Invitation sent", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all invitations for a team
const getInvitationsForTeam = async (req, res) => {
  const { teamId } = req.params;

  try {
    const invitations = await Invitation.find({ teamId });
    res.status(200).json(invitations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete an invitation
const deleteInvitation = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Invitation.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    res.status(200).json({ message: "Invitation deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Accept invitation
const acceptInvitation = async (req, res) => {
  const { token } = req.params;

  try {
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: "Invalid token" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "Invitation already responded" });
    }

    invitation.status = "accepted";
    invitation.respondedOn = new Date();
    await invitation.save();

    // You can now add the user to the team manually in another controller

    res.status(200).json({ message: "Invitation accepted", invitation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reject invitation
const rejectInvitation = async (req, res) => {
  const { token } = req.params;

  try {
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: "Invalid token" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "Invitation already responded" });
    }

    invitation.status = "rejected";
    invitation.respondedOn = new Date();
    await invitation.save();

    res.status(200).json({ message: "Invitation rejected", invitation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  sendInvitation,
  getInvitationsForTeam,
  deleteInvitation,
  acceptInvitation,
  rejectInvitation,
};
