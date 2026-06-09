# Voice AI Observability Copilot

An Agent Observability Copilot for **HighLevel Voice AI** that automates the **Monitor** and **Analyze** phases of the validation flywheel — ingesting call transcripts, scoring them against agent-specific KPIs, and surfacing actionable recommendations.

## Architecture

```
HighLevel Voice AI ──webhook/API──► Node.js Backend ──► SQLite
                                        │
                                        ▼
                              Analysis Engine (KPI scoring,
                              deviations, use-actions, recommendations)
                                        │
                                        ▼
                              Vue.js Dashboard ◄── GHL Custom JS Widget (iframe)
```

See full SDD specs in [`docs/sdd/`](docs/sdd/).

## Team of One Ownership

| Phase | Approach |
|-------|----------|
| **Product** | Defined Monitor/Analyze loops in SDD requirements; scoped v1 to close loop from logs → recommendations |
| **Design** | Dark observability UI patterned after monitoring tools; agent → call → segment drill-down |
| **Engineering** | Node.js API + rule-based analysis engine; Vue 3 dashboard |
| **QA** | 3 demo calls covering greeting failures, escalations, compliance, confusion |

## What's Real vs Mocked

| Feature | Status |
|---------|--------|
| KPI scoring & deviation detection | **Functional** (rule engine) |
| Use Actions extraction | **Functional** |
| Recommendations | **Functional** (rule-based templates from KPI failures) |
| GHL Custom Page / Menu Link embed | **Functional** (iframe) |

> **Evaluator note:** Make 3–5 test calls in your GHL sandbox to generate real transcripts. See [`docs/GHL_SANDBOX_SETUP.md`](docs/GHL_SANDBOX_SETUP.md).

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API runs at `http://localhost:3001`. Demo data seeds automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:5173`.

### 3. HighLevel Sandbox Integration

**Full playbook:** [`docs/GHL_SANDBOX_SETUP.md`](docs/GHL_SANDBOX_SETUP.md)

#### Option A: Webhook (recommended for real-time)

1. In your GHL sandbox, create a workflow with trigger **Transcript Generated**.
2. Add a **Custom Webhook** action pointing to:
   ```
   https://your-deployed-api.com/webhooks/ghl/transcript
   ```
3. Map payload fields: `agentId`, `callId`, `transcript`, `contactName`, `summary`.

#### Option B: API Polling

1. Create a [Private Integration](https://help.gohighlevel.com/) in your sandbox.
2. Set in `backend/.env`:
   ```
   MOCK_MODE=false
   GHL_API_KEY=your_token
   GHL_LOCATION_ID=your_location_id
   ```
3. Click **Sync from GHL** in the dashboard or `POST /api/sync/ghl`.

#### Option C: Custom JS Widget (in-account embed)

1. Deploy frontend to a public URL (or use ngrok for local demo).
2. Add to GHL via Marketplace Custom JS or a Code block:

```html
<script>
  window.VOICE_AI_COPILOT_URL = 'https://your-dashboard-url.com';
</script>
<script src="https://your-cdn.com/widget/embed.js"></script>
<div data-vac-mount></div>
```

## Demo Walkthrough (2–5 min)

1. **Dashboard** — Show 3 agents, avg score, issue heatmap.
2. **Agent drill-down** — Open "Sales Qualifier AI" → see KPI config and recommendations for objection handling.
3. **Call detail** — Open Sarah Mitchell's call → highlight flagged "Use Action" on pricing objection.
4. **Recommendations** — Show suggested prompt change for CTA and objection handling.
5. **Sync** (optional) — Demonstrate webhook ingest via `curl` or GHL workflow.

### Sample webhook curl

```bash
curl -X POST http://localhost:3001/webhooks/ghl/transcript \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_sales_demo",
    "callId": "call_live_001",
    "contactName": "Test Caller",
    "transcript": [
      {"role": "agent", "text": "Hello, thank you for calling!", "timestamp": 0},
      {"role": "caller", "text": "I need pricing info", "timestamp": 5}
    ],
    "summary": "Pricing inquiry"
  }'
```

## API Reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health + mock/live status |
| `GET /api/dashboard/overview` | Unified dashboard metrics |
| `GET /api/dashboard/recommendations` | AI recommendations |
| `GET /api/agents/:id` | Agent detail + KPIs + calls |
| `GET /api/calls/:id` | Full transcript + analysis |
| `POST /webhooks/ghl/transcript` | Ingest transcript webhook |
| `POST /api/sync/ghl` | Pull from GHL API |

Full contracts: [`docs/sdd/03-api-contracts.md`](docs/sdd/03-api-contracts.md)

## Project Structure

```
voice-ai-observability-copilot/
├── docs/sdd/           # Specification-Driven Development docs
├── backend/            # Node.js Express API + analysis engine
├── frontend/           # Vue 3 dashboard
└── widget/             # GHL Custom JS embed
```

## License

MIT
