"""
Dijkstra's Algorithm Implementation

"""

import heapq
from datetime import datetime
from typing import Dict, List, Tuple, Set


class Graph:
    """Graph representation for Dijkstra's algorithm"""
    
    def __init__(self):
        self.nodes: Set[str] = set()
        self.edges: Dict[str, List[Tuple[str, int]]] = {}
    
    def add_camera(self, camera_id: str, location: str = "", status: str = "active"):
        """Register a CCTV camera in the network"""
        self.cameras.add(camera_id)
        if camera_id not in self.connections:
            self.connections[camera_id] = []
        self.camera_metadata[camera_id] = {
            "location": location,
            "status": status,
            "last_checked": datetime.now().isoformat()
        }
    
    def connect_cameras(self, from_camera: str, to_camera: str, distance: int):
        """Connect two cameras with specified distance"""
        if from_camera not in self.edges:
            self.edges[from_camera] = []
        if to_camera not in self.edges:
            self.edges[to_camera] = []
        
        self.edges[from_camera].append((to_camera, distance))
        self.edges[to_camera].append((from_camera, distance))
        
        self.nodes.add(from_camera)
        self.nodes.add(to_camera)

    def find_optimal_coverage(self, source_camera: str) -> Dict[str, int]:
        """
        Calculate optimal signal routing distances from source camera to all other cameras
        Returns dictionary of camera_id: distance (in meters)
        """
        # Initialize coverage distances
        distances = {camera: float('infinity') for camera in self.cameras}
        distances[source_camera] = 0
        
        # Priority queue: (distance, camera_id)
        pq = [(0, source_camera)]
        covered = set()
        
        while pq:
            current_distance, current_camera = heapq.heappop(pq)
            
            if current_camera in covered:
                continue
            
            covered.add(current_camera)
            
            # Check connected cameras
            for nearby_camera, distance in self.connections.get(current_camera, []):
                total_distance = current_distance + distance
                
                if total_distance < distances[nearby_camera]:
                    distances[nearby_camera] = total_distance
                    heapq.heappush(pq, (total_distance, nearby_camera))
        
        return distances
    
    def find_camera_route(self, from_camera: str, to_camera: str) -> Tuple[List[str], float]:
        """
        Find optimal signal route from source camera to target camera
        Returns (camera_path, total_distance)
        """
        distances = {camera: float('infinity') for camera in self.cameras}
        distances[from_camera] = 0
        previous = {camera: None for camera in self.cameras}
        
        pq = [(0, from_camera)]
        processed = set()
        
        while pq:
            current_distance, current_camera = heapq.heappop(pq)
            
            if current_camera in processed:
                continue
            
            processed.add(current_camera)
            
            if current_camera == to_camera:
                break
            
            for nearby_camera, distance in self.connections.get(current_camera, []):
                total_distance = current_distance + distance
                
                if total_distance < distances[nearby_camera]:
                    distances[nearby_camera] = total_distance
                    previous[nearby_camera] = current_camera
                    heapq.heappush(pq, (total_distance, nearby_camera))
        
        # Reconstruct camera route
        route = []
        current = to_camera
        while current is not None:
            route.append(current)
            current = previous[current]
        route.reverse()
        
        return route, distances[to_camera]
    
    def get_network_status(self) -> dict:
        """Get current status of CCTV network"""
        return {
            "total_cameras": len(self.cameras),
            "active_connections": sum(len(conn) for conn in self.connections.values()),
            "cameras": list(self.cameras),
            "metadata": self.camera_metadata
        }


# Initialize CCTV network with nearby cameras
cctv_network = Graph()

# Main area cameras
cctv_network.connect_cameras('CAM-001', 'CAM-002', 45)
cctv_network.connect_cameras('CAM-001', 'CAM-003', 32)
cctv_network.connect_cameras('CAM-002', 'CAM-003', 18)
cctv_network.connect_cameras('CAM-002', 'CAM-004', 67)
cctv_network.connect_cameras('CAM-003', 'CAM-004', 89)
cctv_network.connect_cameras('CAM-003', 'CAM-005', 120)
cctv_network.connect_cameras('CAM-004', 'CAM-005', 28)
cctv_network.connect_cameras('CAM-004', 'CAM-006', 73)

# Isolated camera - CAM-6b (out of range, no connections)
cctv_network.add_camera('CAM-6b', location="Remote Area", status="isolated")

# Update metadata for connected cameras
for cam_id in ['CAM-001', 'CAM-002', 'CAM-003', 'CAM-004', 'CAM-005', 'CAM-006']:
    cctv_network.camera_metadata[cam_id].update({
        "location": f"Sector {cam_id[-1]}",
        "status": "active"
    })
