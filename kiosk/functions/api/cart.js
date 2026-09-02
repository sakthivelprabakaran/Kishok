import { json, fail, guard, readJson, requireCustomer } from '../../shared/http.js';
import { db } from '../../shared/db.js';

/* Cart, owned by the signed-in customer.
 *
 * Every call runs user-scoped (anon key + the customer's JWT), so Postgres RLS
 * enforces ownership — a customer cannot read or mutate another's cart even if a
 * bug here passed the wrong id. That is why none of these handlers filter by
 * user_id themselves: the policy does it, and belt-and-braces filtering here
 * would hide a policy regression rather than surface it.
 *
 * Prices are NOT trusted from the client. unit_price/weight_g are stored as a
 * display cache and recomputed server-side at checkout.
 */

const SELECT = 'select=id,product_type,text_value,quantity,design,preview,unit_price,weight_g,created_at'
    + '&order=created_at.desc';

const VALID_PRODUCT_TYPES = [
    'keychain', 'wordart', 'loveseries', 'tilekey', 'linked_initials',
    'nametag', 'girly_keychain', 'supported_text', 'flower_keychain',
    'led_word_stand', 'led_word_art', 'bordered_keychain', 'bubble_keychain',
    'nameplate', 'desk_organizer', 'name_beads',
];

const MAX_ITEMS = 25;
const MAX_QTY = 20;

/* Same rules as the client's cleanPreview: strict media types because this
 * string ends up in an <img src>, and a hard size cap because it is stored
 * inline in the row. Server-side revalidation — the client check is UX. */
const PREVIEW_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const PREVIEW_MAX_CHARS = 160000;

function cleanPreview(value) {
    const s = typeof value === 'string' ? value : '';
    if (!s || s.length > PREVIEW_MAX_CHARS || !PREVIEW_RE.test(s)) return '';
    return s;
}

function rowToItem(r) {
    return {
        id: r.id,
        productType: r.product_type,
        text: r.text_value,
        quantity: Number(r.quantity),
        design: r.design || {},
        preview: cleanPreview(r.preview),
        unitPrice: Number(r.unit_price),
        weightG: Number(r.weight_g),
        createdAt: r.created_at,
    };
}

/* GET /api/cart — the signed-in customer's cart. */
export const onRequestGet = guard(async ({ request, env }) => {
    const auth = requireCustomer(request);
    if (auth instanceof Response) return auth;

    const rows = await db(env, auth).select('cart_items', SELECT);
    const items = Array.isArray(rows) ? rows.map(rowToItem) : [];
    return json({
        items,
        count: items.reduce((n, i) => n + i.quantity, 0),
    });
});

/* POST /api/cart — add a designed item. */
export const onRequestPost = guard(async ({ request, env }) => {
    const auth = requireCustomer(request);
    if (auth instanceof Response) return auth;

    const body = await readJson(request);
    const productType = String(body.productType || '').trim();
    const text = String(body.text || '').trim();
    const quantity = parseInt(body.quantity, 10);

    if (!VALID_PRODUCT_TYPES.includes(productType)) {
        return fail('Unknown product type', 400);
    }
    if (!text) return fail('The design needs some text', 400);
    if (text.length > 200) return fail('Text is too long (max 200 characters)', 400);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
        return fail(`Quantity must be between 1 and ${MAX_QTY}`, 400);
    }

    const client = db(env, auth);

    // Cap the cart so one account cannot fill the table.
    const existing = await client.select('cart_items', `select=id&limit=${MAX_ITEMS + 1}`);
    if (Array.isArray(existing) && existing.length >= MAX_ITEMS) {
        return fail(`A cart holds at most ${MAX_ITEMS} designs`, 409);
    }

    // design is free-form by design (see 003-cart.sql) but must be an object, not
    // an array or a string, or the jsonb column becomes awkward to query.
    const design = (body.design && typeof body.design === 'object' && !Array.isArray(body.design))
        ? body.design : {};

    const saved = await client.insert('cart_items', {
        // user_id is intentionally absent: the column defaults to auth.uid(), so
        // Postgres takes the owner from the verified JWT. Accepting it from the
        // body would mean trusting the client with someone else's identity.
        product_type: productType,
        text_value: text,
        quantity,
        design,
        preview: cleanPreview(body.preview),
        unit_price: Number(body.unitPrice) || 0,   // display cache only
        weight_g: Number(body.weightG) || 0,
    });

    return json({ item: rowToItem(saved) }, 201);
});

/* PATCH /api/cart — change a line's quantity. */
export const onRequestPatch = guard(async ({ request, env }) => {
    const auth = requireCustomer(request);
    if (auth instanceof Response) return auth;

    const body = await readJson(request);
    const id = parseInt(body.id, 10);
    const quantity = parseInt(body.quantity, 10);

    if (!Number.isFinite(id)) return fail('Which line?', 400);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
        return fail(`Quantity must be between 1 and ${MAX_QTY}`, 400);
    }

    const rows = await db(env, auth).update('cart_items', `id=eq.${id}`, { quantity });
    if (!Array.isArray(rows) || rows.length === 0) return fail('Line not found', 404);
    return json({ item: rowToItem(rows[0]) });
});

/* DELETE /api/cart?id=123 — remove one line, or ?all=1 to empty the cart. */
export const onRequestDelete = guard(async ({ request, env }) => {
    const auth = requireCustomer(request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const client = db(env, auth);

    if (url.searchParams.get('all') === '1') {
        // RLS scopes this to the caller's rows; `id=gt.0` is just a required filter
        // because PostgREST refuses an unfiltered DELETE.
        await client.remove('cart_items', 'id=gt.0');
        return json({ success: true, items: [], count: 0 });
    }

    const id = parseInt(url.searchParams.get('id'), 10);
    if (!Number.isFinite(id)) return fail('Which line?', 400);
    await client.remove('cart_items', `id=eq.${id}`);
    return json({ success: true });
});
