const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./src/config/db.js");
const residentRoutes = require("./src/routes/residentRoutes");
const authorityRoutes = require("./src/routes/authorityRoutes");
const mailRoutes = require("./src/routes/mailRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const alertRoutes = require("./src/routes/alertRoutes.js");
const caseRoutes = require("./src/routes/caseRoutes.js");
const { checkAlerts } = require("./src/services/caseService.js");
const uploadToIPFSRoutes = require("./src/routes/uploadToIPFSRoutes");

const http = require("http");
const path = require("path");
dotenv.config();

// Initialize Firebase
require("./src/config/firebase");

// Initialize express app
const app = express();

// Database connection
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files
app.use("/data", express.static(path.join(__dirname, "data")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve cached videos

// Routes
app.use("/api/alerts", alertRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/authorities", authorityRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/upload", uploadToIPFSRoutes);

// Auto-check for new alerts and create cases
const runCheckAlerts = async () => {
  try {
    await checkAlerts(); // Wait for checkAlerts to complete
  } catch (error) {
    console.error("❌ Error in checkAlerts:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    setTimeout(runCheckAlerts, 5000); // Schedule the next execution
  }
};

// Start the first execution with error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

runCheckAlerts();

// Start server
const PORT = process.env.PORT || 5000;

// Allow the server to be accessible from the local network
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (Local)`);
});
