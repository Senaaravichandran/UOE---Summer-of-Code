import pandas as pd
import random

# Set random seed to ensure different results each scan
random.seed()

# -----------------------------
# Load CCTV metadata
# -----------------------------
df = pd.read_csv("../../data/cctv_metadata.csv")

# Randomly sample devices for this scan (70-100% of devices)
sample_size = random.randint(int(len(df) * 0.7), len(df))
df = df.sample(n=sample_size, replace=False).reset_index(drop=True)

results = []

# -----------------------------
# Rule-based vulnerability checks
# -----------------------------
for _, row in df.iterrows():

    device_vulnerabilities = []

    # Rule R1: Default credentials
    if row["default_credentials"] == 1:
        device_vulnerabilities.append({
            "vulnerability": "Default Credentials",
            "severity": "High",
            "reason": "Device is using default login credentials"
        })

    # Rule R2: Outdated firmware
    if row["firmware_year"] <= 2019:
        device_vulnerabilities.append({
            "vulnerability": "Outdated Firmware",
            "severity": "Medium",
            "reason": "Firmware is older than recommended security baseline"
        })

    # Rule R3: Exposed RTSP without authentication
    if row["rtsp_enabled"] == 1 and row["authentication"] == "no-auth":
        device_vulnerabilities.append({
            "vulnerability": "Exposed RTSP Stream",
            "severity": "High",
            "reason": "RTSP stream accessible without authentication"
        })

    # Rule R4: No encryption
    if row["encryption"] == "none":
        device_vulnerabilities.append({
            "vulnerability": "No Encryption",
            "severity": "High",
            "reason": "Device communication is unencrypted"
        })

    # Rule R5: Weak encryption
    if row["encryption"] == "weak":
        device_vulnerabilities.append({
            "vulnerability": "Weak Encryption",
            "severity": "Medium",
            "reason": "Device uses weak or deprecated encryption"
        })

    # If no vulnerabilities found
    if not device_vulnerabilities:
        device_vulnerabilities.append({
            "vulnerability": "None",
            "severity": "Low",
            "reason": "No obvious misconfiguration detected"
        })

    # Store results
    for v in device_vulnerabilities:
        results.append({
            "device_id": row["device_id"],
            "manufacturer": row["manufacturer"],
            "model": row["model"],
            "vulnerability": v["vulnerability"],
            "severity": v["severity"],
            "reason": v["reason"]
        })

# -----------------------------
# Save output
# -----------------------------
output_df = pd.DataFrame(results)
output_df.to_csv("../../data/cctv_vulnerabilities.csv", index=False)

print("Step 1 completed: cctv_vulnerabilities.csv generated")
