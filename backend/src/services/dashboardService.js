import { getDb } from '../db/index.js';

export function getOverview() {
  const db = getDb();

  const totalCalls = db.prepare('SELECT COUNT(*) as count FROM calls').get().count;
  const avgScore = db.prepare('SELECT AVG(overall_score) as avg FROM analyses').get().avg || 0;

  const agents = db.prepare(`
    SELECT a.id, a.name, a.agent_type,
      COUNT(c.id) as callCount,
      AVG(an.overall_score) as avgScore
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
    LEFT JOIN analyses an ON an.call_id = c.id
    GROUP BY a.id
    ORDER BY callCount DESC
  `).all().map((row) => {
    const topIssue = getTopIssueForAgent(row.id);
    return {
      id: row.id,
      name: row.name,
      agentType: row.agent_type,
      callCount: row.callCount,
      avgScore: row.avgScore ? Math.round(row.avgScore * 10) / 10 : null,
      topIssue,
    };
  });

  const issueHeatmap = buildIssueHeatmap();
  const recentUseActions = getRecentUseActions(8);

  return {
    totalCalls,
    avgScore: Math.round(avgScore * 10) / 10,
    agents,
    issueHeatmap,
    recentUseActions,
  };
}

function getTopIssueForAgent(agentId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.deviations FROM calls c
    JOIN analyses a ON a.call_id = c.id
    WHERE c.agent_id = ?
    ORDER BY c.ingested_at DESC LIMIT 10
  `).all(agentId);

  const counts = {};
  for (const row of rows) {
    const devs = JSON.parse(row.deviations || '[]');
    for (const d of devs) {
      counts[d.kpiName] = (counts[d.kpiName] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? sorted[0][0] : null;
}

function buildIssueHeatmap() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.deviations FROM analyses a
    JOIN calls c ON c.id = a.call_id
    ORDER BY c.ingested_at DESC LIMIT 100
  `).all();

  const counts = {};
  for (const row of rows) {
    const devs = JSON.parse(row.deviations || '[]');
    for (const d of devs) {
      const key = d.kpiId || d.kpiName;
      if (!counts[key]) {
        counts[key] = { kpiId: key, kpiName: d.kpiName, failureCount: 0, severity: d.severity };
      }
      counts[key].failureCount++;
      if (d.severity === 'critical') counts[key].severity = 'critical';
      else if (d.severity === 'high' && counts[key].severity !== 'critical') counts[key].severity = 'high';
    }
  }

  return Object.values(counts).sort((a, b) => b.failureCount - a.failureCount);
}

function getRecentUseActions(limit) {
  const db = getDb();
  return db.prepare(`
    SELECT ua.*, c.contact_name, c.agent_id, a.name as agent_name
    FROM use_actions ua
    JOIN calls c ON c.id = ua.call_id
    JOIN agents a ON a.id = c.agent_id
    ORDER BY ua.rowid DESC
    LIMIT ?
  `).all(limit).map((row) => ({
    id: row.id,
    callId: row.call_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    contactName: row.contact_name,
    segment: row.segment_text,
    reason: row.reason,
    severity: row.severity,
    suggestion: row.suggestion,
  }));
}

export function getRecommendations(agentId) {
  const db = getDb();
  let sql = 'SELECT * FROM recommendations';
  const params = [];

  if (agentId) {
    sql += ' WHERE agent_id = ?';
    params.push(agentId);
  }

  sql += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, created_at DESC';

  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => ({
    ...r,
    callIds: JSON.parse(r.call_ids || '[]'),
  }));
}

export function listAgents() {
  const db = getDb();
  return db.prepare(`
    SELECT a.*,
      COUNT(c.id) as call_count,
      AVG(an.overall_score) as avg_score
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
    LEFT JOIN analyses an ON an.call_id = c.id
    GROUP BY a.id
  `).all();
}

export function getAgentDetail(agentId) {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return null;

  const kpis = db.prepare('SELECT * FROM kpis WHERE agent_id = ?').all(agentId).map((k) => ({
    ...k,
    keywords: JSON.parse(k.keywords || '[]'),
    required: !!k.required,
  }));

  const recentCalls = db.prepare(`
    SELECT c.id, c.contact_name, c.duration_seconds, c.ingested_at, c.outcome,
      an.overall_score, an.deviations
    FROM calls c
    LEFT JOIN analyses an ON an.call_id = c.id
    WHERE c.agent_id = ?
    ORDER BY c.ingested_at DESC LIMIT 20
  `).all(agentId).map((c) => ({
    ...c,
    deviations: c.deviations ? JSON.parse(c.deviations) : [],
  }));

  const recommendations = getRecommendations(agentId);

  return { ...agent, kpis, recentCalls, recommendations };
}
