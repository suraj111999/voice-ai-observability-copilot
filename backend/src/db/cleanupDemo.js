import dotenv from 'dotenv';
import { getDb } from './index.js';

dotenv.config();

const DEMO_AGENT_IDS = [
  'agent_sales_demo',
  'agent_support_demo',
  'agent_booking_demo',
];

const db = getDb();

const placeholders = DEMO_AGENT_IDS.map(() => '?').join(',');

const demoCallIds = db
  .prepare(`SELECT id FROM calls WHERE agent_id IN (${placeholders})`)
  .all(...DEMO_AGENT_IDS)
  .map((r) => r.id);

if (demoCallIds.length) {
  const callPlaceholders = demoCallIds.map(() => '?').join(',');
  db.prepare(`DELETE FROM use_actions WHERE call_id IN (${callPlaceholders})`).run(...demoCallIds);
  db.prepare(`DELETE FROM analyses WHERE call_id IN (${callPlaceholders})`).run(...demoCallIds);
  db.prepare(`DELETE FROM calls WHERE id IN (${callPlaceholders})`).run(...demoCallIds);
}

db.prepare(`DELETE FROM recommendations WHERE agent_id IN (${placeholders})`).run(...DEMO_AGENT_IDS);
db.prepare(`DELETE FROM kpis WHERE agent_id IN (${placeholders})`).run(...DEMO_AGENT_IDS);
db.prepare(`DELETE FROM agents WHERE id IN (${placeholders})`).run(...DEMO_AGENT_IDS);

const remaining = {
  agents: db.prepare('SELECT COUNT(*) as c FROM agents').get().c,
  calls: db.prepare('SELECT COUNT(*) as c FROM calls').get().c,
};

console.log('Removed demo agents:', DEMO_AGENT_IDS.join(', '));
console.log('Remaining:', remaining);
