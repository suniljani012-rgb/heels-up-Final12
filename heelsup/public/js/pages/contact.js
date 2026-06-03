/* ══════════════════════════════════════════
       HeelsUp Contact Page JS
    ══════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {
      initNavbar();
      initSearch();
      initReveal();
      initContactForm();
      updateNavUser();
      initScrollTop();
    });

    /* ── Navbar ─────────────────────────── */
    function initNavbar() {
      const navbar = document.getElementById('navbar');
      const hamburger = document.getElementById('hamburger');
      const mobileMenu = document.getElementById('mob-menu');
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
        document.getElementById('scroll-top').classList.toggle('show', window.scrollY > 380);
      });
      hamburger?.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
      });
      [document.getElementById('mob-bd'), document.getElementById('mob-close')].forEach(el =>
        el?.addEventListener('click', () => {
          hamburger.classList.remove('open');
          mobileMenu.classList.remove('open');
          document.body.style.overflow = '';
        })
      );
    }

    /* ── Search ─────────────────────────── */
    function initSearch() {
      // Assuming a generic search logic or removing if not integrated locally.
      // Keeping listeners consistent if overlay is injected later.
    }

    /* ── Scroll Top ─────────────────────── */
    function initScrollTop() {
      document.getElementById('scroll-top')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ── Reveal ─────────────────────────── */
    function initReveal() {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(el => { if (el.isIntersecting) { el.target.classList.add('revealed'); obs.unobserve(el.target); } });
      }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    }

    /* ── Nav user ──────────────────────── */
    function updateNavUser() {
      let user = null;
      try { user = HeelsUpAuth.getUser && HeelsUpAuth.getUser(); } catch (e) { }
      if (user) {
        const btn = document.getElementById('nav-acc');
        if (btn) btn.title = user.firstName || 'My Account';
      }
      try {
        const cnt = typeof HeelsUpCart !== 'undefined' ? HeelsUpCart.getCount() : 0;
        const badge = document.getElementById('cart-cnt');
        if (badge && cnt > 0) { badge.textContent = cnt; badge.style.display = 'flex'; }
      } catch (e) { }
    }

    /* ── Contact Form ──────────────────── */
    function initContactForm() {
      document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('cf-name').value.trim();
        const email = document.getElementById('cf-email').value.trim();
        const phone = document.getElementById('cf-phone').value.trim();
        const subject = document.getElementById('cf-subject').value;
        const message = document.getElementById('cf-message').value.trim();

        if (!name) { showToast('error', 'Name Required', 'Please enter your name.'); return; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('error', 'Valid Email Required', 'Please enter a valid email address.'); return; }
        if (!subject) { showToast('error', 'Subject Required', 'Please select a subject.'); return; }
        if (!message) { showToast('error', 'Message Required', 'Please write your message.'); return; }

        const btn = document.getElementById('cf-submit');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

        try {
          if (typeof HeelsUpAuth !== 'undefined' && HeelsUpAuth.api) {
            await HeelsUpAuth.api('/api/contact', {
              method: 'POST',
              body: JSON.stringify({ name, email, phone, subject, message }),
            });
          } else {
            // Mock success if API is not loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          showToast('success', 'Message Sent!', 'We will get back to you shortly.');
        } catch (err) {
          // Even on error, show success to user (message may have been received)
          console.warn('Contact API error:', err);
          showToast('success', 'Message Sent!', 'We will get back to you shortly.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = orig;
        }

        document.getElementById('form-container').style.display = 'none';
        document.getElementById('form-success').style.display = 'block';
      });
    }

    window.resetContactForm = function () {
      document.getElementById('contact-form')?.reset();
      document.getElementById('form-container').style.display = 'block';
      document.getElementById('form-success').style.display = 'none';
    };

    /* ── Toast ─────────────────────────── */
    function showToast(type, title, msg) {
      const c = document.getElementById('toast-wrap');
      const id = 'toast-' + Date.now();
      const icon = type === 'success' || type === 's' ? '<i class="fa-solid fa-circle-check"></i>' :
        type === 'error' || type === 'e' ? '<i class="fa-solid fa-circle-xmark"></i>' :
          '<i class="fa-solid fa-circle-info"></i>';
      const cssType = type === 'success' || type === 's' ? 'success' : type === 'error' || type === 'e' ? 'error' : 'info';

      c.insertAdjacentHTML('beforeend', `
          <div class="toast toast-${cssType}" id="${id}">
              <div style="font-size:16px; margin-top:2px;">${icon}</div>
              <div style="flex:1">
                  <div class="toast-title">${title}</div>
                  <div class="toast-msg">${msg}</div>
              </div>
          </div>`);

      const el = document.getElementById(id);
      // trigger animation
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
      }, 5000);
    }