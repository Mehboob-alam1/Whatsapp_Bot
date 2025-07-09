const Team = require("../models/Team.js");
const mongoose = require("mongoose");

// Create a new team
const createTeam = async (req, res) => {
  try {
    const team = new Team(req.body);
    const savedTeam = await team.save();
    res.status(201).json(savedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate("members.memberId");
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single team by ID
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate(
      "members.memberId"
    );
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.status(200).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a member to the team
const addMember = async (req, res) => {
  const { memberId, role } = req.body;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check if already added
    const exists = team.members.some((m) => m.memberId.equals(memberId));
    if (exists)
      return res.status(400).json({ message: "Member already in team" });

    team.members.push({ memberId, role: role || "collaborator" });
    await team.save();
    res.status(200).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove a member from the team
const removeMember = async (req, res) => {
  const { memberId } = req.params;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.members = team.members.filter((m) => !m.memberId.equals(memberId));
    await team.save();
    res.status(200).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a team
const deleteTeam = async (req, res) => {
  try {
    const deleted = await Team.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Team not found" });
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createTeam,
  getAllTeams,
  getTeamById,
  addMember,
  removeMember,
  deleteTeam,
};
