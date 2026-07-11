// ============================================================
// HeelsUp — D1 Database Utility Helpers
// backend/src/utils/db.js
// Cloudflare D1 (SQLite) — always use prepared statements
// ============================================================

/**
 * Run a single SELECT and return all rows.
 * @param {D1Database} db
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
export async function query(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const result = await stmt.bind(...params).all();
    return result.results || [];
}

/**
 * Run a SELECT and return the first row (or null).
 * @param {D1Database} db
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any|null>}
 */
export async function queryOne(db, sql, params = []) {
    const stmt = db.prepare(sql);
    return await stmt.bind(...params).first() || null;
}

/**
 * Run an INSERT / UPDATE / DELETE statement.
 * Returns the D1 result: { success, meta: { last_row_id, changes } }
 * @param {D1Database} db
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<D1Result>}
 */
export async function run(db, sql, params = []) {
    const stmt = db.prepare(sql);
    return await stmt.bind(...params).run();
}

/**
 * Run multiple statements in a batch (atomic transaction in D1).
 * @param {D1Database} db
 * @param {Array<{sql: string, params: any[]}>} statements
 * @returns {Promise<D1Result[]>}
 */
export async function batch(db, statements) {
    const prepared = statements.map(({ sql, params = [] }) =>
        db.prepare(sql).bind(...params)
    );
    return await db.batch(prepared);
}

/**
 * Paginated query helper.
 * Returns { rows, total, page, limit, pages }
 * @param {D1Database} db
 * @param {string} sql    - Base SELECT query WITHOUT LIMIT/OFFSET
 * @param {any[]} params  - Params for the base query
 * @param {number} page   - 1-indexed
 * @param {number} limit  - Rows per page
 * @param {string} countSql  - Optional custom COUNT query
 * @param {any[]} countParams
 */
export async function paginate(db, sql, params = [], page = 1, limit = 20, countSql = null, countParams = null) {
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (page - 1) * limit;

    // Derive count query from main query if not provided
    const cSql = countSql || `SELECT COUNT(*) as n FROM (${sql}) _c`;
    const cParams = countParams || params;

    const [rows, countRow] = await Promise.all([
        query(db, `${sql} LIMIT ? OFFSET ?`, [...params, limit, offset]),
        queryOne(db, cSql, cParams),
    ]);

    const total = countRow?.n || 0;
    const pages = Math.ceil(total / limit);

    return { rows, total, page, limit, pages };
}

/**
 * Current UTC datetime string for D1 (SQLite format).
 * @returns {string}  e.g. "2025-05-19 10:30:00"
 */
export function now() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Transparent KV get with D1 fallback.
 * @param {object} env - Cloudflare worker env
 * @param {string} key - KV key to fetch
 * @returns {Promise<string|null>}
 */
export async function kvGet(env, key) {
    if (env.KV) {
        try {
            const val = await env.KV.get(key);
            if (val) return val;
        } catch (kvErr) {
            console.warn(`KV.get failed for key "${key}", falling back to D1:`, kvErr);
        }
    }
    try {
        const row = await env.DB.prepare(
            'SELECT value FROM d1_kv WHERE key = ? AND expires_at > ?'
        ).bind(key, new Date().toISOString()).first();
        return row ? row.value : null;
    } catch (dbErr) {
        console.error(`D1 KV fallback get failed for key "${key}":`, dbErr);
        return null;
    }
}

/**
 * Transparent KV put with D1 fallback.
 * @param {object} env - Cloudflare worker env
 * @param {string} key - KV key to write
 * @param {string} value - Value to write
 * @param {number} ttlSeconds - Expiration TTL in seconds (default 1 day)
 */
export async function kvPut(env, key, value, ttlSeconds = 86400) {
    let kvWritten = false;
    if (env.KV) {
        try {
            await env.KV.put(key, value, { expirationTtl: Math.max(60, ttlSeconds) });
            kvWritten = true;
        } catch (kvErr) {
            console.warn(`KV.put failed for key "${key}", writing to D1:`, kvErr);
        }
    }
    try {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        await env.DB.prepare(
            'INSERT OR REPLACE INTO d1_kv (key, value, expires_at) VALUES (?, ?, ?)'
        ).bind(key, value, expiresAt).run();
    } catch (dbErr) {
        console.error(`D1 KV fallback put failed for key "${key}":`, dbErr);
        if (!kvWritten) throw dbErr;
    }
}

/**
 * Transparent KV delete with D1 fallback.
 * @param {object} env - Cloudflare worker env
 * @param {string} key - KV key to delete
 */
export async function kvDelete(env, key) {
    if (env.KV) {
        try {
            await env.KV.delete(key);
        } catch (kvErr) {
            console.warn(`KV.delete failed for key "${key}":`, kvErr);
        }
    }
    try {
        await env.DB.prepare('DELETE FROM d1_kv WHERE key = ?').bind(key).run();
    } catch (dbErr) {
        console.error(`D1 KV fallback delete failed for key "${key}":`, dbErr);
    }
}