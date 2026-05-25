const mongoose = require("mongoose");
const { checkAlerts } = require("./src/services/caseService");

const MONGO_URI = "mongodb+srv://nidhins1807:testking54321@zensafe.rewx0ps.mongodb.net/UrbanGuard";

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // First, let's see what alerts exist
    const Alert = require("./src/models/Alert");
    const allAlerts = await Alert.find({}).sort({ _id: -1 }).limit(5);
    
    console.log(`\n📊 Found ${allAlerts.length} recent alerts:`);
    allAlerts.forEach((alert, i) => {
      console.log(`\n   Alert ${i + 1}:`);
      console.log(`   - ID: ${alert._id}`);
      console.log(`   - Location: ${alert.location}`);
      console.log(`   - Date: ${alert.anomalyDate} ${alert.anomalyTime}`);
      console.log(`   - createdContract: "${alert.createdContract}" (type: ${typeof alert.createdContract})`);
      console.log(`   - blockchainCaseId: ${alert.blockchainCaseId}`);
      console.log(`   - footageUrl: ${alert.footageUrl ? 'Present' : 'Missing'}`);
      console.log(`   - firebaseUrl: ${alert.firebaseUrl ? 'Present' : 'Missing'}`);
    });

    console.log("\n\n🚀 Running checkAlerts...");
    await checkAlerts();
    
    console.log("\n✅ Done! Checking alerts again...");
    const updatedAlerts = await Alert.find({}).sort({ _id: -1 }).limit(5);
    console.log(`\n📊 Updated alerts:`);
    updatedAlerts.forEach((alert, i) => {
      console.log(`\n   Alert ${i + 1}:`);
      console.log(`   - ID: ${alert._id}`);
      console.log(`   - createdContract: "${alert.createdContract}"`);
      console.log(`   - blockchainCaseId: ${alert.blockchainCaseId}`);
    });

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
