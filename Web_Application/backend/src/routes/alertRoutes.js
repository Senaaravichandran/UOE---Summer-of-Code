// In your backend routes file (e.g., alerts.js or routes.js)

const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const { deleteAlertAndCase } = require("../services/caseService");

// MongoDB connection - SAME as Crime_Detection uses
const MONGO_URI = "mongodb+srv://nidhins1807:testking54321@zensafe.rewx0ps.mongodb.net/UrbanGuard";
const DB_NAME = "UrbanGuard";
const COLLECTION_NAME = "alerts";

let mongoClient = null;

async function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
}

// Get all alerts (directly from MongoDB)
router.get("/fetch-alerts", async (req, res) => {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const alerts = await collection.find({}).toArray();
    
    // Convert MongoDB _id to string for frontend
    const formattedAlerts = alerts.map(alert => ({
      ...alert,
      _id: alert._id.toString(),
      coordinates: alert.coordinates || { lat: 0, lng: 0 }
    }));
    
    res.json(formattedAlerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ message: "Error fetching alerts" });
  }
});

// Delete a specific alert by ID (directly from MongoDB) and close its blockchain case
router.delete("/delete-alerts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`\n🗑️  Delete request for alert: ${id}`);
    
    const result = await deleteAlertAndCase(id);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ message: "Error deleting alert" });
  }
});

// Get alert count (directly from MongoDB)
router.get("/fetch-alert-count", async (req, res) => {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const count = await collection.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Error fetching alert count:", error);
    res.status(500).json({ message: "Error fetching alert count" });
  }
});

// Video proxy endpoint - streams from Firebase Storage URL directly
router.get("/proxy-video/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    
    // If hash looks like a Firebase URL, redirect directly
    if (hash.includes('firebasestorage.googleapis.com')) {
      return res.redirect(hash);
    }
    
    // Cache directory
    const cacheDir = path.join(__dirname, "../../uploads");
    const cacheFile = path.join(cacheDir, `${hash}.mp4`);
    
    // Ensure cache directory exists
    await fsp.mkdir(cacheDir, { recursive: true });
    
    // Check if video is already cached
    try {
      await fsp.stat(cacheFile);
      console.log(`✅ Serving cached video: ${hash}`);
      res.setHeader("Content-Type", "video/mp4");
      return res.sendFile(cacheFile);
    } catch (e) {
      // Not cached, proceed to download
    }
    
    // For Firebase Storage URLs, download and cache
    // Format: Firebase Storage uses direct download URLs
    const firebaseUrl = hash;
    
    try {
      console.log(`📥 Downloading from Firebase Storage...`);
      await new Promise((resolve, reject) => {
        const https = require("https");
        https.get(firebaseUrl, { timeout: 30000 }, (response) => {
          if (response.statusCode === 200) {
            const write = fs.createWriteStream(cacheFile);
            response.pipe(write);
            write.on("finish", () => {
              console.log(`✅ Downloaded from Firebase Storage`);
              resolve();
            });
            write.on("error", reject);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }).on("error", reject).on("timeout", function() {
          this.destroy();
          reject(new Error("Timeout"));
        });
      });
      
      res.setHeader("Content-Type", "video/mp4");
      res.sendFile(cacheFile);
    } catch (err) {
      console.error(`❌ Failed to download from Firebase: ${err.message}`);
      return res.status(500).json({ error: "Could not download video from Firebase Storage" });
    }
    
  } catch (error) {
    console.error("❌ Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
