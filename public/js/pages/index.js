(function () {
    'use strict';

    /* ==========================================================================
       DATA: LUXURY PRODUCTS DATABASE (API INTEGRATION)
       ========================================================================== */
    let dbProducts = [];
    let dbBanners = [];

    const state = {
      route: '/'
    };

    const formatPrice = (price) => `₹${(price || 0).toLocaleString('en-IN')}`;
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    async function loadDbData() {
      try {
        // Load products from production D1 API
        const res = await fetch('/api/products?limit=100');
        const data = await res.json();
        dbProducts = data.data || data.products || data || [];
      } catch (e) {
        console.error('Failed to load dynamic products:', e);
      }
      try {
        // Load active banners from production D1 API
        const res = await fetch('/api/banners');
        const data = await res.json();
        dbBanners = data.data || data.banners || data || [];
      } catch (e) {
        console.error('Failed to load dynamic banners:', e);
      }
    }

    /* ==========================================================================
       UI UTILITIES
       ========================================================================== */
    const showToast = (message, type = 'success') => {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast';
      const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
      toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

      container.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    const updateBadges = () => {
      const cartBadge = document.getElementById('cart-badge');
      const wishBadge = document.getElementById('wishlist-badge');

      const cartQty = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
      if (cartBadge) {
        if (cartQty > 0) { cartBadge.style.display = 'flex'; cartBadge.innerText = cartQty; }
        else { cartBadge.style.display = 'none'; }
      }

      let wishCount = 0;
      try {
        const arr = JSON.parse(localStorage.getItem('hu_wishlist_ids') || '[]');
        wishCount = arr.length;
      } catch { }
      if (wishBadge) {
        if (wishCount > 0) { wishBadge.style.display = 'flex'; wishBadge.innerText = wishCount; }
        else { wishBadge.style.display = 'none'; }
      }
    };

    const toggleWishlist = async (id) => {
      if (typeof HeelsUpWishlist !== 'undefined') {
        const isWish = await HeelsUpWishlist.toggle(id);
        showToast(isWish ? 'Added to Wishlist' : 'Removed from Wishlist', isWish ? 'success' : 'info');
      }
      updateBadges();
      // Re-render current view to update heart icons
      if (state.route.startsWith('/shop')) {
        const app = document.getElementById('app');
        if (app) app.querySelector('.view-content').innerHTML = renderShop();
      }
      else if (state.route === '/') {
        const app = document.getElementById('app');
        if (app) app.querySelector('.view-content').innerHTML = renderHome();
      }
      else if (state.route.startsWith('/product')) {
        const app = document.getElementById('app');
        if (app) app.querySelector('.view-content').innerHTML = renderProductDetail(id);
      }
      else if (state.route === '/wishlist') {
        const app = document.getElementById('app');
        if (app) app.querySelector('.view-content').innerHTML = renderWishlist();
      }
    };

    const addToCart = (id, qty = 1, size = 'Standard') => {
      const product = dbProducts.find(p => p.id === id);
      if (product && typeof HeelsUpCart !== 'undefined') {
        HeelsUpCart.addItem(product, qty, size);
      }
      updateBadges();
      renderCartDrawer();
      showToast('Added to Bag');
      document.getElementById('cart-drawer').classList.add('active');
      document.getElementById('cart-overlay').classList.add('active');
    };

    const updateCartQty = (key, delta) => {
      if (typeof HeelsUpCart !== 'undefined') {
        const cart = HeelsUpCart.getCart();
        const item = cart.find(i => i.key === key);
        if (item) {
          HeelsUpCart.updateQty(key, item.qty + delta);
        }
      }
      updateBadges();
      renderCartDrawer();
    };

    /* ==========================================================================
       RENDER FUNCTIONS (COMPONENTS)
       ========================================================================== */
    const createProductCard = (product) => {
      const isWished = typeof HeelsUpWishlist !== 'undefined' ? HeelsUpWishlist.has(product.id) : false;
      const img1 = product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70';
      const img2 = product.images && product.images[1] ? product.images[1] : img1;
      return `
                <div class="product-card">
                    <div class="product-image-wrapper">
                        <img src="${img1}" alt="${esc(product.name)}" class="product-img">
                        <img src="${img2}" alt="${esc(product.name)}" class="product-img-hover">
                        ${product.is_new ? '<span style="position:absolute; top:15px; left:15px; background:var(--clr-secondary); color:white; padding:4px 10px; font-size:0.7rem; font-family:var(--font-heading); text-transform:uppercase;">New</span>' : ''}
                        
                        <button class="wishlist-btn-abs ${isWished ? 'active' : ''}" onclick="toggleWishlist(${product.id}); event.stopPropagation();">
                            <i class="${isWished ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        
                        <div class="product-actions">
                            <button class="action-btn" onclick="window.location.hash='#/product/${product.id}'">Quick View</button>
                            <button class="action-btn" style="background:var(--clr-primary); color:white;" onclick="addToCart(${product.id}); event.stopPropagation();">Add to Bag</button>
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${esc(product.category)}</div>
                        <h3 class="product-title"><a href="#/product/${product.id}">${esc(product.name)}</a></h3>
                        <div class="product-price">${formatPrice(product.price)}</div>
                    </div>
                </div>
            `;
    };

    const renderCartDrawer = () => {
      const container = document.getElementById('cart-items');
      const totalEl = document.getElementById('cart-subtotal');
      if (!container || !totalEl) return;

      let cartItems = [];
      let total = 0;
      if (typeof HeelsUpCart !== 'undefined') {
          cartItems = HeelsUpCart.getCart();
          total = HeelsUpCart.getSubtotal();
      }

      if (cartItems.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding: 4rem 0; color:var(--clr-text-muted);">
                        <i class="fa-solid fa-bag-shopping" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
                        <p>Your luxury bag is empty.</p>
                        <button class="btn btn-outline" style="margin-top:1.5rem;" onclick="document.getElementById('close-cart').click(); window.location.hash='#/shop';">Shop Now</button>
                    </div>`;
        totalEl.innerText = '₹0';
        return;
      }

      container.innerHTML = cartItems.map((item) => {
        return `
                <div class="cart-item">
                    <img src="${item.image}" alt="${esc(item.name)}" class="cart-item-img">
                    <div class="cart-item-details">
                        <div>
                            <h4 class="cart-item-title">${esc(item.name)}</h4>
                            <div style="font-size:0.8rem; color:#666; margin-top:4px;">Size: ${esc(item.size)}</div>
                        </div>
                        <div class="d-flex justify-between align-center">
                            <div class="cart-qty-ctrl">
                                <button onclick="updateCartQty('${item.key}', -1)"><i class="fa-solid fa-minus"></i></button>
                                <span>${item.qty}</span>
                                <button onclick="updateCartQty('${item.key}', 1)"><i class="fa-solid fa-plus"></i></button>
                            </div>
                            <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
                        </div>
                    </div>
                </div>
                `;
      }).join('');
      totalEl.innerText = formatPrice(total);
    };

    /* ==========================================================================
       VIEWS (PAGES GENERATION)
       ========================================================================== */

    // 1. HOME VIEW
    const renderHome = () => {
      const featured = dbProducts.filter(p => p.featured).slice(0, 4);
      const fallbackFeatured = featured.length ? featured : dbProducts.slice(0, 4);
      
      const trending = dbProducts.filter(p => p.is_trending).slice(0, 4);
      const fallbackTrending = trending.length ? trending : dbProducts.slice(4, 8);

      const banner = dbBanners[0];
      const heroHtml = banner ? `
                <section class="hero">
                    <div class="hero-overlay"></div>
                    <img src="${esc(banner.image_url)}" alt="${esc(banner.title)}" class="hero-bg">
                    <div class="container" style="width:100%;">
                        <div class="hero-content">
                            <span class="hero-tag">${esc(banner.subtitle || 'New Collection 2026')}</span>
                            <h1 class="hero-title">${esc(banner.title)}</h1>
                            <a href="${esc(banner.link || '#/shop')}" class="btn btn-primary" style="padding: 1.2rem 3rem;">Shop Now</a>
                        </div>
                    </div>
                </section>
      ` : `
                <section class="hero">
                    <div class="hero-overlay"></div>
                    <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" alt="Luxury Shoes" class="hero-bg">
                    <div class="container" style="width:100%;">
                        <div class="hero-content">
                            <span class="hero-tag">New Collection 2026</span>
                            <h1 class="hero-title">Give Value <span>To Your Feet</span></h1>
                            <p class="hero-desc">Discover our meticulously curated collection of premium luxury footwear and handbags, designed to empower the modern woman.</p>
                            <a href="#/shop" class="btn btn-primary" style="padding: 1.2rem 3rem;">Explore Collection</a>
                        </div>
                    </div>
                </section>
      `;

      return `
                ${heroHtml}

                <section class="container">
                    <div class="category-banners">
                        <div class="cat-banner">
                            <img src="https://images.unsplash.com/photo-1562183241-b937e95585b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Heels">
                            <div class="cat-banner-content">
                                <h2 class="cat-banner-title">Signature Heels</h2>
                                <a href="#/shop?cat=heels" class="btn btn-outline">Shop Heels</a>
                            </div>
                        </div>
                        <div class="cat-banner">
                            <img src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Handbags">
                            <div class="cat-banner-content">
                                <h2 class="cat-banner-title">Premium Bags</h2>
                                <a href="#/shop?cat=bags" class="btn btn-outline">Shop Bags</a>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="section container">
                    <div class="text-center">
                        <h2 class="section-title luxury-text">Featured Masterpieces</h2>
                        <p class="section-subtitle">Curated selection of our most desired pieces</p>
                    </div>
                    <div class="grid-4">
                        ${fallbackFeatured.map(createProductCard).join('')}
                    </div>
                    <div class="text-center" style="margin-top: 3rem;">
                        <a href="#/shop" class="btn btn-outline">View All Products</a>
                    </div>
                </section>

                <section class="info-bar">
                    <div class="container info-grid">
                        <div>
                            <i class="fa-solid fa-gem info-icon"></i>
                            <h3 class="info-title">Premium Quality</h3>
                            <p class="info-desc">Finest materials crafted by artisan shoemakers.</p>
                        </div>
                        <div>
                            <i class="fa-solid fa-box-open info-icon"></i>
                            <h3 class="info-title">Luxury Packaging</h3>
                            <p class="info-desc">Every order arrives in our signature premium unboxing experience.</p>
                        </div>
                        <div>
                            <i class="fa-solid fa-truck-fast info-icon"></i>
                            <h3 class="info-title">Express Delivery</h3>
                            <p class="info-desc">Complimentary express shipping on all orders over ₹799.</p>
                        </div>
                    </div>
                </section>

                <section class="section container">
                    <div class="text-center">
                        <h2 class="section-title luxury-text">Trending Now</h2>
                        <p class="section-subtitle">What our elite clientele is wearing this season</p>
                    </div>
                    <div class="grid-4">
                        ${fallbackTrending.map(createProductCard).join('')}
                    </div>
                </section>
            `;
    };

    // 2. SHOP VIEW
    const renderShop = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const catFilter = params.get('cat');

      let displayProducts = dbProducts;
      if (catFilter) {
        displayProducts = dbProducts.filter(p => (p.category || '').toLowerCase() === catFilter.toLowerCase());
      }

      const catTitle = catFilter ? catFilter.charAt(0).toUpperCase() + catFilter.slice(1) : 'The Complete Collection';

      return `
                <div class="shop-header">
                    <div class="container">
                        <h1 class="hero-title luxury-text" style="font-size:3.5rem; margin-bottom:0;">${catTitle}</h1>
                        <p style="color:var(--clr-text-muted); margin-top:1rem;">Discover unparalleled elegance.</p>
                    </div>
                </div>
                
                <div class="container section" style="padding-top:0;">
                    <div class="shop-layout">
                        <!-- Sidebar Filters -->
                        <aside>
                            <div class="filter-group">
                                <h3 class="filter-title">Category</h3>
                                <ul class="filter-list">
                                    <li><label><input type="radio" name="cat" value="all" ${!catFilter ? 'checked' : ''} onclick="window.location.hash='#/shop'"> All Products</label></li>
                                    <li><label><input type="radio" name="cat" value="heels" ${catFilter === 'heels' ? 'checked' : ''} onclick="window.location.hash='#/shop?cat=heels'"> Luxury Heels</label></li>
                                    <li><label><input type="radio" name="cat" value="flats" ${catFilter === 'flats' ? 'checked' : ''} onclick="window.location.hash='#/shop?cat=flats'"> Elegant Flats</label></li>
                                    <li><label><input type="radio" name="cat" value="bags" ${catFilter === 'bags' ? 'checked' : ''} onclick="window.location.hash='#/shop?cat=bags'"> Premium Handbags</label></li>
                                </ul>
                            </div>
                        </aside>
                        
                        <!-- Product Grid -->
                        <div>
                            <div class="shop-top-bar">
                                <span>Showing ${displayProducts.length} results</span>
                            </div>
                            
                            <div class="grid-3">
                                ${displayProducts.map(createProductCard).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
    };

    // 3. PRODUCT DETAIL VIEW
    const renderProductDetail = (id) => {
      const product = dbProducts.find(p => p.id === parseInt(id));
      if (!product) return `<div class="container section text-center"><h2>Product Not Found</h2><a href="#/shop" class="btn btn-primary mt-4">Back to Shop</a></div>`;

      const isWished = typeof HeelsUpWishlist !== 'undefined' ? HeelsUpWishlist.has(product.id) : false;
      const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : (product.category === 'bags' ? ['OS'] : ['36', '37', '38', '39', '40', '41']);
      const img1 = product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
      const img2 = product.images && product.images[1] ? product.images[1] : img1;

      return `
                <div class="container pd-layout section">
                    <div class="pd-images">
                        <div class="pd-thumbnails">
                            <img src="${img1}" class="pd-thumb active" onclick="document.getElementById('main-img').src=this.src; document.querySelectorAll('.pd-thumb').forEach(t=>t.classList.remove('active')); this.classList.add('active');">
                            <img src="${img2}" class="pd-thumb" onclick="document.getElementById('main-img').src=this.src; document.querySelectorAll('.pd-thumb').forEach(t=>t.classList.remove('active')); this.classList.add('active');">
                        </div>
                        <div>
                            <img src="${img1}" id="main-img" class="pd-main-img">
                        </div>
                    </div>
                    
                    <div>
                        <div class="pd-category">Heels Up ${esc(product.category)}</div>
                        <h1 class="pd-title">${esc(product.name)}</h1>
                        <div class="pd-price">${formatPrice(product.price)}</div>
                        
                        <p class="pd-desc">${esc(product.description || 'No description available.')}</p>
                        
                        <div>
                            <div class="selector-title">Select Size ${product.category !== 'bags' ? '<span style="font-weight:400; font-size:0.8rem; color:var(--clr-primary); float:right; text-decoration:underline; cursor:pointer;">Size Guide</span>' : ''}</div>
                            <div class="size-selector">
                                ${sizes.map((s, i) => `<button class="size-btn ${i === 0 ? 'active' : ''}">${esc(s)}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="pd-actions">
                            <button class="btn btn-primary" onclick="addToCart(${product.id}, 1, document.querySelector('.size-btn.active')?.innerText || 'Standard')">Add To Bag</button>
                            <button class="pd-wish-btn ${isWished ? 'active' : ''}" onclick="toggleWishlist(${product.id})"><i class="${isWished ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
                        </div>
                        
                        <div class="pd-meta">
                            <p><strong>SKU:</strong> ${esc(product.sku || 'HU-' + product.id)}</p>
                            <p><strong>Shipping:</strong> Free standard shipping on orders over ₹799</p>
                            <p><strong>Returns:</strong> Exchange Policy Available</p>
                        </div>
                    </div>
                </div>
                
                <section class="container section" style="border-top:1px solid var(--clr-border);">
                    <h2 class="section-title luxury-text text-center">You May Also Like</h2>
                    <div class="grid-4 mt-4">
                        ${dbProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(createProductCard).join('')}
                    </div>
                </section>
            `;
    };

    // 4. WISHLIST VIEW
    const renderWishlist = () => {
      let wishedIds = [];
      try {
        wishedIds = JSON.parse(localStorage.getItem('hu_wishlist_ids') || '[]').map(Number);
      } catch { }

      const wishedProducts = dbProducts.filter(p => wishedIds.includes(p.id));

      if (wishedProducts.length === 0) {
        return `
                    <div class="container empty-state">
                        <i class="fa-regular fa-heart empty-icon"></i>
                        <h3>Your Wishlist is Empty</h3>
                        <p>Save your favorite items to view them later.</p>
                        <a href="#/shop" class="btn btn-primary">Discover the Collection</a>
                    </div>
                `;
      }

      return `
                <div class="container section">
                    <h1 class="hero-title luxury-text text-center" style="font-size:3rem;">Your Wishlist</h1>
                    <div class="grid-4" style="margin-top: 4rem;">
                        ${wishedProducts.map(createProductCard).join('')}
                    </div>
                </div>
            `;
    };

    // 5. ABOUT VIEW
    const renderAbout = () => {
      return `
                <div class="shop-header">
                    <div class="container">
                        <h1 class="hero-title luxury-text" style="font-size:3.5rem; margin-bottom:0;">Our Story</h1>
                    </div>
                </div>
                <div class="container section pd-layout align-center">
                    <div>
                        <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" style="width:100%; height:600px; object-fit:cover; border-radius:4px;">
                    </div>
                    <div style="padding-left: 2rem;">
                        <h2 class="luxury-text" style="font-size:2.5rem; margin-bottom:1.5rem; color:var(--clr-primary);">Give Value To Your Feet</h2>
                        <p style="font-size:1.1rem; line-height:1.8; color:var(--clr-text-muted); margin-bottom:1.5rem;">Born in the royal city of Jodhpur, Rajasthan, HEELS UP emerged from a singular vision: to craft footwear that doesn't just complement an outfit, but elevates the spirit of the modern woman.</p>
                        <p style="font-size:1.1rem; line-height:1.8; color:var(--clr-text-muted); margin-bottom:2rem;">Every pair in our collection is a testament to meticulous craftsmanship, blending contemporary global trends with timeless luxury. We believe that true luxury lies in the details—from the arch support hidden within our stilettos to the hand-stitched seams of our premium leather bags.</p>
                        <div style="border-left: 4px solid var(--clr-primary); padding-left:1.5rem; font-family:var(--font-luxury); font-size:1.3rem; font-style:italic;">
                            "We don't just sell shoes; we deliver confidence, one step at a time."
                        </div>
                    </div>
                </div>
            `;
    };

    /* ==========================================================================
       ROUTER & INITIALIZATION
       ========================================================================== */
    const router = () => {
      const hash = window.location.hash || '#/';
      const app = document.getElementById('app');
      if (!app) return;
      const viewContent = document.createElement('div');
      viewContent.className = 'view-content';

      // Fade out current
      const current = app.querySelector('.view-content');
      if (current) current.classList.remove('loaded');

      setTimeout(() => {
        state.route = hash.split('?')[0].replace('#', '');
        let html = '';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Route matching
        if (state.route === '/') {
          html = renderHome();
        } else if (state.route.startsWith('/shop')) {
          html = renderShop();
        } else if (state.route.startsWith('/product/')) {
          const id = state.route.split('/')[2];
          html = renderProductDetail(id);
        } else if (state.route === '/wishlist') {
          html = renderWishlist();
        } else if (state.route === '/about') {
          html = renderAbout();
        } else {
          html = `<div class="container section text-center"><h2>Page Not Found</h2><a href="#/" class="btn btn-primary mt-4">Go Home</a></div>`;
        }

        viewContent.innerHTML = html;
        app.innerHTML = '';
        app.appendChild(viewContent);

        // Update Nav Active State
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('data-route') === state.route || (state.route.startsWith('/shop') && link.getAttribute('data-route') === '/shop')) {
            link.classList.add('active');
          }
        });

        // Trigger Animation
        setTimeout(() => viewContent.classList.add('loaded'), 50);

        // Close Mobile Menu if open
        const menuDrawer = document.getElementById('menu-drawer');
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuDrawer) menuDrawer.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');

      }, 300);
    };

    // Window Events
    window.addEventListener('hashchange', router);
    window.addEventListener('load', async () => {
      updateBadges();
      renderCartDrawer();
      await loadDbData();
      updateBadges();
      renderCartDrawer();
      router();
    });

    // Header Scroll Effect
    window.addEventListener('scroll', () => {
      const header = document.getElementById('header');
      if (header) {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      }
    });

    // Drawers Toggle Logic
    const initDrawers = () => {
      // Cart
      const cartBtn = document.getElementById('cart-btn');
      const cartDrawer = document.getElementById('cart-drawer');
      const cartOverlay = document.getElementById('cart-overlay');
      const closeCartBtn = document.getElementById('close-cart');

      if (cartBtn && cartDrawer && cartOverlay && closeCartBtn) {
        const closeCart = () => { cartDrawer.classList.remove('active'); cartOverlay.classList.remove('active'); };
        cartBtn.addEventListener('click', () => { cartDrawer.classList.add('active'); cartOverlay.classList.add('active'); });
        closeCartBtn.addEventListener('click', closeCart);
        cartOverlay.addEventListener('click', closeCart);
      }

      // Mobile Menu
      const menuBtn = document.getElementById('mobile-menu-btn');
      const menuDrawer = document.getElementById('menu-drawer');
      const menuOverlay = document.getElementById('menu-overlay');
      const closeMenuBtn = document.getElementById('close-menu');
      const menuLinks = document.querySelectorAll('.menu-link');

      if (menuBtn && menuDrawer && menuOverlay && closeMenuBtn) {
        const closeMenu = () => { menuDrawer.classList.remove('active'); menuOverlay.classList.remove('active'); };
        menuBtn.addEventListener('click', () => { menuDrawer.classList.add('active'); menuOverlay.classList.add('active'); });
        closeMenuBtn.addEventListener('click', closeMenu);
        menuOverlay.addEventListener('click', closeMenu);
        menuLinks.forEach(link => link.addEventListener('click', closeMenu));
      }
    };

    initDrawers();

    // Real Checkout Function
    window.checkout = () => {
      const count = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
      if (count === 0) return;
      window.location.href = '/cart.html';
    };

    window.openSearch = () => {
      const term = prompt("Search our luxury collection:");
      if (term) {
        window.location.href = '/search.html?q=' + encodeURIComponent(term);
      }
    };

    // Size selector delegation for Product Detail Page
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('size-btn')) {
          document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
        }
      });
    }

    // Export helpers for onclick binding
    window.toggleWishlist = toggleWishlist;
    window.addToCart = addToCart;
    window.updateCartQty = updateCartQty;

    // Listen for storage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'hu_wishlist_ids' || e.key === 'heelsup_cart') {
        updateBadges();
        renderCartDrawer();
      }
    });

    window.addEventListener('cart:updated', () => {
      updateBadges();
      renderCartDrawer();
    });

})();