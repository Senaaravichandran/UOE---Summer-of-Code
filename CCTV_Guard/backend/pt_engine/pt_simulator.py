import pandas as pd
import random

# Set random seed for varied results
random.seed()

# -----------------------------
# Load CVE-mapped vulnerabilities
# -----------------------------
df = pd.read_csv("../../data/cctv_with_cves.csv")

# Randomly vary attack success rate
df = df.sample(frac=random.uniform(0.8, 1.0), replace=False).reset_index(drop=True)

attack_results = []

# -----------------------------
# Penetration testing simulation
# -----------------------------
for _, row in df.iterrows():

    vuln = row["vulnerability"]

    if vuln == "Default Credentials":
        attack_name = "Credential Abuse"
        steps = [
            "Identify login interface",
            "Attempt default username/password",
            "Gain administrative access"
        ]
        impact = "Full device takeover"
        likelihood = "High"

    elif vuln == "Exposed RTSP Stream":
        attack_name = "Unauthorized Video Access"
        steps = [
            "Scan for RTSP port (554)",
            "Access RTSP stream without authentication",
            "View or record live video feed"
        ]
        impact = "Privacy breach"
        likelihood = "High"

    elif vuln == "Outdated Firmware":
        attack_name = "Firmware Exploitation (Simulated RCE)"
        steps = [
            "Fingerprint firmware version",
            "Identify known vulnerability",
            "Send crafted request (simulated)",
            "Execute arbitrary command"
        ]
        impact = "Remote code execution"
        likelihood = "Medium"

    elif vuln == "No Encryption":
        attack_name = "Man-in-the-Middle Attack"
        steps = [
            "Position attacker on network",
            "Intercept unencrypted traffic",
            "Extract credentials or video data"
        ]
        impact = "Data leakage"
        likelihood = "High"

    elif vuln == "Weak Encryption":
        attack_name = "Cryptographic Downgrade Attack"
        steps = [
            "Detect weak encryption algorithm",
            "Force downgrade or exploit weakness",
            "Decrypt sensitive communication"
        ]
        impact = "Confidentiality compromise"
        likelihood = "Medium"

    else:
        attack_name = "No Exploitable Attack"
        steps = ["No attack path identified"]
        impact = "None"
        likelihood = "Low"

    attack_results.append({
        "device_id": row["device_id"],
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "vulnerability": vuln,
        "cve_id": row["cve_id"],
        "attack_name": attack_name,
        "attack_steps": " -> ".join(steps),
        "impact": impact,
        "likelihood": likelihood
    })

# -----------------------------
# Save attack simulation output
# -----------------------------
output_df = pd.DataFrame(attack_results)
output_df.to_csv("../../data/cctv_attack_simulation.csv", index=False)

print("Step 3 completed: cctv_attack_simulation.csv generated")
