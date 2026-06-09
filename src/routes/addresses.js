// worker/src/routes/addresses.js
import { requireAuth } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function addressesRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/addresses', '') || '/';
    const method = request.method;

    // All address endpoints require user authentication
    const { user, error: authError } = await requireAuth(request, env);
    if (authError) return authError;

    // GET /api/addresses — Get all addresses for logged-in user
    if (path === '/' && method === 'GET') {
        try {
            const result = await env.DB.prepare(
                'SELECT id, label, name, phone, line1, line2, city, state, pincode, country, is_default, created_at FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC'
            ).bind(user.id).all();
            
            return list(result.results || []);
        } catch (e) {
            console.error('Failed to fetch addresses:', e);
            return serverError('Failed to fetch saved addresses');
        }
    }

    // POST /api/addresses — Add a new address
    if (path === '/' && method === 'POST') {
        try {
            const { label, name, phone, line1, line2, city, state, pincode, country, is_default } = await request.json();

            if (!name || !phone || !line1 || !city || !state || !pincode) {
                return error('Name, phone, address line 1, city, state, and pincode are required');
            }

            const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
            if (cleanPhone.length !== 10) {
                return error('Invalid phone number format. Must be 10 digits.');
            }

            const defaultVal = is_default ? 1 : 0;

            // If this is default, reset other addresses
            if (defaultVal === 1) {
                await env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
            }

            const result = await env.DB.prepare(
                'INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(
                user.id,
                label || 'Home',
                name.trim(),
                cleanPhone,
                line1.trim(),
                line2 ? line2.trim() : null,
                city.trim(),
                state.trim(),
                pincode.trim(),
                country || 'India',
                defaultVal
            ).run();

            const addressId = result.meta?.last_row_id;
            const newAddress = {
                id: addressId,
                label: label || 'Home',
                name: name.trim(),
                phone: cleanPhone,
                line1: line1.trim(),
                line2: line2 ? line2.trim() : null,
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                country: country || 'India',
                is_default: defaultVal
            };

            return created(newAddress, 'Address saved successfully');
        } catch (e) {
            console.error('Failed to save address:', e);
            return serverError('Failed to save address');
        }
    }

    // PUT /api/addresses/:id — Update an address
    if (path.length > 1 && method === 'PUT') {
        try {
            const addressId = parseInt(path.slice(1));
            if (isNaN(addressId)) return error('Invalid address ID');

            const { label, name, phone, line1, line2, city, state, pincode, country, is_default } = await request.json();

            if (!name || !phone || !line1 || !city || !state || !pincode) {
                return error('Name, phone, address line 1, city, state, and pincode are required');
            }

            const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
            if (cleanPhone.length !== 10) {
                return error('Invalid phone number format. Must be 10 digits.');
            }

            const defaultVal = is_default ? 1 : 0;

            // Check if address belongs to user
            const address = await env.DB.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').bind(addressId, user.id).first();
            if (!address) return error('Address not found', 404);

            // If this is default, reset other addresses
            if (defaultVal === 1) {
                await env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
            }

            await env.DB.prepare(
                'UPDATE addresses SET label = ?, name = ?, phone = ?, line1 = ?, line2 = ?, city = ?, state = ?, pincode = ?, country = ?, is_default = ? WHERE id = ? AND user_id = ?'
            ).bind(
                label || 'Home',
                name.trim(),
                cleanPhone,
                line1.trim(),
                line2 ? line2.trim() : null,
                city.trim(),
                state.trim(),
                pincode.trim(),
                country || 'India',
                defaultVal,
                addressId,
                user.id
            ).run();

            return ok({
                id: addressId,
                label: label || 'Home',
                name: name.trim(),
                phone: cleanPhone,
                line1: line1.trim(),
                line2: line2 ? line2.trim() : null,
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                country: country || 'India',
                is_default: defaultVal
            }, 'Address updated successfully');
        } catch (e) {
            console.error('Failed to update address:', e);
            return serverError('Failed to update address');
        }
    }

    // DELETE /api/addresses/:id — Delete an address
    if (path.length > 1 && method === 'DELETE') {
        try {
            const addressId = parseInt(path.slice(1));
            if (isNaN(addressId)) return error('Invalid address ID');

            const result = await env.DB.prepare(
                'DELETE FROM addresses WHERE id = ? AND user_id = ?'
            ).bind(addressId, user.id).run();

            if (result.meta?.changes === 0) {
                return error('Address not found or unauthorized', 404);
            }

            return ok({ id: addressId }, 'Address deleted successfully');
        } catch (e) {
            console.error('Failed to delete address:', e);
            return serverError('Failed to delete address');
        }
    }

    return error('Route not found', 404);
}
