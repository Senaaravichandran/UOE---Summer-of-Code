# EvaSafe CCTV Security Platform - Master Launcher
# BEAST MODE 🔥

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 99) -ForegroundColor Cyan
Write-Host "🔥 EvaSafe CCTV Security Platform - BEAST MODE" -ForegroundColor Yellow
Write-Host "   World-Class Vulnerability Assessment & Penetration Testing Framework" -ForegroundColor White
Write-Host ("=" * 100) -ForegroundColor Cyan

Write-Host "`n📋 Available Components:" -ForegroundColor Green
Write-Host "   1️⃣  Real-Time Network Scanner" -ForegroundColor White
Write-Host "   2️⃣  Shodan-Integrated Scanner" -ForegroundColor White
Write-Host "   3️⃣  Automated Penetration Testing" -ForegroundColor White
Write-Host "   4️⃣  ML Anomaly Detection" -ForegroundColor White
Write-Host "   5️⃣  Alert System" -ForegroundColor White
Write-Host "   6️⃣  Backend API Server (Flask + WebSocket)" -ForegroundColor White
Write-Host "   7️⃣  Frontend Dashboard (React + Vite)" -ForegroundColor White
Write-Host "   8️⃣  Full Stack (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "   9️⃣  Complete System Test" -ForegroundColor Yellow
Write-Host "   0️⃣  Exit" -ForegroundColor Red

Write-Host "`n" -NoNewline
$choice = Read-Host "Select component to run"

switch ($choice) {
    "1" {
        Write-Host "`n🔍 Starting Real-Time Network Scanner..." -ForegroundColor Cyan
        Write-Host "Target: 192.168.1.0/28 (first 16 IPs)" -ForegroundColor Gray
        python CCTV_Guard/backend/scanner/realtime_scanner.py
    }
    
    "2" {
        Write-Host "`n🌍 Starting Shodan-Integrated Scanner..." -ForegroundColor Cyan
        Write-Host "Searching for exposed CCTV cameras worldwide" -ForegroundColor Gray
        
        if (-not $env:SHODAN_API_KEY) {
            Write-Host "⚠️  No Shodan API key found. Running in simulation mode." -ForegroundColor Yellow
            Write-Host "   To use real Shodan data, set: `$env:SHODAN_API_KEY='your_key'" -ForegroundColor Gray
        }
        
        python CCTV_Guard/backend/scanner/shodan_scanner.py
    }
    
    "3" {
        Write-Host "`n⚔️  Starting Automated Penetration Testing..." -ForegroundColor Cyan
        Write-Host "Mode: SAFE (Simulation only, no actual exploits)" -ForegroundColor Green
        Write-Host "Devices: 50 from recommendations dataset" -ForegroundColor Gray
        python CCTV_Guard/backend/pt_engine/automated_pentest.py
    }
    
    "4" {
        Write-Host "`n🧠 Starting ML Anomaly Detection..." -ForegroundColor Cyan
        Write-Host "Algorithm: Isolation Forest" -ForegroundColor Gray
        Write-Host "Training: 900 samples | Testing: 200 samples" -ForegroundColor Gray
        python CCTV_Guard/ml/anomaly_detection.py
    }
    
    "5" {
        Write-Host "`n🚨 Starting Alert System..." -ForegroundColor Cyan
        Write-Host "Monitoring: 1,200 devices" -ForegroundColor Gray
        Write-Host "Rules: 10 intelligent alert rules" -ForegroundColor Gray
        python CCTV_Guard/backend/alert_engine/alert_engine.py
    }
    
    "6" {
        Write-Host "`n🚀 Starting Backend API Server..." -ForegroundColor Cyan
        Write-Host "HTTP API: http://localhost:5000" -ForegroundColor Green
        Write-Host "WebSocket: ws://localhost:5000/ws" -ForegroundColor Green
        Write-Host "`nAvailable Endpoints:" -ForegroundColor Yellow
        Write-Host "   GET  /api/health" -ForegroundColor Gray
        Write-Host "   POST /api/scan/start" -ForegroundColor Gray
        Write-Host "   POST /api/scan/shodan" -ForegroundColor Gray
        Write-Host "   POST /api/pentest/start" -ForegroundColor Gray
        Write-Host "   GET  /api/devices" -ForegroundColor Gray
        Write-Host "   GET  /api/alerts" -ForegroundColor Gray
        Write-Host "   GET  /api/stats" -ForegroundColor Gray
        Write-Host "`nPress Ctrl+C to stop`n" -ForegroundColor Yellow
        
        # Check if flask-sock is installed
        $flaskSock = python -c "import flask_sock; print('OK')" 2>$null
        if (-not $flaskSock) {
            Write-Host "⚠️  Installing required dependencies..." -ForegroundColor Yellow
            pip install flask flask-cors flask-sock simple-websocket
        }
        
        python CCTV_Guard/backend/app_realtime.py
    }
    
    "7" {
        Write-Host "`n🎨 Starting Frontend Dashboard..." -ForegroundColor Cyan
        Write-Host "Dashboard: http://localhost:5173" -ForegroundColor Green
        Write-Host "`nFeatures:" -ForegroundColor Yellow
        Write-Host "   📊 Real-time device monitoring" -ForegroundColor Gray
        Write-Host "   🗺️  Interactive world map" -ForegroundColor Gray
        Write-Host "   🔍 Live scanning progress" -ForegroundColor Gray
        Write-Host "   🚨 Alert management" -ForegroundColor Gray
        Write-Host "   💡 Security recommendations" -ForegroundColor Gray
        Write-Host "`nPress Ctrl+C to stop`n" -ForegroundColor Yellow
        
        Set-Location CCTV_Guard/frontend
        
        # Check if node_modules exists
        if (-not (Test-Path "node_modules")) {
            Write-Host "⚠️  Installing frontend dependencies..." -ForegroundColor Yellow
            npm install --legacy-peer-deps
        }
        
        npm run dev
    }
    
    "8" {
        Write-Host "`n🚀 Starting Full Stack Application..." -ForegroundColor Cyan
        Write-Host "`n📡 Backend will start on: http://localhost:5000" -ForegroundColor Green
        Write-Host "🎨 Frontend will start on: http://localhost:5173" -ForegroundColor Green
        Write-Host "`nPress Ctrl+C to stop both servers`n" -ForegroundColor Yellow
        
        # Install backend dependencies
        Write-Host "📦 Checking backend dependencies..." -ForegroundColor Yellow
        pip install -q flask flask-cors flask-sock simple-websocket pandas requests scikit-learn numpy joblib shodan 2>$null
        
        # Install frontend dependencies
        Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Yellow
        Set-Location CCTV_Guard/frontend
        if (-not (Test-Path "node_modules")) {
            npm install --legacy-peer-deps 2>$null
        }
        Set-Location ../..
        
        # Start backend in background
        Write-Host "`n🚀 Starting backend server..." -ForegroundColor Cyan
        $backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "python CCTV_Guard/backend/app_realtime.py" -PassThru
        
        Start-Sleep -Seconds 3
        
        # Start frontend
        Write-Host "🎨 Starting frontend dashboard..." -ForegroundColor Cyan
        Set-Location CCTV_Guard/frontend
        npm run dev
        
        # Cleanup on exit
        Write-Host "`n🛑 Shutting down servers..." -ForegroundColor Yellow
        Stop-Process -Id $backend.Id -Force
        Set-Location ../..
    }
    
    "9" {
        Write-Host "`n🧪 Running Complete System Test..." -ForegroundColor Cyan
        Write-Host "This will run all components sequentially`n" -ForegroundColor Gray
        
        # 1. ML Anomaly Detection
        Write-Host "`n[1/5] 🧠 ML Anomaly Detection..." -ForegroundColor Yellow
        python CCTV_Guard/ml/anomaly_detection.py
        Write-Host "✅ Anomaly detection complete" -ForegroundColor Green
        Start-Sleep -Seconds 2
        
        # 2. Penetration Testing
        Write-Host "`n[2/5] ⚔️  Penetration Testing..." -ForegroundColor Yellow
        python CCTV_Guard/backend/pt_engine/automated_pentest.py
        Write-Host "✅ Penetration testing complete" -ForegroundColor Green
        Start-Sleep -Seconds 2
        
        # 3. Alert System
        Write-Host "`n[3/5] 🚨 Alert System..." -ForegroundColor Yellow
        python CCTV_Guard/backend/alert_engine/alert_engine.py
        Write-Host "✅ Alert system complete" -ForegroundColor Green
        Start-Sleep -Seconds 2
        
        # 4. Check Output Files
        Write-Host "`n[4/5] 📄 Verifying Output Files..." -ForegroundColor Yellow
        
        $files = @(
            "CCTV_Guard/data/anomaly_detection_report.json",
            "CCTV_Guard/data/pentest_report.json",
            "CCTV_Guard/data/active_alerts.json",
            "CCTV_Guard/models/anomaly_detector.pkl"
        )
        
        foreach ($file in $files) {
            if (Test-Path $file) {
                $size = (Get-Item $file).Length
                Write-Host "   ✅ $file ($size bytes)" -ForegroundColor Green
            } else {
                Write-Host "   ❌ $file (missing)" -ForegroundColor Red
            }
        }
        
        # 5. Summary
        Write-Host "`n[5/5] 📊 Test Summary..." -ForegroundColor Yellow
        
        # Parse anomaly detection report
        if (Test-Path "CCTV_Guard/data/anomaly_detection_report.json") {
            $anomalyReport = Get-Content "CCTV_Guard/data/anomaly_detection_report.json" | ConvertFrom-Json
            Write-Host "`n🧠 Anomaly Detection Results:" -ForegroundColor Cyan
            Write-Host "   Total Anomalies: $($anomalyReport.summary.total_anomalies)" -ForegroundColor White
            Write-Host "   Critical: $($anomalyReport.summary.critical_anomalies)" -ForegroundColor Red
            Write-Host "   Confidence: $([math]::Round($anomalyReport.summary.avg_confidence, 2))%" -ForegroundColor White
        }
        
        # Parse pentest report
        if (Test-Path "CCTV_Guard/data/pentest_report.json") {
            $pentestReport = Get-Content "CCTV_Guard/data/pentest_report.json" | ConvertFrom-Json
            Write-Host "`n⚔️  Penetration Testing Results:" -ForegroundColor Cyan
            Write-Host "   Devices Tested: $($pentestReport.summary.devices_tested)" -ForegroundColor White
            Write-Host "   Successful Attacks: $($pentestReport.summary.successful_attacks)" -ForegroundColor White
            Write-Host "   Success Rate: $($pentestReport.summary.success_rate)%" -ForegroundColor White
            Write-Host "   High Risk: $($pentestReport.summary.high_risk_devices)" -ForegroundColor Red
        }
        
        # Parse alerts
        if (Test-Path "CCTV_Guard/data/active_alerts.json") {
            $alerts = Get-Content "CCTV_Guard/data/active_alerts.json" | ConvertFrom-Json
            $critical = ($alerts | Where-Object { $_.severity -eq "CRITICAL" }).Count
            $high = ($alerts | Where-Object { $_.severity -eq "HIGH" }).Count
            
            Write-Host "`n🚨 Alert System Results:" -ForegroundColor Cyan
            Write-Host "   Total Alerts: $($alerts.Count)" -ForegroundColor White
            Write-Host "   Critical: $critical" -ForegroundColor Red
            Write-Host "   High: $high" -ForegroundColor Orange
        }
        
        Write-Host "`n" -NoNewline
        Write-Host ("=" * 100) -ForegroundColor Cyan
        Write-Host "✅ COMPLETE SYSTEM TEST FINISHED" -ForegroundColor Green
        Write-Host ("=" * 100) -ForegroundColor Cyan
    }
    
    "0" {
        Write-Host "`n👋 Exiting EvaSafe Platform" -ForegroundColor Yellow
        exit
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please select 0-9." -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline
Read-Host "Press Enter to return to menu"

# Restart script
& $MyInvocation.MyCommand.Path
