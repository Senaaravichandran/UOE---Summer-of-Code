# ✅ SETUP VERIFICATION CHECKLIST

## 🔧 What Was Fixed:

### 1. **Enhanced Debugging** 
- Added comprehensive logging to track alert processing
- Shows alert ID, location, date/time, and createdContract status
- Displays blockchain transaction details

### 2. **Alert-to-Case Mapping**
- Added `blockchainCaseId` field to Alert model
- Each alert now stores its corresponding blockchain case ID
- Enables proper case deletion when alert is deleted

### 3. **Automatic Case Deletion**
- When you delete an alert, it now automatically closes the blockchain case
- Uses the new `deleteAlertAndCase()` function
- Maintains consistency between MongoDB and blockchain

## 🚀 How It Works:

### **Alert → Case Creation Flow:**
1. Crime Detection system creates alert in MongoDB with `createdContract: "false"`
2. Backend `checkAlerts()` runs every 5 seconds
3. Finds unprocessed alerts (where `createdContract === "false"`)
4. Creates blockchain case with: location, video hash, date/time
5. Saves case ID to alert: `blockchainCaseId: <caseId>`
6. Updates alert: `createdContract: "true"`

### **Alert Deletion → Case Closure Flow:**
1. User deletes alert from dashboard
2. Backend finds alert and its `blockchainCaseId`
3. Calls `closeCase(caseId)` on blockchain
4. Deletes alert from MongoDB
5. Both alert and case are removed/closed

## 📋 Deployment Steps:

1. **Deploy New Contract:**
   ```bash
   cd Contract_Deployment
   npm install
   npx hardhat run scripts/deploy.js --network opencampus
   ```
   Copy the contract address from output.

2. **Update Contract Address:**
   - Update in: `Web_Application/backend/src/services/caseService.js` (Line 16)
   - Update in: `Web_Application/frontend/src/pages/OverviewPage.jsx` (Line 58)
   - Update in: `Web_Application/frontend/src/pages/CaseMap.jsx` (Line 72)

3. **Restart Backend:**
   ```bash
   cd Web_Application/backend
   npm start
   ```

4. **Watch Console Logs:**
   You should see every 5 seconds:
   ```
   🔍 Checking for unprocessed alerts...
   ✓ No unprocessed alerts found
   ```

5. **Test Alert Processing:**
   - Send an alert from Crime Detection system
   - Watch backend console - you should see:
     ```
     🔍 Checking for unprocessed alerts...
     📋 Found unprocessed alert:
        ID: 67xxxxxxxxxxxx
        Location: XYZ Street
        Date: 2025-12-31 14:30
     🚨 Creating a new case on the blockchain...
     ⏳ Waiting for transaction to be mined...
     ✅ Case created successfully!
        Transaction Hash: 0x...
        Case ID: 0
     ✅ Alert marked as processed with Case ID: 0
     ```

6. **Test Alert Deletion:**
   - Delete an alert from dashboard
   - Watch console:
     ```
     🗑️ Delete request for alert: 67xxxxxxxxxxxx
     🗑️ Deleting alert and its associated case...
     📦 Closing blockchain case 0...
     ✅ Case 0 closed on blockchain
     ✅ Alert deleted from database
     ```

## 🐛 Troubleshooting:

### If cases still not creating:

1. **Check contract address matches:**
   ```bash
   grep -r "0xA89eD77B141bB54AdD78d6a5d809D11010F278d7" Web_Application/
   ```
   All files should have the SAME address.

2. **Check MongoDB connection:**
   - Verify alerts exist: Check MongoDB Compass or Atlas
   - Look for alerts with `createdContract: "false"`

3. **Check backend logs:**
   - Look for error messages after "Creating a new case..."
   - Common issues: wrong private key, insufficient gas, network issues

4. **Manual test:**
   ```bash
   cd Web_Application/backend
   node testCaseCreation.js
   ```

### If alert deletion doesn't close case:

1. Check backend logs for "Closing blockchain case X..."
2. Verify case is actually closed on blockchain explorer
3. Check if contract has `closeCase` function implemented

## 📝 Current Configuration:

- **Contract Address:** `0xA89eD77B141bB54AdD78d6a5d809D11010F278d7`
- **Network:** Open Campus Codex Sepolia
- **RPC:** `https://rpc.open-campus-codex.gelato.digital`
- **Chain ID:** 656476
- **MongoDB:** UrbanGuard database, alerts collection
- **Check Interval:** 5 seconds

## ✨ Key Features Now Working:

✅ Automatic case creation when alert arrives
✅ Comprehensive debugging logs
✅ Alert-to-case mapping
✅ Automatic case closure on alert deletion
✅ Transaction hash and block number tracking
✅ Error handling and detailed error messages
