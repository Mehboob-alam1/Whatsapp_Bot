const Project = require("../models/Project.js");

// Create new project
const createProject = async (req, res) => {
  try {
    const project = new Project(req.body);
    const saved = await project.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all projects
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate("tasks");
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single project by ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("tasks");
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.status(200).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Project not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Project not found" });
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
