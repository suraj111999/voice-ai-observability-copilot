import dotenv from 'dotenv';
import { getDb } from './index.js';
import { DEMO_AGENTS, DEMO_CALLS, DEFAULT_KPIS } from './seedData.js';
import { processCall } from '../services/callService.js';

dotenv.config();

const db = getDb();

console.log('Seeding database...');

for (const agent of DEMO_AGENTS) {
  db.prepare(`
    INSERT OR REPLACE INTO agents (id, name, location_id, script_summary, agent_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(agent.id, agent.name, agent.location_id, agent.script_summary, agent.agent_type);

  db.prepare('DELETE FROM kpis WHERE agent_id = ?').run(agent.id);
  const kpis = DEFAULT_KPIS[agent.agent_type] || DEFAULT_KPIS.sales;
  const ins = db.prepare(`
    INSERT INTO kpis (id, agent_id, name, weight, criteria, keywords, required)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const k of kpis) {
    ins.run(k.id, agent.id, k.name, k.weight, k.criteria, JSON.stringify(k.keywords), k.required ? 1 : 0);
  }
}

db.prepare('DELETE FROM use_actions').run();
db.prepare('DELETE FROM recommendations').run();
db.prepare('DELETE FROM analyses').run();
db.prepare('DELETE FROM calls').run();

for (const call of DEMO_CALLS) {
  processCall({
    agentId: call.agentId,
    contactName: call.contactName,
    durationSeconds: call.durationSeconds,
    transcript: call.transcript,
    summary: call.summary,
    outcome: call.outcome,
  });
}

console.log(`Seeded ${DEMO_AGENTS.length} agents and ${DEMO_CALLS.length} calls.`);
