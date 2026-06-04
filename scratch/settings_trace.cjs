const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const lines = content.split('\n');
let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;

for (let i = 890; i < 996; i++) {
  const line = lines[i];
  
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

    if (!inString && char === '/' && nextChar === '*') {
      inComment = true;
      j++;
      continue;
    }

    if (!inString && char === '/' && nextChar === '/') {
      break;
    }

    if (inString) {
      if (char === stringChar && line[j - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
    }
  }
  console.log(`Line ${i + 1}: depth is ${depth} (${line.trim()})`);
}
