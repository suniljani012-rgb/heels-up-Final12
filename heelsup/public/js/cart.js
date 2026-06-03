/**
 * HeelsUp — Cart Utility (js/cart.js)
 * Shared across all pages. Manages cart in localStorage.
 * Includes unified cart drawer rendering to sync UI across all templates.
 */
(function () {
    const CART_KEY = 'heelsup_cart';
    const FREE_SHIP_THRESHOLD = 799;

    function getCart() {
        try { 
            const arr = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); 
            return Array.isArray(arr) ? arr.filter(i => i && i.id && typeof i.price === 'number') : [];
        } catch { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event('cart:updated'));
        updateBadge();
        renderCartDrawerUI();
    }

    function addItem(product, qty, size) {
        qty = Math.max(1, parseInt(qty) || 1);
        const cart = getCart();
        const key = `${product.id}-${size || ''}`;
        const idx = cart.findIndex(i => i.key === key);
        if (idx >= 0) {
            cart[idx].qty += qty;
        } else {
            cart.push({
                key,
                id: product.id,
                name: product.name,
                price: product.price,
                original_price: product.original_price || null,
                image: (product.images && product.images[0]) || product.image_url || '',
                category: product.category || '',
                size: size || '',
                qty
            });
        }
        saveCart(cart);
        return true;
    }

    function removeItem(key) {
        saveCart(getCart().filter(i => i.key !== key));
    }

    function updateQty(key, newQty) {
        const cart = getCart();
        const idx = cart.findIndex(i => i.key === key);
        if (idx >= 0) {
            if (newQty < 1) { cart.splice(idx, 1); }
            else { cart[idx].qty = newQty; }
            saveCart(cart);
        }
    }

    function clearCart() {
        localStorage.removeItem(CART_KEY);
        window.dispatchEvent(new Event('cart:updated'));
        updateBadge();
        renderCartDrawerUI();
    }

    function getCount() {
        return getCart().reduce((sum, i) => sum + i.qty, 0);
    }

    function getSubtotal() {
        return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
    }

    function getShipping(subtotal) {
        return (subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0) ? 0 : 49;
    }

    function updateBadge() {
        const count = getCount();
        document.querySelectorAll('#cart-count, #cart-cnt, #cart-drawer-count, .cart-badge, .cart-count, [data-cart-count]').forEach(el => {
            el.textContent = el.id === 'cart-drawer-count' ? `${count} item${count !== 1 ? 's' : ''}` : count;
            if (el.classList.contains('nav-badge') || el.id === 'cart-count' || el.id === 'cart-cnt') {
                el.style.display = count > 0 ? '' : 'none';
            }
        });
    }

    function esc(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderCartDrawerUI() {
        const body = document.getElementById('cart-body') || document.getElementById('cart-body-el');
        const foot = document.getElementById('cart-footer') || document.getElementById('cart-foot-el');
        if (!body) return;

        const items = getCart();
        const subtotal = getSubtotal();

        const cntEl = document.getElementById('cart-head-cnt') || document.getElementById('cart-cnt');
        if (cntEl && cntEl.id !== 'cart-cnt') cntEl.textContent = items.length ? `(${items.length})` : '';

        const drawerCount = document.getElementById('cart-drawer-count');
        if (drawerCount) drawerCount.textContent = `${getCount()} item${getCount() !== 1 ? 's' : ''}`;

        if (!items.length) {
            body.innerHTML = `
                <div class="cart-empty-state" style="text-align:center;padding:40px 20px">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 14px auto;opacity:0.25;display:block;">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"></path>
                    </svg>
                    <p style="margin-bottom:12px;color:var(--text-3);opacity:0.6;">Your bag is empty</p>
                    <button class="btn btn-primary btn-sm btn-pill" onclick="if(window.closeCart)window.closeCart(); else if(document.getElementById('cart-close-btn'))document.getElementById('cart-close-btn').click(); else if(document.getElementById('cart-cls-btn'))document.getElementById('cart-cls-btn').click();">Start Shopping</button>
                </div>
            `;
            if (foot) foot.style.display = 'none';
            return;
        }

        body.innerHTML = items.map(it => {
            const img = it.image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70';
            return `
                <div class="cart-item" style="display:flex;gap:15px;padding:15px 0;border-bottom:1px solid var(--border, #e2e8f0)">
                    <img class="cart-item-img" src="${img}" alt="${esc(it.name)}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.src=''">
                    <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between">
                        <div>
                            <div class="ci-name" style="font-weight:600;font-size:14px;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.name)}</div>
                            <div class="ci-meta" style="font-size:12px;color:var(--text-3);margin-top:2px">${it.size ? 'Size: ' + esc(it.size) + ' · ' : ''} ₹${it.price.toLocaleString('en-IN')} each</div>
                        </div>
                        <div class="ci-qty" style="display:flex;align-items:center;gap:10px;margin-top:6px">
                            <button class="qty-btn" style="width:24px;height:24px;border-radius:4px;border:1px solid var(--border);background:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" onclick="HeelsUpCart.updateQty('${it.key}', ${it.qty - 1})"><i class="fa-solid fa-minus" style="font-size:.65rem"></i></button>
                            <span class="qty-val" style="font-size:13px;font-weight:600">${it.qty}</span>
                            <button class="qty-btn" style="width:24px;height:24px;border-radius:4px;border:1px solid var(--border);background:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" onclick="HeelsUpCart.updateQty('${it.key}', ${it.qty + 1})"><i class="fa-solid fa-plus" style="font-size:.65rem"></i></button>
                            <button class="ci-remove" style="border:none;background:none;color:var(--danger, #ef4444);cursor:pointer;margin-left:auto;font-size:13px" onclick="HeelsUpCart.removeItem('${it.key}')" aria-label="Remove Item">
                                <i class="fa-solid fa-trash-can"></i> Remove
                            </button>
                        </div>
                    </div>
                    <div class="ci-price" style="font-weight:700;font-size:14px;color:var(--text-1)">₹${(it.price * it.qty).toLocaleString('en-IN')}</div>
                </div>
            `;
        }).join('');

        const subtotalEl = document.getElementById('cart-subtotal') || document.getElementById('cart-subtotal-val');
        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

        const totalEl = document.getElementById('cart-total') || document.getElementById('cart-total-val');
        if (totalEl) totalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

        const shipNote = document.getElementById('cart-ship-note');
        if (shipNote) {
            const freeAt = FREE_SHIP_THRESHOLD, left = freeAt - subtotal;
            shipNote.innerHTML = left > 0 
                ? `Add ₹${left.toLocaleString('en-IN')} more for <strong>FREE shipping</strong> 🚚` 
                : '<i class="fa-solid fa-circle-check"></i> You qualify for FREE shipping!';
        }

        if (foot) foot.style.display = 'block';
    }

    // Initialize badge and drawer on load
    document.addEventListener('DOMContentLoaded', () => {
        updateBadge();
        renderCartDrawerUI();
    });
    
    window.addEventListener('storage', e => { 
        if (e.key === CART_KEY) {
            updateBadge();
            renderCartDrawerUI();
        } 
    });

    window.addEventListener('cart:updated', () => {
        renderCartDrawerUI();
    });

    window.HeelsUpCart = { getCart, addItem, removeItem, updateQty, clearCart, getCount, getSubtotal, getShipping, updateBadge, render: renderCartDrawerUI };
})();