import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Play,
  Square,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Globe,
  Network,
  Activity,
} from "lucide-react";
import Header from "../components/common/Header";

const ScannerPage = () => {
  const [ipRange, setIpRange] = useState("192.168.1.0/24");
  const [manufacturer, setManufacturer] = useState("All");
  const [model, setModel] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    if (scanning) {
      interval = setInterval(checkProgress, 2000);
    }
    return () => clearInterval(interval);
  }, [scanning]);

  const checkProgress = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/scan/progress");
      const data = await response.json();

      if (data.success) {
        if (!data.scanning) {
          // Scan completed
          setScanning(false);
          fetchResults();
        } else {
          setProgress(data.progress);
        }
      }
    } catch (error) {
      console.error("Error checking progress:", error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/scan/results");
      const data = await response.json();

      if (data.success) {
        setScanResults(data);
        if (data.completed) {
          setScanning(false);
          setProgress(100);
        }
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };

  const startScan = async () => {
    try {
      setError(null);
      setScanResults(null);
      setProgress(0);

      const response = await fetch("http://localhost:5001/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipRange,
          manufacturer: manufacturer !== "All" ? manufacturer : undefined,
          model: model || undefined,
          ports: [80, 443, 554, 8000, 8080, 9000, 37777],
          batchSize: 10
        })
      });

      const data = await response.json();

      if (data.success) {
        setScanning(true);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const stopScan = async () => {
    try {
      await fetch("http://localhost:5001/api/scan/stop", { method: "POST" });
      setScanning(false);
    } catch (error) {
      console.error("Error stopping scan:", error);
    }
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case "Critical": return "text-red-500";
      case "High": return "text-orange-500";
      case "Medium": return "text-yellow-500";
      case "Low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getRiskBg = (risk) => {
    switch(risk) {
      case "Critical": return "bg-red-900 text-red-200";
      case "High": return "bg-orange-900 text-orange-200";
      case "Medium": return "bg-yellow-900 text-yellow-200";
      case "Low": return "bg-green-900 text-green-200";
      default: return "bg-gray-900 text-gray-200";
    }
  };

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Advanced CCTV Scanner" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        {/* Scanner Control Panel */}
        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg p-6 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Network Scanner</h2>
              <p className="text-sm text-gray-400 mt-1">
                Scan IP ranges for CCTV cameras and discover vulnerabilities
              </p>
            </div>
            <Shield className="text-blue-400" size={40} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IP Range (CIDR)
              </label>
              <input
                type="text"
                value={ipRange}
                onChange={(e) => setIpRange(e.target.value)}
                placeholder="192.168.1.0/24"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                disabled={scanning}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: 192.168.1.0/24, 10.0.0.0/16
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Manufacturer Filter
              </label>
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={scanning}
              >
                <option value="All">All Manufacturers</option>
                <option value="hikvision">Hikvision</option>
                <option value="dahua">Dahua</option>
                <option value="cpplus">CP Plus</option>
                <option value="axis">Axis</option>
                <option value="vivotek">Vivotek</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Model Filter (Optional)
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="DS-2CD2, IPC-HFW..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                disabled={scanning}
              />
            </div>
          </div>

          <div className="flex gap-4">
            {!scanning ? (
              <button
                onClick={startScan}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Play size={20} />
                Start Scan
              </button>
            ) : (
              <button
                onClick={stopScan}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Square size={20} />
                Stop Scan
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900 bg-opacity-50 rounded-lg border border-red-600">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
        </motion.div>

        {/* Scanning Progress */}
        {scanning && (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg p-6 mb-8 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader className="animate-spin text-blue-400" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Scanning in Progress...</h3>
                  <p className="text-sm text-gray-400">Discovering devices on {ipRange}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-400">{progress}%</span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <Activity className="mx-auto text-blue-400 mb-2" size={24} />
                <p className="text-sm text-gray-400">Scanning Hosts</p>
                <p className="text-xl font-bold text-gray-200">{scanResults?.progress || 0}%</p>
              </div>
              <div className="text-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <Network className="mx-auto text-green-400 mb-2" size={24} />
                <p className="text-sm text-gray-400">Devices Found</p>
                <p className="text-xl font-bold text-gray-200">{scanResults?.devicesFound || 0}</p>
              </div>
              <div className="text-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <AlertTriangle className="mx-auto text-red-400 mb-2" size={24} />
                <p className="text-sm text-gray-400">Critical Risks</p>
                <p className="text-xl font-bold text-gray-200">{scanResults?.summary?.critical || 0}</p>
              </div>
              <div className="text-center p-3 bg-gray-700 bg-opacity-50 rounded-lg">
                <Shield className="mx-auto text-yellow-400 mb-2" size={24} />
                <p className="text-sm text-gray-400">Total Vulnerabilities</p>
                <p className="text-xl font-bold text-gray-200">
                  {scanResults?.results?.reduce((sum, r) => sum + r.vulnerabilities.length, 0) || 0}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scan Results */}
        {scanResults && scanResults.devicesFound > 0 && (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg border border-gray-700 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-100">Scan Results</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Found {scanResults.devicesFound} devices | {scanResults.summary.critical} Critical | {scanResults.summary.high} High Risk
                  </p>
                </div>
                <button
                  onClick={fetchResults}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Refresh Results
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Manufacturer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Open Ports</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Vulnerabilities</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Services</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {scanResults.results.map((device, idx) => (
                    <tr key={idx} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-300">{device.ip}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300 capitalize">{device.manufacturer}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {device.openPorts.map(port => (
                            <span key={port} className="text-xs px-2 py-1 bg-blue-900 text-blue-200 rounded">
                              {port}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBg(device.riskLevel)}`}>
                          {device.riskLevel === "Critical" && <XCircle className="w-3 h-3 mr-1" />}
                          {device.riskLevel === "High" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {device.riskLevel === "Medium" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {device.riskLevel === "Low" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {device.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold">{device.vulnerabilities.length}</span> found
                          {device.vulnerabilities.length > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              {device.vulnerabilities.map((v, i) => (
                                <div key={i}>{v.type}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-400">
                          {device.services.map((s, i) => (
                            <div key={i}>{s.service} ({s.port})</div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {scanResults && scanResults.devicesFound === 0 && !scanning && (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg p-12 border border-gray-700 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Search className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Devices Found</h3>
            <p className="text-gray-400">
              No CCTV devices were discovered in the specified IP range. Try a different range or adjust filters.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ScannerPage;
