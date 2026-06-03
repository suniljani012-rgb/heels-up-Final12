/* ═══════════════════════════════════════════════════
       SETTINGS ENGINE — Enterprise Grade
    ═══════════════════════════════════════════════════ */
    let liveSettings = {};

    // ── PROGRESS ──────────────────────────────────────
    const Progress = {
      el: document.getElementById('nprogress'),
      start() { this.el.style.width = '30%'; this.el.style.opacity = '1' },
      done() { this.el.style.width = '100%'; setTimeout(() => { this.el.style.opacity = '0'; setTimeout(() => { this.el.style.width = '0'; this.el.style.opacity = '1' }, 300) }, 200) }
    };

    // ── AUTH ──────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const user = HeelsUpAuth.getUser();
        if (!user || user.role !== 'admin') {
          window.location = 'login.html?redirect=admin-settings.html';
          return;
        }
        const uname = user.firstName || user.first_name || 'Admin';
        document.getElementById('s-avatar').textContent = uname.charAt(0).toUpperCase();
        document.getElementById('s-name').textContent = uname;
        loadSettings();
      } catch (e) {
        showToast('Authentication failure. Please re-login.', 'error');
      }
    });

    // ── SIDEBAR ───────────────────────────────────────
    function toggleSidebar() {
      const s = document.getElementById('sidebar');
      const o = document.getElementById('mobOverlay');
      s.classList.toggle('open');
      o.style.display = s.classList.contains('open') ? 'block' : 'none';
    }
    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('mobOverlay').style.display = 'none';
    }
    function doLogout() {
      if (confirm('Logout from admin panel?')) {
        HeelsUpAuth.clearSession();
        window.location = 'login.html';
      }
    }

    // ── TOAST ─────────────────────────────────────────
    function showToast(msg, type = 'success', dur = 4000) {
      const wrap = document.getElementById('toastWrap');
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span><span class="toast-close" onclick="this.parentNode.remove()">✕</span>`;
      wrap.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, dur);
    }

    // ── CONFIRM MODAL ─────────────────────────────────
    let confirmCb = null;
    function openConfirmModal(title, msg, cb, isDanger = true) {
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = msg;
      const btn = document.getElementById('confirmActionBtn');
      btn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
      const iconEl = document.getElementById('confirmIcon');
      iconEl.innerHTML = isDanger
        ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--rose)"></i>'
        : '<i class="fa-solid fa-circle-question" style="color:var(--blue)"></i>';
      confirmCb = cb;
      document.getElementById('confirmModal').classList.add('show');
    }
    function closeConfirmModal() {
      document.getElementById('confirmModal').classList.remove('show');
      confirmCb = null;
    }
    document.getElementById('confirmActionBtn').addEventListener('click', () => {
      if (confirmCb) confirmCb();
      closeConfirmModal();
    });
    document.getElementById('confirmModal').addEventListener('click', function (e) {
      if (e.target === this) closeConfirmModal();
    });

    // ── PANEL NAV ─────────────────────────────────────
    function showPanel(id, btn) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
      document.getElementById('panel-' + id).classList.add('active');
      btn.classList.add('active');
    }

    // ── FORM UTILS ────────────────────────────────────
    function toggleSecret(inputId, btn) {
      const input = document.getElementById(inputId);
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
      }
    }
    function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
    function showInlineError(wrapperId, msgId, msg) {
      const w = document.getElementById(wrapperId);
      if (w) { w.style.display = 'flex'; document.getElementById(msgId).textContent = msg; }
    }
    function hideInlineError(wrapperId) {
      const w = document.getElementById(wrapperId); if (w) w.style.display = 'none';
    }

    // ── LOAD SETTINGS ─────────────────────────────────
    async function loadSettings() {
      Progress.start();
      document.getElementById('settings-loading').style.display = 'flex';
      document.getElementById('panels-wrapper').style.display = 'none';

      try {
        const data = await HeelsUpAuth.api('/api/admin/settings');
        liveSettings = data.settings || data || {};

        // Razorpay
        document.getElementById('razorpay_key_id').value = liveSettings.razorpay_key_id || '';
        document.getElementById('razorpay_key_secret').value = liveSettings.razorpay_key_secret || '';
        document.getElementById('razorpay_mode').value = liveSettings.razorpay_mode || 'test';

        // OTP
        document.getElementById('otp_script_url').value = liveSettings.otp_script_url || '';
        document.getElementById('google_client_id').value = liveSettings.google_client_id || '';
        document.getElementById('otp_expiry_minutes').value = liveSettings.otp_expiry_minutes || '10';
        document.getElementById('require_email_otp').checked = !!liveSettings.require_email_otp;

        // Shipping
        document.getElementById('shipping_free_above').value = liveSettings.shipping_free_above || '499';
        document.getElementById('shipping_standard_charge').value = liveSettings.shipping_standard_charge || '49';

        // Store
        document.getElementById('site_name').value = liveSettings.site_name || '';
        document.getElementById('support_phone').value = liveSettings.support_phone || '';
        document.getElementById('site_email').value = liveSettings.site_email || '';

        // Security
        document.getElementById('max_login_attempts').value = liveSettings.max_login_attempts || '5';
        document.getElementById('lockout_duration_minutes').value = liveSettings.lockout_duration_minutes || '30';

        // Maintenance
        document.getElementById('maintenance_mode').checked = !!liveSettings.maintenance_mode;

        document.getElementById('settings-loading').style.display = 'none';
        document.getElementById('panels-wrapper').style.display = 'block';
        Progress.done();

      } catch (err) {
        Progress.done();
        showToast('Failed to load settings. Check connection.', 'error');
        document.getElementById('settings-loading').innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <i class="fa-solid fa-server" style="font-size:2.2rem;color:var(--rose);display:block;margin-bottom:14px"></i>
        <div style="font-size:.95rem;font-weight:700;color:var(--text);margin-bottom:6px">Connection Failed</div>
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:18px">Unable to load secure configurations from server.</div>
        <button class="btn btn-outline btn-sm" onclick="loadSettings()">
          <i class="fa-solid fa-rotate-right"></i> Retry
        </button>
      </div>`;
      }
    }

    // ── SAVE SECTION ──────────────────────────────────
    async function saveSection(section) {
      const btn = document.getElementById(`btn-save-${section}`);
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

      // Hide any inline errors first
      hideInlineError('rz-error');
      hideInlineError('store-error');

      let payload = {};
      try {
        if (section === 'razorpay') {
          const keyId = document.getElementById('razorpay_key_id').value.trim();
          const mode = document.getElementById('razorpay_mode').value;
          if (mode === 'live' && keyId && !keyId.startsWith('rzp_live_')) {
            throw new Error('Live mode requires a key starting with rzp_live_');
          }
          payload = {
            razorpay_key_id: keyId,
            razorpay_key_secret: document.getElementById('razorpay_key_secret').value.trim(),
            razorpay_mode: mode
          };
        } else if (section === 'otp') {
          payload = {
            otp_script_url: document.getElementById('otp_script_url').value.trim(),
            google_client_id: document.getElementById('google_client_id').value.trim(),
            otp_expiry_minutes: parseInt(document.getElementById('otp_expiry_minutes').value) || 10,
            require_email_otp: document.getElementById('require_email_otp').checked
          };
        } else if (section === 'shipping') {
          const fa = parseInt(document.getElementById('shipping_free_above').value);
          const sc = parseInt(document.getElementById('shipping_standard_charge').value);
          if (fa < 0 || sc < 0) throw new Error('Shipping values cannot be negative.');
          payload = { shipping_free_above: fa || 0, shipping_standard_charge: sc || 0 };
        } else if (section === 'store') {
          const email = document.getElementById('site_email').value.trim();
          if (email && !validateEmail(email)) throw new Error('Invalid email format.');
          payload = {
            site_name: document.getElementById('site_name').value.trim(),
            support_phone: document.getElementById('support_phone').value.trim(),
            site_email: email
          };
        } else if (section === 'security') {
          const maxAtt = parseInt(document.getElementById('max_login_attempts').value);
          if (maxAtt < 1) throw new Error('Attempt limit must be at least 1.');
          payload = {
            max_login_attempts: maxAtt || 5,
            lockout_duration_minutes: parseInt(document.getElementById('lockout_duration_minutes').value) || 30
          };
        } else if (section === 'maintenance') {
          payload = { maintenance_mode: document.getElementById('maintenance_mode').checked };
        }

        await HeelsUpAuth.api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
        liveSettings = { ...liveSettings, ...payload };
        showToast('Settings saved successfully!', 'success');

      } catch (e) {
        // Show inline error for relevant panels
        if (section === 'razorpay') showInlineError('rz-error', 'rz-error-msg', e.message || 'Failed to save');
        else if (section === 'store') showInlineError('store-error', 'store-error-msg', e.message || 'Failed to save');
        else showToast(e.message || 'Failed to save settings.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    }

    // ── TEST API ──────────────────────────────────────
    async function testLiveAPI(type) {
      const btn = document.getElementById(`btn-test-${type}`);
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Testing…';

      try {
        if (type === 'razorpay') {
          const keyId = document.getElementById('razorpay_key_id').value.trim();
          const secret = document.getElementById('razorpay_key_secret').value.trim();
          if (!keyId || !secret) throw new Error('Key ID and Secret are required for testing.');
          if (!keyId.startsWith('rzp_')) throw new Error('Key must start with rzp_ format.');
          const resp = await HeelsUpAuth.api('/api/admin/settings/test/razorpay', {
            method: 'POST', body: JSON.stringify({ razorpay_key_id: keyId, razorpay_key_secret: secret })
          });
          if (resp.success) showToast('Razorpay connection established successfully!', 'success');
          else throw new Error(resp.message || 'Razorpay API test failed.');
        } else if (type === 'otp') {
          const url = document.getElementById('otp_script_url').value.trim();
          if (!url) throw new Error('Script URL is required for testing.');
          if (!url.includes('script.google.com/macros/')) throw new Error('Invalid Google Apps Script URL format.');
          const resp = await HeelsUpAuth.api('/api/admin/settings/test/otp', {
            method: 'POST', body: JSON.stringify({ otp_script_url: url })
          });
          if (resp.success) showToast('Test OTP email sent successfully!', 'success');
          else throw new Error(resp.message || 'Mailer test failed.');
        }
      } catch (err) {
        showToast(err.message || 'API test failed.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    }

    // ── EMERGENCY ACTIONS ─────────────────────────────
    function triggerAction(actionType) {
      if (actionType === 'sessions') {
        openConfirmModal(
          'Terminate Global Sessions',
          'DANGER: This forces immediate invalidation of all user authentication tokens including yours. You will be instantly logged out. Proceed?',
          async () => {
            try {
              await HeelsUpAuth.api('/api/admin/settings/clear-sessions', { method: 'POST' });
              showToast('All sessions terminated. Logging out…', 'warning');
              setTimeout(() => { HeelsUpAuth.clearSession(); window.location = 'login.html'; }, 1500);
            } catch (e) { showToast('Failed to clear sessions.', 'error'); }
          },
          true
        );
      } else if (actionType === 'locks') {
        openConfirmModal(
          'Clear Rate-Limit Blocklist',
          'Are you sure you want to unlock all IP addresses and accounts currently restricted by brute-force protection?',
          async () => {
            try {
              await HeelsUpAuth.api('/api/admin/settings/clear-locks', { method: 'POST' });
              showToast('Security blocklist cleared successfully.', 'success');
            } catch (e) { showToast('Failed to clear blocklist.', 'error'); }
          },
          false
        );
      }
    }

    // ── KEYBOARD SHORTCUTS ────────────────────────────
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeConfirmModal();
    });