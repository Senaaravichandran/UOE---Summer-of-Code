import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/common/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import DevicesPage from "./pages/DevicesPageNew";
import VulnerabilitiesPage from "./pages/VulnerabilitiesPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import SettingsPage from "./pages/SettingsPage";
import ScannerPage from "./pages/ScannerPage";
import AlertsPage from "./pages/AlertsPage";

function App() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <Sidebar />
      
      <div className="flex-1 overflow-auto relative z-10">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
