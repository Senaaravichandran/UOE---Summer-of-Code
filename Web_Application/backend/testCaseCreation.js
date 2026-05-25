const mongoose = require("mongoose");
const { checkAlerts } = require("./src/services/caseService");

// MongoDB connection
const MONGO_URI = "mongodb+srv://nidhins1807:testking54321@zensafe.rewx0ps.mongodb.net/UrbanGuard";

async function testCaseCreation() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get Alert model
    const Alert = require("./src/models/Alert");

    // Check existing alerts
    console.log("📊 Checking existing alerts...");
    const allAlerts = await Alert.find({});
    console.log(`Total alerts in database: ${allAlerts.length}`);

    const unprocessedAlerts = await Alert.find({ createdContract: "false" });
    console.log(`Unprocessed alerts (createdContract: "false"): ${unprocessedAlerts.length}\n`);

    if (unprocessedAlerts.length > 0) {
      console.log("📋 Unprocessed alerts:");
      unprocessedAlerts.forEach((alert, index) => {
        console.log(`\n${index + 1}. Alert ID: ${alert._id}`);
        console.log(`   Location: ${alert.location}`);
        console.log(`   Date: ${alert.anomalyDate} ${alert.anomalyTime}`);
        console.log(`   createdContract: ${alert.createdContract} (type: ${typeof alert.createdContract})`);
      });

      console.log("\n\n🚀 Running checkAlerts to process unprocessed alerts...\n");
      await checkAlerts();
      
      console.log("\n✅ checkAlerts completed!");
      console.log("\n📊 Checking status after processing...");
      
      const stillUnprocessed = await Alert.find({ createdContract: "false" });
      console.log(`Remaining unprocessed alerts: ${stillUnprocessed.length}`);
      
      const processed = await Alert.find({ createdContract: "true" });
      console.log(`Processed alerts (createdContract: "true"): ${processed.length}`);
    } else {
      console.log("✅ No unprocessed alerts found!");
      
      const processedAlerts = await Alert.find({ createdContract: "true" });
      console.log(`\nProcessed alerts count: ${processedAlerts.length}`);
    }

    console.log("\n✅ Test completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testCaseCreation();
