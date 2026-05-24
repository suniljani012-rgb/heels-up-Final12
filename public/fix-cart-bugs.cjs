const fs = require('fs');

// 1. Fix cart.js
let cartJs = fs.readFileSync('js/cart.js', 'utf8');
cartJs = cartJs.replace(/FREE_SHIP_THRESHOLD = 499/, 'FREE_SHIP_THRESHOLD = 799');
fs.writeFileSync('js/cart.js', cartJs);
console.log('Fixed js/cart.js');

// 2. Fix checkout.html
let checkout = fs.readFileSync('checkout.html', 'utf8');
checkout = checkout.replace(/FREE_SHIP = 499/, 'FREE_SHIP = 799');
fs.writeFileSync('checkout.html', checkout);
console.log('Fixed checkout.html');

// 3. Fix cart.html
let cartHtml = fs.readFileSync('cart.html', 'utf8');
// Fix shipping threshold and fee
cartHtml = cartHtml.replace(/const freeShipThresh = 79900;/, 'const freeShipThresh = 799;');
cartHtml = cartHtml.replace(/subtotal >= freeShipThresh \? 0 : 6000;/, 'subtotal >= freeShipThresh ? 0 : 49;');

// Fix the onclick attributes
cartHtml = cartHtml.replace(/onclick="updateQty\(\$\{i\}, -1\)"/g, 'onclick="updateQty(\'${item.key}\', ${item.qty - 1})"');
cartHtml = cartHtml.replace(/onclick="updateQty\(\$\{i\}, 1\)"/g, 'onclick="updateQty(\'${item.key}\', ${item.qty + 1})"');
cartHtml = cartHtml.replace(/onclick="removeItem\(\$\{i\}\)"/g, 'onclick="removeItem(\'${item.key}\')"');
cartHtml = cartHtml.replace(/\$\{qty\}/g, '${item.qty}');

// Fix the window.updateQty and window.removeItem functions
cartHtml = cartHtml.replace(/window\.updateQty = function \([^)]*\)\s*\{[\s\S]*?renderCart\(\);\s*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*\};/g, 
`window.updateQty = function (key, newQty) {
    if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.updateQty(key, newQty);
        cart = HeelsUpCart.getCart();
    }
    renderCart();
};`);

cartHtml = cartHtml.replace(/window\.removeItem = function \([^)]*\)\s*\{[\s\S]*?renderCart\(\);\s*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*\};/g, 
`window.removeItem = function (key) {
    if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.removeItem(key);
        cart = HeelsUpCart.getCart();
    }
    renderCart();
};`);

fs.writeFileSync('cart.html', cartHtml);
console.log('Fixed cart.html');
