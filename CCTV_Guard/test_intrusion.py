"""
Test Script: Simulate Unauthorized IP Webcam Access
This script simulates an external device trying to access your IP webcam
"""

import requests
import time

def simulate_unauthorized_access():
    """Simulate unauthorized access from different sources"""
    
    # Replace this with your actual webcam IP when you connect
    webcam_ip = "192.168.1.100"  # Example - update this with your actual IP
    
    print("=" * 80)
    print("🎭 INTRUSION SIMULATION TEST")
    print("=" * 80)
    print(f"\n📱 Simulating unauthorized access to webcam: {webcam_ip}\n")
    
    # Simulate different attackers
    attackers = [
        {"ip": "203.0.113.45", "device": "Unknown Phone", "browser": "Chrome Mobile"},
        {"ip": "198.51.100.88", "device": "Unknown Laptop", "browser": "Firefox"},
        {"ip": "192.0.2.156", "device": "Incognito Browser", "browser": "Chrome Incognito"},
    ]
    
    for i, attacker in enumerate(attackers, 1):
        print(f"\n🚨 Attack #{i}: {attacker['device']} from {attacker['ip']}")
        
        try:
            response = requests.post(
                "http://localhost:5000/api/webcam/access",
                json={
                    "webcam_ip": webcam_ip,
                    "accessor_ip": attacker["ip"],
                    "user_agent": f"Mozilla/5.0 ({attacker['device']}) {attacker['browser']}"
                },
                timeout=5
            )
            
            result = response.json()
            
            if result.get('blocked'):
                print(f"   ✅ BLOCKED: {result.get('message')}")
                if 'alert' in result:
                    print(f"   📢 Alert Generated: {result['alert']['message']}")
                    print(f"   🛡️  Actions Taken: {', '.join(result['alert']['actions_taken'])}")
            else:
                print(f"   ⚠️  Authorized: {result.get('message')}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        time.sleep(2)  # Wait 2 seconds between attacks
    
    print("\n" + "=" * 80)
    print("✅ Intrusion simulation complete!")
    print("=" * 80)
    print("\n💡 Check your dashboard to see:")
    print("   1. Real-time alerts in the dashboard")
    print("   2. Bot messages with security guidance")
    print("   3. Blocked IP addresses")
    print("   4. Security status updates")
    print("\n")

if __name__ == "__main__":
    print("\n⚠️  INSTRUCTIONS:")
    print("   1. Make sure your backend server is running (http://localhost:5000)")
    print("   2. Connect your IP Webcam in the dashboard first")
    print("   3. Update the 'webcam_ip' variable in this script with your actual IP")
    print("   4. Then run this script to simulate intrusions\n")
    
    input("Press ENTER to start intrusion simulation...")
    simulate_unauthorized_access()
