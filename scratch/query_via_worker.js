import { signJWT } from '../src/utils/jwt.js';

const secret = "heelsupjwtsecret2026!";
const payload = { id: 1, email: "admin@heelsup.com", role: "admin", name: "Admin" };
const token = await signJWT(payload, secret);
console.log("Token:", token);

const API_BASE = 'https://heelsupfinal1.heelsup.workers.dev';
try {
    const res = await fetch(`${API_BASE}/api/admin/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            sql: "SELECT id, first_name, email, role FROM users"
        })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
} catch (e) {
    console.error(e);
}
