import { json, guard, readJson } from '../../../shared/http.js';
import { db, orderToRow, rowToOrder } from '../../../shared/db.js';

const VALID_PRODUCT_TYPES = [
    'keychain', 'wordart', 'loveseries', 'tilekey', 'linked_initials',
    'nametag', 'girly_keychain', 'supported_text', 'flower_keychain',
    'led_word_stand', 'led_word_art', 'bordered_keychain', 'bubble_keychain',
    'nameplate', 'desk_organizer', 'name_beads',
];

// Public: place an order. The order number is assigned by a Postgres sequence,
// so concurrent kiosk submissions can no longer collide the way the
// read-last-row-then-increment logic could.
export const onRequestPost = guard(async ({ request, env }) => {
    const body = await readJson(request);

    if (!body.name || !body.phone || !body.productType || !body.text) {
        return json({ error: 'Missing required fields: name, phone, productType, text' }, 400);
    }

    // ── Input length / format validation ──
    const name = String(body.name).trim();
    const phone = String(body.phone).trim();
    const text = String(body.text).trim();
    const productType = String(body.productType).trim();

    if (name.length > 100) {
        return json({ error: 'Name is too long (max 100 characters)' }, 400);
    }
    if (!/^\d{10}$/.test(phone)) {
        return json({ error: 'Phone must be exactly 10 digits' }, 400);
    }
    if (text.length > 200) {
        return json({ error: 'Text is too long (max 200 characters)' }, 400);
    }
    if (!VALID_PRODUCT_TYPES.includes(productType)) {
        return json({ error: `Invalid productType. Expected one of: ${VALID_PRODUCT_TYPES.join(', ')}` }, 400);
    }

    // ── Simple rate limit: no more than 5 orders from the same phone in 10 minutes ──
    try {
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const recent = await db(env).select(
            'orders',
            `select=id&phone=eq.${encodeURIComponent(phone)}&created_at=gte.${encodeURIComponent(since)}&limit=5`
        );
        if (Array.isArray(recent) && recent.length >= 5) {
            return json({ error: 'Too many orders from this phone number. Please wait a few minutes.' }, 429);
        }
    } catch (err) {
        // Don't block legitimate orders if the rate-limit check fails.
        console.error('Order rate-limit check failed, allowing:', err.message);
    }

    // Use validated values (overwrite raw body fields with trimmed/validated versions)
    body.name = name;
    body.phone = phone;
    body.text = text;
    body.productType = productType;

    const saved = await db(env).insert('orders', orderToRow(body));
    const order = rowToOrder(saved);
    return json({ success: true, orderNum: order.orderNum, order }, 201);
});
