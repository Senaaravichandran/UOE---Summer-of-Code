# 📊 Real-Time Stats Explanation

## How Stats Update in Real-Time

### **Total Cameras** 📷
**Updates when:**
- ✅ Webcam connects: `devices.length + 1`
- ✅ Webcam disconnects: `devices.length + 0`
- ✅ New device scanned: `devices.length + (webcam ? 1 : 0)`

**Example:**
- No webcam: Shows `0`
- Webcam connected: Shows `1` ✅
- Webcam + 3 scanned devices: Shows `4`

---

### **Critical Alerts** 🚨
**Updates when:**
- ✅ Unauthorized access detected: `intrusionAlerts.length++`
- ✅ Each new intrusion: Counter increases
- ✅ Real-time monitoring: Updates every 5 seconds

**Example:**
- No intrusions: Shows `0`
- 1 unauthorized access: Shows `1` ✅
- 3 blocked attempts: Shows `3` ✅

---

### **High Risk** ⚠️
**Updates when:**
- ✅ Devices scanned with high/critical vulnerabilities
- ✅ Combines critical + high risk devices

**Example:**
- 2 devices with critical vulnerabilities: Shows `2`
- 1 critical + 2 high risk: Shows `3`

---

### **Secure Devices** ✅
**Updates when:**
- ✅ Devices with low risk: `lowRiskDevices`
- ✅ Connected webcam with no intrusions: `+1`
- ✅ If intrusions exist, webcam not counted as secure

**Example:**
- No webcam: Shows `0`
- Webcam + no intrusions: Shows `1` ✅
- Webcam + 2 safe devices + no intrusions: Shows `3`
- Webcam + intrusions detected: Shows `2` (webcam not secure)

---

## 🎯 Real-Time Behavior

### **Scenario 1: Connect Webcam**
```
Before:
- Total Cameras: 0
- Critical Alerts: 0
- Secure Devices: 0

After Connection:
- Total Cameras: 1 ✅
- Critical Alerts: 0
- Secure Devices: 1 ✅
```

### **Scenario 2: Intrusion Detected**
```
Before:
- Total Cameras: 1
- Critical Alerts: 0
- Secure Devices: 1

After Intrusion:
- Total Cameras: 1 (no change)
- Critical Alerts: 1 ✅ (NEW!)
- Secure Devices: 0 ✅ (webcam no longer secure)
```

### **Scenario 3: Multiple Intrusions**
```
First Attack:
- Critical Alerts: 1

Second Attack:
- Critical Alerts: 2 ✅

Third Attack:
- Critical Alerts: 3 ✅
```

---

## 🔄 Update Triggers

Stats automatically recalculate when:
1. **Webcam connected/disconnected** → Total Cameras + Secure Devices
2. **Intrusion detected** → Critical Alerts + Secure Devices
3. **Devices scanned** → All stats update
4. **Security monitoring active** → Polls every 5 seconds

---

## 💻 Technical Implementation

### **updateRealTimeStats() Function**
```javascript
const updateRealTimeStats = () => {
  // 1. Count total cameras (devices + webcam if connected)
  const totalCameras = devices.length + (liveCamera ? 1 : 0);
  
  // 2. Count critical alerts (intrusion attempts)
  const criticalAlerts = intrusionAlerts.length;
  
  // 3. Analyze device risks
  let criticalRisk = 0;
  let highRisk = 0;
  let lowRisk = 0;
  
  devices.forEach(device => {
    if (device.risk_level === 'critical') criticalRisk++;
    else if (device.risk_level === 'high') highRisk++;
    else if (device.risk_level === 'low') lowRisk++;
  });
  
  // 4. Count secure devices (low risk + webcam if no intrusions)
  const secureDevices = lowRisk + (liveCamera && intrusionAlerts.length === 0 ? 1 : 0);
  
  // 5. Update state
  setStats({
    total_devices: totalCameras,
    critical_risk: criticalAlerts,
    high_risk: criticalRisk + highRisk,
    low_risk: secureDevices
  });
};
```

### **Trigger Points**
1. **useEffect watching dependencies:**
   ```javascript
   useEffect(() => {
     updateRealTimeStats();
   }, [liveCamera, intrusionAlerts, devices]);
   ```

2. **On webcam connect:**
   ```javascript
   connectToIPCamera() {
     // ... connection logic
     updateRealTimeStats(); // Immediate update
   }
   ```

3. **On intrusion detected:**
   ```javascript
   setIntrusionAlerts(prev => {
     const updated = [...prev, newAlert];
     setTimeout(() => updateRealTimeStats(), 100);
     return updated;
   });
   ```

---

## ✅ Testing Guide

### **Test 1: Connect Webcam**
1. Enter IP (e.g., `192.168.1.100:8080`)
2. Click "Connect"
3. ✅ Total Cameras should show `1`
4. ✅ Secure Devices should show `1`

### **Test 2: Simulate Intrusion**
1. Run `python test_intrusion.py`
2. Watch dashboard
3. ✅ Critical Alerts increases (1, 2, 3...)
4. ✅ Secure Devices becomes `0`
5. ✅ Bot shows red alert messages

### **Test 3: Real Intrusion**
1. Connect webcam from computer
2. Open webcam URL from phone: `http://YOUR_IP:8080/video`
3. ✅ Dashboard detects unauthorized access
4. ✅ Critical Alerts increases
5. ✅ Bot explains threat and response

---

## 🎨 Visual Indicators

### **Cards Color Coding**
- **Total Cameras** - 🔵 Blue (#6366F1)
- **Critical Alerts** - 🔴 Red (#EF4444) - Pulses when > 0
- **High Risk** - 🟠 Orange (#F59E0B)
- **Secure Devices** - 🟢 Green (#10B981)

### **Dynamic Updates**
- Stats update **instantly** when webcam connects
- Stats update **every 5 seconds** during monitoring
- Critical Alerts **pulse red** when intrusions detected
- Bot section shows **monitoring active/inactive** status

---

## 🚀 Summary

**Before webcam:** All stats show `0`

**After webcam connects:**
- ✅ Total Cameras: `1`
- ✅ Secure Devices: `1`
- ✅ Monitoring: Active 🛡️

**When intrusion happens:**
- ✅ Critical Alerts: Increases ⬆️
- ✅ Secure Devices: Decreases ⬇️
- ✅ Bot: Alerts with guidance 🚨

**Everything updates in REAL-TIME!** ⚡
