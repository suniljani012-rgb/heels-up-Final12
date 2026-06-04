const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const lines = content.split('\n');
let depth = 3; // base depth at start of JSX is 3
let inString = false;
let stringChar = '';
let inComment = false;

for (let i = 859; i < lines.length; i++) {
  const line = lines[i];
  const oldDepth = depth;

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

  if (depth !== oldDepth) {
    console.log(`Line ${i + 1}: depth changed from ${oldDepth} to ${depth} (${line.trim()})`);
  }
}
