const fs = require('fs');
const content = fs.readFileSync('c:/Users/Cyrix HealthCare/Desktop/other/heels-up-new/frontend/src/pages/Admin.tsx', 'utf8');

let braces = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') braces++;
    else if (char === '}') braces--;
  }
  
  if (i > 33 && braces <= 0) {
    console.log(`First time braces <= 0 is at line ${i + 1}: braces=${braces}`);
    console.log(`Context:`);
    for (let k = Math.max(0, i - 10); k <= Math.min(lines.length - 1, i + 5); k++) {
      console.log(`${k + 1}: ${lines[k]}`);
    }
    break;
  }
}
