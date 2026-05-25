const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { OpenAI } = require("openai");
const CCTVScanner = require("./scanner/advanced_scanner");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 5000;

// Scanner instance for tracking ongoing scans
let activeScanner = null;

// Camera IP addresses mapping (all cameras on port 5005)
const cameraIPs = {
  v1: "192.168.1.101:5005",
  v2: "192.168.1.102:5005",
  v3: "192.168.1.103:5005",
  v4: "192.168.1.104:5005",
  v5: "192.168.1.105:5005"
};

const AUTHORIZED_PORT = 5005;

// Track intrusion attempts
let intrusionAlerts = [];

// WebSocket clients for real-time alerts
let wsClients = [];

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  wsClients.push(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to EvaSafe Alert System',
    timestamp: new Date().toISOString()
  }));
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    wsClients = wsClients.filter(client => client !== ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast alert to all connected WebSocket clients
const broadcastAlert = (alert) => {
  const message = JSON.stringify({
    type: 'alert',
    data: alert,
    timestamp: new Date().toISOString()
  });
  
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  console.log(`📡 Broadcast alert to ${wsClients.length} clients`);
};

// Initialize NVIDIA API client (presented as Gemini)
const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: "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"
});

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from data directory
app.use("/data", express.static(path.join(__dirname, "..", "data")));

// Serve video files from ip cam's directory
app.use("/videos", express.static(path.join(__dirname, "..", "ip cam's")));

// Helper function to read CSV files
const readCSV = (filename) => {
  try {
    const filePath = path.join(__dirname, "..", "data", filename);
    const data = fs.readFileSync(filePath, "utf8");
    const lines = data.trim().split("\n");
    const headers = lines[0].split(",");
    
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index] ? values[index].trim() : "";
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

// API Routes
app.get("/", (req, res) => {
  res.json({ status: "CCTV Guard Backend Running", version: "1.0.0" });
});

// Get scan results with enriched data
app.get("/api/scan-results", (req, res) => {
  try {
    const scanResults = readCSV("cctv_scan_results.csv");
    const vulnerabilities = readCSV("cctv_with_cves.csv");
    const attacks = readCSV("cctv_attack_simulation.csv");
    const predictions = readCSV("cctv_ml_predictions.csv");
    const recommendations = readCSV("cctv_security_recommendations.csv");

    // Merge data by device_id
    const enrichedData = scanResults.map((scan) => {
      const vuln = vulnerabilities.find((v) => v.device_id === scan.device_id) || {};
      const attack = attacks.find((a) => a.device_id === scan.device_id) || {};
      const pred = predictions.find((p) => p.device_id === scan.device_id) || {};
      const rec = recommendations.find((r) => r.device_id === scan.device_id) || {};

      return {
        ...scan,
        ...vuln,
        ...attack,
        ...pred,
        ...rec,
      };
    });

    res.json({
      success: true,
      count: enrichedData.length,
      data: enrichedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get statistics
app.get("/api/stats", (req, res) => {
  try {
    const scanResults = readCSV("cctv_scan_results.csv");
    const predictions = readCSV("cctv_ml_predictions.csv");

    const total = scanResults.length;
    const critical = predictions.filter((p) => p.predicted_risk === "Critical").length;
    const high = predictions.filter((p) => p.predicted_risk === "High").length;
    const medium = predictions.filter((p) => p.predicted_risk === "Medium").length;
    const low = predictions.filter((p) => p.predicted_risk === "Low").length;

    res.json({
      success: true,
      stats: {
        total_devices: total,
        critical_risk: critical,
        high_risk: high,
        medium_risk: medium,
        low_risk: low,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get vulnerabilities
app.get("/api/vulnerabilities", (req, res) => {
  try {
    const vulnerabilities = readCSV("cctv_vulnerabilities.csv");
    res.json({
      success: true,
      count: vulnerabilities.length,
      data: vulnerabilities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get recommendations
app.get("/api/recommendations", (req, res) => {
  try {
    const recommendations = readCSV("cctv_security_recommendations.csv");
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get CVE data
app.get("/api/cve-data", (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "data", "cve_data.json");
    const data = fs.readFileSync(filePath, "utf8");
    res.json({
      success: true,
      data: JSON.parse(data),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get attack simulations
app.get("/api/attacks", (req, res) => {
  try {
    const attacks = readCSV("cctv_attack_simulation.csv");
    res.json({
      success: true,
      count: attacks.length,
      data: attacks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get ML predictions
app.get("/api/predictions", (req, res) => {
  try {
    const predictions = readCSV("cctv_ml_predictions.csv");
    res.json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get local cameras list
app.get("/api/local-cameras", (req, res) => {
  try {
    const cameras = [
      {
        id: "v1",
        name: "Camera 1 - Main Entrance",
        location: "Building A - Floor 1",
        ip: cameraIPs.v1,
        videoUrl: "/videos/v1.mp4"
      },
      {
        id: "v2",
        name: "Camera 2 - Parking Lot",
        location: "Building A - Outdoor",
        ip: cameraIPs.v2,
        videoUrl: "/videos/v2.mp4"
      },
      {
        id: "v3",
        name: "Camera 3 - Server Room",
        location: "Building B - Floor 2",
        ip: cameraIPs.v3,
        videoUrl: "/videos/v3.mp4"
      },
      {
        id: "v4",
        name: "Camera 4 - Lobby",
        location: "Building A - Ground Floor",
        ip: cameraIPs.v4,
        videoUrl: "/videos/v4.mp4"
      },
      {
        id: "v5",
        name: "Camera 5 - Emergency Exit",
        location: "Building B - Floor 3",
        ip: cameraIPs.v5,
        videoUrl: "/videos/v5.mp4"
      }
    ];
    res.json({ success: true, cameras });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simulate external IP access (intrusion detection)
app.post("/api/camera-access/:cameraId", (req, res) => {
  try {
    const { cameraId } = req.params;
    const { sourceIP, sourcePort } = req.body;
    
    let isIntrusion = false;
    let threatType = "";
    
    // Check for unauthorized IP (external network)
    if (sourceIP && !sourceIP.startsWith("192.168.1")) {
      isIntrusion = true;
      threatType = "External IP Access";
    }
    
    // Check for wrong port
    if (sourcePort && sourcePort != AUTHORIZED_PORT) {
      isIntrusion = true;
      threatType = threatType ? `${threatType} & Unauthorized Port` : "Unauthorized Port Access";
    }
    
    if (isIntrusion) {
      const alert = {
        id: Date.now(),
        cameraId,
        cameraIP: cameraIPs[cameraId],
        sourceIP: sourceIP || "Unknown",
        sourcePort: sourcePort || "Unknown",
        authorizedPort: AUTHORIZED_PORT,
        threatType,
        timestamp: new Date().toISOString(),
        message: `${threatType} detected on ${cameraIPs[cameraId]}`
      };
      intrusionAlerts.push(alert);
      
      res.json({
        success: true,
        alert: true,
        message: `CRITICAL ALERT: ${threatType} detected!`,
        details: alert
      });
    } else {
      res.json({ success: true, alert: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get intrusion alerts
app.get("/api/intrusion-alerts", (req, res) => {
  try {
    res.json({ success: true, alerts: intrusionAlerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get worldwide devices
app.get("/api/devices-worldwide", (req, res) => {
  try {
    const devices = readCSV("cctv_devices_worldwide.csv");
    res.json({ success: true, devices, count: devices.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get devices with CVE mappings
app.get("/api/devices-with-cves", (req, res) => {
  try {
    const devicesWithCVEs = readCSV("cctv_with_cves.csv");
    
    // Group CVEs by device
    const deviceMap = {};
    devicesWithCVEs.forEach(entry => {
      const key = `${entry.device_id}_${entry.manufacturer}_${entry.model}`;
      if (!deviceMap[key]) {
        deviceMap[key] = {
          device_id: entry.device_id,
          manufacturer: entry.manufacturer,
          model: entry.model,
          cves: []
        };
      }
      if (entry.cve_id && entry.cve_id !== 'None') {
        deviceMap[key].cves.push({
          cve_id: entry.cve_id,
          severity: entry.cve_severity,
          vulnerability: entry.vulnerability,
          description: entry.cve_description
        });
      }
    });
    
    const result = Object.values(deviceMap);
    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get CVE database
app.get("/api/cve-database", (req, res) => {
  try {
    const cveReference = readCSV("cve_reference.csv");
    res.json({ success: true, cves: cveReference, count: cveReference.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start new scan
app.post("/api/scan/start", async (req, res) => {
  try {
    const { ipRange, manufacturer, model, ports, batchSize } = req.body;

    if (!ipRange) {
      return res.status(400).json({ success: false, error: "IP range is required" });
    }

    // Check if scan is already running
    if (activeScanner) {
      return res.status(409).json({ 
        success: false, 
        error: "Scan already in progress",
        progress: activeScanner.getProgress()
      });
    }

    // Create new scanner
    activeScanner = new CCTVScanner();

    // Start scan asynchronously
    const scanOptions = {
      manufacturer,
      model,
      ports: ports || [80, 443, 554, 8000, 8080, 9000, 37777],
      batchSize: batchSize || 10
    };

    // Run scan in background
    activeScanner.scan(ipRange, scanOptions)
      .then(results => {
        console.log('Scan completed:', results.devicesFound, 'devices found');
        
        // Save results to CSV
        const timestamp = Date.now();
        const resultsCSV = results.results.map(r => ({
          timestamp,
          ip_address: r.ip,
          manufacturer: r.manufacturer,
          model: r.model,
          firmware: r.firmware,
          open_ports: r.openPorts.join(';'),
          vulnerabilities: r.vulnerabilities.length,
          risk_level: r.riskLevel,
          services: JSON.stringify(r.services)
        }));

        // Append to scan results file
        const csvHeader = 'timestamp,ip_address,manufacturer,model,firmware,open_ports,vulnerabilities,risk_level,services\n';
        const csvRows = resultsCSV.map(r => 
          `${r.timestamp},"${r.ip_address}","${r.manufacturer}","${r.model}","${r.firmware}","${r.open_ports}",${r.vulnerabilities},"${r.risk_level}","${r.services}"`
        ).join('\n');

        fs.appendFileSync(
          path.join(__dirname, '..', 'data', 'scan_results_live.csv'),
          resultsCSV.length > 0 ? (fs.existsSync(path.join(__dirname, '..', 'data', 'scan_results_live.csv')) ? '' : csvHeader) + csvRows + '\n' : ''
        );
      })
      .catch(error => {
        console.error('Scan error:', error);
      })
      .finally(() => {
        // Clear scanner after 5 minutes
        setTimeout(() => {
          activeScanner = null;
        }, 300000);
      });

    res.json({
      success: true,
      message: "Scan started successfully",
      scanId: Date.now(),
      estimatedTime: `Scanning ${ipRange}...`
    });

  } catch (error) {
    activeScanner = null;
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scan progress
app.get("/api/scan/progress", (req, res) => {
  if (!activeScanner) {
    return res.json({
      success: true,
      scanning: false,
      message: "No active scan"
    });
  }

  const progress = activeScanner.getProgress();
  res.json({
    success: true,
    scanning: true,
    progress: progress.percentage,
    current: progress.current,
    total: progress.total
  });
});

// Get scan results
app.get("/api/scan/results", (req, res) => {
  if (!activeScanner) {
    return res.json({
      success: false,
      error: "No active or recent scan"
    });
  }

  const progress = activeScanner.getProgress();
  
  res.json({
    success: true,
    completed: progress.percentage === 100,
    progress: progress.percentage,
    devicesFound: activeScanner.results.length,
    results: activeScanner.results,
    summary: {
      critical: activeScanner.results.filter(r => r.riskLevel === 'Critical').length,
      high: activeScanner.results.filter(r => r.riskLevel === 'High').length,
      medium: activeScanner.results.filter(r => r.riskLevel === 'Medium').length,
      low: activeScanner.results.filter(r => r.riskLevel === 'Low').length
    }
  });
});

// Stop active scan
app.post("/api/scan/stop", (req, res) => {
  if (activeScanner) {
    activeScanner = null;
    res.json({ success: true, message: "Scan stopped" });
  } else {
    res.json({ success: false, error: "No active scan to stop" });
  }
});

// CCTV Guard Bot - Security recommendations using NVIDIA API (presented as Gemini)
app.post("/api/bot-guidance", async (req, res) => {
  try {
    const { context } = req.body;
    
    const systemPrompt = `You are CCTV Guard Bot, an AI security assistant powered by Google Gemini. Your role is to provide proactive security guidance and recommendations for CCTV systems. 

Provide concise, actionable security advice based on the current system status. Focus on:
- Security best practices
- Threat prevention
- System hardening
- Monitoring recommendations

Keep responses brief (2-3 sentences) and professional. Context: ${context || 'General security monitoring'}`;

    const completion = await client.chat.completions.create({
      model: "moonshotai/kimi-k2-thinking",
      messages: [{ role: "user", content: systemPrompt }],
      temperature: 1,
      top_p: 0.9,
      max_tokens: 256,
      stream: false
    });

    const guidance = completion.choices[0].message.content;
    res.json({ success: true, guidance, model: "Google Gemini" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ====================================================================================================
// ALERT & NOTIFICATION ENDPOINTS
// ====================================================================================================

// Get all active alerts
app.get("/api/alerts", (req, res) => {
  try {
    const alertsFile = path.join(__dirname, "..", "data", "active_alerts.json");
    if (!fs.existsSync(alertsFile)) {
      return res.json({ success: true, count: 0, data: [] });
    }
    
    const alerts = JSON.parse(fs.readFileSync(alertsFile, "utf8"));
    
    // Filter by severity if specified
    const { severity, status } = req.query;
    let filtered = alerts;
    
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity.toUpperCase());
    }
    
    if (status) {
      if (status === 'active') {
        filtered = filtered.filter(a => !a.resolved);
      } else if (status === 'resolved') {
        filtered = filtered.filter(a => a.resolved);
      }
    }
    
    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get alert statistics
app.get("/api/alerts/statistics", (req, res) => {
  try {
    const alertsFile = path.join(__dirname, "..", "data", "active_alerts.json");
    const historyFile = path.join(__dirname, "..", "data", "alert_history.json");
    
    let allAlerts = [];
    if (fs.existsSync(alertsFile)) {
      allAlerts = JSON.parse(fs.readFileSync(alertsFile, "utf8"));
    }
    
    let history = [];
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
    }
    
    const activeAlerts = allAlerts.filter(a => !a.resolved);
    
    const stats = {
      total_alerts: history.length || allAlerts.length,
      active_alerts: activeAlerts.length,
      resolved_alerts: allAlerts.filter(a => a.resolved).length,
      acknowledged_alerts: activeAlerts.filter(a => a.acknowledged).length,
      by_severity: {
        CRITICAL: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
        HIGH: activeAlerts.filter(a => a.severity === 'HIGH').length,
        MEDIUM: activeAlerts.filter(a => a.severity === 'MEDIUM').length,
        LOW: activeAlerts.filter(a => a.severity === 'LOW').length
      },
      recent_alerts: allAlerts.slice(0, 10)
    };
    
    res.json({ success: true, statistics: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Acknowledge an alert
app.post("/api/alerts/:alertId/acknowledge", (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledged_by } = req.body;
    
    const alertsFile = path.join(__dirname, "..", "data", "active_alerts.json");
    const alerts = JSON.parse(fs.readFileSync(alertsFile, "utf8"));
    
    const alert = alerts.find(a => a.alert_id === alertId);
    if (!alert) {
      return res.status(404).json({ success: false, error: "Alert not found" });
    }
    
    alert.acknowledged = true;
    alert.acknowledged_by = acknowledged_by || 'System';
    alert.acknowledged_at = new Date().toISOString();
    
    fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    
    // Broadcast update
    broadcastAlert({
      ...alert,
      action: 'acknowledged'
    });
    
    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve an alert
app.post("/api/alerts/:alertId/resolve", (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolved_by, resolution_notes } = req.body;
    
    const alertsFile = path.join(__dirname, "..", "data", "active_alerts.json");
    const alerts = JSON.parse(fs.readFileSync(alertsFile, "utf8"));
    
    const alert = alerts.find(a => a.alert_id === alertId);
    if (!alert) {
      return res.status(404).json({ success: false, error: "Alert not found" });
    }
    
    alert.resolved = true;
    alert.resolved_by = resolved_by || 'System';
    alert.resolved_at = new Date().toISOString();
    alert.resolution_notes = resolution_notes || '';
    alert.status = 'RESOLVED';
    
    fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    
    // Broadcast update
    broadcastAlert({
      ...alert,
      action: 'resolved'
    });
    
    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Broadcast alert (webhook endpoint for notification service)
app.post("/api/alerts/broadcast", (req, res) => {
  try {
    const alert = req.body;
    broadcastAlert(alert);
    res.json({ 
      success: true, 
      message: "Alert broadcasted", 
      clients: wsClients.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get comprehensive recommendations
app.get("/api/comprehensive-recommendations", (req, res) => {
  try {
    const recsFile = path.join(__dirname, "..", "data", "cctv_comprehensive_recommendations.json");
    if (!fs.existsSync(recsFile)) {
      return res.status(404).json({ success: false, error: "Recommendations not found" });
    }
    
    const recommendations = JSON.parse(fs.readFileSync(recsFile, "utf8"));
    
    // Filter by parameters
    const { risk_level, manufacturer, priority_min } = req.query;
    let filtered = recommendations;
    
    if (risk_level) {
      filtered = filtered.filter(r => r.ml_risk_level === risk_level);
    }
    
    if (manufacturer) {
      filtered = filtered.filter(r => 
        r.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
      );
    }
    
    if (priority_min) {
      filtered = filtered.filter(r => r.priority_score >= parseFloat(priority_min));
    }
    
    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 CCTV Guard Backend running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🔌 WebSocket server listening for real-time alerts`);
});
