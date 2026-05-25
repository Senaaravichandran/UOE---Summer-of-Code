const { ethers } = require("ethers");
const Alert = require("../models/Alert");
const crypto = require("crypto");
require("dotenv").config();

// Replace with your actual provider URL - Open Campus Codex Sepolia Testnet
let provider;
let wallet;
let contract;
let contractAddress = "0xA89eD77B141bB54AdD78d6a5d809D11010F278d7"; // Moved to module scope

try {
  provider = new ethers.JsonRpcProvider(
    "https://rpc.open-campus-codex.gelato.digital",
    {
      name: "Open Campus Codex",
      chainId: 656476
    }
  );

  // Replace with your deployed contract address and ABI
  const contractABI = [
    "function createCase(string,string,string) public",
    "function addEvidence(string,string,string,uint256) public",
    "function addQuery(string,string,uint256) public",
    "function closeCase(uint256) public",
    "function assignAuthority(uint256,address) public",
    "function getCase(uint256) view returns (uint256,string,string,string,bool)",
    "function getEvidences(uint256) view returns (tuple(uint256,string,string,string)[])",
    "function getQueries(uint256) view returns (tuple(uint256,string,string)[])",
    "function getAuthorities(uint256) view returns (address[])",
    "function getTotalCases() view returns (uint256)",
  ];

  wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || "0d153561421641fa3c660aef6107acb186a1dbae70bcad092f02ebee6af801b9",
    provider
  );
  contract = new ethers.Contract(contractAddress, contractABI, wallet);
  
  console.log("✅ Blockchain provider initialized");
} catch (error) {
  console.error("❌ Error initializing blockchain provider:", error.message);
  console.log("⚠️  Blockchain functionality will be disabled");
}

const generateVideoHash = (url) => {
  return crypto.createHash("sha256").update(url).digest("hex");
};

const createCase = async (alert) => {
  console.log(`\n🔄 createCase called for alert ID: ${alert._id}`);
  console.log(`   createdContract value: "${alert.createdContract}" (${typeof alert.createdContract})`);
  
  if (alert.createdContract === "false") {
    console.log("✅ Condition passed: createdContract === 'false'");
    const videoHash = generateVideoHash(alert.footageUrl);
    const dateTimeString = `${alert.anomalyDate} ${alert.anomalyTime}`;

    try {
      console.log("🚨 Creating a new case on the blockchain...");
      console.log(`   Contract Address: ${contractAddress}`);
      console.log(`   Location: ${alert.location}`);
      console.log(`   Video Hash: ${videoHash}`);
      console.log(`   DateTime: ${dateTimeString}`);
      
      const tx = await contract.createCase(
        alert.location,
        videoHash,
        dateTimeString
      );
      console.log("⏳ Waiting for transaction to be mined...");
      const receipt = await tx.wait(); // Wait for transaction to be mined
      console.log("✅ Case created successfully!");
      console.log(`   Transaction Hash: ${receipt.hash}`);
      console.log(`   Block Number: ${receipt.blockNumber}`);

      // Get the case ID
      const totalCases = await contract.getTotalCases();
      const caseId = Number(totalCases) - 1; // Latest case ID
      console.log(`📝 Case ID: ${caseId}`);

      // Update the alert to mark it as processed and save the case ID
      // DO THIS FIRST before any other operations that might fail
      console.log(`💾 Updating alert ${alert._id} in MongoDB...`);
      const updateResult = await Alert.updateOne(
        { _id: alert._id }, 
        { createdContract: "true", blockchainCaseId: caseId }
      );
      console.log(`   Modified count: ${updateResult.modifiedCount}`);
      console.log(`   Matched count: ${updateResult.matchedCount}`);
      
      // Verify the update
      const updatedAlert = await Alert.findById(alert._id);
      console.log(`   Verification - createdContract: "${updatedAlert.createdContract}", blockchainCaseId: ${updatedAlert.blockchainCaseId}`);
      console.log(`✅ Alert ${alert._id} marked as processed with Case ID: ${caseId}`);

      // Try to assign default authorities (optional, don't fail if this errors)
      try {
        const defaultAuthorities = [
          "0x742d35cc6634c0532925a3b8d0d4e9a473a12345", // Use lowercase
          "0x742d35cc6634c0532925a3b8d0d4e9a473a67890", // Use lowercase
        ];

        for (const authorityAddress of defaultAuthorities) {
          try {
            await assignAuthority(caseId, authorityAddress);
            console.log(`✅ Assigned default authority ${authorityAddress} to case ${caseId}`);
          } catch (error) {
            console.error(`⚠️  Could not assign authority ${authorityAddress}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`⚠️  Authority assignment skipped:`, error.message);
      }
      
      console.log(`🎉 Case creation complete!\n`);
    } catch (error) {
      console.error("❌ Error creating case on blockchain:", error);
      console.error("Error details:", error.message);
      if (error.data) console.error("Error data:", error.data);
    }
  } else {
    console.log(`⚠️  Alert already processed or invalid. createdContract: "${alert.createdContract}"\n`);
  }
};

const checkAlerts = async () => {
  try {
    console.log("🔍 Checking for unprocessed alerts...");
    
    const latestAlert = await Alert.findOne({ createdContract: "false" }).sort({
      createdAt: -1,
    });
    
    if (latestAlert) {
      console.log(`📋 Found unprocessed alert:`);
      console.log(`   ID: ${latestAlert._id}`);
      console.log(`   Location: ${latestAlert.location}`);
      console.log(`   Date: ${latestAlert.anomalyDate} ${latestAlert.anomalyTime}`);
      console.log(`   createdContract: "${latestAlert.createdContract}" (type: ${typeof latestAlert.createdContract})`);
      await createCase(latestAlert);
    } else {
      console.log("✓ No unprocessed alerts found");
    }
  } catch (error) {
    console.error("❌ Error checking alerts:", error);
  }
};

const addEvidence = async (caseId, mediaHash, description, dateTime) => {
  try {
    const tx = await contract.addEvidence(
      mediaHash,
      description,
      dateTime,
      caseId
    );
    await tx.wait();
  } catch (error) {
    console.error("Error adding evidence:", error);
  }
};

const addQuery = async (caseId, question, answer) => {
  try {
    const tx = await contract.addQuery(question, answer, caseId);
    await tx.wait();
  } catch (error) {
    console.error("Error adding query:", error);
  }
};

const closeCase = async (caseId) => {
  try {
    const tx = await contract.closeCase(caseId);
    await tx.wait();
  } catch (error) {
    console.error("Error closing case:", error);
  }
};

const assignAuthority = async (caseId, authorityAddress) => {
  try {
    const tx = await contract.assignAuthority(caseId, authorityAddress);
    await tx.wait();
  } catch (error) {
    console.error("Error assigning authority:", error);
  }
};

const getCase = async (caseId) => {
  try {
    return await contract.getCase(caseId);
  } catch (error) {
    console.error("Error fetching case details:", error.message);
    throw error;
  }
};

const getEvidences = async (caseId) => {
  try {
    return await contract.getEvidences(caseId);
  } catch (error) {
    console.error("Error fetching evidences:", error.message);
    return []; // Return empty array on error
  }
};

const getQueries = async (caseId) => {
  try {
    return await contract.getQueries(caseId);
  } catch (error) {
    console.error("Error fetching queries:", error.message);
    return []; // Return empty array on error
  }
};

const getAuthorities = async (caseId) => {
  try {
    return await contract.getAuthorities(caseId);
  } catch (error) {
    console.error("Error fetching authorities:", error.message);
    return []; // Return empty array on error
  }
};

const getTotalCases = async () => {
  try {
    return await contract.getTotalCases();
  } catch (error) {
    console.error("Error fetching total cases:", error);
  }
};

const deleteAlertAndCase = async (alertId) => {
  try {
    // Find the alert first to get the case ID
    const alert = await Alert.findById(alertId);
    
    if (!alert) {
      console.log(`⚠️  Alert ${alertId} not found`);
      return { success: false, message: "Alert not found" };
    }

    console.log(`🗑️  Deleting alert ${alertId} and its associated case...`);
    
    // If alert has a blockchain case, close it
    if (alert.blockchainCaseId !== null && alert.blockchainCaseId !== undefined) {
      console.log(`📦 Closing blockchain case ${alert.blockchainCaseId}...`);
      try {
        await closeCase(alert.blockchainCaseId);
        console.log(`✅ Case ${alert.blockchainCaseId} closed on blockchain`);
      } catch (error) {
        console.error(`❌ Error closing case ${alert.blockchainCaseId}:`, error.message);
        // Continue with alert deletion even if blockchain fails
      }
    } else {
      console.log(`ℹ️  No blockchain case associated with this alert`);
    }

    // Delete the alert from database
    await Alert.deleteOne({ _id: alertId });
    console.log(`✅ Alert ${alertId} deleted from database`);
    
    return { success: true, message: "Alert and case deleted successfully" };
  } catch (error) {
    console.error("❌ Error in deleteAlertAndCase:", error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  createCase,
  checkAlerts,
  addEvidence,
  addQuery,
  closeCase,
  assignAuthority,
  getCase,
  getEvidences,
  getQueries,
  getAuthorities,
  getTotalCases,
  deleteAlertAndCase,
};
