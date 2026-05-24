const fs = require('fs');

let cartHtml = fs.readFileSync('cart.html', 'utf8');

cartHtml = cartHtml.replace(/\.quantity/g, '.qty');

fs.writeFileSync('cart.html', cartHtml);
console.log('Fixed .quantity to .qty in cart.html');
