const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html') && !f.startsWith('admin'));

let updated = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/HeelsUpCart\.getItems\(\)/g, 'HeelsUpCart.getCart()');
    content = content.replace(/HeelsUpCart\.getTotal\(\)/g, 'HeelsUpCart.getSubtotal()');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed HeelsUpCart methods in: ' + file);
        updated++;
    }
}
console.log('Total files updated: ' + updated);
