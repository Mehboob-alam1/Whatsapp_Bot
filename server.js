// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { config } = require("dotenv");
config();

const authRoutes = require("./routes/auth.js");
const taskRoutes = require("./routes/tasks.js");
const userRoutes = require("./routes/users.js");
const whatsappRoutes = require("./routes/whatsapp.js");
const fileRoutes = require("./routes/files.js");
const blockerRoutes = require("./routes/blockers.js");
const dependencyRoutes = require("./routes/dependencies.js");
const uploadRoutes = require("./routes/upload.js");
const projectRoutes = require("./routes/projectRoutes.js");
const teamRoutes = require("./routes/teamRoutes.js");
const invitationRoutes = require("./routes/invitationRoutes.js");

const errorHandler = require("./middlewares/errorHandler.js");
const logger = require("./utils/logger.js");

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

app.get("/", (req, res) => {
  res.status(200).send("ok");
});
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/blockers", blockerRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/invitations", invitationRoutes);
// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb://localhost:27017/whatsapp-task-manager",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
