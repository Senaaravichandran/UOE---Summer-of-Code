const admin = require('firebase-admin');

let db = null;
let storage = null;
let app = null;

// Wrap in try/catch so a stale serviceAccountKey.json never crashes the backend
try {
  const serviceAccount = require('./serviceAccountKey.json');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "evasafe-new.firebasestorage.app"
    });
  }

  db = admin.firestore();
  storage = admin.storage();
  app = admin.app();

  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (err) {
  console.warn("⚠️  Firebase Admin SDK failed to initialize (serviceAccountKey.json may be stale).");
  console.warn("   Upload route uses REST API and will still work fine.");
  console.warn("   Error:", err.message);
}

module.exports = { admin, app, storage, db };
