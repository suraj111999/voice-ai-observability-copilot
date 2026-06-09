# SDD-04: Data Models

## Entity Relationship

```
Agent 1──* Call 1──1 Analysis
              │
              └──* UseAction
              └──* Recommendation
Agent 1──* KPI
```

## Agent

| Field | Type | Description |
|-------|------|-------------|
| id | string | GHL agent ID or internal UUID |
| name | string | Display name |
| location_id | string | GHL location |
| script_summary | text | Agent goal/script excerpt |
| created_at | datetime | |

## KPI

| Field | Type | Description |
|-------|------|-------------|
| id | string | e.g. `greeting`, `cta` |
| agent_id | FK | |
| name | string | |
| weight | int | 0-100, sum = 100 per agent |
| criteria | text | Natural language success criteria |
| keywords | json | Expected phrases |
| required | bool | Failure = critical |

## Call

| Field | Type | Description |
|-------|------|-------------|
| id | string | |
| agent_id | FK | |
| ghl_call_id | string | External ID |
| contact_name | string | |
| duration_seconds | int | |
| transcript | json | Array of segments |
| summary | text | |
| outcome | enum | completed, missed, failed |
| ingested_at | datetime | |

## Analysis

| Field | Type | Description |
|-------|------|-------------|
| id | string | |
| call_id | FK | unique |
| overall_score | float | 0-100 |
| kpi_scores | json | `{ kpiId: { score, passed, evidence } }` |
| deviations | json | Array of deviation objects |
| analyzed_at | datetime | |

## UseAction

| Field | Type | Description |
|-------|------|-------------|
| id | string | |
| call_id | FK | |
| segment_index | int | Transcript line index |
| segment_text | text | |
| reason | enum | missed_kpi, escalation, confusion, compliance |
| severity | enum | low, medium, high, critical |
| suggestion | text | Human intervention guidance |

## Recommendation

| Field | Type | Description |
|-------|------|-------------|
| id | string | |
| agent_id | FK | |
| call_ids | json | Supporting evidence |
| priority | enum | low, medium, high |
| category | enum | script, prompt, training, config |
| title | string | |
| description | text | |
| suggested_prompt_change | text | |
