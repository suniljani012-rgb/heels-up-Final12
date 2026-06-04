(function () {
    "use strict";

    let page = 1;
    let currentFilter = 'all';
    let allArticles = [];
    const catMap = {
        styling: 'Styling Tips',
        trends: 'Trends',
        care: 'Shoe Care',
        occasions: 'Occasions',
        bags: 'Bags',
        festive: 'Festive'
    };

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fmtDate(d) {
        return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    }

    function calculateReadTime(content) {
        const words = (content || '').split(/\s+/).length;
        return Math.max(1, Math.ceil(words / 200)) + ' min read';
    }

    function makeArticleCard(article) {
        const img = article.image_url || 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=75&auto=format&fit=crop';
        const readTime = calculateReadTime(article.content);
        const dateStr = fmtDate(article.published_at || article.created_at);
        const category = article.category || 'General';
        const excerpt = article.excerpt || (article.content ? article.content.substring(0, 100) + '...' : '');

        return `
        <div class="article-card">
            <div class="article-card-img">
                <img src="${esc(img)}" alt="${esc(article.title)}" loading="lazy" />
            </div>
            <div class="article-card-body">
                <div class="article-meta" style="margin-bottom:12px">
                    <span class="article-category">${esc(category)}</span>
                    <span class="article-read-time" style="font-size:11px;color:var(--text-3)"><i class="fa-regular fa-clock"></i> ${readTime}</span>
                </div>
                <h3 class="article-card-title">${esc(article.title)}</h3>
                <p class="article-card-excerpt">${esc(excerpt)}</p>
                <div class="article-card-footer">
                    <span style="font-size:11px;color:var(--text-3)">${dateStr}</span>
                    <a href="/blog.html?slug=${esc(article.slug)}" class="article-read-link" style="font-size:11px;text-decoration:none">Read <i class="fa-solid fa-arrow-right"></i></a>
                </div>
            </div>
        </div>`;
    }

    function renderFeaturedArticle(article) {
        const featuredSection = document.querySelector('.featured-article');
        if (!featuredSection) return;

        if (!article) {
            featuredSection.style.display = 'none';
            return;
        }

        featuredSection.style.display = 'flex';
        const img = article.image_url || 'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=900&q=80&auto=format&fit=crop';
        const readTime = calculateReadTime(article.content);
        const dateStr = fmtDate(article.published_at || article.created_at);
        const category = article.category || 'General';
        const excerpt = article.excerpt || (article.content ? article.content.substring(0, 200) + '...' : '');

        featuredSection.innerHTML = `
            <div class="featured-article-img">
                <img src="${esc(img)}" alt="${esc(article.title)}" loading="lazy">
                <span class="featured-badge">⭐ Featured</span>
            </div>
            <div class="featured-article-body">
                <div class="article-meta">
                    <span class="article-category">${esc(category)}</span>
                    <span class="article-date">${dateStr}</span>
                    <span class="article-read-time"><i class="fa-regular fa-clock"></i> ${readTime}</span>
                </div>
                <h2 class="featured-article-title">${esc(article.title)}</h2>
                <p class="featured-article-excerpt">${esc(excerpt)}</p>
                <div class="article-author" style="justify-content:space-between">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div class="author-avatar">${esc(category.charAt(0))}</div>
                        <div>
                            <div class="author-name">HeelsUp Editor</div>
                            <div class="author-title">Fashion Team</div>
                        </div>
                    </div>
                    <a href="/blog.html?slug=${esc(article.slug)}" class="article-read-link" style="text-decoration:none">Read Article <i class="fa-solid fa-arrow-right"></i></a>
                </div>
            </div>
        `;
        // Make the container clickable as well
        featuredSection.setAttribute('onclick', `window.location.href='/blog.html?slug=${article.slug}'`);
        featuredSection.style.cursor = 'pointer';
    }

    async function loadArticles(reset = false) {
        const grid = document.getElementById('articles-grid');
        const loadMoreBtn = document.getElementById('load-more-btn');
        
        if (reset) {
            page = 1;
            grid.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1;text-align:center;padding:40px"><i class="fa-solid fa-spinner fa-spin"></i> Loading articles...</div>';
            renderFeaturedArticle(null);
        }

        try {
            let url = `/api/blogs?page=${page}&limit=7`;
            if (currentFilter !== 'all') {
                const categoryName = catMap[currentFilter] || currentFilter;
                url += `&category=${encodeURIComponent(categoryName)}`;
            }

            const res = await HeelsUpAuth.api(url);
            const posts = res.data || res.blogs || res.results || [];
            
            if (reset) {
                grid.innerHTML = '';
            } else {
                const spinner = grid.querySelector('.loading-spinner');
                if (spinner) spinner.remove();
            }

            if (page === 1 && currentFilter === 'all' && posts.length > 0) {
                // First post is featured
                const featured = posts[0];
                renderFeaturedArticle(featured);
                
                // Rest are in grid
                const rest = posts.slice(1);
                if (rest.length > 0) {
                    grid.innerHTML += rest.map(makeArticleCard).join('');
                } else if (posts.length === 1) {
                    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-3)">Check out our featured post above!</div>';
                }
            } else {
                if (posts.length > 0) {
                    grid.innerHTML += posts.map(makeArticleCard).join('');
                } else if (page === 1) {
                    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-3)">No articles found in this category.</div>';
                }
            }

            const total = res.pagination?.total || posts.length;
            const loadedCount = grid.querySelectorAll('.article-card').length + (page === 1 && currentFilter === 'all' && posts.length > 0 ? 1 : 0);
            
            if (loadedCount < total && posts.length > 0) {
                loadMoreBtn.style.display = 'inline-flex';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } catch (e) {
            console.error('Error fetching blogs:', e);
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger)">Failed to load blogs from the database.</div>';
            loadMoreBtn.style.display = 'none';
        }
    }

    // Toggle categories
    document.querySelectorAll('.blog-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.blog-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.cat;
            loadArticles(true);
        });
    });

    document.getElementById('load-more-btn').addEventListener('click', () => {
        page++;
        loadArticles(false);
    });

    // Sidebar newsletter
    window.subscribeSidebar = function () {
        const email = document.getElementById('sidebar-email').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('error', 'Invalid Email', 'Please enter a valid email address.');
            return;
        }
        document.getElementById('sidebar-email').value = '';
        showToast('success', '🎉 Subscribed!', 'Weekly style updates will be sent to your inbox!');
    };

    // Navbar
    window.addEventListener('scroll', () => {
        document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 60);
        document.getElementById('scroll-top')?.classList.toggle('visible', window.scrollY > 400);
    });

    const hamburger = document.getElementById('hamburger'), mobileMenu = document.getElementById('mob-menu');
    hamburger?.addEventListener('click', () => { 
        hamburger.classList.toggle('open'); 
        mobileMenu.classList.toggle('open'); 
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : ''; 
    });
    document.getElementById('mob-close')?.addEventListener('click', () => { 
        hamburger?.classList.remove('open'); 
        mobileMenu?.classList.remove('open'); 
        document.body.style.overflow = ''; 
    });

    // Search overlay triggers (if any in HTML)
    document.getElementById('search-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/search.html';
    });

    // Cart counts
    function updateCartCount() {
        try {
            const cart = JSON.parse(localStorage.getItem('heelsup_cart') || '[]');
            const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
            const badge = document.getElementById('cart-cnt');
            if (badge) badge.textContent = count;
            const drawerBadge = document.getElementById('cart-drawer-count');
            if (drawerBadge) drawerBadge.textContent = count + ' items';
        } catch (e) {
            console.error('Cart parse error:', e);
        }
    }

    // Toast
    function showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const id = 'toast-' + Date.now();
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
        container.insertAdjacentHTML('beforeend', `<div class="toast toast-${type}" id="${id}"><i class="fa-solid ${icons[type] || icons.info} toast-icon"></i><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="document.getElementById('${id}').remove()">✕</button></div>`);
        setTimeout(() => document.getElementById(id)?.remove(), 4000);
    }

    // Single post detail overlay (or rendering) if slug parameter is present
    async function checkSinglePostView() {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');
        if (!slug) return false;

        // Hide main list layout and show single article view instead!
        const heroSection = document.querySelector('.blog-hero');
        const tabsSection = document.querySelector('.blog-tabs-section');
        const mainSection = document.querySelector('.blog-main');
        const catSection = document.querySelector('.blog-categories-section');

        if (heroSection) heroSection.style.display = 'none';
        if (tabsSection) tabsSection.style.display = 'none';
        if (catSection) catSection.style.display = 'none';

        if (mainSection) {
            mainSection.innerHTML = `
                <div class="ctn" style="max-width:800px;padding:40px 20px">
                    <a href="/blog.html" class="btn btn-outline" style="margin-bottom:30px"><i class="fa-solid fa-arrow-left"></i> Back to Blog</a>
                    <div id="single-post-content">
                        <div class="loading-spinner" style="text-align:center;padding:40px"><i class="fa-solid fa-spinner fa-spin"></i> Loading article...</div>
                    </div>
                </div>
            `;
        }

        try {
            const res = await HeelsUpAuth.api(`/api/blogs/${slug}`);
            const post = res.data || res;
            if (!post || !post.title) {
                throw new Error("Post not found");
            }

            const img = post.image_url || 'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=900&q=80&auto=format&fit=crop';
            const dateStr = fmtDate(post.published_at || post.created_at);
            const category = post.category || 'General';
            
            document.title = `${post.title} | HeelsUp Blog`;

            const contentHtml = post.content || '';

            const singlePostEl = document.getElementById('single-post-content');
            if (singlePostEl) {
                singlePostEl.innerHTML = `
                    <div class="article-meta" style="margin-bottom:15px">
                        <span class="article-category" style="background:var(--gold-light);color:var(--gold-dark);padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600">${esc(category)}</span>
                        <span class="article-date" style="margin-left:15px;color:var(--text-3);font-size:13px">${dateStr}</span>
                    </div>
                    <h1 style="font-family:var(--fh);font-size:2.5rem;line-height:1.2;margin-bottom:20px;color:var(--text-1)">${esc(post.title)}</h1>
                    <div style="width:100%;max-height:450px;overflow:hidden;border-radius:12px;margin-bottom:30px">
                        <img src="${esc(img)}" alt="${esc(post.title)}" style="width:100%;height:auto;object-fit:cover">
                    </div>
                    <div class="post-rich-content" style="font-size:1.1rem;line-height:1.8;color:var(--text-2)">
                        ${contentHtml}
                    </div>
                `;
            }
        } catch (e) {
            console.error('Error loading article:', e);
            const singlePostEl = document.getElementById('single-post-content');
            if (singlePostEl) {
                singlePostEl.innerHTML = `
                    <div style="text-align:center;padding:40px">
                        <h3>Article Not Found</h3>
                        <p style="color:var(--text-3)">Sorry, the blog article you are looking for does not exist or has been removed.</p>
                        <a href="/blog.html" class="btn btn-primary" style="margin-top:15px">Back to Blog</a>
                    </div>
                `;
            }
        }
        return true;
    }

    // Init
    document.addEventListener('DOMContentLoaded', async () => {
        updateCartCount();
        const isSingle = await checkSinglePostView();
        if (!isSingle) {
            loadArticles(true);
        }
    });

})();