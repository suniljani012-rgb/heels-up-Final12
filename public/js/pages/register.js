'use strict';

    /* redirect if logged in */
    try { if (HeelsUpAuth.getUser()) window.location.href = 'profile.html'; } catch (e) { }

    /* ── State ── */
    let termsAccepted = false;
    let resendTimer = null;

    /* ── Toast ── */
    function toast(msg, type = 's', dur = 4000) {
      const wrap = document.getElementById('toastWrap');
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      const icon = type === 's'
        ? '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      t.innerHTML = icon + msg;
      wrap.appendChild(t);
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, dur);
    }

    /* ── Alert ── */
    function showErr(msg) {
      const box = document.getElementById('alertBox');
      document.getElementById('alertMsg').textContent = msg;
      box.className = 'alert alert-error';
      box.style.display = 'flex';
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function clearErr() {
      document.getElementById('alertBox').style.display = 'none';
    }

    /* ── Terms checkbox ── */
    function toggleTerms() {
      termsAccepted = !termsAccepted;
      document.getElementById('termsCheck').classList.toggle('checked', termsAccepted);
    }

    /* ── Step nav ── */
    function goStep(n) {
      clearErr();
      document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('step' + n).classList.add('active');

      // update dots
      const dot1 = document.getElementById('dot1');
      const dot2 = document.getElementById('dot2');
      const line1 = document.getElementById('line1');

      if (n === 1) {
        dot1.className = 'sp-dot active'; dot1.innerHTML = '<span>1</span><span class="sp-label">Your Details</span>';
        line1.className = 'sp-line';
        dot2.className = 'sp-dot inactive'; dot2.innerHTML = '<span>2</span><span class="sp-label">Verify Email</span>';
      } else {
        dot1.className = 'sp-dot done'; dot1.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span class="sp-label">Your Details</span>';
        line1.className = 'sp-line done';
        dot2.className = 'sp-dot active'; dot2.innerHTML = '<span>2</span><span class="sp-label">Verify Email</span>';
      }
    }

    /* ── Password toggle ── */
    function togglePw(inputId, iconId) {
      const inp = document.getElementById(inputId);
      const isText = inp.type === 'text';
      inp.type = isText ? 'password' : 'text';
      document.getElementById(iconId).innerHTML = isText
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
        : '<line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><circle cx="12" cy="12" r="3"/>';
    }

    /* ── Password strength ── */
    function checkStrength(pw) {
      let score = 0;
      if (pw.length >= 8) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^a-zA-Z0-9]/.test(pw)) score++;
      const cls = ['', 'w', 'w', 'm', 's'];
      const labels = ['Enter a password', 'Weak', 'Weak', 'Fair', 'Strong'];
      const colors = ['var(--text-4)', 'var(--rose)', 'var(--rose)', 'var(--gold)', 'var(--teal)'];
      ['seg0', 'seg1', 'seg2', 'seg3'].forEach((id, i) => {
        const seg = document.getElementById(id);
        seg.className = 'pw-seg' + (i < score ? ' ' + cls[score] : '');
      });
      const lbl = document.getElementById('strengthLbl');
      lbl.textContent = pw ? labels[score] : 'Enter a password';
      lbl.style.color = pw ? colors[score] : 'var(--text-4)';
    }

    /* ── Field validation ── */
    function fieldErr(id, show) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('show', show);
    }
    function validate() {
      let ok = true;
      const fname = document.getElementById('fFname').value.trim();
      const email = document.getElementById('fEmail').value.trim();
      const phone = document.getElementById('fPhone').value.replace(/\D/g, '');
      const pw = document.getElementById('fPw').value;
      const confirm = document.getElementById('fConfirm').value;

      fieldErr('errFname', !fname); if (!fname) ok = false;
      fieldErr('errEmail', !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)); if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ok = false;
      fieldErr('errPhone', phone.length !== 10); if (phone.length !== 10) ok = false;
      fieldErr('errPw', pw.length < 8); if (pw.length < 8) ok = false;
      fieldErr('errConfirm', pw !== confirm); if (pw !== confirm) ok = false;
      if (!termsAccepted) { toast('Please accept the Terms of Service', 'e', 3000); ok = false; }
      return ok;
    }

    /* ── OTP boxes ── */
    ['o0', 'o1', 'o2', 'o3', 'o4', 'o5'].forEach((id, i) => {
      const el = document.getElementById(id);
      el.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(-1);
        this.classList.toggle('filled', !!this.value);
        if (this.value && i < 5) document.getElementById('o' + (i + 1)).focus();
        if (getOtp().length === 6) setTimeout(verifyAndRegister, 200);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace') {
          if (!this.value && i > 0) {
            const prev = document.getElementById('o' + (i - 1));
            prev.value = ''; prev.classList.remove('filled'); prev.focus();
          }
          this.classList.remove('filled');
        }
      });
      el.addEventListener('paste', function (e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        text.split('').forEach((c, j) => {
          const box = document.getElementById('o' + j);
          if (box) { box.value = c; box.classList.add('filled'); }
        });
        if (text.length === 6) setTimeout(verifyAndRegister, 200);
      });
    });

    function getOtp() {
      return ['o0', 'o1', 'o2', 'o3', 'o4', 'o5'].map(id => document.getElementById(id).value).join('');
    }

    /* ── Timer ── */
    function startTimer(sec = 60) {
      clearInterval(resendTimer);
      let rem = sec;
      const valEl = document.getElementById('timerVal');
      const badge = document.getElementById('timerBadge');
      const btn = document.getElementById('resendBtn');
      btn.disabled = true;
      badge.style.display = 'inline-flex';
      valEl.textContent = rem;
      resendTimer = setInterval(() => {
        rem--;
        valEl.textContent = rem;
        if (rem <= 0) {
          clearInterval(resendTimer);
          btn.disabled = false;
          badge.style.display = 'none';
        }
      }, 1000);
    }

    /* ════════════════════════
       STEP 1 — Send OTP
    ════════════════════════ */
    async function sendOtp() {
      if (!validate()) return;
      const email = document.getElementById('fEmail').value.trim();
      const btn = document.getElementById('btnSendOtp');
      const inner = document.getElementById('btnSendOtpInner');
      btn.disabled = true;
      inner.innerHTML = '<div class="spinner"></div> Sending OTP…';

      try {
        await HeelsUpAuth.api('/api/auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({ email, purpose: 'register' })
        });
        const masked = email.replace(/^(.{2})(.+)(@.+)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c);
        document.getElementById('otpSubText').innerHTML =
          `Enter the 6-digit OTP sent to <strong style="color:var(--gold-dk)">${masked}</strong>`;
        toast('OTP sent! Check your inbox.');
        goStep(2);
        startTimer(60);
        setTimeout(() => document.getElementById('o0').focus(), 300);
      } catch (e) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('exist')) showErr('This email is already registered. Please sign in.');
        else showErr(msg || 'Could not send OTP. Please try again.');
      } finally {
        btn.disabled = false;
        inner.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Send OTP & Continue`;
      }
    }

    async function resendOtp() {
      const email = document.getElementById('fEmail').value.trim();
      try {
        await HeelsUpAuth.api('/api/auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({ email, purpose: 'register' })
        });
        ['o0', 'o1', 'o2', 'o3', 'o4', 'o5'].forEach(id => {
          const el = document.getElementById(id);
          el.value = ''; el.classList.remove('filled');
        });
        document.getElementById('o0').focus();
        startTimer(60);
        toast('New OTP sent!');
        clearErr();
      } catch (e) {
        toast(e?.message || 'Could not resend OTP.', 'e');
      }
    }

    /* ════════════════════════
       STEP 2 — Verify & Register
    ════════════════════════ */
    async function verifyAndRegister() {
      const otp = getOtp();
      clearErr();
      if (otp.length < 6) { showErr('Please enter the complete 6-digit OTP.'); return; }

      const btn = document.getElementById('btnVerify');
      const inner = document.getElementById('btnVerifyInner');
      btn.disabled = true;
      inner.innerHTML = '<div class="spinner"></div> Creating Account…';

      try {
        const rawRes = await HeelsUpAuth.api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            firstName: document.getElementById('fFname').value.trim(),
            lastName: document.getElementById('fLname').value.trim(),
            email: document.getElementById('fEmail').value.trim(),
            phone: document.getElementById('fPhone').value.trim(),
            password: document.getElementById('fPw').value,
            otp
          })
        });
        const res = rawRes?.data;
        if (res && res.token) {
          HeelsUpAuth.setSession(res.token, res.user);
          toast('🎉 Welcome to HeelsUp, ' + (res.user?.name?.split(' ')[0] || 'there') + '!');
          const redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
          setTimeout(() => window.location.href = redirect, 800);
        } else {
          throw new Error('Registration failed');
        }
      } catch (e) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('invalid')) {
          showErr('Invalid or expired OTP. Please request a new one.');
          document.getElementById('otpRow').style.animation = 'none';
          requestAnimationFrame(() => { document.getElementById('otpRow').style.animation = 'shake .4s ease'; });
        } else {
          showErr(msg || 'Registration failed. Please try again.');
        }
      } catch (err) {
        toast(err.message || 'Verification failed. Try again.', 'e');
      } finally {
        btn.disabled = false;
        inner.innerHTML = '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Verify & Create Account';
      }
    }

    async function handleGoogleCallback(response) {
      try {
        const rawRes = await HeelsUpAuth.api('/api/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential: response.credential })
        });
        const res = rawRes?.data;
        if (res && res.token) {
          HeelsUpAuth.setSession(res.token, res.user);
          toast('Account created successfully!');
          setTimeout(() => {
            const redirect = new URLSearchParams(window.location.search).get('redirect') || 'profile.html';
            window.location.href = redirect;
          }, 600);
        }
      } catch (e) {
        toast(e.message || 'Google authentication failed', 'e');
      }
    }

    async function initGoogle() {
      try {
        const config = await HeelsUpAuth.api('/api/config');
        if (config.googleClientId) {
          const tryRender = () => {
            if (window.google) {
              const refBtn = document.getElementById('btnSendOtp');
              const btnWidth = refBtn ? refBtn.offsetWidth : 300;
              
              google.accounts.id.initialize({
                client_id: config.googleClientId,
                callback: handleGoogleCallback
              });
              google.accounts.id.renderButton(
                document.getElementById("googleBtnWrapper"),
                { theme: "outline", size: "large", type: "standard", width: btnWidth }
              );
            } else {
              setTimeout(tryRender, 100);
            }
          };
          tryRender();
        }
      } catch (e) {
        console.error("Could not load Google Config", e);
      }
    }

    window.addEventListener('load', initGoogle);

    /* shake keyframe */
    const s = document.createElement('style');
    s.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}';
    document.head.appendChild(s);