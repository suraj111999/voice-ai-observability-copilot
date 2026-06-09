import { Router } from 'express';
import { getDb } from '../db/index.js';
import { processCall } from '../services/callService.js';
import { DEFAULT_KPIS } from '../db/seedData.js';
import { parseTranscriptFromPayload, extractWebhookFields } from '../services/transcriptParser.js';

const router = Router();

function ensureAgent(db, fields, body) {
  let agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(fields.agentId);

  if (!agent) {
    db.prepare(`
      INSERT INTO agents (id, name, location_id, script_summary, agent_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      fields.agentId,
      fields.agentName || body.agentName || `Voice AI Agent`,
      fields.locationId || process.env.GHL_LOCATION_ID,
      body.scriptSummary || 'Synced from GHL Voice AI',
      'sales',
    );

    const kpis = DEFAULT_KPIS.sales;
    const ins = db.prepare(`
      INSERT INTO kpis (id, agent_id, name, weight, criteria, keywords, required)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const k of kpis) {
      ins.run(k.id, fields.agentId, k.name, k.weight, k.criteria, JSON.stringify(k.keywords), k.required ? 1 : 0);
    }
  }

  return agent;
}

/**
 * GHL Workflow "Transcript Generated" → Custom Webhook
 * Also accepts direct API-style JSON payloads.
 */
router.post('/ghl/transcript', (req, res) => {
  try {
    const body = req.body;
    const fields = extractWebhookFields(body);

    if (!fields.agentId) {
      return res.status(400).json({
        error: 'agentId required. Map voice_ai_agent_id or agentId in your GHL workflow webhook.',
        hint: 'Use Custom Webhook action after Transcript Generated trigger.',
      });
    }

    const db = getDb();
    ensureAgent(db, fields, body);

    const callId = fields.callId || `wf_${Date.now()}`;
    const exists = db.prepare('SELECT id FROM calls WHERE ghl_call_id = ?').get(callId);
    if (exists) {
      return res.json({ id: exists.id, duplicate: true });
    }

    const transcript = parseTranscriptFromPayload(body);
    if (!transcript.length) {
      return res.status(400).json({
        error: 'No transcript found in payload.',
        hint: 'Include full_transcript, transcript array, or {{full transcript}} merge field in webhook body.',
      });
    }

    const result = processCall({
      agentId: fields.agentId,
      ghlCallId: callId,
      contactName: fields.contactName,
      durationSeconds: fields.durationSeconds,
      transcript,
      summary: fields.summary,
      outcome: fields.outcome,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
