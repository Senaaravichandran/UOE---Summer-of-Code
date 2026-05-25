import { useState, useEffect } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle, X, Check, Clock } from 'lucide-react';
import Header from '../components/common/Header';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filter, setFilter] = useState('all'); // all, CRITICAL, HIGH, MEDIUM, LOW
  const [statusFilter, setStatusFilter] = useState('active'); // active, resolved, all
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);

  // Severity colors and icons
  const severityConfig = {
    CRITICAL: { 
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: AlertCircle, 
      badgeColor: 'bg-red-500',
      textColor: 'text-red-600'
    },
    HIGH: { 
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: AlertTriangle, 
      badgeColor: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
    MEDIUM: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: AlertTriangle, 
      badgeColor: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    LOW: { 
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Info, 
      badgeColor: 'bg-blue-500',
      textColor: 'text-blue-600'
    }
  };

  // Load alerts
  const loadAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('severity', filter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`http://localhost:5001/api/alerts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/alerts/statistics');
      const data = await response.json();
      
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize WebSocket
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:5001');
    
    websocket.onopen = () => {
      console.log('🔌 Connected to alert system');
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'alert') {
        // New alert received - show notification
        showNotification(message.data);
        
        // Reload alerts and statistics
        loadAlerts();
        loadStatistics();
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    websocket.onclose = () => {
      console.log('🔌 Disconnected from alert system');
    };
    
    setWs(websocket);
    
    return () => {
      if (websocket) websocket.close();
    };
  }, []);

  // Show browser notification
  const showNotification = (alert) => {
    if (Notification.permission === 'granted') {
      new Notification(`${alert.severity}: ${alert.title}`, {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load data on mount and filter change
  useEffect(() => {
    loadAlerts();
    loadStatistics();
  }, [filter, statusFilter]);

  // Acknowledge alert
  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: 'User' })
      });
      
      const data = await response.json();
      if (data.success) {
        loadAlerts();
        loadStatistics();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId, notes) => {
    try {
      const response = await fetch(`http://localhost:5001/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resolved_by: 'User',
          resolution_notes: notes || 'Resolved by user'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadAlerts();
        loadStatistics();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-xl">Loading alerts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Security Alerts
          </h1>
          <p className="text-gray-400 mt-2">Real-time monitoring and alerting system</p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Alerts</p>
                  <p className="text-3xl font-bold text-white mt-1">{statistics.total_alerts}</p>
                </div>
                <Bell className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-red-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Critical</p>
                  <p className="text-3xl font-bold text-red-500 mt-1">{statistics.by_severity.CRITICAL}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-orange-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">High</p>
                  <p className="text-3xl font-bold text-orange-500 mt-1">{statistics.by_severity.HIGH}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-yellow-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Medium</p>
                  <p className="text-3xl font-bold text-yellow-500 mt-1">{statistics.by_severity.MEDIUM}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-blue-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Low</p>
                  <p className="text-3xl font-bold text-blue-500 mt-1">{statistics.by_severity.LOW}</p>
                </div>
                <Info className="w-10 h-10 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Severity</label>
              <div className="flex gap-2">
                {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                  <button
                    key={sev}
                    onClick={() => setFilter(sev)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === sev
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Status</label>
              <div className="flex gap-2">
                {['active', 'resolved', 'all'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Alerts</h3>
              <p className="text-gray-400">All systems operating normally</p>
            </div>
          ) : (
            alerts.map(alert => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              
              return (
                <div
                  key={alert.alert_id}
                  className={`bg-gray-800 rounded-lg border-l-4 ${config.color} p-6`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${config.badgeColor} bg-opacity-20`}>
                        <Icon className={`w-6 h-6 ${config.textColor}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                            {alert.severity}
                          </span>
                          {alert.acknowledged && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Acknowledged
                            </span>
                          )}
                          {alert.resolved && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200">
                              Resolved
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-300 mb-4">{alert.message}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-400">Device ID:</span>
                            <span className="text-white ml-2">{alert.device_id}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">IP:</span>
                            <span className="text-white ml-2">{alert.device_info.ip_address}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Risk Level:</span>
                            <span className="text-white ml-2">{alert.device_info.ml_risk_level}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Response Time:</span>
                            <span className="text-white ml-2">{alert.response_time}</span>
                          </div>
                        </div>
                        
                        <details className="mb-4">
                          <summary className="text-blue-400 cursor-pointer hover:text-blue-300">
                            Recommended Actions ({alert.recommended_actions.length})
                          </summary>
                          <ol className="mt-3 space-y-2 ml-6">
                            {alert.recommended_actions.map((action, idx) => (
                              <li key={idx} className="text-gray-300">{action}</li>
                            ))}
                          </ol>
                        </details>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          {formatTime(alert.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {!alert.acknowledged && !alert.resolved && (
                        <button
                          onClick={() => acknowledgeAlert(alert.alert_id)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Acknowledge"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      {!alert.resolved && (
                        <button
                          onClick={() => resolveAlert(alert.alert_id)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          title="Resolve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default AlertsPage;
