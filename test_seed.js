import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files = fs.readdirSync(d1Dir);
const dbFile = files.find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
console.log('DB File:', dbFile);
const dbPath = path.join(d1Dir, dbFile);

async function executeD1Query(command) {
    try {
        const db = new DatabaseSync(dbPath);
        const isWrite = /^\s*(insert|update|delete|create|drop|alter|replace)/i.test(command);
        console.log('Query:', command.substring(0, 30), 'isWrite:', isWrite);
        let results = [];
        let changes = 0;
        let lastInsertRowid = null;
        
        const stmt = db.prepare(command);
        if (isWrite) {
            const res = stmt.run();
            changes = res.changes;
            lastInsertRowid = res.lastInsertRowid;
        } else {
            results = stmt.all();
            results = results.map(r => ({ ...r }));
        }
        
        return [
            {
                results: results,
                success: true,
                meta: {
                    changes: changes,
                    last_row_id: lastInsertRowid
                }
            }
        ];
    } catch (err) {
        throw new Error(`D1 query failed: ${err.message}`);
    }
}

try {
    await executeD1Query(
        `CREATE TABLE IF NOT EXISTS staff (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          role TEXT DEFAULT 'staff',
          notes TEXT,
          permissions TEXT DEFAULT '[]',
          invite_sent_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`
    );
    await executeD1Query(
        "INSERT OR IGNORE INTO users (id, first_name, email, password_hash, role, email_verified, created_at, updated_at) VALUES (1, 'Admin', 'admin@heelsup.in', 'dummyhash', 'admin', 1, datetime('now'), datetime('now'))"
    );
    await executeD1Query(
        "INSERT OR IGNORE INTO staff (user_id, role, notes, permissions) VALUES (1, 'admin', 'Super Administrator', '[\"all\"]')"
    );
    console.log('Seeding completed successfully!');
} catch (e) {
    console.error('Seeding failed:', e.message);
}
