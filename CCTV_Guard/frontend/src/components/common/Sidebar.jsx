import { LayoutDashboard, Camera, Shield, FileText, Settings, Search, Bell } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

const SIDEBAR_ITEMS = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    color: "#6366f1",
    path: "/dashboard",
  },
  { name: "Devices", icon: Camera, color: "#8B5CF6", path: "/devices" },
  { name: "Scanner", icon: Search, color: "#3B82F6", path: "/scanner" },
  { name: "Vulnerabilities", icon: Shield, color: "#EC4899", path: "/vulnerabilities" },
  { name: "Recommendations", icon: FileText, color: "#10B981", path: "/recommendations" },
  { name: "Alerts", icon: Bell, color: "#F59E0B", path: "/alerts" },
  { name: "Settings", icon: Settings, color: "#6EE7B7", path: "/settings" },
];

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <motion.div
      className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
      animate={{ width: isSidebarOpen ? 256 : 80 }}
    >
      <div className="h-full bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 flex flex-col border-r border-gray-700">
        <div className="flex items-center justify-between mb-8">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.h1
                className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                CCTV Guard
              </motion.h1>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors max-w-fit"
          >
            <svg
              className={`w-6 h-6 transition-transform duration-200 ${
                isSidebarOpen ? "" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
        </div>

        <nav className="mt-8 flex-grow">
          {SIDEBAR_ITEMS.map((item) => (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={`flex items-center p-4 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-2 ${
                  location.pathname === item.path
                    ? "bg-gray-700 bg-opacity-50"
                    : ""
                }`}
              >
                <item.icon
                  className="w-6 h-6 flex-shrink-0"
                  style={{ color: item.color, minWidth: "24px" }}
                />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      className="ml-4 whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>
      </div>
    </motion.div>
  );
};

export default Sidebar;
