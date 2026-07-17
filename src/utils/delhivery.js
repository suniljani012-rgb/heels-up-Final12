// src/utils/delhivery.js
// Delhivery API Integration Utilities
// Staging URL: https://staging-express.delhivery.com
// Production URL: https://track.delhivery.com

const BASE_URL = 'https://track.delhivery.com';
const FREE_THRESHOLD_PAISE = 159900; // ₹1599

// ─── Zone Map: State → Delivery Zone & Fee ─────────────────────────────────
// Zone A = Home (Rajasthan), Zone E = Remote/South
const ZONE_MAP = {
    // Zone A — Home
    'Rajasthan': { zone: 'A', feePaise: 4900, days: '2-4' },

    // Zone B — North India
    'Delhi': { zone: 'B', feePaise: 5900, days: '3-5' },
    'New Delhi': { zone: 'B', feePaise: 5900, days: '3-5' },
    'Haryana': { zone: 'B', feePaise: 5900, days: '3-5' },
    'Uttar Pradesh': { zone: 'B', feePaise: 5900, days: '3-5' },
    'Punjab': { zone: 'B', feePaise: 5900, days: '3-5' },
    'Madhya Pradesh': { zone: 'B', feePaise: 5900, days: '4-6' },
    'Chandigarh': { zone: 'B', feePaise: 5900, days: '3-5' },

    // Zone C — Metro / West / South
    'Maharashtra': { zone: 'C', feePaise: 7900, days: '4-6' },
    'Gujarat': { zone: 'C', feePaise: 7900, days: '4-6' },
    'Karnataka': { zone: 'C', feePaise: 7900, days: '5-7' },
    'Tamil Nadu': { zone: 'C', feePaise: 7900, days: '5-7' },
    'Telangana': { zone: 'C', feePaise: 7900, days: '5-7' },
    'Andhra Pradesh': { zone: 'C', feePaise: 7900, days: '5-7' },
    'Goa': { zone: 'C', feePaise: 7900, days: '5-7' },

    // Zone D — East India
    'West Bengal': { zone: 'D', feePaise: 9900, days: '5-7' },
    'Odisha': { zone: 'D', feePaise: 9900, days: '5-7' },
    'Bihar': { zone: 'D', feePaise: 9900, days: '5-7' },
    'Jharkhand': { zone: 'D', feePaise: 9900, days: '5-7' },
    'Chhattisgarh': { zone: 'D', feePaise: 9900, days: '5-7' },
    'Assam': { zone: 'D', feePaise: 9900, days: '6-8' },
    'Himachal Pradesh': { zone: 'D', feePaise: 9900, days: '5-7' },
    'Uttarakhand': { zone: 'D', feePaise: 9900, days: '5-7' },

    // Zone E — Remote / Far South / NE
    'Kerala': { zone: 'E', feePaise: 12900, days: '6-8' },
    'Jammu and Kashmir': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Jammu & Kashmir': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Ladakh': { zone: 'E', feePaise: 12900, days: '8-12' },
    'Sikkim': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Meghalaya': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Mizoram': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Nagaland': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Arunachal Pradesh': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Manipur': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Tripura': { zone: 'E', feePaise: 12900, days: '7-10' },
    'Andaman and Nicobar Islands': { zone: 'E', feePaise: 12900, days: '10-14' },
    'Lakshadweep': { zone: 'E', feePaise: 12900, days: '10-14' },
    'Puducherry': { zone: 'E', feePaise: 12900, days: '6-8' },
    'Daman and Diu': { zone: 'E', feePaise: 12900, days: '6-8' },
    'Dadra and Nagar Haveli': { zone: 'E', feePaise: 12900, days: '6-8' },
};

// Default fallback if state not found
const DEFAULT_ZONE = { zone: 'E', feePaise: 12900, days: '6-8' };

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Gets delivery estimate for a pincode.
 * Calls Delhivery serviceability API; falls back to zone map if API unavailable.
 * @param {object} env - Cloudflare worker env
 * @param {string} pincode - 6-digit destination pincode
 * @param {number} [orderTotalPaise=0] - Cart total in paise (to determine free shipping)
 * @returns {Promise<{
 *   serviceable: boolean, cod: boolean, prepaid: boolean,
 *   feePaise: number, isFree: boolean, zone: string,
 *   estimatedDays: string, city: string, state: string,
 *   error?: string
 * }>}
 */
export async function getDeliveryEstimate(env, pincode, orderTotalPaise = 0) {
    const token = env.DELHIVERY_API_TOKEN;
    let serviceabilityData = null;
    let city = '';
    let state = '';

    // Step 1: Try Delhivery API for serviceability + location data
    if (token) {
        try {
            const url = `${BASE_URL}/c/api/pin-codes/json/?filter_codes=${pincode}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                const info = data?.delivery_codes?.[0]?.postal_code;
                if (info) {
                    serviceabilityData = {
                        serviceable: info.pickup === 'Y' || info.pre_paid === 'Y' || info.cash === 'Y',
                        cod: info.cash === 'Y',
                        prepaid: info.pre_paid === 'Y',
                    };
                    city = info.district || info.city || '';
                    state = info.state_code
                        ? stateCodeToName(info.state_code)
                        : (info.state || '');
                }
            }
        } catch (err) {
            console.warn('[Delhivery] Estimate API call failed, using zone fallback:', err.message);
        }
    }

    // Step 2: Zone lookup (primary if no API, validation otherwise)
    const zoneData = state ? (ZONE_MAP[state] || DEFAULT_ZONE) : DEFAULT_ZONE;

    // Step 3: Free threshold check
    const freeAbovePaise = FREE_THRESHOLD_PAISE;
    const isFree = orderTotalPaise >= freeAbovePaise;
    const feePaise = isFree ? 0 : zoneData.feePaise;

    return {
        serviceable: serviceabilityData ? serviceabilityData.serviceable : true, // assume serviceable as fallback
        cod: serviceabilityData ? serviceabilityData.cod : true, // assume COD available as fallback
        prepaid: serviceabilityData ? serviceabilityData.prepaid : true,
        feePaise,
        feeRupees: feePaise / 100,
        isFree,
        zone: zoneData.zone,
        estimatedDays: zoneData.days,
        city,
        state,
        freeAbovePaise,
        freeAboveRupees: freeAbovePaise / 100,
    };
}

/**
 * Maps Delhivery state codes to full state names.
 */
function stateCodeToName(code) {
    const map = {
        'RJ': 'Rajasthan', 'DL': 'Delhi', 'HR': 'Haryana', 'UP': 'Uttar Pradesh',
        'PB': 'Punjab', 'MP': 'Madhya Pradesh', 'CH': 'Chandigarh',
        'MH': 'Maharashtra', 'GJ': 'Gujarat', 'KA': 'Karnataka',
        'TN': 'Tamil Nadu', 'TS': 'Telangana', 'AP': 'Andhra Pradesh', 'GA': 'Goa',
        'WB': 'West Bengal', 'OR': 'Odisha', 'BR': 'Bihar', 'JH': 'Jharkhand',
        'CG': 'Chhattisgarh', 'AS': 'Assam', 'HP': 'Himachal Pradesh', 'UK': 'Uttarakhand',
        'KL': 'Kerala', 'JK': 'Jammu and Kashmir', 'LA': 'Ladakh', 'SK': 'Sikkim',
        'ML': 'Meghalaya', 'MZ': 'Mizoram', 'NL': 'Nagaland', 'AR': 'Arunachal Pradesh',
        'MN': 'Manipur', 'TR': 'Tripura', 'AN': 'Andaman and Nicobar Islands',
        'LD': 'Lakshadweep', 'PY': 'Puducherry', 'DD': 'Daman and Diu',
        'DN': 'Dadra and Nagar Haveli',
    };
    return map[code] || code;
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
                    cod_amount: order.payment_method?.toLowerCase() === 'cod' ? ( (Number(order.total_amount || 0) / 100) - Math.round((Number(order.total_amount || 0) / 100) * 0.10) ) : 0,
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
