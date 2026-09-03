/* In-memory PostgREST + Supabase Auth stub for testing the Cloudflare Pages
 * Functions in Node, without a Supabase account.
 *
 * Simulates the three behaviours the Functions rely on:
 *   1. PostgREST query strings (select/order/limit/eq filters) over in-memory
 *      tables;
 *   2. RLS scoping — anon-key + user-JWT requests only see/write their own
 *      cart_items rows, and user_id defaults to the token's uid on insert
 *      (mirroring `default auth.uid()` in migration 003). service_role sees all.
 *   3. GET /auth/v1/user resolving a token to a user, as authUser() expects.
 *
 * Deliberately NOT a general PostgREST: it implements exactly what the
 * Functions use, and throws loudly on anything unrecognised so a new query
 * shape fails the suite instead of silently returning nonsense.
 */

export const ENV = {
    SUPABASE_URL: 'https://stub.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'SERVICE_KEY',
    SUPABASE_ANON_KEY: 'ANON_KEY',
    ADMIN_PIN: '9876',
};

export function makeStub() {
    const tables = { cart_items: [], orders: [], order_items: [], login_attempts: [], batches: [] };
    const tokens = new Map();     // jwt -> { id, email }
    let nextId = 1;
    let nextOrderNum = 1;
    const failures = new Map();   // "table:op" -> count of calls to fail

    function registerUser(jwt, user) { tokens.set(jwt, user); }
    function failNext(table, op, times = 1) { failures.set(`${table}:${op}`, times); }
    function shouldFail(table, op) {
        const key = `${table}:${op}`;
        const n = failures.get(key) || 0;
        if (n > 0) { failures.set(key, n - 1); return true; }
        return false;
    }

    function parseFilters(params) {
        // Everything that is not a reserved keyword is a column filter.
        const reserved = new Set(['select', 'order', 'limit', 'on_conflict']);
        const filters = [];
        for (const [key, raw] of params.entries()) {
            if (reserved.has(key)) continue;
            const m = /^(eq|gt|gte|lt|lte)\.(.*)$/.exec(raw);
            if (!m) throw new Error(`stub: unsupported filter ${key}=${raw}`);
            filters.push({ column: key, op: m[1], value: m[2] });
        }
        return filters;
    }

    function applyFilters(rows, filters) {
        return rows.filter((r) => filters.every((f) => {
            const v = r[f.column];
            switch (f.op) {
                case 'eq': return String(v) === f.value;
                case 'gt': return Number(v) > Number(f.value);
                case 'gte': return String(v) >= f.value;
                case 'lt': return String(v) < f.value;
                case 'lte': return String(v) <= f.value;
                default: return false;
            }
        }));
    }

    function json(body, status = 200) {
        return new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    async function fetchImpl(url, init = {}) {
        const u = new URL(url);
        const headers = init.headers || {};
        const apikey = headers.apikey || '';
        const bearer = (headers.Authorization || '').replace(/^Bearer\s+/i, '');

        /* ── auth server ── */
        if (u.pathname === '/auth/v1/user') {
            const user = tokens.get(bearer);
            return user ? json(user) : json({ message: 'invalid token' }, 401);
        }

        /* ── PostgREST ── */
        const m = /^\/rest\/v1\/(\w+)$/.exec(u.pathname);
        if (!m) throw new Error(`stub: unexpected URL ${url}`);
        const table = m[1];
        if (!(table in tables)) throw new Error(`stub: unknown table ${table}`);

        // Access mode. service_role bypasses RLS; anon+JWT is user-scoped.
        let uid = null;
        if (apikey === ENV.SUPABASE_SERVICE_ROLE_KEY) {
            uid = null;   // sees everything
        } else if (apikey === ENV.SUPABASE_ANON_KEY) {
            const user = tokens.get(bearer);
            if (!user) return json({ message: 'JWT invalid' }, 401);
            uid = user.id;
        } else {
            return json({ message: 'No API key' }, 401);
        }

        // RLS: user-scoped requests only touch their own rows in these tables.
        const rlsScoped = uid !== null && (table === 'cart_items' || table === 'orders');
        const visible = () => rlsScoped
            ? tables[table].filter((r) => r.user_id === uid)
            : tables[table];

        const method = (init.method || 'GET').toUpperCase();
        const filters = parseFilters(u.searchParams);

        if (method === 'GET') {
            let rows = applyFilters(visible(), filters);
            const order = u.searchParams.get('order');
            if (order) {
                const [col, dir] = order.split('.');
                rows = [...rows].sort((a, b) =>
                    (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
            }
            const limit = u.searchParams.get('limit');
            if (limit) rows = rows.slice(0, parseInt(limit, 10));
            return json(rows);
        }

        if (method === 'POST') {
            if (shouldFail(table, 'insert')) return json({ message: 'stub: injected insert failure' }, 500);
            const body = JSON.parse(init.body);
            const rows = Array.isArray(body) ? body : [body];
            const saved = rows.map((row) => {
                const r = { ...row, id: nextId++, created_at: new Date(Date.now() + nextId).toISOString() };
                // default auth.uid() on user-scoped inserts (migration 003)
                if (rlsScoped && r.user_id === undefined) r.user_id = uid;
                // RLS insert policy: a mismatched user_id is rejected, not trusted
                if (rlsScoped && r.user_id !== uid) {
                    throw Object.assign(new Error('rls'), { rls: true });
                }
                if (table === 'orders' && !r.order_num) {
                    r.order_num = String(nextOrderNum++).padStart(4, '0');
                }
                tables[table].push(r);
                return r;
            });
            const prefer = headers.Prefer || '';
            if (prefer.includes('return=representation')) {
                return json(Array.isArray(body) ? saved : saved, 201);
            }
            return new Response(null, { status: 201 });
        }

        if (method === 'PATCH') {
            const body = JSON.parse(init.body);
            const targets = applyFilters(visible(), filters);
            for (const r of targets) Object.assign(r, body);
            return json(targets);
        }

        if (method === 'DELETE') {
            const targets = new Set(applyFilters(visible(), filters));
            tables[table] = tables[table].filter((r) => !targets.has(r));
            const prefer = headers.Prefer || '';
            // PostgREST returns the deleted rows when asked — customer-api's
            // checkout uses this as an atomic cart claim.
            if (prefer.includes('return=representation')) return json([...targets]);
            return new Response(null, { status: 204 });
        }

        throw new Error(`stub: unsupported method ${method}`);
    }

    return { tables, registerUser, failNext, fetch: fetchImpl };
}
