const fs = require('fs');
let content = fs.readFileSync('checkout.html', 'utf8');
content = content.replace(/'\/api\/payments\/razorpay'/g, "'/api/orders/initiate'");
fs.writeFileSync('checkout.html', content);
console.log('Fixed checkout.html Razorpay route');
