const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
code = code.replace(/return json\(\{\s*error:\s*"Payment gateway error\. Please try again\.",\s*detail:\s*t\s*\}, 502\);/, 
    'return json({ error: "Payment gateway error: " + t, detail: t }, 502);');
fs.writeFileSync('index.js', code);
console.log('Updated index.js to surface Razorpay error');
