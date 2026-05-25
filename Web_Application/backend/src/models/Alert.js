const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  alert: { type: Boolean, required: true },
  footageUrl: { type: String, required: true },
  firebaseUrl: { type: String, default: null },
  // Keep pinataUrl for backward compatibility with existing data
  pinataUrl: { type: String, default: null },
  location: { type: String, required: true },
  anomalyDate: { type: String, required: true },
  anomalyTime: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  createdContract: { type: String, default: "false" },
  blockchainCaseId: { type: Number, default: null },
  source: { type: String, default: "manual" }  // Source: live_feed, manual, etc.
});

const Alert = mongoose.model("Alert", alertSchema);

module.exports = Alert;
