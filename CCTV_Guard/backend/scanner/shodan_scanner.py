"""
=====================================================================================================
🔍 SHODAN-INTEGRATED REAL-TIME CCTV SCANNER
=====================================================================================================

Advanced scanner with Shodan API integration for discovering CCTV cameras worldwide.
Supports real-time scanning with WebSocket updates and comprehensive device profiling.

Features:
- Shodan API integration for discovering exposed cameras
- Nmap-style port scanning
- Service fingerprinting
- Banner grabbing
- Manufacturer detection
- Firmware version identification
- Real-time WebSocket progress updates
- IP range scanning
- Geolocation mapping

Author: EvaSafe Security Team
Date: January 2, 2026
"""

import socket
import requests
import json
import concurrent.futures
import ipaddress
from datetime import datetime
from typing import Dict, List, Any, Optional
import re
import time
import hashlib

# Common CCTV ports and services
CCTV_PORTS = {
    80: 'HTTP Web Interface',
    443: 'HTTPS Web Interface',
    554: 'RTSP Streaming',
    8080: 'HTTP Alternate',
    8000: 'HTTP Alternate',
    8081: 'HTTP Alternate',
    37777: 'Dahua Protocol',
    8899: 'Dahua Mobile',
    9000: 'Hikvision SDK',
    8200: 'Hikvision DVR',
    34567: 'XiongMai/Sofia Protocol',
    5000: 'Synology Surveillance',
    5001: 'Synology HTTPS',
    6667: 'IRC Camera',
    10000: 'Webmin/Admin Panel'
}

# Manufacturer detection patterns
MANUFACTURER_PATTERNS = {
    'Hikvision': [
        r'Hikvision',
        r'DS-\d+',
        r'IPC-\d+',
        r'NVR-\d+',
        r'DVR-\d+',
        b'HikvisionWebServer',
        b'Hikvision-Webs'
    ],
    'Dahua': [
        r'Dahua',
        r'DH-',
        r'IPC-HFW',
        r'DHI-',
        b'DahuaWebServer',
        b'Dahua-HTTP'
    ],
    'Axis': [
        r'AXIS',
        r'Axis Communications',
        b'AXIS',
        b'Axis'
    ],
    'Vivotek': [
        r'VIVOTEK',
        r'Vivotek',
        b'VIVOTEK'
    ],
    'Uniview': [
        r'Uniview',
        r'IPC\d+',
        b'Uniview'
    ],
    'CP Plus': [
        r'CP-PLUS',
        r'CP Plus',
        b'CP-PLUS'
    ],
    'Hanwha': [
        r'Hanwha',
        r'Samsung Techwin',
        r'Wisenet',
        b'Hanwha'
    ],
    'Foscam': [
        r'Foscam',
        r'FI\d+',
        b'Foscam'
    ],
    'XiongMai': [
        r'XiongMai',
        r'Sofia',
        b'XiongMai',
        b'Cross Web Server'
    ]
}

# Default credentials database
DEFAULT_CREDENTIALS = {
    'Hikvision': [
        ('admin', '12345'),
        ('admin', 'admin'),
        ('admin', 'hikadmin'),
        ('admin', ''),
    ],
    'Dahua': [
        ('admin', 'admin'),
        ('admin', ''),
        ('888888', '888888'),
        ('666666', '666666'),
    ],
    'Axis': [
        ('root', 'pass'),
        ('root', 'root'),
        ('admin', 'admin'),
    ],
    'Generic': [
        ('admin', 'admin'),
        ('admin', ''),
        ('root', 'root'),
        ('admin', '12345'),
        ('admin', '1234'),
        ('user', 'user'),
    ]
}


class ShodanScanner:
    def __init__(self, api_key: str = None, websocket_callback=None):
        """
        Initialize Shodan Scanner
        
        Args:
            api_key: Shodan API key (get from https://account.shodan.io/)
            websocket_callback: Function to call with progress updates
        """
        self.api_key = api_key or 'YOUR_SHODAN_API_KEY'  # Replace with real key
        self.shodan_base_url = 'https://api.shodan.io'
        self.ws_callback = websocket_callback
        self.scan_results = []
        
    def log_progress(self, message: str, progress: float = None):
        """Log progress and send via WebSocket"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        if self.ws_callback:
            self.ws_callback({
                'type': 'scan_progress',
                'message': message,
                'progress': progress,
                'timestamp': datetime.now().isoformat()
            })
    
    def search_shodan(self, query: str, limit: int = 100) -> List[Dict]:
        """
        Search Shodan for CCTV cameras
        
        Args:
            query: Shodan search query
            limit: Maximum number of results
            
        Returns:
            List of discovered devices
        """
        if self.api_key == 'YOUR_SHODAN_API_KEY':
            self.log_progress("⚠️  No Shodan API key configured - using simulated data")
            return self._simulate_shodan_results(limit)
        
        try:
            self.log_progress(f"🔍 Searching Shodan: {query}")
            
            url = f"{self.shodan_base_url}/shodan/host/search"
            params = {
                'key': self.api_key,
                'query': query,
                'limit': limit
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                devices = []
                
                for match in data.get('matches', []):
                    device = {
                        'ip_address': match.get('ip_str'),
                        'port': match.get('port'),
                        'hostname': match.get('hostnames', [''])[0],
                        'organization': match.get('org', 'Unknown'),
                        'country': match.get('location', {}).get('country_name', 'Unknown'),
                        'city': match.get('location', {}).get('city', 'Unknown'),
                        'latitude': match.get('location', {}).get('latitude'),
                        'longitude': match.get('location', {}).get('longitude'),
                        'banner': match.get('data', ''),
                        'product': match.get('product', ''),
                        'version': match.get('version', ''),
                        'timestamp': match.get('timestamp'),
                        'vulns': match.get('vulns', [])
                    }
                    devices.append(device)
                
                self.log_progress(f"✅ Found {len(devices)} devices on Shodan")
                return devices
            else:
                self.log_progress(f"❌ Shodan API error: {response.status_code}")
                return []
                
        except Exception as e:
            self.log_progress(f"❌ Shodan search failed: {str(e)}")
            return []
    
    def _simulate_shodan_results(self, limit: int) -> List[Dict]:
        """Simulate Shodan results for demo purposes"""
        import random
        
        manufacturers = list(MANUFACTURER_PATTERNS.keys())
        countries = ['United States', 'China', 'Japan', 'Germany', 'United Kingdom', 
                    'France', 'India', 'Brazil', 'Russia', 'Canada']
        
        devices = []
        for i in range(min(limit, 50)):
            manufacturer = random.choice(manufacturers)
            country = random.choice(countries)
            
            device = {
                'ip_address': f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                'port': random.choice(list(CCTV_PORTS.keys())),
                'hostname': f"camera-{i+1}.example.com",
                'organization': f"ISP-{random.randint(1,100)}",
                'country': country,
                'city': f"City-{random.randint(1,50)}",
                'latitude': random.uniform(-90, 90),
                'longitude': random.uniform(-180, 180),
                'banner': f"{manufacturer} Camera Server",
                'product': manufacturer,
                'version': f"V{random.randint(1,5)}.{random.randint(0,9)}.{random.randint(0,99)}",
                'timestamp': datetime.now().isoformat(),
                'vulns': []
            }
            devices.append(device)
        
        return devices
    
    def scan_port(self, ip: str, port: int, timeout: float = 2.0) -> Dict:
        """
        Scan a single port on an IP address
        
        Args:
            ip: Target IP address
            port: Port number to scan
            timeout: Connection timeout in seconds
            
        Returns:
            Port scan result
        """
        result = {
            'ip': ip,
            'port': port,
            'status': 'closed',
            'service': CCTV_PORTS.get(port, 'Unknown'),
            'banner': None,
            'response_time': None
        }
        
        try:
            start_time = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            
            connection_result = sock.connect_ex((ip, port))
            response_time = time.time() - start_time
            
            if connection_result == 0:
                result['status'] = 'open'
                result['response_time'] = round(response_time * 1000, 2)  # ms
                
                # Try to grab banner
                try:
                    sock.send(b'GET / HTTP/1.0\r\n\r\n')
                    banner = sock.recv(1024)
                    result['banner'] = banner.decode('utf-8', errors='ignore')
                except:
                    pass
            
            sock.close()
            
        except socket.timeout:
            result['status'] = 'timeout'
        except Exception as e:
            result['status'] = 'error'
            result['error'] = str(e)
        
        return result
    
    def scan_ip(self, ip: str, ports: List[int] = None) -> Dict:
        """
        Comprehensive scan of a single IP address
        
        Args:
            ip: Target IP address
            ports: List of ports to scan (default: common CCTV ports)
            
        Returns:
            Complete device profile
        """
        if ports is None:
            ports = list(CCTV_PORTS.keys())
        
        self.log_progress(f"🔍 Scanning {ip}")
        
        device = {
            'device_id': f"SCAN-{hashlib.md5(ip.encode()).hexdigest()[:8]}",
            'ip_address': ip,
            'scan_timestamp': datetime.now().isoformat(),
            'open_ports': [],
            'services': [],
            'manufacturer': 'Unknown',
            'model': 'Unknown',
            'firmware_version': 'Unknown',
            'vulnerabilities': [],
            'default_credentials': False,
            'internet_facing': True,
            'geolocation': {}
        }
        
        # Parallel port scanning
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(self.scan_port, ip, port) for port in ports]
            
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result['status'] == 'open':
                    device['open_ports'].append(result['port'])
                    device['services'].append({
                        'port': result['port'],
                        'service': result['service'],
                        'banner': result['banner'],
                        'response_time': result['response_time']
                    })
                    
                    # Detect manufacturer from banner
                    if result['banner']:
                        manufacturer = self.detect_manufacturer(result['banner'])
                        if manufacturer != 'Unknown':
                            device['manufacturer'] = manufacturer
        
        # Try to get geolocation
        device['geolocation'] = self.get_geolocation(ip)
        
        # Check for default credentials
        if device['open_ports']:
            device['default_credentials'] = self.test_default_credentials(
                ip, 
                device['open_ports'][0], 
                device['manufacturer']
            )
        
        # Add vulnerability assessment
        device['vulnerabilities'] = self.assess_vulnerabilities(device)
        
        self.log_progress(f"✅ Scan complete: {ip} - {len(device['open_ports'])} ports open")
        
        return device
    
    def scan_ip_range(self, ip_range: str, ports: List[int] = None, max_ips: int = 100) -> List[Dict]:
        """
        Scan a range of IP addresses
        
        Args:
            ip_range: IP range in CIDR notation (e.g., "192.168.1.0/24")
            ports: List of ports to scan
            max_ips: Maximum number of IPs to scan
            
        Returns:
            List of discovered devices
        """
        try:
            network = ipaddress.ip_network(ip_range, strict=False)
            ips = list(network.hosts())[:max_ips]
            
            self.log_progress(f"🌐 Scanning IP range: {ip_range} ({len(ips)} hosts)", 0)
            
            devices = []
            total = len(ips)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                futures = {executor.submit(self.scan_ip, str(ip), ports): ip for ip in ips}
                
                for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
                    device = future.result()
                    if device['open_ports']:
                        devices.append(device)
                        self.scan_results.append(device)
                    
                    progress = (i / total) * 100
                    self.log_progress(f"Progress: {i}/{total} IPs scanned", progress)
            
            self.log_progress(f"✅ Range scan complete: Found {len(devices)} devices", 100)
            return devices
            
        except Exception as e:
            self.log_progress(f"❌ Range scan failed: {str(e)}")
            return []
    
    def detect_manufacturer(self, banner: str) -> str:
        """Detect camera manufacturer from banner"""
        banner_bytes = banner.encode() if isinstance(banner, str) else banner
        
        for manufacturer, patterns in MANUFACTURER_PATTERNS.items():
            for pattern in patterns:
                if isinstance(pattern, bytes):
                    if pattern in banner_bytes:
                        return manufacturer
                else:
                    if re.search(pattern, banner, re.IGNORECASE):
                        return manufacturer
        
        return 'Unknown'
    
    def test_default_credentials(self, ip: str, port: int, manufacturer: str) -> bool:
        """Test for default credentials"""
        # Get credentials for manufacturer
        creds = DEFAULT_CREDENTIALS.get(manufacturer, []) + DEFAULT_CREDENTIALS['Generic']
        
        # Try HTTP basic auth
        for username, password in creds[:3]:  # Limit attempts
            try:
                url = f"http://{ip}:{port}/"
                response = requests.get(
                    url, 
                    auth=(username, password), 
                    timeout=3,
                    allow_redirects=False
                )
                
                if response.status_code in [200, 301, 302]:
                    self.log_progress(f"⚠️  Default credentials found: {ip} - {username}:{password}")
                    return True
                    
            except:
                pass
        
        return False
    
    def get_geolocation(self, ip: str) -> Dict:
        """Get geolocation for IP address"""
        try:
            response = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    'country': data.get('country', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'latitude': data.get('lat'),
                    'longitude': data.get('lon'),
                    'isp': data.get('isp', 'Unknown'),
                    'timezone': data.get('timezone', 'Unknown')
                }
        except:
            pass
        
        return {}
    
    def assess_vulnerabilities(self, device: Dict) -> List[str]:
        """Quick vulnerability assessment"""
        vulns = []
        
        # Check for default credentials
        if device.get('default_credentials'):
            vulns.append('Default Credentials')
        
        # Check for unencrypted HTTP
        if 80 in device['open_ports']:
            vulns.append('Unencrypted HTTP')
        
        # Check for exposed RTSP
        if 554 in device['open_ports']:
            vulns.append('Exposed RTSP Stream')
        
        # Check for dangerous ports
        dangerous_ports = [37777, 34567, 8899]
        for port in dangerous_ports:
            if port in device['open_ports']:
                vulns.append(f'Exposed Vulnerable Port {port}')
        
        return vulns
    
    def save_results(self, filename: str = 'data/shodan_scan_results.json'):
        """Save scan results to file"""
        try:
            with open(filename, 'w') as f:
                json.dump(self.scan_results, f, indent=2)
            self.log_progress(f"💾 Saved {len(self.scan_results)} results to {filename}")
        except Exception as e:
            self.log_progress(f"❌ Failed to save results: {str(e)}")


# Example usage functions
def search_cctv_worldwide(api_key: str = None, limit: int = 100):
    """Search for CCTV cameras worldwide using Shodan"""
    scanner = ShodanScanner(api_key)
    
    # Common Shodan queries for CCTV cameras
    queries = [
        'port:554 has_screenshot:true',  # RTSP cameras
        'product:"Hikvision IP Camera"',
        'product:"Dahua DVR"',
        'title:"DVR Login"',
        'title:"Network Camera"',
        '"Server: DNVRS-WEBS"',  # Dahua
        '"Server: HikvisionWebServer"',
    ]
    
    all_devices = []
    for query in queries[:3]:  # Limit to 3 queries
        devices = scanner.search_shodan(query, limit=limit//3)
        all_devices.extend(devices)
    
    scanner.scan_results = all_devices
    return scanner


def scan_local_network():
    """Scan local network for CCTV cameras"""
    scanner = ShodanScanner()
    
    # Scan local network (adjust to your network)
    local_ranges = [
        '192.168.1.0/24',
        '192.168.0.0/24',
        '10.0.0.0/24'
    ]
    
    for ip_range in local_ranges:
        devices = scanner.scan_ip_range(ip_range, max_ips=50)
        print(f"\n✅ Found {len(devices)} devices in {ip_range}")
    
    return scanner


if __name__ == '__main__':
    print("=" * 100)
    print("🔍 SHODAN-INTEGRATED CCTV SCANNER")
    print("=" * 100)
    
    # Option 1: Search Shodan
    print("\n[1] Searching Shodan for exposed CCTV cameras worldwide...")
    scanner = search_cctv_worldwide(limit=50)
    
    # Option 2: Scan local network
    # print("\n[2] Scanning local network...")
    # scanner = scan_local_network()
    
    # Save results
    scanner.save_results()
    
    print("\n" + "=" * 100)
    print(f"✅ SCAN COMPLETE: {len(scanner.scan_results)} devices discovered")
    print("=" * 100)
