# HighLevel Sandbox Setup — Assignment Playbook

This guide walks through what the evaluators asked for: **real Voice AI transcripts**, **sandbox discovery**, and **UI embedded inside HighLevel**.

---

## Phase 1: Get Your Sandbox (15 min)

### Step 1 — Developer account

1. Go to **[marketplace.gohighlevel.com](https://marketplace.gohighlevel.com)** and sign up for a **Developer account**.
2. Complete profile setup.

### Step 2 — Create sandbox agency

1. In the developer portal, open the **Testing** tab.
2. Click **Create Sandbox Account** (one per developer; Pro features for ~6 months).
3. You get a sandbox **agency** with up to **2 sub-accounts**.

### Step 3 — Open a sub-account & enable Voice AI

1. Log into your sandbox agency at `app.gohighlevel.com`.
2. Create or open a **sub-account** (location).
3. Enable **Voice AI** (AI → Voice AI Agents).
4. Create at least one Voice AI agent with a clear script (greeting, qualification, CTA).
5. Assign a phone number or use the **web chat / embed widget** to place test calls.

### Step 4 — Make test calls (required for real transcripts)

Evaluators want **actual transcripts**, not mocks:

| Method | How |
|--------|-----|
| **Phone** | Call the agent's assigned number from your mobile |
| **Web widget** | Embed Voice AI chat widget on a funnel page and talk to the agent |
| **Internal test** | Use GHL's test call feature if available on your agent |

Make **3–5 varied calls**:
- One where the agent succeeds (books demo / answers question)
- One with a **pricing objection**
- One where you express **frustration** (tests escalation Use Actions)
- One short call (tests greeting/CTA gaps)

Transcripts appear after the call ends (Voice AI transcribes by default).

---

## Phase 2: Ingest Real Transcripts (pick one path)

### Path A — Workflow webhook (recommended, real-time)

1. **Automation → Workflows → Create Workflow**
2. Trigger: **Transcript Generated**
   - Filter: Call Type = **Voice AI**
   - Optional: Duration > 30 seconds
3. Action: **Custom Webhook**
   - Method: `POST`
   - URL: `https://<your-ngrok-or-deployed-api>/webhooks/ghl/transcript`
4. Body (JSON) — map GHL merge fields:

```json
{
  "agentId": "{{voice_ai_agent.id}}",
  "callId": "{{message.id}}",
  "locationId": "{{location.id}}",
  "contactName": "{{contact.name}}",
  "durationSeconds": "{{call.duration}}",
  "full_transcript": "{{transcript}}",
  "summary": "{{call_summary}}"
}
```

> Merge field names vary slightly in the UI. Search for **transcript**, **call summary**, **voice ai agent** in the merge field picker.

5. **Publish** the workflow.
6. Place another test call → webhook fires → copilot analyzes automatically.

**Local dev:** `ngrok http 3001` → use the HTTPS URL in the webhook.

### Path B — Private Integration + API sync

1. In sandbox sub-account: **Settings → Private Integrations → Create**
2. Name: `Observability Copilot`
3. Scopes (enable all Voice AI / conversation read scopes available):
   - Voice AI — read
   - Locations — read
   - Conversations — read (fallback transcription endpoint)
4. Copy the token (`pit-...`).
5. Find **Location ID**: Settings → Business Profile → URL contains `location/{LOCATION_ID}`

```bash
# backend/.env
MOCK_MODE=false
GHL_API_KEY=pit-your-token
GHL_LOCATION_ID=your-location-id
```

6. Restart backend → click **Sync from GHL** in dashboard (or `POST /api/sync/ghl`).

---

## Phase 3: Embed UI Inside HighLevel (required)

Evaluators want you to **figure out integration** — here are the two supported approaches:

### Option 1 — Marketplace App Custom Page (best for submission)

1. In **[marketplace.gohighlevel.com](https://marketplace.gohighlevel.com)** → **My Apps → Create App**
2. Distribution: **Sub-account** (or Agency + Sub-account)
3. Under **Custom Pages**, add:
   - **Title:** Voice AI Observability
   - **URL:** `https://your-deployed-dashboard.com/?location_id={{location.id}}&embedded=ghl`
   - **Placement:** Left navigation menu
4. Deploy frontend to **HTTPS** (Vercel, Railway, ngrok for demo).
5. **Install** the app on your sandbox sub-account via **Settings → Integrations** or agency **+ Add App**.
6. Open the new left-nav item — dashboard loads in iframe inside GHL.

See `marketplace/APP_SETUP.md` for full app configuration.

### Option 2 — Custom Menu Link (fastest for demo)

No marketplace review needed:

1. **Agency Settings → Custom Menu Links → Create**
2. Name: `Voice AI Observability`
3. URL: `https://your-dashboard.com/?location_id={{location.id}}`
4. Open mode: **Embedded Page (iFrame)**
5. Show on: **Location** (sub-account sidebar)
6. Save → open sub-account → link appears in left nav.

---

## Phase 4: Verify end-to-end

```bash
# 1. Health check
curl http://localhost:3001/api/health
# Expect: "dataSource": "live", callCount > 0

# 2. After test call + webhook
curl http://localhost:3001/api/dashboard/overview

# 3. Confirm real agent names (not "Sales Qualifier AI" demo names)
curl http://localhost:3001/api/agents
```

---

## Demo recording checklist

For your 2–5 min Loom:

1. Show dashboard **inside GHL iframe** (not just localhost)
2. Show call list from **your real test calls** (contact names you recognize)
3. Drill into one call → KPI scores + Use Actions on real transcript text
4. Show recommendation generated from **your** agent's failures
5. Optionally show workflow firing after a live test call

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook never fires | Workflow published? Trigger filter = Voice AI? Transcription enabled? |
| `agentId required` | Map voice AI agent ID merge field in webhook JSON |
| Empty transcript | Use `full_transcript` with `{{transcript}}` merge field |
| Sync returns 401 | Regenerate Private Integration token; check scopes |
| Sync returns 404 | API path may differ — use webhook path as primary |
| iframe blank | Dashboard must be HTTPS; no `X-Frame-Options: DENY` |
| CORS errors | Add GHL domain to `CORS_ORIGIN` in backend `.env` |

---

## References

- [Developer Marketplace getting started](https://help.gohighlevel.com/support/solutions/articles/155000000136-how-to-get-started-with-the-developer-s-marketplace)
- [Voice AI Public APIs](https://help.gohighlevel.com/support/solutions/articles/155000007514-voice-ai-public-apis-in-highlevel)
- [Transcript Generated trigger](https://help.gohighlevel.com/support/solutions/articles/155000006632-workflow-trigger-transcript-generated)
- [Custom Pages module](https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomPages)
- [Custom Menu Links](https://help.gohighlevel.com/support/solutions/articles/48001185767-customizing-highlevel-menus-a-guide-to-custom-menu-links)
