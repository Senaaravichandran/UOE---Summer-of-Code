import pandas as pd

# -----------------------------
# Load inputs
# -----------------------------
ml_df = pd.read_csv("../../data/cctv_ml_predictions.csv")
attack_df = pd.read_csv("../../data/cctv_attack_simulation.csv")

recommendations = []

# -----------------------------
# Recommendation logic
# -----------------------------
for _, row in attack_df.iterrows():

    device_id = row["device_id"]
    vulnerability = row["vulnerability"]

    # Get ML risk label
    ml_risk = ml_df.loc[
        ml_df["device_id"] == device_id, "ml_risk_label"
    ].values[0]

    # Priority mapping
    if ml_risk == "High":
        priority = "Critical"
    elif ml_risk == "Medium":
        priority = "High"
    else:
        priority = "Moderate"

    # Recommendation mapping
    if vulnerability == "Default Credentials":
        fix = [
            "Change default usernames and passwords",
            "Enforce strong password policy",
            "Disable anonymous access"
        ]

    elif vulnerability == "Outdated Firmware":
        fix = [
            "Upgrade to latest firmware version",
            "Enable automatic firmware updates",
            "Monitor vendor security advisories"
        ]

    elif vulnerability == "Exposed RTSP Stream":
        fix = [
            "Enable authentication for RTSP streams",
            "Restrict RTSP access to trusted IPs",
            "Disable RTSP if not required"
        ]

    elif vulnerability == "No Encryption":
        fix = [
            "Enable HTTPS/TLS communication",
            "Disable plaintext protocols",
            "Use secure key management"
        ]

    elif vulnerability == "Weak Encryption":
        fix = [
            "Upgrade to strong encryption algorithms",
            "Disable deprecated crypto protocols",
            "Ensure firmware supports modern encryption"
        ]

    else:
        fix = [
            "No immediate action required",
            "Continue regular security monitoring"
        ]

    recommendations.append({
        "device_id": device_id,
        "manufacturer": row["manufacturer"],
        "model": row["model"],
        "vulnerability": vulnerability,
        "ml_risk_level": ml_risk,
        "priority": priority,
        "recommended_actions": " | ".join(fix)
    })

# -----------------------------
# Save output
# -----------------------------
output_df = pd.DataFrame(recommendations)
output_df.to_csv("../../data/cctv_security_recommendations.csv", index=False)

print("Step 5 completed: cctv_security_recommendations.csv generated")
