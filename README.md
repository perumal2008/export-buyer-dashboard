# TradePulse — Export Buyer Discovery & Email Marketing Dashboard

A production-ready B2B export intelligence and outreach platform built with **React (Vite + Bootstrap 5)** and **Node.js + Express**, combining live global importer discovery, persistent lead shortlisting, dynamic email campaigns via **Nodemailer**, and live outreach analytics.

---

## Key Features

### 1. Real-Time Export Buyer Discovery (`GET /api/buyers`)
- **Zero hardcoded mock buyer lists.** Every query hits live upstream APIs and displays:
  - Green **Live API Source** indicator naming the active live APIs
  - Exact **fetch timestamp** and **response latency in ms** (both server and round-trip)
  - Inspectable **API Trace** showing HTTP status and timing per upstream provider
  - **UN Comtrade Public API** trade flow strip (annual import value, HS classification, top supplier partner origins)
- **Primary Paid Integrations (when API keys are set):**
  - **Apollo.io Search API** (`APOLLO_API_KEY`) for real-time importing companies, decision-makers, job titles, and contact data
  - **Hunter.io Domain Search API** (`HUNTER_API_KEY`) for verified corporate email enrichment
- **Automatic Live Open-Data Fallback (zero keys required):**
  - Attempts **OpenCorporates API** (`https://api.opencorporates.com/v0.4/companies/search`, using `OPENCORPORATES_API_KEY` if configured)
  - Automatically cascades to live **GLEIF Global Legal Entity Registry API** (`https://api.gleif.org/api/v1/lei-records`), **Clearbit Company Autocomplete API**, and **UN Comtrade Public API** (`https://comtradeapi.un.org/public/v1/preview/C/A/HS`) so searches always return live, verifiable corporate entities and trade statistics.

### 2. Lead Management & Shortlisting (`/api/leads`)
- Multi-select buyers via checkboxes
- Save buyers to persistent storage (`server/data/db.json`) via `POST /api/leads`, `GET /api/leads`, `PATCH /api/leads/:id`, `DELETE /api/leads/:id`
- Tagging workflow: **Hot Lead**, **Contacted**, **Sample Sent**
- Inline contact email editing and one-click **CSV export** (RFC-4180 compliant)

### 3. Email Marketing & Outreach (`/api/campaigns/send`)
- Interactive composer with clickable dynamic merge tags: `{{buyerName}}`, `{{companyName}}`, `{{product}}`, `{{country}}`
- Three pre-built B2B export templates:
  1. **Initial Product Introduction**
  2. **Catalog & FOB Pricing Quote**
  3. **Sample Dispatch Follow-Up**
- Real-time live merge-tag preview pane
- **Nodemailer** transport:
  - Uses real SMTP (including Gmail App Passwords) when `SMTP_USER` and `SMTP_PASS` are configured
  - Automatically operates in **Nodemailer Preview / Test Mode** (`jsonTransport`) when SMTP credentials are omitted, logging realistic delivery status progression (`Sent`, `Delivered`, `Opened`, `Replied`)

### 4. Outreach Funnel & Analytics (`/api/analytics`)
- Live KPIs: **Total Sent**, **Delivery Rate**, **Open Rate**, **Reply Rate**
- Saved Leads pipeline funnel (`Hot Lead`, `Contacted`, `Sample Sent`) & top target markets
- Campaign breakdown and delivery activity log with interactive event tracking

---

## Quick Start

### 1. Install Dependencies
From the repository root:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (a default `.env` is ready for open-data + email preview mode):
```bash
cp .env.example .env
```

Optional keys in `.env`:
- `APOLLO_API_KEY` — Enables Apollo.io live B2B people & organization search
- `HUNTER_API_KEY` — Enables Hunter.io domain email verification
- `OPENCORPORATES_API_KEY` — Enables authenticated OpenCorporates v0.4 queries
- `SMTP_USER` / `SMTP_PASS` — Enables live email delivery (for Gmail, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, and a 16-character Google App Password)

### 3. Start Backend & Frontend Together
```bash
npm run dev
```
- **Frontend Dashboard:** http://localhost:5173
- **Express API:** http://localhost:5000 (proxied via `/api` from Vite)

---

## Project Structure

```text
export-buyer-dashboard/
├── package.json              # Root concurrently scripts (npm run dev)
├── .env.example              # API & SMTP environment variable template
├── README.md
├── server/
│   ├── index.js              # Express server bootstrap
│   ├── config/env.js         # Environment & integration status
│   ├── routes/
│   │   ├── buyers.js         # GET /api/buyers
│   │   ├── leads.js          # GET, POST, PATCH, DELETE /api/leads
│   │   ├── campaigns.js      # GET /api/campaigns, POST /api/campaigns/send
│   │   └── analytics.js      # GET /api/analytics
│   ├── services/
│   │   ├── buyerDiscoveryService.js  # Apollo, Hunter, OpenCorporates, GLEIF, Clearbit
│   │   ├── comtradeService.js        # UN Comtrade Public API integration
│   │   └── emailService.js           # Nodemailer SMTP & preview simulation
│   ├── storage/db.js         # Atomic JSON persistence (server/data/db.json)
│   └── utils/tradeMapping.js # Country ISO/Comtrade & HS commodity mapping
└── client/
    ├── vite.config.js        # Dev server + /api proxy to Express
    └── src/
        ├── App.jsx
        ├── api/client.js
        ├── styles/dashboard.css
        ├── utils/
        │   ├── csvExport.js
        │   └── formatters.js
        └── components/
            ├── Sidebar.jsx
            ├── TopBar.jsx
            ├── BuyerDiscoveryView.jsx
            ├── SavedLeadsView.jsx
            ├── EmailCampaignsView.jsx
            └── AnalyticsView.jsx
```

---

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | Active buyer & email connector mode |
| `GET` | `/api/buyers?product=Textiles&country=United+States&industry=...&role=Importer` | Real-time buyer discovery + UN Comtrade trade context |
| `GET` | `/api/leads` | List persisted leads (filterable by `tag`, `q`) |
| `POST` | `/api/leads` | Save one or multiple buyers |
| `PATCH` | `/api/leads/:id` | Update tags, contact email, buyer name, or notes |
| `DELETE` | `/api/leads/:id` | Delete saved lead |
| `GET` | `/api/campaigns` | List templates, campaigns, and delivery logs |
| `POST` | `/api/campaigns/send` | Send campaign via Nodemailer / preview mode |
| `POST` | `/api/campaigns/deliveries/:id/status` | Update delivery tracking status (`Delivered`, `Opened`, `Replied`) |
| `GET` | `/api/analytics` | Live outreach KPIs, lead funnel, and country breakdown |
