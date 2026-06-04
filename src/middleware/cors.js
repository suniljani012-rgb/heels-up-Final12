// worker/src/middleware/cors.js

const ALLOWED_ORIGINS = [
    'https://heelsup.in',
    'https://www.heelsup.in',
    'https://heelsupnew.heelsup.workers.dev',
    'http://localhost:3000',
    'http://localhost:8787',
];

export function corsHeaders(request) {
    const origin = request.headers.get('Origin') || '';
    let allowed = ALLOWED_ORIGINS[0];
    if (origin && (
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') || 
        ALLOWED_ORIGINS.includes(origin)
    )) {
        allowed = origin;
    }
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
}

export function handleOptions(request) {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function addCors(response, request) {
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders(request)).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, { status: response.status, headers });
}