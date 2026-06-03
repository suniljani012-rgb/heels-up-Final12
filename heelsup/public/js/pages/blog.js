// Blog articles data
        const BLOG_ARTICLES = [
            {
                id: 1, title: "Summer 2025 Mein Kaun Se Sandals Trend Ho Rahe Hain?",
                category: "Trends", date: "10 Jan 2025", readTime: "4 min",
                img: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=75&auto=format&fit=crop",
                excerpt: "Is summer ke top sandal trends jo har woman ko apni wardrobe mein add karne chahiye…",
                tag: "trends"
            },
            {
                id: 2, title: "Heels Mein Poora Din Comfortable Rehne Ke 7 Secret Tips",
                category: "Styling Tips", date: "8 Jan 2025", readTime: "6 min",
                img: "https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=600&q=75&auto=format&fit=crop",
                excerpt: "Office mein 9 ghante heels pehne ke baad bhi comfortable rehna chahti ho? Ye tips try karo…",
                tag: "styling"
            },
            {
                id: 3, title: "Leather Bags Ki Care Kaise Karein — Detailed Guide",
                category: "Bag Care", date: "5 Jan 2025", readTime: "5 min",
                img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=75&auto=format&fit=crop",
                excerpt: "Apni premium leather bag ki life badhaani hai? Ye simple care tips regularly follow karo…",
                tag: "bags"
            },
            {
                id: 4, title: "Dulhan Ke Liye Perfect Bridal Footwear — Wedding Guide",
                category: "Occasions", date: "2 Jan 2025", readTime: "7 min",
                img: "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600&q=75&auto=format&fit=crop",
                excerpt: "Shaadi ke sabse important din ke liye perfect heels choose karna ek art hai. Yeh guide help karegi…",
                tag: "occasions"
            },
            {
                id: 5, title: "Monsoon Mein Footwear Care — Baarish Se Kaise Bachayein?",
                category: "Shoe Care", date: "28 Dec 2024", readTime: "5 min",
                img: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=75&auto=format&fit=crop",
                excerpt: "Monsoon season mein apni favourite shoes protect karne ke best tips aur tricks…",
                tag: "care"
            },
            {
                id: 6, title: "Kolhapuri Chappals — Rajasthan Ki Heritage Footwear Ka Jadoo",
                category: "Styling Tips", date: "24 Dec 2024", readTime: "4 min",
                img: "https://images.unsplash.com/photo-1554141220-83411835a60b?w=600&q=75&auto=format&fit=crop",
                excerpt: "Kolhapuri chappals sirf footwear nahi, ek cultural heritage hai. In ko modern look ke saath kaise pair karein…",
                tag: "styling"
            },
        ];

        let page = 1;
        let currentFilter = 'all';
        const ARTICLES_PER_PAGE = 6;

        function makeArticleCard(article) {
            return `
            <a href="#" class="article-card" onclick="return false;">
                <div class="article-card-img">
                    <img src="${article.img}" alt="${article.title}" loading="lazy" />
                </div>
                <div class="article-card-body">
                    <div class="article-meta" style="margin-bottom:12px">
                        <span class="article-category">${article.category}</span>
                        <span class="article-read-time" style="font-size:11px;color:var(--text-3)"><i class="fa-regular fa-clock"></i> ${article.readTime}</span>
                    </div>
                    <h3 class="article-card-title">${article.title}</h3>
                    <p class="article-card-excerpt">${article.excerpt}</p>
                    <div class="article-card-footer">
                        <span style="font-size:11px;color:var(--text-3)">${article.date}</span>
                        <span class="article-read-link" style="font-size:11px">Read <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>
            </a>`;
        }

        function renderArticles(filter = 'all', reset = false) {
            const grid = document.getElementById('articles-grid');
            let filtered = filter === 'all' ? BLOG_ARTICLES : BLOG_ARTICLES.filter(a => a.tag === filter);
            if (reset) { grid.innerHTML = ''; page = 1; }
            const start = (page - 1) * ARTICLES_PER_PAGE;
            const slice = filtered.slice(0, Math.min(start + ARTICLES_PER_PAGE, filtered.length));
            grid.innerHTML = slice.map(makeArticleCard).join('');
            document.getElementById('load-more-btn').style.display = filtered.length > slice.length ? 'inline-flex' : 'none';
        }

        // Blog tabs
        document.querySelectorAll('.blog-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.blog-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.cat;
                renderArticles(currentFilter, true);
            });
        });

        document.getElementById('load-more-btn').addEventListener('click', () => {
            page++;
            renderArticles(currentFilter);
        });

        // Sidebar newsletter
        window.subscribeSidebar = function () {
            const email = document.getElementById('sidebar-email').value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast('error', 'Invalid Email', 'Valid email enter karo.');
                return;
            }
            document.getElementById('sidebar-email').value = '';
            showToast('success', '🎉 Subscribed!', 'Weekly style updates ab aayengi aapke inbox mein!');
        };

        // Navbar
        window.addEventListener('scroll', () => {
            document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
            document.getElementById('scroll-top').classList.toggle('visible', window.scrollY > 400);
        });
        document.getElementById('topbar-close')?.addEventListener('click', () => {
            const tb = document.getElementById('topbar'); tb.style.height = '0'; tb.style.overflow = 'hidden'; tb.style.padding = '0';
        });
        const hamburger = document.getElementById('hamburger-btn'), mobileMenu = document.getElementById('mobile-menu');
        hamburger?.addEventListener('click', () => { hamburger.classList.toggle('open'); mobileMenu.classList.toggle('open'); document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : ''; });
        document.getElementById('mobile-backdrop')?.addEventListener('click', () => { hamburger.classList.remove('open'); mobileMenu.classList.remove('open'); document.body.style.overflow = ''; });
        document.getElementById('mobile-menu-close')?.addEventListener('click', () => { hamburger.classList.remove('open'); mobileMenu.classList.remove('open'); document.body.style.overflow = ''; });

        // Search
        const searchOverlay = document.getElementById('search-overlay'), searchInput = document.getElementById('search-input');
        document.getElementById('search-toggle-btn')?.addEventListener('click', () => { searchOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(() => searchInput.focus(), 300); });
        document.getElementById('search-close-btn')?.addEventListener('click', () => { searchOverlay.classList.remove('open'); document.body.style.overflow = ''; searchInput.value = ''; });

        // Cart
        document.getElementById('cart-open-btn')?.addEventListener('click', () => { document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-backdrop').classList.add('open'); document.body.style.overflow = 'hidden'; });
        document.getElementById('cart-close-btn')?.addEventListener('click', () => { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-backdrop').classList.remove('open'); document.body.style.overflow = ''; });
        document.getElementById('cart-backdrop')?.addEventListener('click', () => { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-backdrop').classList.remove('open'); document.body.style.overflow = ''; });
        document.getElementById('scroll-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        // Scroll reveal
        const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } }), { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        // Toast
        function showToast(type, title, message) {
            const container = document.getElementById('toast-container');
            const id = 'toast-' + Date.now();
            const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
            container.insertAdjacentHTML('beforeend', `<div class="toast toast-${type}" id="${id}"><i class="fa-solid ${icons[type] || icons.info} toast-icon"></i><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="document.getElementById('${id}').remove()">✕</button></div>`);
            setTimeout(() => document.getElementById(id)?.remove(), 4000);
        }

        // Cart count
        const cart = JSON.parse(localStorage.getItem('heelsup_cart') || '[]');
        document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0);
        document.getElementById('cart-drawer-count').textContent = cart.reduce((s, i) => s + i.qty, 0) + ' items';

        // Init
        renderArticles();