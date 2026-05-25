"""
CCTV Guard - Complete Pipeline Execution Script
Runs all components in the correct order to generate complete assessment
"""

import os
import sys
import subprocess
import json
import argparse

def run_script(script_path, description):
    """Execute a Python script and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Script: {script_path}")
    print('='*60)
    
    # Get the directory of the script
    script_dir = os.path.dirname(script_path)
    script_name = os.path.basename(script_path)
    
    try:
        # Run from the script's directory
        result = subprocess.run(
            [sys.executable, script_name],
            cwd=script_dir if script_dir else None,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        print(f"[OK] {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error in {description}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False

def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='CCTV Guard Pipeline Execution')
    parser.add_argument('--ip-range', default='192.168.1.0/24', help='IP range to scan')
    parser.add_argument('--vendor', default='Hikvision', help='Vendor/Manufacturer to filter')
    parser.add_argument('--device-type', default='Camera', help='Device type (Camera/DVR)')
    args = parser.parse_args()
    
    # Save scan config to file for scripts to read
    config_file = os.path.join(os.path.dirname(__file__), 'data', 'scan_config.json')
    os.makedirs(os.path.dirname(config_file), exist_ok=True)
    
    scan_config = {
        'ip_range': args.ip_range,
        'vendor': args.vendor,
        'device_type': args.device_type
    }
    
    with open(config_file, 'w') as f:
        json.dump(scan_config, f, indent=2)
    
    print(f"""
    ============================================================
       CCTV Guard - Automated Vulnerability Assessment Tool    
                      Pipeline Execution
    
       Scan Parameters:
       - IP Range: {args.ip_range}
       - Vendor: {args.vendor}
       - Device Type: {args.device_type}
    ============================================================
    """)
    
    # Define pipeline steps
    pipeline = [
        ("backend/va_engine/rule_based_va.py", "Step 1: Rule-Based Vulnerability Assessment"),
        ("backend/va_engine/cve_mapping.py", "Step 2: CVE Mapping"),
        ("backend/pt_engine/pt_simulator.py", "Step 3: Penetration Testing Simulation"),
        ("ml/train_model.py", "Step 4: ML Model Training"),
        ("ml/predict_risk.py", "Step 5: ML Risk Prediction"),
        ("backend/recommendation_engine/generate_recommendations.py", "Step 6: Generate Recommendations"),
        ("backend/scanner/scan_engine.py", "Step 7: Scan Engine (Device Discovery)"),
    ]
    
    # Execute pipeline
    success_count = 0
    for script, description in pipeline:
        if run_script(script, description):
            success_count += 1
        else:
            print(f"\n[WARNING] Pipeline halted at: {description}")
            print("Fix the error and run again.")
            return False
    
    print(f"""
    ============================================================
                Pipeline Execution Complete!                    
       {success_count}/{len(pipeline)} steps completed successfully                     
    ============================================================
    
    Next steps:
    1. Start the backend server: python backend/app.py
    2. Open frontend/index.html in your browser
    3. View your CCTV vulnerability assessment dashboard
    """)
    return True

if __name__ == "__main__":
    if not main():
        sys.exit(1)
