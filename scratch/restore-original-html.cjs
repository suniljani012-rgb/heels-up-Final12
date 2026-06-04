const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Cyrix HealthCare\\Desktop\\All Heelsup\\heels-up-Final\\public';
const destDir = 'c:\\Users\\Cyrix HealthCare\\Desktop\\other\\heels-up-new\\heelsup\\public';

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Restored original HTML: ${file}`);
});

console.log("All original HTML files restored successfully!");
