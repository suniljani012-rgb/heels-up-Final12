const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const publicDir = 'c:\\Users\\Cyrix HealthCare\\Desktop\\other\\heels-up-new\\heelsup\\public';

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    if (file.startsWith('admin') || file === 'print.html' || file === '404.html') {
        return;
    }

    const filePath = path.join(publicDir, file);
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(originalHtml);

    // 1. Remove obsolete layouts/elements that common-ui.js generates
    $('header').not('#navbar').remove();
    $('#header').not('#navbar').remove();
    $('.header').not('#navbar').remove();

    $('footer').not('.footer').remove();
    $('#footer').not('.footer').remove();

    // Remove cart drawers, mobile menus, overlays
    $('.drawer-overlay').remove();
    $('.drawer').remove();
    $('.mob-menu').remove();
    $('#mob-menu').remove();
    $('.mob-backdrop').remove();

    // Remove toast wrappers, loader, whatsapp, scroll-top
    $('.toast-wrap').remove();
    $('#toastWrap').remove();
    $('#toast-container').remove();
    $('#whatsapp-widget').remove();
    $('.whatsapp-btn').remove();
    $('.scroll-top').remove();
    $('#scroll-top').remove();
    $('.full-loader').remove();
    $('#hu-full-loader').remove();

    // Remove duplicate footer placeholders
    $('footer.footer').remove();

    // 2. Insert placeholders
    if ($('#navbar').length === 0) {
        $('body').prepend('<div id="navbar"></div>');
    }
    $('body').append('<footer class="footer"></footer>');

    // 3. Remove all script tags that import config, client, common-ui, cart, wishlist, and the page controller
    const pageName = file.replace('.html', '');
    $('script').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src.includes('config.js') ||
            src.includes('api-client.js') ||
            src.includes('common-ui.js') ||
            src.includes('cart.js') ||
            src.includes('wishlist.js') ||
            src.includes(`pages/${pageName}.js`)) {
            $(el).remove();
        }
    });

    // 4. Append correct script tags right before footer
    const correctScripts = `
    <!-- Core Config and API Client -->
    <script src="/js/core/config.js" defer></script>
    <script src="/js/core/api-client.js" defer></script>
    <script src="/js/core/common-ui.js" defer></script>
    
    <!-- State and Operations -->
    <script src="/js/cart.js" defer></script>
    <script src="/js/wishlist.js" defer></script>
    
    <!-- Page Controller -->
    <script src="/js/pages/${pageName}.js" defer></script>
`;
    
    $('footer.footer').before(correctScripts);

    // 5. Clean up duplicate scripts or styles inside body/head
    let hasCustomerTheme = false;
    let hasPageCss = false;

    $('link[rel="stylesheet"]').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('customer-theme.css')) {
            hasCustomerTheme = true;
        }
        if (href.includes(`pages/${pageName}.css`)) {
            hasPageCss = true;
        }
    });

    if (!hasCustomerTheme) {
        $('head').append('<link rel="stylesheet" href="/css/customer-theme.css">');
    }
    if (!hasPageCss && fs.existsSync(path.join(publicDir, 'css', 'pages', `${pageName}.css`))) {
        $('head').append(`<link rel="stylesheet" href="/css/pages/${pageName}.css">`);
    }

    // Write back
    fs.writeFileSync(filePath, $.html(), 'utf8');
    console.log(`Cleaned and updated HTML: ${file}`);
});

console.log("All HTML files cleaned and aligned successfully!");
