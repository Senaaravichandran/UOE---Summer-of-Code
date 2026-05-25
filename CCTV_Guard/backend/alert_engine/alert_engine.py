"""
=====================================================================================================
🚨 WORLD-CLASS CCTV SECURITY ALERT ENGINE
=====================================================================================================

Real-time monitoring and alerting system for critical security risks and suspicious activities.

Features:
- Real-time vulnerability monitoring
- Multi-level alert severity (Critical/High/Medium/Low)
- Pattern-based threat detection
- Automated response recommendations
- Alert deduplication and correlation
- Historical alert tracking
- Integration with ML predictions and CVE database

Author: EvaSafe Security Team
Date: January 2, 2026
"""

import json
import pandas as pd
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import hashlib
import os

# -----------------------------
# ALERT SEVERITY LEVELS
# -----------------------------
SEVERITY_LEVELS = {
    'CRITICAL': {
        'priority': 1,
        'color': '#DC2626',  # Red
        'icon': '🔴',
        'response_time': '15 minutes',
        'notification_channels': ['email', 'sms', 'webhook', 'websocket']
    },
    'HIGH': {
        'priority': 2,
        'color': '#EA580C',  # Orange
        'icon': '🟠',
        'response_time': '1 hour',
        'notification_channels': ['email', 'webhook', 'websocket']
    },
    'MEDIUM': {
        'priority': 3,
        'color': '#F59E0B',  # Yellow
        'icon': '🟡',
        'response_time': '4 hours',
        'notification_channels': ['email', 'websocket']
    },
    'LOW': {
        'priority': 4,
        'color': '#3B82F6',  # Blue
        'icon': '🔵',
        'response_time': '24 hours',
        'notification_channels': ['websocket']
    }
}

# -----------------------------
# ALERT RULES & THRESHOLDS
# -----------------------------
ALERT_RULES = {
    'critical_vulnerability_detected': {
        'severity': 'CRITICAL',
        'condition': lambda device: device.get('ml_risk_level') == 'Critical' and device.get('max_cvss_score', 0) >= 9.0,
        'title': 'Critical Vulnerability Detected',
        'message_template': 'Critical vulnerability detected on {manufacturer} {model} (IP: {ip_address}). CVSS Score: {max_cvss_score}. Immediate action required.',
        'recommended_actions': [
            'Isolate device from network immediately',
            'Review exploitation methodology',
            'Apply security patches from manufacturer',
            'Change all default credentials',
            'Enable enhanced monitoring'
        ]
    },
    'default_credentials_exposed': {
        'severity': 'CRITICAL',
        'condition': lambda device: 'Default Credentials' in device.get('vulnerabilities', []) and device.get('internet_facing', False),
        'title': 'Internet-Facing Device with Default Credentials',
        'message_template': 'Device {device_id} ({manufacturer} {model}) is internet-facing with default credentials. High risk of unauthorized access.',
        'recommended_actions': [
            'Change credentials immediately',
            'Remove device from internet exposure',
            'Enable multi-factor authentication',
            'Review access logs for suspicious activity'
        ]
    },
    'multiple_critical_cves': {
        'severity': 'CRITICAL',
        'condition': lambda device: len([v for v in device.get('cve_mappings', []) if v.get('severity') == 'Critical']) >= 3,
        'title': 'Multiple Critical CVEs Detected',
        'message_template': 'Device {device_id} has {cve_count} critical CVEs. This device is highly vulnerable to exploitation.',
        'recommended_actions': [
            'Priority firmware update required',
            'Implement network segmentation',
            'Enable IDS/IPS monitoring',
            'Document incident response plan'
        ]
    },
    'public_exploit_available': {
        'severity': 'HIGH',
        'condition': lambda device: device.get('public_exploits_available', 0) > 0 and device.get('ml_risk_level') in ['Critical', 'High'],
        'title': 'Public Exploit Available for Device',
        'message_template': 'Public exploits available for {manufacturer} {model}. {exploit_count} known exploits detected.',
        'recommended_actions': [
            'Apply security patches immediately',
            'Enable intrusion detection',
            'Monitor for exploitation attempts',
            'Review device logs daily'
        ]
    },
    'metasploit_module_exists': {
        'severity': 'HIGH',
        'condition': lambda device: device.get('metasploit_modules', 0) > 0,
        'title': 'Metasploit Modules Available',
        'message_template': 'Metasploit modules exist for {manufacturer} {model}. Device is easily exploitable by attackers.',
        'recommended_actions': [
            'Urgent security update required',
            'Implement WAF/IPS rules',
            'Restrict network access',
            'Schedule security audit'
        ]
    },
    'outdated_firmware': {
        'severity': 'HIGH',
        'condition': lambda device: device.get('firmware_age_years', 0) > 5,
        'title': 'Critically Outdated Firmware',
        'message_template': 'Device {device_id} running firmware from {firmware_year} ({firmware_age_years} years old). Likely contains multiple unpatched vulnerabilities.',
        'recommended_actions': [
            'Update to latest firmware version',
            'Check manufacturer security bulletins',
            'Consider device replacement if unsupported',
            'Implement compensating controls'
        ]
    },
    'no_encryption': {
        'severity': 'MEDIUM',
        'condition': lambda device: device.get('encryption_enabled', True) == False and device.get('internet_facing', False),
        'title': 'No Encryption on Internet-Facing Device',
        'message_template': 'Device {device_id} transmits data without encryption. Video streams and credentials vulnerable to interception.',
        'recommended_actions': [
            'Enable HTTPS/SSL encryption',
            'Configure secure communication protocols',
            'Use VPN for remote access',
            'Audit network traffic'
        ]
    },
    'weak_authentication': {
        'severity': 'MEDIUM',
        'condition': lambda device: device.get('authentication_strength', 'Strong') == 'Weak',
        'title': 'Weak Authentication Mechanism',
        'message_template': 'Device {device_id} uses weak authentication. Vulnerable to brute-force attacks.',
        'recommended_actions': [
            'Implement strong password policy',
            'Enable account lockout',
            'Add multi-factor authentication',
            'Monitor failed login attempts'
        ]
    },
    'high_vulnerability_density': {
        'severity': 'HIGH',
        'condition': lambda device: device.get('vulnerability_count', 0) >= 5,
        'title': 'High Vulnerability Density',
        'message_template': 'Device {device_id} has {vulnerability_count} vulnerabilities. Security posture severely compromised.',
        'recommended_actions': [
            'Comprehensive security audit required',
            'Apply all available patches',
            'Consider device replacement',
            'Implement defense-in-depth strategy'
        ]
    },
    'compliance_violation': {
        'severity': 'MEDIUM',
        'condition': lambda device: len(device.get('compliance_frameworks', {}).get('NIST', [])) >= 4,
        'title': 'Multiple Compliance Framework Violations',
        'message_template': 'Device {device_id} violates {compliance_count} compliance controls. Regulatory risk detected.',
        'recommended_actions': [
            'Review compliance requirements',
            'Document remediation plan',
            'Engage compliance team',
            'Schedule compliance audit'
        ]
    }
}

# -----------------------------
# ALERT ENGINE CLASS
# -----------------------------
class AlertEngine:
    def __init__(self, data_dir='data', alert_history_file='data/alert_history.json'):
        self.data_dir = data_dir
        self.alert_history_file = alert_history_file
        self.alert_history = self.load_alert_history()
        self.alert_deduplication_window = timedelta(hours=6)  # Don't re-alert within 6 hours
        
    def load_alert_history(self) -> List[Dict]:
        """Load historical alerts from file"""
        if os.path.exists(self.alert_history_file):
            try:
                with open(self.alert_history_file, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_alert_history(self):
        """Save alert history to file"""
        os.makedirs(os.path.dirname(self.alert_history_file), exist_ok=True)
        with open(self.alert_history_file, 'w') as f:
            json.dump(self.alert_history, f, indent=2)
    
    def generate_alert_hash(self, rule_id: str, device_id: str) -> str:
        """Generate unique hash for alert deduplication"""
        return hashlib.md5(f"{rule_id}:{device_id}".encode()).hexdigest()
    
    def is_duplicate_alert(self, alert_hash: str) -> bool:
        """Check if alert was recently fired (within deduplication window)"""
        for alert in self.alert_history:
            if alert.get('alert_hash') == alert_hash:
                alert_time = datetime.fromisoformat(alert['timestamp'])
                if datetime.now() - alert_time < self.alert_deduplication_window:
                    return True
        return False
    
    def evaluate_alert_rules(self, device: Dict) -> List[Dict]:
        """Evaluate all alert rules against a device"""
        triggered_alerts = []
        
        for rule_id, rule in ALERT_RULES.items():
            try:
                # Check if rule condition is met
                if rule['condition'](device):
                    alert_hash = self.generate_alert_hash(rule_id, device['device_id'])
                    
                    # Skip if duplicate alert
                    if self.is_duplicate_alert(alert_hash):
                        continue
                    
                    # Create alert
                    alert = self.create_alert(rule_id, rule, device, alert_hash)
                    triggered_alerts.append(alert)
                    
            except Exception as e:
                print(f"⚠️  Error evaluating rule {rule_id}: {str(e)}")
        
        return triggered_alerts
    
    def create_alert(self, rule_id: str, rule: Dict, device: Dict, alert_hash: str) -> Dict:
        """Create alert object"""
        severity_config = SEVERITY_LEVELS[rule['severity']]
        
        # Format message
        message = rule['message_template'].format(
            device_id=device.get('device_id', 'Unknown'),
            manufacturer=device.get('manufacturer', 'Unknown'),
            model=device.get('model', 'Unknown'),
            ip_address=device.get('ip_address', 'Unknown'),
            max_cvss_score=device.get('max_cvss_score', 0),
            firmware_year=device.get('firmware_year', 'Unknown'),
            firmware_age_years=device.get('firmware_age_years', 0),
            vulnerability_count=device.get('vulnerability_count', 0),
            cve_count=len([v for v in device.get('cve_mappings', []) if v.get('severity') == 'Critical']),
            exploit_count=device.get('public_exploits_available', 0),
            compliance_count=sum(len(v) for v in device.get('compliance_frameworks', {}).values())
        )
        
        alert = {
            'alert_id': f"ALERT-{int(time.time() * 1000)}",
            'alert_hash': alert_hash,
            'timestamp': datetime.now().isoformat(),
            'rule_id': rule_id,
            'severity': rule['severity'],
            'priority': severity_config['priority'],
            'title': rule['title'],
            'message': message,
            'device_id': device.get('device_id'),
            'device_info': {
                'manufacturer': device.get('manufacturer'),
                'model': device.get('model'),
                'ip_address': device.get('ip_address'),
                'firmware_version': device.get('firmware_version'),
                'ml_risk_level': device.get('ml_risk_level'),
                'vulnerability_count': device.get('vulnerability_count'),
                'max_cvss_score': device.get('max_cvss_score')
            },
            'recommended_actions': rule['recommended_actions'],
            'notification_channels': severity_config['notification_channels'],
            'response_time': severity_config['response_time'],
            'status': 'ACTIVE',
            'acknowledged': False,
            'resolved': False
        }
        
        return alert
    
    def monitor_devices(self, devices: List[Dict]) -> List[Dict]:
        """Monitor all devices and generate alerts"""
        all_alerts = []
        
        print(f"\n🚨 ALERT ENGINE: Monitoring {len(devices)} devices...")
        
        for device in devices:
            alerts = self.evaluate_alert_rules(device)
            all_alerts.extend(alerts)
        
        # Add alerts to history
        self.alert_history.extend(all_alerts)
        self.save_alert_history()
        
        # Print summary
        if all_alerts:
            print(f"   ⚠️  {len(all_alerts)} NEW ALERTS TRIGGERED")
            severity_counts = {}
            for alert in all_alerts:
                severity = alert['severity']
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                if severity in severity_counts:
                    icon = SEVERITY_LEVELS[severity]['icon']
                    print(f"   {icon} {severity}: {severity_counts[severity]} alerts")
        else:
            print("   ✅ No new alerts triggered")
        
        return all_alerts
    
    def get_active_alerts(self) -> List[Dict]:
        """Get all active (unresolved) alerts"""
        return [alert for alert in self.alert_history if not alert.get('resolved', False)]
    
    def get_alerts_by_severity(self, severity: str) -> List[Dict]:
        """Get alerts by severity level"""
        return [alert for alert in self.alert_history if alert['severity'] == severity and not alert.get('resolved', False)]
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert"""
        for alert in self.alert_history:
            if alert['alert_id'] == alert_id:
                alert['acknowledged'] = True
                alert['acknowledged_by'] = acknowledged_by
                alert['acknowledged_at'] = datetime.now().isoformat()
                self.save_alert_history()
                return True
        return False
    
    def resolve_alert(self, alert_id: str, resolved_by: str, resolution_notes: str = None) -> bool:
        """Resolve an alert"""
        for alert in self.alert_history:
            if alert['alert_id'] == alert_id:
                alert['resolved'] = True
                alert['resolved_by'] = resolved_by
                alert['resolved_at'] = datetime.now().isoformat()
                alert['resolution_notes'] = resolution_notes
                alert['status'] = 'RESOLVED'
                self.save_alert_history()
                return True
        return False
    
    def get_alert_statistics(self) -> Dict:
        """Get alert statistics"""
        active_alerts = self.get_active_alerts()
        
        stats = {
            'total_alerts': len(self.alert_history),
            'active_alerts': len(active_alerts),
            'resolved_alerts': len([a for a in self.alert_history if a.get('resolved', False)]),
            'acknowledged_alerts': len([a for a in active_alerts if a.get('acknowledged', False)]),
            'by_severity': {
                'CRITICAL': len([a for a in active_alerts if a['severity'] == 'CRITICAL']),
                'HIGH': len([a for a in active_alerts if a['severity'] == 'HIGH']),
                'MEDIUM': len([a for a in active_alerts if a['severity'] == 'MEDIUM']),
                'LOW': len([a for a in active_alerts if a['severity'] == 'LOW'])
            },
            'average_response_time': None,  # Calculate if timestamps available
            'most_common_alerts': self.get_most_common_alert_types(10)
        }
        
        return stats
    
    def get_most_common_alert_types(self, limit: int = 10) -> List[Dict]:
        """Get most frequently triggered alert types"""
        rule_counts = {}
        for alert in self.alert_history:
            rule_id = alert['rule_id']
            if rule_id not in rule_counts:
                rule_counts[rule_id] = {'count': 0, 'title': alert['title']}
            rule_counts[rule_id]['count'] += 1
        
        sorted_rules = sorted(rule_counts.items(), key=lambda x: x[1]['count'], reverse=True)
        return [{'rule_id': k, **v} for k, v in sorted_rules[:limit]]


# -----------------------------
# MAIN EXECUTION
# -----------------------------
if __name__ == '__main__':
    print("=" * 100)
    print("🚨 CCTV SECURITY ALERT ENGINE - REAL-TIME MONITORING")
    print("=" * 100)
    
    # Initialize alert engine
    alert_engine = AlertEngine()
    
    # Load device recommendations
    print("\n📂 Loading device security data...")
    recommendations_file = 'data/cctv_comprehensive_recommendations.json'
    
    if os.path.exists(recommendations_file):
        with open(recommendations_file, 'r') as f:
            devices = json.load(f)
        print(f"✅ Loaded {len(devices)} devices")
    else:
        print(f"❌ Error: {recommendations_file} not found")
        print("   Run generate_comprehensive_recommendations.py first")
        exit(1)
    
    # Monitor devices and generate alerts
    new_alerts = alert_engine.monitor_devices(devices)
    
    # Display active alerts
    print("\n" + "=" * 100)
    print("📊 ACTIVE ALERTS SUMMARY")
    print("=" * 100)
    
    stats = alert_engine.get_alert_statistics()
    print(f"\n📈 Statistics:")
    print(f"   Total Alerts Generated: {stats['total_alerts']}")
    print(f"   Active Alerts: {stats['active_alerts']}")
    print(f"   Resolved Alerts: {stats['resolved_alerts']}")
    print(f"   Acknowledged: {stats['acknowledged_alerts']}")
    
    print(f"\n🎯 By Severity:")
    for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
        icon = SEVERITY_LEVELS[severity]['icon']
        count = stats['by_severity'][severity]
        if count > 0:
            print(f"   {icon} {severity}: {count} alerts")
    
    # Show top 5 most recent critical alerts
    critical_alerts = sorted(
        [a for a in new_alerts if a['severity'] == 'CRITICAL'],
        key=lambda x: x['timestamp'],
        reverse=True
    )[:5]
    
    if critical_alerts:
        print(f"\n🔴 TOP CRITICAL ALERTS:")
        for i, alert in enumerate(critical_alerts, 1):
            print(f"\n   {i}. {alert['title']}")
            print(f"      Device: {alert['device_id']} ({alert['device_info']['manufacturer']} {alert['device_info']['model']})")
            print(f"      Message: {alert['message']}")
            print(f"      Response Time: {alert['response_time']}")
            print(f"      Actions: {len(alert['recommended_actions'])} recommended")
    
    # Save alerts to file
    print(f"\n💾 Saving alerts...")
    with open('data/active_alerts.json', 'w') as f:
        json.dump(new_alerts, f, indent=2)
    print(f"✅ Saved {len(new_alerts)} new alerts to data/active_alerts.json")
    
    print("\n" + "=" * 100)
    print("✅ ALERT ENGINE MONITORING COMPLETE!")
    print("=" * 100)
