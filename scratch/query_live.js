const API_BASE = 'https://heelsupfinal1.heelsup.workers.dev';
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJzdW5pbGphbmkwMTJAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwic2Vzc2lvbiI6InRlc3QiLCJuYW1lIjoiU3VuaWwifQ.AEJtC_RnXRYp0vCDMR6xhIGz9rldSHvYz1D3pl0vY2U";

async function queryLive() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sql: "SELECT name FROM sqlite_master WHERE type='table'"
            })
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Tables:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
queryLive();
