const BASE_URL = "http://127.0.0.1:5000";

let allData = [];
let currentTab = 'devices';
let map; // Google Map instance
let markers = []; // Map markers
let chartsLoaded = false; // Track if Google Charts is ready

// Load Google Charts
google.charts.load('current', {'packages':['corechart', 'bar']});
google.charts.setOnLoadCallback(function() {
    chartsLoaded = true;
    console.log('Google Charts loaded');
});

// ====================
// Initialize Dashboard
// ====================
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadVendors();
    loadData();
    updateLastScanTime();
    
    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(initializeMap, 500);
});

// ====================
// Load Statistics
// ====================
function loadStats() {
    console.log('Loading stats from:', `${BASE_URL}/api/stats`);
    fetch(`${BASE_URL}/api/stats`)
        .then(res => {
            console.log('Stats response status:', res.status, res.ok);
            if (!res.ok) {
                return res.text().then(text => {
                    console.error('Stats error response:', text);
                    throw new Error(`HTTP error! status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('Stats data received:', data);
            document.getElementById("stat-critical").innerText = data.critical_risk || 0;
            document.getElementById("stat-high").innerText = data.high_risk || 0;
            document.getElementById("stat-moderate").innerText = data.moderate_risk || 0;
            document.getElementById("stat-total").innerText = data.total_devices || 0;
            document.getElementById("stat-vendors").innerText = data.vendors || 0;
            document.getElementById("stat-vulnerabilities").innerText = data.total_vulnerabilities || 0;
        })
        .catch(error => {
            console.error('Error loading stats:', error);
            console.error('Is backend running at', BASE_URL, '?');
            showNotification('Failed to load statistics. Check console for details.', 'error');
        });
}

// ====================
// Load All Data
// ====================
function loadData() {
    console.log('Loading scan results from:', `${BASE_URL}/api/scan-results`);
    fetch(`${BASE_URL}/api/scan-results`)
        .then(res => {
            console.log('Scan results response status:', res.status, res.ok);
            if (!res.ok) {
                return res.text().then(text => {
                    console.error('Scan results error response:', text);
                    throw new Error(`HTTP error! status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('Scan results data received, count:', Array.isArray(data) ? data.length : 'not an array');
            allData = data;
            renderDevicesTable(data);
            renderVulnerabilitiesTable(data);
            renderAttacksTable(data);
            renderGeographicView(data);
            populateRegionFilter(data);
            
            // Render Google Charts when ready
            if (chartsLoaded) {
                console.log('Rendering charts with data:', data.length);
                renderRiskPieChart(data);
                renderVendorBarChart(data);
            } else {
                // Wait for charts to load
                google.charts.setOnLoadCallback(function() {
                    console.log('Charts loaded, now rendering with data:', data.length);
                    renderRiskPieChart(data);
                    renderVendorBarChart(data);
                });
            }
            
            updateMapMarkers(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            console.error('Is backend running at', BASE_URL, '?');
            showNotification('Failed to load device data. Check console for details.', 'error');
        });
}

// ====================
// Load Vendors for Filter
// ====================
function loadVendors() {
    fetch(`${BASE_URL}/api/vendors`)
        .then(res => res.json())
        .then(vendors => {
            const select = document.getElementById('filter-vendor');
            vendors.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor;
                option.textContent = vendor;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading vendors:', error));
}

// ====================
// Populate Region Filter
// ====================
function populateRegionFilter(data) {
    const regions = [...new Set(data.map(d => d.region).filter(r => r))];
    const select = document.getElementById('filter-region');
    
    // Clear existing options except first
    select.innerHTML = '<option value="">All Regions</option>';
    
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        select.appendChild(option);
    });
}

// ====================
// Render Devices Table
// ====================
function renderDevicesTable(data) {
    const tbody = document.getElementById('devices-tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No devices found. Run a scan first.</td></tr>';
        return;
    }

    data.forEach(device => {
        const row = document.createElement('tr');
        row.className = `priority-${device.priority?.toLowerCase()}`;
        
        row.innerHTML = `
            <td>${device.device_id}</td>
            <td>${device.manufacturer}</td>
            <td>${device.model}</td>
            <td>${device.firmware_version || 'N/A'}</td>
            <td>${device.region || 'N/A'}</td>
            <td>${device.vulnerability}</td>
            <td><span class="badge badge-${device.ml_risk_level?.toLowerCase()}">${device.ml_risk_level || 'N/A'}</span></td>
            <td><span class="badge badge-${device.priority?.toLowerCase()}">${device.priority}</span></td>
            <td>
                <button class="btn-icon" onclick="showDeviceDetails(${device.device_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ====================
// Render Vulnerabilities Table
// ====================
function renderVulnerabilitiesTable(data) {
    const tbody = document.getElementById('vulnerabilities-tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No vulnerabilities found.</td></tr>';
        return;
    }

    data.forEach(device => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${device.device_id}</td>
            <td>${device.manufacturer}</td>
            <td>${device.model}</td>
            <td>${device.vulnerability}</td>
            <td><span class="cve-badge">${device.cve_id || 'N/A'}</span></td>
            <td><span class="badge badge-${device.cve_severity?.toLowerCase()}">${device.cve_severity || 'N/A'}</span></td>
            <td class="text-small">${device.cve_description || 'No description available'}</td>
            <td class="text-small">${device.recommended_actions || 'N/A'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// ====================
// Render Attack Scenarios Table
// ====================
function renderAttacksTable(data) {
    const tbody = document.getElementById('attacks-tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No attack scenarios found.</td></tr>';
        return;
    }

    data.forEach(device => {
        if (!device.attack_name) return;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${device.device_id}</td>
            <td>${device.manufacturer}</td>
            <td>${device.attack_name}</td>
            <td><span class="cve-badge">${device.cve_id || 'N/A'}</span></td>
            <td class="text-small">${device.attack_steps || 'N/A'}</td>
            <td><span class="badge badge-impact">${device.impact || 'N/A'}</span></td>
            <td><span class="badge badge-${device.likelihood?.toLowerCase()}">${device.likelihood || 'N/A'}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// ====================
// Render Geographic View
// ====================
function renderGeographicView(data) {
    const container = document.getElementById('geo-chart');
    container.innerHTML = '';

    // Group by region and exposure level
    const regionData = {};
    
    data.forEach(device => {
        if (!device.region) return;
        
        if (!regionData[device.region]) {
            regionData[device.region] = {
                total: 0,
                high: 0,
                medium: 0,
                low: 0
            };
        }
        
        regionData[device.region].total++;
        
        if (device.exposure_level === 'high') regionData[device.region].high++;
        else if (device.exposure_level === 'medium') regionData[device.region].medium++;
        else if (device.exposure_level === 'low') regionData[device.region].low++;
    });

    // Create visual representation
    Object.keys(regionData).forEach(region => {
        const stats = regionData[region];
        
        const regionCard = document.createElement('div');
        regionCard.className = 'geo-card';
        regionCard.innerHTML = `
            <div class="geo-header">
                <h3><i class="fas fa-map-marker-alt"></i> ${region}</h3>
                <span class="geo-total">${stats.total} devices</span>
            </div>
            <div class="geo-stats">
                <div class="geo-stat high">
                    <span class="geo-count">${stats.high}</span>
                    <span class="geo-label">High Risk</span>
                </div>
                <div class="geo-stat medium">
                    <span class="geo-count">${stats.medium}</span>
                    <span class="geo-label">Medium Risk</span>
                </div>
                <div class="geo-stat low">
                    <span class="geo-count">${stats.low}</span>
                    <span class="geo-label">Low Risk</span>
                </div>
            </div>
        `;
        
        container.appendChild(regionCard);
    });
}

// ====================
// Tab Switching
// ====================
function switchTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.closest('.tab').classList.add('active');

    // Update tab panes
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    currentTab = tabName;
}

// ====================
// Apply Filters
// ====================
function applyFilters() {
    const vendor = document.getElementById('filter-vendor').value;
    const priority = document.getElementById('filter-priority').value;
    const region = document.getElementById('filter-region').value;

    let filtered = allData;

    if (vendor) {
        filtered = filtered.filter(d => d.manufacturer === vendor);
    }
    if (priority) {
        filtered = filtered.filter(d => d.priority === priority);
    }
    if (region) {
        filtered = filtered.filter(d => d.region === region);
    }

    renderDevicesTable(filtered);
    renderVulnerabilitiesTable(filtered);
    renderAttacksTable(filtered);
}

// ====================
// Clear Filters
// ====================
function clearFilters() {
    document.getElementById('filter-vendor').value = '';
    document.getElementById('filter-priority').value = '';
    document.getElementById('filter-region').value = '';
    
    renderDevicesTable(allData);
    renderVulnerabilitiesTable(allData);
    renderAttacksTable(allData);
}

// ====================
// Show Device Details
// ====================
function showDeviceDetails(deviceId) {
    console.log('Fetching details for device:', deviceId);
    fetch(`${BASE_URL}/api/device/${deviceId}`)
        .then(res => {
            console.log('Device details response status:', res.status);
            if (!res.ok) {
                return res.json().then(err => {
                    throw new Error(err.error || `HTTP error ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('Device details received:', data);
            const modalBody = document.getElementById('modal-body');
            const device = data.device_info;
            const vulnerabilities = data.vulnerabilities || [];
            const attacks = data.attack_scenarios || [];

            modalBody.innerHTML = `
                <div class="device-details">
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                        <div class="detail-grid">
                            <div><strong>Device ID:</strong> ${device.device_id}</div>
                            <div><strong>Manufacturer:</strong> ${device.manufacturer}</div>
                            <div><strong>Model:</strong> ${device.model}</div>
                            <div><strong>Firmware:</strong> ${device.firmware_version || 'N/A'}</div>
                            <div><strong>Type:</strong> ${device.device_type || 'N/A'}</div>
                            <div><strong>Region:</strong> ${device.region || 'N/A'}</div>
                            <div><strong>IP Environment:</strong> ${device.ip_environment || 'N/A'}</div>
                            <div><strong>Open Ports:</strong> ${device.open_ports || 'N/A'}</div>
                            <div><strong>Protocols:</strong> ${device.protocols || 'N/A'}</div>
                            <div><strong>Authentication:</strong> ${device.authentication || 'N/A'}</div>
                            <div><strong>Encryption:</strong> ${device.encryption || 'N/A'}</div>
                            <div><strong>RTSP Enabled:</strong> ${device.rtsp_enabled ? 'Yes' : 'No'}</div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3><i class="fas fa-bug"></i> Vulnerabilities (${vulnerabilities.length})</h3>
                        ${vulnerabilities.length > 0 ? vulnerabilities.map(v => `
                            <div class="vuln-card">
                                <div class="vuln-header">
                                    <span class="vuln-name">${v.vulnerability || 'Unknown'}</span>
                                    <span class="badge badge-${v.severity?.toLowerCase() || 'low'}">${v.severity || 'N/A'}</span>
                                </div>
                                <div class="vuln-cve"><strong>CVE:</strong> ${v.cve_id || 'N/A'}</div>
                                <div class="vuln-desc">${v.cve_description || 'No description available'}</div>
                            </div>
                        `).join('') : '<p>No vulnerabilities found for this device.</p>'}
                    </div>

                    <div class="detail-section">
                        <h3><i class="fas fa-crosshairs"></i> Attack Scenarios (${attacks.length})</h3>
                        ${attacks.length > 0 ? attacks.map(a => `
                            <div class="attack-card">
                                <div class="attack-header">
                                    <span class="attack-name">${a.attack_name || 'Unknown Attack'}</span>
                                    <span class="badge badge-${a.likelihood?.toLowerCase() || 'low'}">${a.likelihood || 'N/A'} Likelihood</span>
                                </div>
                                <div class="attack-steps">
                                    <strong>Steps:</strong>
                                    <ol>
                                        ${(a.attack_steps || '').split(' -> ').map(step => step ? `<li>${step}</li>` : '').join('')}
                                    </ol>
                                </div>
                                <div class="attack-impact"><strong>Impact:</strong> ${a.impact || 'N/A'}</div>
                            </div>
                        `).join('') : '<p>No attack scenarios identified for this device.</p>'}
                    </div>

                    <div class="detail-section">
                        <h3><i class="fas fa-shield-alt"></i> Recommendations</h3>
                        <div class="recommendations">
                            ${device.recommended_actions ? device.recommended_actions.split(' | ').map(r => `
                                <div class="recommendation-item">
                                    <i class="fas fa-check-circle"></i> ${r}
                                </div>
                            `).join('') : '<p>No recommendations available</p>'}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('device-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading device details:', error);
            showNotification(`Failed to load device details: ${error.message}`, 'error');
        });
}

// ====================
// Modal Functions
// ====================
function closeModal() {
    document.getElementById('device-modal').style.display = 'none';
}

function showScanConfig() {
    document.getElementById('scan-modal').style.display = 'block';
}

function closeScanModal() {
    document.getElementById('scan-modal').style.display = 'none';
}

// ====================
// Run Scan
// ====================
function runScan() {
    const ipRange = document.getElementById('scan-ip-range').value || '192.168.1.0/24';
    const vendor = document.getElementById('scan-vendor').value || 'Hikvision';
    const deviceType = document.getElementById('scan-device-type').value || 'Camera';
    
    console.log('Scan parameters:', { ipRange, vendor, deviceType }); // Debug log

    showNotification('Starting scan pipeline... This may take a few minutes', 'info');
    closeScanModal();

    // Call backend to execute the scan pipeline
    fetch(`${BASE_URL}/api/run-scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ip_range: ipRange,
            vendor: vendor,
            device_type: deviceType
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log('Scan response:', data); // Debug log
        if (data.status === 'success') {
            showNotification('Scan completed successfully! Refreshing data...', 'success');
            console.log('Pipeline output:', data.output); // Debug log
            
            // Store scan completion time
            localStorage.setItem('lastScanTime', new Date().toISOString());
            
            // Refresh the dashboard data with a longer delay to ensure files are written
            setTimeout(() => {
                refreshData();
                updateLastScanTime();
            }, 2000);
        } else {
            showNotification('Scan failed: ' + data.message, 'error');
            console.error('Scan error details:', data);
            // Show detailed error in console for debugging
            if (data.error) console.error('Error output:', data.error);
            if (data.stdout) console.log('Standard output:', data.stdout);
        }
    })
    .catch(error => {
        console.error('Error running scan:', error);
        showNotification('Failed to execute scan. Check backend connection.', 'error');
    });
}

// ====================
// Export Data
// ====================
function exportData() {
    const csv = convertToCSV(allData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cctv_scan_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully', 'success');
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','));
    
    return [headers.join(','), ...rows].join('\n');
}

// ====================
// Refresh Data
// ====================
function refreshData() {
    console.log('Refreshing data...'); // Debug log
    showNotification('Refreshing data...', 'info');
    
    // Force reload by clearing cache
    Promise.all([
        fetch(`${BASE_URL}/api/stats?t=${Date.now()}`).catch(err => {
            console.error('Stats fetch error:', err);
            return { ok: false, error: err };
        }),
        fetch(`${BASE_URL}/api/scan-results?t=${Date.now()}`).catch(err => {
            console.error('Scan results fetch error:', err);
            return { ok: false, error: err };
        })
    ]).then(([statsRes, dataRes]) => {
        console.log('Stats response:', statsRes.ok, statsRes.status);
        console.log('Data response:', dataRes.ok, dataRes.status);
        
        if (!statsRes.ok || !dataRes.ok) {
            throw new Error(`API error - Stats: ${statsRes.status}, Data: ${dataRes.status}`);
        }
        return Promise.all([statsRes.json(), dataRes.json()]);
    }).then(([statsData, scanData]) => {
        console.log('Received stats:', statsData); // Debug log
        console.log('Received scan data count:', Array.isArray(scanData) ? scanData.length : 'Not an array'); // Debug log
        
        // Handle case where scanData might not be an array
        if (!Array.isArray(scanData)) {
            console.error('Scan data is not an array:', scanData);
            scanData = [];
        }
        
        // Update stats
        document.getElementById("stat-critical").innerText = statsData.critical_risk || 0;
        document.getElementById("stat-high").innerText = statsData.high_risk || 0;
        document.getElementById("stat-moderate").innerText = statsData.moderate_risk || 0;
        document.getElementById("stat-total").innerText = statsData.total_devices || 0;
        document.getElementById("stat-vendors").innerText = statsData.vendors || 0;
        document.getElementById("stat-vulnerabilities").innerText = statsData.total_vulnerabilities || 0;
        
        // Update tables
        allData = scanData;
        renderDevicesTable(scanData);
        renderVulnerabilitiesTable(scanData);
        renderAttacksTable(scanData);
        renderGeographicView(scanData);
        populateRegionFilter(scanData);
        
        // Update charts
        if (chartsLoaded) {
            renderRiskPieChart(scanData);
            renderVendorBarChart(scanData);
        } else {
            google.charts.setOnLoadCallback(function() {
                renderRiskPieChart(scanData);
                renderVendorBarChart(scanData);
            });
        }
        updateMapMarkers(scanData);
        
        showNotification('Data refreshed successfully', 'success');
    }).catch(error => {
        console.error('Error refreshing data:', error);
        console.error('Error stack:', error.stack);
        showNotification('Failed to refresh data: ' + error.message, 'error');
    });
}

// ====================
// Notification System
// ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ====================
// Update Last Scan Time
// ====================
function updateLastScanTime() {
    const lastScanTime = localStorage.getItem('lastScanTime');
    const timestampElement = document.getElementById('scan-timestamp');
    
    if (lastScanTime) {
        const scanDate = new Date(lastScanTime);
        const now = new Date();
        const diffMs = now - scanDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        let timeAgo;
        if (diffMins < 1) {
            timeAgo = 'Just now';
        } else if (diffMins < 60) {
            timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
        
        timestampElement.textContent = timeAgo;
        timestampElement.title = scanDate.toLocaleString();
    } else {
        timestampElement.textContent = 'Never';
    }
}

// ====================
// Close modals when clicking outside
// ====================
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ====================
// Google Charts - Risk Pie Chart
// ====================
function renderRiskPieChart(data) {
    console.log('renderRiskPieChart called with data:', data ? data.length : 0);
    if (!data || data.length === 0) {
        console.log('No data for pie chart');
        document.getElementById('risk-pie-chart').innerHTML = '<p style="text-align: center; padding: 50px;">No data available</p>';
        return;
    }
    
    try {
        // Count by priority
        const riskCounts = {
            'Critical': 0,
            'High': 0,
            'Moderate': 0,
            'Low': 0
        };
        
        data.forEach(device => {
            const priority = device.priority || 'Low';
            if (riskCounts.hasOwnProperty(priority)) {
                riskCounts[priority]++;
            }
        });
        
        console.log('Risk counts:', riskCounts);
        
        const chartData = google.visualization.arrayToDataTable([
            ['Risk Level', 'Count'],
            ['Critical', riskCounts.Critical],
            ['High', riskCounts.High],
            ['Moderate', riskCounts.Moderate],
            ['Low', riskCounts.Low]
        ]);
        
        const options = {
            title: 'Device Risk Distribution',
            pieHole: 0.4,
            colors: ['#dc3545', '#fd7e14', '#ffc107', '#28a745'],
            chartArea: {width: '90%', height: '80%'},
            legend: {position: 'bottom'}
        };
        
        const chart = new google.visualization.PieChart(document.getElementById('risk-pie-chart'));
        chart.draw(chartData, options);
        console.log('Pie chart rendered successfully');
    } catch (error) {
        console.error('Error rendering pie chart:', error);
    }
}

// ====================
// Google Charts - Vendor Bar Chart
// ====================
function renderVendorBarChart(data) {
    console.log('renderVendorBarChart called with data:', data ? data.length : 0);
    if (!data || data.length === 0) {
        console.log('No data for bar chart');
        document.getElementById('vendor-bar-chart').innerHTML = '<p style="text-align: center; padding: 50px;">No data available</p>';
        return;
    }
    
    try {
        // Count by vendor
        const vendorCounts = {};
        data.forEach(device => {
            const vendor = device.manufacturer || 'Unknown';
            vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
        });
        
        console.log('Vendor counts:', vendorCounts);
        
        const chartData = [['Vendor', 'Devices']];
        Object.keys(vendorCounts).forEach(vendor => {
            chartData.push([vendor, vendorCounts[vendor]]);
        });
        
        const dataTable = google.visualization.arrayToDataTable(chartData);
        
        const options = {
            title: 'Devices by Vendor',
            chartArea: {width: '70%', height: '70%'},
            colors: ['#6f42c1'],
            hAxis: {
                title: 'Number of Devices',
                minValue: 0
            },
            vAxis: {
                title: 'Vendor'
            },
            legend: {position: 'none'}
        };
        
        const chart = new google.visualization.BarChart(document.getElementById('vendor-bar-chart'));
        chart.draw(dataTable, options);
        console.log('Bar chart rendered successfully');
    } catch (error) {
        console.error('Error rendering bar chart:', error);
    }
}

// ====================
// Google Maps - Initialize
// ====================
function initializeMap() {
    const mapOptions = {
        zoom: 2,
        center: { lat: 20, lng: 0 },
        mapTypeId: 'roadmap',
        styles: [
            {
                featureType: 'all',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
            }
        ]
    };
    
    map = new google.maps.Map(document.getElementById('google-map'), mapOptions);
}

// ====================
// Google Maps - Update Markers
// ====================
function updateMapMarkers(data) {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // Region coordinates (approximate)
    const regionCoords = {
        'Asia': { lat: 34.0479, lng: 100.6197 },
        'Europe': { lat: 50.1109, lng: 8.6821 },
        'North America': { lat: 37.0902, lng: -95.7129 },
        'South America': { lat: -8.7832, lng: -55.4915 },
        'Africa': { lat: -8.7832, lng: 34.5085 },
        'Oceania': { lat: -25.2744, lng: 133.7751 }
    };
    
    // Group devices by region
    const regionGroups = {};
    data.forEach(device => {
        const region = device.region || 'Unknown';
        if (!regionGroups[region]) {
            regionGroups[region] = [];
        }
        regionGroups[region].push(device);
    });
    
    // Create markers for each region
    Object.keys(regionGroups).forEach(region => {
        if (regionCoords[region]) {
            const devices = regionGroups[region];
            const criticalCount = devices.filter(d => d.priority === 'Critical').length;
            const highCount = devices.filter(d => d.priority === 'High').length;
            
            const marker = new google.maps.Marker({
                position: regionCoords[region],
                map: map,
                title: `${region}: ${devices.length} devices`,
                label: {
                    text: String(devices.length),
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: criticalCount > 0 ? 15 : highCount > 0 ? 12 : 10,
                    fillColor: criticalCount > 0 ? '#dc3545' : highCount > 0 ? '#fd7e14' : '#28a745',
                    fillOpacity: 0.8,
                    strokeColor: 'white',
                    strokeWeight: 2
                }
            });
            
            // Info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px;">
                        <h4 style="margin: 0 0 10px 0;">${region}</h4>
                        <p style="margin: 5px 0;"><strong>Total Devices:</strong> ${devices.length}</p>
                        <p style="margin: 5px 0;"><strong>Critical:</strong> ${criticalCount}</p>
                        <p style="margin: 5px 0;"><strong>High Risk:</strong> ${highCount}</p>
                    </div>
                `
            });
            
            marker.addListener('click', function() {
                infoWindow.open(map, marker);
            });
            
            markers.push(marker);
        }
    });
}


