import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || '/app/data';
const dbPath = path.join(dataDir, 'copilot.db');
// const dataDir = path.join(__dirname, '../../data');
// const dbPath = path.join(dataDir, 'copilot.db');

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(dataDir, { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}
