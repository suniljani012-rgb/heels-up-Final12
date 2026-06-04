const fs = require('fs');
const content = fs.readFileSync('c:/Users/Cyrix HealthCare/Desktop/other/heels-up-new/frontend/src/pages/Admin.tsx', 'utf8');

let braces = 0;
let lines = content.split('\n');

for (let i = 1770; i < 1830; i++) {
  const line = lines[i];
  let lineBraces = 0;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') { braces++; lineBraces++; }
    else if (char === '}') { braces--; lineBraces--; }
  }
  console.log(`Line ${i + 1} (braces count at end of line: ${braces}, net in line: ${lineBraces}): ${line.trim()}`);
}
