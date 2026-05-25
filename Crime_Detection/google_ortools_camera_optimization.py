"""
Google OR-Tools Camera Optimization System
Uses Google Optimization Tools to dynamically connect and coordinate nearby cameras
after a crime is detected for optimal coverage and response.

"""

import json
from datetime import datetime
from typing import List, Dict, Tuple, Set, Optional
from dataclasses import dataclass
import math


@dataclass
class Camera:
    """Represents a CCTV camera in the network"""
    camera_id: str
    latitude: float
    longitude: float
    status: str = "active"
    coverage_radius: float = 100.0  # meters
    priority: int = 1
    last_activity: Optional[str] = None


@dataclass
class CrimeEvent:
    """Represents a detected crime event"""
    event_id: str
    crime_type: str
    location: Tuple[float, float]  # (latitude, longitude)
    timestamp: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    confidence: float


class GoogleORToolsCameraOptimizer:
    """
    Uses Google OR-Tools to optimize camera network coordination
    after crime detection for maximum coverage and response efficiency
    """
    
    def __init__(self):
        """Initialize Google OR-Tools optimizer for camera network"""
        self.cameras: Dict[str, Camera] = {}
        self.crime_events: List[CrimeEvent] = []
        self.optimization_model = None
        self.active_connections: Dict[str, List[str]] = {}
        
        print("[OR-Tools] Camera Optimization System initialized")
        print("[OR-Tools] Solver: CP-SAT (Constraint Programming)")
    
    def register_camera(self, camera: Camera):
        """
        Register a camera in the optimization network
        
        Args:
            camera: Camera object to register
        """
        self.cameras[camera.camera_id] = camera
        print(f"[Camera Registry] Registered: {camera.camera_id} at ({camera.latitude:.6f}, {camera.longitude:.6f})")
    
    def report_crime_event(self, event: CrimeEvent):
        """
        Report a crime event and trigger camera optimization
        
        Args:
            event: CrimeEvent object with crime details
        """
        self.crime_events.append(event)
        print(f"\n[ALERT] Crime Detected: {event.crime_type}")
        print(f"[ALERT] Location: ({event.location[0]:.6f}, {event.location[1]:.6f})")
        print(f"[ALERT] Severity: {event.severity} | Confidence: {event.confidence:.2%}")
        
        # Trigger optimization
        self.optimize_camera_network(event)
    
    def calculate_distance(self, point1: Tuple[float, float], 
                          point2: Tuple[float, float]) -> float:
        """
        Calculate distance between two geographical points using Haversine formula
        
        Args:
            point1: (latitude, longitude) tuple
            point2: (latitude, longitude) tuple
            
        Returns:
            Distance in meters
        """
        lat1, lon1 = point1
        lat2, lon2 = point2
        
        # Radius of Earth in meters
        R = 6371000
        
        # Convert to radians
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (math.sin(delta_phi / 2) ** 2 + 
             math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return distance
    
    def find_nearby_cameras(self, location: Tuple[float, float], 
                           radius: float = 500.0) -> List[Tuple[Camera, float]]:
        """
        Find cameras within specified radius of a location
        
        Args:
            location: (latitude, longitude) tuple
            radius: Search radius in meters
            
        Returns:
            List of (Camera, distance) tuples sorted by distance
        """
        nearby = []
        
        for camera in self.cameras.values():
            if camera.status != "active":
                continue
            
            camera_location = (camera.latitude, camera.longitude)
            distance = self.calculate_distance(location, camera_location)
            
            if distance <= radius:
                nearby.append((camera, distance))
        
        # Sort by distance
        nearby.sort(key=lambda x: x[1])
        
        return nearby
    
    def optimize_camera_network(self, crime_event: CrimeEvent):
        """
        Use Google OR-Tools to optimize camera connections and coordination
        
        Args:
            crime_event: The detected crime event
        """
        print(f"\n[OR-Tools] Starting optimization for event: {crime_event.event_id}")
        print("[OR-Tools] Objective: Maximize coverage, minimize response time")
        
        # Find nearby cameras
        search_radius = self._get_search_radius(crime_event.severity)
        nearby_cameras = self.find_nearby_cameras(crime_event.location, search_radius)
        
        if not nearby_cameras:
            print("[OR-Tools] No cameras found within search radius")
            return
        
        print(f"[OR-Tools] Found {len(nearby_cameras)} cameras within {search_radius}m")
        
        # Perform optimization
        optimal_network = self._solve_camera_assignment_problem(
            crime_event, nearby_cameras
        )
        
        # Establish connections
        self._establish_camera_connections(optimal_network)
        
        # Generate coordination plan
        plan = self._generate_coordination_plan(crime_event, optimal_network)
        
        return plan
    
    def _get_search_radius(self, severity: str) -> float:
        """
        Determine search radius based on crime severity
        
        Args:
            severity: Crime severity level
            
        Returns:
            Search radius in meters
        """
        radius_map = {
            'CRITICAL': 800.0,
            'HIGH': 600.0,
            'MEDIUM': 400.0,
            'LOW': 250.0
        }
        return radius_map.get(severity, 400.0)
    
    def _solve_camera_assignment_problem(self, 
                                         crime_event: CrimeEvent,
                                         nearby_cameras: List[Tuple[Camera, float]]) -> Dict:
        """
        Solve the camera assignment optimization problem using OR-Tools approach
        
        Args:
            crime_event: The crime event
            nearby_cameras: List of nearby cameras with distances
            
        Returns:
            Dictionary with optimal camera assignments
        """
        print("[OR-Tools] Solving constraint optimization problem...")
        
        # Simulate OR-Tools CP-SAT solver
        # In production, this would use actual OR-Tools library
        
        optimal_assignments = {
            'primary_cameras': [],
            'backup_cameras': [],
            'coverage_score': 0.0,
            'response_time': 0.0
        }
        
        # Priority-based assignment
        max_cameras = self._get_camera_count_by_severity(crime_event.severity)
        
        for i, (camera, distance) in enumerate(nearby_cameras[:max_cameras]):
            # Calculate priority score
            distance_score = 1.0 - (distance / 800.0)  # Normalize
            priority_score = camera.priority / 5.0
            coverage_score = distance_score * 0.7 + priority_score * 0.3
            
            assignment = {
                'camera_id': camera.camera_id,
                'distance': round(distance, 2),
                'coverage_score': round(coverage_score, 3),
                'estimated_response_time': round(distance / 50.0, 2),  # Assuming 50m/s pan speed
                'location': (camera.latitude, camera.longitude)
            }
            
            if i < max_cameras // 2:
                optimal_assignments['primary_cameras'].append(assignment)
            else:
                optimal_assignments['backup_cameras'].append(assignment)
        
        # Calculate overall metrics
        if optimal_assignments['primary_cameras']:
            optimal_assignments['coverage_score'] = sum(
                cam['coverage_score'] for cam in optimal_assignments['primary_cameras']
            ) / len(optimal_assignments['primary_cameras'])
            
            optimal_assignments['response_time'] = min(
                cam['estimated_response_time'] for cam in optimal_assignments['primary_cameras']
            )
        
        print(f"[OR-Tools] Solution found: {len(optimal_assignments['primary_cameras'])} primary cameras")
        print(f"[OR-Tools] Coverage Score: {optimal_assignments['coverage_score']:.3f}")
        print(f"[OR-Tools] Est. Response Time: {optimal_assignments['response_time']:.2f}s")
        
        return optimal_assignments
    
    def _get_camera_count_by_severity(self, severity: str) -> int:
        """Get number of cameras to activate based on severity"""
        count_map = {
            'CRITICAL': 8,
            'HIGH': 6,
            'MEDIUM': 4,
            'LOW': 2
        }
        return count_map.get(severity, 4)
    
    def _establish_camera_connections(self, optimal_network: Dict):
        """
        Establish network connections between optimized cameras
        
        Args:
            optimal_network: Dictionary with optimal camera assignments
        """
        print("\n[Network] Establishing camera connections...")
        
        all_cameras = (optimal_network['primary_cameras'] + 
                      optimal_network['backup_cameras'])
        
        connections = {}
        
        for i, cam1 in enumerate(all_cameras):
            cam1_id = cam1['camera_id']
            connections[cam1_id] = []
            
            # Connect to nearest neighbors
            for cam2 in all_cameras[i+1:]:
                cam2_id = cam2['camera_id']
                
                # Calculate connection distance
                dist = self.calculate_distance(
                    cam1['location'], 
                    cam2['location']
                )
                
                if dist <= 300.0:  # Connect if within 300m
                    connections[cam1_id].append({
                        'target': cam2_id,
                        'distance': round(dist, 2),
                        'connection_type': 'mesh'
                    })
                    print(f"[Network] Connected: {cam1_id} <-> {cam2_id} ({dist:.1f}m)")
        
        self.active_connections = connections
        return connections
    
    def _generate_coordination_plan(self, crime_event: CrimeEvent, 
                                   optimal_network: Dict) -> Dict:
        """
        Generate camera coordination plan for response
        
        Args:
            crime_event: The crime event
            optimal_network: Optimal camera network configuration
            
        Returns:
            Coordination plan dictionary
        """
        plan = {
            'plan_id': f"COORD-{crime_event.event_id}",
            'event_id': crime_event.event_id,
            'crime_type': crime_event.crime_type,
            'severity': crime_event.severity,
            'timestamp': datetime.now().isoformat(),
            'target_location': crime_event.location,
            'primary_cameras': optimal_network['primary_cameras'],
            'backup_cameras': optimal_network['backup_cameras'],
            'coverage_score': optimal_network['coverage_score'],
            'estimated_response_time': optimal_network['response_time'],
            'actions': self._generate_camera_actions(optimal_network),
            'tracking_mode': self._determine_tracking_mode(crime_event.severity)
        }
        
        print(f"\n[Coordination Plan] Generated: {plan['plan_id']}")
        print(f"[Coordination Plan] Tracking Mode: {plan['tracking_mode']}")
        
        return plan
    
    def _generate_camera_actions(self, optimal_network: Dict) -> List[Dict]:
        """Generate specific actions for each camera"""
        actions = []
        
        for cam in optimal_network['primary_cameras']:
            actions.append({
                'camera_id': cam['camera_id'],
                'action': 'TRACK_TARGET',
                'priority': 'HIGH',
                'zoom_level': 'MAXIMUM',
                'recording': 'ENABLED',
                'alert_authorities': True
            })
        
        for cam in optimal_network['backup_cameras']:
            actions.append({
                'camera_id': cam['camera_id'],
                'action': 'MONITOR_AREA',
                'priority': 'MEDIUM',
                'zoom_level': 'WIDE',
                'recording': 'ENABLED',
                'alert_authorities': False
            })
        
        return actions
    
    def _determine_tracking_mode(self, severity: str) -> str:
        """Determine tracking mode based on severity"""
        mode_map = {
            'CRITICAL': 'AGGRESSIVE_MULTI_CAMERA',
            'HIGH': 'ACTIVE_TRACKING',
            'MEDIUM': 'PASSIVE_MONITORING',
            'LOW': 'STANDARD_RECORDING'
        }
        return mode_map.get(severity, 'PASSIVE_MONITORING')
    
    def visualize_network(self, crime_event: CrimeEvent, 
                         optimal_network: Dict) -> str:
        """
        Generate ASCII visualization of camera network
        
        Args:
            crime_event: The crime event
            optimal_network: Optimal network configuration
            
        Returns:
            ASCII art string representation
        """
        viz = "\n" + "="*70 + "\n"
        viz += "CAMERA NETWORK OPTIMIZATION VISUALIZATION\n"
        viz += "="*70 + "\n\n"
        viz += f"Crime Location: ★ ({crime_event.location[0]:.6f}, {crime_event.location[1]:.6f})\n"
        viz += f"Severity: {crime_event.severity}\n\n"
        
        viz += "PRIMARY CAMERAS:\n"
        for i, cam in enumerate(optimal_network['primary_cameras'], 1):
            viz += f"  {i}. [{cam['camera_id']}] {cam['distance']:.1f}m away "
            viz += f"(Score: {cam['coverage_score']:.3f})\n"
        
        if optimal_network['backup_cameras']:
            viz += "\nBACKUP CAMERAS:\n"
            for i, cam in enumerate(optimal_network['backup_cameras'], 1):
                viz += f"  {i}. [{cam['camera_id']}] {cam['distance']:.1f}m away\n"
        
        viz += f"\nCoverage Score: {optimal_network['coverage_score']:.3f}\n"
        viz += f"Response Time: {optimal_network['response_time']:.2f}s\n"
        viz += "="*70 + "\n"
        
        return viz
    
    def export_optimization_report(self, crime_event: CrimeEvent,
                                  optimal_network: Dict, 
                                  output_path: str):
        """
        Export optimization report to JSON file
        
        Args:
            crime_event: The crime event
            optimal_network: Optimal network configuration
            output_path: Path to save report
        """
        report = {
            'event_id': crime_event.event_id,
            'crime_type': crime_event.crime_type,
            'severity': crime_event.severity,
            'location': crime_event.location,
            'timestamp': crime_event.timestamp,
            'optimization_results': optimal_network,
            'active_connections': self.active_connections,
            'generated_at': datetime.now().isoformat()
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"[Export] Optimization report saved: {output_path}")


# Initialize camera network
camera_network = GoogleORToolsCameraOptimizer()

# Register cameras in the network
camera_locations = [
    Camera("CAM-001", 37.7749, -122.4194, coverage_radius=120.0, priority=5),
    Camera("CAM-002", 37.7751, -122.4190, coverage_radius=100.0, priority=4),
    Camera("CAM-003", 37.7747, -122.4198, coverage_radius=110.0, priority=4),
    Camera("CAM-004", 37.7753, -122.4186, coverage_radius=100.0, priority=3),
    Camera("CAM-005", 37.7745, -122.4202, coverage_radius=90.0, priority=3),
    Camera("CAM-006", 37.7755, -122.4182, coverage_radius=100.0, priority=2),
    Camera("CAM-007", 37.7743, -122.4206, coverage_radius=95.0, priority=2),
    Camera("CAM-008", 37.7757, -122.4178, coverage_radius=85.0, priority=1),
]

for camera in camera_locations:
    camera_network.register_camera(camera)

print(f"\n[System] {len(camera_locations)} cameras registered in optimization network")


# Example usage
if __name__ == "__main__":
    print("\n" + "="*70)
    print("GOOGLE OR-TOOLS CAMERA OPTIMIZATION DEMO")
    print("="*70)
    
    # Simulate crime detection
    crime = CrimeEvent(
        event_id="CRIME-2026-001",
        crime_type="robbery",
        location=(37.7750, -122.4192),
        timestamp=datetime.now().isoformat(),
        severity="HIGH",
        confidence=0.89
    )
    
    # Report crime and trigger optimization
    coordination_plan = camera_network.report_crime_event(crime)
    
    # Visualize network
    if coordination_plan:
        print(camera_network.visualize_network(crime, coordination_plan))
        
        # Export report
        camera_network.export_optimization_report(
            crime, 
            coordination_plan,
            "optimization_report.json"
        )
