const express = require("express");
const multer = require("multer");
const fs = require("fs");
const https = require("https");

const router = express.Router();

// Firebase config — new project (evasafe-new)
const FIREBASE_API_KEY = "AIzaSyBPP6Oe6ZhTGBHqrqPczfaXkuUPG9X9mSQ";
const FIREBASE_STORAGE_BUCKET = "evasafe-new.firebasestorage.app";

const multerStorage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: multerStorage });

/**
 * Upload a file buffer to Firebase Storage via REST API.
 * No Admin SDK or service account needed — only apiKey + storageBucket.
 */
function uploadToFirebaseREST(fileBuffer, destPath, mimeType) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(destPath);
    const hostname = "firebasestorage.googleapis.com";
    const path = `/v0/b/${FIREBASE_STORAGE_BUCKET}/o?name=${encodedPath}&uploadType=media&key=${FIREBASE_API_KEY}`;

    const options = {
      hostname,
      path,
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileBuffer.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed?.error?.message || `Status ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error("Failed to parse Firebase response"));
        }
      });
    });

    req.on("error", reject);
    req.write(fileBuffer);
    req.end();
  });
}

router.post("/", upload.single("image"), async (req, res) => {
  let imagePath;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    imagePath = req.file.path;
    const originalName = req.file.originalname;
    const timestamp = Date.now();
    const filename = `${timestamp}-${originalName}`;
    const destPath = `evidence/${filename}`;

    console.log(`Uploading to Firebase Storage: ${originalName}`);

    const fileBuffer = fs.readFileSync(imagePath);
    const responseData = await uploadToFirebaseREST(fileBuffer, destPath, req.file.mimetype);

    // Clean up local file
    fs.unlinkSync(imagePath);

    // Build download URL
    const downloadToken = responseData.downloadTokens;
    const encodedPath = encodeURIComponent(destPath);
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    console.log(`✅ Uploaded to Firebase Storage: ${filename}`);
    console.log(`🔗 Download URL: ${downloadURL}`);

    res.json({
      success: true,
      firebaseUrl: downloadURL,
      url: downloadURL,
      path: destPath,
      cid: filename,
    });

  } catch (error) {
    console.error("Firebase upload error:", error.message);

    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
