import { Router } from 'express';
import { getDb } from '../db/index.js';
import {
  processCall,
  getCallById,
  listCalls,
  getAgentKpis,
  upsertAgentKpis,
} from '../services/callService.js';
import {
  getOverview,
  getRecommendations,
  listAgents,
  getAgentDetail,
} from '../services/dashboardService.js';
import {
  fetchCallLogs,
  fetchCallById,
  fetchAgents,
  normalizeGhlCall,
  isGhlConfigured,
} from '../services/ghlClient.js';
import { DEFAULT_KPIS } from '../db/seedData.js';

const router = Router();

router.get('/health', (_req, res) => {
  const db = getDb();
  const callCount = db.prepare('SELECT COUNT(*) as c FROM calls').get().c;
  res.json({
    status: 'ok',
    mockMode: process.env.MOCK_MODE === 'true',
    ghlConnected: isGhlConfigured(),
    callCount,
    dataSource: callCount > 0 && process.env.MOCK_MODE !== 'true' ? 'live' : callCount > 0 ? 'seeded' : 'empty',
    timestamp: new Date().toISOString(),
  });
});

router.get('/dashboard/overview', (_req, res) => {
  res.json(getOverview());
});

router.get('/dashboard/recommendations', (req, res) => {
  res.json({ recommendations: getRecommendations(req.query.agentId) });
});

router.get('/agents', (_req, res) => {
  res.json({ agents: listAgents() });
});

router.get('/agents/:id', (req, res) => {
  const agent = getAgentDetail(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

router.get('/agents/:id/kpis', (req, res) => {
  const kpis = getAgentKpis(req.params.id).map((k) => ({
    ...k,
    keywords: JSON.parse(k.keywords || '[]'),
    required: !!k.required,
  }));
  res.json({ kpis });
});

router.put('/agents/:id/kpis', (req, res) => {
  const { kpis } = req.body;
  if (!Array.isArray(kpis)) {
    return res.status(400).json({ error: 'kpis array required' });
  }
  const updated = upsertAgentKpis(req.params.id, kpis);
  res.json({
    kpis: updated.map((k) => ({
      ...k,
      keywords: JSON.parse(k.keywords || '[]'),
      required: !!k.required,
    })),
  });
});

router.get('/calls', (req, res) => {
  const calls = listCalls({
    agentId: req.query.agentId,
    from: req.query.from,
    to: req.query.to,
    minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : 50,
    offset: req.query.offset ? Number(req.query.offset) : 0,
  });
  res.json({ calls });
});

router.get('/calls/:id', (req, res) => {
  const call = getCallById(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
});

router.post('/calls/ingest', (req, res) => {
  try {
    const result = processCall(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function syncAgentsFromGhl(db, locationId) {
  const agents = await fetchAgents(locationId);
  for (const raw of agents) {
    const id = raw.id || raw.agentId;
    if (!id) continue;

    db.prepare(`
      INSERT OR IGNORE INTO agents (id, name, location_id, script_summary, agent_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      raw.name || raw.agentName || `Agent ${id.slice(-6)}`,
      locationId,
      raw.prompt || raw.description || 'Voice AI agent from GHL',
      'sales',
    );

    const hasKpis = db.prepare('SELECT COUNT(*) as c FROM kpis WHERE agent_id = ?').get(id).c;
    if (!hasKpis) {
      const ins = db.prepare(`
        INSERT INTO kpis (id, agent_id, name, weight, criteria, keywords, required)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const k of DEFAULT_KPIS.sales) {
        ins.run(k.id, id, k.name, k.weight, k.criteria, JSON.stringify(k.keywords), k.required ? 1 : 0);
      }
    }
  }
  return agents.length;
}

router.post('/sync/ghl', async (_req, res) => {
  if (!isGhlConfigured()) {
    return res.status(400).json({
      error: 'GHL credentials not configured',
      required: ['GHL_API_KEY', 'GHL_LOCATION_ID'],
    });
  }

  try {
    const db = getDb();
    const locationId = process.env.GHL_LOCATION_ID;
    const agentCount = await syncAgentsFromGhl(db, locationId);

    const rawCalls = await fetchCallLogs({ limit: 50 });
    const results = [];
    const skipped = [];

    for (const raw of rawCalls) {
      let normalized = normalizeGhlCall(raw);

      if (normalized.transcript.length === 1 && normalized.transcript[0].text.includes('pending')) {
        try {
          const detail = await fetchCallById(normalized.ghlCallId, locationId);
          normalized = normalizeGhlCall(detail);
        } catch {
          skipped.push({ id: normalized.ghlCallId, reason: 'no transcript' });
          continue;
        }
      }

      if (!normalized.agentId) {
        skipped.push({ id: normalized.ghlCallId, reason: 'no agentId' });
        continue;
      }

      const exists = db.prepare('SELECT id FROM calls WHERE ghl_call_id = ?').get(normalized.ghlCallId);
      if (exists) continue;

      const agentExists = db.prepare('SELECT id FROM agents WHERE id = ?').get(normalized.agentId);
      if (!agentExists) {
        db.prepare(`
          INSERT INTO agents (id, name, location_id, script_summary, agent_type)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          normalized.agentId,
          `Agent ${normalized.agentId.slice(-6)}`,
          locationId,
          'Synced from GHL call log',
          'sales',
        );
        const ins = db.prepare(`
          INSERT INTO kpis (id, agent_id, name, weight, criteria, keywords, required)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const k of DEFAULT_KPIS.sales) {
          ins.run(k.id, normalized.agentId, k.name, k.weight, k.criteria, JSON.stringify(k.keywords), k.required ? 1 : 0);
        }
      }

      const result = processCall({
        agentId: normalized.agentId,
        ghlCallId: normalized.ghlCallId,
        contactName: normalized.contactName,
        durationSeconds: normalized.durationSeconds,
        transcript: normalized.transcript,
        summary: normalized.summary,
        outcome: normalized.outcome,
      });
      results.push(result);
    }

    res.json({
      synced: results.length,
      agentsFound: agentCount,
      skipped,
      calls: results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
