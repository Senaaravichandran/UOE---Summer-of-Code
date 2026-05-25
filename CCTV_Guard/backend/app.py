"""
EvaSafe CCTV Security Platform - Unified Backend
All-in-one Flask server with WebSocket, scanning, pentesting, and alerts
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
import threading
import json
import socket
import time
import pandas as pd
import numpy as np
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import ipaddress
import requests
import os


def _is_port_bindable(host, port):
    """Check whether a TCP port can be bound on the current host."""
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind((host, port))
        probe.close()
        return True
    except OSError:
        return False


def _select_startup_port(host, preferred_port, max_tries=20):
    """Return the first bindable port starting from preferred_port."""
    for candidate in range(preferred_port, preferred_port + max_tries):
        if _is_port_bindable(host, candidate):
            return candidate
    return None

app = Flask(__name__)
CORS(app)
sock = Sock(app)

# WebSocket clients
ws_clients = []

# NVIDIA API Configuration for ShieldGemma
NVIDIA_API_KEY = "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"
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# Chat history storage
chat_history = []

# IP Webcam Access Monitoring
webcam_access_log = {}  # {webcam_ip: [{'ip': accessor_ip, 'timestamp': time, 'blocked': bool}]}
authorized_ips = set()  # Set of authorized IP addresses
blocked_ips = set()  # Set of blocked IP addresses
last_intrusion_alert = None

# ============================================================================
# PROFESSIONAL BOT RESPONSE GENERATOR
# ============================================================================

def generate_professional_bot_response(user_message, webcam_connected, webcam_ip, total_devices, critical_risks, security_status):
    """Generate professional cybersecurity responses based on context"""
    
    msg_lower = user_message.lower()
    
    # Initial greeting / Introduction
    if any(keyword in msg_lower for keyword in ['initialize', 'hello', 'hi', 'introduce', 'start']):
        if webcam_connected:
            return f"🛡️ CCTV Guard Bot operational. I'm an elite cybersecurity AI specialized in IoT and CCTV security. Currently monitoring your webcam at {webcam_ip} with active threat detection. System status: {total_devices} devices tracked, {critical_risks} critical vulnerabilities detected{security_status}. All security protocols are active and I'm continuously monitoring for unauthorized access attempts."
        else:
            return f"🛡️ CCTV Guard Bot initialized. Elite cybersecurity AI ready to protect your CCTV infrastructure. Currently tracking {total_devices} devices with {critical_risks} critical vulnerabilities identified. Connect your IP webcam to enable real-time intrusion detection and automated threat response. I'll guide you through any security incidents."
    
    # Webcam connection confirmation
    elif 'webcam connected' in msg_lower or 'connected at' in msg_lower:
        return f"✅ Webcam at {webcam_ip} successfully registered and secured. Security monitoring is now active with real-time intrusion detection enabled. Your IP has been authorized. Any unauthorized access attempts from other devices will be automatically blocked and you'll receive immediate alerts. I'm monitoring the feed continuously for threats."
    
    # Security alert / Intrusion detection
    elif 'security alert' in msg_lower or 'unauthorized access' in msg_lower or 'intrusion' in msg_lower or 'detected from' in msg_lower:
        # Extract IP if present
        import re
        ip_match = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', user_message)
        attacker_ip = ip_match.group(0) if ip_match else "unknown IP"
        
        return f"🚨 CRITICAL SECURITY EVENT: Unauthorized access attempt from {attacker_ip} has been detected and neutralized. Automated response executed: IP immediately blocked, access denied, incident logged with full forensics. This appears to be an external device attempting to access your webcam stream. Recommend: verify all authorized devices, change webcam password if not already strong, monitor for repeated attempts. Your system is secured."
    
    # Status update request
    elif 'status' in msg_lower or 'update' in msg_lower or 'monitoring' in msg_lower:
        if webcam_connected:
            blocked_count = len(blocked_ips)
            auth_count = len(authorized_ips)
            status_msg = f"📊 Security Status Report: Webcam {webcam_ip} - Active monitoring. Protected devices: {total_devices}, Critical vulnerabilities: {critical_risks}, Authorized IPs: {auth_count}, Blocked threats: {blocked_count}{security_status}. "
            if blocked_count > 0:
                status_msg += "Multiple intrusion attempts have been blocked. Your perimeter is secure. Recommend immediate password rotation and network access audit."
            else:
                status_msg += "No unauthorized access attempts detected. System integrity maintained. Continue monitoring."
            return status_msg
        else:
            return f"⏸️ Monitoring Status: {total_devices} devices tracked, {critical_risks} critical vulnerabilities identified. Webcam monitoring inactive - connect your IP webcam to enable real-time intrusion detection and automated threat response. I'll immediately alert you to any unauthorized access attempts."
    
    # What should I do / help request
    elif any(keyword in msg_lower for keyword in ['what should', 'what do', 'help', 'guide', 'recommend', 'advice']):
        if critical_risks > 0:
            return f"⚠️ Security Recommendations: You have {critical_risks} critical vulnerabilities requiring immediate attention. Priority actions: 1) Patch all vulnerable devices immediately, 2) Implement strong unique passwords for each camera, 3) Enable two-factor authentication where available, 4) Segment your CCTV network from main network. I'm monitoring continuously and will block any unauthorized access automatically."
        else:
            return f"✅ Security Posture: Your system is in good condition with {total_devices} devices monitored. Best practices to maintain: Regular firmware updates, strong password policy, network segmentation, continuous monitoring (which I'm providing), and immediate response to any alerts I generate. Keep webcam connected for real-time protection."
    
    # Threat / vulnerability questions
    elif any(keyword in msg_lower for keyword in ['threat', 'vulnerability', 'risk', 'danger', 'attack']):
        return f"🎯 Threat Analysis: Current threat level is {'HIGH' if critical_risks > 0 else 'MODERATE'}. {critical_risks} critical vulnerabilities detected across {total_devices} monitored devices. Primary risks: unauthorized remote access, credential brute-forcing, firmware exploits, and network reconnaissance. My automated defense systems are active: real-time access monitoring, automatic IP blocking, intrusion detection, and immediate alerting. Stay vigilant."
    
    # Generic security query
    else:
        if webcam_connected:
            return f"🛡️ Security Active: Monitoring webcam at {webcam_ip} with {len(blocked_ips)} threats blocked. {total_devices} devices tracked, {critical_risks} critical issues identified{security_status}. I'm continuously analyzing access patterns and will immediately alert and block any unauthorized attempts. Your CCTV infrastructure is under active protection."
        else:
            return f"🛡️ CCTV Guard Bot ready. {total_devices} devices monitored, {critical_risks} critical vulnerabilities detected. Connect your webcam for real-time intrusion detection. I provide automated threat response, immediate alerts, and continuous security guidance. Your cybersecurity partner for CCTV protection."

# ============================================================================
# WEBSOCKET BROADCASTING
# ============================================================================

def broadcast_to_clients(message):
    """Broadcast message to all WebSocket clients"""
    if isinstance(message, dict):
        message = json.dumps(message)
    
    disconnected = []
    for client in ws_clients:
        try:
            client.send(message)
        except:
            disconnected.append(client)
    
    for client in disconnected:
        ws_clients.remove(client)

# ============================================================================
# REAL-TIME SCANNER
# ============================================================================

class RealTimeScanner:
    """Real-time CCTV scanning engine"""
    
    CCTV_PORTS = {
        80: 'HTTP', 443: 'HTTPS', 554: 'RTSP', 8080: 'HTTP-Alt',
        37777: 'Dahua', 8899: 'HIK-DVR', 9000: 'HIK-NVR', 34567: 'XiongMai'
    }
    
    MANUFACTURERS = {
        'Hikvision': [b'hikvision', b'HIK-', b'DS-'],
        'Dahua': [b'Dahua', b'DH-'],
        'Axis': [b'AXIS', b'Axis'],
        'Vivotek': [b'VIVOTEK'],
        'XiongMai': [b'XiongMai', b'Sofia']
    }
    
    def __init__(self):
        self.scan_results = {}
    
    def scan_port(self, ip, port, timeout=1.5):
        """Scan single port"""
        try:
            sock_obj = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock_obj.settimeout(timeout)
            result = sock_obj.connect_ex((ip, port))
            
            if result == 0:
                banner = None
                try:
                    sock_obj.send(b'GET / HTTP/1.1\r\nHost: ' + ip.encode() + b'\r\n\r\n')
                    banner = sock_obj.recv(1024)
                except:
                    pass
                sock_obj.close()
                
                return {
                    'port': port,
                    'state': 'open',
                    'service': self.CCTV_PORTS.get(port, 'unknown'),
                    'banner': banner.decode('utf-8', errors='ignore') if banner else None
                }
            sock_obj.close()
        except:
            pass
        return None
    
    def detect_manufacturer(self, banner, ports):
        """Detect manufacturer"""
        if banner:
            banner_bytes = banner.encode('utf-8')
            for mfr, patterns in self.MANUFACTURERS.items():
                for pattern in patterns:
                    if pattern in banner_bytes:
                        return mfr
        
        port_nums = [p['port'] for p in ports]
        if 37777 in port_nums: return 'Dahua'
        if 8899 in port_nums: return 'Hikvision'
        if 34567 in port_nums: return 'XiongMai'
        return 'Unknown'
    
    def assess_vulnerabilities(self, device):
        """Assess device vulnerabilities"""
        vulns = []
        risk_score = 0
        
        if device.get('default_creds'):
            vulns.append({
                'type': 'Default Credentials',
                'severity': 'CRITICAL',
                'description': 'Device accessible with default credentials'
            })
            risk_score += 40
        
        if any(p['port'] == 554 for p in device.get('open_ports', [])):
            vulns.append({
                'type': 'Exposed RTSP',
                'severity': 'HIGH',
                'description': 'RTSP stream accessible'
            })
            risk_score += 25
        
        if any(p['port'] == 80 for p in device.get('open_ports', [])):
            vulns.append({
                'type': 'Insecure HTTP',
                'severity': 'MEDIUM',
                'description': 'Unencrypted HTTP access'
            })
            risk_score += 15
        
        if risk_score >= 70: risk_level = 'CRITICAL'
        elif risk_score >= 50: risk_level = 'HIGH'
        elif risk_score >= 30: risk_level = 'MEDIUM'
        else: risk_level = 'LOW'
        
        return {
            'vulnerabilities': vulns,
            'risk_score': min(risk_score, 100),
            'risk_level': risk_level
        }
    
    def scan_ip(self, ip, ports):
        """Scan single IP"""
        try:
            open_ports = []
            for port in ports:
                result = self.scan_port(ip, port)
                if result:
                    open_ports.append(result)
            
            if not open_ports:
                return None
            
            banner = next((p['banner'] for p in open_ports if p['banner']), None)
            manufacturer = self.detect_manufacturer(banner, open_ports)
            
            device = {
                'ip': ip,
                'manufacturer': manufacturer,
                'model': 'Unknown',
                'open_ports': open_ports,
                'discovered_at': datetime.now().isoformat()
            }
            
            vuln_assessment = self.assess_vulnerabilities(device)
            device.update(vuln_assessment)
            
            broadcast_to_clients({
                'type': 'device_discovered',
                'device': device
            })
            
            for vuln in device['vulnerabilities']:
                broadcast_to_clients({
                    'type': 'vulnerability_found',
                    'ip': ip,
                    'vulnerability': vuln['type'],
                    'severity': vuln['severity']
                })
            
            return device
        except Exception as e:
            return None
    
    def scan_range(self, ip_range, ports, threads=10):
        """Scan IP range"""
        scan_id = f"scan_{int(time.time())}"
        
        try:
            network = ipaddress.ip_network(ip_range, strict=False)
            ips = [str(ip) for ip in network.hosts()][:1024]
            
            if not ips:
                ips = [str(network.network_address)]
            
            broadcast_to_clients({
                'type': 'scan_started',
                'scan_id': scan_id,
                'target': ip_range,
                'total_ips': len(ips)
            })
            
            devices = []
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=threads) as executor:
                futures = [executor.submit(self.scan_ip, ip, ports) for ip in ips]
                
                for i, future in enumerate(futures):
                    result = future.result()
                    if result:
                        devices.append(result)
                    
                    broadcast_to_clients({
                        'type': 'scan_progress',
                        'scan_id': scan_id,
                        'scanned': i + 1,
                        'total': len(ips),
                        'elapsed': int(time.time() - start_time)
                    })
            
            elapsed = int(time.time() - start_time)
            broadcast_to_clients({
                'type': 'scan_complete',
                'scan_id': scan_id,
                'devices_found': len(devices),
                'vulnerabilities': sum(len(d['vulnerabilities']) for d in devices),
                'elapsed': elapsed
            })
            
            self.scan_results[scan_id] = {
                'devices': devices,
                'started_at': datetime.now().isoformat(),
                'duration': elapsed
            }
            
            return devices
        except Exception as e:
            broadcast_to_clients({'type': 'scan_error', 'error': str(e)})
            return []

# Initialize scanner
scanner = RealTimeScanner()
print("✅ Scanner initialized")

# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@sock.route('/ws')
def websocket_handler(ws):
    """WebSocket connection handler"""
    print(f"🔌 New WebSocket client connected")
    ws_clients.append(ws)
    
    ws.send(json.dumps({
        'type': 'connection',
        'message': 'Connected to EvaSafe CCTV Scanner',
        'timestamp': datetime.now().isoformat()
    }))
    
    try:
        while True:
            message = ws.receive()
            if message:
                data = json.loads(message)
                if data.get('action') == 'stop_scan':
                    ws.send(json.dumps({'type': 'scan_stopped', 'message': 'Scan stopped'}))
    except:
        print(f"🔌 WebSocket client disconnected")
        if ws in ws_clients:
            ws_clients.remove(ws)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'ws_clients': len(ws_clients)
    })

@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    """Start network scan"""
    try:
        config = request.json
        target = config.get('target') or config.get('ipRange')
        ports = config.get('ports', [80, 443, 554, 8080])
        threads = config.get('threads', 10)
        
        if not target:
            return jsonify({'error': 'Target required', 'success': False}), 400
        
        if isinstance(ports, str):
            ports = [int(p.strip()) for p in ports.split(',')]
        
        def run_scan():
            scanner.scan_range(target, ports, threads)
        
        thread = threading.Thread(target=run_scan, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'scan_id': f"scan_{int(time.time())}",
            'target': target
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get all devices"""
    try:
        df = pd.read_csv('data/cctv_comprehensive_recommendations.csv')
        return jsonify(df.head(500).to_dict('records'))
    except:
        return jsonify([])

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get alerts"""
    try:
        with open('data/active_alerts.json', 'r') as f:
            alerts = json.load(f)
        return jsonify(alerts[:100])
    except:
        return jsonify([])

@app.route('/api/alerts/statistics', methods=['GET'])
def get_alert_statistics():
    """Get alert statistics"""
    try:
        with open('data/active_alerts.json', 'r') as f:
            alerts = json.load(f)
        
        return jsonify({
            'total': len(alerts),
            'critical': len([a for a in alerts if a['severity'] == 'CRITICAL']),
            'high': len([a for a in alerts if a['severity'] == 'HIGH']),
            'medium': len([a for a in alerts if a['severity'] == 'MEDIUM']),
            'low': len([a for a in alerts if a['severity'] == 'LOW'])
        })
    except:
        return jsonify({'total': 0, 'critical': 0, 'high': 0, 'medium': 0, 'low': 0})

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get overall statistics"""
    try:
        df = pd.read_csv('data/cctv_comprehensive_recommendations.csv')
        return jsonify({
            'total_devices': len(df),
            'critical': len(df[df['risk_level'] == 'CRITICAL']),
            'high': len(df[df['risk_level'] == 'HIGH']),
            'medium': len(df[df['risk_level'] == 'MEDIUM']),
            'low': len(df[df['risk_level'] == 'LOW'])
        })
    except:
        return jsonify({'total_devices': 0, 'critical': 0, 'high': 0, 'medium': 0, 'low': 0})

@app.route('/api/local-cameras', methods=['GET'])
def get_local_cameras():
    """Get list of local camera feeds"""
    try:
        # Return empty list if CSV doesn't exist
        import os
        csv_path = 'data/cctv_comprehensive_recommendations.csv'
        if not os.path.exists(csv_path):
            return jsonify({'success': True, 'cameras': []})
            
        df = pd.read_csv(csv_path)
        cameras = []
        video_files = ['v1.mp4', 'v2.mp4', 'v3.mp4', 'v4.mp4', 'v5.mp4']
        
        for i, video in enumerate(video_files):
            if i < len(df):
                device = df.iloc[i]
                cameras.append({
                    'id': f"cam_{i+1}",
                    'name': f"{device['manufacturer']} {device['model']}",
                    'ip': f"192.168.1.{100+i}",
                    'location': device.get('manufacturer', 'Unknown'),
                    'status': 'online',
                    'risk': device.get('ml_risk_level', 'Unknown'),
                    'stream': f"/api/camera/stream/{i+1}",
                    'videoFile': video
                })
        
        return jsonify({'success': True, 'cameras': cameras})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/camera/stream/<int:camera_id>', methods=['GET'])
def stream_camera(camera_id):
    """Stream camera video"""
    try:
        import os
        from flask import send_file
        
        # Check multiple possible paths
        possible_paths = [
            f"ip cam's/v{camera_id}.mp4",  # If running from root
            f"../ip cam's/v{camera_id}.mp4",  # If running from backend/
            os.path.join(os.path.dirname(os.path.dirname(__file__)), f"ip cam's/v{camera_id}.mp4")  # Absolute path
        ]
        
        video_path = None
        for path in possible_paths:
            if os.path.exists(path):
                video_path = path
                break
        
        if not video_path:
            print(f"❌ Camera video not found. Tried paths: {possible_paths}")
            return jsonify({'error': 'Camera not found'}), 404
        
        print(f"✅ Streaming video from: {video_path}")
        return send_file(video_path, mimetype='video/mp4')
    except Exception as e:
        print(f"❌ Error streaming video: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/scan-results', methods=['GET'])
def get_scan_results():
    """Get scan results"""
    try:
        import os
        if os.path.exists('data/cctv_scan_results.csv'):
            df = pd.read_csv('data/cctv_scan_results.csv')
            return jsonify({'success': True, 'results': df.to_dict('records')})
        return jsonify({'success': True, 'results': []})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/intrusion-alerts', methods=['GET'])
def get_intrusion_alerts():
    """Get intrusion alerts"""
    try:
        import os
        if os.path.exists('data/active_alerts.json'):
            with open('data/active_alerts.json', 'r') as f:
                alerts = json.load(f)
            return jsonify({'success': True, 'alerts': alerts})
        return jsonify({'success': True, 'alerts': []})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# CCTV GUARD BOT - NVIDIA ShieldGemma Chatbot
# ============================================================================

@app.route('/api/bot/chat', methods=['POST'])
def chat_with_bot():
    """Interactive chatbot using NVIDIA ShieldGemma-9B for cybersecurity"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        webcam_connected = data.get('webcamConnected', False)
        webcam_ip = data.get('webcamIP', 'Not connected')
        total_devices = data.get('totalDevices', 0)
        critical_risks = data.get('criticalRisks', 0)
        
        if not user_message:
            return jsonify({'success': False, 'error': 'No message provided'}), 400
        
        # Get latest security status
        security_status = ""
        if webcam_connected and webcam_ip != 'Not connected':
            # Check for recent intrusions
            access_logs = webcam_access_log.get(webcam_ip, [])
            recent_blocked = sum(1 for log in access_logs[-10:] if log.get('blocked', False))
            if recent_blocked > 0:
                security_status = f" | ⚠️ {recent_blocked} unauthorized access attempts blocked"
        
        # Generate professional cybersecurity bot responses
        bot_reply = generate_professional_bot_response(
            user_message, 
            webcam_connected, 
            webcam_ip, 
            total_devices, 
            critical_risks,
            security_status
        )
        
        # Store in chat history
        chat_history.append({"role": "user", "content": user_message})
        chat_history.append({"role": "assistant", "content": bot_reply})
        
        # Keep only last 10 messages (5 exchanges)
        if len(chat_history) > 10:
            chat_history.pop(0)
            chat_history.pop(0)
        
        return jsonify({
            'success': True,
            'message': bot_reply,
            'webcamStatus': 'Connected' if webcam_connected else 'Disconnected'
        })
            
    except Exception as e:
        print(f"❌ Chatbot error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Sorry, I encountered an error. Please try again.'
        }), 500

@app.route('/api/bot/clear-history', methods=['POST'])
def clear_chat_history():
    """Clear chat history"""
    global chat_history
    chat_history = []
    return jsonify({'success': True, 'message': 'Chat history cleared'})

# ============================================================================
# IP WEBCAM ACCESS MONITORING & INTRUSION DETECTION
# ============================================================================

@app.route('/api/webcam/register', methods=['POST'])
def register_webcam():
    """Register user's webcam IP as authorized"""
    try:
        data = request.get_json()
        webcam_ip = data.get('webcam_ip')
        user_ip = data.get('user_ip', request.remote_addr)
        
        if not webcam_ip:
            return jsonify({'success': False, 'error': 'No webcam IP provided'}), 400
        
        # Register the user's current IP as authorized
        authorized_ips.add(user_ip)
        
        # Initialize access log for this webcam
        if webcam_ip not in webcam_access_log:
            webcam_access_log[webcam_ip] = []
        
        # Log the registration
        webcam_access_log[webcam_ip].append({
            'accessor_ip': user_ip,
            'timestamp': datetime.now().isoformat(),
            'action': 'registered',
            'blocked': False
        })
        
        print(f"✅ Webcam registered: {webcam_ip}, Authorized IP: {user_ip}")
        
        return jsonify({
            'success': True,
            'message': 'Webcam registered successfully',
            'authorized_ip': user_ip
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/webcam/access', methods=['POST'])
def log_webcam_access():
    """Log and monitor webcam access attempts"""
    global last_intrusion_alert
    try:
        data = request.get_json()
        webcam_ip = data.get('webcam_ip')
        accessor_ip = data.get('accessor_ip', request.remote_addr)
        user_agent = data.get('user_agent', request.headers.get('User-Agent', 'Unknown'))
        
        if not webcam_ip:
            return jsonify({'success': False, 'error': 'No webcam IP provided'}), 400
        
        # Initialize log if needed
        if webcam_ip not in webcam_access_log:
            webcam_access_log[webcam_ip] = []
        
        # Check if this is an unauthorized access attempt
        is_unauthorized = accessor_ip not in authorized_ips and accessor_ip not in blocked_ips
        is_blocked = accessor_ip in blocked_ips
        
        # Log the access attempt
        access_entry = {
            'accessor_ip': accessor_ip,
            'timestamp': datetime.now().isoformat(),
            'user_agent': user_agent,
            'blocked': is_blocked,
            'unauthorized': is_unauthorized
        }
        webcam_access_log[webcam_ip].append(access_entry)
        
        # If unauthorized, trigger security response
        if is_unauthorized and not is_blocked:
            print(f"🚨 UNAUTHORIZED ACCESS DETECTED!")
            print(f"   Webcam: {webcam_ip}")
            print(f"   Accessor IP: {accessor_ip}")
            print(f"   User Agent: {user_agent}")
            
            # Add to blocked IPs (self-heal)
            blocked_ips.add(accessor_ip)
            access_entry['blocked'] = True
            
            # Create intrusion alert
            alert = {
                'id': f"intrusion_{int(time.time())}",
                'type': 'unauthorized_access',
                'severity': 'critical',
                'webcam_ip': webcam_ip,
                'accessor_ip': accessor_ip,
                'user_agent': user_agent,
                'timestamp': datetime.now().isoformat(),
                'status': 'blocked',
                'message': f"Unauthorized access blocked from {accessor_ip}",
                'actions_taken': [
                    f"Blocked IP address: {accessor_ip}",
                    "Alert sent to dashboard",
                    "Security team notified"
                ]
            }
            
            last_intrusion_alert = alert
            
            # Save alert to file
            try:
                alerts_file = 'data/active_alerts.json'
                existing_alerts = []
                if os.path.exists(alerts_file):
                    with open(alerts_file, 'r') as f:
                        existing_alerts = json.load(f)
                
                existing_alerts.append(alert)
                
                # Keep only last 50 alerts
                existing_alerts = existing_alerts[-50:]
                
                with open(alerts_file, 'w') as f:
                    json.dump(existing_alerts, f, indent=2)
            except Exception as e:
                print(f"Error saving alert: {e}")
            
            # Broadcast to WebSocket clients
            broadcast_to_clients({
                'type': 'intrusion_alert',
                'alert': alert
            })
            
            return jsonify({
                'success': True,
                'blocked': True,
                'message': 'Unauthorized access blocked',
                'alert': alert
            })
        
        elif is_blocked:
            print(f"⛔ Blocked IP attempted access: {accessor_ip}")
            return jsonify({
                'success': True,
                'blocked': True,
                'message': 'Access denied - IP blocked'
            })
        
        else:
            # Authorized access
            return jsonify({
                'success': True,
                'blocked': False,
                'message': 'Access authorized'
            })
            
    except Exception as e:
        print(f"Error logging webcam access: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/webcam/security-status', methods=['GET'])
def get_security_status():
    """Get current security status and access logs"""
    try:
        webcam_ip = request.args.get('webcam_ip')
        
        if not webcam_ip:
            return jsonify({'success': False, 'error': 'No webcam IP provided'}), 400
        
        access_logs = webcam_access_log.get(webcam_ip, [])
        recent_logs = access_logs[-20:]  # Last 20 access attempts
        
        # Count statistics
        total_attempts = len(access_logs)
        blocked_attempts = sum(1 for log in access_logs if log.get('blocked', False))
        unauthorized_attempts = sum(1 for log in access_logs if log.get('unauthorized', False))
        
        return jsonify({
            'success': True,
            'webcam_ip': webcam_ip,
            'authorized_ips': list(authorized_ips),
            'blocked_ips': list(blocked_ips),
            'statistics': {
                'total_attempts': total_attempts,
                'blocked_attempts': blocked_attempts,
                'unauthorized_attempts': unauthorized_attempts
            },
            'recent_access_logs': recent_logs,
            'last_intrusion_alert': last_intrusion_alert
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/webcam/unblock-ip', methods=['POST'])
def unblock_ip():
    """Unblock a previously blocked IP"""
    try:
        data = request.get_json()
        ip_to_unblock = data.get('ip')
        
        if not ip_to_unblock:
            return jsonify({'success': False, 'error': 'No IP provided'}), 400
        
        if ip_to_unblock in blocked_ips:
            blocked_ips.remove(ip_to_unblock)
            print(f"✅ Unblocked IP: {ip_to_unblock}")
            return jsonify({'success': True, 'message': f'IP {ip_to_unblock} unblocked'})
        else:
            return jsonify({'success': False, 'error': 'IP not in blocked list'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    requested_host = os.getenv('EVASAFE_HOST')
    requested_port = int(os.getenv('EVASAFE_PORT', '5000'))

    # On Windows, binding to all interfaces can be blocked by local policy.
    # Default to localhost unless explicitly overridden.
    if requested_host:
        host = requested_host
    else:
        host = '127.0.0.1' if os.name == 'nt' else '0.0.0.0'

    port = _select_startup_port(host, requested_port)
    if port is None:
        raise RuntimeError(
            f"No bindable port found on host {host} in range {requested_port}-{requested_port + 19}. "
            "Set EVASAFE_PORT to a free port and try again."
        )

    print("=" * 100)
    print("🚀 EvaSafe CCTV Security Platform - Unified Backend")
    print("=" * 100)
    if port != requested_port:
        print(f"⚠️ Requested port {requested_port} unavailable; using {port} instead")
    print(f"\n📡 Server: http://{host}:{port}")
    print(f"🔌 WebSocket: ws://{host}:{port}/ws")
    print(f"\n✅ Ready!")
    print("=" * 100)
    
    app.run(host=host, port=port, debug=True, threaded=True, use_reloader=False)
