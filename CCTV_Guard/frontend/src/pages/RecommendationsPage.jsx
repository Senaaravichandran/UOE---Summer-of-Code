import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import { FileText, Search, CheckCircle } from "lucide-react";
import Header from "../components/common/Header";

const RecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/recommendations");
      if (response.data.success) {
        setRecommendations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecommendations = recommendations.filter(
    (rec) =>
      rec.device_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.recommendation?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Header title="Security Recommendations" />

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
                placeholder="Search recommendations..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecommendations.map((rec, index) => (
              <motion.div
                key={index}
                className="bg-gray-700 bg-opacity-50 rounded-lg p-5 border border-gray-600 hover:border-green-500 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-green-400" size={20} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        Device: {rec.device_id}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          rec.priority === "High"
                            ? "bg-red-800 text-red-100"
                            : rec.priority === "Medium"
                            ? "bg-yellow-800 text-yellow-100"
                            : "bg-blue-800 text-blue-100"
                        }`}
                      >
                        {rec.priority || "Medium"} Priority
                      </span>
                    </div>
                    <p className="text-gray-300 mb-3">{rec.recommendation}</p>
                    {rec.estimated_time && (
                      <div className="flex items-center text-sm text-gray-400">
                        <FileText size={14} className="mr-2" />
                        <span>Estimated time: {rec.estimated_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredRecommendations.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No recommendations found matching your search.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
