"""
World's Best CCTV Vulnerability Dataset Generator
Creates comprehensive, realistic dataset with 1000+ samples for maximum ML accuracy
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

# -----------------------------
# MANUFACTURER & MODEL DATABASE
# -----------------------------
MANUFACTURERS = {
    'Hikvision': {
        'models': ['DS-2CD2043G', 'DS-2CD2143G', 'DS-2CD2085FWD', 'DS-2CD1023G', 'DS-2CD1623G', 
                   'DS-7608NI-I2', 'DS-7616NI-Q2', 'DS-2CD2385G1', 'DS-2CD2T85G1', 'DS-2DE4A425IW'],
        'vuln_rate': 0.65,  # 65% have vulnerabilities
        'default_creds_rate': 0.45
    },
    'Dahua': {
        'models': ['IPC-HFW1230S', 'IPC-HFW2431T', 'IPC-HDW1431S', 'NVR4104HS', 'NVR5208-8P',
                   'DHI-XVR1B04', 'IPC-HDBW2831R', 'IPC-HFW5831E', 'DHI-NVR4216-16P', 'SD22204UE-GN'],
        'vuln_rate': 0.62,
        'default_creds_rate': 0.42
    },
    'CP Plus': {
        'models': ['CP-UNC-TA21L3', 'CP-UNC-DA41L3', 'CP-VAC-D20L2', 'CP-EAC-T24PL2', 'CP-UVR-0401E1',
                   'CP-VCG-SD10L2', 'CP-E24A', 'CP-USC-TA13L2', 'CP-DGC-D13L2', 'CP-PLUS-16CH-DVR'],
        'vuln_rate': 0.58,
        'default_creds_rate': 0.38
    },
    'Axis': {
        'models': ['M3045-V', 'M2026-LE', 'P3245-LVE', 'M3116-LVE', 'P1455-LE', 
                   'Q1615-E', 'M3067-P', 'P3265-LVE', 'F34', 'P3719-PLE'],
        'vuln_rate': 0.25,  # Axis has better security
        'default_creds_rate': 0.15
    },
    'Vivotek': {
        'models': ['IB9389-EHT', 'FD9389-EHTV', 'CC8370-HV', 'IB8382-T', 'SD9364-EHL',
                   'FE8182', 'IP8160-W', 'MD8563-EH', 'IZ9361-EH', 'ND9541P'],
        'vuln_rate': 0.35,
        'default_creds_rate': 0.22
    },
    'Uniview': {
        'models': ['IPC2124SR3-PF40', 'IPC322LR3-VSPF40', 'IPC672LR-AX4DUPK', 'NVR304-32E-B',
                   'IPC6252SR-X5UG', 'IPC532E-DL-IN', 'IPC2328SBR3-DPZ', 'IPC672LR-AF60-B'],
        'vuln_rate': 0.48,
        'default_creds_rate': 0.32
    },
    'Hanwha': {
        'models': ['XNP-6320H', 'QNO-8080R', 'PNM-9084RQZ', 'XNV-8082R', 'QND-7082R',
                   'XRN-2011', 'PNF-9010R', 'XND-6085V', 'QNV-7080R'],
        'vuln_rate': 0.30,
        'default_creds_rate': 0.18
    }
}

# CVE DATABASE with exploitation complexity
CVE_DATABASE = {
    'Default Credentials': {
        'cve_id': 'CVE-2017-7921',
        'cvss_score': 9.8,
        'severity': 'Critical',
        'description': 'Authentication bypass using default credentials',
        'exploitation_complexity': 'Low',
        'exploit_steps': 5,
        'metasploit_available': True,
        'public_exploit': True
    },
    'Outdated Firmware': {
        'cve_id': 'CVE-2021-36260',
        'cvss_score': 9.8,
        'severity': 'Critical',
        'description': 'Remote command execution via improper input validation',
        'exploitation_complexity': 'Low',
        'exploit_steps': 7,
        'metasploit_available': True,
        'public_exploit': True
    },
    'Exposed RTSP Stream': {
        'cve_id': 'CVE-2018-9995',
        'cvss_score': 8.6,
        'severity': 'High',
        'description': 'Unauthenticated access to RTSP video stream',
        'exploitation_complexity': 'Low',
        'exploit_steps': 3,
        'metasploit_available': False,
        'public_exploit': True
    },
    'No Encryption': {
        'cve_id': 'CVE-2019-12255',
        'cvss_score': 7.5,
        'severity': 'High',
        'description': 'Cleartext transmission of sensitive video data',
        'exploitation_complexity': 'Medium',
        'exploit_steps': 6,
        'metasploit_available': False,
        'public_exploit': True
    },
    'Weak Encryption': {
        'cve_id': 'CVE-2020-25078',
        'cvss_score': 6.5,
        'severity': 'Medium',
        'description': 'Use of weak or deprecated encryption algorithms',
        'exploitation_complexity': 'High',
        'exploit_steps': 9,
        'metasploit_available': False,
        'public_exploit': False
    },
    'Buffer Overflow': {
        'cve_id': 'CVE-2022-30563',
        'cvss_score': 9.1,
        'severity': 'Critical',
        'description': 'Stack-based buffer overflow in RTSP implementation',
        'exploitation_complexity': 'Medium',
        'exploit_steps': 12,
        'metasploit_available': True,
        'public_exploit': False
    },
    'SQL Injection': {
        'cve_id': 'CVE-2020-9497',
        'cvss_score': 8.8,
        'severity': 'High',
        'description': 'SQL injection in web interface authentication',
        'exploitation_complexity': 'Low',
        'exploit_steps': 6,
        'metasploit_available': True,
        'public_exploit': True
    },
    'Path Traversal': {
        'cve_id': 'CVE-2021-33044',
        'cvss_score': 7.8,
        'severity': 'High',
        'description': 'Directory traversal allowing arbitrary file read',
        'exploitation_complexity': 'Low',
        'exploit_steps': 5,
        'metasploit_available': False,
        'public_exploit': True
    },
    'Command Injection': {
        'cve_id': 'CVE-2023-28653',
        'cvss_score': 9.9,
        'severity': 'Critical',
        'description': 'OS command injection via network configuration',
        'exploitation_complexity': 'Low',
        'exploit_steps': 4,
        'metasploit_available': True,
        'public_exploit': True
    }
}

# Port ranges by manufacturer
PORT_PROFILES = {
    'Hikvision': [80, 8000, 554, 8080, 443],
    'Dahua': [80, 37777, 554, 8000, 443],
    'CP Plus': [80, 9000, 554, 8080, 443],
    'Axis': [80, 443, 554],
    'Vivotek': [80, 443, 554, 8080],
    'Uniview': [80, 554, 8000, 443],
    'Hanwha': [80, 443, 554, 4520]
}

# -----------------------------
# GENERATE DATASET
# -----------------------------
def generate_device(device_id):
    """Generate a single realistic CCTV device"""
    
    # Select manufacturer and model
    manufacturer = random.choice(list(MANUFACTURERS.keys()))
    model = random.choice(MANUFACTURERS[manufacturer]['models'])
    
    # Device type
    device_type = 'NVR' if 'NVR' in model or 'DVR' in model or 'XVR' in model else 'IP Camera'
    
    # Firmware (older = more vulnerable)
    current_year = 2026
    firmware_year = random.choices(
        range(2015, 2027),
        weights=[20, 18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 1]  # Bias toward older firmware
    )[0]
    firmware_version = f"V{firmware_year % 100}.{random.randint(0, 9)}.{random.randint(0, 99)}"
    firmware_age_years = current_year - firmware_year
    
    # Security features (correlated with firmware age)
    has_default_creds = random.random() < (MANUFACTURERS[manufacturer]['default_creds_rate'] * 
                                           (1 + firmware_age_years * 0.1))
    
    # Authentication
    if firmware_year >= 2023:
        authentication = random.choices(['strong', 'basic', 'no-auth'], weights=[60, 35, 5])[0]
    elif firmware_year >= 2020:
        authentication = random.choices(['strong', 'basic', 'no-auth'], weights=[30, 50, 20])[0]
    else:
        authentication = random.choices(['strong', 'basic', 'no-auth'], weights=[10, 40, 50])[0]
    
    # Encryption
    if firmware_year >= 2023:
        encryption = random.choices(['strong', 'weak', 'none'], weights=[70, 25, 5])[0]
    elif firmware_year >= 2020:
        encryption = random.choices(['strong', 'weak', 'none'], weights=[40, 40, 20])[0]
    else:
        encryption = random.choices(['strong', 'weak', 'none'], weights=[15, 35, 50])[0]
    
    # RTSP exposure
    rtsp_enabled = random.random() < 0.65
    rtsp_auth_required = authentication != 'no-auth' if rtsp_enabled else True
    
    # Network configuration
    base_ports = PORT_PROFILES[manufacturer]
    num_open_ports = random.randint(2, len(base_ports))
    open_ports = random.sample(base_ports, num_open_ports)
    
    # Additional security features
    upnp_enabled = random.random() < (0.7 if firmware_year < 2021 else 0.3)
    cloud_service = random.random() < 0.45
    ssl_certificate_valid = random.random() < (0.8 if firmware_year >= 2022 else 0.4)
    
    # Network exposure
    internet_facing = random.random() < 0.35
    behind_firewall = not internet_facing or random.random() < 0.6
    
    # Access control
    failed_login_attempts = random.randint(0, 150)
    password_complexity = random.choices(['none', 'low', 'medium', 'high'], 
                                        weights=[20, 30, 35, 15])[0]
    
    # Vulnerability scoring features
    vulnerability_count = 0
    vulnerabilities = []
    cvss_scores = []
    exploit_complexities = []
    total_exploit_steps = 0
    
    # Determine vulnerabilities based on configuration
    if has_default_creds:
        vuln = 'Default Credentials'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if firmware_age_years > 3:
        vuln = 'Outdated Firmware'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if rtsp_enabled and not rtsp_auth_required:
        vuln = 'Exposed RTSP Stream'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if encryption == 'none':
        vuln = 'No Encryption'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if encryption == 'weak':
        vuln = 'Weak Encryption'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    # Advanced vulnerabilities (for older/poorly configured devices)
    if firmware_year < 2019 and random.random() < 0.3:
        vuln = 'Buffer Overflow'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if authentication == 'no-auth' and random.random() < 0.4:
        vuln = 'SQL Injection'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if upnp_enabled and random.random() < 0.25:
        vuln = 'Path Traversal'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    if firmware_year >= 2023 and random.random() < 0.15:
        vuln = 'Command Injection'
        vulnerabilities.append(vuln)
        cve_info = CVE_DATABASE[vuln]
        cvss_scores.append(cve_info['cvss_score'])
        exploit_complexities.append(cve_info['exploitation_complexity'])
        total_exploit_steps += cve_info['exploit_steps']
        vulnerability_count += 1
    
    # Calculate aggregate metrics
    max_cvss = max(cvss_scores) if cvss_scores else 0.0
    avg_cvss = np.mean(cvss_scores) if cvss_scores else 0.0
    
    # Exploitation difficulty score (lower = easier to exploit)
    exploit_difficulty = total_exploit_steps / max(vulnerability_count, 1)
    
    # Risk calculation (sophisticated multi-factor)
    risk_score = 0
    
    # Base risk from vulnerabilities
    risk_score += vulnerability_count * 15
    risk_score += max_cvss * 5
    
    # Firmware age penalty
    risk_score += firmware_age_years * 3
    
    # Configuration penalties
    if has_default_creds:
        risk_score += 25
    if authentication == 'no-auth':
        risk_score += 20
    if encryption == 'none':
        risk_score += 15
    if internet_facing:
        risk_score += 10
    if not behind_firewall:
        risk_score += 15
    if upnp_enabled:
        risk_score += 8
    if not ssl_certificate_valid:
        risk_score += 5
    
    # Calculate final risk level
    if risk_score >= 80:
        risk_level = 'Critical'
        risk_numeric = 3
    elif risk_score >= 50:
        risk_level = 'High'
        risk_numeric = 2
    elif risk_score >= 25:
        risk_level = 'Medium'
        risk_numeric = 1
    else:
        risk_level = 'Low'
        risk_numeric = 0
    
    # Generate IP address
    ip_address = f"{random.randint(10, 192)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
    
    return {
        'device_id': f'CCTV-{device_id:05d}',
        'device_type': device_type,
        'manufacturer': manufacturer,
        'model': model,
        'firmware_version': firmware_version,
        'firmware_year': firmware_year,
        'firmware_age_years': firmware_age_years,
        'ip_address': ip_address,
        
        # Security features
        'default_credentials': int(has_default_creds),
        'authentication': authentication,
        'encryption': encryption,
        'rtsp_enabled': int(rtsp_enabled),
        'rtsp_auth_required': int(rtsp_auth_required),
        
        # Network configuration
        'open_ports': ','.join(map(str, sorted(open_ports))),
        'open_ports_count': len(open_ports),
        'upnp_enabled': int(upnp_enabled),
        'internet_facing': int(internet_facing),
        'behind_firewall': int(behind_firewall),
        'cloud_service': int(cloud_service),
        'ssl_certificate_valid': int(ssl_certificate_valid),
        
        # Access control
        'password_complexity': password_complexity,
        'failed_login_attempts': failed_login_attempts,
        
        # Vulnerability metrics
        'vulnerability_count': vulnerability_count,
        'vulnerabilities': ' | '.join(vulnerabilities) if vulnerabilities else 'None',
        'max_cvss_score': round(max_cvss, 2),
        'avg_cvss_score': round(avg_cvss, 2),
        'exploit_difficulty': round(exploit_difficulty, 2),
        'total_exploit_steps': total_exploit_steps,
        
        # Risk assessment
        'risk_score': round(risk_score, 2),
        'risk_level': risk_level,
        'risk_numeric': risk_numeric
    }

# -----------------------------
# GENERATE FULL DATASET
# -----------------------------
print("🚀 Generating World-Class CCTV Vulnerability Dataset...")
print("=" * 80)

# Generate 1200 devices for robust training
num_devices = 1200
devices = [generate_device(i+1) for i in range(num_devices)]

df = pd.DataFrame(devices)

# Save dataset
output_path = '../data/cctv_ml_dataset_advanced.csv'
df.to_csv(output_path, index=False)

# -----------------------------
# DATASET STATISTICS
# -----------------------------
print(f"\n✅ Dataset Generated: {len(df)} devices")
print("\n📊 DATASET STATISTICS:")
print("=" * 80)

print(f"\n🏢 Manufacturers:")
for mfr in df['manufacturer'].value_counts().items():
    print(f"  - {mfr[0]}: {mfr[1]} devices")

print(f"\n⚠️  Risk Distribution:")
for risk in ['Critical', 'High', 'Medium', 'Low']:
    count = len(df[df['risk_level'] == risk])
    pct = (count / len(df)) * 100
    print(f"  - {risk}: {count} devices ({pct:.1f}%)")

print(f"\n🔓 Vulnerability Statistics:")
print(f"  - Average vulnerabilities per device: {df['vulnerability_count'].mean():.2f}")
print(f"  - Max vulnerabilities: {df['vulnerability_count'].max()}")
print(f"  - Devices with 0 vulnerabilities: {len(df[df['vulnerability_count'] == 0])}")
print(f"  - Devices with 3+ vulnerabilities: {len(df[df['vulnerability_count'] >= 3])}")

print(f"\n🎯 CVSS Scores:")
print(f"  - Average Max CVSS: {df['max_cvss_score'].mean():.2f}")
print(f"  - Highest CVSS: {df['max_cvss_score'].max():.2f}")

print(f"\n🔐 Security Features:")
print(f"  - Default credentials: {df['default_credentials'].sum()} devices ({(df['default_credentials'].sum()/len(df))*100:.1f}%)")
print(f"  - No encryption: {len(df[df['encryption'] == 'none'])} devices")
print(f"  - Internet facing: {df['internet_facing'].sum()} devices")

print(f"\n📅 Firmware Age:")
print(f"  - Average age: {df['firmware_age_years'].mean():.1f} years")
print(f"  - Devices with firmware > 5 years old: {len(df[df['firmware_age_years'] > 5])}")

print("\n" + "=" * 80)
print(f"💾 Dataset saved to: {output_path}")
print("🎯 Ready for XGBoost training with maximum accuracy potential!")
print("=" * 80)
