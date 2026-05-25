import { useState, useEffect, useRef } from 'react';

const ScanProgressPage = () => {
  const [scanning, setScanning] = useState(false);
  const [scanConfig, setScanConfig] = useState({
    target: '',
    scanType: 'quick',
    ports: '80,443,554,8080',
    threads: 10
  });
  const [progress, setProgress] = useState({
    total: 0,
    scanned: 0,
    vulnerabilities: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    elapsed: 0
  });
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [activeScans, setActiveScans] = useState([]);
  const logsEndRef = useRef(null);
  const ws = useRef(null);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    ws.current = new WebSocket('ws://localhost:5001');
    
    ws.current.onopen = () => {
      addLog('✅ Connected to scan server', 'success');
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'scan_started':
          addLog(`🚀 Scan started: ${message.scan_id}`, 'info');
          setScanning(true);
          setActiveScans(prev => [...prev, message]);
          break;
          
        case 'scan_progress':
          setProgress(prev => ({
            ...prev,
            scanned: message.scanned,
            total: message.total,
            elapsed: message.elapsed
          }));
          if (message.device) {
            addLog(`🔍 Scanning ${message.device.ip}...`, 'info');
          }
          break;
          
        case 'device_discovered':
          addLog(`📡 Device found: ${message.device.ip} (${message.device.manufacturer})`, 'success');
          setDevices(prev => [...prev, message.device]);
          setProgress(prev => ({
            ...prev,
            scanned: prev.scanned + 1
          }));
          break;
          
        case 'vulnerability_found':
          const severity = message.severity.toLowerCase();
          addLog(
            `⚠️  Vulnerability: ${message.vulnerability} on ${message.ip} (${message.severity})`,
            severity === 'critical' ? 'error' : severity === 'high' ? 'warning' : 'info'
          );
          setProgress(prev => ({
            ...prev,
            vulnerabilities: prev.vulnerabilities + 1,
            [severity]: prev[severity] + 1
          }));
          break;
          
        case 'scan_complete':
          addLog(`✅ Scan complete: ${message.devices_found} devices, ${message.vulnerabilities} vulnerabilities`, 'success');
          setScanning(false);
          setActiveScans(prev => prev.filter(s => s.scan_id !== message.scan_id));
          break;
          
        case 'scan_error':
          addLog(`❌ Error: ${message.error}`, 'error');
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    };

    ws.current.onerror = (error) => {
      addLog('❌ WebSocket error - connection lost', 'error');
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      addLog('⚠️  Disconnected from scan server', 'warning');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const startScan = async () => {
    if (!scanConfig.target) {
      addLog('❌ Please enter a target IP or range', 'error');
      return;
    }

    try {
      // Reset progress
      setProgress({
        total: 0,
        scanned: 0,
        vulnerabilities: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        elapsed: 0
      });
      setDevices([]);
      setLogs([]);

      addLog(`🚀 Starting ${scanConfig.scanType} scan on ${scanConfig.target}`, 'info');
      setScanning(true);

      const response = await fetch('http://localhost:5001/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanConfig)
      });

      if (!response.ok) {
        throw new Error('Failed to start scan');
      }

      const data = await response.json();
      addLog(`✅ Scan initiated: ${data.scan_id}`, 'success');
    } catch (error) {
      addLog(`❌ Failed to start scan: ${error.message}`, 'error');
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'stop_scan' }));
      addLog('⏹️  Stopping scan...', 'warning');
      setScanning(false);
    }
  };

  const exportResults = () => {
    const dataStr = JSON.stringify({ progress, devices, logs }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan_results_${new Date().getTime()}.json`;
    link.click();
    addLog('📁 Results exported', 'success');
  };

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.scanned / progress.total) * 100) 
    : 0;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Real-Time Network Scanner</h1>
        <p className="text-gray-600">Live CCTV vulnerability scanning and monitoring</p>
      </div>

      {/* Scan Configuration */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Scan Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target IP / Range
            </label>
            <input
              type="text"
              value={scanConfig.target}
              onChange={(e) => setScanConfig({...scanConfig, target: e.target.value})}
              placeholder="192.168.1.0/24 or 8.8.8.8"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scan Type
            </label>
            <select
              value={scanConfig.scanType}
              onChange={(e) => setScanConfig({...scanConfig, scanType: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            >
              <option value="quick">Quick Scan</option>
              <option value="full">Full Scan</option>
              <option value="stealth">Stealth Scan</option>
              <option value="aggressive">Aggressive Scan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ports
            </label>
            <input
              type="text"
              value={scanConfig.ports}
              onChange={(e) => setScanConfig({...scanConfig, ports: e.target.value})}
              placeholder="80,443,554,8080"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Threads
            </label>
            <input
              type="number"
              value={scanConfig.threads}
              onChange={(e) => setScanConfig({...scanConfig, threads: parseInt(e.target.value)})}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          {!scanning ? (
            <button
              onClick={startScan}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              🚀 Start Scan
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              ⏹️ Stop Scan
            </button>
          )}
          
          <button
            onClick={exportResults}
            disabled={devices.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📁 Export Results
          </button>

          <button
            onClick={() => {
              setLogs([]);
              setDevices([]);
              setProgress({
                total: 0,
                scanned: 0,
                vulnerabilities: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                elapsed: 0
              });
            }}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm mb-1">Devices Scanned</div>
          <div className="text-2xl font-bold text-gray-900">
            {progress.scanned} / {progress.total || '—'}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm mb-1">Vulnerabilities</div>
          <div className="text-2xl font-bold text-red-600">{progress.vulnerabilities}</div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-red-600">C: {progress.critical}</span>
            <span className="text-orange-600">H: {progress.high}</span>
            <span className="text-yellow-600">M: {progress.medium}</span>
            <span className="text-blue-600">L: {progress.low}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm mb-1">Devices Found</div>
          <div className="text-2xl font-bold text-green-600">{devices.length}</div>
          <div className="text-xs text-gray-500 mt-2">
            {scanning ? '🔴 Scanning...' : '✅ Idle'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm mb-1">Elapsed Time</div>
          <div className="text-2xl font-bold text-gray-900">{formatTime(progress.elapsed)}</div>
          <div className="text-xs text-gray-500 mt-2">
            {progress.scanned > 0 && progress.elapsed > 0
              ? `${Math.round(progress.scanned / (progress.elapsed / 60))} devices/min`
              : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">📄 Live Logs</h2>
            <span className="text-sm text-gray-500">{logs.length} entries</span>
          </div>
          <div className="p-4 h-96 overflow-y-auto bg-gray-900 font-mono text-xs">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Discovered Devices */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">📡 Discovered Devices</h2>
            <span className="text-sm text-gray-500">{devices.length} devices</span>
          </div>
          <div className="p-4 h-96 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No devices discovered yet. Start a scan to find devices.
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((device, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {device.ip}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        device.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        device.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        device.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {device.risk_level || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {device.manufacturer} {device.model}
                    </div>
                    {device.vulnerabilities > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ {device.vulnerabilities} vulnerabilities
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanProgressPage;
