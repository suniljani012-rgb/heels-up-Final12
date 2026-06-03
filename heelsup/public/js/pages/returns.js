// Navbar scroll
        window.addEventListener('scroll', () => {
            document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
        });
        document.getElementById('topbar-close')?.addEventListener('click', () => {
            const tb = document.getElementById('topbar');
            tb.style.height = '0'; tb.style.overflow = 'hidden'; tb.style.padding = '0';
        });
        const hamburger = document.getElementById('hamburger-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        hamburger?.addEventListener('click', () => { hamburger.classList.toggle('open'); mobileMenu.classList.toggle('open'); });
        document.getElementById('mobile-backdrop')?.addEventListener('click', () => { hamburger.classList.remove('open'); mobileMenu.classList.remove('open'); });
        document.getElementById('mobile-menu-close')?.addEventListener('click', () => { hamburger.classList.remove('open'); mobileMenu.classList.remove('open'); });

        // Active TOC
        const sections = document.querySelectorAll('[id]');
        const tocLinks = document.querySelectorAll('.policy-toc-list a');
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
            tocLinks.forEach(a => { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
        });

        // Cart count from localStorage
        const cart = JSON.parse(localStorage.getItem('heelsup_cart') || '[]');
        document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0);