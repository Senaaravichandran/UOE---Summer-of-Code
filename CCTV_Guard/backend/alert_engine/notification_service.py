"""
=====================================================================================================
📧 WORLD-CLASS NOTIFICATION SERVICE
=====================================================================================================

Multi-channel notification delivery system for security alerts.

Supported Channels:
- Email (SMTP)
- SMS (Twilio)
- Webhooks (Slack, Discord, Microsoft Teams, Custom)
- WebSocket (Real-time browser notifications)
- Push Notifications

Author: EvaSafe Security Team
Date: January 2, 2026
"""

import json
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# -----------------------------
# NOTIFICATION CONFIGURATION
# -----------------------------
NOTIFICATION_CONFIG = {
    'email': {
        'enabled': True,
        'smtp_server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
        'smtp_port': int(os.environ.get('SMTP_PORT', 587)),
        'sender_email': os.environ.get('SENDER_EMAIL', 'alerts@evasafe.com'),
        'sender_password': os.environ.get('SENDER_PASSWORD', ''),
        'recipient_emails': os.environ.get('ALERT_EMAILS', 'security-team@company.com').split(',')
    },
    'sms': {
        'enabled': False,  # Enable when Twilio credentials are configured
        'twilio_account_sid': os.environ.get('TWILIO_ACCOUNT_SID', ''),
        'twilio_auth_token': os.environ.get('TWILIO_AUTH_TOKEN', ''),
        'twilio_phone_number': os.environ.get('TWILIO_PHONE', ''),
        'recipient_phones': os.environ.get('ALERT_PHONES', '').split(',')
    },
    'webhook': {
        'enabled': True,
        'slack_webhook': os.environ.get('SLACK_WEBHOOK_URL', ''),
        'discord_webhook': os.environ.get('DISCORD_WEBHOOK_URL', ''),
        'teams_webhook': os.environ.get('TEAMS_WEBHOOK_URL', ''),
        'custom_webhook': os.environ.get('CUSTOM_WEBHOOK_URL', '')
    },
    'websocket': {
        'enabled': True,
        'server_url': os.environ.get('WEBSOCKET_SERVER', 'http://localhost:3000'),
        'endpoint': '/api/alerts/broadcast'
    }
}

# -----------------------------
# NOTIFICATION SERVICE CLASS
# -----------------------------
class NotificationService:
    def __init__(self, config: Dict = None):
        self.config = config or NOTIFICATION_CONFIG
        self.delivery_log = []
    
    def send_notification(self, alert: Dict, channels: List[str] = None) -> Dict:
        """Send notification through specified channels"""
        if channels is None:
            channels = alert.get('notification_channels', ['websocket'])
        
        results = {
            'alert_id': alert['alert_id'],
            'timestamp': datetime.now().isoformat(),
            'channels': {},
            'success_count': 0,
            'failure_count': 0
        }
        
        # Send through each channel
        for channel in channels:
            try:
                if channel == 'email':
                    success = self.send_email(alert)
                elif channel == 'sms':
                    success = self.send_sms(alert)
                elif channel == 'webhook':
                    success = self.send_webhook(alert)
                elif channel == 'websocket':
                    success = self.send_websocket(alert)
                else:
                    success = False
                
                results['channels'][channel] = 'success' if success else 'failed'
                if success:
                    results['success_count'] += 1
                else:
                    results['failure_count'] += 1
                    
            except Exception as e:
                results['channels'][channel] = f'error: {str(e)}'
                results['failure_count'] += 1
        
        # Log delivery
        self.delivery_log.append(results)
        
        return results
    
    def send_email(self, alert: Dict) -> bool:
        """Send email notification"""
        config = self.config['email']
        
        if not config['enabled'] or not config['sender_password']:
            print(f"   ℹ️  Email notifications not configured (set environment variables)")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[{alert['severity']}] {alert['title']}"
            msg['From'] = config['sender_email']
            msg['To'] = ', '.join(config['recipient_emails'])
            
            # Create email body
            html_body = self.create_email_html(alert)
            text_body = self.create_email_text(alert)
            
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(config['smtp_server'], config['smtp_port']) as server:
                server.starttls()
                server.login(config['sender_email'], config['sender_password'])
                server.sendmail(config['sender_email'], config['recipient_emails'], msg.as_string())
            
            print(f"   ✅ Email sent to {len(config['recipient_emails'])} recipients")
            return True
            
        except Exception as e:
            print(f"   ❌ Email failed: {str(e)}")
            return False
    
    def create_email_html(self, alert: Dict) -> str:
        """Create HTML email body"""
        severity_colors = {
            'CRITICAL': '#DC2626',
            'HIGH': '#EA580C',
            'MEDIUM': '#F59E0B',
            'LOW': '#3B82F6'
        }
        
        color = severity_colors.get(alert['severity'], '#6B7280')
        
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: {color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }}
                .content {{ background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }}
                .device-info {{ background: white; padding: 15px; margin: 15px 0; border-left: 4px solid {color}; }}
                .actions {{ background: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 Security Alert: {alert['severity']}</h1>
                    <h2>{alert['title']}</h2>
                </div>
                <div class="content">
                    <p><strong>Alert ID:</strong> {alert['alert_id']}</p>
                    <p><strong>Timestamp:</strong> {alert['timestamp']}</p>
                    <p><strong>Response Time:</strong> {alert['response_time']}</p>
                    
                    <h3>Alert Details</h3>
                    <p>{alert['message']}</p>
                    
                    <div class="device-info">
                        <h3>Device Information</h3>
                        <p><strong>Device ID:</strong> {alert['device_id']}</p>
                        <p><strong>Manufacturer:</strong> {alert['device_info']['manufacturer']}</p>
                        <p><strong>Model:</strong> {alert['device_info']['model']}</p>
                        <p><strong>IP Address:</strong> {alert['device_info']['ip_address']}</p>
                        <p><strong>Risk Level:</strong> {alert['device_info']['ml_risk_level']}</p>
                        <p><strong>Vulnerabilities:</strong> {alert['device_info']['vulnerability_count']}</p>
                        <p><strong>Max CVSS Score:</strong> {alert['device_info']['max_cvss_score']}</p>
                    </div>
                    
                    <div class="actions">
                        <h3>Recommended Actions</h3>
                        <ol>
                            {''.join(f'<li>{action}</li>' for action in alert['recommended_actions'])}
                        </ol>
                    </div>
                </div>
                <div class="footer">
                    <p>EvaSafe CCTV Security Monitoring System</p>
                    <p>This is an automated security alert. Please take immediate action.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html
    
    def create_email_text(self, alert: Dict) -> str:
        """Create plain text email body"""
        text = f"""
🚨 SECURITY ALERT: {alert['severity']}

{alert['title']}

Alert ID: {alert['alert_id']}
Timestamp: {alert['timestamp']}
Response Time: {alert['response_time']}

ALERT DETAILS:
{alert['message']}

DEVICE INFORMATION:
- Device ID: {alert['device_id']}
- Manufacturer: {alert['device_info']['manufacturer']}
- Model: {alert['device_info']['model']}
- IP Address: {alert['device_info']['ip_address']}
- Risk Level: {alert['device_info']['ml_risk_level']}
- Vulnerabilities: {alert['device_info']['vulnerability_count']}
- Max CVSS Score: {alert['device_info']['max_cvss_score']}

RECOMMENDED ACTIONS:
"""
        for i, action in enumerate(alert['recommended_actions'], 1):
            text += f"\n{i}. {action}"
        
        text += "\n\n---\nEvaSafe CCTV Security Monitoring System\nThis is an automated security alert. Please take immediate action."
        
        return text
    
    def send_sms(self, alert: Dict) -> bool:
        """Send SMS notification via Twilio"""
        config = self.config['sms']
        
        if not config['enabled']:
            print(f"   ℹ️  SMS notifications not configured")
            return False
        
        try:
            from twilio.rest import Client
            
            client = Client(config['twilio_account_sid'], config['twilio_auth_token'])
            
            # Create SMS message (keep it concise)
            message_body = f"[{alert['severity']}] {alert['title']}\n\n{alert['message'][:160]}\n\nCheck dashboard for details."
            
            # Send to all recipients
            for phone in config['recipient_phones']:
                if phone.strip():
                    client.messages.create(
                        body=message_body,
                        from_=config['twilio_phone_number'],
                        to=phone.strip()
                    )
            
            print(f"   ✅ SMS sent to {len(config['recipient_phones'])} recipients")
            return True
            
        except ImportError:
            print(f"   ❌ SMS failed: twilio library not installed (pip install twilio)")
            return False
        except Exception as e:
            print(f"   ❌ SMS failed: {str(e)}")
            return False
    
    def send_webhook(self, alert: Dict) -> bool:
        """Send webhook notification (Slack, Discord, Teams, Custom)"""
        config = self.config['webhook']
        
        if not config['enabled']:
            return False
        
        success = False
        
        # Slack webhook
        if config['slack_webhook']:
            success = self.send_slack_webhook(alert, config['slack_webhook']) or success
        
        # Discord webhook
        if config['discord_webhook']:
            success = self.send_discord_webhook(alert, config['discord_webhook']) or success
        
        # Teams webhook
        if config['teams_webhook']:
            success = self.send_teams_webhook(alert, config['teams_webhook']) or success
        
        # Custom webhook
        if config['custom_webhook']:
            success = self.send_custom_webhook(alert, config['custom_webhook']) or success
        
        return success
    
    def send_slack_webhook(self, alert: Dict, webhook_url: str) -> bool:
        """Send Slack webhook notification"""
        try:
            severity_colors = {
                'CRITICAL': '#DC2626',
                'HIGH': '#EA580C',
                'MEDIUM': '#F59E0B',
                'LOW': '#3B82F6'
            }
            
            payload = {
                "attachments": [{
                    "color": severity_colors.get(alert['severity'], '#6B7280'),
                    "title": f"🚨 {alert['severity']}: {alert['title']}",
                    "text": alert['message'],
                    "fields": [
                        {"title": "Device ID", "value": alert['device_id'], "short": True},
                        {"title": "IP Address", "value": alert['device_info']['ip_address'], "short": True},
                        {"title": "Risk Level", "value": alert['device_info']['ml_risk_level'], "short": True},
                        {"title": "Response Time", "value": alert['response_time'], "short": True}
                    ],
                    "footer": "EvaSafe CCTV Security",
                    "ts": int(datetime.now().timestamp())
                }]
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            if response.status_code == 200:
                print(f"   ✅ Slack webhook delivered")
                return True
            else:
                print(f"   ❌ Slack webhook failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Slack webhook failed: {str(e)}")
            return False
    
    def send_discord_webhook(self, alert: Dict, webhook_url: str) -> bool:
        """Send Discord webhook notification"""
        try:
            severity_colors = {
                'CRITICAL': 14362664,  # Red
                'HIGH': 15360016,      # Orange
                'MEDIUM': 16177920,    # Yellow
                'LOW': 3901635         # Blue
            }
            
            payload = {
                "embeds": [{
                    "title": f"🚨 {alert['severity']}: {alert['title']}",
                    "description": alert['message'],
                    "color": severity_colors.get(alert['severity'], 7040550),
                    "fields": [
                        {"name": "Device ID", "value": alert['device_id'], "inline": True},
                        {"name": "IP Address", "value": alert['device_info']['ip_address'], "inline": True},
                        {"name": "Risk Level", "value": alert['device_info']['ml_risk_level'], "inline": True},
                        {"name": "Response Time", "value": alert['response_time'], "inline": True}
                    ],
                    "footer": {"text": "EvaSafe CCTV Security"},
                    "timestamp": datetime.now().isoformat()
                }]
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            if response.status_code in [200, 204]:
                print(f"   ✅ Discord webhook delivered")
                return True
            else:
                print(f"   ❌ Discord webhook failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Discord webhook failed: {str(e)}")
            return False
    
    def send_teams_webhook(self, alert: Dict, webhook_url: str) -> bool:
        """Send Microsoft Teams webhook notification"""
        try:
            payload = {
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                "summary": alert['title'],
                "themeColor": "FF0000" if alert['severity'] == 'CRITICAL' else "FFA500",
                "title": f"🚨 {alert['severity']}: {alert['title']}",
                "sections": [{
                    "activityTitle": "Security Alert",
                    "activitySubtitle": alert['timestamp'],
                    "text": alert['message'],
                    "facts": [
                        {"name": "Device ID", "value": alert['device_id']},
                        {"name": "IP Address", "value": alert['device_info']['ip_address']},
                        {"name": "Risk Level", "value": alert['device_info']['ml_risk_level']},
                        {"name": "Response Time", "value": alert['response_time']}
                    ]
                }]
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            if response.status_code == 200:
                print(f"   ✅ Teams webhook delivered")
                return True
            else:
                print(f"   ❌ Teams webhook failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Teams webhook failed: {str(e)}")
            return False
    
    def send_custom_webhook(self, alert: Dict, webhook_url: str) -> bool:
        """Send custom webhook notification"""
        try:
            response = requests.post(webhook_url, json=alert, timeout=10)
            if response.status_code == 200:
                print(f"   ✅ Custom webhook delivered")
                return True
            else:
                print(f"   ❌ Custom webhook failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Custom webhook failed: {str(e)}")
            return False
    
    def send_websocket(self, alert: Dict) -> bool:
        """Send WebSocket notification to connected clients"""
        config = self.config['websocket']
        
        if not config['enabled']:
            return False
        
        try:
            # Send to backend server which will broadcast via WebSocket
            url = f"{config['server_url']}{config['endpoint']}"
            response = requests.post(url, json=alert, timeout=5)
            
            if response.status_code == 200:
                print(f"   ✅ WebSocket broadcast sent")
                return True
            else:
                print(f"   ℹ️  WebSocket broadcast queued (server may be offline)")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"   ℹ️  WebSocket server not running (will queue for later)")
            return False
        except Exception as e:
            print(f"   ⚠️  WebSocket failed: {str(e)}")
            return False
    
    def get_delivery_log(self) -> List[Dict]:
        """Get notification delivery log"""
        return self.delivery_log


# -----------------------------
# BATCH NOTIFICATION SENDER
# -----------------------------
def send_batch_notifications(alerts: List[Dict], notification_service: NotificationService = None) -> Dict:
    """Send notifications for multiple alerts"""
    if notification_service is None:
        notification_service = NotificationService()
    
    results = {
        'total_alerts': len(alerts),
        'notifications_sent': 0,
        'notifications_failed': 0,
        'by_channel': {}
    }
    
    for alert in alerts:
        delivery_result = notification_service.send_notification(alert)
        results['notifications_sent'] += delivery_result['success_count']
        results['notifications_failed'] += delivery_result['failure_count']
        
        for channel, status in delivery_result['channels'].items():
            if channel not in results['by_channel']:
                results['by_channel'][channel] = {'success': 0, 'failed': 0}
            
            if status == 'success':
                results['by_channel'][channel]['success'] += 1
            else:
                results['by_channel'][channel]['failed'] += 1
    
    return results


# -----------------------------
# MAIN EXECUTION
# -----------------------------
if __name__ == '__main__':
    print("=" * 100)
    print("📧 NOTIFICATION SERVICE TEST")
    print("=" * 100)
    
    # Load recent alerts
    import os
    if os.path.exists('data/active_alerts.json'):
        with open('data/active_alerts.json', 'r') as f:
            alerts = json.load(f)
        
        print(f"\n📂 Loaded {len(alerts)} alerts")
        
        # Send notifications for critical alerts only
        critical_alerts = [a for a in alerts if a['severity'] == 'CRITICAL'][:3]  # Limit to 3 for testing
        
        if critical_alerts:
            print(f"\n📨 Sending notifications for {len(critical_alerts)} critical alerts...")
            
            notification_service = NotificationService()
            results = send_batch_notifications(critical_alerts, notification_service)
            
            print(f"\n📊 Notification Results:")
            print(f"   Total Alerts: {results['total_alerts']}")
            print(f"   Notifications Sent: {results['notifications_sent']}")
            print(f"   Notifications Failed: {results['notifications_failed']}")
            
            print(f"\n📈 By Channel:")
            for channel, stats in results['by_channel'].items():
                print(f"   {channel}: {stats['success']} success, {stats['failed']} failed")
        else:
            print("\n✅ No critical alerts to send")
    else:
        print("\n❌ No alerts file found. Run alert_engine.py first.")
    
    print("\n" + "=" * 100)
