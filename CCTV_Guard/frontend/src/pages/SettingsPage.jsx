import { motion } from "framer-motion";
import Header from "../components/common/Header";
import { Settings as SettingsIcon, Bell, Shield, Database } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <div className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <Header title="Settings" />

        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="space-y-6">
            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center mb-4">
                <Bell className="text-blue-400 mr-3" size={24} />
                <h3 className="text-xl font-semibold text-white">Notifications</h3>
              </div>
              <div className="space-y-3 ml-9">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="ml-3 text-gray-300">Enable email notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="ml-3 text-gray-300">Critical alerts only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-300">Weekly summary reports</span>
                </label>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center mb-4">
                <Shield className="text-green-400 mr-3" size={24} />
                <h3 className="text-xl font-semibold text-white">Security</h3>
              </div>
              <div className="space-y-3 ml-9">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="ml-3 text-gray-300">Automatic vulnerability scanning</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                  <span className="ml-3 text-gray-300">Real-time threat detection</span>
                </label>
                <div className="mt-4">
                  <label className="block text-gray-300 mb-2">Scan Frequency</label>
                  <select className="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Every hour</option>
                    <option>Every 6 hours</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center mb-4">
                <Database className="text-purple-400 mr-3" size={24} />
                <h3 className="text-xl font-semibold text-white">Data Management</h3>
              </div>
              <div className="space-y-3 ml-9">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Export Data
                </button>
                <button className="ml-3 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                  Clear Cache
                </button>
                <div className="mt-4">
                  <p className="text-gray-400 text-sm">
                    Last backup: 2 hours ago
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center mb-4">
                <SettingsIcon className="text-yellow-400 mr-3" size={24} />
                <h3 className="text-xl font-semibold text-white">System</h3>
              </div>
              <div className="space-y-3 ml-9">
                <div className="text-gray-300">
                  <p className="mb-1">Version: 1.0.0</p>
                  <p className="mb-1">Backend: Connected</p>
                  <p className="mb-1">Last Update: Today</p>
                </div>
                <button className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                  Check for Updates
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
