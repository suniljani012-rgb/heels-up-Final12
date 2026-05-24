const fs = require('fs');

let cartHtml = fs.readFileSync('cart.html', 'utf8');

cartHtml = cartHtml.replace(/window\.removeItem = function \(idx\) \{[\s\S]*?console\.error\([^)]*\);\s*\}\s*\};/g, 
`window.removeItem = function (key) {
    if (typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.removeItem(key);
        cart = HeelsUpCart.getCart();
    }
    if (cart.length === 0) {
        location.reload();
    } else {
        renderCart();
        toast('Item removed from bag', 'info');
    }
};`);

fs.writeFileSync('cart.html', cartHtml);
console.log('Fixed removeItem in cart.html');
