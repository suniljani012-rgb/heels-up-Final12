// worker/src/middleware/auth.js
import { verifyJWT } from '../utils/jwt.js';
import { unauthorized, forbidden } from '../utils/response.js';

export async function authenticate(request, env) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return { user: null, error: unauthorized('No token provided') };

    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) return { user: null, error: unauthorized('Invalid or expired token') };

    // Reject pending-OTP tokens from all normal routes
    // These tokens can ONLY be used at POST /api/auth/admin-verify-otp
    if (payload.otp_pending) {
        return { user: null, error: unauthorized('OTP verification required to complete login') };
    }

    // Check blacklist in KV (handles forced logout / password changes)
    try {
        const blacklisted = await env.KV.get(`blacklist:${token}`);
        if (blacklisted) return { user: null, error: unauthorized('Session has been revoked. Please login again.') };
    } catch (_) { /* KV unavailable — allow */ }

    return { user: payload, error: null };
}

export async function requireAuth(request, env) {
    const { user, error } = await authenticate(request, env);
    if (error) return { user: null, error };
    return { user, error: null };
}

export async function requireAdmin(request, env) {
    const { user, error } = await authenticate(request, env);
    if (error) return { user: null, error };
    if (!['admin', 'staff', 'manager'].includes(user.role)) {
        return { user: null, error: forbidden('Admin access required') };
    }
    return { user, error: null };
}

export async function optionalAuth(request, env) {
    const { user } = await authenticate(request, env);
    return user;
}