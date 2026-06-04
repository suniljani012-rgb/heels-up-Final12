(function () {
  const API_BASE = (window.HEELSUP_CONFIG && window.HEELSUP_CONFIG.API_BASE) || "";

  function getToken() {
    return localStorage.getItem("heelsup_token") || "";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("heelsup_user") || "null");
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) localStorage.setItem("heelsup_token", token);
    if (user) localStorage.setItem("heelsup_user", JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem("heelsup_token");
    localStorage.removeItem("heelsup_user");
  }

  function authHeaders(extra) {
    const headers = Object.assign({ "Content-Type": "application/json" }, extra || {});
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function api(path, options) {
    const opts = Object.assign({ method: "GET" }, options || {});
    opts.headers = authHeaders(opts.headers || {});
    const response = await fetch(`${API_BASE}${path}`, opts);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      const err = new Error((data && (data.error || data.message)) || "Request failed");
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Dynamic settings loading and storefront injection
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/public`);
      if (response.ok) {
        const json = await response.json();
        const settings = json.data || json;
        if (settings) {
          // 1. Update Whatsapp floats and links
          const phone = settings.support_phone || settings.store_phone;
          if (phone) {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
              link.href = `https://wa.me/${cleanPhone}?text=Hello HeelsUp! I want to enquire about your products.`;
            });
            document.querySelectorAll('.whatsapp-number').forEach(el => {
              el.textContent = phone;
            });
          }

          // 2. Update store email
          const email = settings.store_email || settings.site_email;
          if (email) {
            document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
              link.href = `mailto:${email}`;
            });
            document.querySelectorAll('.store-email-label').forEach(el => {
              el.textContent = email;
            });
          }

          // 3. Update Social links
          if (settings.social_instagram) {
            document.querySelectorAll('a[href*="instagram.com"]').forEach(link => {
              link.href = settings.social_instagram;
            });
          }
          if (settings.social_facebook) {
            document.querySelectorAll('a[href*="facebook.com"]').forEach(link => {
              link.href = settings.social_facebook;
            });
          }
          if (settings.social_pinterest) {
            document.querySelectorAll('a[href*="pinterest.com"]').forEach(link => {
              link.href = settings.social_pinterest;
            });
          }

          // 4. Update Footer Tagline
          if (settings.footer_tagline) {
            const taglineEl = document.querySelector('.footer-tagline');
            if (taglineEl) taglineEl.textContent = settings.footer_tagline;
          }

          // 5. Update shipping notice thresholds
          const threshold = settings.shipping_free_above || settings.free_delivery_threshold;
          if (threshold) {
            document.querySelectorAll('.free-shipping-threshold').forEach(el => {
              el.textContent = `₹${threshold}`;
            });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load public settings dynamically:", e);
    }
  });

  window.HeelsUpAuth = {
    API_BASE,
    getToken,
    getUser,
    setSession,
    clearSession,
    api
  };
})();

