# EvaSafe 🛡️
### Practical AI, Blockchain & Cybersecurity Empowering Surveillance System for Women's, Public Safety and Smart City Innovation

> *"Right now, as you read this — somewhere in a city, a crime is happening. EvaSafe exists so it doesn't go unanswered."*

---

## 📌 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Team](#team)
- [License](#license)

---

## Overview

**EvaSafe** is a next-generation smart public safety platform that transforms passive surveillance infrastructure into a proactive, AI-powered crime intelligence system. It combines real-time crime detection, blockchain-secured digital evidence, natural language video investigation, and continuous cybersecurity monitoring — all in one unified platform.

EvaSafe doesn't solve a single problem. It breaks the entire chain that lets crime win.

---

## Problem Statement

Public safety systems fail when surveillance is **reactive, insecure, and disconnected** from real-time intelligence and trusted digital evidence.

| Problem | Impact |
|---|---|
| 🔴 Reactive Monitoring | Passive CCTV causes delayed response as crimes continue to rise |
| 🔓 Cyber Vulnerability | Insecure cameras and DVRs are prone to attacks and misconfiguration |
| ⚖️ Weak Evidence Trust | Centralized storage enables tampering, slowing down investigations |
| 🔍 Slow Investigations | Evidence retrieval is manual, time-consuming, and unreliable |

---

## Solution

EvaSafe is built on **four pillars**:

1. **Detect** — AI analyzes live CCTV and acoustic feeds in real time to identify crimes and anomalies the moment they happen
2. **Alert** — Automated, instant alerts dispatched to law enforcement with crime footage, GPS location, and suspect visuals
3. **Secure** — All incident evidence is hash-locked on blockchain, making it tamper-proof and legally admissible
4. **Investigate** — Officers query footage in plain English via a RAG-powered chatbot, cutting investigation time drastically

---

## Key Features

### 🔴 Real-Time Crime Detection
- AI model analyzes live CCTV streams and acoustic sensor feeds simultaneously
- Detects crimes, anomalies, and suspicious behavior with **87% accuracy**
- Uses Google Cloud Video Intelligence API + MIST (Multiple Instance Self-Training) model

### 🚨 Instant Alert Mechanism
- Automated alerts sent immediately to nearby law enforcement
- Includes crime footage, GPS coordinates, and timestamp
- Activates the **6 nearest CCTV cameras** using Dijkstra's algorithm to prevent suspect escape

### 🔗 Blockchain-Secured Evidence Storage
- Every incident is immutably stored on-chain via Firebase + MetaMask
- Evidence is hash-locked, traceable, and legally admissible
- Eliminates tampering and ensures investigation reliability

### 🗣️ Natural Language Video Investigation
- BLIP (Bootstrapping Language-Image Pre-training) fine-tuned with LoRA captions every video frame with timestamps
- Gemini-powered RAG lets officers query footage in plain English
  - *Example: "Show me the red car near the market at 9 PM"*
- Drastically reduces investigation time

### 🛡️ AI-Driven Cybersecurity Layer
- Continuous automated scanning of CCTV/DVR infrastructure for CVEs and firmware vulnerabilities
- Detects insecure devices and misconfigurations before attackers exploit them
- Protects not just public spaces, but the surveillance infrastructure itself

### 📊 Unified Smart Dashboard
- Single dashboard for law enforcement with alerts, evidence, case management, and CCTV live view
- Contract Explorer for blockchain-based case tracking
- Case statistics and authority management built-in

---

## System Architecture

```
CCTV Live Stream
        │
        ▼
┌─────────────────────────────────────┐
│  Google Cloud Video Intelligence    │
│  + MIST Crime/Anomaly Model         │
└─────────────────┬───────────────────┘
                  │
         Crime Detected?
         /            \
       No              Yes
       │                │
  Monitor           ┌───┴──────────────────────┐
  Continue          │  Blockchain + Firebase    │
                    │  (Tamper-proof Evidence)  │
                    └───────────────────────────┘
                         │
                    Alert Dispatched
                    to Authorities
                         │
              ┌──────────┴────────────┐
              │   RAG Investigation   │
              │   (Gemini API + BLIP) │
              └───────────────────────┘
                         │
              ┌──────────┴────────────┐
              │   AI Cybersecurity    │
              │   Layer (CVE Scan)    │
              └───────────────────────┘

Acoustic Anomaly Detection PCB → MongoDB → HTTP Protocol → Dashboard
```

**BLIP Architecture for Video Search:**
- Frame-level captioning with timestamps for every CCTV clip
- Vision Language Model (VLM) for text extraction from video
- LoRA fine-tuning on custom surveillance dataset
- Gemini RAG pipeline for natural language querying

---

## Tech Stack

### Languages
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### AI & ML
| Technology | Purpose |
|---|---|
| Google Cloud Video Intelligence API | Live CCTV crime detection |
| MIST Model | Anomaly & crime prediction |
| BLIP (VLM) + LoRA Fine-tuning | Frame captioning & video understanding |
| HuggingFace | Model hosting & inference |
| PyTorch | Deep learning backbone |
| LangChain / LlamaIndex | RAG pipeline orchestration |
| Google Gemini API | Natural language video querying |

### Google Technologies
- Firestore & Firebase Realtime Database
- Google Cloud Video Intelligence API
- Google Maps API & Google Maps Flutter
- Google OR-Tools (route optimization)
- Google Gemini API
- Firebase Storage

### Blockchain & Web3
- Blockchain (on-chain evidence storage)
- MetaMask (wallet & transaction signing)
- Pinata Cloud (IPFS decentralized storage)

### Frameworks & Tools
- Flask, ReactJS, ExpressJS, NodeJS, Flutter
- Docker, Jenkins, Prometheus
- MongoDB, Firebase, Firestore

### Cybersecurity
- Automated CVE Scanning
- DVR & CCTV Firmware Vulnerability Detection
- Continuous Infrastructure Health Monitoring

---

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Flutter SDK
- Docker
- Firebase account
- Google Cloud account with Video Intelligence API enabled
- MetaMask wallet

### Clone the Repository
```bash
git clone https://github.com/Senaaravichandran/EvaSafe.git
cd EvaSafe
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:
```env
GOOGLE_CLOUD_API_KEY=your_key
GEMINI_API_KEY=your_key
FIREBASE_CONFIG=your_config
MONGODB_URI=your_mongodb_uri
BLOCKCHAIN_RPC_URL=your_rpc_url
```

Run the Flask server:
```bash
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Flutter Mobile App
```bash
cd mobile
flutter pub get
flutter run
```

### Docker (Full Stack)
```bash
docker-compose up --build
```

---

## Usage

1. **Dashboard** — Log in to the EvaSafe police dashboard to monitor live alerts, CCTV feeds, and case statistics
2. **Query Retriever** — Type a natural language query like *"Show suspicious activity near Gate 3 at 8 PM"* and get instant results
3. **Evidence Management** — All incidents are auto-logged with blockchain hash for tamper-proof storage
4. **Cybersecurity Panel** — View real-time CVE alerts and vulnerability reports for your CCTV/DVR infrastructure
5. **Case Management** — Create, manage, and track cases with the Contract Explorer powered by blockchain

---

## Impact

| Metric | Value |
|---|---|
| Crime Detection Accuracy | 87% |
| AI Security Guard Attack Prediction | 98.33% |
| Audio Denoising Pipeline Improvement | 92% |
| Evidence Tamper Risk | 0% (Blockchain) |

---

## Team

**Team Name: DRAGORITHM**

| Name | Role |
|---|---|
| Senaaravichandran A | Team Lead & AI/ML Engineer |

📧 senaaravichandran@gmail.com
🔗 [LinkedIn](https://linkedin.com/in/senaa2407)
🐙 [GitHub](https://github.com/Senaaravichandran)

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

---

<div align="center">

**EvaSafe — Because every second counts.**

*Built with purpose. Powered by AI. Secured by Blockchain.*

</div>
