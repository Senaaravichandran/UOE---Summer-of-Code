const BASE_URL = "http://127.0.0.1:5001";

// Load stats
fetch(`${BASE_URL}/api/stats`)
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(data => {
        document.getElementById("total").innerText = data.total_devices;
        document.getElementById("high").innerText = data.high_risk;
        document.getElementById("medium").innerText = data.medium_risk;
        document.getElementById("low").innerText = data.low_risk;
    })
    .catch(error => {
        console.error('Error loading stats:', error);
        alert('Failed to load statistics. Make sure the backend server is running.');
    });

// Load scan results
fetch(`${BASE_URL}/api/scan-results`)
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(data => {
        const tbody = document.querySelector("#deviceTable tbody");

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No devices found. Run the scan engine first.</td></tr>';
            return;
        }

        data.forEach(device => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${device.device_id}</td>
                <td>${device.manufacturer}</td>
                <td>${device.model}</td>
                <td>${device.vulnerability}</td>
                <td>${device.priority}</td>
                <td>${device.recommended_actions}</td>
            `;

            tbody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error loading scan results:', error);
        alert('Failed to load scan results. Make sure the backend server is running.');
    });
