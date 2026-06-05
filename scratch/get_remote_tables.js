import { spawnSync } from 'child_process';
import fs from 'fs';

const pathEnv = "C:\\Users\\Cyrix HealthCare\\Desktop\\heels-up-new\\heels-up-Final\\node-v22.14.0-win-x64;" + process.env.PATH;
const res = spawnSync('npx.cmd', [
  'wrangler', 'd1', 'execute', 'heelsup-live',
  '--remote',
  '--command="SELECT name FROM sqlite_master WHERE type=\'table\'"',
  '--json'
], {
  env: { ...process.env, PATH: pathEnv },
  encoding: 'utf-8',
  shell: true
});

fs.writeFileSync('scratch/tables.json', JSON.stringify(res, null, 2));
console.log("Error:", res.error);
console.log("Status:", res.status);
