export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location_id TEXT,
      script_summary TEXT,
      agent_type TEXT DEFAULT 'sales',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kpis (
      id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 20,
      criteria TEXT NOT NULL,
      keywords TEXT DEFAULT '[]',
      required INTEGER DEFAULT 1,
      PRIMARY KEY (id, agent_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      ghl_call_id TEXT,
      contact_name TEXT,
      duration_seconds INTEGER DEFAULT 0,
      transcript TEXT NOT NULL,
      summary TEXT,
      outcome TEXT DEFAULT 'completed',
      ingested_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      call_id TEXT UNIQUE NOT NULL,
      overall_score REAL NOT NULL,
      kpi_scores TEXT NOT NULL,
      deviations TEXT DEFAULT '[]',
      analyzed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (call_id) REFERENCES calls(id)
    );

    CREATE TABLE IF NOT EXISTS use_actions (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      segment_text TEXT NOT NULL,
      reason TEXT NOT NULL,
      severity TEXT NOT NULL,
      suggestion TEXT,
      FOREIGN KEY (call_id) REFERENCES calls(id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      call_ids TEXT DEFAULT '[]',
      priority TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      suggested_prompt_change TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
    CREATE INDEX IF NOT EXISTS idx_calls_ingested ON calls(ingested_at);
    CREATE INDEX IF NOT EXISTS idx_use_actions_call ON use_actions(call_id);
    CREATE INDEX IF NOT EXISTS idx_recommendations_agent ON recommendations(agent_id);
  `);
}
