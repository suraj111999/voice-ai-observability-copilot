# SDD-03: API Contracts

Base URL: `http://localhost:3001`

## Webhooks

### POST /webhooks/ghl/transcript

GHL "Transcript Generated" workflow or custom webhook payload.

```json
{
  "locationId": "loc_xxx",
  "agentId": "agent_xxx",
  "callId": "call_xxx",
  "contactName": "Jane Doe",
  "durationSeconds": 142,
  "transcript": [
    { "role": "agent", "text": "Hello...", "timestamp": 0 },
    { "role": "caller", "text": "Hi...", "timestamp": 3 }
  ],
  "summary": "Caller inquired about pricing.",
  "outcome": "completed"
}
```

**Response:** `201 { "id": "...", "analysisId": "..." }`

## Agents

### GET /api/agents

Returns all agents with aggregate metrics.

### GET /api/agents/:id

Agent detail + KPIs + recent calls.

### PUT /api/agents/:id/kpis

```json
{
  "kpis": [
    {
      "id": "greeting",
      "name": "Professional Greeting",
      "weight": 15,
      "criteria": "Agent introduces company and self within first 10 seconds",
      "keywords": ["hello", "thank you for calling"],
      "required": true
    }
  ]
}
```

## Calls

### GET /api/calls?agentId=&from=&to=&minScore=

Paginated call list with analysis summary.

### GET /api/calls/:id

Full transcript + analysis + use-actions + recommendations.

### POST /api/calls/ingest

Manual ingest (demo/testing).

## Dashboard

### GET /api/dashboard/overview

```json
{
  "totalCalls": 48,
  "avgScore": 72.4,
  "agents": [{ "id", "name", "callCount", "avgScore", "topIssue" }],
  "issueHeatmap": [{ "kpiId", "kpiName", "failureCount", "severity" }],
  "recentUseActions": [{ "callId", "segment", "reason", "severity" }]
}
```

### GET /api/dashboard/recommendations?agentId=

```json
{
  "recommendations": [
    {
      "id": "rec_1",
      "priority": "high",
      "category": "script",
      "title": "Strengthen objection handling for pricing",
      "description": "...",
      "suggestedPromptChange": "...",
      "basedOnCalls": ["call_1", "call_2"]
    }
  ]
}
```

## Health

### GET /api/health

`{ "status": "ok", "mockMode": true, "ghlConnected": false }`

### POST /api/sync/ghl

Trigger manual GHL call log sync (requires `GHL_API_KEY`).
