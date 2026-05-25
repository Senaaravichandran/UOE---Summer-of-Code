import React, { useState, useRef, useCallback, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Grid, Environment, Html } from "@react-three/drei";
import * as THREE from "three";
import axios from "axios";
import {
  Box,
  Upload,
  MapPin,
  FileText,
  RotateCcw,
  Maximize2,
  Eye,
  EyeOff,
  Tag,
  AlertTriangle,
  Shield,
  DoorOpen,
  Loader2,
  ChevronRight,
  Building2,
  Layers,
  Navigation,
  Info,
  Camera,
  Crosshair,
  Search,
  Map,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AR_BACKEND_URL = "http://127.0.0.1:5020";

// ─── 3D Building Components ───────────────────────────────────────────────

function Room({ room, heightPerFloor, isWireframe, showLabels, isSelected, onClick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const y = room.floor * heightPerFloor + heightPerFloor / 2;
  const x = room.x + room.width / 2;
  const z = room.z + room.depth / 2;

  useFrame(() => {
    if (meshRef.current) {
      const targetOpacity = hovered || isSelected ? 0.85 : 0.6;
      meshRef.current.material.opacity +=
        (targetOpacity - meshRef.current.material.opacity) * 0.1;
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(room); }}
        castShadow
        receiveShadow
      >
        {room.shape === 'circle' ? (
          <cylinderGeometry args={[room.width / 2 - 0.05, room.width / 2 - 0.05, heightPerFloor - 0.2, 32]} />
        ) : room.shape === 'octagon' ? (
          <cylinderGeometry args={[room.width / 2 - 0.05, room.width / 2 - 0.05, heightPerFloor - 0.2, 8]} />
        ) : (
          <boxGeometry args={[room.width - 0.1, heightPerFloor - 0.2, room.depth - 0.1]} />
        )}
        <meshStandardMaterial
          color={room.color || "#4a90d9"}
          transparent
          opacity={0.6}
          wireframe={isWireframe}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Room edges */}
      <lineSegments>
        <edgesGeometry args={[
          room.shape === 'circle'
            ? new THREE.CylinderGeometry(room.width / 2 - 0.05, room.width / 2 - 0.05, heightPerFloor - 0.2, 32)
            : room.shape === 'octagon'
              ? new THREE.CylinderGeometry(room.width / 2 - 0.05, room.width / 2 - 0.05, heightPerFloor - 0.2, 8)
              : new THREE.BoxGeometry(room.width - 0.1, heightPerFloor - 0.2, room.depth - 0.1)
        ]} />
        <lineBasicMaterial color={hovered || isSelected ? "#ffffff" : "#88ccff"} linewidth={1} transparent opacity={0.5} />
      </lineSegments>

      {/* Room label */}
      {showLabels && (
        <Text
          position={[0, heightPerFloor / 2 + 0.3, 0]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {room.name}
        </Text>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, heightPerFloor / 2 + 1, 0]} center distanceFactor={15}>
          <div className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap pointer-events-none">
            <div className="font-bold text-cyan-400">{room.name}</div>
            <div className="text-gray-400">
              Floor {room.floor + 1} • {room.width}m × {room.depth}m
            </div>
            <div className="text-gray-500 capitalize">{room.type}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function EntryPoint({ entry, heightPerFloor }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const y = entry.floor * heightPerFloor + 1.2;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  const color = entry.type === "emergency_exit" ? "#FF4444" : "#4CAF50";

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[entry.x, y, entry.z]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <coneGeometry args={[0.4, 0.8, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      <Text
        position={[entry.x, y + 1, entry.z]}
        fontSize={0.35}
        color={color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {entry.name}
      </Text>

      {/* Direction indicator line */}
      {hovered && (
        <Html position={[entry.x, y + 1.5, entry.z]} center>
          <div className="bg-gray-900 border border-green-500 rounded px-2 py-1 text-xs text-green-400 shadow-xl whitespace-nowrap pointer-events-none">
            📍 {entry.name} ({entry.direction}) — {entry.type.replace("_", " ")}
          </div>
        </Html>
      )}
    </group>
  );
}

function Feature({ feature, isWireframe }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const isCam = feature.type === "camera";
  const isAlarm = feature.type === "alarm";
  const shape = feature.shape || (isCam ? 'sphere' : 'box');

  useFrame((state) => {
    if (meshRef.current && (isCam || isAlarm)) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  // Determine geometry based on shape
  const renderGeometry = () => {
    const w = feature.width || 1;
    const h = feature.height || 1;
    const d = feature.depth || 1;
    const radius = Math.max(w, d) / 2;

    switch (shape) {
      case 'dome':
        // Half-sphere: use phiLength to render only upper hemisphere
        return <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />;
      case 'cylinder':
        return <cylinderGeometry args={[w / 2, w / 2, h, 16]} />;
      case 'cone':
        return <coneGeometry args={[radius, h, 16]} />;
      case 'sphere':
        return <sphereGeometry args={[radius, 16, 16]} />;
      case 'box':
      default:
        return <boxGeometry args={[w, h, d]} />;
    }
  };

  // Adjust Y position: domes sit on top of their Y position, not centered
  const yOffset = shape === 'dome' ? feature.y : feature.y + feature.height / 2;

  return (
    <group position={[feature.x, yOffset, feature.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={feature.color || "#888888"}
          wireframe={isWireframe}
          emissive={isCam || isAlarm ? feature.color : "#000000"}
          emissiveIntensity={isCam || isAlarm ? 0.5 : 0}
          transparent
          opacity={0.8}
        />
      </mesh>

      {hovered && (
        <Html position={[0, feature.height / 2 + 0.5, 0]} center>
          <div className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white shadow-xl whitespace-nowrap pointer-events-none">
            {feature.name} — {feature.type}
          </div>
        </Html>
      )}
    </group>
  );
}

function BuildingOutline({ building }) {
  const { width, depth, floors, height_per_floor } = building;
  const totalHeight = floors * height_per_floor;

  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(width, totalHeight, depth)]} />
      <lineBasicMaterial color="#3b82f6" transparent opacity={0.2} />
    </lineSegments>
  );
}

function Scene({ sceneData, isWireframe, showLabels, showEntryPoints, selectedRoom, onRoomClick }) {
  if (!sceneData || !sceneData.building) return null;

  const { building, rooms = [], entry_points = [], features = [] } = sceneData;
  const heightPerFloor = building.height_per_floor || 3.5;

  // Center the building
  const offsetX = -building.width / 2;
  const offsetZ = -building.depth / 2;

  return (
    <group position={[offsetX, 0, offsetZ]}>
      {/* Building outline */}
      <group position={[building.width / 2, (building.floors * heightPerFloor) / 2, building.depth / 2]}>
        <BuildingOutline building={building} />
      </group>

      {/* Rooms */}
      {rooms.map((room) => (
        <Room
          key={room.id}
          room={room}
          heightPerFloor={heightPerFloor}
          isWireframe={isWireframe}
          showLabels={showLabels}
          isSelected={selectedRoom?.id === room.id}
          onClick={onRoomClick}
        />
      ))}

      {/* Entry points */}
      {showEntryPoints &&
        entry_points.map((entry) => (
          <EntryPoint key={entry.id} entry={entry} heightPerFloor={heightPerFloor} />
        ))}

      {/* Features */}
      {features.map((feature) => (
        <Feature key={feature.id} feature={feature} isWireframe={isWireframe} />
      ))}

      {/* Floor planes */}
      {Array.from({ length: building.floors }, (_, i) => (
        <mesh
          key={`floor-${i}`}
          position={[building.width / 2, i * heightPerFloor, building.depth / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[building.width, building.depth]} />
          <meshStandardMaterial
            color="#1a1a2e"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function CameraController({ resetTrigger }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  React.useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(25, 20, 25);
      controlsRef.current.target.set(0, 3, 0);
      controlsRef.current.update();
    }
  }, [resetTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

// ─── Input Mode Components ────────────────────────────────────────────

function TextInputMode({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        <FileText size={14} className="inline mr-2 text-cyan-400" />
        Describe the building or location
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-40 p-3 bg-gray-800/80 border border-gray-600/50 rounded-xl text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none transition-all"
      />
      <p className="text-xs text-gray-500">
      </p>
    </div>
  );
}

// ─── Google Map View Component ────────────────────────────────────────

function GoogleMapView({ lat, lng, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const center = {
      lat: parseFloat(lat) || 12.9716,
      lng: parseFloat(lng) || 77.5946,
    };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      mapTypeId: "hybrid",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
      ],
      gestureHandling: "greedy",
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    // Marker at current position
    markerRef.current = new window.google.maps.Marker({
      position: center,
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      title: "Selected Location",
    });

    // Click handler
    map.addListener("click", (e) => {
      const clickedLat = e.latLng.lat();
      const clickedLng = e.latLng.lng();

      markerRef.current.setPosition(e.latLng);

      // Reverse geocode to get place name
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: e.latLng }, (results, status) => {
        const placeName = status === "OK" && results[0]
          ? results[0].formatted_address
          : `Location ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
        onMapClick(clickedLat, clickedLng, placeName);
      });
    });

    // Search box
    if (searchInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const loc = place.geometry.location;
          map.panTo(loc);
          map.setZoom(18);
          markerRef.current.setPosition(loc);
          onMapClick(loc.lat(), loc.lng(), place.name || place.formatted_address);
        }
      });
    }

    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
    };
  }, []);

  // Update map center when lat/lng change from manual input
  useEffect(() => {
    if (mapInstanceRef.current && lat && lng) {
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
      if (!isNaN(pos.lat) && !isNaN(pos.lng)) {
        mapInstanceRef.current.panTo(pos);
        if (markerRef.current) markerRef.current.setPosition(pos);
      }
    }
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search location..."
          className="w-full pl-9 pr-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
      </div>
      <div
        ref={mapRef}
        className="w-full rounded-lg overflow-hidden border border-gray-600/50"
        style={{ height: "280px" }}
      />
      <p className="text-[10px] text-gray-600 text-center">
        Click on the map to select a building and generate its 3D view
      </p>
    </div>
  );
}

// ─── Google Street View Component ─────────────────────────────────────

function GoogleStreetView({ lat, lng, onMapClick }) {
  const svRef = useRef(null);
  const svInstanceRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!svRef.current || !window.google) return;

    const pos = {
      lat: parseFloat(lat) || 12.9716,
      lng: parseFloat(lng) || 77.5946,
    };

    const sv = new window.google.maps.StreetViewPanorama(svRef.current, {
      position: pos,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: true,
      showRoadLabels: true,
      motionTracking: false,
      motionTrackingControl: false,
    });

    svInstanceRef.current = sv;

    // Click on street view to pick position
    sv.addListener("position_changed", () => {
      // Only trigger when user actually navigates
    });

    sv.addListener("click", (e) => {
      if (e.latLng) {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: e.latLng }, (results, status) => {
          const placeName = status === "OK" && results[0]
            ? results[0].formatted_address
            : `Location ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
          onMapClick(clickedLat, clickedLng, placeName);
        });
      }
    });

    // Search box
    if (searchInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const loc = place.geometry.location;
          sv.setPosition(loc);
          onMapClick(loc.lat(), loc.lng(), place.name || place.formatted_address);
        }
      });
    }
  }, []);

  // Update streetview position when coords change from manual input
  useEffect(() => {
    if (svInstanceRef.current && lat && lng) {
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
      if (!isNaN(pos.lat) && !isNaN(pos.lng)) {
        svInstanceRef.current.setPosition(pos);
      }
    }
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search location..."
          className="w-full pl-9 pr-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
      </div>
      <div
        ref={svRef}
        className="w-full rounded-lg overflow-hidden border border-gray-600/50"
        style={{ height: "280px" }}
      />
      <p className="text-[10px] text-gray-600 text-center">
        Navigate the street view • Click to select a building for 3D generation
      </p>
    </div>
  );
}

// ─── Coordinate Input Mode (with Map & Street View) ──────────────────

function CoordinateInputMode({ lat, lng, context, onLatChange, onLngChange, onContextChange, mapSubTab, onMapSubTabChange, onMapClick, onGeocode, isGeocoding }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        <MapPin size={14} className="inline mr-2 text-emerald-400" />
        Satellite Coordinates
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => onLatChange(e.target.value)}
            placeholder="12.9716"
            className="w-full p-2.5 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => onLngChange(e.target.value)}
            placeholder="77.5946"
            className="w-full p-2.5 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Search Place / Address</label>
        <div className="relative flex gap-2">
          <input
            type="text"
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && context.trim()) onGeocode(context); }}
            placeholder="e.g. Taj Mahal, Agra or SMV University"
            className="flex-1 p-2.5 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          <button
            onClick={() => context.trim() && onGeocode(context)}
            disabled={!context.trim() || isGeocoding}
            className="px-3 bg-emerald-600/80 hover:bg-emerald-500/80 disabled:bg-gray-700/50 disabled:text-gray-600 text-white rounded-lg transition-all flex items-center gap-1 text-xs"
          >
            {isGeocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </div>
      </div>

      {/* Map / Street View Sub-tabs */}
      <div className="pt-2 border-t border-gray-700/50">
        <div className="flex gap-1 p-1 bg-gray-900/60 rounded-lg mb-3">
          <button
            onClick={() => onMapSubTabChange("map")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${mapSubTab === "map"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            style={mapSubTab === "map" ? { backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399", borderColor: "rgba(16,185,129,0.3)", border: "1px solid" } : {}}
          >
            <Map size={13} />
            Map View
          </button>
          <button
            onClick={() => onMapSubTabChange("streetview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${mapSubTab === "streetview"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            style={mapSubTab === "streetview" ? { backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.3)", border: "1px solid" } : {}}
          >
            <Camera size={13} />
            Street View
          </button>
        </div>

        {mapSubTab === "map" && (
          <GoogleMapView lat={lat} lng={lng} onMapClick={onMapClick} />
        )}
        {mapSubTab === "streetview" && (
          <GoogleStreetView lat={lat} lng={lng} onMapClick={onMapClick} />
        )}
      </div>
    </div>
  );
}

function BlueprintInputMode({ onFileSelect, selectedFile }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
      setPreview(URL.createObjectURL(file));
    }
  }, [onFileSelect]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        <Upload size={14} className="inline mr-2 text-violet-400" />
        Upload Image (Any Type)
      </label>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-600/70 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/60 hover:bg-violet-500/5 transition-all group"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="Blueprint preview" className="max-h-32 mx-auto rounded-lg opacity-80" />
            <p className="text-xs text-violet-400">{selectedFile?.name}</p>
            <p className="text-xs text-gray-500">Click to change</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="mx-auto text-gray-500 group-hover:text-violet-400 transition-colors" />
            <p className="text-sm text-gray-400">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-gray-600">Building photo, blueprint, satellite image, sketch</p>
            <p className="text-xs text-gray-600">PNG, JPG, BMP (max 16MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tactical Info Panel ─────────────────────────────────────────────────

function TacticalInfo({ tacticalInfo, entryPoints = [] }) {
  if (!tacticalInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
        <Shield size={14} />
        Tactical Assessment
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/60 rounded-lg p-2 text-center border border-gray-700/50">
          <div className="text-lg font-bold text-cyan-400">{tacticalInfo.cover_points || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Cover Points</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2 text-center border border-gray-700/50">
          <div className="text-lg font-bold text-emerald-400">{tacticalInfo.escape_routes || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Escape Routes</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2 text-center border border-gray-700/50">
          <div className={`text-lg font-bold ${tacticalInfo.visibility_rating === "high" ? "text-green-400" :
            tacticalInfo.visibility_rating === "medium" ? "text-yellow-400" : "text-green-400"
            }`}>
            {(tacticalInfo.visibility_rating || "N/A").toUpperCase()}
          </div>
          <div className="text-[10px] text-gray-500 uppercase">Visibility</div>
        </div>
      </div>

      {/* Entry Points */}
      {entryPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
            <DoorOpen size={12} />
            Entry Points ({entryPoints.length})
          </h4>
          <div className="space-y-1">
            {entryPoints.map((ep) => (
              <div
                key={ep.id}
                className="flex items-center gap-2 text-xs p-1.5 rounded bg-gray-800/40 border border-gray-700/30"
              >
                <span className={`w-2 h-2 rounded-full ${ep.type === "emergency_exit" ? "bg-[rgba(0,230,143,0.5)]" : "bg-green-500"}`}></span>
                <span className="text-gray-300 flex-1">{ep.name}</span>
                <span className="text-gray-500 capitalize">{ep.direction}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blind Spots */}
      {tacticalInfo.blind_spots?.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-green-400/80 mb-1.5 flex items-center gap-1">
            <AlertTriangle size={12} />
            Blind Spots
          </h4>
          <ul className="space-y-1">
            {tacticalInfo.blind_spots.map((spot, i) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5">•</span>
                {spot}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Approach */}
      {tacticalInfo.recommended_approach && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <h4 className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1">
            <Crosshair size={12} />
            Recommended Approach
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            {tacticalInfo.recommended_approach}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Building Info Panel ─────────────────────────────────────────────────

function BuildingInfo({ building, rooms = [] }) {
  if (!building) return null;

  const floorCount = building.floors || 0;
  const roomCount = rooms.length;
  const totalArea = (building.width * building.depth * floorCount).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
        <Building2 size={14} />
        Building Info
      </h3>

      <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Name</span>
          <span className="text-gray-200 font-medium">{building.name}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Type</span>
          <span className="text-gray-200 capitalize">{building.type}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Dimensions</span>
          <span className="text-gray-200">{building.width}m × {building.depth}m</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Floors</span>
          <span className="text-gray-200">{floorCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Rooms</span>
          <span className="text-gray-200">{roomCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total Area</span>
          <span className="text-gray-200">{totalArea} m²</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main AR Viewer Page ─────────────────────────────────────────────────

function ARViewerPage() {
  // Input state
  const [inputMode, setInputMode] = useState("text");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [coordContext, setCoordContext] = useState("");
  const [mapSubTab, setMapSubTab] = useState("map");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [blueprintFile, setBlueprintFile] = useState(null);

  // Scene state
  const [sceneData, setSceneData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // View controls
  const [isWireframe, setIsWireframe] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showEntryPoints, setShowEntryPoints] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTactical, setShowTactical] = useState(false);

  const viewerRef = useRef(null);

  // Load default scene on first mount
  React.useEffect(() => {
    loadDefaultScene();
  }, []);

  const loadDefaultScene = async () => {
    try {
      const response = await axios.get(`${AR_BACKEND_URL}/default-scene`);
      if (response.data.success) {
        setSceneData(response.data.scene);
      }
    } catch (err) {
      // Silently fail — user can still generate scenes
      console.log("Default scene not available — backend may not be running");
    }
  };

  const handleGeocode = async (address) => {
    setIsGeocoding(true);
    try {
      const response = await axios.post(`${AR_BACKEND_URL}/geocode`, { address }, { timeout: 10000 });
      if (response.data.success) {
        setLatitude(response.data.latitude.toString());
        setLongitude(response.data.longitude.toString());
        setCoordContext(response.data.formatted_address || address);
      }
    } catch (err) {
      console.log("Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSelectedRoom(null);

    try {
      let payload = {};

      if (inputMode === "text") {
        if (!description.trim()) {
          setError("Please provide a description of the building.");
          setIsLoading(false);
          return;
        }
        payload = { mode: "text", description };
      } else if (inputMode === "coordinates") {
        if (!latitude || !longitude) {
          setError("Please provide latitude and longitude.");
          setIsLoading(false);
          return;
        }
        payload = { mode: "coordinates", latitude, longitude, context: coordContext };
      } else if (inputMode === "blueprint") {
        if (!blueprintFile) {
          setError("Please upload a blueprint image.");
          setIsLoading(false);
          return;
        }
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blueprintFile);
        });
        const base64Data = await base64Promise;
        payload = { mode: "blueprint", image: base64Data };
      }

      const response = await axios.post(`${AR_BACKEND_URL}/generate-scene`, payload, {
        timeout: 120000,
      });

      if (response.data.success) {
        setSceneData(response.data.scene);
        setResetTrigger((prev) => prev + 1);
        setShowTactical(true);
      } else {
        setError(response.data.error || "Failed to generate scene");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to connect to AR Viewer backend";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      viewerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const inputModes = [
    { id: "text", label: "Description", icon: FileText, color: "cyan" },
    { id: "coordinates", label: "Coordinates", icon: MapPin, color: "emerald" },
    { id: "blueprint", label: "Blueprint", icon: Upload, color: "violet" },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow border-b border-gray-700/50">
        <div className="mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <Box size={22} className="text-cyan-400" />
              </div>
              <div>
                <span className="text-cyan-400 font-semibold">AR Viewer</span>{" "}
                <span className="text-gray-400 text-lg">3D Building Visualizer</span>
              </div>
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${sceneData ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}></span>
                <span className="text-gray-400">{sceneData ? "Scene Active" : "No Scene"}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-4" style={{ height: "calc(100vh - 140px)" }}>
          {/* ─── Left Panel: Controls ─── */}
          <div className={`${isFullscreen ? "hidden" : ""} w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto`}>
            {/* Input Mode Tabs */}
            <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-4 backdrop-blur-sm">
              <div className="flex gap-1.5 mb-4 p-1 bg-gray-900/60 rounded-lg">
                {inputModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setInputMode(mode.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${inputMode === mode.id
                      ? `bg-${mode.color}-500/20 text-${mode.color}-400 border border-${mode.color}-500/30 shadow-lg`
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                      }`}
                    style={
                      inputMode === mode.id
                        ? {
                          backgroundColor: mode.color === "cyan" ? "rgba(6,182,212,0.15)" :
                            mode.color === "emerald" ? "rgba(16,185,129,0.15)" : "rgba(139,92,246,0.15)",
                          color: mode.color === "cyan" ? "#22d3ee" :
                            mode.color === "emerald" ? "#34d399" : "#a78bfa",
                          borderColor: mode.color === "cyan" ? "rgba(6,182,212,0.3)" :
                            mode.color === "emerald" ? "rgba(16,185,129,0.3)" : "rgba(139,92,246,0.3)",
                          border: "1px solid",
                        }
                        : {}
                    }
                  >
                    <mode.icon size={13} />
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Input Forms */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={inputMode}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {inputMode === "text" && (
                    <TextInputMode value={description} onChange={setDescription} />
                  )}
                  {inputMode === "coordinates" && (
                    <CoordinateInputMode
                      lat={latitude}
                      lng={longitude}
                      context={coordContext}
                      onLatChange={setLatitude}
                      onLngChange={setLongitude}
                      onContextChange={setCoordContext}
                      mapSubTab={mapSubTab}
                      onMapSubTabChange={setMapSubTab}
                      onMapClick={(clickedLat, clickedLng, placeName) => {
                        setLatitude(clickedLat.toString());
                        setLongitude(clickedLng.toString());
                        setCoordContext(placeName);
                      }}
                      onGeocode={handleGeocode}
                      isGeocoding={isGeocoding}
                    />
                  )}
                  {inputMode === "blueprint" && (
                    <BlueprintInputMode
                      onFileSelect={setBlueprintFile}
                      selectedFile={blueprintFile}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-2.5 rounded-lg bg-[rgba(0,230,143,0.1)] border border-[rgba(0,230,143,0.3)] text-xs text-green-400"
                >
                  <AlertTriangle size={12} className="inline mr-1.5" />
                  {error}
                </motion.div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="mt-4 w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating 3D Scene...
                  </>
                ) : (
                  <>
                    <Box size={16} />
                    Generate 3D View
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>

            {/* Building Info & Tactical Info */}
            {sceneData && (
              <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-4 backdrop-blur-sm space-y-4">
                <BuildingInfo building={sceneData.building} rooms={sceneData.rooms} />

                {/* Toggle Tactical Info */}
                <button
                  onClick={() => setShowTactical(!showTactical)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-all text-xs text-gray-400 hover:text-amber-400"
                >
                  <span className="flex items-center gap-2">
                    <Shield size={13} />
                    Tactical Assessment
                  </span>
                  <ChevronRight size={13} className={`transition-transform ${showTactical ? "rotate-90" : ""}`} />
                </button>

                <AnimatePresence>
                  {showTactical && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <TacticalInfo
                        tacticalInfo={sceneData.tactical_info}
                        entryPoints={sceneData.entry_points}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Selected Room Info */}
            {selectedRoom && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-4 backdrop-blur-sm"
              >
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                  <Info size={14} className="text-cyan-400" />
                  Selected: {selectedRoom.name}
                </h3>
                <div className="space-y-1.5 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Floor</span>
                    <span className="text-gray-200">{selectedRoom.floor + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size</span>
                    <span className="text-gray-200">{selectedRoom.width}m × {selectedRoom.depth}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="text-gray-200 capitalize">{selectedRoom.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Area</span>
                    <span className="text-gray-200">{(selectedRoom.width * selectedRoom.depth).toFixed(1)} m²</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ─── Right Panel: 3D Viewer ─── */}
          <div ref={viewerRef} className="flex-1 relative rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950">
            {/* Viewer Toolbar */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
              <button
                onClick={() => setResetTrigger((r) => r + 1)}
                className="p-2 bg-gray-800/90 hover:bg-gray-700/90 rounded-lg text-gray-400 hover:text-white transition-all border border-gray-700/50 backdrop-blur-sm"
                title="Reset Camera"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsWireframe(!isWireframe)}
                className={`p-2 rounded-lg transition-all border backdrop-blur-sm ${isWireframe
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : "bg-gray-800/90 hover:bg-gray-700/90 text-gray-400 hover:text-white border-gray-700/50"
                  }`}
                title="Toggle Wireframe"
              >
                <Layers size={15} />
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-2 rounded-lg transition-all border backdrop-blur-sm ${showLabels
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : "bg-gray-800/90 hover:bg-gray-700/90 text-gray-400 hover:text-white border-gray-700/50"
                  }`}
                title="Toggle Labels"
              >
                <Tag size={15} />
              </button>
              <button
                onClick={() => setShowEntryPoints(!showEntryPoints)}
                className={`p-2 rounded-lg transition-all border backdrop-blur-sm ${showEntryPoints
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-gray-800/90 hover:bg-gray-700/90 text-gray-400 hover:text-white border-gray-700/50"
                  }`}
                title="Toggle Entry Points"
              >
                <DoorOpen size={15} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-gray-800/90 hover:bg-gray-700/90 rounded-lg text-gray-400 hover:text-white transition-all border border-gray-700/50 backdrop-blur-sm"
                title="Fullscreen"
              >
                <Maximize2 size={15} />
              </button>
            </div>

            {/* 3D Canvas */}
            <Canvas
              shadows
              camera={{ position: [25, 20, 25], fov: 50, near: 0.1, far: 500 }}
              style={{ background: "#0a0a1a" }}
            >
              <Suspense fallback={null}>
                {/* Lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight
                  position={[20, 30, 10]}
                  intensity={0.8}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-10, 20, -10]} intensity={0.3} color="#4a90d9" />

                {/* Ground Grid */}
                <Grid
                  args={[100, 100]}
                  cellSize={1}
                  cellThickness={0.5}
                  cellColor="#1a2a3a"
                  sectionSize={5}
                  sectionThickness={1}
                  sectionColor="#2a3a4a"
                  fadeDistance={60}
                  fadeStrength={1}
                  followCamera={false}
                  position={[0, -0.01, 0]}
                />

                {/* Ground Plane */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                  <planeGeometry args={[100, 100]} />
                  <meshStandardMaterial color="#0d1117" transparent opacity={0.8} />
                </mesh>

                {/* Scene */}
                <Scene
                  sceneData={sceneData}
                  isWireframe={isWireframe}
                  showLabels={showLabels}
                  showEntryPoints={showEntryPoints}
                  selectedRoom={selectedRoom}
                  onRoomClick={setSelectedRoom}
                />

                {/* Camera Controls */}
                <CameraController resetTrigger={resetTrigger} />

                {/* Fog */}
                <fog attach="fog" color="#0a0a1a" near={40} far={80} />
              </Suspense>
            </Canvas>

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-20">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center p-8 rounded-2xl bg-gray-800/80 border border-gray-700/50 shadow-2xl"
                >
                  <div className="relative mb-4 inline-block">
                    <div className="w-16 h-16 border-4 border-gray-700 border-t-cyan-500 rounded-full animate-spin"></div>
                    <Box size={20} className="absolute inset-0 m-auto text-cyan-400" />
                  </div>
                  <p className="text-white font-medium">Generating 3D Scene...</p>
                  <p className="text-gray-500 text-sm mt-1">AI is analyzing and building the model</p>
                  <div className="flex justify-center gap-1 mt-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Empty State */}
            {!sceneData && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center p-6">
                  <Box size={48} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-gray-500 font-medium">No Scene Generated</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Describe a building, enter coordinates, or upload a blueprint
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Hint */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 text-[10px] text-gray-600">
              <Navigation size={10} />
              Drag to rotate • Scroll to zoom • Right-click to pan
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ARViewerPage;
