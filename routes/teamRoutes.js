const express = require("express");
const {
  createTeam,
  getAllTeams,
  getTeamById,
  addMember,
  removeMember,
  deleteTeam,
} = require("../controllers/teamController.js");

const router = express.Router();

router.post("/", createTeam);
router.get("/", getAllTeams);
router.get("/:id", getTeamById);
router.post("/:id/members", addMember);
router.delete("/:id/members/:memberId", removeMember);
router.delete("/:id", deleteTeam);

module.exports = router;
