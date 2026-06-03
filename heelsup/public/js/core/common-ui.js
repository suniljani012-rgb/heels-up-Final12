/**
 * HeelsUp — Shared Layout and UI Engine v5.0
 * Generates dynamic header, categories dropdown, mobile menu, cart drawer,
 * footer, announcement bar, WhatsApp widget, scroll-to-top, loader, and toast systems.
 * Exposes: window.HeelsUpUI
 */
(function () {
  "use strict";

  // Cache settings and categories locally for page speed
  let storeSettings = {};
  let storeCategories = [];

  // Helper for INR currency format
  function formatPrice(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  }

  // Toast System
  function ensureToastContainer() {
    let container = document.getElementById("hu-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "hu-toast-container";
      container.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none";
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(msg, type = "success", duration = 4000) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    
    const colors = { success: "#FF2D55", error: "#C53030", warning: "#D69F5A", info: "#111111" };
    const bg = colors[type] || colors.info;

    toast.className = `hu-toast hu-toast-${type}`;
    toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:4px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,0.15);pointer-events:all;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;max-width:350px;transform:translateY(20px);opacity:0;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`;
    toast.innerHTML = `<span style="flex:1">${msg}</span><button onclick="this.parentNode.remove()" style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:16px;line-height:1;margin-left:8px">✕</button>`;
    
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Loader Spinner
  function showLoader(msg = "Please wait...") {
    let loader = document.getElementById("hu-full-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "hu-full-loader";
      loader.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,0.9);z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;transition:opacity 0.2s";
      loader.innerHTML = `
        <div class="hu-spinner" style="width:48px;height:48px;border:3px solid #EAEAEA;border-top-color:#FF2D55;border-radius:50%;animation:hu-spin 0.8s linear infinite"></div>
        <div id="hu-loader-msg" style="font-family:'Poppins',sans-serif;color:#111;font-size:14px;font-weight:500">${msg}</div>
        <style>@keyframes hu-spin{to{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(loader);
    } else {
      document.getElementById("hu-loader-msg").textContent = msg;
      loader.style.opacity = "1";
      loader.style.display = "flex";
    }
  }

  function hideLoader() {
    const loader = document.getElementById("hu-full-loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 200);
    }
  }

  // Skeleton utility
  function skeleton(count = 4, type = "product") {
    const html = Array(count).fill(0).map(() => {
      if (type === "product") {
        return `
          <div class="skel-card" style="padding:16px;border:1px solid #EAEAEA;border-radius:8px;background:#FFF">
            <div style="height:250px;background:#F5F5F5;margin-bottom:12px;border-radius:4px;animation:skel-shine 1.5s infinite"></div>
            <div style="height:16px;width:70%;background:#F5F5F5;margin-bottom:8px;animation:skel-shine 1.5s infinite"></div>
            <div style="height:16px;width:40%;background:#F5F5F5;animation:skel-shine 1.5s infinite"></div>
          </div>
        `;
      }
      return `<div style="height:48px;background:#F5F5F5;margin-bottom:8px;border-radius:4px;animation:skel-shine 1.5s infinite"></div>`;
    }).join("");

    return `
      <style>@keyframes skel-shine{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}</style>
      ${html}
    `;
  }

  // Badging hooks
  function updateBadges() {
    const cartBadge = document.getElementById("cart-badge");
    const cartBadgeMobile = document.getElementById("cart-badge-mobile");
    const wishBadge = document.getElementById("wishlist-badge");

    let cartQty = 0;
    try {
      const cart = JSON.parse(localStorage.getItem("heelsup_cart") || "[]");
      cartQty = cart.reduce((s, item) => s + (item.qty || 1), 0);
    } catch {}

    if (cartBadge) {
      cartBadge.textContent = cartQty;
      cartBadge.style.display = cartQty > 0 ? "flex" : "none";
    }
    if (cartBadgeMobile) {
      cartBadgeMobile.textContent = cartQty;
      cartBadgeMobile.style.display = cartQty > 0 ? "flex" : "none";
    }

    let wishCount = 0;
    try {
      const wish = JSON.parse(localStorage.getItem("heelsup_wishlist") || "[]");
      wishCount = wish.length;
    } catch {}

    if (wishBadge) {
      wishBadge.textContent = wishCount;
      wishBadge.style.display = wishCount > 0 ? "flex" : "none";
    }
  }

  // Load Categories & Store Settings dynamically
  async function loadData() {
    try {
      if (window.HeelsUpAuth && typeof window.HeelsUpAuth.api === "function") {
        const catRes = await HeelsUpAuth.api("/api/categories");
        const catData = (catRes && (catRes.categories || catRes.data)) || [];
        storeCategories = Array.isArray(catData) ? catData : [];
        
        const settingsRes = await HeelsUpAuth.api("/api/settings/public");
        storeSettings = (settingsRes && settingsRes.data) || settingsRes || {};
      }
    } catch (e) {
      console.error("Layout Engine API fetch failed:", e);
    }
  }

  // Renders navbar dropdown html based on categories
  function getCategoriesDropdownHtml() {
    if (!storeCategories.length) {
      return `
        <a href="/shop.html?cat=heels">Heels</a>
        <a href="/shop.html?cat=sandals">Sandals</a>
        <a href="/shop.html?cat=flats">Flats</a>
        <a href="/shop.html?cat=bags">Bags</a>
      `;
    }
    return storeCategories
      .map(c => `<a href="/shop.html?cat=${c.slug || c.name.toLowerCase()}">${c.name}</a>`)
      .join("");
  }

  // Set up the full customer UI DOM elements
  async function initUI() {
    await loadData();

    // 1. Build & Insert Navbar
    const navPlaceholder = document.getElementById("navbar");
    if (navPlaceholder) {
      navPlaceholder.className = "header";
      navPlaceholder.innerHTML = `
        <div class="container nav-container">
          <div class="hamburger" id="mobile-menu-btn">
            <i class="fa-solid fa-bars"></i>
          </div>

          <a href="/index.html" class="logo">HEELS<span>UP</span></a>

          <nav class="nav-links">
            <a href="/index.html" class="nav-link">Home</a>
            <div class="nav-link-dropdown" style="position:relative; display:inline-block;">
              <a href="/shop.html" class="nav-link">Shop Collection <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;margin-left:3px"></i></a>
              <div class="dropdown-content" style="display:none; position:absolute; top:100%; left:0; background:#FFF; min-width:200px; box-shadow:0 8px 16px rgba(0,0,0,0.1); z-index:1000; border-top:2px solid #FF2D55; padding:8px 0;">
                ${getCategoriesDropdownHtml()}
              </div>
            </div>
            <a href="/about.html" class="nav-link">Our Story</a>
            <a href="/contact.html" class="nav-link">Contact</a>
          </nav>

          <div class="nav-actions">
            <div class="nav-icon" id="search-trigger-btn"><i class="fa-solid fa-magnifying-glass"></i></div>
            <a href="/wishlist.html" class="nav-icon">
              <i class="fa-regular fa-heart"></i>
              <span class="badge" id="wishlist-badge" style="display:none;">0</span>
            </a>
            <a href="/profile.html" class="nav-icon">
              <i class="fa-regular fa-user"></i>
            </a>
            <div class="nav-icon" id="cart-drawer-trigger-btn">
              <i class="fa-solid fa-bag-shopping"></i>
              <span class="badge" id="cart-badge" style="display:none;">0</span>
            </div>
          </div>
        </div>
      `;

      // Set up simple pure CSS hover for dropdown
      const dLink = navPlaceholder.querySelector(".nav-link-dropdown");
      const dContent = navPlaceholder.querySelector(".dropdown-content");
      if (dLink && dContent) {
        dLink.addEventListener("mouseenter", () => { dContent.style.display = "block"; });
        dLink.addEventListener("mouseleave", () => { dContent.style.display = "none"; });
      }
    }

    // 2. Build & Insert Footer
    const footerPlaceholder = document.querySelector(".footer");
    if (footerPlaceholder) {
      const email = storeSettings.store_email || "support@heelsup.in";
      const phone = storeSettings.store_phone || "+91 7891470935";
      const address = storeSettings.store_address || "1st 'B' Road, Near Mahaveer Mega Mart, Sardarpura, Jodhpur, Rajasthan";
      const insta = storeSettings.social_instagram || "https://www.instagram.com/heel_s_up/";
      const fb = storeSettings.social_facebook || "#";
      const pin = storeSettings.social_pinterest || "#";

      footerPlaceholder.innerHTML = `
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="footer-logo">HEELS<span>UP</span></div>
              <p class="footer-desc">${storeSettings.footer_tagline || "Premium luxury women's footwear and handbags. Give Value To Your Feet with our exquisite craftsmanship and elegant designs."}</p>
              <div class="social-links">
                <a href="${insta}" target="_blank" class="social-icon"><i class="fa-brands fa-instagram"></i></a>
                <a href="${fb}" class="social-icon"><i class="fa-brands fa-facebook-f"></i></a>
                <a href="${pin}" class="social-icon"><i class="fa-brands fa-pinterest-p"></i></a>
              </div>
            </div>
            <div>
              <h4 class="footer-col-title">Shop Collection</h4>
              <ul class="footer-links">
                <li><a href="/shop.html">All Footwear</a></li>
                <li><a href="/shop.html?cat=heels">Luxury Heels</a></li>
                <li><a href="/shop.html?cat=bags">Premium Bags</a></li>
                <li><a href="/shop.html?cat=flats">Elegant Flats</a></li>
              </ul>
            </div>
            <div>
              <h4 class="footer-col-title">Support & Info</h4>
              <ul class="footer-links">
                <li><a href="/about.html">Our Story</a></li>
                <li><a href="/faq.html">FAQ</a></li>
                <li><a href="/shipping-info.html">Shipping Details</a></li>
                <li><a href="/returns.html">Returns & Exchange</a></li>
              </ul>
            </div>
            <div>
              <h4 class="footer-col-title">Store Location</h4>
              <ul class="footer-links" style="color:#888888; font-size:0.95rem; line-height:1.8;">
                <li><i class="fa-solid fa-location-dot" style="color:#FF2D55; margin-right:8px"></i> ${address}</li>
                <li style="margin-top:10px"><i class="fa-solid fa-phone" style="color:#FF2D55; margin-right:8px"></i> ${phone}</li>
                <li style="margin-top:10px"><i class="fa-solid fa-envelope" style="color:#FF2D55; margin-right:8px"></i> ${email}</li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>© ${new Date().getFullYear()} HEELS UP Luxury. All rights reserved.</p>
            <div style="display:flex; gap:1.5rem">
              <a href="/policy/privacy.html">Privacy Policy</a>
              <a href="/policy/terms.html">Terms of Service</a>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Build & Insert Cart Drawer DOM if not exists
    if (!document.getElementById("cart-drawer")) {
      const drawerDiv = document.createElement("div");
      drawerDiv.innerHTML = `
        <div class="drawer-overlay" id="cart-overlay"></div>
        <div class="drawer" id="cart-drawer">
          <div class="drawer-header">
            <h3 class="drawer-title">Your Bag</h3>
            <div class="drawer-close" id="close-cart"><i class="fa-solid fa-xmark"></i></div>
          </div>
          <div class="drawer-body" id="cart-items"></div>
          <div class="drawer-footer">
            <div class="d-flex justify-between" style="margin-bottom:1.5rem">
              <span style="font-weight:500">Subtotal</span>
              <span style="font-family:'Playfair Display',serif; font-weight:600; font-size:1.2rem;" id="cart-subtotal">₹0</span>
            </div>
            <button class="btn btn-primary btn-full" id="proceed-checkout-btn">Proceed to Checkout</button>
          </div>
        </div>
      `;
      document.body.appendChild(drawerDiv);
    }

    // 4. Build & Insert Mobile Menu Drawer if not exists
    if (!document.getElementById("menu-drawer")) {
      const mobDiv = document.createElement("div");
      mobDiv.innerHTML = `
        <div class="drawer-overlay" id="menu-overlay"></div>
        <div class="drawer" id="menu-drawer" style="right:auto; left:-100%; transition: left 0.6s cubic-bezier(0.22, 1, 0.36, 1)">
          <div class="drawer-header">
            <div class="logo">HEELS<span>UP</span></div>
            <div class="drawer-close" id="close-menu"><i class="fa-solid fa-xmark"></i></div>
          </div>
          <div class="drawer-body">
            <ul style="display:flex; flex-direction:column; gap:1.5rem; font-size:1.2rem; font-family:'Poppins',sans-serif; text-transform:uppercase;">
              <li><a href="/index.html">Home</a></li>
              <li><a href="/shop.html">Shop All</a></li>
              ${storeCategories.map(c => `<li><a href="/shop.html?cat=${c.slug || c.name.toLowerCase()}">${c.name}</a></li>`).join("")}
              <li><a href="/about.html">About Us</a></li>
              <li><a href="/contact.html">Contact</a></li>
              <li><a href="/profile.html">My Account</a></li>
            </ul>
          </div>
        </div>
      `;
      document.body.appendChild(mobDiv);
    }

    // 5. Build & Insert Floating Widgets (WhatsApp & ScrollTop) if not exists
    if (!document.querySelector(".whatsapp-float")) {
      const phoneClean = (storeSettings.store_phone || "917891470935").replace(/[^\d]/g, "");
      const waAnchor = document.createElement("a");
      waAnchor.href = `https://wa.me/${phoneClean}?text=Hello%20HeelsUp!`;
      waAnchor.className = "whatsapp-float";
      waAnchor.target = "_blank";
      waAnchor.rel = "noopener noreferrer";
      waAnchor.setAttribute("aria-label", "WhatsApp support");
      waAnchor.style.cssText = "position:fixed;bottom:24px;left:24px;background:#25D366;color:#FFF;width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 10px rgba(0,0,0,0.15);z-index:999";
      waAnchor.innerHTML = `<i class="fa-brands fa-whatsapp"></i>`;
      document.body.appendChild(waAnchor);
    }

    if (!document.getElementById("scroll-top")) {
      const scrollBtn = document.createElement("button");
      scrollBtn.id = "scroll-top";
      scrollBtn.style.cssText = "position:fixed;bottom:24px;right:24px;background:#111;color:#FFF;width:50px;height:50px;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 10px rgba(0,0,0,0.15);z-index:999";
      scrollBtn.innerHTML = `<i class="fa-solid fa-chevron-up"></i>`;
      document.body.appendChild(scrollBtn);

      window.addEventListener("scroll", () => {
        scrollBtn.style.display = window.scrollY > 400 ? "flex" : "none";
      });
      scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // 6. Connect Header Scroll Effect
    window.addEventListener("scroll", () => {
      const header = document.getElementById("navbar");
      if (header) {
        header.classList.toggle("scrolled", window.scrollY > 50);
      }
    });

    // 7. Connect Drawers Click Events
    const initDrawers = () => {
      const cartBtn = document.getElementById("cart-drawer-trigger-btn");
      const cartDrawer = document.getElementById("cart-drawer");
      const cartOverlay = document.getElementById("cart-overlay");
      const closeCart = document.getElementById("close-cart");

      if (cartBtn && cartDrawer && cartOverlay) {
        cartBtn.addEventListener("click", () => {
          renderCartDrawerItems();
          cartDrawer.classList.add("active");
          cartOverlay.classList.add("active");
        });
        const closeFn = () => {
          cartDrawer.classList.remove("active");
          cartOverlay.classList.remove("active");
        };
        closeCart?.addEventListener("click", closeFn);
        cartOverlay.addEventListener("click", closeFn);
      }

      // Mobile Menu Drawer
      const menuBtn = document.getElementById("mobile-menu-btn");
      const menuDrawer = document.getElementById("menu-drawer");
      const menuOverlay = document.getElementById("menu-overlay");
      const closeMenu = document.getElementById("close-menu");

      if (menuBtn && menuDrawer && menuOverlay) {
        menuBtn.addEventListener("click", () => {
          menuDrawer.classList.add("active");
          menuDrawer.style.left = "0";
          menuOverlay.classList.add("active");
        });
        const closeMenuFn = () => {
          menuDrawer.classList.remove("active");
          menuDrawer.style.left = "-100%";
          menuOverlay.classList.remove("active");
        };
        closeMenu?.addEventListener("click", closeMenuFn);
        menuOverlay.addEventListener("click", closeMenuFn);
      }

      // Search dialog trigger
      const searchTrigger = document.getElementById("search-trigger-btn");
      if (searchTrigger) {
        searchTrigger.addEventListener("click", () => {
          // Redirect to search page with search field ready
          window.location.href = "/search.html";
        });
      }

      // Proceed to checkout routing
      const checkoutBtn = document.getElementById("proceed-checkout-btn");
      if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
          window.location.href = "/checkout.html";
        });
      }
    };

    initDrawers();
    updateBadges();
  }

  // Render items inside the cart drawer
  function renderCartDrawerItems() {
    const container = document.getElementById("cart-items");
    const subtotalEl = document.getElementById("cart-subtotal");
    if (!container || !subtotalEl) return;

    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem("heelsup_cart") || "[]");
    } catch {}

    if (!cart.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:4rem 0; color:#666;">
          <i class="fa-solid fa-bag-shopping" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
          <p>Your bag is empty.</p>
          <a href="/shop.html" class="btn btn-outline" style="margin-top:1.5rem; display:inline-block">Shop Now</a>
        </div>
      `;
      subtotalEl.textContent = "₹0";
      return;
    }

    container.innerHTML = cart.map(item => `
      <div class="cart-item" style="display:flex; gap:16px; margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #EAEAEA">
        <img src="${item.image || item.images?.[0] || ''}" alt="${item.name}" style="width:70px; height:80px; object-fit:cover; border-radius:4px">
        <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between">
          <div>
            <h4 style="font-size:0.95rem; font-weight:600; margin-bottom:4px">${item.name}</h4>
            <div style="font-size:0.8rem; color:#666">Size: ${item.size || "Standard"}</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px">
            <div style="display:flex; align-items:center; border:1px solid #EAEAEA; border-radius:4px">
              <button onclick="window.HeelsUpUI.updateDrawerQty('${item.id}', -1)" style="padding:4px 10px; cursor:pointer"><i class="fa-solid fa-minus" style="font-size:0.7rem"></i></button>
              <span style="padding:0 8px; font-size:0.9rem">${item.qty || 1}</span>
              <button onclick="window.HeelsUpUI.updateDrawerQty('${item.id}', 1)" style="padding:4px 10px; cursor:pointer"><i class="fa-solid fa-plus" style="font-size:0.7rem"></i></button>
            </div>
            <div style="font-weight:600">${formatPrice(item.price * (item.qty || 1))}</div>
          </div>
        </div>
      </div>
    `).join("");

    const subtotal = cart.reduce((s, item) => s + (item.price * (item.qty || 1)), 0);
    subtotalEl.textContent = formatPrice(subtotal);
  }

  // Update quantity inside the drawer and storage
  function updateDrawerQty(id, delta) {
    try {
      let cart = JSON.parse(localStorage.getItem("heelsup_cart") || "[]");
      const idx = cart.findIndex(item => String(item.id) === String(id));
      if (idx !== -1) {
        cart[idx].qty = (cart[idx].qty || 1) + delta;
        if (cart[idx].qty <= 0) {
          cart.splice(idx, 1);
        }
        localStorage.setItem("heelsup_cart", JSON.stringify(cart));
        renderCartDrawerItems();
        updateBadges();
        // Dispatch window storage event to alert other page logic
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Export window.HeelsUpUI object to keep backward compatibility
  window.HeelsUpUI = {
    showToast,
    showLoader,
    hideLoader,
    skeleton,
    updateCartBadge: updateBadges,
    updateWishlistBadge: updateBadges,
    updateDrawerQty,
    formatPrice
  };

  // Run initial loading on page load
  document.addEventListener("DOMContentLoaded", () => {
    initUI();
  });
})();
