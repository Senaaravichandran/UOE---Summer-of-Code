"""
CCTV Guard Attack Simulator
This script will trigger real alerts in your dashboard!
"""

import requests
import time
import random

def simulate_attacks():
    """Simulate various security attacks to test CCTV Guard"""
    
    # Your backend server (make sure it's running)
    backend_url = "http://localhost:5001"  # Port 5001, not 5000!
    
    # Your actual webcam IP (update this with your current IP)
    webcam_ip = "192.168.21.7"  # Update this with your actual IP!
    
    print("🎭" * 25)
    print("   CCTV GUARD ATTACK SIMULATOR")
    print("🎭" * 25)
    print(f"\nTarget Webcam: {webcam_ip}")
    print(f"Backend Server: {backend_url}")
    print("\n" + "="*60)
    
    # Simulated attacker IPs
    attackers = [
        "203.0.113.45",      # Fake external IP
        "198.51.100.88",     # Another fake IP  
        "192.0.2.156",       # RFC test IP
        "10.0.0.999",        # Invalid IP
        "172.16.1.100"       # Another private IP
    ]
    
    attack_types = [
        {"name": "Port Scanner", "agent": "Nmap/7.80"},
        {"name": "Brute Force Bot", "agent": "HackerBot/1.0"},
        {"name": "Unknown Device", "agent": "Mozilla/5.0 (Unknown Device)"},
        {"name": "Malicious Script", "agent": "Python-urllib/3.8"},
        {"name": "Unauthorized App", "agent": "CameraHack/2.1"}
    ]
    
    print("Starting attack simulation in 3 seconds...")
    for i in range(3, 0, -1):
        print(f"{i}...")
        time.sleep(1)
    print("🚨 ATTACKS STARTING!\n")
    
    # Simulate 5 different attacks
    for i in range(5):
        attacker_ip = random.choice(attackers)
        attack = random.choice(attack_types)
        
        print(f"Attack #{i+1}: {attack['name']} from {attacker_ip}")
        
        try:
            # Send unauthorized access attempt
            response = requests.post(
                f"{backend_url}/api/webcam/access",
                json={
                    "webcam_ip": webcam_ip,
                    "accessor_ip": attacker_ip,
                    "user_agent": attack['agent']
                },
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('blocked'):
                    print(f"   ✅ SUCCESS: Attack blocked! {result.get('message')}")
                else:
                    print(f"   ⚠️  Response: {result.get('message')}")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection Error: {e}")
            print("   💡 Make sure your backend server is running on port 5001!")
            break
        
        # Wait between attacks
        time.sleep(2)
    
    print("\n" + "="*60)
    print("✅ ATTACK SIMULATION COMPLETE!")
    print("\n📊 Check your dashboard for:")
    print("   • Real-time security alerts")
    print("   • Bot threat notifications")  
    print("   • Blocked IP addresses")
    print("   • Updated security status")
    print("="*60)

if __name__ == "__main__":
    print("\n⚠️  INSTRUCTIONS:")
    print("   1. Make sure your backend is running (npm start in backend folder)")
    print("   2. Make sure your frontend is running (npm run dev in frontend folder)")
    print("   3. Update webcam_ip variable above if different from 192.168.21.7")
    print("   4. Keep your dashboard open to see real-time alerts!")
    
    input("\nPress ENTER to start attack simulation...")
    simulate_attacks()