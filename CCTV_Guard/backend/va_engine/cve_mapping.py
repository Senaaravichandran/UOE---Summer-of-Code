import pandas as pd

# -----------------------------
# Load datasets
# -----------------------------
vuln_df = pd.read_csv("../../data/cctv_vulnerabilities.csv")
cve_df = pd.read_csv("../../data/cve_reference.csv")

mapped_results = []

# -----------------------------
# Map vulnerabilities to CVEs
# -----------------------------
for _, row in vuln_df.iterrows():

    vuln = row["vulnerability"]

    if vuln == "Default Credentials":
        trigger = "default_credentials"
    elif vuln == "Outdated Firmware":
        trigger = "outdated_firmware"
    elif vuln == "Exposed RTSP Stream":
        trigger = "rtsp_no_auth"
    elif vuln == "No Encryption":
        trigger = "no_encryption"
    elif vuln == "Weak Encryption":
        trigger = "weak_encryption"
    else:
        trigger = None

    if trigger:
        cve_match = cve_df[cve_df["trigger_condition"] == trigger]

        if not cve_match.empty:
            cve = cve_match.iloc[0]
            mapped_results.append({
                "device_id": row["device_id"],
                "manufacturer": row["manufacturer"],
                "model": row["model"],
                "vulnerability": vuln,
                "severity": row["severity"],
                "cve_id": cve["cve_id"],
                "cve_severity": cve["severity"],
                "cve_description": cve["description"]
            })
    else:
        mapped_results.append({
            "device_id": row["device_id"],
            "manufacturer": row["manufacturer"],
            "model": row["model"],
            "vulnerability": vuln,
            "severity": row["severity"],
            "cve_id": "None",
            "cve_severity": "None",
            "cve_description": "No known CVE mapping"
        })

# -----------------------------
# Save output
# -----------------------------
output_df = pd.DataFrame(mapped_results)
output_df.to_csv("../../data/cctv_with_cves.csv", index=False)

print("Step 2 completed: cctv_with_cves.csv generated")
