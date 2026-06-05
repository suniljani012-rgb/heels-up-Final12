import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/7374fef25ccac9ec6b58abb7cb382bb3da92c78f756d4d4484cde648ac3d59cf.sqlite');
const db = new DatabaseSync(dbPath);

console.log('--- Database Tables ---');
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(tables.map(t => t.name));
} catch (e) {
  console.error(e.message);
}
