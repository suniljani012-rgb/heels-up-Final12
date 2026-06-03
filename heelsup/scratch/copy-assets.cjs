const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Cyrix HealthCare\\Desktop\\All Heelsup\\heels-up-Final\\public';
const destDir = 'c:\\Users\\Cyrix HealthCare\\Desktop\\other\\heels-up-new\\heelsup\\public';

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            // Copy all non-HTML files (images, css, js, json, fonts)
            if (!entry.name.endsWith('.html')) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied asset: ${entry.name}`);
            }
        }
    }
}

// Copy top level non-HTML files first
const files = fs.readdirSync(srcDir, { withFileTypes: true });
for (let file of files) {
    if (file.isFile() && !file.name.endsWith('.html')) {
        const srcPath = path.join(srcDir, file.name);
        const destPath = path.join(destDir, file.name);
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied top-level asset: ${file.name}`);
    }
}

// Copy subdirectories (images, js, policy, etc.)
const dirs = ['images', 'js', 'policy', 'css', 'img'];
dirs.forEach(dir => {
    const srcSub = path.join(srcDir, dir);
    const destSub = path.join(destDir, dir);
    if (fs.existsSync(srcSub)) {
        copyDirRecursive(srcSub, destSub);
    }
});

console.log("All static assets copied successfully!");
