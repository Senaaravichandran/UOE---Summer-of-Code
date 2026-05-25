import {
  AlertCircle,
  BarChart2,
  Cctv,
  Settings,
  Menu,
  Users,
  Bell,
  Box,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaRobot } from "react-icons/fa";

const Logo = () => {
  return (
    <motion.div
      className="text-white text-center flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="text-3xl font-bold tracking-wider mt-1">
        <span className="text-[#00E68F]">EvaSafe</span>
      </div>
    </motion.div>
  );
};

const SIDEBAR_ITEMS = [
  { name: "Dashboard", icon: BarChart2, color: "#6366f1", href: "/" },
  { name: "Alerts", icon: AlertCircle, color: "#00FF00", href: "/alerts", count: 0 },
  { name: "Query Retriever", icon: FaRobot, color: "#8B5CF6", href: "/chatbot" },
  { name: "AR Viewer", icon: Box, color: "#10B981", href: "/ar-viewer" },
  { name: "View CCTV", icon: Cctv, color: "#3B82F6", href: "/view-cctvs" },
  { name: "Notify", icon: Bell, color: "#8B5CF6", href: "/notify" },
  { name: "Case Statistics", icon: Users, color: "#EC4899", href: "/case-statistics" },
  { name: "Settings", icon: Settings, color: "#6EE7B7", href: "/settings" },
];

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [alertCount, setAlertCount] = useState(0);
  const [activeItem, setActiveItem] = useState("/");

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/alerts/fetch-alert-count");
        const data = await response.json();
        setAlertCount(data.count);
      } catch (error) {
        console.error("Error fetching alert count:", error);
      }
    };

    fetchAlertCount();
    setActiveItem(window.location.pathname);
  }, []);

  return (
    <motion.div
      className="relative z-10 transition-all duration-300 ease-in-out flex-shrink-0"
      animate={{ width: isSidebarOpen ? 256 : 80 }}
    >
      <div className="h-full bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-lg p-4 flex flex-col border-r border-gray-700/40 shadow-xl">
        <div className="flex items-center justify-start mb-4 mt-2 space-x-4">
          <motion.button
            whileHover={{ scale: 1.1, rotate: isSidebarOpen ? 0 : 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-700/50 transition-all duration-300 bg-gray-800/60 border border-gray-700/30"
          >
            <Menu size={22} className="text-gray-300" />
          </motion.button>
          {isSidebarOpen && <Logo />}
        </div>

        <div className="relative h-px w-full bg-gradient-to-r from-transparent via-gray-500/30 to-transparent my-2">
          <div
            className="absolute h-px w-16 bg-gradient-to-r from-transparent via-[#00E68F]/60 to-transparent animate-pulse"
            style={{ left: "40%" }}
          ></div>
        </div>

        <nav className="mt-4 flex-grow space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeItem === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={() => setActiveItem(item.href)}>
                <motion.div
                  className={`flex items-center p-3 text-base font-medium rounded-lg hover:bg-gray-700/40 transition-all duration-300 mb-1 relative overflow-hidden ${isActive
                    ? "bg-gray-700/60 shadow-lg border-l-2 border-[#00FF00]"
                    : "bg-gray-800/20"
                    }`}
                  whileHover={{ x: 3 }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-[rgba(0,230,143,0.1)] to-transparent opacity-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.1 }}
                      transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                    />
                  )}

                  <div
                    className={`flex items-center justify-center w-8 h-8 ${isActive ? "text-[#00FF00]" : "text-gray-300"
                      }`}
                  >
                    <item.icon
                      size={22}
                      style={{ color: isActive ? "#00FF00" : item.color }}
                    />
                  </div>

                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.span
                        className={`ml-3 whitespace-nowrap ${isActive ? "text-[#00FF00]" : "text-gray-300"
                          }`}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {item.name === "Alerts" && alertCount > 0 && (
                    <motion.div
                      className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.3,
                        repeat: 3,
                        repeatType: "reverse",
                      }}
                    >
                      {alertCount}
                    </motion.div>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-500/30 to-transparent mb-4"></div>
          {isSidebarOpen && (
            <motion.div
              className="text-xs text-gray-500 text-center px-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              UOE - Summer of Code
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
