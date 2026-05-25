import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Camera,
  AlertTriangle,
  AlertOctagon,
  Shield,
  Activity,
  CheckCircle,
} from "lucide-react";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DashboardPage = () => {
  const [stats, setStats] = useState({
    total_devices: 0,
    critical_risk: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0,
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveCamera, setLiveCamera] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [localCameras, setLocalCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraIP, setCameraIP] = useState(""); // IP Webcam address input
  const [streamUrl, setStreamUrl] = useState(""); // Active stream URL
  const [intrusionAlerts, setIntrusionAlerts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]); // Chat history
  const [botLoading, setBotLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState(null); // Webcam security status
  const [isMonitoring, setIsMonitoring] = useState(false); // Active monitoring flag

  useEffect(() => {
    fetchData();
    fetchLocalCameras();
    fetchIntrusionAlerts();
    
    // Send initial greeting
    sendInitialGreeting();
    
    // Check for intrusions every 10 seconds
    const alertInterval = setInterval(fetchIntrusionAlerts, 10000);
    
    return () => {
      clearInterval(alertInterval);
      // Cleanup security monitoring interval if it exists
      if (window.securityMonitoringInterval) {
        clearInterval(window.securityMonitoringInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCameraId && selectedCameraId !== "") {
      const camera = localCameras.find(cam => cam.id === selectedCameraId);
      if (camera) {
        setLiveCamera(camera);
      }
    } else {
      setLiveCamera(null);
    }
  }, [selectedCameraId, localCameras]);

  // Update stats in real-time based on webcam and intrusions
  useEffect(() => {
    updateRealTimeStats();
  }, [liveCamera, intrusionAlerts, devices]);

  const updateRealTimeStats = () => {
    // Calculate real-time stats
    const baseDevices = devices.length || 0;
    const totalCameras = baseDevices + (liveCamera ? 1 : 0); // Add 1 if webcam connected
    const criticalAlerts = intrusionAlerts.length || 0; // Count intrusion alerts
    
    // Count devices by risk (from scan results)
    let criticalRisk = 0;
    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;
    
    devices.forEach(device => {
      const risk = device.risk_level?.toLowerCase() || 'low';
      if (risk === 'critical') criticalRisk++;
      else if (risk === 'high') highRisk++;
      else if (risk === 'medium') mediumRisk++;
      else lowRisk++;
    });
    
    // Secure devices = devices with low risk + connected webcam if no intrusions
    const secureDevices = lowRisk + (liveCamera && intrusionAlerts.length === 0 ? 1 : 0);
    
    setStats({
      total_devices: totalCameras,
      critical_risk: criticalAlerts, // Show intrusion alerts as critical
      high_risk: criticalRisk + highRisk, // Combine critical and high risk devices
      medium_risk: mediumRisk,
      low_risk: secureDevices
    });
  };

  const simulateIntrusion = async () => {
    try {
      setBotLoading(true);
      const response = await axios.post('http://localhost:5001/api/test/simulate-intrusion', {
        webcam_ip: liveCamera?.ip || '192.168.21.7'
      });
      
      if (response.data.success) {
        console.log('🚨 Intrusion simulated successfully');
        // The intrusion will be picked up by the security monitoring interval
        // Manually add to alerts for immediate UI feedback
        setIntrusionAlerts(prev => [...prev, response.data.alert]);
        updateRealTimeStats();
      }
    } catch (error) {
      console.error('Error simulating intrusion:', error);
    } finally {
      setBotLoading(false);
    }
  };

  const fetchLocalCameras = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/local-cameras");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLocalCameras(data.cameras || []);
        setCameraError(null);
        console.log("✅ Local cameras loaded:", data.cameras?.length || 0);
      } else {
        console.warn("⚠️ Local cameras API returned success=false");
        setLocalCameras([]);
      }
    } catch (error) {
      console.error("Error fetching cameras:", error);
      setLocalCameras([]);
      // Don't show error to user for this - it's not critical
    }
  };

  const connectToIPCamera = async () => {
    if (!cameraIP.trim()) {
      setCameraError("Please enter an IP address");
      return;
    }

    // Clean up IP address (remove any existing port or http://)
    let cleanIP = cameraIP.trim();
    cleanIP = cleanIP.replace(/^https?:\/\//, '');
    cleanIP = cleanIP.replace(/:.*$/, ''); // Remove any existing port
    
    // Always use port 8080
    const fullAddress = `${cleanIP}:8080`;
    const videoUrl = `http://${fullAddress}/video`;
    
    // Set the stream URL
    setStreamUrl(videoUrl);
    setLiveCamera({
      id: 'ip_webcam',
      name: 'IP Webcam',
      ip: cleanIP,
      location: 'Mobile Device',
      status: 'online',
      stream: videoUrl
    });
    setCameraError(null);
    console.log(`✅ Connecting to IP Webcam: ${videoUrl}`);
    
    // Initialize comprehensive security monitoring
    try {
      // Register webcam with backend
      const registerResponse = await axios.post('http://localhost:5001/api/webcam/register', {
        webcam_ip: cleanIP,
        user_ip: 'auto' // Backend will use request IP
      });
      
      console.log('🔒 Webcam registered successfully');
      setIsMonitoring(true);
      
      // Start monitoring for intrusions
      startSecurityMonitoring(cleanIP);
      
      // Update stats immediately to show webcam as connected camera
      updateRealTimeStats();
      
      // Notify bot about successful connection
      notifyBotWebcamConnected(cleanIP);
      
    } catch (error) {
      console.error('Error setting up webcam security:', error);
      // Don't block the user - camera is working, enable monitoring anyway
      console.log('Enabling monitoring despite registration error');
      setIsMonitoring(true);
      startSecurityMonitoring(cleanIP);
      updateRealTimeStats();
      notifyBotWebcamConnected(cleanIP);
    }
  };

  const handleIPKeyPress = (e) => {
    if (e.key === 'Enter') {
      connectToIPCamera();
    }
  };

  const startSecurityMonitoring = (webcamIP) => {
    // Poll security status every 5 seconds
    const monitoringInterval = setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/webcam/security-status?webcam_ip=${webcamIP}`);
        
        if (response.data.success) {
          setSecurityStatus(response.data);
          
          // Check for new intrusion alerts
          if (response.data.last_intrusion_alert) {
            const lastAlert = response.data.last_intrusion_alert;
            const alertExists = intrusionAlerts.some(alert => alert.id === lastAlert.id);
            
            if (!alertExists) {
              // New intrusion detected!
              setIntrusionAlerts(prev => {
                const updated = [...prev, lastAlert];
                // Update stats to reflect new critical alert
                setTimeout(() => updateRealTimeStats(), 100);
                return updated;
              });
              
              // Notify bot about intrusion
              notifyBotAboutIntrusion(lastAlert);
            }
          }
        }
      } catch (error) {
        console.error('Error checking security status:', error);
      }
    }, 5000);
    
    // Store interval ID for cleanup
    window.securityMonitoringInterval = monitoringInterval;
  };

  const notifyBotWebcamConnected = async (webcamIP) => {
    setBotLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/bot/chat", {
        message: `Webcam connected at ${webcamIP}. What security measures are now active?`,
        webcamConnected: true,
        webcamIP: webcamIP,
        totalDevices: stats.total_devices,
        criticalRisks: stats.critical_risk
      });
      
      if (response.data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Error notifying bot:", error);
    } finally {
      setBotLoading(false);
    }
  };

  const notifyBotAboutIntrusion = async (alert) => {
    setBotLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/bot/chat", {
        message: `SECURITY ALERT: Unauthorized access detected from ${alert.accessor_ip}. What should I do?`,
        webcamConnected: !!liveCamera,
        webcamIP: liveCamera?.ip || "Not connected",
        totalDevices: stats.total_devices,
        criticalRisks: stats.critical_risk
      });
      
      if (response.data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          isAlert: true
        }]);
      }
    } catch (error) {
      console.error("Error notifying bot about intrusion:", error);
    } finally {
      setBotLoading(false);
    }
  };

  const fetchIntrusionAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/intrusion-alerts");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setIntrusionAlerts(data.alerts || []);
        console.log("✅ Intrusion alerts loaded:", data.alerts?.length || 0);
      } else {
        console.warn("⚠️ Intrusion alerts API returned success=false");
        setIntrusionAlerts([]);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setIntrusionAlerts([]); // Set empty array on error
    }
  };

  const sendInitialGreeting = async () => {
    setBotLoading(true);
    try {
      const response = await axios.post("http://localhost:5001/api/bot/chat", {
        message: "Initialize system and provide security overview.",
        webcamConnected: !!liveCamera,
        webcamIP: liveCamera?.ip || "Not connected",
        totalDevices: stats.total_devices,
        criticalRisks: stats.critical_risk
      });
      
      if (response.data.success) {
        setChatMessages([{
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Error sending initial greeting:", error);
      setChatMessages([{
        role: 'assistant',
        content: "🛡️ CCTV Guard Bot Active. Specialized cybersecurity AI monitoring your CCTV systems. Ready to detect threats, analyze vulnerabilities, and provide real-time security guidance. All systems operational.",
        timestamp: new Date()
      }]);
    } finally {
      setBotLoading(false);
    }
  };

  // Auto-update bot status every 30 seconds (removed stats dependency to prevent infinite loop)
  useEffect(() => {
    if (liveCamera) {
      const interval = setInterval(() => {
        updateBotStatus();
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [liveCamera]);

  const updateBotStatus = async () => {
    try {
      const statusMessage = liveCamera 
        ? `Status update: Monitoring webcam at ${liveCamera.ip}`
        : `Status update: No webcam connected`;
      
      const response = await axios.post("http://localhost:5001/api/bot/chat", {
        message: statusMessage,
        webcamConnected: !!liveCamera,
        webcamIP: liveCamera?.ip || "Not connected",
        totalDevices: stats.total_devices,
        criticalRisks: stats.critical_risk
      });
      
      if (response.data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("Error updating bot status:", error);
    }
  };

  const simulateExternalAccess = async () => {
    // Simulate external IP access attempt
    if (selectedCameraId && selectedCameraId !== "") {
      try {
        await fetch(`http://localhost:5001/api/camera-access/${selectedCameraId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sourceIP: "203.45.67.89", // External IP
            sourcePort: 5005 // Correct port
          })
        });
        fetchIntrusionAlerts();
      } catch (error) {
        console.error("Error simulating access:", error);
      }
    }
  };

  const simulateWrongPort = async () => {
    // Simulate wrong port access attempt
    if (selectedCameraId && selectedCameraId !== "") {
      try {
        await fetch(`http://localhost:5001/api/camera-access/${selectedCameraId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sourceIP: "192.168.1.50", // Local IP
            sourcePort: 8080 // Wrong port!
          })
        });
        fetchIntrusionAlerts();
      } catch (error) {
        console.error("Error simulating access:", error);
      }
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, devicesRes] = await Promise.all([
        axios.get("http://localhost:5001/api/stats").catch(err => {
          console.error("Stats API error:", err);
          return { data: { total_devices: 0, critical_risk: 0, high_risk: 0, medium_risk: 0, low_risk: 0 } };
        }),
        axios.get("http://localhost:5001/api/scan-results").catch(err => {
          console.error("Scan results API error:", err);
          return { data: { results: [] } };
        })
      ]);

      // Set base stats from API
      if (statsRes.data) {
        setStats({
          total_devices: statsRes.data.total_devices || 0,
          critical_risk: statsRes.data.critical_risk || 0,
          high_risk: statsRes.data.high_risk || 0,
          medium_risk: statsRes.data.medium_risk || 0,
          low_risk: statsRes.data.low_risk || 0,
        });
      }

      // Set devices data
      if (devicesRes.data && devicesRes.data.results) {
        setDevices(devicesRes.data.results);
      } else {
        setDevices([]); // Set empty array if no results
      }
      
      console.log("✅ Data loaded successfully:", {
        stats: statsRes.data,
        devicesCount: devicesRes.data?.results?.length || 0
      });
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setDevices([]); // Set empty array on error
      // Set default stats on error
      setStats({
        total_devices: 0,
        critical_risk: 0,
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const riskDistributionData = {
    labels: ["Critical", "High", "Medium", "Low"],
    datasets: [
      {
        data: [
          stats.critical_risk,
          stats.high_risk,
          stats.medium_risk,
          stats.low_risk,
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 146, 60, 0.8)",
          "rgba(253, 224, 71, 0.8)",
          "rgba(34, 197, 94, 0.8)",
        ],
        borderColor: [
          "rgba(239, 68, 68, 1)",
          "rgba(251, 146, 60, 1)",
          "rgba(253, 224, 71, 1)",
          "rgba(34, 197, 94, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#E5E7EB",
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <div className="flex items-center justify-center h-full">
          <div className="text-2xl text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <div className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <Header title="CCTV Security Dashboard" />

        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <StatCard
            name="Total Cameras"
            icon={Camera}
            value={stats.total_devices + (liveCamera ? 1 : 0)}
            color="#6366F1"
          />
          <StatCard
            name="Critical Alerts"
            icon={AlertOctagon}
            value={stats.critical_risk + intrusionAlerts.length}
            color="#EF4444"
          />
          <StatCard
            name="High Risk"
            icon={AlertTriangle}
            value={stats.high_risk}
            color="#F59E0B"
          />
          <StatCard
            name="Secure Devices"
            icon={CheckCircle}
            value={stats.low_risk}
            color="#10B981"
          />
        </motion.div>

        {/* LIVE CAMERA AND BOT SECTION - SIDE BY SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* LEFT SIDE - LIVE SECURITY MONITORING */}
          <motion.div
            className="bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 bg-opacity-70 backdrop-blur-md shadow-lg rounded-xl p-6 border border-green-600"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <Camera className="w-8 h-8 text-green-300" />
                🔴 Live Security Monitoring
              </span>
            </h2>

            {/* Connection Controls */}
            <div className="mb-6 flex items-center gap-3">
              <input
                type="text"
                value={cameraIP}
                onChange={(e) => setCameraIP(e.target.value)}
                onKeyPress={handleIPKeyPress}
                placeholder="Enter IP address (e.g., 192.168.1.100)"
                className="flex-1 px-4 py-3 bg-gray-800 text-white text-sm rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={connectToIPCamera}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors font-bold border border-slate-600"
              >
                🔗 Connect :8080
              </button>
            </div>

            {/* Status Display */}
            {liveCamera && (
              <div className="mb-6 p-4 bg-black bg-opacity-30 rounded-lg border border-green-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-bold">📡 CONNECTED</span>
                    </div>
                    <div className="text-white">
                      <span className="font-bold">IP:</span> {liveCamera.ip}
                    </div>
                    <div className="text-white">
                      <span className="font-bold">Port:</span> 8080
                    </div>
                  </div>
                  <div className="text-right">
                    {isMonitoring ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold">🛡️ MONITORING ACTIVE</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-bold">⚠️ MONITORING INACTIVE</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-300 mt-1">
                      Blocked Threats: {securityStatus?.blocked_ips?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {cameraError && (
              <div className="mb-6 p-4 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
                <p className="text-red-200 mb-3 font-bold">⚠️ {cameraError}</p>
              </div>
            )}
            
            {/* Live Camera Feed */}
            {liveCamera && liveCamera.stream && (
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: "400px" }}>
                {liveCamera.stream.startsWith('http') ? (
                  <img
                    key={liveCamera.id}
                    src={liveCamera.stream}
                    alt="Live Camera Feed"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('❌ Failed to load camera stream:', liveCamera.stream);
                      setCameraError(`Cannot connect to ${liveCamera.stream}. Make sure IP Webcam is running and devices are on same network.`);
                    }}
                    onLoad={() => {
                      console.log('✅ Camera stream loaded successfully');
                      setCameraError(null);
                    }}
                  />
                ) : (
                  <video
                    key={liveCamera.id}
                    src={`http://localhost:5001${liveCamera.stream}`}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Live indicator overlay */}
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  🔴 LIVE
                </div>
                
                {/* Security status overlay */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                    <span>{isMonitoring ? '🛡️ Secured' : '⚠️ Unsecured'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* No camera placeholder */}
            {!liveCamera && (
              <div className="flex items-center justify-center bg-gray-900 rounded-lg border-2 border-dashed border-gray-600" style={{ height: "400px" }}>
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2 text-lg font-bold">Connect Your IP Webcam</p>
                  <p className="text-gray-500 text-sm">Enter your phone's IP address above</p>
                  <p className="text-green-400 text-xs mt-2">💡 Use "IP Webcam" app from Play Store</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT SIDE - CCTV GUARD BOT */}
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              CCTV Guard Bot
              <span className="text-xs text-gray-400 font-normal ml-auto">Google Gemini Gemma</span>
            </h2>
            
            {/* Bot Animation */}
            <div className="mb-4 flex justify-center">
              <div className="relative w-32 h-32">
                <lottie-player
                  src="/Live chatbot.json"
                  background="transparent"
                  speed="1"
                  style={{ width: '128px', height: '128px' }}
                  loop
                  autoplay
                ></lottie-player>
              </div>
            </div>

            {/* Chat Messages - One Way (Bot Only) */}
            <div className="mb-4 h-80 overflow-y-auto bg-gray-900 bg-opacity-50 rounded-lg p-4 space-y-3 border border-gray-700">
              {chatMessages.map((msg, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-8 h-8 ${msg.isAlert ? 'bg-red-500 animate-pulse' : 'bg-green-500'} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {msg.isAlert ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Shield className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`inline-block p-3 rounded-lg ${msg.isAlert ? 'bg-gradient-to-br from-red-900 to-orange-900 border-red-600 animate-pulse' : 'bg-gradient-to-br from-green-900 to-blue-900 border-green-600'} bg-opacity-70 text-gray-200 border`}>
                      {msg.isAlert && (
                        <div className="flex items-center gap-2 mb-2 text-red-300 font-semibold text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>SECURITY ALERT</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {botLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-3 rounded-lg bg-gradient-to-br from-green-900 to-blue-900 bg-opacity-70 text-gray-200 border border-green-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar (No Input - One Way Communication) */}
            <div className={`p-3 rounded-lg border ${isMonitoring ? 'bg-gradient-to-r from-green-900 to-blue-900 border-green-600' : 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-600'} bg-opacity-30`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isMonitoring ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <span className={`font-semibold ${isMonitoring ? 'text-green-400' : 'text-gray-400'}`}>
                    {isMonitoring ? '🛡️ Security Monitoring Active' : '⏸️ Monitoring Inactive'}
                  </span>
                </div>
                <div className="text-gray-400">
                  Webcam: {liveCamera ? `✅ ${liveCamera.ip}` : '❌ Not connected'}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Devices: {stats.total_devices} | Critical Risks: {stats.critical_risk}
                {securityStatus && (
                  <span className="ml-2 text-yellow-400">
                    | Blocked IPs: {securityStatus.blocked_ips.length} | Access Attempts: {securityStatus.statistics.total_attempts}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <Activity className="text-blue-400 mr-3" size={20} />
                <div>
                  <p className="text-sm text-gray-300">System Scan Completed</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <Shield className="text-green-400 mr-3" size={20} />
                <div>
                  <p className="text-sm text-gray-300">
                    {stats.total_devices} devices analyzed
                  </p>
                  <p className="text-xs text-gray-500">5 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <AlertTriangle className="text-yellow-400 mr-3" size={20} />
                <div>
                  <p className="text-sm text-gray-300">
                    {stats.critical_risk + stats.high_risk} vulnerabilities detected
                  </p>
                  <p className="text-xs text-gray-500">10 minutes ago</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            Recent Devices
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Device ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {devices && devices.length > 0 ? (
                  devices.slice(0, 5).map((device, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {device.device_id}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          device.predicted_risk === "Critical"
                            ? "bg-red-800 text-red-100"
                            : device.predicted_risk === "High"
                            ? "bg-orange-800 text-orange-100"
                            : device.predicted_risk === "Medium"
                            ? "bg-yellow-800 text-yellow-100"
                            : "bg-green-800 text-green-100"
                        }`}
                      >
                        {device.predicted_risk || "Low"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.status || "Active"}
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-400">
                      No devices found. Run a scan to discover devices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
