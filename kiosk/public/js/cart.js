/* Kootzy cart.
 * ============================================================================
 * Two storage backends behind one API:
 *
 *   signed out  -> localStorage. A customer can design and collect items before
 *                  they have an account; forcing sign-in at "add to cart" would
 *                  cost conversions for no benefit.
 *   signed in    -> /api/cart, which is user-scoped and RLS-enforced.
 *
 * mergeLocalIntoServer() moves anything collected while signed out into the
 * account on first sign-in, so the cart survives the auth redirect.
 * ========================================================================== */

const KEY = 'kootzyCart.v1';
const MAX_ITEMS = 25;
const MAX_QTY = 20;

const PREVIEW_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const PREVIEW_MAX_CHARS = 160000;

function cleanPreview(value) {
    const s = typeof value === 'string' ? value : '';
    if (!s || s.length > PREVIEW_MAX_CHARS || !PREVIEW_RE.test(s)) return '';
    return s;
}

const SCHEMA = 1;

const listeners = new Set();
let mergeInFlight = null;

function newId() {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readLocal() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.schema !== SCHEMA || !Array.isArray(parsed.items)) return [];
        return parsed.items;
    } catch (_) {
        return [];
    }
}

function writeLocal(items) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ schema: SCHEMA, items }));
    } catch (_) { /* storage unavailable */ }
}

let tokenProvider = () => null;
export function setTokenProvider(fn) {
    tokenProvider = typeof fn === 'function' ? fn : () => null;
    if (token() && readLocal().length > 0) {
        mergeLocalIntoServer().catch((err) => console.error('cart auto-merge failed:', err.message));
    }
}
function token() {
    try { return tokenProvider(); } catch (_) { return null; }
}

async function api(path, options = {}) {
    const jwt = token();
    const res = await fetch('/api/cart' + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}),
            ...(options.headers || {}),
        },
    });
    let payload = null;
    try { payload = await res.json(); } catch (_) { /* non-JSON */ }
    if (!res.ok) {
        const err = new Error((payload && payload.error) || `Cart request failed (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return payload;
}

function emit() {
    for (const fn of listeners) {
        try { fn(); } catch (err) { console.error('cart listener failed:', err); }
    }
}

export function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function isSignedIn() {
    return Boolean(token());
}

export function authHeaders() {
    const jwt = token();
    return jwt ? { Authorization: 'Bearer ' + jwt } : {};
}

export async function list() {
    if (!isSignedIn()) return readLocal();
    const data = await api('');
    return (data && data.items) || [];
}

export function localCount() {
    return readLocal().reduce((n, i) => n + (Number(i.quantity) || 0), 0);
}

export async function count() {
    if (!isSignedIn()) return localCount();
    const data = await api('');
    return (data && data.count) || 0;
}

export async function add(item) {
    const line = {
        productType: String(item.productType || '').trim(),
        text: String(item.text || '').trim(),
        quantity: Math.min(MAX_QTY, Math.max(1, parseInt(item.quantity, 10) || 1)),
        design: (item.design && typeof item.design === 'object' && !Array.isArray(item.design))
            ? item.design : {},
        preview: cleanPreview(item.preview),
        unitPrice: Number(item.unitPrice) || 0,
        weightG: Number(item.weightG) || 0,
    };
    if (!line.productType) throw new Error('Missing product type');
    if (!line.text) throw new Error('The design needs some text');

    if (isSignedIn()) {
        const data = await api('', { method: 'POST', body: JSON.stringify(line) });
        emit();
        return data && data.item;
    }

    const items = readLocal();
    if (items.length >= MAX_ITEMS) {
        throw new Error(`A cart holds at most ${MAX_ITEMS} designs`);
    }
    const saved = { id: newId(), createdAt: new Date().toISOString(), ...line };
    items.unshift(saved);
    writeLocal(items);
    emit();
    return saved;
}

export async function setQuantity(id, quantity) {
    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(quantity, 10) || 1));

    if (isSignedIn()) {
        await api('', { method: 'PATCH', body: JSON.stringify({ id, quantity: qty }) });
        emit();
        return;
    }
    const items = readLocal().map((i) => (String(i.id) === String(id) ? { ...i, quantity: qty } : i));
    writeLocal(items);
    emit();
}

export async function remove(id) {
    if (isSignedIn()) {
        await api('?id=' + encodeURIComponent(id), { method: 'DELETE' });
        emit();
        return;
    }
    writeLocal(readLocal().filter((i) => String(i.id) !== String(id)));
    emit();
}

export async function clear() {
    if (isSignedIn()) {
        await api('?all=1', { method: 'DELETE' });
        emit();
        return;
    }
    writeLocal([]);
    emit();
}

/**
 * Move a signed-out cart into the account. Call once after sign-in.
 *
 * Local is cleared *before* POSTs so cart-page + checkout cannot both merge the
 * same lines. Failures are put back into localStorage for retry. The server
 * also merges identical designs by quantity, so a rare double-post still does
 * not create four identical order lines.
 */
export async function mergeLocalIntoServer() {
    if (!isSignedIn()) return { merged: 0, failed: 0 };
    if (mergeInFlight) return mergeInFlight;

    mergeInFlight = (async () => {
        const local = readLocal();
        if (local.length === 0) return { merged: 0, failed: 0 };

        // Claim local lines immediately so concurrent pages see an empty cart.
        writeLocal([]);

        let merged = 0;
        const survivors = [];
        for (const line of local) {
            try {
                await api('', {
                    method: 'POST',
                    body: JSON.stringify({
                        productType: line.productType,
                        text: line.text,
                        quantity: line.quantity,
                        design: line.design,
                        preview: line.preview,
                        unitPrice: line.unitPrice,
                        weightG: line.weightG,
                    }),
                });
                merged++;
            } catch (err) {
                console.error('cart merge failed for one line:', err.message);
                survivors.push(line);
            }
        }
        if (survivors.length) writeLocal(survivors);
        emit();
        return { merged, failed: survivors.length };
    })();

    try {
        return await mergeInFlight;
    } finally {
        mergeInFlight = null;
    }
}

export const LIMITS = { MAX_ITEMS, MAX_QTY, PREVIEW_MAX_CHARS };

export { cleanPreview };
