const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Admin.tsx', 'utf8');

const lines = content.split('\n');
let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;

const tabs = [
  'dashboard', 'pos', 'products', 'orders', 'categories',
  'coupons', 'banners', 'reviews', 'pages', 'staff', 'settings'
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  for (const tab of tabs) {
    if (line.includes(`activeTab === '${tab}' && (`)) {
      console.log(`Line ${i + 1} START of ${tab}: depth is ${depth}`);
    }
  }

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

  for (const tab of tabs) {
    if (line.includes(`activeTab === '${tab}' && (`)) {
      // Print depth after processing the start line
    }
  }
}
console.log(`End of file depth: ${depth}`);
