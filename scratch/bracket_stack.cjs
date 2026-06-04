const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const stack = [];
let inString = false;
let stringChar = '';
let inComment = false;

const lines = content.split('\n');

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

    if (char === '{' || char === '(' || char === '[') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === '}' || char === ')' || char === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched closing ${char} at line ${i + 1}:${j + 1}`);
        continue;
      }
      const top = stack[stack.length - 1];
      const match = (top.char === '{' && char === '}') ||
                    (top.char === '(' && char === ')') ||
                    (top.char === '[' && char === ']');
      if (match) {
        stack.pop();
      } else {
        console.log(`Mismatched closing ${char} at line ${i + 1}:${j + 1} (expected match for ${top.char} from line ${top.line}:${top.col})`);
      }
    }
  }
}

console.log(`Remaining open brackets in stack: ${stack.length}`);
for (const open of stack) {
  console.log(`  Open ${open.char} at line ${open.line}:${open.col}`);
}
