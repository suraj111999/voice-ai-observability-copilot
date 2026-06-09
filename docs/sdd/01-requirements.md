# SDD-01: Requirements Specification

## Problem Statement

HighLevel Voice AI agents require manual transcript review to verify success criteria. Operators lack a unified observability layer that closes the loop from raw call logs to actionable script/prompt adjustments.

## Goals

| ID | Goal | Success Metric |
|----|------|----------------|
| G1 | Automate Monitor phase | Transcripts ingested and scored within 30s of receipt |
| G2 | Automate Analyze phase | Dashboard surfaces top issues + recommendations per agent |
| G3 | GHL integration | Embeddable widget + webhook/API ingestion path |
| G4 | Team-of-one deliverable | Single repo, documented mock vs real boundaries |

## Functional Requirements

### FR-1: Transcript Ingestion
- **FR-1.1** Accept transcripts via GHL webhook (`POST /webhooks/ghl/transcript`)
- **FR-1.2** Poll GHL Voice AI Call Log API when credentials configured
- **FR-1.3** Seed demo data when `MOCK_MODE=true`

### FR-2: Observability Parameters (KPIs)
- **FR-2.1** Per-agent success criteria: greeting, qualification, objection handling, CTA, compliance
- **FR-2.2** CRUD via `GET/PUT /api/agents/:id/kpis`
- **FR-2.3** Default KPI templates per agent type (sales, support, booking)

### FR-3: Analysis Engine
- **FR-3.1** Score each transcript against configured KPIs (0–100)
- **FR-3.2** Detect deviations: missed steps, off-script, negative sentiment, long silence
- **FR-3.3** Extract "Use Actions" — transcript segments needing human intervention
- **FR-3.4** Generate rule-based recommendations from KPI failure patterns

### FR-4: Unified Dashboard
- **FR-4.1** Agent overview: call volume, avg score, trend
- **FR-4.2** Issue heatmap by KPI category
- **FR-4.3** Drill-down: call list → transcript → segments → recommendations
- **FR-4.4** Filter by agent, date range, severity

### FR-5: GHL Integration
- **FR-5.1** Custom JS widget loads dashboard in iframe or standalone
- **FR-5.2** OAuth/API key config via environment
- **FR-5.3** Marketplace app manifest (`widget/manifest.json`)

## Non-Functional Requirements

- **NFR-1** Node.js 18+, Vue 3
- **NFR-2** SQLite for local persistence (zero external DB for demo)
- **NFR-3** CORS enabled for GHL iframe embedding
- **NFR-4** No obfuscated code (GHL marketplace compliance)

## Out of Scope (v1)

- Multi-tenant auth / billing
- Real-time WebSocket streaming (polling + webhooks sufficient)
- Automated prompt rewriting inside GHL

## Mock vs Real Matrix

| Capability | Mock (dev only) | Real (submission) |
|------------|-----------------|-------------------|
| Transcript ingestion | `MOCK_MODE=true` seed | Test calls + webhook or API sync |
| KPI scoring | Rule engine | Rule engine (same) |
| AI recommendations | Rule-based templates from KPI failures |
| Dashboard | Full UI | Full UI embedded via Custom Page / Menu Link |
| GHL integration | N/A | Sandbox via marketplace.gohighlevel.com Testing tab |

**Evaluator requirement:** Use actual Voice AI transcripts from test calls in the GHL sandbox. Mock data is for local UI development only.
