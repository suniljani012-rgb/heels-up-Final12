'use strict';

    /* ── State ── */
    let currentStep = 1;
    let savedOtp = '';
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

    /* ── Step navigation ── */
    function goStep(n) {
      clearErr();
      // hide all
      for (let i = 1; i <= 4; i++) {
        document.getElementById('step' + i)?.classList.remove('active');
      }
      document.getElementById('step' + n)?.classList.add('active');
      currentStep = n;

      // progress bar
      const pct = { 1: 33, 2: 66, 3: 90, 4: 100 };
      document.getElementById('progressFill').style.width = pct[n] + '%';

      // left panel step indicators
      for (let i = 1; i <= 3; i++) {
        const el = document.getElementById('lstep-' + i);
        if (!el) continue;
        el.classList.remove('current', 'done');
        if (i < n) el.classList.add('done');
        else if (i === n) el.classList.add('current');
        // show checkmark in done steps
        const num = el.querySelector('.l-step-num');
        if (i < n) {
          num.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else {
          num.textContent = i;
        }
      }
    }

    /* ── OTP box wiring ── */
    ['o0', 'o1', 'o2', 'o3', 'o4', 'o5'].forEach((id, i) => {
      const el = document.getElementById(id);
      el.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(-1);
        this.classList.toggle('filled', !!this.value);
        if (this.value && i < 5) document.getElementById('o' + (i + 1)).focus();
        // auto verify when all 6 filled
        const otp = getOtp();
        if (otp.length === 6) setTimeout(verifyOtp, 200);
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
        if (text.length === 6) setTimeout(verifyOtp, 200);
      });
    });

    function getOtp() {
      return ['o0', 'o1', 'o2', 'o3', 'o4', 'o5'].map(id => document.getElementById(id).value).join('');
    }

    /* ── Countdown timer ── */
    function startTimer(seconds = 60) {
      clearInterval(resendTimer);
      let rem = seconds;
      const timerEl = document.getElementById('timerVal');
      const badge = document.getElementById('timerBadge');
      const btn = document.getElementById('resendBtn');
      btn.disabled = true;
      badge.style.display = 'inline-flex';
      timerEl.textContent = rem;

      resendTimer = setInterval(() => {
        rem--;
        timerEl.textContent = rem;
        if (rem <= 0) {
          clearInterval(resendTimer);
          btn.disabled = false;
          badge.style.display = 'none';
        }
      }, 1000);
    }

    /* ── Password toggle ── */
    function togglePw(id, btn) {
      const inp = document.getElementById(id);
      const isText = inp.type === 'text';
      inp.type = isText ? 'password' : 'text';
      const iconId = id === 'fNewPw' ? 'eyeNew' : 'eyeConfirm';
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

      const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
      const cls = ['', 'w', 'w', 'm', 's'];

      ['seg0', 'seg1', 'seg2', 'seg3'].forEach((id, i) => {
        const seg = document.getElementById(id);
        seg.className = 'pw-seg';
        if (i < score) seg.classList.add(cls[score]);
      });
      const lbl = document.getElementById('strengthLbl');
      lbl.textContent = pw ? labels[score] : 'Enter a password';
      const colors = ['var(--text-4)', 'var(--rose)', 'var(--rose)', 'var(--gold)', 'var(--teal)'];
      lbl.style.color = pw ? colors[score] : 'var(--text-4)';
    }

    /* ════════════════════════════════
       STEP 1 — Send OTP
    ════════════════════════════════ */
    async function sendOtp() {
      const email = document.getElementById('fEmail').value.trim();
      clearErr();
      if (!email) { showErr('Please enter your email address.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('Please enter a valid email address.'); return; }

      const btn = document.getElementById('btnSend');
      const inner = document.getElementById('btnSendInner');
      btn.disabled = true;
      inner.innerHTML = '<div class="spinner"></div> Sending OTP…';

      try {
        await HeelsUpAuth.api('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        // update sub text with masked email
        const masked = email.replace(/^(.{2})(.+)(@.+)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c);
        document.getElementById('otpSubText').innerHTML =
          `We sent a 6-digit code to <strong>${masked}</strong>`;
        toast('OTP sent! Check your inbox.');
        goStep(2);
        setTimeout(() => document.getElementById('o0').focus(), 300);
        startTimer(60);
      } catch (e) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('not found')) showErr('No account found with this email address.');
        else showErr(msg || 'Could not send OTP. Please try again.');
      } finally {
        btn.disabled = false;
        inner.innerHTML = `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send Reset OTP`;
      }
    }

    /* ════════════════════════════════
       STEP 2 — Verify OTP
    ════════════════════════════════ */
    async function verifyOtp() {
      const otp = getOtp();
      clearErr();
      if (otp.length < 6) { showErr('Please enter the complete 6-digit OTP.'); return; }

      const btn = document.getElementById('btnVerify');
      const inner = document.getElementById('btnVerifyInner');
      btn.disabled = true;
      inner.innerHTML = '<div class="spinner"></div> Verifying…';

      try {
        const email = document.getElementById('fEmail').value.trim();
        // Some APIs verify OTP here; others just validate on reset
        // Try both patterns
        try {
          await HeelsUpAuth.api('/api/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp, purpose: 'forgot' })
          });
        } catch (verifyErr) {
          // If no separate verify endpoint, proceed (validated during reset)
          if (!verifyErr?.message?.toLowerCase().includes('invalid') &&
            !verifyErr?.message?.toLowerCase().includes('expired')) {
            savedOtp = otp;
            goStep(3);
            setTimeout(() => document.getElementById('fNewPw').focus(), 300);
            return;
          }
          throw verifyErr;
        }
        savedOtp = otp;
        toast('OTP verified! Set your new password.');
        goStep(3);
        setTimeout(() => document.getElementById('fNewPw').focus(), 300);
      } catch (e) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('expired')) showErr('OTP has expired. Please request a new one.');
        else if (msg.toLowerCase().includes('invalid')) showErr('Invalid OTP. Please check and try again.');
        else showErr(msg || 'Verification failed. Please try again.');
        // shake OTP boxes
        document.getElementById('otpRow').style.animation = 'none';
        requestAnimationFrame(() => {
          document.getElementById('otpRow').style.animation = 'shake .4s ease';
        });
      } finally {
        btn.disabled = false;
        inner.innerHTML = `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Verify OTP`;
      }
    }

    async function resendOtp() {
      const email = document.getElementById('fEmail').value.trim();
      try {
        await HeelsUpAuth.api('/api/auth/forgot-password', {
          method: 'POST', body: JSON.stringify({ email })
        });
        // clear boxes
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

    /* ════════════════════════════════
       STEP 3 — Reset Password
    ════════════════════════════════ */
    async function resetPassword() {
      const email = document.getElementById('fEmail').value.trim();
      const password = document.getElementById('fNewPw').value;
      const confirm = document.getElementById('fConfirmPw').value;
      clearErr();

      if (password.length < 8) { showErr('Password must be at least 8 characters.'); return; }
      if (password !== confirm) { showErr('Passwords do not match. Please re-enter.'); document.getElementById('fConfirmPw').classList.add('err'); return; }

      const btn = document.getElementById('btnReset');
      const inner = document.getElementById('btnResetInner');
      btn.disabled = true;
      inner.innerHTML = '<div class="spinner"></div> Resetting Password…';

      try {
        await HeelsUpAuth.api('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, otp: savedOtp, password })
        });
        goStep(4);
        // animate redirect bar then redirect
        setTimeout(() => {
          document.getElementById('redirectFill').style.width = '100%';
        }, 100);
        setTimeout(() => window.location.href = 'login.html', 3200);
      } catch (e) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('expired')) {
          showErr('OTP expired or invalid. Please start over.');
          setTimeout(() => goStep(1), 1500);
        } else {
          showErr(msg || 'Reset failed. Please try again.');
        }
      } finally {
        btn.disabled = false;
        inner.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Reset Password`;
      }
    }

    /* shake animation + otp fill style */
    const styleTag = document.createElement('style');
    styleTag.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
`;
    document.head.appendChild(styleTag);