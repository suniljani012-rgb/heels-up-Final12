import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const baseUrl = 'http://localhost:8787';
let jwtSecret = 'super_secret_for_e2e_testing_suite_heelup';

// Load JWT secret if .dev.vars exists
const devVarsPath = path.resolve('.dev.vars');
if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
            const key = trimmed.slice(0, index).trim();
            let val = trimmed.slice(index + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (key === 'JWT_SECRET') {
                jwtSecret = val;
            }
        }
    }
}

function signTestToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const iat = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({ ...payload, iat, exp: iat + 86400 * 7 })).toString('base64url');
    const msg = `${header}.${body}`;
    const sig = crypto.createHmac('sha256', jwtSecret).update(msg).digest('base64url');
    return `${msg}.${sig}`;
}

async function runVerification() {
    console.log('Starting Wrangler Dev Server for Verification...');
    const child = spawn('npx', ['wrangler@4.110.0', 'dev', '--port', '8787'], {
        shell: true,
        stdio: 'ignore' // We don't need output spam
    });

    // Wait for the server to become responsive
    let attempts = 15;
    let ready = false;
    while (attempts > 0) {
        try {
            const res = await fetch(`${baseUrl}/api/colors`, { method: 'GET' });
            if (res.status === 200 || res.status === 404 || res.status === 401) {
                ready = true;
                break;
            }
        } catch (e) {}
        attempts--;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!ready) {
        child.kill();
        console.error('Wrangler dev server failed to start');
        process.exit(1);
    }

    console.log('Wrangler dev server is ready! Commencing requests...');

    const token = signTestToken({ id: 1, role: 'admin', email: 'admin@heelsup.in' });
    const tests = [
        {
            name: 'POST /api/admin/query without auth header',
            headers: { 'Content-Type': 'application/json' },
            body: { sql: 'SELECT 1;' }
        },
        {
            name: 'POST /api/admin/query with valid admin JWT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: { sql: 'SELECT 1;' }
        },
        {
            name: 'POST /api/admin/query with SQL injection payload',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: { sql: 'DROP TABLE users;' }
        }
    ];

    let all404 = true;
    for (const t of tests) {
        try {
            const res = await fetch(`${baseUrl}/api/admin/query`, {
                method: 'POST',
                headers: t.headers,
                body: JSON.stringify(t.body)
            });
            console.log(`- ${t.name}: Status = ${res.status}`);
            if (res.status !== 404) {
                all404 = false;
            }
        } catch (err) {
            console.error(`- ${t.name}: Error =`, err.message);
            all404 = false;
        }
    }

    console.log('Stopping Wrangler Dev Server...');
    child.kill('SIGINT');

    if (all404) {
        console.log('VERIFICATION SUCCESSFUL: All /api/admin/query requests returned 404 Not Found.');
        process.exit(0);
    } else {
        console.error('VERIFICATION FAILED: Some /api/admin/query requests did not return 404.');
        process.exit(1);
    }
}

runVerification();
