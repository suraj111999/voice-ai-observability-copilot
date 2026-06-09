# Installation Guide — HighLevel Sandbox

## Step 1: Clone & Run Locally

```bash
git clone <your-repo-url> voice-ai-observability-copilot
cd voice-ai-observability-copilot

# Terminal 1 — Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

> **Important:** Set `MOCK_MODE=false` (default) and ingest **real Voice AI transcripts** from test calls. Demo seed only runs when `MOCK_MODE=true`.

## Step 2: HighLevel Sandbox Account

See the complete guide: **[GHL_SANDBOX_SETUP.md](GHL_SANDBOX_SETUP.md)**

Summary:
1. Sign up at [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) → **Testing** tab → **Create Sandbox**
2. Enable **Voice AI** on a sub-account and create an agent
3. **Make 3–5 test calls** to generate real transcripts

## Step 3: Connect Transcript Ingestion

### Webhook (real-time)

1. Go to **Automation → Workflows**.
2. Create workflow: Trigger = **Transcript Generated**.
3. Action = **Custom Webhook**:
   - URL: `https://<your-api-host>/webhooks/ghl/transcript`
   - Method: POST
   - Body: include `agentId`, `callId`, `transcript`, `contactName`, `summary`
4. For local dev, use [ngrok](https://ngrok.com): `ngrok http 3001`

### API Sync (batch)

1. **Settings → Private Integrations** → Create integration.
2. Scopes: Voice AI read, Locations read.
3. Add to `backend/.env`:
   ```
   MOCK_MODE=false
   GHL_API_KEY=pit-xxxxx
   GHL_LOCATION_ID=loc_xxxxx
   ```
4. Restart backend. Use dashboard **Sync from GHL** button.

## Step 4: Embed in HighLevel UI

### Custom JS (Marketplace App)

1. Upload `widget/embed.js` as Custom JS in your agency marketplace app.
2. Set `window.VOICE_AI_COPILOT_URL` to your deployed dashboard URL.
3. Install app on sandbox sub-account.

### Inline Code Block (quick test)

```html
<script>window.VOICE_AI_COPILOT_URL = 'http://localhost:5173';</script>
<script src="http://localhost:5173/../widget/embed.js"></script>
```

Serve `widget/embed.js` statically or copy contents inline.

## Step 5: Configure KPIs

1. Open dashboard → select an agent → **Observability KPIs**.
2. Default templates apply per agent type (sales/support/booking).
3. Customize via API: `PUT /api/agents/:id/kpis`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty dashboard | Run `cd backend && npm run seed` |
| CORS errors in iframe | Set `CORS_ORIGIN` in `.env` to include GHL domain |
| GHL sync fails | Verify API key scopes and location ID |
| Widget blank | Check iframe URL and HTTPS mixed-content rules |
