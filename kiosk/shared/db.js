/* Supabase access for Cloudflare Pages Functions.
 *
 * Deliberately dependency-free: it talks to PostgREST over plain fetch rather
 * than pulling in @supabase/supabase-js. That keeps the Worker bundle tiny, keeps
 * the repo's "no package.json for the frontend" character, and avoids adding a
 * supply-chain surface for what amounts to a few HTTP calls.
 *
 * TWO ACCESS MODES — the distinction is the whole security model:
 *
 *   db(env)                     service_role. BYPASSES Row Level Security.
 *                               Use for operator/admin work and for writes the
 *                               customer must not control (price, status,
 *                               dispatch). Never reachable from a customer's
 *                               session.
 *
 *   db(env, { accessToken })    anon key + the signed-in user's JWT. RLS APPLIES.
 *                               Use for everything a customer reads or writes
 *                               about themselves: profile, addresses, cart, their
 *                               own orders.
 *
 * Why it matters: RLS is enabled on every table, so before this existed each
 * query ran as service_role and the policies were never consulted. Passing the
 * user's token makes Postgres enforce ownership, which means a bug in a Function
 * cannot leak one customer's orders to another.
 *
 * We do NOT verify the JWT here. PostgREST validates the signature against the
 * project secret and rejects anything forged or expired, and the policies key off
 * auth.uid() from that verified token. Re-implementing verification in the Worker
 * would add a second thing to get wrong. The corollary: never make an
 * authorisation decision from an unverified decode of this token — let the
 * database decide.
 *
 * Requires:
 *   SUPABASE_URL              e.g. https://abcdefgh.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY service_role key — SECRET, server-side only
 *   SUPABASE_ANON_KEY         anon/publishable key — needed for user-scoped calls
 */

const DEFAULT_TIMEOUT_MS = 8000;

export class DbError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status || 500;
    }
}

export function db(env, options = {}) {
    const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
    const accessToken = options.accessToken || null;

    // User-scoped calls present the anon key as the API key and the user's JWT as
    // the bearer; service_role calls use the same key for both.
    const apiKey = accessToken
        ? (env.SUPABASE_ANON_KEY || '')
        : (env.SUPABASE_SERVICE_ROLE_KEY || '');

    if (!base || !apiKey) {
        throw new DbError(
            accessToken
                ? 'Supabase is not configured for user-scoped access (SUPABASE_URL / SUPABASE_ANON_KEY missing)'
                : 'Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)',
            503
        );
    }

    async function request(path, { method = 'GET', body, prefer, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
        const headers = {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken || apiKey}`,
            'Content-Type': 'application/json',
        };
        if (prefer) headers.Prefer = prefer;

        let res;
        try {
            res = await fetch(`${base}/rest/v1/${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                // Workers supports AbortSignal.timeout; keeps a stalled DB from
                // burning the whole request budget the way the Sheets calls could.
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (err) {
            const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
            throw new DbError(
                timedOut ? 'Database timed out. Please try again.' : `Database unreachable: ${err.message}`,
                504
            );
        }

        const raw = await res.text();
        if (!res.ok) {
            // PostgREST returns {message, details, hint, code}
            let msg = raw;
            try { msg = JSON.parse(raw).message || raw; } catch (_) { /* keep raw */ }
            throw new DbError(msg || `Database error (${res.status})`, res.status);
        }
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    return {
        /** SELECT. `query` is a PostgREST query string, e.g. "select=*&status=eq.Pending" */
        select: (table, query = 'select=*') => request(`${table}?${query}`),

        /** INSERT one row, returning the inserted row. */
        async insert(table, row) {
            const rows = await request(table, {
                method: 'POST',
                body: row,
                prefer: 'return=representation',
            });
            return Array.isArray(rows) ? rows[0] : rows;
        },

        /** INSERT many rows in ONE request. PostgREST wraps a single request in a
         *  single transaction, so this is all-or-nothing — unlike a loop of
         *  single inserts, which can fail halfway and leave a partial set. */
        insertMany: (table, rows) => request(table, {
            method: 'POST',
            body: rows,
            prefer: 'return=minimal',
        }),

        /** INSERT without reading anything back (cheaper for fire-and-forget writes). */
        insertQuiet: (table, row) => request(table, { method: 'POST', body: row, prefer: 'return=minimal' }),

        /** UPSERT on a unique constraint. */
        async upsert(table, row, onConflict) {
            const rows = await request(`${table}?on_conflict=${onConflict}`, {
                method: 'POST',
                body: row,
                prefer: 'resolution=merge-duplicates,return=representation',
            });
            return Array.isArray(rows) ? rows[0] : rows;
        },

        /** PATCH rows matching `query`, returning the updated rows. */
        update: (table, query, patch) => request(`${table}?${query}`, {
            method: 'PATCH',
            body: patch,
            prefer: 'return=representation',
        }),

        /** DELETE rows matching `query`. */
        remove: (table, query) => request(`${table}?${query}`, { method: 'DELETE', prefer: 'return=minimal' }),
    };
}

/* ── Auth server lookup ──
 * Resolve WHO a token belongs to by asking Supabase's auth server, which
 * validates the signature. This is the only sanctioned way to get a user id in a
 * Function — decoding the JWT locally would trust an unverified claim.
 */
export async function authUser(env, accessToken) {
    const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = env.SUPABASE_ANON_KEY || '';
    if (!base || !anonKey || !accessToken) return null;

    let res;
    try {
        res = await fetch(`${base}/auth/v1/user`, {
            headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        });
    } catch (_) {
        return null;
    }
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    return user && user.id ? { id: user.id, email: user.email || '' } : null;
}

/* ── Row <-> API shape ──
 * The frontend (kiosk-app.js, admin-dashboard.js) already speaks the camelCase
 * shape the Express API returned. Postgres columns are snake_case, so translate
 * at the boundary and leave the frontend untouched.
 */

export function rowToOrder(r) {
    return {
        orderNum:        r.order_num,
        timestamp:       (r.created_at || '').replace('T', ' ').substring(0, 19),
        name:            r.customer_name,
        phone:           r.phone,
        productType:     r.product_type,
        text:            r.text_value,
        wordartBase:     r.wordart_base,
        font:            r.font,
        baseColor:       r.base_color,
        fontColor:       r.font_color,
        weightG:         Number(r.weight_g),
        printTimeMins:   Number(r.print_time_mins),
        materialCost:    Number(r.material_cost),
        machineCost:     Number(r.machine_cost),
        laborCost:       Number(r.labor_cost),
        productionCost:  Number(r.production_cost),
        finalAmount:     Number(r.final_amount),
        batchSize:       Number(r.batch_size),
        upiTxnId:        r.upi_txn_id,
        status:          r.status,
    };
}

const ALLOWED_BACKINGS = ['none', 'solid', 'hollow'];

export function orderToRow(o) {
    const backing = ALLOWED_BACKINGS.includes(o.wordartBase) ? o.wordartBase : 'none';
    return {
        customer_name:   String(o.name || '').trim(),
        phone:           String(o.phone || '').trim(),
        product_type:    String(o.productType || '').trim(),
        text_value:      String(o.text || '').trim(),
        wordart_base:    backing,
        font:            o.font || 'Standard',
        base_color:      o.baseColor || '#FFFFFF',
        font_color:      o.fontColor || '#000000',
        weight_g:        Number(o.weightG) || 0,
        print_time_mins: Number(o.printTimeMins) || 0,
        material_cost:   Number(o.materialCost) || 0,
        machine_cost:    Number(o.machineCost) || 0,
        labor_cost:      Number(o.laborCost) || 0,
        production_cost: Number(o.productionCost) || 0,
        final_amount:    Number(o.finalAmount) || 0,
        batch_size:      parseInt(o.batchSize, 10) || 5,
        upi_txn_id:      o.upiTxnId || '',
        status:          'Pending',
    };
}

export function rowToBatch(r) {
    return {
        baseColor: r.base_color,
        fontColor: r.font_color,
        name:      r.name,
        count:     Number(r.count),
    };
}
