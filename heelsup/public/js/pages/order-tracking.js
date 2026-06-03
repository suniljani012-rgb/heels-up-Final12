/*!
     * HeelsUp Order Tracking Engine v2.0
     * - Live API integration via HeelsUpAuth.api()
     * - Secure: all user inputs validated + HTML-escaped
     * - Visual stepper + vertical timeline
     * - URL param support: ?id=ORD-XXXX
     * - Copy to clipboard, courier link
     */
    'use strict';

    /* ── UTILS ── */
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');
    const fmtDate = (d, short = false) => {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-IN', short
        ? { day: '2-digit', month: 'short', year: 'numeric' }
        : { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const fmtShort = d => fmtDate(d, true);

    /* ── TOAST ── */
    function toast(msg, type = 's', dur = 4000) {
      const wrap = $('toast-wrap');
      if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const icons = { s: 'fa-circle-check', e: 'fa-circle-xmark', i: 'fa-circle-info' };
      el.innerHTML = `<i class="fa-solid ${icons[type] || icons.s}" aria-hidden="true"></i><span>${esc(msg)}</span>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 420); }, dur);
    }

    /* ── NAVBAR ── */
    window.addEventListener('scroll', () => {
      $('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
      $('scroll-top')?.classList.toggle('show', window.scrollY > 380);
    }, { passive: true });
    $('scroll-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ── MOBILE MENU ── */
    const mobMenu = $('mob-menu'), hamburger = $('hamburger');
    function openMob() { mobMenu.classList.add('open'); hamburger.classList.add('open'); hamburger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; }
    function closeMob() { mobMenu.classList.remove('open'); hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
    hamburger?.addEventListener('click', openMob);
    $('mob-close')?.addEventListener('click', closeMob);
    $('mob-bd')?.addEventListener('click', closeMob);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMob(); });

    /* ── AUTH ── */
    (function () {
      let user = null;
      try { user = HeelsUpAuth.getUser(); } catch (e) { }
      if (user) {
        const n = user.firstName || user.first_name || user.name || '';
        const acc = $('nav-acc');
        if (acc) { acc.setAttribute('title', 'Hello, ' + n); }
        const ml = $('mob-login');
        if (ml) { ml.textContent = 'My Account'; ml.href = '/account'; }
      }
    })();

    /* ── CART BADGE ── */
    try {
      const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
      const b = $('cart-cnt');
      if (b && cnt > 0) { b.textContent = cnt; b.style.display = 'flex'; }
    } catch (e) { }

    /* ── STATUS HELPERS ── */
    const STATUS_LABELS = {
      placed: 'Order Placed',
      confirmed: 'Confirmed',
      processing: 'Processing',
      packed: 'Packed',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      exchange_requested: 'Exchange Requested',
      exchange_approved: 'Exchange Approved',
      exchange_rejected: 'Exchange Rejected',
    };

    function getStatusClass(s) {
      s = (s || '').toLowerCase().replace(/\s+/g, '_');
      const m = {
        placed: 'st-placed', confirmed: 'st-confirmed',
        processing: 'st-processing', packed: 'st-packed',
        shipped: 'st-shipped', out_for_delivery: 'st-out_for_delivery',
        delivered: 'st-delivered', cancelled: 'st-cancelled',
        exchange_requested: 'st-exchange_requested',
        exchange_approved: 'st-exchange_approved',
        exchange_rejected: 'st-exchange_rejected',
      };
      return m[s] || 'st-placed';
    }

    function getStatusDotClass(s) {
      return 'st-dot-' + (s || 'placed').toLowerCase().replace(/\s+/g, '_');
    }

    /* ── STEPPER CONFIG ── */
    const STEPS = [
      { key: 'placed', label: 'Placed', icon: 'fa-bag-shopping' },
      { key: 'confirmed', label: 'Confirmed', icon: 'fa-circle-check' },
      { key: 'shipped', label: 'Shipped', icon: 'fa-truck' },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'fa-motorcycle' },
      { key: 'delivered', label: 'Delivered', icon: 'fa-house-circle-check' },
    ];

    const STEP_ORDER = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

    function getStepIndex(status) {
      const s = (status || 'placed').toLowerCase();
      if (s.includes('exchange')) return 6;
      if (s === 'cancelled') return -1;
      const idx = STEP_ORDER.indexOf(s);
      return idx === -1 ? 0 : idx;
    }

    /* ── BUILD STEPPER HTML ── */
    function buildStepper(order) {
      const s = (order.order_status || 'placed').toLowerCase();
      const isCancelled = s === 'cancelled';
      const isExchange = s.includes('exchange');
      const curIdx = getStepIndex(s);

      const dots = STEPS.map((step, i) => {
        let cls = 'pending';
        let dotTime = '';
        if (isCancelled) {
          cls = i === 0 ? 'done' : 'pending';
        } else if (isExchange) {
          cls = i <= 4 ? 'done' : 'pending';
        } else {
          const si = STEP_ORDER.indexOf(step.key);
          if (si < curIdx) cls = 'done';
          else if (si === curIdx || (step.key === s)) cls = 'active';
        }

        // Timestamps
        const tsMap = {
          placed: order.created_at, confirmed: order.confirmed_at,
          shipped: order.shipped_at, out_for_delivery: order.out_for_delivery_at,
          delivered: order.delivered_at,
        };
        const ts = tsMap[step.key];
        if (ts && cls !== 'pending') {
          dotTime = `<div class="h-step-time">${fmtShort(ts)}</div>`;
        } else if (cls === 'active') {
          dotTime = `<div class="h-step-time" style="color:var(--primary);font-weight:700">Now</div>`;
        }

        return `<div class="h-step ${cls}">
      <div class="h-step-circle">
        ${cls === 'done' ? '<i class="fa-solid fa-check"></i>' :
            cls === 'active' ? `<i class="fa-solid ${step.icon}"></i>` :
              isCancelled && step.key === 'placed' ? '<i class="fa-solid fa-check"></i>' :
                `<i class="fa-solid ${step.icon}"></i>`}
      </div>
      <div class="h-step-label">${esc(step.label)}</div>
      ${dotTime}
    </div>`;
      });

      if (isCancelled) {
        return `<div class="h-stepper" role="list" aria-label="Order timeline">
      ${dots.join('')}
    </div>
    <div style="margin-top:16px;padding:14px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:var(--radius-sm);display:flex;align-items:center;gap:10px">
      <i class="fa-solid fa-ban" style="color:#EF4444;font-size:1rem"></i>
      <div>
        <div style="font-family:var(--font-head);font-size:13.5px;font-weight:700;color:#B91C1C">Order Cancelled</div>
        ${order.cancelled_at ? `<div style="font-size:12px;color:#EF4444">${fmtDate(order.cancelled_at)}</div>` : ''}
      </div>
    </div>`;
      }

      if (isExchange) {
        const exLabel = s === 'exchange_approved' ? 'Exchange Approved' : s === 'exchange_rejected' ? 'Exchange Rejected' : 'Exchange Requested';
        const exColor = s === 'exchange_approved' ? '#10B981' : s === 'exchange_rejected' ? '#EF4444' : '#EC4899';
        const exBg = s === 'exchange_approved' ? '#F0FDF4' : s === 'exchange_rejected' ? '#FEF2F2' : '#FDF4FF';
        const exBorder = s === 'exchange_approved' ? '#BBF7D0' : s === 'exchange_rejected' ? '#FECACA' : '#F5D0FE';
        return `<div class="h-stepper">${dots.join('')}</div>
    <div style="margin-top:16px;padding:14px 16px;background:${exBg};border:1px solid ${exBorder};border-radius:var(--radius-sm);display:flex;align-items:center;gap:10px">
      <i class="fa-solid fa-arrows-rotate" style="color:${exColor};font-size:1rem"></i>
      <div>
        <div style="font-family:var(--font-head);font-size:13.5px;font-weight:700;color:${exColor}">${esc(exLabel)}</div>
        ${order.exchange_reason ? `<div style="font-size:12px;color:${exColor};margin-top:2px">Reason: ${esc(order.exchange_reason)}</div>` : ''}
      </div>
    </div>`;
      }

      return `<div class="h-stepper" role="list" aria-label="Order tracking steps">${dots.join('')}</div>`;
    }

    /* ── BUILD VERTICAL TIMELINE ── */
    function buildTimeline(order) {
      const s = (order.order_status || 'placed').toLowerCase();
      const curIdx = getStepIndex(s);
      const isCancelled = s === 'cancelled';

      const events = [
        { key: 'placed', label: 'Order Placed', icon: 'fa-bag-shopping', ts: order.created_at, desc: `Order ${esc(order.order_number || '#' + order.id)} placed successfully.` },
        { key: 'confirmed', label: 'Order Confirmed', icon: 'fa-circle-check', ts: order.confirmed_at || null, desc: 'Your order has been confirmed and is being prepared.' },
        { key: 'shipped', label: 'Shipped', icon: 'fa-truck', ts: order.shipped_at || null, desc: order.tracking_number ? `Tracking: ${esc(order.tracking_number)}` : 'Your order is on its way.' },
        { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'fa-motorcycle', ts: order.out_for_delivery_at || null, desc: 'Our delivery partner is on the way to your address.' },
        { key: 'delivered', label: 'Delivered', icon: 'fa-house-circle-check', ts: order.delivered_at || null, desc: 'Your order has been delivered successfully. Enjoy your purchase!' },
      ];

      const items = events.map(ev => {
        const si = STEP_ORDER.indexOf(ev.key);
        let cls = 'pending';
        if (isCancelled) { cls = ev.key === 'placed' ? 'done' : 'pending'; }
        else if (si < curIdx) { cls = 'done'; }
        else if (si === curIdx) { cls = 'active'; }

        const icon = cls === 'done' ? 'fa-check' : ev.icon;
        return `<div class="vt-item ${cls}">
      <div class="vt-dot" aria-hidden="true"><i class="fa-solid ${icon}"></i></div>
      <div class="vt-content">
        <div class="vt-event">${esc(ev.label)}</div>
        ${ev.ts ? `<div class="vt-time">${fmtDate(ev.ts)}</div>` : cls === 'active' ? '<div class="vt-time" style="color:var(--primary);font-weight:600">In Progress</div>' : '<div class="vt-time">Pending</div>'}
        ${cls !== 'pending' ? `<div class="vt-desc">${ev.desc}</div>` : ''}
      </div>
    </div>`;
      });

      if (isCancelled) {
        items.push(`<div class="vt-item error">
      <div class="vt-dot"><i class="fa-solid fa-ban"></i></div>
      <div class="vt-content">
        <div class="vt-event">Cancelled</div>
        ${order.cancelled_at ? `<div class="vt-time">${fmtDate(order.cancelled_at)}</div>` : ''}
      </div>
    </div>`);
      }

      return `<div class="v-timeline" role="list" aria-label="Order history">
    <div class="vt-title"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true" style="margin-right:6px"></i>Order History</div>
    ${items.join('')}
  </div>`;
    }

    /* ── BUILD FULL RESULT HTML ── */
    function buildResult(order) {
      const s = (order.order_status || 'placed').toLowerCase();
      const statusLbl = STATUS_LABELS[s] || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const stCls = getStatusClass(s);
      const dotCls = getStatusDotClass(s);

      const items = Array.isArray(order.items) || Array.isArray(order.order_items)
        ? (order.items || order.order_items) : [];

      // Expected delivery estimate
      let estDelivery = '';
      if (order.created_at && !['delivered', 'cancelled'].includes(s)) {
        const d = new Date(order.created_at);
        const metro = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];
        const city = order.city || '';
        const days = metro.some(c => city.toLowerCase().includes(c.toLowerCase())) ? [3, 5] : [5, 8];
        const from = new Date(d); from.setDate(from.getDate() + days[0]);
        const to = new Date(d); to.setDate(to.getDate() + days[1]);
        estDelivery = fmtShort(from) + ' – ' + fmtShort(to);
      }

      return `
  <div class="result-wrap">

    <!-- Order Info Card -->
    <div class="order-info-card">
      <div class="oic-head">
        <div>
          <div class="oic-order-num">${esc(order.order_number || '#' + order.id)}</div>
          <div class="oic-date">Placed on ${fmtDate(order.created_at, true)}</div>
        </div>
        <div class="oic-status-pill ${stCls}">
          <span class="oic-status-dot ${dotCls}"></span>
          ${esc(statusLbl)}
        </div>
      </div>
      <div class="oic-body">
        <div class="oic-meta-grid">
          <div class="oic-meta-item">
            <div class="oic-meta-lbl">Order Total</div>
            <div class="oic-meta-val highlight">${fmt(order.total_amount || 0)}</div>
          </div>
          <div class="oic-meta-item">
            <div class="oic-meta-lbl">Payment</div>
            <div class="oic-meta-val">${esc((order.payment_method || 'Online').toUpperCase())} · ${esc(order.payment_status || 'Pending')}</div>
          </div>
          ${estDelivery ? `<div class="oic-meta-item">
            <div class="oic-meta-lbl">Est. Delivery</div>
            <div class="oic-meta-val green">${esc(estDelivery)}</div>
          </div>` : s === 'delivered' ? `<div class="oic-meta-item">
            <div class="oic-meta-lbl">Delivered On</div>
            <div class="oic-meta-val green">${fmtShort(order.delivered_at)}</div>
          </div>` : `<div class="oic-meta-item">
            <div class="oic-meta-lbl">Items</div>
            <div class="oic-meta-val">${items.length || '—'} item${items.length !== 1 ? 's' : ''}</div>
          </div>`}
        </div>

        ${items.length ? `
        <div class="oic-items-title">Order Items (${items.length})</div>
        ${items.map(it => {
        const snap = (() => { try { return typeof it.product_snapshot === 'string' ? JSON.parse(it.product_snapshot) : (it.product_snapshot || {}); } catch (e) { return {}; } })();
        const img = esc(snap.image || it.image || it.product_image || '');
        const name = esc(it.product_name || snap.name || it.name || 'Product');
        const size = it.size ? ` · Size: ${esc(it.size)}` : '';
        const qty = it.qty || it.quantity || 1;
        const price = it.unit_price || it.price || 0;
        return `<div class="oic-item">
            ${img ? `<img class="oic-item-img" src="${img}" alt="${name}" loading="lazy" onerror="this.style.display='none'">` :
            '<div class="oic-item-img"></div>'}
            <div style="flex:1;min-width:0">
              <div class="oic-item-name">${name}</div>
              <div class="oic-item-meta">Qty: ${qty}${size}</div>
            </div>
            <div class="oic-item-price">${fmt(price * qty)}</div>
          </div>`;
      }).join('')}` : ''}
      </div>
    </div>

    <!-- Stepper Card -->
    <div class="stepper-card">
      <div class="stepper-head">
        <div>
          <div class="stepper-head-title">Live Tracking Status</div>
        </div>
        ${order.tracking_number ? `<div class="stepper-head-id">
          <span style="color:var(--text-pale);font-size:11px">Tracking #</span>
          <strong style="font-family:var(--font-head);font-size:12px;color:var(--text-h);margin-left:4px">${esc(order.tracking_number)}</strong>
        </div>` : ''}
      </div>
      <div class="stepper-body">
        ${buildStepper(order)}
        ${buildTimeline(order)}
      </div>
    </div>

    ${order.tracking_number ? `
    <!-- Courier Card -->
    <div class="courier-card">
      <div class="cc-head">
        <div class="cc-head-icon"><i class="fa-solid fa-truck-fast"></i></div>
        <div class="cc-head-title">Courier & Tracking Details</div>
      </div>
      <div class="cc-body">
        ${order.courier_name || order.delivery_method ? `
        <div class="cc-row">
          <span class="cc-lbl">Courier</span>
          <span class="cc-val">${esc(order.courier_name || order.delivery_method || 'Standard Delivery')}</span>
        </div>` : ''}
        <div class="cc-row">
          <span class="cc-lbl">Tracking No.</span>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="cc-val mono" id="track-num">${esc(order.tracking_number)}</span>
            <button class="cc-copy-btn" onclick="copyTracking('${esc(order.tracking_number)}')" aria-label="Copy tracking number">
              <i class="fa-regular fa-copy"></i> Copy
            </button>
          </div>
        </div>
        ${order.shipped_at ? `<div class="cc-row">
          <span class="cc-lbl">Shipped On</span>
          <span class="cc-val">${fmtDate(order.shipped_at, true)}</span>
        </div>` : ''}
        ${order.tracking_url ? `
        <a href="${esc(order.tracking_url)}" target="_blank" rel="noopener noreferrer" class="cc-track-btn">
          <i class="fa-solid fa-location-dot"></i> Track on Courier Website
          <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:.75rem;opacity:.7"></i>
        </a>` : `
        <a href="https://shiprocket.co/" target="_blank" rel="noopener noreferrer" class="cc-track-btn">
          <i class="fa-solid fa-location-dot"></i> Track via Shiprocket
          <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:.75rem;opacity:.7"></i>
        </a>`}
      </div>
    </div>` : ''}

    <!-- Delivery Address -->
    ${order.address_line1 || order.city ? `
    <div class="addr-card">
      <div class="addr-head">
        <i class="fa-solid fa-location-dot"></i>
        <div class="addr-head-title">Delivery Address</div>
      </div>
      <div class="addr-body">
        <div class="addr-name">${esc(order.customer_name || 'Customer')}</div>
        <div class="addr-text">
          ${esc(order.address_line1 || '')}${order.address_line2 ? ', ' + esc(order.address_line2) : ''}<br>
          ${[order.city, order.state, order.pincode].filter(Boolean).map(esc).join(', ')}<br>
          ${esc(order.country || 'India')}
        </div>
        ${order.customer_phone ? `<div class="addr-phone"><i class="fa-solid fa-phone" style="color:var(--text-pale);font-size:.8rem"></i>${esc(order.customer_phone)}</div>` : ''}
      </div>
    </div>` : ''}

    <!-- Amount Breakdown -->
    <div class="amount-card">
      <div class="ac-head">
        <i class="fa-solid fa-indian-rupee-sign"></i>
        <div class="ac-head-title">Order Amount</div>
      </div>
      <div class="ac-body">
        <div class="ac-row">
          <span class="ac-lbl">Subtotal</span>
          <span>${fmt(order.subtotal_amount || 0)}</span>
        </div>
        <div class="ac-row">
          <span class="ac-lbl">Shipping</span>
          <span>${order.shipping_amount > 0 ? fmt(order.shipping_amount) : '<span style="color:#10B981;font-weight:600">FREE</span>'}</span>
        </div>
        ${order.tax_amount ? `<div class="ac-row">
          <span class="ac-lbl">Tax (GST)</span>
          <span>${fmt(order.tax_amount)}</span>
        </div>` : ''}
        ${order.discount_amount > 0 ? `<div class="ac-row discount">
          <span class="ac-lbl">Discount${order.coupon_code ? ` (${esc(order.coupon_code)})` : ''}</span>
          <span>−${fmt(order.discount_amount)}</span>
        </div>` : ''}
        <div class="ac-row total">
          <span class="ac-lbl">Total Paid</span>
          <span>${fmt(order.total_amount || 0)}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
      <a href="/orders" class="btn btn-outline btn-pill btn-sm">
        <i class="fa-solid fa-list"></i> All Orders
      </a>
      ${!['delivered', 'cancelled'].includes(s) ? `
      <a href="https://wa.me/919876543210?text=Hi%20HeelsUp%2C%20I%20need%20help%20with%20order%20${encodeURIComponent(order.order_number || order.id)}"
         target="_blank" rel="noopener noreferrer"
         class="btn btn-primary btn-pill btn-sm">
        <i class="fa-brands fa-whatsapp"></i> Get Help
      </a>` : ''}
      ${s === 'delivered' ? `
      <a href="/policy/exchange" class="btn btn-ghost btn-pill btn-sm">
        <i class="fa-solid fa-rotate-left"></i> Exchange Policy
      </a>` : ''}
    </div>

  </div>`;
    }

    /* ── INPUT VALIDATION ── */
    function validateInput(orderId, phone) {
      orderId = orderId.trim().toUpperCase();
      phone = phone.trim().replace(/\D/g, '');

      if (!orderId && !phone) {
        toast('Please enter an Order ID or phone number', 'e');
        return null;
      }
      if (phone && phone.length !== 10) {
        toast('Please enter a valid 10-digit phone number', 'e');
        return null;
      }
      return { orderId, phone };
    }

    /* ── SHOW STATE ── */
    function showLoading() {
      $('result-area').innerHTML = `
    <div class="state-box">
      <div class="spinner" aria-label="Loading"></div>
      <div class="state-title">Tracking your order…</div>
      <p class="state-sub">Please wait while we fetch your order details.</p>
    </div>`;
    }

    function showError(msg) {
      $('result-area').innerHTML = `
    <div class="state-box">
      <span class="state-icon"><i class="fa-solid fa-triangle-exclamation" style="color:var(--primary)"></i></span>
      <div class="state-title">Order Not Found</div>
      <p class="state-sub">${esc(msg)}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-pill btn-sm" onclick="clearResult()">
          <i class="fa-solid fa-rotate-left"></i> Try Again
        </button>
        <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-pill btn-sm">
          <i class="fa-brands fa-whatsapp"></i> Contact Support
        </a>
      </div>
    </div>`;
    }

    function clearResult() {
      $('result-area').innerHTML = `
    <div class="state-box" id="initial-state">
      <span class="state-icon"><i class="fa-solid fa-box-open" style="color:var(--warm-gray)"></i></span>
      <div class="state-title">Enter Your Order Details</div>
      <p class="state-sub">Enter your Order ID or registered phone number to check the live status of your order.</p>
    </div>`;
      $('order-id-inp')?.focus();
    }

    /* ── COPY TRACKING ── */
    window.copyTracking = async function (num) {
      try {
        await navigator.clipboard.writeText(num);
        toast('Tracking number copied!', 's');
      } catch (e) {
        // Fallback
        const el = document.createElement('textarea');
        el.value = num; el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el); el.select();
        document.execCommand('copy'); el.remove();
        toast('Tracking number copied!', 's');
      }
    };

    /* ── MAIN TRACK FUNCTION ── */
    async function handleTrack() {
      const orderId = ($('order-id-inp')?.value || '').trim();
      const phone = ($('phone-inp')?.value || '').trim();

      const val = validateInput(orderId, phone);
      if (!val) return;

      const btn = $('track-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tracking…'; }

      showLoading();

      try {
        let order = null;

        // 1. Try by Order ID via public track endpoint
        if (val.orderId) {
          try {
            const res = await HeelsUpAuth.api('/api/orders/track/' + encodeURIComponent(val.orderId));
            order = res.order || res;
          } catch (e) {
            // Try authenticated endpoint
            try {
              const res2 = await HeelsUpAuth.api('/api/orders/my?q=' + encodeURIComponent(val.orderId));
              const orders = res2.orders || res2.data || [];
              order = orders.find(o =>
                (o.order_number || '').toUpperCase() === val.orderId ||
                String(o.id) === val.orderId
              ) || null;
            } catch (e2) { /* will show error below */ }
          }
        }

        // 2. Try by phone
        if (!order && val.phone) {
          try {
            const res = await HeelsUpAuth.api('/api/orders/track?phone=' + encodeURIComponent(val.phone));
            const orders = res.orders || res.data || [];
            if (orders.length) {
              // Show most recent order
              order = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            }
          } catch (e) { /* will show error below */ }
        }

        // 3. Authenticated my orders fallback
        if (!order && val.phone) {
          try {
            const res = await HeelsUpAuth.api('/api/orders/my?limit=1');
            const orders = res.orders || res.data || [];
            if (orders.length) order = orders[0];
          } catch (e) { }
        }

        if (!order || (!order.id && !order.order_number)) {
          showError('We could not find an order matching your details. Please check your Order ID or phone number and try again.');
          return;
        }

        // ── If we only got minimal data (from track endpoint), try to get full data ──
        if (!order.items && !order.order_items && order.id) {
          try {
            const full = await HeelsUpAuth.api('/api/orders/my/' + encodeURIComponent(order.id));
            order = full.order || full || order;
          } catch (e) { /* use what we have */ }
        }

        $('result-area').innerHTML = buildResult(order);

        // Update URL without reload (security: clean path only)
        if (val.orderId && history.replaceState) {
          history.replaceState(null, '', '/track?id=' + encodeURIComponent(val.orderId));
        }

        // Scroll to result
        setTimeout(() => {
          $('result-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

      } catch (e) {
        showError('Unable to connect to our servers right now. Please try again in a moment or contact support.');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Track Order'; }
      }
    }

    /* ── ENTER KEY SUPPORT ── */
    [$('order-id-inp'), $('phone-inp')].forEach(inp => {
      inp?.addEventListener('keydown', e => { if (e.key === 'Enter') handleTrack(); });
    });

    /* ── AUTO-LOAD FROM URL PARAM ── */
    (function autoLoad() {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id') || params.get('order_id') || params.get('order');
        if (id) {
          // Sanitize: only allow safe order ID characters
          const clean = id.replace(/[^A-Za-z0-9\-_]/g, '').substring(0, 40);
          if (clean) {
            const inp = $('order-id-inp');
            if (inp) inp.value = clean.toUpperCase();
            // Auto-track after DOM ready
            setTimeout(handleTrack, 300);
          }
        }
      } catch (e) { }
    })();