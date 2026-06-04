const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const line = content.split('\n')[707];
let inString = false;
let stringChar = '';

console.log(`Line length: ${line.length}`);
for (let j = 0; j < line.length; j++) {
  const char = line[j];
  if (inString) {
    if (char === stringChar && line[j - 1] !== '\\') {
      inString = false;
      console.log(`Char ${j}: ${char} -> EXIT STRING`);
    } else {
      // inside string
    }
  } else {
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      console.log(`Char ${j}: ${char} -> ENTER STRING (char: ${stringChar})`);
    }
  }
}
console.log(`Final inString: ${inString}`);
