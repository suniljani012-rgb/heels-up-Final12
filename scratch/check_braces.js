const fs = require('fs');
const content = fs.readFileSync('c:/Users/Cyrix HealthCare/Desktop/other/heels-up-new/frontend/src/pages/Admin.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') braces++;
  else if (char === '}') braces--;
  else if (char === '(') parens++;
  else if (char === ')') parens--;
  else if (char === '[') brackets++;
  else if (char === ']') brackets--;

  if (braces < 0) {
    console.log(`Extra close brace } at index ${i}, character context: ${content.substring(i - 20, i + 20)}`);
    // break;
  }
}

console.log(`Final counts: braces=${braces}, parens=${parens}, brackets=${brackets}`);
