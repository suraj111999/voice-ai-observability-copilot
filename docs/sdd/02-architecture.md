# SDD-02: Architecture

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                    HighLevel Sandbox Account                     │
│  ┌──────────────┐    webhook/API    ┌────────────────────────┐  │
│  │ Voice AI     │ ────────────────► │ Observability Copilot  │  │
│  │ Agents       │                   │ (Node.js + Vue.js)     │  │
│  └──────────────┘                   └───────────┬────────────┘  │
│  ┌──────────────┐    iframe/embed              │                │
│  │ Custom JS    │ ◄────────────────────────────┘                │
│  │ Widget       │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Flywheel

```
  Ingest ──► Configure KPIs ──► Analyze ──► Recommend ──► (human adjusts script)
     ▲                                                              │
     └──────────────────── new calls monitored ◄────────────────────┘
```

## Component Diagram

```
backend/
├── ingestion/     GHL client, webhook handler, mock seeder
├── analysis/      KPI scorer, deviation detector, recommendation engine
├── api/           REST routes for dashboard
└── db/            SQLite schema + repositories

frontend/
├── views/         Dashboard, AgentDetail, CallDetail
├── components/    MetricCards, IssueHeatmap, UseActionPanel, Recommendations
└── composables/   useApi, useFilters

widget/
├── embed.js       GHL Custom JS loader
└── manifest.json  Marketplace metadata
```

## Data Flow: Monitor Loop

1. Transcript arrives (webhook or poll)
2. Normalize to `CallRecord` schema
3. Load agent KPIs from DB
4. `AnalysisEngine.analyze(call, kpis)` → `AnalysisResult`
5. Persist scores, deviations, use-actions, recommendations
6. Emit event for dashboard refresh (client polls every 10s)

## Data Flow: Analyze Loop

1. Dashboard aggregates `AnalysisResult` by agent + KPI
2. Rank issues by frequency × severity
3. Surface top 3 recommendations per agent from latest failures
4. Use Actions link to exact transcript timestamps

## Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| API | Express 4 | Requirement compliance, simple |
| DB | better-sqlite3 | Zero-config demo |
| Frontend | Vue 3 + Vite | Requirement compliance |
| Styling | Tailwind via scoped CSS in app | GHL embed friendly |
| Analysis | Rule engine (keywords + patterns) | No external AI dependency |

## Deployment Topology (Local / Sandbox)

```
Terminal 1: cd backend && npm run dev     → :3001
Terminal 2: cd frontend && npm run dev    → :5173
GHL Widget:  embed.js points to :5173 or production URL
```
