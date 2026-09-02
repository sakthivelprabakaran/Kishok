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
 *
 * DESIGN SNAPSHOT
 * A line stores the full design payload, not a SKU: product type, text, fonts,
 * colours and the product-specific geometry. That is what the 3D viewer needs to
 * re-render a thumbnail, and what the operator needs to print the right thing.
 *
 * PRICE
 * unitPrice is carried for display only. The server recomputes it at checkout —
 * a cart that names its own price is a cart that will be edited. Treat every
 * number here as untrusted the moment it leaves the browser.
 * ============================================================================ */

const KEY = 'kootzyCart.v1';
const MAX_ITEMS = 25;
const MAX_QTY = 20;

/* Bumping SCHEMA discards older carts rather than trying to migrate half-known
   shapes — a stale cart is a minor annoyance, a corrupt one is a support ticket. */
const SCHEMA = 1;

const listeners = new Set();

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
        // Private mode, quota, or hand-edited junk. An unusable cart must not take
        // the page down with it.
        return [];
    }
}

function writeLocal(items) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ schema: SCHEMA, items }));
    } catch (_) { /* storage unavailable — cart is in-memory for this session */ }
}

/* ── auth handoff ──
   Set by the auth module once Supabase Auth has a session. Kept as a getter so
   the cart never holds a stale token. */
let tokenProvider = () => null;
export function setTokenProvider(fn) {
    tokenProvider = typeof fn === 'function' ? fn : () => null;
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
    try { payload = await res.json(); } catch (_) { /* non-JSON error page */ }
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

/** Subscribe to cart changes. Returns an unsubscribe function. */
export function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function isSignedIn() {
    return Boolean(token());
}

/* ── reads ── */

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

/* ── writes ── */

/**
 * Add a designed item.
 * @param {{productType:string,text:string,quantity?:number,design?:object,
 *          unitPrice?:number,weightG?:number}} item
 */
export async function add(item) {
    const line = {
        productType: String(item.productType || '').trim(),
        text: String(item.text || '').trim(),
        quantity: Math.min(MAX_QTY, Math.max(1, parseInt(item.quantity, 10) || 1)),
        design: (item.design && typeof item.design === 'object' && !Array.isArray(item.design))
            ? item.design : {},
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
 * Move a signed-out cart into the account. Call once, right after sign-in.
 *
 * Local lines are only dropped after the server accepts them, so a failure
 * halfway leaves the local cart intact and the merge can be retried. The cost of
 * that choice is a possible duplicate if the response is lost in flight, which is
 * far friendlier than silently losing a design the customer spent time on.
 */
export async function mergeLocalIntoServer() {
    if (!isSignedIn()) return { merged: 0, failed: 0 };

    const local = readLocal();
    if (local.length === 0) return { merged: 0, failed: 0 };

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
    writeLocal(survivors);
    emit();
    return { merged, failed: survivors.length };
}

export const LIMITS = { MAX_ITEMS, MAX_QTY };
