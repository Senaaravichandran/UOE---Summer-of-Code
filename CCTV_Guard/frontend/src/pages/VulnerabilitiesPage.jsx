import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import { Shield, AlertTriangle, Search } from "lucide-react";
import Header from "../components/common/Header";

const VulnerabilitiesPage = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVulnerabilities();
  }, []);

  const fetchVulnerabilities = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/vulnerabilities");
      if (response.data.success) {
        setVulnerabilities(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVulnerabilities = vulnerabilities.filter(
    (vuln) =>
      vuln.device_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.vulnerability_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.cve_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Header title="Vulnerabilities" />

        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search vulnerabilities..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVulnerabilities.map((vuln, index) => (
              <motion.div
                key={index}
                className="bg-gray-700 bg-opacity-50 rounded-lg p-4 border border-gray-600 hover:border-red-500 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <AlertTriangle className="text-red-400 mr-2" size={20} />
                    <span className="text-sm font-semibold text-gray-300">
                      {vuln.device_id}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      vuln.severity === "Critical"
                        ? "bg-red-800 text-red-100"
                        : vuln.severity === "High"
                        ? "bg-orange-800 text-orange-100"
                        : vuln.severity === "Medium"
                        ? "bg-yellow-800 text-yellow-100"
                        : "bg-green-800 text-green-100"
                    }`}
                  >
                    {vuln.severity}
                  </span>
                </div>
                <h3 className="text-md font-medium text-white mb-2">
                  {vuln.vulnerability_type}
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  {vuln.vulnerability_description}
                </p>
                {vuln.cve_id && (
                  <div className="flex items-center text-xs text-blue-400">
                    <Shield size={14} className="mr-1" />
                    <span>{vuln.cve_id}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {filteredVulnerabilities.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No vulnerabilities found matching your search.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VulnerabilitiesPage;
