const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const lines = content.split('\n');
let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inRegex = false;

for (let i = 0; i < lines.length; i++) {
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

    if (char === '/' && nextChar === '*') {
      inComment = true;
      j++;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      break; // Rest of the line is comment
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
      if (depth < 0) {
        console.log(`Negative depth at line ${i + 1}: depth is ${depth}`);
      }
    }
  }
}

console.log(`Final depth: ${depth}`);
