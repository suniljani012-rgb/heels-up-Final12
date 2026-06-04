const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Cyrix HealthCare\\Desktop\\All Heelsup\\heels-up\\public';
const destDir = 'c:\\Users\\Cyrix HealthCare\\Desktop\\other\\heels-up-new\\heelsup\\public';

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName),
                              path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
        console.log(`Copied: ${src} -> ${dest}`);
    }
}

console.log("Starting copy of original frontend files...");
copyRecursiveSync(srcDir, destDir);
console.log("Restore complete!");
