// worker/src/routes/colors.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function colorsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/colors', '') || '/';
    const method = request.method;

    // GET /api/colors — List all color mappings (publicly accessible)
    if (path === '/' && method === 'GET') {
        try {
            const result = await env.DB.prepare(
                'SELECT color_name, hex_code, created_at, updated_at FROM color_hex_mappings ORDER BY color_name ASC'
            ).all();
            return list(result.results || []);
        } catch (e) {
            console.error('Failed to fetch colors:', e);
            return serverError('Failed to fetch color mappings');
        }
    }

    // Admin endpoints (requireAdmin)
    const { error: authError } = await requireAdmin(request, env);
    if (authError) return authError;

    // POST /api/colors — Create new color mapping
    if (path === '/' && method === 'POST') {
        try {
            const { color_name, hex_code } = await request.json();
            if (!color_name || !hex_code) {
                return error('Color name and hex code are required');
            }

            const cleanName = String(color_name).trim().toLowerCase();
            const cleanHex = String(hex_code).trim();

            if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
                return error('Invalid hex code format. Must be like #FFFFFF');
            }

            await env.DB.prepare(
                'INSERT INTO color_hex_mappings (color_name, hex_code, created_at, updated_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))'
            ).bind(cleanName, cleanHex).run();

            return created({ color_name: cleanName, hex_code: cleanHex }, 'Color mapping created successfully');
        } catch (e) {
            console.error('Failed to create color mapping:', e);
            if (e.message && e.message.includes('UNIQUE')) {
                return error('Color mapping already exists');
            }
            return serverError('Failed to create color mapping');
        }
    }

    // PUT /api/colors/:color_name — Update hex code
    if (path.length > 1 && method === 'PUT') {
        try {
            const rawColorName = path.slice(1);
            const colorName = decodeURIComponent(rawColorName).trim().toLowerCase();
            const { hex_code } = await request.json();

            if (!hex_code) return error('Hex code is required');
            const cleanHex = String(hex_code).trim();

            if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
                return error('Invalid hex code format. Must be like #FFFFFF');
            }

            const result = await env.DB.prepare(
                'UPDATE color_hex_mappings SET hex_code = ?, updated_at = datetime(\'now\') WHERE color_name = ?'
            ).bind(cleanHex, colorName).run();

            if (result.meta?.changes === 0) {
                return error('Color mapping not found', 404);
            }

            return ok({ color_name: colorName, hex_code: cleanHex }, 'Color mapping updated successfully');
        } catch (e) {
            console.error('Failed to update color mapping:', e);
            return serverError('Failed to update color mapping');
        }
    }

    // DELETE /api/colors/:color_name — Delete color mapping
    if (path.length > 1 && method === 'DELETE') {
        try {
            const rawColorName = path.slice(1);
            const colorName = decodeURIComponent(rawColorName).trim().toLowerCase();

            const result = await env.DB.prepare(
                'DELETE FROM color_hex_mappings WHERE color_name = ?'
            ).bind(colorName).run();

            if (result.meta?.changes === 0) {
                return error('Color mapping not found', 404);
            }

            return ok({ color_name: colorName }, 'Color mapping deleted successfully');
        } catch (e) {
            console.error('Failed to delete color mapping:', e);
            return serverError('Failed to delete color mapping');
        }
    }

    return error('Route not found', 404);
}
