const fs = require('fs');
const content = fs.readFileSync('c:/Users/Cyrix HealthCare/Desktop/other/heels-up-new/frontend/src/pages/Admin.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;
let lines = content.split('\n');

// We want to track where brace count goes out of balance.
// A simpler way: parse and find which functions / blocks are not closed.
// Let's print brace changes by line.
let brace_history = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') braces++;
    else if (char === '}') braces--;
  }
  brace_history.push({ lineNum: i + 1, braces, line });
}

console.log(`Final brace count: ${braces}`);
console.log(`Lines where braces count went negative or ended up:`);
let min_braces = 0;
for (let h of brace_history) {
  if (h.braces < 0) {
    console.log(`Line ${h.lineNum}: braces=${h.braces} | ${h.line.trim()}`);
  }
}

// Let's print the last few lines brace counts
console.log("Last 20 lines:");
for (let i = Math.max(0, brace_history.length - 20); i < brace_history.length; i++) {
  const h = brace_history[i];
  console.log(`Line ${h.lineNum} (braces=${h.braces}): ${h.line.trim()}`);
}
