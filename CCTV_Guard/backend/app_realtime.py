"""
Real-Time CCTV Scanner Backend with WebSocket Support
Production-ready Flask server with async scanning
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
import threading
import json
import sys
import os

# Add backend path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scanner.realtime_scanner import RealTimeScanEngine
from scanner.shodan_scanner import ShodanScanner
from pt_engine.automated_pentest import PenetrationTester
from alert_engine.alert_engine import AlertEngine

app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Global scanner instances
realtime_scanner = None
shodan_scanner = None
pentest_engine = None
alert_engine = None

# WebSocket clients
ws_clients = []

def broadcast_to_clients(message):
    """Broadcast message to all WebSocket clients"""
    disconnected = []
    for client in ws_clients:
        try:
            client.send(message)
        except:
            disconnected.append(client)
    
    # Remove disconnected clients
    for client in disconnected:
        ws_clients.remove(client)

# Initialize engines
def init_engines():
    global realtime_scanner, shodan_scanner, pentest_engine, alert_engine
    
    # RealTime Scanner with WebSocket callback
    realtime_scanner = RealTimeScanEngine(websocket_callback=broadcast_to_clients)
    
    # Shodan Scanner
    shodan_scanner = ShodanScanner()
    
    # Penetration Tester
    pentest_engine = PenetrationTester(safe_mode=True)
    
    # Alert Engine
    alert_engine = AlertEngine()
    
    print("✅ All engines initialized")

# WebSocket endpoint
@sock.route('/ws')
def websocket_handler(ws):
    """WebSocket connection handler"""
    print(f"🔌 New WebSocket client connected")
    ws_clients.append(ws)
    
    # Send welcome message
    ws.send(json.dumps({
        'type': 'connection',
        'message': 'Connected to EvaSafe CCTV Scanner',
        'timestamp': str(datetime.now())
    }))
    
    try:
        while True:
            message = ws.receive()
            if message:
                data = json.loads(message)
                
                # Handle stop scan command
                if data.get('action') == 'stop_scan':
                    # TODO: Implement scan cancellation
                    ws.send(json.dumps({
                        'type': 'scan_stopped',
                        'message': 'Scan stopped by user'
                    }))
    except:
        print(f"🔌 WebSocket client disconnected")
        if ws in ws_clients:
            ws_clients.remove(ws)

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'realtime_scanner': realtime_scanner is not None,
            'shodan_scanner': shodan_scanner is not None,
            'pentest_engine': pentest_engine is not None,
            'alert_engine': alert_engine is not None
        },
        'ws_clients': len(ws_clients)
    })

@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    """Start a new scan"""
    try:
        config = request.json
        target = config.get('target')
        scan_type = config.get('scanType', 'quick')
        ports = config.get('ports', '80,443,554,8080')
        threads = config.get('threads', 10)
        
        if not target:
            return jsonify({'error': 'Target is required'}), 400
        
        # Parse ports
        port_list = [int(p.strip()) for p in ports.split(',')]
        
        # Run scan in background thread
        def run_scan():
            try:
                if scan_type == 'quick':
                    results = realtime_scanner.quick_scan(target)
                elif scan_type == 'full':
                    results = realtime_scanner.full_scan(target)
                elif scan_type == 'stealth':
                    results = realtime_scanner.stealth_scan(target)
                elif scan_type == 'aggressive':
                    results = realtime_scanner.aggressive_scan(target)
                else:
                    results = realtime_scanner.scan_range(target, port_list, threads)
                
                print(f"✅ Scan complete: {len(results)} devices found")
            except Exception as e:
                print(f"❌ Scan error: {str(e)}")
                broadcast_to_clients(json.dumps({
                    'type': 'scan_error',
                    'error': str(e)
                }))
        
        thread = threading.Thread(target=run_scan, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'scan_id': f"scan_{int(time.time())}",
            'target': target,
            'scan_type': scan_type
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scan/shodan', methods=['POST'])
def shodan_search():
    """Search Shodan for CCTV cameras"""
    try:
        config = request.json
        query = config.get('query', 'webcam')
        limit = config.get('limit', 100)
        
        # Run Shodan search in background
        def run_shodan_search():
            try:
                results = shodan_scanner.search_shodan(query, limit=limit)
                
                broadcast_to_clients(json.dumps({
                    'type': 'shodan_results',
                    'results': results[:20],  # Send first 20
                    'total': len(results)
                }))
                
                # Scan each result
                for result in results[:50]:  # Limit to 50 for demo
                    device = shodan_scanner.scan_ip(result['ip'], list(shodan_scanner.CCTV_PORTS.keys()))
                    if device:
                        broadcast_to_clients(json.dumps({
                            'type': 'device_discovered',
                            'device': device
                        }))
            except Exception as e:
                broadcast_to_clients(json.dumps({
                    'type': 'scan_error',
                    'error': str(e)
                }))
        
        thread = threading.Thread(target=run_shodan_search, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Shodan search started'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pentest/start', methods=['POST'])
def start_pentest():
    """Start penetration testing on discovered devices"""
    try:
        config = request.json
        devices = config.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices provided'}), 400
        
        # Run pentest in background
        def run_pentest():
            try:
                results = pentest_engine.batch_test(devices)
                
                broadcast_to_clients(json.dumps({
                    'type': 'pentest_complete',
                    'results': results
                }))
            except Exception as e:
                broadcast_to_clients(json.dumps({
                    'type': 'scan_error',
                    'error': str(e)
                }))
        
        thread = threading.Thread(target=run_pentest, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Penetration testing started'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get all discovered devices"""
    try:
        # Load from CSV
        import pandas as pd
        df = pd.read_csv('CCTV_Guard/data/cctv_comprehensive_recommendations.csv')
        devices = df.to_dict('records')
        return jsonify(devices[:500])  # Limit to 500
    except Exception as e:
        return jsonify([])

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get all alerts"""
    try:
        with open('CCTV_Guard/data/active_alerts.json', 'r') as f:
            alerts = json.load(f)
        return jsonify(alerts[:100])  # Latest 100
    except:
        return jsonify([])

@app.route('/api/alerts/statistics', methods=['GET'])
def get_alert_statistics():
    """Get alert statistics"""
    try:
        with open('CCTV_Guard/data/active_alerts.json', 'r') as f:
            alerts = json.load(f)
        
        stats = {
            'total': len(alerts),
            'critical': len([a for a in alerts if a['severity'] == 'CRITICAL']),
            'high': len([a for a in alerts if a['severity'] == 'HIGH']),
            'medium': len([a for a in alerts if a['severity'] == 'MEDIUM']),
            'low': len([a for a in alerts if a['severity'] == 'LOW']),
            'acknowledged': len([a for a in alerts if a.get('acknowledged', False)]),
            'resolved': len([a for a in alerts if a.get('resolved', False)])
        }
        
        return jsonify(stats)
    except:
        return jsonify({
            'total': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'acknowledged': 0,
            'resolved': 0
        })

@app.route('/api/scan/results/<scan_id>', methods=['GET'])
def get_scan_results(scan_id):
    """Get results for a specific scan"""
    if scan_id in realtime_scanner.scan_results:
        return jsonify(realtime_scanner.scan_results[scan_id])
    return jsonify({'error': 'Scan not found'}), 404

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get overall statistics"""
    try:
        # Load devices
        import pandas as pd
        df = pd.read_csv('CCTV_Guard/data/cctv_comprehensive_recommendations.csv')
        
        stats = {
            'total_devices': len(df),
            'critical': len(df[df['risk_level'] == 'CRITICAL']),
            'high': len(df[df['risk_level'] == 'HIGH']),
            'medium': len(df[df['risk_level'] == 'MEDIUM']),
            'low': len(df[df['risk_level'] == 'LOW']),
            'total_vulnerabilities': df['num_vulnerabilities'].sum(),
            'unique_cves': len(df['cve_ids'].dropna().unique())
        }
        
        return jsonify(stats)
    except:
        return jsonify({
            'total_devices': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'total_vulnerabilities': 0,
            'unique_cves': 0
        })


if __name__ == '__main__':
    from datetime import datetime
    import time
    
    print("=" * 100)
    print("🚀 EvaSafe CCTV Security Platform - Backend Server")
    print("=" * 100)
    
    # Initialize all engines
    init_engines()
    
    print(f"\n📡 Server starting on http://localhost:5000")
    print(f"🔌 WebSocket available at ws://localhost:5000/ws")
    print(f"📊 API endpoints available")
    print("\n✅ Ready to receive requests!")
    print("=" * 100)
    
    # Run Flask server
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
