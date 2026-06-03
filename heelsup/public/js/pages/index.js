/* ==========================================================================
       DATA: LUXURY PRODUCTS DATABASE
       ========================================================================== */
    const MOCK_PRODUCTS = [
      { id: 1, name: "Valentina Stiletto Pumps", price: 4599, category: "heels", images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1596702674390-327c00e62057?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Elegance defined. The Valentina stiletto features a sleek pointed toe and a soaring 100mm heel, crafted from premium Italian leather.", colors: ["Red", "Black", "Nude"], isNew: true },
      { id: 2, name: "Aria Crystal Sandal", price: 5299, category: "heels", images: ["https://images.unsplash.com/photo-1562183241-b937e95585b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Make an entrance. Adorned with hand-placed crystals, the Aria sandal brings unparalleled glamour to your evening ensemble.", colors: ["Silver", "Gold"], isNew: false },
      { id: 3, name: "Monogram Signature Tote", price: 8999, category: "bags", images: ["https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1591561954557-26941169b49e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "The quintessential luxury tote. Spacious, structured, and accented with our signature gold-tone hardware. Perfect for the modern professional.", colors: ["Tan", "Black", "Cream"], isNew: true },
      { id: 4, name: "Chloe Leather Loafers", price: 3499, category: "flats", images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Slip into luxury. The Chloe loafer combines timeless silhouette with cloud-like comfort. Complete with a signature hardware buckle.", colors: ["Black", "White"], isNew: false },
      { id: 5, name: "Milan Suede Ankle Boots", price: 6599, category: "heels", images: ["https://images.unsplash.com/photo-1608667508764-33cf0726b13a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Urban chic meets luxury. Crafted from buttery soft suede with a comfortable block heel, the Milan boot transitions seamlessly from day to night.", colors: ["Camel", "Black"], isNew: false },
      { id: 6, name: "Bella Evening Clutch", price: 4199, category: "bags", images: ["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "A jewel for your hand. The Bella clutch features a hard-shell exterior wrapped in premium satin with a crystal clasp.", colors: ["Ruby Red", "Emerald", "Onyx"], isNew: false },
      { id: 7, name: "Sophia Strappy Heels", price: 4899, category: "heels", images: ["https://images.unsplash.com/photo-1550570881-80fc9bd1ed24?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1562183241-b937e95585b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Delicate and bold. Multiple ultra-thin straps encase the foot for a secure fit with a striking architectural heel.", colors: ["Rose Gold", "Black"], isNew: true },
      { id: 8, name: "Luna Crossbody Bag", price: 5499, category: "bags", images: ["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1591561954557-26941169b49e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Compact luxury. The Luna crossbody is crafted from pebbled leather with our iconic chain strap. Big enough for essentials, small enough for elegance.", colors: ["Cream", "Black", "Blush"], isNew: false },
      { id: 9, name: "Giselle Ballet Flats", price: 2999, category: "flats", images: ["https://images.unsplash.com/photo-1518384401463-d38761b3fee7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "The everyday essential elevated. Supple nappa leather molds to your foot, featuring a subtle grosgrain bow and gold cap toe.", colors: ["Nude/Black", "All Black"], isNew: false },
      { id: 10, name: "Bridal Pearl Block Heel", price: 6299, category: "heels", images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1550570881-80fc9bd1ed24?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "For your special day. A comfortable block heel encrusted with faux pearls, wrapped in ivory satin.", colors: ["Ivory", "White"], isNew: true },
      { id: 11, name: "The Crown Jewel Satchel", price: 12500, category: "bags", images: ["https://images.unsplash.com/photo-1575037614876-c38db55b1b46?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Our masterpiece. Exquisitely structured top-handle bag crafted from crocodile-embossed leather with 24k gold plated hardware.", colors: ["Emerald", "Black"], isNew: true },
      { id: 12, name: "Oasis Woven Mules", price: 3899, category: "flats", images: ["https://images.unsplash.com/photo-1603808033192-082d6919d3e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1518384401463-d38761b3fee7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"], desc: "Resort luxury. Hand-woven leather mules offering breathability and effortless style for your next getaway.", colors: ["Tan", "White"], isNew: false }
    ];

    /* ==========================================================================
       STATE MANAGEMENT
       ========================================================================== */
    const state = {
      cart: JSON.parse(localStorage.getItem('hu_cart')) || [],
      wishlist: JSON.parse(localStorage.getItem('hu_wishlist')) || [],
      route: '/'
    };

    const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`;

    const saveState = () => {
      localStorage.setItem('hu_cart', JSON.stringify(state.cart));
      localStorage.setItem('hu_wishlist', JSON.stringify(state.wishlist));
      updateBadges();
    };

    /* ==========================================================================
       UI UTILITIES
       ========================================================================== */
    const showToast = (message, type = 'success') => {
      const container = document.getElementById('toast-container');
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

      const cartQty = state.cart.reduce((acc, item) => acc + item.qty, 0);
      if (cartQty > 0) { cartBadge.style.display = 'flex'; cartBadge.innerText = cartQty; }
      else { cartBadge.style.display = 'none'; }

      if (state.wishlist.length > 0) { wishBadge.style.display = 'flex'; wishBadge.innerText = state.wishlist.length; }
      else { wishBadge.style.display = 'none'; }
    };

    const toggleWishlist = (id) => {
      const index = state.wishlist.indexOf(id);
      if (index > -1) {
        state.wishlist.splice(index, 1);
        showToast('Removed from Wishlist', 'info');
      } else {
        state.wishlist.push(id);
        showToast('Added to Wishlist');
      }
      saveState();
      // Re-render current view to update heart icons
      if (state.route.startsWith('/shop')) renderShop();
      else if (state.route === '/') renderHome();
      else if (state.route.startsWith('/product')) renderProductDetail(id);
      else if (state.route === '/wishlist') renderWishlist();
    };

    const addToCart = (id, qty = 1, size = 'Standard') => {
      const product = MOCK_PRODUCTS.find(p => p.id === id);
      const existing = state.cart.find(item => item.id === id && item.size === size);

      if (existing) {
        existing.qty += qty;
      } else {
        state.cart.push({ ...product, qty, size });
      }
      saveState();
      renderCartDrawer();
      showToast('Added to Bag');
      document.getElementById('cart-drawer').classList.add('active');
      document.getElementById('cart-overlay').classList.add('active');
    };

    const updateCartQty = (index, delta) => {
      state.cart[index].qty += delta;
      if (state.cart[index].qty <= 0) state.cart.splice(index, 1);
      saveState();
      renderCartDrawer();
    };

    /* ==========================================================================
       RENDER FUNCTIONS (COMPONENTS)
       ========================================================================== */
    const createProductCard = (product) => {
      const isWished = state.wishlist.includes(product.id);
      return `
                <div class="product-card">
                    <div class="product-image-wrapper">
                        <img src="${product.images[0]}" alt="${product.name}" class="product-img">
                        <img src="${product.images[1]}" alt="${product.name}" class="product-img-hover">
                        ${product.isNew ? '<span style="position:absolute; top:15px; left:15px; background:var(--clr-secondary); color:white; padding:4px 10px; font-size:0.7rem; font-family:var(--font-heading); text-transform:uppercase;">New</span>' : ''}
                        
                        <button class="wishlist-btn-abs ${isWished ? 'active' : ''}" onclick="toggleWishlist(${product.id}); event.stopPropagation();">
                            <i class="${isWished ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        
                        <div class="product-actions">
                            <button class="action-btn" onclick="window.location.hash='#/product/${product.id}'">Quick View</button>
                            <button class="action-btn" style="background:var(--clr-primary); color:white;" onclick="addToCart(${product.id}); event.stopPropagation();">Add to Bag</button>
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${product.category}</div>
                        <h3 class="product-title"><a href="#/product/${product.id}">${product.name}</a></h3>
                        <div class="product-price">${formatPrice(product.price)}</div>
                    </div>
                </div>
            `;
    };

    const renderCartDrawer = () => {
      const container = document.getElementById('cart-items');
      const totalEl = document.getElementById('cart-subtotal');

      if (state.cart.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding: 4rem 0; color:var(--clr-text-muted);">
                        <i class="fa-solid fa-bag-shopping" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
                        <p>Your luxury bag is empty.</p>
                        <button class="btn btn-outline" style="margin-top:1.5rem;" onclick="document.getElementById('close-cart').click(); window.location.hash='#/shop';">Shop Now</button>
                    </div>`;
        totalEl.innerText = '₹0';
        return;
      }

      let total = 0;
      container.innerHTML = state.cart.map((item, index) => {
        total += item.price * item.qty;
        return `
                <div class="cart-item">
                    <img src="${item.images[0]}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <div>
                            <h4 class="cart-item-title">${item.name}</h4>
                            <div style="font-size:0.8rem; color:#666; margin-top:4px;">Size: ${item.size}</div>
                        </div>
                        <div class="d-flex justify-between align-center">
                            <div class="cart-qty-ctrl">
                                <button onclick="updateCartQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                                <span>${item.qty}</span>
                                <button onclick="updateCartQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
                            </div>
                            <div class="cart-item-price">${formatPrice(item.price)}</div>
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
      const featured = MOCK_PRODUCTS.slice(0, 4);
      const trending = MOCK_PRODUCTS.slice(4, 8);

      return `
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
                        ${featured.map(createProductCard).join('')}
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
                            <p class="info-desc">Complimentary express shipping on all orders over ₹5,000.</p>
                        </div>
                    </div>
                </section>

                <section class="section container">
                    <div class="text-center">
                        <h2 class="section-title luxury-text">Trending Now</h2>
                        <p class="section-subtitle">What our elite clientele is wearing this season</p>
                    </div>
                    <div class="grid-4">
                        ${trending.map(createProductCard).join('')}
                    </div>
                </section>
            `;
    };

    // 2. SHOP VIEW
    const renderShop = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const catFilter = params.get('cat');

      let displayProducts = MOCK_PRODUCTS;
      if (catFilter) {
        displayProducts = MOCK_PRODUCTS.filter(p => p.category === catFilter);
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
                            
                            <div class="filter-group">
                                <h3 class="filter-title">Price Range</h3>
                                <ul class="filter-list">
                                    <li><label><input type="radio" name="price"> All Prices</label></li>
                                    <li><label><input type="radio" name="price"> Under ₹3,000</label></li>
                                    <li><label><input type="radio" name="price"> ₹3,000 - ₹6,000</label></li>
                                    <li><label><input type="radio" name="price"> Over ₹6,000</label></li>
                                </ul>
                            </div>
                        </aside>
                        
                        <!-- Product Grid -->
                        <div>
                            <div class="shop-top-bar">
                                <span>Showing ${displayProducts.length} results</span>
                                <select class="sort-select">
                                    <option>Sort by: Featured</option>
                                    <option>Price: Low to High</option>
                                    <option>Price: High to Low</option>
                                    <option>Newest Arrivals</option>
                                </select>
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
      const product = MOCK_PRODUCTS.find(p => p.id === parseInt(id));
      if (!product) return `<div class="container section text-center"><h2>Product Not Found</h2><a href="#/shop" class="btn btn-primary mt-4">Back to Shop</a></div>`;

      const isWished = state.wishlist.includes(product.id);
      const sizes = product.category === 'bags' ? ['OS'] : ['36', '37', '38', '39', '40', '41'];

      return `
                <div class="container pd-layout section">
                    <div class="pd-images">
                        <div class="pd-thumbnails">
                            <img src="${product.images[0]}" class="pd-thumb active" onclick="document.getElementById('main-img').src=this.src; document.querySelectorAll('.pd-thumb').forEach(t=>t.classList.remove('active')); this.classList.add('active');">
                            <img src="${product.images[1]}" class="pd-thumb" onclick="document.getElementById('main-img').src=this.src; document.querySelectorAll('.pd-thumb').forEach(t=>t.classList.remove('active')); this.classList.add('active');">
                        </div>
                        <div>
                            <img src="${product.images[0]}" id="main-img" class="pd-main-img">
                        </div>
                    </div>
                    
                    <div>
                        <div class="pd-category">Heels Up ${product.category}</div>
                        <h1 class="pd-title">${product.name}</h1>
                        <div class="pd-price">${formatPrice(product.price)}</div>
                        
                        <p class="pd-desc">${product.desc}</p>
                        
                        <div style="margin-bottom: 2rem;">
                            <div class="selector-title">Available Colors</div>
                            <div style="display:flex; gap:10px;">
                                ${product.colors.map((c, i) => `<span style="font-size:0.85rem; padding:5px 15px; border:1px solid ${i === 0 ? 'var(--clr-secondary)' : 'var(--clr-border)'}; cursor:pointer; background:${i === 0 ? 'var(--clr-surface)' : 'white'};">${c}</span>`).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <div class="selector-title">Select Size ${product.category !== 'bags' ? '<span style="font-weight:400; font-size:0.8rem; color:var(--clr-primary); float:right; text-decoration:underline; cursor:pointer;">Size Guide</span>' : ''}</div>
                            <div class="size-selector">
                                ${sizes.map((s, i) => `<button class="size-btn ${i === 2 ? 'active' : ''}">${s}</button>`).join('')}
                            </div>
                        </div>
                        
                        <div class="pd-actions">
                            <button class="btn btn-primary" onclick="addToCart(${product.id}, 1, document.querySelector('.size-btn.active')?.innerText || 'Standard')">Add To Bag</button>
                            <button class="pd-wish-btn ${isWished ? 'active' : ''}" onclick="toggleWishlist(${product.id})"><i class="${isWished ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
                        </div>
                        
                        <div class="pd-meta">
                            <p><strong>SKU:</strong> HU-${product.id}0${Math.floor(Math.random() * 900) + 100}</p>
                            <p><strong>Shipping:</strong> Free standard shipping on orders over ₹5,000</p>
                            <p><strong>Returns:</strong> 14-day hassle-free return policy</p>
                        </div>
                    </div>
                </div>
                
                <section class="container section" style="border-top:1px solid var(--clr-border);">
                    <h2 class="section-title luxury-text text-center">You May Also Like</h2>
                    <div class="grid-4 mt-4">
                        ${MOCK_PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(createProductCard).join('')}
                    </div>
                </section>
            `;
    };

    // 4. WISHLIST VIEW
    const renderWishlist = () => {
      const wishedProducts = MOCK_PRODUCTS.filter(p => state.wishlist.includes(p.id));

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
      const viewContent = document.createElement('div');
      viewContent.className = 'view-content';

      // Fade out current
      const current = app.querySelector('.view-content');
      if (current) current.classList.remove('loaded');

      setTimeout(() => {
        state.route = hash.replace('#', '');
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
        document.getElementById('menu-drawer').classList.remove('active');
        document.getElementById('menu-overlay').classList.remove('active');

      }, 300);
    };

    // Window Events
    window.addEventListener('hashchange', router);
    window.addEventListener('load', () => {
      updateBadges();
      renderCartDrawer();
      router();
    });

    // Header Scroll Effect
    window.addEventListener('scroll', () => {
      const header = document.getElementById('header');
      if (window.scrollY > 50) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });

    // Drawers Toggle Logic
    const initDrawers = () => {
      // Cart
      const cartBtn = document.getElementById('cart-btn');
      const cartDrawer = document.getElementById('cart-drawer');
      const cartOverlay = document.getElementById('cart-overlay');
      const closeCartBtn = document.getElementById('close-cart');

      const closeCart = () => { cartDrawer.classList.remove('active'); cartOverlay.classList.remove('active'); };
      cartBtn.addEventListener('click', () => { cartDrawer.classList.add('active'); cartOverlay.classList.add('active'); });
      closeCartBtn.addEventListener('click', closeCart);
      cartOverlay.addEventListener('click', closeCart);

      // Mobile Menu
      const menuBtn = document.getElementById('mobile-menu-btn');
      const menuDrawer = document.getElementById('menu-drawer');
      const menuOverlay = document.getElementById('menu-overlay');
      const closeMenuBtn = document.getElementById('close-menu');
      const menuLinks = document.querySelectorAll('.menu-link');

      const closeMenu = () => { menuDrawer.classList.remove('active'); menuOverlay.classList.remove('active'); };
      menuBtn.addEventListener('click', () => { menuDrawer.classList.add('active'); menuOverlay.classList.add('active'); });
      closeMenuBtn.addEventListener('click', closeMenu);
      menuOverlay.addEventListener('click', closeMenu);
      menuLinks.forEach(link => link.addEventListener('click', closeMenu));
    };

    initDrawers();

    // Dummy Checkout Function
    window.checkout = () => {
      if (state.cart.length === 0) return;
      showToast('Proceeding to Secure Checkout...', 'success');
      setTimeout(() => {
        alert('This is a demo. In production, this redirects to the payment gateway.');
      }, 1000);
    };

    window.openSearch = () => {
      const term = prompt("Search our luxury collection:");
      if (term) {
        window.location.hash = '#/shop';
        setTimeout(() => showToast(`Showing results for "${term}"`, 'info'), 500);
      }
    };

    // Size selector delegation for Product Detail Page
    document.getElementById('app').addEventListener('click', (e) => {
      if (e.target.classList.contains('size-btn')) {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      }
    });