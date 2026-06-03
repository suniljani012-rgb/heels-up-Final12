'use strict';

    /* ── Redirect if already logged in ── */
    (function () {
      try {
        const user = HeelsUpAuth.getUser();
        if (user) {
          const redirect = new URLSearchParams(location.search).get('redirect');
          if (redirect) { window.location.href = redirect; return; }
          const role = (user.role || '').toLowerCase();
          window.location.href = (role === 'admin' || role === 'staff' || role === 'manager')
            ? 'admin.html'
            : 'index.html';
        }
      } catch (e) { }
    })();

    /* ── State ── */
    let rememberMe = true;
    let pwVisible = false;

    /* ── Remember Me ── */
    function toggleRemember() {
      rememberMe = !rememberMe;
      const el = document.getElementById('rememberCheck');
      el.classList.toggle('checked', rememberMe);
    }

    /* ── Password Toggle ── */
    function togglePw() {
      const inp = document.getElementById('fPassword');
      pwVisible = !pwVisible;
      inp.type = pwVisible ? 'text' : 'password';
      document.getElementById('eyeIcon').innerHTML = pwVisible
        ? '<line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }

    /* ── Alert helpers ── */
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

    /* ── Main Login Logic ── */
    let currentSessionToken = '';
    let currentEmail = '';

    function showOtpUI(sessionToken, email) {
      currentSessionToken = sessionToken;
      currentEmail = email;
      document.getElementById('otpModalSub').innerHTML = `Enter the 6-digit verification code sent to <br><strong>${email}</strong>`;
      document.getElementById('otpErr').style.display = 'none';
      document.getElementById('fOtp').value = '';
      document.getElementById('otpModal').style.display = 'flex';
      setTimeout(() => document.getElementById('fOtp').focus(), 100);
    }

    function closeOtpModal() {
      document.getElementById('otpModal').style.display = 'none';
      currentSessionToken = '';
      currentEmail = '';
    }

    async function verifyAdminOtp() {
      const otp = document.getElementById('fOtp').value.trim();
      const errBox = document.getElementById('otpErr');
      errBox.style.display = 'none';
      
      if (otp.length !== 6) {
        errBox.textContent = 'Please enter a 6-digit code.';
        errBox.style.display = 'block';
        return;
      }
      
      const btn = document.getElementById('btnVerifyOtp');
      const btnText = document.getElementById('btnVerifyText');
      btn.disabled = true;
      btnText.innerHTML = '<div class="spinner"></div> Verifying…';
      
      try {
        const rawRes = await HeelsUpAuth.api('/api/auth/admin-verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            otp,
            session_token: currentSessionToken
          })
        });
        
        const res = rawRes?.data;
        if (res && res.token) {
          HeelsUpAuth.setSession(res.token, res.user);
          toast('🎉 Admin login successful! Welcome back.');
          closeOtpModal();
          
          setTimeout(() => {
            const redirectParam = new URLSearchParams(location.search).get('redirect') || 'admin.html';
            window.location.href = redirectParam;
          }, 700);
        } else {
          throw new Error('Verification failed. Invalid response.');
        }
      } catch (err) {
        errBox.textContent = err?.message || 'Verification failed. Please try again.';
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btnText.innerHTML = 'Verify &amp; Sign In';
      }
    }

    async function doLogin() {
      const email = document.getElementById('fEmail').value.trim();
      const password = document.getElementById('fPassword').value;
      clearErr();

      // Validation
      if (!email) { showErr('Please enter your email address.'); document.getElementById('fEmail').focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('Please enter a valid email address.'); return; }
      if (!password) { showErr('Please enter your password.'); document.getElementById('fPassword').focus(); return; }
      if (password.length < 6) { showErr('Password must be at least 6 characters.'); return; }

      // Loading state
      const btn = document.getElementById('btnLogin');
      const btnText = document.getElementById('btnText');
      btn.disabled = true;
      btnText.innerHTML = '<div class="spinner"></div> Signing In…';

      try {
        const payload = { email, password, remember: rememberMe };

        const rawRes = await HeelsUpAuth.api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (rawRes?.step === 'otp_required' || rawRes?.data?.step === 'otp_required') {
          const stepData = rawRes.data || rawRes;
          showOtpUI(stepData.session_token, stepData.email);
          return;
        }

        const res = rawRes?.data;
        if (!res || !res.token) {
          throw new Error(rawRes?.error || 'Invalid credentials or login failed.');
        }

        HeelsUpAuth.setSession(res.token, res.user);

        toast('🎉 Welcome back, ' + (res.user?.name?.split(' ')[0] || 'User') + '!');

        // Role-based redirect
        const redirectParam = new URLSearchParams(location.search).get('redirect');
        if (redirectParam) { setTimeout(() => window.location.href = redirectParam, 600); return; }

        const role = (res.user?.role || '').toLowerCase();
        let target = 'index.html';
        if (role === 'admin' || role === 'staff' || role === 'manager') target = 'admin.html';

        setTimeout(() => window.location.href = target, 700);

      } catch (err) {
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('password')) showErr('Incorrect password. Please try again.');
        else if (msg.toLowerCase().includes('not found')) showErr('No account found with this email.');
        else if (msg.toLowerCase().includes('locked')) showErr('Account locked. Please contact support.');
        else if (msg.toLowerCase().includes('access')) showErr('Invalid staff access code.');
        else showErr(msg || 'Sign in failed. Please try again.');
      } finally {
        btn.disabled = false;
        btnText.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Sign In to HeelsUp`;
      }
    }

    /* ── Google OAuth (stub — wire to app-auth.js) ── */
    function doGoogleLogin() {
      toast('Google Login is not configured. Please contact the administrator.', 'e');
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
          toast('Logged in successfully!');
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
              const customBtn = document.getElementById('customGoogleBtn');
              if(customBtn) customBtn.style.display = 'none';
              
              const refBtn = document.getElementById('btnLogin');
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

    /* ── Fade-in animation ── */
    const style = document.createElement('style');
    style.textContent = '@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);