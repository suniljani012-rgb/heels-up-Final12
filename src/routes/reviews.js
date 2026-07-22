// worker/src/routes/reviews.js
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function reviewsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/reviews', '') || '/';
    const method = request.method;

    // GET /api/reviews/latest — latest approved reviews (publicly accessible)
    if (path === '/latest' && method === 'GET') {
        try {
            const reviews = await env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply,
                        (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name,
                        p.name as product_name, p.id as product_id
                 FROM product_reviews r 
                 LEFT JOIN users u ON r.user_id = u.id
                 LEFT JOIN products p ON r.product_id = p.id
                 WHERE r.status = 'approved' 
                 ORDER BY r.created_at DESC 
                 LIMIT 20`
            ).all();
            return list(reviews.results || []);
        } catch (e) {
            console.error('Fetch latest reviews error:', e);
            return serverError('Failed to fetch latest reviews');
        }
    }

    // GET /api/reviews?product_id=X
    if (path === '/' && method === 'GET') {
        const productId = url.searchParams.get('product_id');
        if (!productId) return list([]);
        try {
            const reviews = await env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name
           FROM product_reviews r LEFT JOIN users u ON r.user_id = u.id
           WHERE r.product_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC`
            ).bind(productId).all();
            return list(reviews.results || []);
        } catch (e) {
            console.error('Fetch reviews error:', e);
            return serverError('Failed to fetch reviews');
        }
    }

    // POST /api/reviews
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAuth(request, env);
        if (authError) return authError;
        try {
            const { product_id, rating, title, body, order_id } = await request.json();
            if (!product_id || !rating) return error('Product ID and rating required');
            if (rating < 1 || rating > 5) return error('Rating must be 1-5');

            await env.DB.prepare(
                "INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))"
            ).bind(product_id, user.id, order_id || null, rating, title || null, body || null).run();

            return created(null, 'Review submitted — pending approval');
        } catch (e) {
            console.error('Submit review error:', e);
            return serverError('Failed to submit review');
        }
    }

    // GET /api/reviews/admin/all
    if (path === '/admin/all' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const reviews = await env.DB.prepare(
                `SELECT r.*, p.name as product_name, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name
           FROM product_reviews r JOIN products p ON r.product_id = p.id LEFT JOIN users u ON r.user_id = u.id
           ORDER BY r.created_at DESC`
            ).all();
            const formatted = (reviews.results || []).map(r => ({
                ...r,
                approved: r.status === 'approved'
            }));
            return list(formatted);
        } catch (e) {
            console.error('Admin fetch reviews error:', e);
            return serverError('Failed to fetch reviews');
        }
    }

    // PATCH /api/reviews/:id/approve
    if (path.match(/^\/\d+\/approve$/) && method === 'PATCH') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.match(/(\d+)/)[1];
        try {
            let status = 'approved';
            try {
                const body = await request.json();
                if (body.status) status = body.status;
            } catch {}
            
            const review = await env.DB.prepare("SELECT product_id FROM product_reviews WHERE id = ?").bind(id).first();
            await env.DB.prepare("UPDATE product_reviews SET status = ? WHERE id = ?").bind(status, id).run();
            
            if (review && review.product_id) {
                const prodId = review.product_id;
                await env.DB.prepare(`
                    UPDATE products SET 
                        rating = (SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM product_reviews WHERE product_id = ? AND status = 'approved'),
                        review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = ? AND status = 'approved')
                    WHERE id = ?
                `).bind(prodId, prodId, prodId).run();
            }
            
            return ok(null, `Review status updated to ${status}`);
        } catch (e) {
            console.error('Approve review error:', e);
            return serverError('Failed to approve review');
        }
    }

    // PATCH /api/reviews/:id/reply
    if (path.match(/^\/\d+\/reply$/) && method === 'PATCH') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.match(/(\d+)/)[1];
        try {
            const { reply } = await request.json();
            await env.DB.prepare("UPDATE product_reviews SET merchant_reply = ? WHERE id = ?").bind(reply, id).run();
            return ok(null, 'Merchant reply submitted');
        } catch (e) {
            console.error('Reply review error:', e);
            return serverError('Failed to save reply');
        }
    }

    // DELETE /api/reviews/:id
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const review = await env.DB.prepare("SELECT product_id FROM product_reviews WHERE id = ?").bind(id).first();
            await env.DB.prepare('DELETE FROM product_reviews WHERE id = ?').bind(id).run();
            
            if (review && review.product_id) {
                const prodId = review.product_id;
                await env.DB.prepare(`
                    UPDATE products SET 
                        rating = (SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM product_reviews WHERE product_id = ? AND status = 'approved'),
                        review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = ? AND status = 'approved')
                    WHERE id = ?
                `).bind(prodId, prodId, prodId).run();
            }
            
            return ok(null, 'Review deleted');
        } catch (e) {
            console.error('Delete review error:', e);
            return serverError('Failed to delete review');
        }
    }

    return error('Route not found', 404);
}