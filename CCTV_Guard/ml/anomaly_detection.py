"""
=====================================================================================================
🧠 ML-BASED ANOMALY DETECTION SYSTEM FOR CCTV NETWORKS
=====================================================================================================

Advanced machine learning system for detecting suspicious activities and network anomalies.
Uses multiple ML algorithms for real-time threat detection.

Features:
- Real-time network traffic analysis
- Behavioral anomaly detection
- Unusual access pattern detection
- Failed authentication monitoring
- Data exfiltration detection
- Botnet activity detection
- Time-series anomaly detection
- Auto-learning normal behavior
- Alert generation with confidence scores

Author: EvaSafe Security Team
Date: January 2, 2026
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import json
import random
from typing import Dict, List, Any, Optional
import joblib
import warnings
warnings.filterwarnings('ignore')

class AnomalyDetector:
    def __init__(self):
        """Initialize ML-based Anomaly Detection System"""
        self.isolation_forest = None
        self.scaler = StandardScaler()
        self.normal_behavior_baseline = {}
        self.anomaly_history = []
        self.confidence_threshold = 0.75
        
    def train_baseline(self, normal_traffic_data: pd.DataFrame):
        """
        Train on normal network behavior to establish baseline
        
        Args:
            normal_traffic_data: Historical network traffic data
        """
        print("🧠 Training anomaly detection baseline...")
        
        # Extract features
        features = self.extract_features(normal_traffic_data)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(features)
        
        # Train Isolation Forest
        self.isolation_forest = IsolationForest(
            contamination=0.05,  # Expect 5% anomalies
            n_estimators=100,
            max_samples='auto',
            random_state=42
        )
        
        self.isolation_forest.fit(X_scaled)
        
        # Establish normal behavior patterns
        self.normal_behavior_baseline = {
            'avg_requests_per_hour': features['requests_per_hour'].mean(),
            'avg_failed_auths': features['failed_auth_attempts'].mean(),
            'avg_data_transfer_mb': features['data_transfer_mb'].mean(),
            'typical_access_hours': features['access_hour'].mode()[0],
            'std_requests': features['requests_per_hour'].std(),
            'std_data_transfer': features['data_transfer_mb'].std()
        }
        
        print(f"✅ Baseline established: {len(features)} samples")
        print(f"   Normal behavior patterns learned")
        
    def extract_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Extract features from network traffic data"""
        features = pd.DataFrame()
        
        # Time-based features
        if 'timestamp' in data.columns:
            data['timestamp'] = pd.to_datetime(data['timestamp'])
            features['access_hour'] = data['timestamp'].dt.hour
            features['access_day_of_week'] = data['timestamp'].dt.dayofweek
            features['is_weekend'] = (data['timestamp'].dt.dayofweek >= 5).astype(int)
            features['is_night_time'] = ((data['timestamp'].dt.hour < 6) | 
                                        (data['timestamp'].dt.hour > 22)).astype(int)
        else:
            features['access_hour'] = random.randint(0, 23)
            features['access_day_of_week'] = random.randint(0, 6)
            features['is_weekend'] = random.choice([0, 1])
            features['is_night_time'] = random.choice([0, 1])
        
        # Activity features
        features['requests_per_hour'] = data.get('requests_per_hour', 
                                                 np.random.normal(50, 20, len(data)))
        features['failed_auth_attempts'] = data.get('failed_auth_attempts', 
                                                    np.random.poisson(0.5, len(data)))
        features['unique_ips_accessed'] = data.get('unique_ips', 
                                                   np.random.randint(1, 10, len(data)))
        features['data_transfer_mb'] = data.get('data_transfer_mb', 
                                                np.random.normal(100, 50, len(data)))
        
        # Connection features
        features['connection_duration_sec'] = data.get('connection_duration', 
                                                       np.random.normal(300, 100, len(data)))
        features['packet_loss_rate'] = data.get('packet_loss', 
                                                np.random.uniform(0, 0.05, len(data)))
        
        # Device features
        features['is_rtsp_access'] = data.get('rtsp_access', 
                                              np.random.choice([0, 1], len(data), p=[0.7, 0.3]))
        features['is_http_access'] = data.get('http_access', 
                                              np.random.choice([0, 1], len(data), p=[0.6, 0.4]))
        
        return features
    
    def detect_anomalies(self, current_traffic: pd.DataFrame) -> List[Dict]:
        """
        Detect anomalies in current network traffic
        
        Args:
            current_traffic: Current network traffic data
            
        Returns:
            List of detected anomalies
        """
        if self.isolation_forest is None:
            raise ValueError("Model not trained. Call train_baseline() first.")
        
        print(f"🔍 Analyzing {len(current_traffic)} traffic samples...")
        
        # Extract features
        features = self.extract_features(current_traffic)
        X_scaled = self.scaler.transform(features)
        
        # Predict anomalies (-1 = anomaly, 1 = normal)
        predictions = self.isolation_forest.predict(X_scaled)
        anomaly_scores = self.isolation_forest.score_samples(X_scaled)
        
        # Normalize scores to 0-1 (confidence)
        min_score = anomaly_scores.min()
        max_score = anomaly_scores.max()
        confidence_scores = (anomaly_scores - min_score) / (max_score - min_score)
        
        # Identify anomalies
        anomalies = []
        for idx, (pred, score, conf) in enumerate(zip(predictions, anomaly_scores, confidence_scores)):
            if pred == -1:  # Anomaly detected
                anomaly = self.classify_anomaly_type(features.iloc[idx], current_traffic.iloc[idx])
                anomaly.update({
                    'anomaly_id': f"ANOM-{int(datetime.now().timestamp() * 1000)}-{idx}",
                    'timestamp': datetime.now().isoformat(),
                    'anomaly_score': float(score),
                    'confidence': float(1 - conf),  # Invert so higher = more anomalous
                    'severity': self.calculate_severity(features.iloc[idx]),
                    'device_id': current_traffic.iloc[idx].get('device_id', f'Unknown-{idx}'),
                    'ip_address': current_traffic.iloc[idx].get('ip_address', 'Unknown')
                })
                anomalies.append(anomaly)
        
        print(f"⚠️  Detected {len(anomalies)} anomalies")
        
        self.anomaly_history.extend(anomalies)
        return anomalies
    
    def classify_anomaly_type(self, features: pd.Series, raw_data: pd.Series) -> Dict:
        """Classify the type of anomaly detected"""
        anomaly_type = "Unknown Anomaly"
        description = "Unusual network behavior detected"
        recommended_action = "Investigate and monitor"
        
        baseline = self.normal_behavior_baseline
        
        # Check for brute force attack
        if features['failed_auth_attempts'] > baseline.get('avg_failed_auths', 1) + 3 * baseline.get('std_requests', 1):
            anomaly_type = "Brute Force Attack"
            description = f"Excessive failed authentication attempts detected ({features['failed_auth_attempts']} vs normal {baseline['avg_failed_auths']:.1f})"
            recommended_action = "Block source IP immediately, enable rate limiting"
        
        # Check for data exfiltration
        elif features['data_transfer_mb'] > baseline.get('avg_data_transfer_mb', 100) * 3:
            anomaly_type = "Potential Data Exfiltration"
            description = f"Unusually high data transfer detected ({features['data_transfer_mb']:.1f}MB vs normal {baseline['avg_data_transfer_mb']:.1f}MB)"
            recommended_action = "Investigate data transfer patterns, check for unauthorized access"
        
        # Check for unusual access time
        elif features['is_night_time'] and features['requests_per_hour'] > baseline.get('avg_requests_per_hour', 50):
            anomaly_type = "Off-Hours Access Spike"
            description = f"High activity during unusual hours (Hour: {features['access_hour']}, {features['requests_per_hour']:.0f} requests)"
            recommended_action = "Verify legitimate user activity, check for compromised credentials"
        
        # Check for botnet activity
        elif features['unique_ips_accessed'] > 20:
            anomaly_type = "Potential Botnet Activity"
            description = f"Device accessed by {features['unique_ips_accessed']} unique IPs in short timeframe"
            recommended_action = "Isolate device, scan for malware, reset credentials"
        
        # Check for reconnaissance
        elif features['requests_per_hour'] > baseline.get('avg_requests_per_hour', 50) * 5 and features['connection_duration_sec'] < 30:
            anomaly_type = "Network Reconnaissance"
            description = f"Rapid connection attempts detected ({features['requests_per_hour']:.0f} requests/hour)"
            recommended_action = "Enable IDS/IPS, monitor for follow-up attacks"
        
        # Check for stream hijacking
        elif features['is_rtsp_access'] and features['data_transfer_mb'] > 500:
            anomaly_type = "RTSP Stream Hijacking"
            description = f"Unusually large RTSP stream transfer ({features['data_transfer_mb']:.1f}MB)"
            recommended_action = "Enable RTSP authentication, restrict stream access"
        
        return {
            'anomaly_type': anomaly_type,
            'description': description,
            'recommended_action': recommended_action
        }
    
    def calculate_severity(self, features: pd.Series) -> str:
        """Calculate anomaly severity"""
        baseline = self.normal_behavior_baseline
        
        # Calculate deviation scores
        request_deviation = abs(features['requests_per_hour'] - baseline.get('avg_requests_per_hour', 50)) / baseline.get('std_requests', 1)
        data_deviation = abs(features['data_transfer_mb'] - baseline.get('avg_data_transfer_mb', 100)) / baseline.get('std_data_transfer', 1)
        
        max_deviation = max(request_deviation, data_deviation)
        
        if max_deviation > 5 or features['failed_auth_attempts'] > 10:
            return "CRITICAL"
        elif max_deviation > 3 or features['failed_auth_attempts'] > 5:
            return "HIGH"
        elif max_deviation > 2:
            return "MEDIUM"
        else:
            return "LOW"
    
    def generate_anomaly_report(self, filename='CCTV_Guard/data/anomaly_detection_report.json'):
        """Generate comprehensive anomaly detection report"""
        if not self.anomaly_history:
            print("ℹ️  No anomalies detected")
            return None
        
        # Group by type
        anomalies_by_type = {}
        for anomaly in self.anomaly_history:
            anom_type = anomaly['anomaly_type']
            if anom_type not in anomalies_by_type:
                anomalies_by_type[anom_type] = []
            anomalies_by_type[anom_type].append(anomaly)
        
        # Group by severity
        anomalies_by_severity = {}
        for anomaly in self.anomaly_history:
            severity = anomaly['severity']
            if severity not in anomalies_by_severity:
                anomalies_by_severity[severity] = []
            anomalies_by_severity[severity].append(anomaly)
        
        # Convert numpy types to Python types for JSON serialization
        baseline_json = {k: float(v) if isinstance(v, (np.integer, np.floating)) else v 
                        for k, v in self.normal_behavior_baseline.items()}
        
        report = {
            'report_generated': datetime.now().isoformat(),
            'summary': {
                'total_anomalies': int(len(self.anomaly_history)),
                'unique_anomaly_types': int(len(anomalies_by_type)),
                'by_type': {k: int(len(v)) for k, v in anomalies_by_type.items()},
                'by_severity': {k: int(len(v)) for k, v in anomalies_by_severity.items()},
                'critical_anomalies': int(len(anomalies_by_severity.get('CRITICAL', []))),
                'high_risk_anomalies': int(len(anomalies_by_severity.get('HIGH', []))),
                'avg_confidence': float(np.mean([a['confidence'] for a in self.anomaly_history]))
            },
            'baseline_behavior': baseline_json,
            'detailed_anomalies': self.anomaly_history,
            'top_recommendations': self.generate_top_recommendations()
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Anomaly report saved to {filename}")
        return report
    
    def generate_top_recommendations(self) -> List[str]:
        """Generate top recommendations based on detected anomalies"""
        recommendations = []
        
        anomaly_counts = {}
        for anomaly in self.anomaly_history:
            anom_type = anomaly['anomaly_type']
            anomaly_counts[anom_type] = anomaly_counts.get(anom_type, 0) + 1
        
        # Sort by frequency
        sorted_anomalies = sorted(anomaly_counts.items(), key=lambda x: x[1], reverse=True)
        
        for anom_type, count in sorted_anomalies[:5]:
            # Find a sample anomaly for recommendations
            sample = next(a for a in self.anomaly_history if a['anomaly_type'] == anom_type)
            recommendations.append(f"{anom_type} ({count} occurrences): {sample['recommended_action']}")
        
        # General recommendations
        if len(self.anomaly_history) > 10:
            recommendations.append("Enable continuous anomaly monitoring and alerting")
        
        recommendations.append("Implement automated response for critical anomalies")
        recommendations.append("Review and update security policies based on detected patterns")
        
        return recommendations
    
    def save_model(self, filename: str = 'CCTV_Guard/models/anomaly_detector.pkl'):
        """Save trained model"""
        model_data = {
            'isolation_forest': self.isolation_forest,
            'scaler': self.scaler,
            'baseline': self.normal_behavior_baseline
        }
        joblib.dump(model_data, filename)
        print(f"💾 Model saved to {filename}")
    
    def load_model(self, filename: str = 'CCTV_Guard/models/anomaly_detector.pkl'):
        """Load trained model"""
        model_data = joblib.load(filename)
        self.isolation_forest = model_data['isolation_forest']
        self.scaler = model_data['scaler']
        self.normal_behavior_baseline = model_data['baseline']
        print(f"📂 Model loaded from {filename}")


def generate_synthetic_traffic(n_samples: int = 1000, anomaly_rate: float = 0.10) -> pd.DataFrame:
    """Generate synthetic network traffic data for demonstration"""
    print(f"🔧 Generating {n_samples} synthetic traffic samples...")
    
    data = []
    
    for i in range(n_samples):
        # Generate timestamp
        timestamp = datetime.now() - timedelta(hours=random.randint(0, 168))  # Past week
        
        # Normal traffic (90% of samples)
        if random.random() > anomaly_rate:
            sample = {
                'device_id': f"CCTV-{random.randint(1, 100):05d}",
                'ip_address': f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                'timestamp': timestamp,
                'requests_per_hour': np.random.normal(50, 15),
                'failed_auth_attempts': np.random.poisson(0.3),
                'unique_ips': np.random.randint(1, 5),
                'data_transfer_mb': np.random.normal(100, 30),
                'connection_duration': np.random.normal(300, 100),
                'packet_loss': np.random.uniform(0, 0.03),
                'rtsp_access': random.choice([0, 1]),
                'http_access': random.choice([0, 1])
            }
        # Anomalous traffic (10% of samples)
        else:
            anomaly_types = ['brute_force', 'data_exfiltration', 'botnet', 'recon', 'stream_hijack']
            anomaly_type = random.choice(anomaly_types)
            
            if anomaly_type == 'brute_force':
                sample = {
                    'device_id': f"CCTV-{random.randint(1, 100):05d}",
                    'ip_address': f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    'timestamp': timestamp,
                    'requests_per_hour': np.random.normal(200, 50),
                    'failed_auth_attempts': np.random.randint(15, 50),
                    'unique_ips': 1,
                    'data_transfer_mb': np.random.normal(20, 10),
                    'connection_duration': np.random.normal(60, 20),
                    'packet_loss': np.random.uniform(0, 0.05),
                    'rtsp_access': 0,
                    'http_access': 1
                }
            elif anomaly_type == 'data_exfiltration':
                sample = {
                    'device_id': f"CCTV-{random.randint(1, 100):05d}",
                    'ip_address': f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    'timestamp': timestamp,
                    'requests_per_hour': np.random.normal(80, 20),
                    'failed_auth_attempts': 0,
                    'unique_ips': 1,
                    'data_transfer_mb': np.random.normal(500, 100),
                    'connection_duration': np.random.normal(1800, 300),
                    'packet_loss': np.random.uniform(0, 0.02),
                    'rtsp_access': 1,
                    'http_access': 0
                }
            elif anomaly_type == 'botnet':
                sample = {
                    'device_id': f"CCTV-{random.randint(1, 100):05d}",
                    'ip_address': f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    'timestamp': timestamp,
                    'requests_per_hour': np.random.normal(150, 30),
                    'failed_auth_attempts': np.random.poisson(1),
                    'unique_ips': np.random.randint(25, 50),
                    'data_transfer_mb': np.random.normal(200, 50),
                    'connection_duration': np.random.normal(180, 50),
                    'packet_loss': np.random.uniform(0.05, 0.15),
                    'rtsp_access': 1,
                    'http_access': 1
                }
            elif anomaly_type == 'recon':
                sample = {
                    'device_id': f"CCTV-{random.randint(1, 100):05d}",
                    'ip_address': f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    'timestamp': timestamp,
                    'requests_per_hour': np.random.normal(400, 100),
                    'failed_auth_attempts': np.random.randint(5, 15),
                    'unique_ips': np.random.randint(10, 20),
                    'data_transfer_mb': np.random.normal(30, 10),
                    'connection_duration': np.random.normal(20, 10),
                    'packet_loss': np.random.uniform(0, 0.05),
                    'rtsp_access': 0,
                    'http_access': 1
                }
            else:  # stream_hijack
                sample = {
                    'device_id': f"CCTV-{random.randint(1, 100):05d}",
                    'ip_address': f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    'timestamp': timestamp,
                    'requests_per_hour': np.random.normal(70, 15),
                    'failed_auth_attempts': 0,
                    'unique_ips': np.random.randint(1, 3),
                    'data_transfer_mb': np.random.normal(800, 150),
                    'connection_duration': np.random.normal(3600, 600),
                    'packet_loss': np.random.uniform(0, 0.03),
                    'rtsp_access': 1,
                    'http_access': 0
                }
        
        data.append(sample)
    
    return pd.DataFrame(data)


if __name__ == '__main__':
    print("=" * 100)
    print("🧠 ML-BASED ANOMALY DETECTION SYSTEM")
    print("=" * 100)
    
    # Generate training data (normal behavior)
    print("\n📊 Phase 1: Training on normal network behavior...")
    normal_traffic = generate_synthetic_traffic(n_samples=900, anomaly_rate=0.02)  # 2% anomalies
    
    # Initialize and train detector
    detector = AnomalyDetector()
    detector.train_baseline(normal_traffic)
    
    # Generate test data (with anomalies)
    print("\n📊 Phase 2: Analyzing current traffic for anomalies...")
    current_traffic = generate_synthetic_traffic(n_samples=200, anomaly_rate=0.15)  # 15% anomalies
    
    # Detect anomalies
    anomalies = detector.detect_anomalies(current_traffic)
    
    # Generate report
    print("\n📄 Phase 3: Generating anomaly detection report...")
    report = detector.generate_anomaly_report()
    
    # Print summary
    print("\n" + "=" * 100)
    print("📊 ANOMALY DETECTION SUMMARY")
    print("=" * 100)
    print(f"Total Samples Analyzed: {len(current_traffic)}")
    print(f"Anomalies Detected: {report['summary']['total_anomalies']}")
    print(f"Detection Rate: {(report['summary']['total_anomalies']/len(current_traffic)*100):.1f}%")
    print(f"Average Confidence: {report['summary']['avg_confidence']:.2%}")
    
    print(f"\n🎯 By Severity:")
    for severity, count in sorted(report['summary']['by_severity'].items(), 
                                  key=lambda x: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].index(x[0])):
        print(f"   {severity}: {count} anomalies")
    
    print(f"\n📋 By Type:")
    for anom_type, count in sorted(report['summary']['by_type'].items(), key=lambda x: x[1], reverse=True):
        print(f"   {anom_type}: {count} occurrences")
    
    print(f"\n💡 Top Recommendations:")
    for i, rec in enumerate(report['top_recommendations'][:5], 1):
        print(f"   {i}. {rec}")
    
    # Save model
    detector.save_model()
    
    print("\n" + "=" * 100)
    print("✅ ANOMALY DETECTION COMPLETE!")
    print("=" * 100)
