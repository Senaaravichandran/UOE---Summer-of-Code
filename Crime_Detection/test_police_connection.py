import requests
import json

def test_police_app_connection():
    """Test connection to Police App"""
    police_ips = ["127.0.0.1", "192.168.1.4"]  # Test both localhost and network IP
    
    for ip in police_ips:
        try:
            print(f"🧪 Testing Police App connection to {ip}:4000...")
            
            # Test current-ip endpoint
            response = requests.get(f"http://{ip}:4000/current-ip", timeout=3)
            if response.status_code == 200:
                print(f"✅ Police App found at {ip}:4000")
                print(f"📱 Police App reports its IP as: {response.text}")
                
                # Test sending a test alert
                test_alert = {
                    "id": "TEST_ALERT",
                    "type": "TEST",
                    "title": "🧪 Test Alert",
                    "message": "Testing connection to police app",
                    "location": "Test Location",
                    "timestamp": "2026-01-31T20:45:00",
                    "videoUrl": "test_video_url",
                    "severity": "TEST"
                }
                
                alert_response = requests.post(
                    f"http://{ip}:4000/police-alert",
                    json=test_alert,
                    timeout=5
                )
                
                if alert_response.status_code == 200:
                    print(f"🚔 Test alert sent successfully!")
                    print(f"Response: {alert_response.text}")
                    return ip
                else:
                    print(f"❌ Test alert failed with status: {alert_response.status_code}")
                    
            else:
                print(f"❌ No response from {ip}:4000 (status: {response.status_code})")
                
        except Exception as e:
            print(f"❌ Failed to connect to {ip}:4000 - Error: {e}")
    
    return None

if __name__ == "__main__":
    print("🔍 Testing Police App Connection...")
    working_ip = test_police_app_connection()
    
    if working_ip:
        print(f"\n✅ Police App is working at: {working_ip}:4000")
        
        # Configure crime detection to use this IP
        try:
            config_response = requests.post(
                "http://localhost:5005/configure-police-ip",
                json={"police_ip": working_ip},
                timeout=5
            )
            if config_response.status_code == 200:
                print(f"🔧 Crime detection configured to use {working_ip}:4000")
            else:
                print(f"❌ Failed to configure crime detection")
        except Exception as e:
            print(f"❌ Could not configure crime detection: {e}")
    else:
        print("\n❌ Police App not found on any tested IP!")