import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Camera,
  X,
  Filter,
  List,
  Grid,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import localities from "../constants/localities_sudo"; // Import the localities data

const videoPath = "./video.mp4";

// Sample YouTube video IDs mapped to localities
const videoMappings = localities.map((locality) => ({
  ...locality,
  videoId: videoPath, // Function to generate sample video IDs
  description: `CCTV footage from ${locality.locality}, Chennai`,
  lastUpdated: getRandomDate(new Date(2024, 3, 1), new Date()), // Random date within last month
  status: Math.random() > 0.1 ? "online" : "offline", // 90% are online
}));

// Helper function for random dates
function getRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Format date in a readable way
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CCTVMappingSystem() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredVideos, setFilteredVideos] = useState(videoMappings);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("locality");
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Apply search, filters and sorting
  useEffect(() => {
    let results = [...videoMappings]; // Create a fresh copy of videoMappings

    // Search filter - convert to lowercase for case insensitive search
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(
        (video) =>
          video.locality.toLowerCase().includes(searchLower) ||
          video.description.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      results = results.filter((video) => video.status === filterStatus);
    }

    // Sorting
    switch (sortBy) {
      case "locality":
        results = [...results].sort((a, b) =>
          a.locality.localeCompare(b.locality)
        );
        break;
      case "status":
        results = [...results].sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "date":
        results = [...results].sort(
          (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
        );
        break;
      default:
        break;
    }

    // Update filtered videos
    setFilteredVideos(results);
  }, [searchTerm, filterStatus, sortBy]); // Only re-run when these dependencies change

  // Clear search when clicking X button
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setSortBy("locality");
    setIsFilterMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Header with logo and title */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-900 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <motion.div
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.6 }}
                className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg ring-4 ring-blue-400/40"
              >
                <Camera className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
                  Chennai CCTV Network
                </h1>
                <p className="text-sm text-blue-200 opacity-80">
                  Real-time surveillance monitoring system
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMapModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <MapPin size={18} />
              <span>View Map</span>
            </button>
          </div>
        </div>
      </header>

      {/* Search and filter section */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative w-full md:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by location or description..."
              className="block w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={handleClearSearch}
              >
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative">
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Filter size={18} />
                <span>Filter & Sort</span>
              </button>

              {isFilterMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-gray-800 rounded-lg shadow-xl z-10 border border-gray-700">
                  <div className="p-4">
                    <h3 className="font-medium text-sm text-gray-300 mb-2">
                      Status
                    </h3>
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={filterStatus === "all"}
                          onChange={() => setFilterStatus("all")}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span>All Cameras</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={filterStatus === "online"}
                          onChange={() => setFilterStatus("online")}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span>Online Only</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={filterStatus === "offline"}
                          onChange={() => setFilterStatus("offline")}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span>Offline Only</span>
                      </label>
                    </div>

                    <h3 className="font-medium text-sm text-gray-300 mb-2 mt-4">
                      Sort By
                    </h3>
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={sortBy === "locality"}
                          onChange={() => setSortBy("locality")}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span>Location (A-Z)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={sortBy === "status"}
                          onChange={() => setSortBy("status")}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span>Status</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={sortBy === "date"}
                          onChange={() => setSortBy("date")}
                          className="text-blue-500 focus:ring-blue-500"
                        />
                        <span>Last Updated</span>
                      </label>
                    </div>

                    <button
                      onClick={handleResetFilters}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${
                  viewMode === "grid" ? "bg-blue-600" : "hover:bg-gray-700"
                }`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${
                  viewMode === "list" ? "bg-blue-600" : "hover:bg-gray-700"
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="container mx-auto px-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <div className="text-sm text-gray-400">Total Cameras</div>
              <div className="text-2xl font-semibold">
                {videoMappings.length}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div>
              <div className="text-sm text-gray-400">Online</div>
              <div className="text-2xl font-semibold text-green-400">
                {videoMappings.filter((v) => v.status === "online").length}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div>
              <div className="text-sm text-gray-400">Offline</div>
              <div className="text-2xl font-semibold text-green-400">
                {videoMappings.filter((v) => v.status === "offline").length}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Showing {filteredVideos.length} of {videoMappings.length} cameras
          </div>
        </div>
      </div>

      {/* Videos display section */}
      <div className="container mx-auto px-4 pb-12">
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-800 p-6 rounded-full mb-4">
              <Search className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium mb-2">No cameras found</h3>
            <p className="text-gray-400 max-w-md">
              No CCTV cameras match your search criteria. Try adjusting your
              filters or search term.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <motion.div
                key={video.locality}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-gray-700/50"
              >
                <div className="relative">
                  <div className="aspect-video bg-gray-900 relative overflow-hidden">
                    <video
                      autoPlay
                      muted
                      loop
                      src={video.videoId}
                      title={`CCTV in ${video.locality}`}
                      allow="accelerometer; autoplay; muted; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    ></video>
                  </div>
                  <div
                    className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                      video.status === "online"
                        ? "bg-green-500/80"
                        : "bg-[rgba(0,230,143,0.5)]"
                    }`}
                  >
                    {video.status === "online" ? "LIVE" : "OFFLINE"}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-2 px-3">
                    <div className="flex items-center space-x-1">
                      <MapPin size={14} className="text-blue-400" />
                      <span className="text-sm font-medium">
                        {video.locality}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-lg mb-1">
                    {video.locality} Camera
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {video.description}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs text-gray-400">
                      Updated: {formatDate(video.lastUpdated)}
                    </div>
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                    >
                      <span>Details</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <motion.div
                key={video.locality}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700/50 flex flex-col md:flex-row"
              >
                <div className="md:w-1/3 lg:w-1/4 relative">
                  <div className="aspect-video md:h-full bg-gray-900 relative overflow-hidden">
                    <video
                      src={video.videoId}
                      title={`CCTV in ${video.locality}`}
                      autoPlay
                      muted
                      loop
                      className="absolute inset-0 w-full h-full object-cover"
                    ></video>
                  </div>
                  <div
                    className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                      video.status === "online"
                        ? "bg-green-500/80"
                        : "bg-[rgba(0,230,143,0.5)]"
                    }`}
                  >
                    {video.status === "online" ? "LIVE" : "OFFLINE"}
                  </div>
                </div>
                <div className="p-4 md:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin size={16} className="text-blue-400" />
                      <h3 className="font-medium text-lg">
                        {video.locality} Camera
                      </h3>
                    </div>
                    <p className="text-gray-400 text-sm">{video.description}</p>
                    <div className="flex items-center space-x-3 mt-3 text-sm text-gray-400">
                      <div>
                        Coordinates: {video.coordinates[0]},{" "}
                        {video.coordinates[1]}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-xs text-gray-400">
                      Updated: {formatDate(video.lastUpdated)}
                    </div>
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 transition-colors"
                    >
                      <span>View Details</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Video Detail Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-30"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-video">
                <video
                  src={selectedVideo.videoId}
                  title={`CCTV in ${selectedVideo.locality}`} // FIXED: Changed from video.locality to selectedVideo.locality
                  autoPlay
                  muted
                  loop
                  controls
                  className="absolute inset-0 w-full h-full object-cover"
                ></video>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedVideo.locality} CCTV Camera
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedVideo.status === "online"
                            ? "bg-green-100 text-green-800"
                            : "bg-[rgba(0,230,143,0.1)] text-green-300"
                        }`}
                      >
                        {selectedVideo.status === "online"
                          ? "Online"
                          : "Offline"}
                      </span>
                      <span className="text-gray-400 text-sm">
                        Updated: {formatDate(selectedVideo.lastUpdated)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setIsMapModalOpen(true);
                      setSelectedVideo(null);
                    }}
                  >
                    <MapPin size={16} />
                    <span>View on Map</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Description
                    </h3>
                    <p>{selectedVideo.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Location Information
                    </h3>
                    <div className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400">Locality</div>
                        <div className="font-medium">
                          {selectedVideo.locality}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Coordinates</div>
                        <div className="font-medium">
                          {selectedVideo.coordinates[0]},{" "}
                          {selectedVideo.coordinates[1]}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">City</div>
                        <div className="font-medium">Chennai</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Zone</div>
                        <div className="font-medium">South Chennai</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Technical Information
                    </h3>
                    <div className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400">Camera ID</div>
                        <div className="font-medium">
                          CCT-
                          {Math.floor(Math.random() * 10000)
                            .toString()
                            .padStart(4, "0")}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Camera Type</div>
                        <div className="font-medium">PTZ Dome Camera</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Resolution</div>
                        <div className="font-medium">1080p Full HD</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">
                          Streaming Framerate
                        </div>
                        <div className="font-medium">24 FPS</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-30"
            onClick={() => setIsMapModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative p-4 flex justify-between items-center border-b border-gray-700">
                <h2 className="text-xl font-bold">
                  Chennai CCTV Camera Network Map
                </h2>
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="h-[70vh] p-4">
                <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">
                    Map integration would go here, showing all{" "}
                    {videoMappings.length} camera locations
                  </p>
                  {/* In a real implementation, you would integrate with a mapping library like Google Maps, Mapbox, or Leaflet */}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
    </div>
  );
}
