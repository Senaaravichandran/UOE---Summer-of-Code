import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Filter,
  MapPin,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Shield,
} from "lucide-react";
import Header from "../components/common/Header";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons based on risk level
const createCustomIcon = (riskLevel) => {
  const colors = {
    Critical: "#EF4444",
    High: "#F59E0B",
    Medium: "#EAB308",
    Low: "#10B981",
  };
  
  const color = colors[riskLevel] || "#6B7280";
  
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedManufacturer, setSelectedManufacturer] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [viewMode, setViewMode] = useState("map"); // "map" or "table"
  const [cveData, setCveData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  useEffect(() => {
    fetchDevices();
    fetchCVEData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [devices, searchTerm, selectedRegion, selectedManufacturer, selectedRisk]);

  const fetchDevices = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/devices-worldwide");
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices);
        calculateStats(data.devices);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setLoading(false);
    }
  };

  const fetchCVEData = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/devices-with-cves");
      const data = await response.json();
      
      if (data.success) {
        setCveData(data.data);
      }
    } catch (error) {
      console.error("Error fetching CVE data:", error);
    }
  };

  const getDeviceCVEs = (deviceId, manufacturer, model) => {
    const match = cveData.find(d => 
      d.device_id === deviceId || 
      (d.manufacturer === manufacturer && d.model === model)
    );
    return match ? match.cves : [];
  };

  const calculateStats = (deviceList) => {
    setStats({
      total: deviceList.length,
      critical: deviceList.filter(d => d.risk_level === "Critical").length,
      high: deviceList.filter(d => d.risk_level === "High").length,
      medium: deviceList.filter(d => d.risk_level === "Medium").length,
      low: deviceList.filter(d => d.risk_level === "Low").length,
    });
  };

  const applyFilters = () => {
    let filtered = devices;

    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address?.includes(searchTerm) ||
        device.model?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRegion !== "All") {
      filtered = filtered.filter(device => device.region === selectedRegion);
    }

    if (selectedManufacturer !== "All") {
      filtered = filtered.filter(device => device.manufacturer === selectedManufacturer);
    }

    if (selectedRisk !== "All") {
      filtered = filtered.filter(device => device.risk_level === selectedRisk);
    }

    setFilteredDevices(filtered);
  };

  const getUniqueValues = (field) => {
    return ["All", ...new Set(devices.map(device => device[field]).filter(Boolean))];
  };

  const getRiskIcon = (risk) => {
    switch(risk) {
      case "Critical": return <XCircle className="w-4 h-4 text-red-500" />;
      case "High": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "Medium": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "Low": return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Worldwide CCTV Discovery" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md overflow-hidden shadow rounded-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <Globe className="text-blue-400 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Devices</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats.total}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md overflow-hidden shadow rounded-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <XCircle className="text-red-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-400">Critical Risk</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats.critical}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md overflow-hidden shadow rounded-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <AlertTriangle className="text-orange-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-400">High Risk</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats.high}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md overflow-hidden shadow rounded-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <AlertTriangle className="text-yellow-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-400">Medium Risk</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats.medium}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md overflow-hidden shadow rounded-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <CheckCircle className="text-green-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-400">Low Risk</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats.low}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg p-6 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by location, IP, manufacturer..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <select
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {getUniqueValues("region").map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
            >
              {getUniqueValues("manufacturer").map(mfr => (
                <option key={mfr} value={mfr}>{mfr}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
            >
              {getUniqueValues("risk_level").map(risk => (
                <option key={risk} value={risk}>{risk}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setViewMode("map")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                viewMode === "map"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <MapPin size={18} />
              Map View
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Filter size={18} />
              Table View
            </button>
            <div className="ml-auto text-sm text-gray-400 flex items-center">
              Showing {filteredDevices.length} of {devices.length} devices
            </div>
          </div>
        </motion.div>

        {/* Map or Table View */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-400">Loading devices...</div>
          </div>
        ) : viewMode === "map" ? (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg p-4 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{ height: "600px" }}
          >
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: "100%", width: "100%", borderRadius: "8px" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {filteredDevices.map((device) => (
                <Marker
                  key={device.device_id}
                  position={[parseFloat(device.latitude), parseFloat(device.longitude)]}
                  icon={createCustomIcon(device.risk_level)}
                  eventHandlers={{
                    click: () => setSelectedDevice(device),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-gray-900">{device.location}</p>
                      <p className="text-gray-700">{device.manufacturer} {device.model}</p>
                      <p className="text-gray-600">IP: {device.ip_address}</p>
                      <p className={`font-semibold ${
                        device.risk_level === "Critical" ? "text-red-600" :
                        device.risk_level === "High" ? "text-orange-600" :
                        device.risk_level === "Medium" ? "text-yellow-600" :
                        "text-green-600"
                      }`}>
                        Risk: {device.risk_level} ({device.vulnerabilities} vulns)
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>
        ) : (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow rounded-lg border border-gray-700 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Region</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Vulnerabilities</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.device_id}
                      className="hover:bg-gray-700 cursor-pointer"
                      onClick={() => setSelectedDevice(device)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Camera className="text-blue-400 mr-2" size={18} />
                          <div>
                            <div className="text-sm font-medium text-gray-200">{device.manufacturer}</div>
                            <div className="text-xs text-gray-400">{device.model}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="text-gray-400 mr-1" size={14} />
                          <span className="text-sm text-gray-300">{device.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                        {device.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {device.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          device.risk_level === "Critical" ? "bg-red-900 text-red-200" :
                          device.risk_level === "High" ? "bg-orange-900 text-orange-200" :
                          device.risk_level === "Medium" ? "bg-yellow-900 text-yellow-200" :
                          "bg-green-900 text-green-200"
                        }`}>
                          {getRiskIcon(device.risk_level)}
                          <span className="ml-1">{device.risk_level}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {device.vulnerabilities}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                          {device.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Device Detail Modal */}
        {selectedDevice && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedDevice(null)}
          >
            <motion.div
              className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-gray-700"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">Device Details</h2>
                  <p className="text-gray-400">{selectedDevice.location}</p>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400">Manufacturer</p>
                  <p className="text-lg font-semibold text-gray-200">{selectedDevice.manufacturer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Model</p>
                  <p className="text-lg font-semibold text-gray-200">{selectedDevice.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">IP Address</p>
                  <p className="text-lg font-mono text-gray-200">{selectedDevice.ip_address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Firmware</p>
                  <p className="text-lg font-semibold text-gray-200">{selectedDevice.firmware_version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Region</p>
                  <p className="text-lg font-semibold text-gray-200">{selectedDevice.region}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Country</p>
                  <p className="text-lg font-semibold text-gray-200">{selectedDevice.country}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Risk Assessment</p>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedDevice.risk_level === "Critical" ? "bg-red-900 text-red-200" :
                    selectedDevice.risk_level === "High" ? "bg-orange-900 text-orange-200" :
                    selectedDevice.risk_level === "Medium" ? "bg-yellow-900 text-yellow-200" :
                    "bg-green-900 text-green-200"
                  }`}>
                    {getRiskIcon(selectedDevice.risk_level)}
                    <span className="ml-2">{selectedDevice.risk_level} Risk</span>
                  </span>
                  <span className="text-gray-300">
                    {selectedDevice.vulnerabilities} vulnerabilities detected
                  </span>
                </div>
              </div>

              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Location Coordinates</p>
                <p className="text-gray-200 font-mono">
                  {selectedDevice.latitude}, {selectedDevice.longitude}
                </p>
              </div>

              {/* CVE Mappings */}
              <div className="mt-4 bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-300">CVE Mappings</p>
                  <span className="text-xs text-gray-400">
                    {getDeviceCVEs(selectedDevice.device_id, selectedDevice.manufacturer, selectedDevice.model).length} CVEs found
                  </span>
                </div>
                {getDeviceCVEs(selectedDevice.device_id, selectedDevice.manufacturer, selectedDevice.model).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getDeviceCVEs(selectedDevice.device_id, selectedDevice.manufacturer, selectedDevice.model).map((cve, idx) => (
                      <div key={idx} className="bg-gray-800 rounded p-3 border border-gray-600">
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-mono text-blue-400 text-sm">{cve.cve_id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            cve.severity === "Critical" ? "bg-red-900 text-red-200" :
                            cve.severity === "High" ? "bg-orange-900 text-orange-200" :
                            cve.severity === "Medium" ? "bg-yellow-900 text-yellow-200" :
                            "bg-green-900 text-green-200"
                          }`}>
                            {cve.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mb-1">
                          <strong>Vulnerability:</strong> {cve.vulnerability}
                        </p>
                        <p className="text-xs text-gray-400">
                          {cve.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No known CVE vulnerabilities</p>
                  </div>
                )}
              </div>

              {/* Network Configuration */}
              <div className="mt-4 bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-300 mb-3">Network Configuration</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Device Type</p>
                    <p className="text-gray-200">{selectedDevice.device_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p className="text-green-400">{selectedDevice.status}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
                  View Full Report
                </button>
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium">
                  Run Security Scan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default DevicesPage;
