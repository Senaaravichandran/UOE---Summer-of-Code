from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import pickle
import socket
import requests
import json
import time
from datetime import datetime
from werkzeug.utils import secure_filename
from pymongo import MongoClient
from makepred import main
from firebase_storage import upload_to_firebase

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


def get_local_ip():
    hostname = socket.gethostname()
    return socket.gethostbyname(hostname)


flask_url = f"http://{get_local_ip()}:5005"
# flask_url = "http://192.168.60.53:5005"

mongoDbCollection = "UrbanGuard"
print(f"--> Flask URL: {flask_url}")

mongo_uri = f"mongodb+srv://nidhins1807:testking54321@zensafe.rewx0ps.mongodb.net/{mongoDbCollection}"
print("--> Connecting to MongoDB")
client = MongoClient(mongo_uri)
db = client[mongoDbCollection]
alerts_collection = db["alerts"]
print("--> Connected to MongoDB")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Police Alert Configuration - Fixed IP
POLICE_APP_IP = "10.245.80.103" # Default IP, can be updated via API
POLICE_APP_PORT = 4000

def update_police_ip(new_ip):
    """Update the global police app IP address"""
    global POLICE_APP_IP
    POLICE_APP_IP = new_ip
    print(f"🚔 Police App IP updated to: {POLICE_APP_IP}:{POLICE_APP_PORT}")

def send_police_alert(alert_data):
    """Send real-time alert to Flutter Police App via HTTP"""
    try:
        # Prepare alert message for police
        police_alert = {
            "id": f"CRIME_{int(time.time())}",
            "type": "CRIME_DETECTED",
            "title": "🚨 Crime Alert - Immediate Response Required",
            "message": f"Crime detected at {alert_data.get('location', 'Unknown Location')}",
            "location": alert_data.get('location', 'Unknown Location'),
            "coordinates": alert_data.get('coordinates', {}),
            "timestamp": datetime.now().isoformat(),
            "videoUrl": alert_data.get('firebaseUrl', ''),
            "severity": "HIGH",
            "cameraId": f"CAM_{alert_data.get('source', 'UNKNOWN')}",
            "alertAudio": True,
            "anomalyDate": alert_data.get('anomalyDate', ''),
            "anomalyTime": alert_data.get('anomalyTime', ''),
            "source": alert_data.get('source', 'crime_detection')
        }
        
        # Send HTTP POST to Flutter app using fixed police IP
        police_url = f"http://{POLICE_APP_IP}:{POLICE_APP_PORT}/police-alert"
        response = requests.post(
            police_url,
            json=police_alert,
            timeout=5,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            print(f"🚔 Police Alert Sent Successfully to {POLICE_APP_IP}:{POLICE_APP_PORT}")
            return True
        else:
            print(f"❌ Police Alert Failed - Status: {response.status_code}")
            return False
        
    except Exception as e:
        print(f"❌ Failed to send police alert to {POLICE_APP_IP}:{POLICE_APP_PORT} - Error: {e}")
        return False


def detect_anomaly(video_path, oversampledCrop):
    input_video_path = video_path
    pred = main(
        video_path=input_video_path,
        oversampledCrop=oversampledCrop,
        show_plot=True
    )
    return pred


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected for uploading"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    url = f"{flask_url}/uploads/{filename}"
    return jsonify({"message": "File uploaded successfully", "url": url}), 200


@app.route("/uploads/<filename>", methods=["GET"])
def get_file(filename):
    print(f"Request to fetch file: {filename}")
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/analyze", methods=["POST"])
def analyze_video():
    print("--> Received a request")

    if "video" not in request.files:
        print("No video file provided in the request.")
        return jsonify({"error": "No video file provided"}), 400

    video = request.files["video"]
    oversampledCrop = request.form["oversampledCrop"]
    
    status_override = request.form.get("status", None)
    
    video_path = os.path.join("./uploaded_videos", video.filename)
    os.makedirs("./uploaded_videos", exist_ok=True)
    video.save(video_path)

    print(">>> Performing crime detection")
    
    # ALWAYS RUN AI DETECTION (regardless of status override)
    ai_result = detect_anomaly(video_path, oversampledCrop)
    print(f">>> AI Analysis Result: {ai_result}")
    
    # THEN apply status override if provided
    if status_override is not None:
        print(f">>> Status Override Applied: {status_override}")
        anomaly_detected = status_override.lower() == "true"
        print(f">>> Final Result (overridden): {anomaly_detected}")
    else:
        anomaly_detected = ai_result
        print(f">>> Final Result (from AI): {anomaly_detected}")

    firebase_url = None
    if anomaly_detected:
        firebase_url = upload_to_firebase(video_path)
        if firebase_url:
            
            # Parse coordinates properly
            coords_str = request.form.get("coordinates", "12.9716,77.5946")
            try:
                lat, lng = map(float, coords_str.split(","))
            except:
                lat, lng = 12.9716, 77.5946
            
            alert_data = {
                "alert": True,
                "footageUrl": firebase_url,
                "firebaseUrl": firebase_url,
                # Keep pinataUrl as None for backward compatibility
                "pinataUrl": None,
                "location": request.form.get("location", "Unknown"),
                "anomalyDate": request.form.get("anomalyDate", ""),
                "anomalyTime": request.form.get("anomalyTime", ""),
                "coordinates": {
                    "lat": lat,
                    "lng": lng
                },
                "createdContract": "false",
                "source": request.form.get("source", "manual")  # Track source of alert
            }
            print(f"--> Alert data stored in MongoDB with Firebase URL")
            alerts_collection.insert_one(alert_data)
            
            # 🚔 Send real-time alert to Police App
            print("📡 Sending alert to Police App...")
            police_alert_sent = send_police_alert(alert_data)
            if police_alert_sent:
                print("✅ Police alert sent successfully!")
            else:
                print("❌ Failed to send police alert")
        else:
            print("Failed to upload video to Firebase Storage.")

    print(f"--> Returning response: anomaly={anomaly_detected}, firebase_url={firebase_url}")

    if os.path.exists(video_path):
        os.remove(video_path)

    return jsonify({
        "anomaly": anomaly_detected,
        "firebase_url": firebase_url,
        # Keep for backward compatibility
        "ipfs_hash": firebase_url,
        "pinata_url": firebase_url
    })


@app.route("/configure-police-ip", methods=["POST"])
def configure_police_app():
    """Configure Police App IP address for real-time alerts"""
    global POLICE_APP_IP
    
    try:
        data = request.get_json()
        new_ip = data.get("police_ip", "127.0.0.1")
        
        # Validate IP format
        socket.inet_aton(new_ip)  # Raises exception if invalid
        
        POLICE_APP_IP = new_ip
        print(f"🚔 Police App IP updated to: {POLICE_APP_IP}:{POLICE_APP_PORT}")
        
        return jsonify({
            "success": True,
            "message": f"Police App configured: {POLICE_APP_IP}:{POLICE_APP_PORT}",
            "police_ip": POLICE_APP_IP,
            "police_port": POLICE_APP_PORT
        })
        
    except Exception as e:
        print(f"❌ Failed to configure police app: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/test-police-connection", methods=["GET"])
def test_police_connection():
    """Test if Police App is reachable"""
    try:
        test_url = f"http://{POLICE_APP_IP}:{POLICE_APP_PORT}/test"
        response = requests.get(test_url, timeout=5)
        
        if response.status_code == 200:
            return jsonify({
                "success": True,
                "message": f"Police App is reachable at {POLICE_APP_IP}:{POLICE_APP_PORT}",
                "response": response.text
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Police App responded with status {response.status_code}"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Cannot reach Police App at {POLICE_APP_IP}:{POLICE_APP_PORT} - {str(e)}"
        }), 500

@app.route("/test-police-alert", methods=["POST"])
def test_police_alert():
    """Send test alert to Police App"""
    try:
        test_alert = {
            "location": "Test Location - Crime Detection Lab",
            "firebaseUrl": "https://example.com/test-video.mp4",
            "coordinates": {"lat": 13.0827, "lng": 80.2707},
            "anomalyDate": datetime.now().strftime("%Y-%m-%d"),
            "anomalyTime": datetime.now().strftime("%H:%M:%S"),
            "source": "test_system"
        }
        
        success = send_police_alert(test_alert)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Test alert sent to Police App at {POLICE_APP_IP}:{POLICE_APP_PORT}"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to send test alert"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


def upload_video_to_localhost(file_path):
    url = f"{flask_url}/upload"
    try:
        with open(file_path, "rb") as file:
            files = {"file": file}
            response = requests.post(url, files=files)

        if response.status_code == 200:
            return response.json().get("url")
        else:
            print("Failed to upload. Server response:", response.json())
    except Exception as e:
        print("Error:", e)

    return None


@app.route("/nearest-cctv", methods=["GET"])
def get_nearest_cctv():
    """Get nearest CCTV cameras based on provided coordinates"""
    try:
        # Get coordinates from query parameters
        lat = float(request.args.get("lat", 0))
        lng = float(request.args.get("lng", 0))
        
        print(f"--> Finding nearest CCTVs for coordinates: {lat}, {lng}")
        
        # Sample CCTV camera data (you can replace this with actual database queries)
        # In production, you'd calculate distances and return the nearest ones
        cctv_cameras = [
            {
                "id": "CCTV001",
                "name": "Main Street Camera 1",
                "location": "Velachery Main Road",
                "coordinates": {"lat": 12.9716, "lng": 77.5946},
                "status": "Active",
                "distance": "0.5 km"
            },
            {
                "id": "CCTV002",
                "name": "Junction Camera",
                "location": "Velachery Junction",
                "coordinates": {"lat": 12.9750, "lng": 77.5980},
                "status": "Active",
                "distance": "0.8 km"
            },
            {
                "id": "CCTV003",
                "name": "Phoenix Mall Camera",
                "location": "Phoenix MarketCity",
                "coordinates": {"lat": 12.9950, "lng": 77.6269},
                "status": "Active",
                "distance": "1.2 km"
            },
            {
                "id": "CCTV004",
                "name": "Railway Station Camera",
                "location": "Velachery Railway Station",
                "coordinates": {"lat": 12.9820, "lng": 77.6190},
                "status": "Active",
                "distance": "1.5 km"
            },
            {
                "id": "CCTV005",
                "name": "Bus Stand Camera",
                "location": "Velachery Bus Stand",
                "coordinates": {"lat": 12.9790, "lng": 77.6050},
                "status": "Active",
                "distance": "1.8 km"
            }
        ]
        
        return jsonify({
            "success": True,
            "cameras": cctv_cameras,
            "count": len(cctv_cameras)
        }), 200
        
    except Exception as e:
        print(f"--> Error fetching nearest CCTVs: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "cameras": []
        }), 500

@app.route('/configure-police-ip', methods=['POST'])
def configure_police_ip():
    """Configure the Police App IP address for alert routing"""
    try:
        data = request.json
        new_ip = data.get('police_ip', '127.0.0.1')
        
        # Validate IP format
        import re
        ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
        if not re.match(ip_pattern, new_ip):
            return jsonify({
                "success": False,
                "error": "Invalid IP address format"
            }), 400
        
        update_police_ip(new_ip)
        
        return jsonify({
            "success": True,
            "message": f"Police App IP configured to {new_ip}:{POLICE_APP_PORT}",
            "police_ip": new_ip,
            "police_port": POLICE_APP_PORT
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    print("--> Starting Flask server")
    print(f"📡 Police alerts will be sent to: {POLICE_APP_IP}:{POLICE_APP_PORT}")
    app.run(host="0.0.0.0", port=5005, debug=False)
