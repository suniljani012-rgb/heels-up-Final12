const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const lines = content.split('\n');
let inString = false;
let stringChar = '';
let inComment = false;

for (let i = 698; i < 715; i++) {
  const line = lines[i];
  console.log(`\nLine ${i + 1}: ${line}`);
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];

    if (inComment) {
      if (char === '*' && nextChar === '/') {
        inComment = false;
        j++;
      }
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inComment = true;
      j++;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      console.log(`  Char ${j}: // -> COMMENT BREAK`);
      break;
    }

    if (inString) {
      if (char === stringChar && line[j - 1] !== '\\') {
        inString = false;
        console.log(`  Char ${j}: ${char} -> EXIT STRING`);
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      console.log(`  Char ${j}: ${char} -> ENTER STRING (char: ${stringChar})`);
    }
  }
}
