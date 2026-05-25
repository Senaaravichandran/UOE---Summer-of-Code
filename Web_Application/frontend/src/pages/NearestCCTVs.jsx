import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import localities from "../constants/localities";
import { Player } from "@lottiefiles/react-lottie-player";
import { FiAlertCircle } from "react-icons/fi";

const ContentWithLottie = () => {
  return (
    <div className="flex items-center justify-center mb-8 space-x-8">
      {/* Content */}
      <div className="flex flex-col items-center text-center">
        {/* Paragraph */}
        <p className="text-gray-300 text-lg max-w-2xl mt-1">
          Forecasting the live footage of nearest 6 CCTV Cameras prior to the
          location of crime being detected.
        </p>
      </div>
    </div>
  );
};

const NearestCCTVs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location;
  
  // Debug: Log what we received
  console.log("🔍 NearestCCTVs - Received state:", state);
  
  const { coordinates, locality, location: locationName } = state || {
    coordinates: null,
    locality: null,
    location: null,
  };
  
  // Use either locality or location (since AlertsPage sends 'location')
  const displayLocality = locality || locationName;
  
  console.log("📍 Coordinates:", coordinates);
  console.log("🏙️  Display Locality:", displayLocality);

  const parseCoordinates = (coords) => {
    // Handle object format {lat, lng}
    if (coords && typeof coords === 'object' && coords.lat !== undefined && coords.lng !== undefined) {
      console.log("✅ Parsed coordinates from object:", [coords.lat, coords.lng]);
      return [coords.lat, coords.lng];
    }
    
    // Handle string format "lat,lng"
    if (coords && typeof coords === 'string') {
      const parsed = coords.split(",").map((coord) => parseFloat(coord.trim()));
      console.log("✅ Parsed coordinates from string:", parsed);
      return parsed;
    }
    
    console.log("❌ Could not parse coordinates:", coords);
    return null;
  };

  const parsedCoordinates = parseCoordinates(coordinates);
  const locations = localities;

  const [nearestLocations, setNearestLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // YouTube video links
  const youtubeVideos = [
    "https://www.youtube.com/embed/VR-x3HdhKLQ",
    "https://www.youtube.com/embed/rnXIjl_Rzy4",
    "https://www.youtube.com/embed/6dp-bvQ7RWo",
    "https://www.youtube.com/embed/8JCk5M_xrBs",
    "https://www.youtube.com/embed/u7GyFcQJs98",
    "https://www.youtube.com/embed/e9T0L_POAOk",
  ];

  useEffect(() => {
    if (!state || !coordinates) {
      console.error("Invalid state or missing coordinates. Redirecting...");
      setTimeout(() => navigate("/"), 2000);
      setIsLoading(false);
      return;
    }
    
    if (!parsedCoordinates) {
      console.error("Could not parse coordinates");
      setIsLoading(false);
      return;
    }
    
    if (!displayLocality) {
      console.error("Missing locality/location data");
      setIsLoading(false);
      return;
    }
    
    try {
      const calculateDistance = ([lat1, lon1], [lat2, lon2]) => {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371; // Radius of Earth in kilometers
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const sortedLocations = locations
        .map((loc) => ({
          ...loc,
          distance: calculateDistance(parsedCoordinates, loc.coordinates),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);

      setNearestLocations(sortedLocations);
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating nearest locations:", error);
      setIsLoading(false);
    }
  }, [state, coordinates, parsedCoordinates, displayLocality, navigate]);

  if (isLoading) {
    return (
      <div className="bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading nearest CCTVs...</p>
        </div>
      </div>
    );
  }

  if (!parsedCoordinates || !displayLocality) {
    return (
      <div className="bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-400 mb-2">Invalid or Missing Data</h2>
          <p className="text-gray-400">Unable to fetch nearest CCTVs. Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      <header className="bg-gray-800 text-white text-center py-4 shadow-md">
        <h1 className="text-2xl font-bold">
          Nearest CCTV Access found at {displayLocality || "Unknown Locality"}
        </h1>
        <p className="text-sm mt-2">
          Coordinates:{" "}
          {parsedCoordinates
            ? `${parsedCoordinates[0].toFixed(
                4
              )}, ${parsedCoordinates[1].toFixed(4)}`
            : "N/A"}
        </p>
      </header>

      <ContentWithLottie />

      <div className="grid grid-cols-3 gap-6 p-4">
        {nearestLocations.map((location, index) => (
          <div
            key={location.locality}
            className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col items-center"
          >
            <h3 className="text-lg font-semibold mb-2">{location.locality}</h3>
            <p className="text-sm mb-4">
              Coordinates: {location.coordinates[0].toFixed(4)},{" "}
              {location.coordinates[1].toFixed(4)}
            </p>
            <div className="relative w-full h-64 bg-black">
              <iframe
                src={`${youtubeVideos[index]}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&modestbranding=1&rel=0`}
                className="object-cover w-full h-full"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={`video-${index}`}
              ></iframe>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NearestCCTVs;
