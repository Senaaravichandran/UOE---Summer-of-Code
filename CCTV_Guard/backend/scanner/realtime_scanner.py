import asyncio
import json
import socket
import struct
import time
from datetime import datetime
from typing import Dict, List, Optional
import ipaddress
from concurrent.futures import ThreadPoolExecutor
import requests

class RealTimeScanEngine:
    """Real-time CCTV scanning engine with WebSocket support"""
    
    def __init__(self, websocket_callback=None):
        self.websocket_callback = websocket_callback
        self.active_scans = {}
        self.scan_results = {}
        
        # CCTV common ports
        self.CCTV_PORTS = {
            80: 'HTTP',
            443: 'HTTPS',
            554: 'RTSP',
            8080: 'HTTP-Alt',
            8000: 'HTTP-Alt2',
            8081: 'HTTP-Alt3',
            37777: 'Dahua',
            37778: 'Dahua-TCP',
            8899: 'HIK-DVR',
            9000: 'HIK-NVR',
            5000: 'Synology',
            34567: 'XiongMai',
            1935: 'RTMP',
            7001: 'Axis'
        }
        
        self.MANUFACTURER_PATTERNS = {
            'Hikvision': [b'hikvision', b'HIKVISION', b'HIK-', b'DS-'],
            'Dahua': [b'Dahua', b'DH-', b'dahua'],
            'Axis': [b'AXIS', b'Axis'],
            'Vivotek': [b'VIVOTEK', b'Vivotek'],
            'Uniview': [b'Uniview', b'IPC'],
            'CP Plus': [b'CP PLUS', b'CP-'],
            'Hanwha': [b'Hanwha', b'WISENET'],
            'Foscam': [b'Foscam', b'FOSCAM'],
            'XiongMai': [b'XiongMai', b'Sofia', b'NetSurveillance']
        }
        
        # Default credentials database
        self.DEFAULT_CREDENTIALS = [
            ('admin', 'admin'), ('admin', '12345'), ('admin', 'password'),
            ('admin', ''), ('root', 'root'), ('root', 'admin'),
            ('admin', '888888'), ('admin', '666666'), ('user', 'user'),
            ('service', 'service'), ('supervisor', 'supervisor')
        ]
        
    def broadcast(self, message_type: str, data: Dict):
        """Broadcast message via WebSocket"""
        if self.websocket_callback:
            message = {'type': message_type, **data}
            self.websocket_callback(json.dumps(message))
    
    def scan_port(self, ip: str, port: int, timeout: float = 2.0) -> Optional[Dict]:
        """Scan a single port"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((ip, port))
            
            if result == 0:
                # Port is open, try banner grabbing
                banner = None
                try:
                    sock.send(b'GET / HTTP/1.1\r\nHost: ' + ip.encode() + b'\r\n\r\n')
                    banner = sock.recv(1024)
                except:
                    pass
                
                sock.close()
                
                return {
                    'port': port,
                    'state': 'open',
                    'service': self.CCTV_PORTS.get(port, 'unknown'),
                    'banner': banner.decode('utf-8', errors='ignore') if banner else None
                }
            
            sock.close()
            return None
            
        except Exception as e:
            return None
    
    def detect_manufacturer(self, banner: str, open_ports: List[Dict]) -> str:
        """Detect manufacturer from banner and ports"""
        if not banner:
            # Detect from ports
            port_nums = [p['port'] for p in open_ports]
            if 37777 in port_nums or 37778 in port_nums:
                return 'Dahua'
            elif 8899 in port_nums or 9000 in port_nums:
                return 'Hikvision'
            elif 34567 in port_nums:
                return 'XiongMai'
            elif 7001 in port_nums:
                return 'Axis'
            return 'Unknown'
        
        banner_bytes = banner.encode('utf-8')
        for manufacturer, patterns in self.MANUFACTURER_PATTERNS.items():
            for pattern in patterns:
                if pattern in banner_bytes:
                    return manufacturer
        
        return 'Unknown'
    
    def test_default_credentials(self, ip: str, port: int = 80) -> Optional[tuple]:
        """Test default credentials"""
        for username, password in self.DEFAULT_CREDENTIALS[:3]:  # Test top 3 for speed
            try:
                # Simulate HTTP Basic Auth test
                response = requests.get(
                    f'http://{ip}:{port}/',
                    auth=(username, password),
                    timeout=2
                )
                if response.status_code == 200:
                    return (username, password)
            except:
                continue
        return None
    
    def assess_vulnerabilities(self, device: Dict) -> Dict:
        """Assess device vulnerabilities"""
        vulnerabilities = []
        risk_score = 0
        
        # Check for default credentials
        if device.get('default_creds'):
            vulnerabilities.append({
                'type': 'Default Credentials',
                'severity': 'CRITICAL',
                'description': f"Device accessible with credentials: {device['default_creds'][0]}/{device['default_creds'][1]}"
            })
            risk_score += 40
        
        # Check for exposed RTSP
        if any(p['port'] == 554 for p in device.get('open_ports', [])):
            vulnerabilities.append({
                'type': 'Exposed RTSP',
                'severity': 'HIGH',
                'description': 'RTSP stream accessible without authentication'
            })
            risk_score += 25
        
        # Check for insecure HTTP
        if any(p['port'] == 80 for p in device.get('open_ports', [])):
            vulnerabilities.append({
                'type': 'Insecure HTTP',
                'severity': 'MEDIUM',
                'description': 'Web interface accessible via unencrypted HTTP'
            })
            risk_score += 15
        
        # Check for known vulnerable ports
        vulnerable_ports = [37777, 8899, 34567]
        for vport in vulnerable_ports:
            if any(p['port'] == vport for p in device.get('open_ports', [])):
                vulnerabilities.append({
                    'type': 'Known Vulnerable Port',
                    'severity': 'HIGH',
                    'description': f'Port {vport} associated with known exploits'
                })
                risk_score += 20
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = 'CRITICAL'
        elif risk_score >= 50:
            risk_level = 'HIGH'
        elif risk_score >= 30:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        return {
            'vulnerabilities': vulnerabilities,
            'risk_score': min(risk_score, 100),
            'risk_level': risk_level
        }
    
    def scan_ip(self, ip: str, ports: List[int], scan_id: str) -> Optional[Dict]:
        """Scan a single IP"""
        try:
            # Scan ports
            open_ports = []
            for port in ports:
                result = self.scan_port(ip, port, timeout=1.5)
                if result:
                    open_ports.append(result)
            
            if not open_ports:
                return None
            
            # Device found
            banner = next((p['banner'] for p in open_ports if p['banner']), None)
            manufacturer = self.detect_manufacturer(banner, open_ports)
            
            device = {
                'ip': ip,
                'manufacturer': manufacturer,
                'model': 'Unknown',
                'open_ports': open_ports,
                'banner': banner,
                'discovered_at': datetime.now().isoformat()
            }
            
            # Test default credentials (only for critical ports)
            if any(p['port'] in [80, 8080] for p in open_ports):
                default_creds = self.test_default_credentials(ip)
                if default_creds:
                    device['default_creds'] = default_creds
            
            # Assess vulnerabilities
            vuln_assessment = self.assess_vulnerabilities(device)
            device.update(vuln_assessment)
            
            # Broadcast discovery
            self.broadcast('device_discovered', {'device': device})
            
            # Broadcast vulnerabilities
            for vuln in device['vulnerabilities']:
                self.broadcast('vulnerability_found', {
                    'ip': ip,
                    'vulnerability': vuln['type'],
                    'severity': vuln['severity'],
                    'description': vuln['description']
                })
            
            return device
            
        except Exception as e:
            self.broadcast('scan_error', {'ip': ip, 'error': str(e)})
            return None
    
    def scan_range(self, ip_range: str, ports: List[int], threads: int = 10) -> List[Dict]:
        """Scan an IP range"""
        scan_id = f"scan_{int(time.time())}"
        
        try:
            # Parse IP range
            network = ipaddress.ip_network(ip_range, strict=False)
            ips = [str(ip) for ip in network.hosts()]
            
            if len(ips) == 0:
                ips = [str(network.network_address)]
            
            # Limit to reasonable size
            if len(ips) > 1024:
                ips = ips[:1024]
            
            self.broadcast('scan_started', {
                'scan_id': scan_id,
                'target': ip_range,
                'total_ips': len(ips),
                'ports': ports
            })
            
            devices = []
            start_time = time.time()
            
            # Scan IPs in parallel
            with ThreadPoolExecutor(max_workers=threads) as executor:
                futures = []
                for ip in ips:
                    future = executor.submit(self.scan_ip, ip, ports, scan_id)
                    futures.append(future)
                
                for i, future in enumerate(futures):
                    result = future.result()
                    if result:
                        devices.append(result)
                    
                    # Broadcast progress
                    elapsed = int(time.time() - start_time)
                    self.broadcast('scan_progress', {
                        'scan_id': scan_id,
                        'scanned': i + 1,
                        'total': len(ips),
                        'elapsed': elapsed,
                        'device': result
                    })
            
            # Scan complete
            elapsed = int(time.time() - start_time)
            self.broadcast('scan_complete', {
                'scan_id': scan_id,
                'devices_found': len(devices),
                'vulnerabilities': sum(len(d['vulnerabilities']) for d in devices),
                'elapsed': elapsed
            })
            
            self.scan_results[scan_id] = {
                'devices': devices,
                'started_at': datetime.now().isoformat(),
                'duration': elapsed,
                'target': ip_range
            }
            
            return devices
            
        except Exception as e:
            self.broadcast('scan_error', {'scan_id': scan_id, 'error': str(e)})
            return []
    
    def quick_scan(self, target: str) -> List[Dict]:
        """Quick scan with common ports"""
        common_ports = [80, 443, 554, 8080]
        return self.scan_range(target, common_ports, threads=20)
    
    def full_scan(self, target: str) -> List[Dict]:
        """Full scan with all known CCTV ports"""
        all_ports = list(self.CCTV_PORTS.keys())
        return self.scan_range(target, all_ports, threads=10)
    
    def stealth_scan(self, target: str) -> List[Dict]:
        """Stealth scan with slower timing"""
        common_ports = [80, 443, 554, 8080]
        return self.scan_range(target, common_ports, threads=5)
    
    def aggressive_scan(self, target: str) -> List[Dict]:
        """Aggressive scan with all features"""
        all_ports = list(self.CCTV_PORTS.keys())
        return self.scan_range(target, all_ports, threads=50)


if __name__ == '__main__':
    # Test the scanner
    def print_callback(message):
        data = json.loads(message)
        print(f"[{data['type']}] {json.dumps(data, indent=2)}")
    
    scanner = RealTimeScanEngine(websocket_callback=print_callback)
    
    print("=" * 100)
    print("🔍 REAL-TIME CCTV SCANNER")
    print("=" * 100)
    
    # Test scan on local network (change to your network)
    results = scanner.quick_scan('192.168.1.0/28')  # Scans first 16 IPs
    
    print("\n" + "=" * 100)
    print(f"📊 SCAN COMPLETE: {len(results)} devices found")
    print("=" * 100)
    
    for device in results:
        print(f"\n📡 {device['ip']} - {device['manufacturer']}")
        print(f"   Risk: {device['risk_level']} ({device['risk_score']}/100)")
        print(f"   Vulnerabilities: {len(device['vulnerabilities'])}")
        for vuln in device['vulnerabilities']:
            print(f"      - {vuln['severity']}: {vuln['type']}")
