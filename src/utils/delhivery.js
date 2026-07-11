// src/utils/delhivery.js
// Delhivery API Integration Utilities
// Staging URL: https://staging-express.delhivery.com
// Production URL: https://track.delhivery.com

const BASE_URL = 'https://track.delhivery.com';

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Checks if a destination pincode is serviceable by Delhivery.
 * @param {object} env - Cloudflare worker env
 * @param {string} pincode - Destination pincode to check
 * @returns {Promise<{serviceable: boolean, cod: boolean, prepaid: boolean, error?: string}>}
 */
export async function checkPincodeServiceability(env, pincode) {
    const token = env.DELHIVERY_API_TOKEN;
    if (!token) {
        return { serviceable: false, cod: false, prepaid: false, error: 'Delhivery API token is not configured.' };
    }

    try {
        const url = `${BASE_URL}/c/api/pin-codes/json/?filter_codes=${pincode}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`Delhivery API returned status: ${res.status}`);
        }

        const data = await res.json();
        const info = data?.delivery_codes?.[0]?.postal_code;
        
        if (!info) {
            return { serviceable: false, cod: false, prepaid: false };
        }

        return {
            serviceable: info.pickup === 'Y' || info.pre_paid === 'Y' || info.cash === 'Y',
            cod: info.cash === 'Y',
            prepaid: info.pre_paid === 'Y'
        };
    } catch (err) {
        console.error('[Delhivery] Serviceability check error:', err);
        return { serviceable: false, cod: false, prepaid: false, error: err.message };
    }
}

/**
 * Books/Manifests a forward shipment order with Delhivery.
 * @param {object} env - Cloudflare worker env
 * @param {object} order - Order DB record
 * @param {array} items - Order items
 * @returns {Promise<{success: boolean, waybill?: string, tracking_url?: string, error?: string}>}
 */
export async function createDelhiveryShipment(env, order, items) {
    const token = env.DELHIVERY_API_TOKEN;
    if (!token) {
        return { success: false, error: 'Delhivery API token is not configured.' };
    }

    try {
        // Fetch warehouse details from database settings, fallback to default warehouse
        const pickupName = await getSetting(env, 'delhivery_pickup_name', 'HeelsUp Warehouse');
        const pickupAdd = await getSetting(env, 'delhivery_pickup_address', 'HeelsUp Warehouse Hub, 2nd Floor, Sector 3');
        const pickupCity = await getSetting(env, 'delhivery_pickup_city', 'New Delhi');
        const pickupPin = await getSetting(env, 'delhivery_pickup_pincode', '110001');
        const pickupPhone = await getSetting(env, 'delhivery_pickup_phone', '9999999999');

        // Total weight & qty calculation
        const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const itemNames = items.map(item => `${item.product_name || 'Footwear'} (${item.quantity || 1})`).join(', ');

        const payload = {
            shipments: [
                {
                    name: order.customer_name,
                    add: order.address_line1,
                    add_2: order.address_line2 || '',
                    pin: order.pincode,
                    city: order.city,
                    state: order.state,
                    country: order.country || 'India',
                    phone: order.customer_phone,
                    order: order.order_number,
                    payment_mode: order.payment_method?.toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
                    cod_amount: order.payment_method?.toLowerCase() === 'cod' ? (Number(order.total_amount || 0) / 100) : 0,
                    package_desc: itemNames.slice(0, 100),
                    total_weight: 0.5 * totalQty, // Standardized 0.5kg per shoe package
                    weight: 0.5 * totalQty,
                    quantity: totalQty
                }
            ],
            pickup_location: {
                name: pickupName,
                add: pickupAdd,
                city: pickupCity,
                pin: pickupPin,
                phone: pickupPhone
            }
        };

        const formBody = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

        const res = await fetch(`${BASE_URL}/api/cmu/create.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formBody
        });

        if (!res.ok) {
            throw new Error(`Delhivery CMU API returned status: ${res.status}`);
        }

        const data = await res.json();
        
        if (!data.success) {
            const errDetail = data?.packages?.[0]?.client_errors?.[0] || 'Unknown manifestation error';
            return { success: false, error: errDetail };
        }

        const pkg = data?.packages?.[0];
        const waybill = pkg?.waybill;
        
        return {
            success: true,
            waybill: waybill,
            tracking_url: `https://track.delhivery.com/track/package/${waybill}`
        };
    } catch (err) {
        console.error('[Delhivery] Shipment creation error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Tracks a package shipment's real-time transit status with Delhivery.
 * @param {object} env - Cloudflare worker env
 * @param {string} waybill - The Delhivery AWB/Waybill number
 * @returns {Promise<{success: boolean, status?: string, courier_name?: string, tracking_history?: any[], error?: string}>}
 */
export async function trackDelhiveryShipment(env, waybill) {
    const token = env.DELHIVERY_API_TOKEN;
    if (!token) {
        return { success: false, error: 'Delhivery API token is not configured.' };
    }

    try {
        const url = `${BASE_URL}/api/v1/packages/json/?waybill=${waybill}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`Delhivery Tracking API returned status: ${res.status}`);
        }

        const data = await res.json();
        const shipData = data?.ShipmentData?.[0]?.Shipment;

        if (!shipData) {
            return { success: false, error: 'Tracking data not found for waybill' };
        }

        return {
            success: true,
            status: shipData.Status?.Status,
            courier_name: 'Delhivery',
            tracking_history: shipData.Scans || []
        };
    } catch (err) {
        console.error('[Delhivery] Tracking error:', err);
        return { success: false, error: err.message };
    }
}
