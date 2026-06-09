import { v4 as uuid } from 'uuid';
import { getDb } from '../db/index.js';
import { analyzeCall, extractUseActions, generateRecommendations } from '../analysis/engine.js';

export function getAgentKpis(agentId) {
  const db = getDb();
  return db.prepare('SELECT * FROM kpis WHERE agent_id = ?').all(agentId);
}

export function upsertAgentKpis(agentId, kpis) {
  const db = getDb();
  const del = db.prepare('DELETE FROM kpis WHERE agent_id = ?');
  const ins = db.prepare(`
    INSERT INTO kpis (id, agent_id, name, weight, criteria, keywords, required)
    VALUES (@id, @agent_id, @name, @weight, @criteria, @keywords, @required)
  `);

  const tx = db.transaction((items) => {
    del.run(agentId);
    for (const k of items) {
      ins.run({
        id: k.id,
        agent_id: agentId,
        name: k.name,
        weight: k.weight,
        criteria: k.criteria,
        keywords: JSON.stringify(k.keywords || []),
        required: k.required ? 1 : 0,
      });
    }
  });

  tx(kpis);
  return getAgentKpis(agentId);
}

export function processCall({ agentId, ghlCallId, contactName, durationSeconds, transcript, summary, outcome }) {
  const db = getDb();
  const callId = uuid();

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const kpis = getAgentKpis(agentId);
  if (!kpis.length) {
    throw new Error(`No KPIs configured for agent: ${agentId}`);
  }

  const parsedTranscript = typeof transcript === 'string' ? JSON.parse(transcript) : transcript;
  const analysis = analyzeCall(parsedTranscript, kpis);
  const useActions = extractUseActions(parsedTranscript, analysis.kpiScores, analysis.deviations);

  const analysisId = uuid();

  const insertCall = db.prepare(`
    INSERT INTO calls (id, agent_id, ghl_call_id, contact_name, duration_seconds, transcript, summary, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (id, call_id, overall_score, kpi_scores, deviations)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertUseAction = db.prepare(`
    INSERT INTO use_actions (id, call_id, segment_index, segment_text, reason, severity, suggestion)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    insertCall.run(
      callId,
      agentId,
      ghlCallId || null,
      contactName || 'Unknown',
      durationSeconds || 0,
      JSON.stringify(parsedTranscript),
      summary || '',
      outcome || 'completed',
    );

    insertAnalysis.run(
      analysisId,
      callId,
      analysis.overallScore,
      JSON.stringify(analysis.kpiScores),
      JSON.stringify(analysis.deviations),
    );

    for (const action of useActions) {
      insertUseAction.run(
        uuid(),
        callId,
        action.segmentIndex,
        action.segmentText,
        action.reason,
        action.severity,
        action.suggestion,
      );
    }
  });

  tx();

  refreshAgentRecommendations(agentId);

  return { id: callId, analysisId, overallScore: analysis.overallScore };
}

function refreshAgentRecommendations(agentId) {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return;

  const recent = db.prepare(`
    SELECT c.id as callId, c.contact_name, c.summary, a.overall_score, a.deviations
    FROM calls c
    JOIN analyses a ON a.call_id = c.id
    WHERE c.agent_id = ?
    ORDER BY c.ingested_at DESC
    LIMIT 10
  `).all(agentId).map((row) => ({
    ...row,
    overall_score: row.overall_score,
    deviations: JSON.parse(row.deviations || '[]'),
  }));

  const useActions = db.prepare(`
    SELECT ua.* FROM use_actions ua
    JOIN calls c ON c.id = ua.call_id
    WHERE c.agent_id = ?
    ORDER BY ua.rowid DESC LIMIT 20
  `).all(agentId);

  const recs = generateRecommendations(agentId, agent.name, recent, useActions);

  db.prepare('DELETE FROM recommendations WHERE agent_id = ?').run(agentId);

  const insert = db.prepare(`
    INSERT INTO recommendations (id, agent_id, call_ids, priority, category, title, description, suggested_prompt_change)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((items) => {
    for (const r of items) {
      insert.run(
        uuid(),
        agentId,
        JSON.stringify(r.callIds || []),
        r.priority,
        r.category,
        r.title,
        r.description,
        r.suggestedPromptChange || '',
      );
    }
  });

  tx(recs);
}

export function getCallById(callId) {
  const db = getDb();
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId);
  if (!call) return null;

  const analysis = db.prepare('SELECT * FROM analyses WHERE call_id = ?').get(callId);
  const useActions = db.prepare('SELECT * FROM use_actions WHERE call_id = ? ORDER BY segment_index').all(callId);

  return {
    ...call,
    transcript: JSON.parse(call.transcript),
    analysis: analysis
      ? {
          ...analysis,
          kpi_scores: JSON.parse(analysis.kpi_scores),
          deviations: JSON.parse(analysis.deviations),
        }
      : null,
    useActions,
  };
}

export function listCalls({ agentId, from, to, minScore, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const conditions = ['1=1'];
  const params = [];

  if (agentId) {
    conditions.push('c.agent_id = ?');
    params.push(agentId);
  }
  if (from) {
    conditions.push('c.ingested_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('c.ingested_at <= ?');
    params.push(to);
  }
  if (minScore != null) {
    conditions.push('a.overall_score >= ?');
    params.push(minScore);
  }

  const where = conditions.join(' AND ');
  const sql = `
    SELECT c.*, a.overall_score, a.deviations
    FROM calls c
    LEFT JOIN analyses a ON a.call_id = c.id
    WHERE ${where}
    ORDER BY c.ingested_at DESC
    LIMIT ? OFFSET ?
  `;

  return db.prepare(sql).all(...params, limit, offset).map((row) => ({
    ...row,
    transcript: undefined,
    deviations: row.deviations ? JSON.parse(row.deviations) : [],
  }));
}
