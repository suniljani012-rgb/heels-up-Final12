import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

// Setup PATH env so child processes can locate node/npm/npx
process.env.PATH = "C:\\Users\\Cyrix HealthCare\\AppData\\Local\\node-portable\\node-v22.16.0-win-x64;" + process.env.PATH;
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_TELEMETRY = '0';

const baseUrl = 'http://localhost:8787';
const registeredTests = [];
let jwtSecret = 'super_secret_for_e2e_testing_suite_heelup';

export function addTest(tier, description, fn) {
    registeredTests.push({ tier, description, fn });
}

export function signTestToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const iat = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({ ...payload, iat, exp: iat + 86400 * 7 })).toString('base64url');
    const msg = `${header}.${body}`;
    const sig = crypto.createHmac('sha256', jwtSecret).update(msg).digest('base64url');
    return `${msg}.${sig}`;
}

export function getAdminHeaders() {
    const token = signTestToken({ id: 1, role: 'admin', email: 'admin@heelsup.in' });
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

export async function executeD1Query(command) {
    try {
        let d1Dir = path.resolve('C:\\Users\\Public\\wrangler-persist\\v3\\d1\\miniflare-D1DatabaseObject');
        if (!fs.existsSync(d1Dir)) {
            d1Dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
        }
        const files = fs.readdirSync(d1Dir);
        const dbFile = files.find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
        if (!dbFile) {
            throw new Error('D1 local database file not found');
        }
        const dbPath = path.join(d1Dir, dbFile);
        const db = new DatabaseSync(dbPath);
        const isWrite = /^\s*(insert|update|delete|create|drop|alter|replace)/i.test(command);
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

function parseDevVars() {
    const filePath = path.resolve('.dev.vars');
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
            const key = trimmed.slice(0, index).trim();
            let val = trimmed.slice(index + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            } else if (val.startsWith("'") && val.endsWith("'")) {
                val = val.slice(1, -1);
            }
            vars[key] = val;
        }
    }
    return vars;
}

async function startWranglerDev() {
    console.log('Starting wrangler dev server on port 8787...');
    const child = spawn('npx', ['wrangler@4.110.0', 'dev', '--port', '8787', '--persist-to', 'C:\\Users\\Public\\wrangler-persist'], {
        shell: true,
        stdio: 'pipe'
    });

    child.stdout.on('data', (data) => {
        console.log(`[Wrangler Dev] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`[Wrangler Dev Error] ${data.toString().trim()}`);
    });

    // Wait for the server to become responsive
    let attempts = 15;
    while (attempts > 0) {
        try {
            const res = await fetch(`${baseUrl}/api/colors`, { method: 'GET' });
            if (res.status === 200 || res.status === 404 || res.status === 401) {
                console.log('Wrangler dev server is ready!');
                return child;
            }
        } catch (e) {
            // Server not ready yet
        }
        attempts--;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    child.kill();
    throw new Error('Failed to start wrangler dev server on port 8787 within timeout');
}

async function run() {
    console.log('=== HeelsUp E2E Test Suite Setup ===');

    // 1. Check / Create .dev.vars
    const devVarsPath = path.resolve('.dev.vars');
    if (!fs.existsSync(devVarsPath)) {
        console.log('.dev.vars not found. Creating from .dev.vars.example...');
        const exampleContent = fs.readFileSync(path.resolve('.dev.vars.example'), 'utf8');
        const customizedContent = exampleContent.replace(
            'JWT_SECRET=your_jwt_secret_at_least_32_chars',
            `JWT_SECRET=${jwtSecret}`
        );
        fs.writeFileSync(devVarsPath, customizedContent);
    } else {
        const vars = parseDevVars();
        if (vars.JWT_SECRET) {
            jwtSecret = vars.JWT_SECRET;
            console.log(`Loaded JWT_SECRET from existing .dev.vars`);
        }
    }

    // Clean local D1 database files to ensure clean E2E test runs
    try {
        const d1Dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
        if (fs.existsSync(d1Dir)) {
            const files = fs.readdirSync(d1Dir);
            for (const file of files) {
                if (file.endsWith('.sqlite') || file.endsWith('.sqlite-shm') || file.endsWith('.sqlite-wal')) {
                    fs.unlinkSync(path.join(d1Dir, file));
                }
            }
            console.log('Cleaned local D1 database files.');
        }
    } catch (e) {
        console.warn('Failed to clean local D1 database:', e.message);
    }

    // 2. Apply Migrations
    console.log('Applying D1 database migrations locally...');
    try {
        execSync('npx wrangler@4.110.0 d1 migrations apply DB --local --persist-to C:\\Users\\Public\\wrangler-persist', { stdio: 'inherit' });
    } catch (e) {
        console.error('Migration failed:', e.message);
    }

    // 3. Seed test admin user
    console.log('Seeding test admin user in local D1 DB...');
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
            `CREATE TABLE IF NOT EXISTS color_hex_mappings (
              color_name TEXT PRIMARY KEY,
              hex_code TEXT NOT NULL,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
            );`
        );
        await executeD1Query(
            "INSERT OR IGNORE INTO users (id, first_name, email, password_hash, role, email_verified, created_at, updated_at) VALUES (1, 'Admin', 'admin@heelsup.in', 'dummyhash', 'admin', 1, datetime('now'), datetime('now'))"
        );
        await executeD1Query(
            "INSERT OR IGNORE INTO staff (user_id, role, notes, permissions) VALUES (1, 'admin', 'Super Administrator', '[\"all\"]')"
        );
    } catch (e) {
        console.error('Seeding failed:', e.message);
    }

    // 4. Start Server
    let serverProcess;
    try {
        serverProcess = await startWranglerDev();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    // 5. Load all test cases
    console.log('Loading test suites...');
    await import('./tier1_feature_coverage.test.js');
    await import('./tier2_boundary_corner.test.js');
    await import('./tier3_cross_feature.test.js');
    await import('./tier4_real_world.test.js');
    await import('./refactor_checks.test.js');
    await import('./tier5_storefront.test.js');

    console.log(`Loaded ${registeredTests.length} test cases.`);

    // 6. Execute all tests
    let passed = 0;
    let failed = 0;
    const failures = [];

    console.log('\n=== Executing E2E Test Cases ===');
    for (let i = 0; i < registeredTests.length; i++) {
        const testCase = registeredTests[i];
        const testNum = i + 1;
        const label = `[Test #${testNum}] [Tier ${testCase.tier}] ${testCase.description}`;
        process.stdout.write(`${label} ... `);

        try {
            await testCase.fn();
            console.log('\x1b[32mPASSED\x1b[0m');
            passed++;
        } catch (err) {
            console.log('\x1b[31mFAILED\x1b[0m');
            console.error(`  \x1b[31mError:\x1b[0m ${err.message}`);
            failed++;
            failures.push({ label, error: err.message });
        }
    }

    // 7. Cleanup
    console.log('\nStopping wrangler dev server...');
    if (serverProcess) {
        serverProcess.kill('SIGINT');
    }

    // 8. Print Summary
    console.log('\n=== E2E Test Execution Summary ===');
    console.log(`Total test cases: ${registeredTests.length}`);
    console.log(`Passed: \x1b[32m${passed}\x1b[0m`);
    console.log(`Failed: \x1b[31m${failed}\x1b[0m`);

    if (failures.length > 0) {
        console.log('\n--- Failure Details ---');
        failures.forEach((f, index) => {
            console.log(`${index + 1}. ${f.label}`);
            console.log(`   Error: ${f.error}`);
        });
        process.exit(1);
    } else {
        console.log('\nAll E2E tests passed successfully!');
        process.exit(0);
    }
}

// Run the runner if invoked directly
if (process.argv[1] === import.meta.filename || path.basename(process.argv[1]) === 'runner.js') {
    run().catch(err => {
        console.error('Fatal error in runner:', err);
        process.exit(1);
    });
}
