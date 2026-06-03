document.addEventListener('DOMContentLoaded', () => {
            // 1. Navbar Scroll
            const navbar = document.getElementById('navbar');
            window.addEventListener('scroll', () => {
                navbar.classList.toggle('scrolled', window.scrollY > 50);
            });

            // 2. Mobile Menu Logic
            const mobMenu = document.getElementById('mob-menu');
            const hamburger = document.getElementById('nav-hamburger');
            const mobCloseBtn = document.getElementById('mob-close');
            const mobBackdrop = document.getElementById('mob-backdrop');

            function openMob() {
                mobMenu.classList.add('open');
                hamburger.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
            function closeMob() {
                mobMenu.classList.remove('open');
                hamburger.classList.remove('open');
                document.body.style.overflow = '';
            }

            hamburger?.addEventListener('click', openMob);
            mobCloseBtn?.addEventListener('click', closeMob);
            mobBackdrop?.addEventListener('click', closeMob);

            // 3. Search & Cart Overlay Triggers (UI Only)
            const srchOverlay = document.getElementById('search-overlay');
            const srchInp = document.getElementById('search-inp');
            document.getElementById('search-btn')?.addEventListener('click', () => {
                srchOverlay.classList.add('open');
                setTimeout(() => srchInp?.focus(), 60);
            });
            document.getElementById('search-close-btn')?.addEventListener('click', () => {
                srchOverlay.classList.remove('open');
            });

            const cartDrawer = document.getElementById('cart-drawer');
            const cartBd = document.getElementById('cart-bd');
            document.getElementById('cart-open-btn')?.addEventListener('click', () => {
                cartDrawer.classList.add('open');
                cartBd.classList.add('open');
                document.body.style.overflow = 'hidden';
            });
            function closeCart() {
                cartDrawer.classList.remove('open');
                cartBd.classList.remove('open');
                document.body.style.overflow = '';
            }
            document.getElementById('cart-cls-btn')?.addEventListener('click', closeCart);
            cartBd?.addEventListener('click', closeCart);

            // 4. Announcement Bar
            document.getElementById('ann-close')?.addEventListener('click', function () {
                const bar = document.getElementById('ann-bar');
                if (bar) {
                    bar.style.transition = 'height 0.3s ease, padding 0.3s ease';
                    bar.style.height = '0px';
                    bar.style.padding = '0px';
                    setTimeout(() => bar.remove(), 300);
                }
            });

            // 5. FAQ Accordion Logic
            const faqQuestions = document.querySelectorAll('.faq-question');
            faqQuestions.forEach(question => {
                question.addEventListener('click', () => {
                    const item = question.parentElement;
                    const isActive = item.classList.contains('active');

                    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

                    if (!isActive) item.classList.add('active');
                });
            });

            // 6. FAQ Category Filtering
            const catLinks = document.querySelectorAll('.faq-cat-link');
            const faqGroups = document.querySelectorAll('.faq-group');

            catLinks.forEach(link => {
                link.addEventListener('click', () => {
                    catLinks.forEach(btn => btn.classList.remove('active'));
                    link.classList.add('active');

                    const target = link.getAttribute('data-target');

                    faqGroups.forEach(group => {
                        if (target === 'all' || group.id === target) {
                            group.style.display = 'block';
                            if (window.innerWidth > 900 && target !== 'all') {
                                const yOffset = -120;
                                const y = group.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                        } else {
                            group.style.display = 'none';
                        }
                    });

                    // Reset search
                    document.getElementById('faq-search-input').value = '';
                    filterFAQs('');
                });
            });

            // 7. FAQ Search Logic
            const searchInput = document.getElementById('faq-search-input');
            const noResultsState = document.getElementById('faq-no-results');

            function filterFAQs(query) {
                const lowerQuery = query.toLowerCase().trim();
                let anyVisible = false;

                if (lowerQuery.length > 0) {
                    faqGroups.forEach(g => g.style.display = 'block');
                } else {
                    const activeCat = document.querySelector('.faq-cat-link.active');
                    if (activeCat) activeCat.click();
                    return;
                }

                faqGroups.forEach(group => {
                    let groupHasVisibleItems = false;
                    const items = group.querySelectorAll('.faq-item');

                    items.forEach(item => {
                        const qText = item.querySelector('.faq-question span').textContent.toLowerCase();
                        const aText = item.querySelector('.faq-answer').textContent.toLowerCase();

                        if (qText.includes(lowerQuery) || aText.includes(lowerQuery)) {
                            item.style.display = 'block';
                            groupHasVisibleItems = true;
                            anyVisible = true;

                            if (lowerQuery.length > 2 && qText.includes(lowerQuery)) {
                                item.classList.add('active');
                            }
                        } else {
                            item.style.display = 'none';
                            item.classList.remove('active');
                        }
                    });

                    if (groupHasVisibleItems) {
                        group.style.display = 'block';
                    } else {
                        group.style.display = 'none';
                    }
                });

                if (!anyVisible && lowerQuery.length > 0) {
                    noResultsState.style.display = 'block';
                } else {
                    noResultsState.style.display = 'none';
                }
            }

            searchInput.addEventListener('input', (e) => filterFAQs(e.target.value));
            document.getElementById('faq-search-btn')?.addEventListener('click', () => filterFAQs(searchInput.value));
        });