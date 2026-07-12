// src/utils/db-config.js
// ============================================================
// HeelsUp — Cloudflare D1 Database Configuration
// ============================================================
// This file stores the D1 database connection details.
// In production (Cloudflare Workers), D1 is accessed via env.DB binding.
// This config is used for scripts, migrations, and external API access.
// ============================================================

export const DB_CONFIG = {
  accountId:    '07c33c3fdd0e62844f6f1113fe2847f5',
  databaseName: 'heelsup-live',
  databaseId:   'e1421396-862d-4be9-bc68-72ce70b1644c',
  
  // API endpoint for Cloudflare D1 REST queries
  get apiEndpoint() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
  },
};

// Auth headers — requires X-Auth-Email + X-Auth-Key for this token type (cfk_ prefix)
// The actual token and email should come from environment variables, not hardcoded.
export function getAuthHeaders(env) {
  return {
    'X-Auth-Email': env.CF_AUTH_EMAIL || 'jaykarwani111@gmail.com',
    'X-Auth-Key':   env.CLOUDFLARE_API_TOKEN || env.CF_API_KEY,
    'Content-Type': 'application/json',
  };
}

// Helper: execute a raw SQL query against D1 via REST API (for external/script use)
export async function queryD1(sql, params = [], env = {}) {
  const headers = getAuthHeaders(env);
  const body = JSON.stringify({ sql, params });

  const res = await fetch(DB_CONFIG.apiEndpoint, {
    method: 'POST',
    headers,
    body,
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 API Error: ${data.errors?.[0]?.message || 'Unknown error'}`);
  }
  return data.result[0];
}
