# 🛡️ HeatGuard Sentinel
> **Autonomous Heat Intelligence & Worker Safety Platform**  
> Powered by **FortyGuard Thermal APIs**, **OSHA Compliance Standards**, and **Groq LLaMA 3.3 Autonomous Agent Escalation**.

---

## 📌 Overview

**HeatGuard Sentinel** is an enterprise-grade thermal intelligence and outdoor worker safety platform built for the **FortyGuard Hackathon**. It continuously monitors outdoor work zones (construction corridors, industrial yards, agricultural fields), analyzes hyper-local microclimates, predicts heat stress exceedance, and autonomously triggers field-ready safety interventions and manager email notifications before heat illnesses occur.

### 🌟 Key Highlights
- **🛰️ Hyper-Local Thermal Intelligence:** Directly taps FortyGuard's surface and ambient temperature APIs to capture true microclimate heat island effects.
- **⚡ Autonomous Escalation Agent:** Evaluates real-time apparent temperature against OSHA heat index thresholds and custom supervisor limits.
- **🤖 Groq LLM Field Briefings:** Generates immediate, role-specific, plain-language mitigation actions (e.g. mandatory shade breaks, hydration ratios, PPE adjustments) powered by LLaMA 3.3.
- **📬 Instant SMTP Dispatch:** Automatically delivers emergency alert emails with live thermal readings and actionable guidance to site supervisors.
- **🗺️ Interactive Map & Address Geocoding:** Search any US address or click to pin custom coordinates with automated US bounding-box validation (`isWithinUSA`).
- **📊 3-Day Thermal Trend & Shift Planning:** Computes historical danger exceedance, persistence, and recommends the safest operational shift windows.
- **📜 Server-Persisted Alert Audit Log:** Real-time slide-in sidebar log (`data/logs/alerts.jsonl`) tracking all fired alerts across monitored enterprise sites.

---

## 🏗️ Architecture

```
                                  ┌───────────────────────────────┐
                                  │      FortyGuard APIs          │
                                  │  - Surface & Ambient Temp     │
                                  │  - Urban Landcover Metrics    │
                                  └──────────────┬────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────┐          ┌───────────────────────────┐          ┌───────────────────────────┐
│     React Frontend      │  HTTP    │    FastAPI Backend        │  LLM     │       Groq API            │
│  - Leaflet Map          ├─────────►│  - Zone Endpoints         ├─────────►│  - LLaMA 3.3 70B          │
│  - Address Search / Pin │          │  - Site Check & Reports   │          │  - Contextual Field Brief │
│  - Alert Log Sidebar    │◄─────────┤  - Cache & Logging        │◄─────────┤  - Actionable Guidance    │
└─────────────────────────┘          └───────────┬───────────────┘          └───────────────────────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────────┐
                                     │  Autonomous Email Alert   │
                                     │  - SMTP Gmail Dispatch    │
                                     │  - Real-time Supervisor   │
                                     └───────────────────────────┘
```

---

## 📂 Project Structure

```bash
heatguard-sentinel/
├── agent/                         # Autonomous Sentinel agent pipeline
│   ├── escalation.py              # Risk decision matrix & threshold evaluation
│   ├── llm_phrasing.py            # Groq LLaMA 3.3 prompt & guidance generator
│   ├── monitor.py                 # Live site polling & evaluation runner
│   └── notifier.py                # SMTP email dispatcher with HTML alerts
│
├── api/                           # FastAPI backend service
│   ├── main.py                    # App entry point & CORS configuration
│   ├── models/                    # Pydantic schemas (PinnedLocation, etc.)
│   └── routes/
│       └── zones.py               # REST endpoints for zones, checks, reports, alerts
│
├── config/                        # Static zone & compliance configuration
│   ├── zones.json                 # Pre-configured monitored demo zones
│   ├── multi_zones.json           # Multi-corridor coordinate catalog
│   └── osha_thresholds.json       # OSHA Heat Index trigger levels (°C)
│
├── data/
│   └── logs/
│       └── alerts.jsonl           # Server-persisted JSONL alert history
│
├── fortyguard/                    # Official FortyGuard API Client wrapper
│   ├── client.py                  # API endpoints, authentication, and error handling
│   ├── exceptions.py              # Custom API exceptions
│   └── samples.py                 # Sample responses for testing & fallbacks
│
├── frontend/                      # Modern React + Vite + TypeScript web console
│   ├── src/
│   │   ├── components/
│   │   │   ├── alerts/            # AlertsSidebar slide-in panel & AlertCenter
│   │   │   ├── map/               # ZoneSelectionMap & Leaflet visual layers
│   │   │   └── reports/           # SiteIntelligencePanel, Timeline, DecisionCard
│   │   ├── hooks/                 # Custom React hooks (useSiteReport, etc.)
│   │   ├── services/              # API client (apiClient.ts)
│   │   ├── utils/                 # Geocoding & geo distance algorithms (geo.ts)
│   │   └── pages/                 # DashboardPage.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── insights/                      # Historical intelligence & microclimate analytics
│   ├── historical.py              # FortyGuard historical timeseries fetching
│   ├── landcover.py               # Surface material & heat retention breakdown
│   ├── recommender.py             # Safest shift window & daily heat profile algorithms
│   ├── risk_scoring.py            # Exceedance & persistence calculation
│   ├── schema_cache.py            # Local cache layer to optimize API consumption
│   └── site_report.py             # 3-Day holistic site intelligence report generator
│
├── .env.example                   # Environment variable template
├── requirements.txt               # Backend Python dependencies
└── README.md                      # Project documentation
```

---

## 🔌 API Reference

The FastAPI service exposes the following endpoints at `http://localhost:8000`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/zones` | Lists all monitored enterprise zones with coordinates and metadata. |
| `POST` | `/zones/{zone_id}/check` | Executes a real-time risk check on a zone. Triggers LLM explanation + email alert if threshold is exceeded. Supports live checks or simulation mode (`simulate_temp_c`). |
| `GET` | `/zones/{zone_id}/report` | Returns the 3-day thermal pattern, exceedance, persistence, and safest operational shift window for a pre-loaded zone. |
| `POST` | `/zones/report` | Generates a 3-day report on-the-fly for any **custom pinned GPS coordinate** (`PinnedLocation`). |
| `GET` | `/zones/alerts?limit=50` | Retrieves newest-first server-persisted alerts from `data/logs/alerts.jsonl`. |
| `GET` | `/health` | Service health status and timestamp. |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **FortyGuard API Key** (from FortyGuard developer portal)
- **Groq API Key** (for LLaMA 3.3 LLM explanations)
- *(Optional)* Gmail App Password for live supervisor email alerts

---

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your credentials:

```env
FORTYGUARD_API_KEY=your_fortyguard_api_key_here
FORTYGUARD_BASE_URL=https://api.fortyguard.com

# Groq LLM Key for autonomous field phrasing
GROQ_API_KEY=your_groq_api_key_here

# SMTP Email Dispatch (Optional for live alerts)
ALERT_EMAIL_FROM=your_email@gmail.com
ALERT_EMAIL_APP_PASSWORD=your_16_char_app_password
ALERT_EMAIL_TO=supervisor@example.com
```

---

### 2. Backend Setup (FastAPI)

```bash
# Create and activate a virtual environment
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API server with live reload
uvicorn api.main:app --reload --port 8000
```
Backend will be live at: **`http://localhost:8000`** (Interactive Docs: `http://localhost:8000/docs`)

---

### 3. Frontend Setup (React + Vite)

In a new terminal:

```bash
cd frontend

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
Frontend will be live at: **`http://localhost:5173`**

---

## 🧪 Testing & Demo Workflows

### 1. Address Search & US Geocoding
- Type any address in the search box (e.g. `100 W Washington St, Phoenix, AZ` or `7th Ave & Baseline Rd`).
- Select from the autocomplete dropdown — the map marker pins to the exact location.
- Bounding box validation ensures coordinates stay strictly within US borders.

### 2. Live & Simulated Heat Stress Check
- Select a zone or pin coordinates.
- Enter a supervisor email and custom threshold if desired.
- Click **"Analyze Heat Risk"** — Sentinel evaluates live temperature and generates OSHA compliant actions.
- Or, use **"Demo Simulation"** with `42.0°C` to witness immediate real-time escalation, email dispatch, and Groq LLM guidance.

### 3. Audit Alert Logs
- Click the **"🔔 Alert Log"** button in the header.
- View the slide-in audit log showing historical triggered alerts, timestamps, apparent temperatures, and full AI field briefs.

---

## 🏆 Hackathon Value Proposition

| Traditional Heat Monitoring | FortyGuard HeatGuard Sentinel |
|---|---|
| ❌ Regional weather station readings (miles away from job site) | ✅ **Hyper-local microclimate data** capturing true asphalt & urban heat islands |
| ❌ Manual thermometer checks by busy site supervisors | ✅ **Autonomous 24/7 background agent** evaluating danger continuously |
| ❌ Generic "drink water" posters | ✅ **Actionable, contextual LLM briefs** tailored to specific worker trades |
| ❌ Reactive medical emergencies | ✅ **Predictive shift window optimization** to schedule high-intensity work safely |

---

## 📄 License
This project is developed for the **FortyGuard Hackathon 2026**. Built with 🧡 for outdoor worker safety.