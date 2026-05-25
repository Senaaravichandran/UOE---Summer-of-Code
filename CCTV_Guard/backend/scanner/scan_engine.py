import pandas as pd
import random
import numpy as np
import sys
import os

# Set random seed based on current time to get different results each scan
random.seed()
np.random.seed()

# -----------------------------
# User-defined scan parameters from command line or config file
# -----------------------------
config_file = "../../data/scan_config.json"

# Default values
SCAN_IP_RANGE = "192.168.1.0/24"
SCAN_VENDOR = "Hikvision"
SCAN_DEVICE_TYPE = "Camera"

# Try to load from config file if it exists
if os.path.exists(config_file):
    import json
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
            SCAN_IP_RANGE = config.get('ip_range', SCAN_IP_RANGE)
            SCAN_VENDOR = config.get('vendor', SCAN_VENDOR)
            SCAN_DEVICE_TYPE = config.get('device_type', SCAN_DEVICE_TYPE)
            print(f"Loaded config from {config_file}")
    except Exception as e:
        print(f"Error loading config: {e}, using defaults")

print(f"Starting scan for IP range: {SCAN_IP_RANGE}")
print(f"Filtering by vendor: {SCAN_VENDOR}")
print(f"Filtering by device type: {SCAN_DEVICE_TYPE}")

# -----------------------------
# Load datasets
# -----------------------------
metadata_df = pd.read_csv("../../data/cctv_metadata.csv")
reco_df = pd.read_csv("../../data/cctv_security_recommendations.csv")

# -----------------------------
# Simulated scan filtering with randomization
# -----------------------------
# Filter by vendor and device type
filtered_df = metadata_df[
    (metadata_df["manufacturer"] == SCAN_VENDOR) &
    (metadata_df["device_type"] == SCAN_DEVICE_TYPE)
]

# Randomly select a subset of devices (50-100% of filtered results)
sample_size = random.randint(max(1, len(filtered_df) // 2), len(filtered_df))
scan_results = filtered_df.sample(n=sample_size, replace=False) if len(filtered_df) > 0 else filtered_df

# -----------------------------
# Merge with recommendations
# -----------------------------
final_results = scan_results.merge(
    reco_df,
    on=["device_id", "manufacturer", "model"],
    how="left"
)

# -----------------------------
# Add simulated scan metadata
# -----------------------------
final_results["scanned_ip_range"] = SCAN_IP_RANGE
final_results["scan_status"] = "Discovered"

# -----------------------------
# Save scan results
# -----------------------------
final_results.to_csv("../../data/cctv_scan_results.csv", index=False)

print("Step 6 completed: cctv_scan_results.csv generated")
print(f"Total devices discovered: {len(final_results)}")
