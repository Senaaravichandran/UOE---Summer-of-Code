import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons based on risk level
const getRiskColor = (riskLevel) => {
  const colors = {
    'CRITICAL': '#ef4444',
    'HIGH': '#f97316',
    'MEDIUM': '#eab308',
    'LOW': '#3b82f6',
    'UNKNOWN': '#6b7280'
  };
  return colors[riskLevel] || colors['UNKNOWN'];
};

const getRiskIcon = (riskLevel) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${getRiskColor(riskLevel)};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const WorldMapPage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byCountry: {}
  });

  useEffect(() => {
    fetchDevices();
    
    // WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:5001');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'device_discovered') {
        setDevices(prev => [...prev, message.device]);
        updateStats([...devices, message.device]);
      } else if (message.type === 'device_updated') {
        setDevices(prev => 
          prev.map(d => d.ip === message.device.ip ? message.device : d)
        );
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/devices');
      const data = await response.json();
      setDevices(data);
      updateStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Load from local CSV as fallback
      loadFromCSV();
    }
  };

  const loadFromCSV = async () => {
    try {
      const response = await fetch('/data/cctv_comprehensive_recommendations.csv');
      const text = await response.text();
      const rows = text.split('\n').slice(1);
      
      const parsedDevices = rows.map(row => {
        const cols = row.split(',');
        return {
          ip: cols[0],
          manufacturer: cols[1],
          model: cols[2],
          firmware: cols[3],
          risk_level: cols[4],
          vulnerabilities: parseInt(cols[5]) || 0,
          cves: cols[6],
          latitude: parseFloat(cols[14]) || (Math.random() * 180 - 90),
          longitude: parseFloat(cols[15]) || (Math.random() * 360 - 180),
          country: cols[16] || 'Unknown',
          city: cols[17] || 'Unknown'
        };
      }).filter(d => d.ip && d.latitude && d.longitude);
      
      setDevices(parsedDevices);
      updateStats(parsedDevices);
      setLoading(false);
    } catch (error) {
      console.error('Error loading CSV:', error);
      setLoading(false);
    }
  };

  const updateStats = (deviceList) => {
    const stats = {
      total: deviceList.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCountry: {}
    };

    deviceList.forEach(device => {
      const risk = device.risk_level?.toUpperCase();
      if (risk === 'CRITICAL') stats.critical++;
      else if (risk === 'HIGH') stats.high++;
      else if (risk === 'MEDIUM') stats.medium++;
      else if (risk === 'LOW') stats.low++;

      const country = device.country || 'Unknown';
      stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
    });

    setStats(stats);
  };

  const filteredDevices = devices.filter(device => {
    if (filter === 'ALL') return true;
    return device.risk_level?.toUpperCase() === filter;
  });

  const topCountries = Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading global device map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🌍 Global CCTV Device Map</h1>
        <p className="text-gray-600">Real-time visualization of exposed CCTV cameras worldwide</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm mb-1">Total Devices</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-red-600 text-sm mb-1">Critical Risk</div>
          <div className="text-2xl font-bold text-red-700">{stats.critical.toLocaleString()}</div>
        </div>
        <div className="bg-orange-50 rounded-lg shadow p-4">
          <div className="text-orange-600 text-sm mb-1">High Risk</div>
          <div className="text-2xl font-bold text-orange-700">{stats.high.toLocaleString()}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-yellow-600 text-sm mb-1">Medium Risk</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.medium.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-blue-600 text-sm mb-1">Low Risk</div>
          <div className="text-2xl font-bold text-blue-700">{stats.low.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
            {/* Filter Buttons */}
            <div className="p-4 border-b bg-gray-50 flex gap-2">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter('CRITICAL')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Critical ({stats.critical})
              </button>
              <button
                onClick={() => setFilter('HIGH')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'HIGH'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                High ({stats.high})
              </button>
              <button
                onClick={() => setFilter('MEDIUM')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'MEDIUM'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Medium ({stats.medium})
              </button>
              <button
                onClick={() => setFilter('LOW')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'LOW'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Low ({stats.low})
              </button>
            </div>

            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: 'calc(100% - 68px)', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MarkerClusterGroup>
                {filteredDevices.map((device, index) => (
                  <Marker
                    key={`${device.ip}-${index}`}
                    position={[device.latitude, device.longitude]}
                    icon={getRiskIcon(device.risk_level?.toUpperCase())}
                  >
                    <Popup>
                      <div className="p-2" style={{ minWidth: '250px' }}>
                        <div className="font-bold text-lg mb-2 text-gray-900">
                          {device.manufacturer} {device.model}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-semibold text-gray-700">IP:</span>{' '}
                            <span className="text-gray-600">{device.ip}</span>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-gray-700">Location:</span>{' '}
                            <span className="text-gray-600">{device.city}, {device.country}</span>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-gray-700">Firmware:</span>{' '}
                            <span className="text-gray-600">{device.firmware}</span>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-gray-700">Risk Level:</span>{' '}
                            <span className={`font-bold ${
                              device.risk_level === 'CRITICAL' ? 'text-red-600' :
                              device.risk_level === 'HIGH' ? 'text-orange-600' :
                              device.risk_level === 'MEDIUM' ? 'text-yellow-600' :
                              'text-blue-600'
                            }`}>
                              {device.risk_level}
                            </span>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-gray-700">Vulnerabilities:</span>{' '}
                            <span className="text-red-600 font-semibold">{device.vulnerabilities}</span>
                          </div>
                          
                          {device.cves && (
                            <div>
                              <span className="font-semibold text-gray-700">CVEs:</span>{' '}
                              <span className="text-gray-600 text-xs">{device.cves}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                            Scan
                          </button>
                          <button className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                            Details
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          </div>
        </div>

        {/* Sidebar with Top Countries */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📍 Top Countries</h2>
            <div className="space-y-3">
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{country}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-3 text-sm font-bold text-gray-700">{count}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-700">Critical Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-xs text-gray-700">High Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-700">Medium Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-700">Low Risk</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={fetchDevices}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMapPage;
