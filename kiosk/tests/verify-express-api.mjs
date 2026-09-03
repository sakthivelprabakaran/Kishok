/* Boots the REAL Express app (server.js + customer-api.js + operator-api.js)
 * against the in-memory PostgREST stub and drives it over HTTP.
 *
 * Two jobs:
 *  1. The operator routes were dropped once already and nobody noticed until
 *     the live admin panel came up empty — this locks them.
 *  2. customer-api.js is a hand-maintained twin of the Cloudflare Functions;
 *     asserting the same behaviours on both keeps the twins from drifting.
 *
 * Run: node tests/verify-express-api.mjs   (wired into npm test)
 */
import { createServer } from 'node:http';
import { makeStub, ENV } from './pgrest-stub.mjs';
import { createRequire } from 'node:module';

/* env BEFORE requiring server.js — it reads these at module load. */
process.env.SUPABASE_URL = ENV.SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
process.env.ADMIN_PIN = ENV.ADMIN_PIN;
process.env.VERCEL = '1';               // stop server.js from listening itself
process.env.GOOGLE_SCRIPT_URL = '';

const realFetch = globalThis.fetch;      // for talking to our own HTTP server
let stub = makeStub();
globalThis.fetch = (...args) => stub.fetch(...args);   // server's Supabase calls

const require = createRequire(import.meta.url);
const app = require('../server.js');
const httpServer = createServer(app);
await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${httpServer.address().port}`;

function reset() {
    stub = makeStub();
    stub.registerUser('aaa.bbb.ccc', { id: 'user-A', email: 'a@example.com' });
    stub.registerUser('ddd.eee.fff', { id: 'user-B', email: 'b@example.com' });
    stub.tables.batches.push(
        { id: 900, base_color: '#FF6251', font_color: '#FFFFFF', name: 'RED/WHITE', count: 5, updated_at: '2026-01-01' },
    );
}

async function call(method, path, { pin, token, body } = {}) {
    const res = await realFetch(BASE + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(pin ? { 'x-admin-pin': pin } : {}),
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* html */ }
    return { status: res.status, data };
}

const results = [];
function check(label, pass, detail = '') {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}

const PIN = ENV.ADMIN_PIN;

/* ═══ kiosk quick order ═══ */
console.log('\n-- quick order (walk-up pay flow) --');
reset();

let r = await call('POST', '/api/order', { body: { name: 'Walkup', phone: '9999999999', productType: 'keychain', text: 'Priya', weightG: 20, finalAmount: 1 } });
check('order accepted -> 201 with orderNum', r.status === 201 && Boolean(r.data.orderNum), JSON.stringify(r.data && r.data.orderNum));
check('client-claimed ₹1 overwritten with server price ₹107', r.data.order.finalAmount === 107, `₹${r.data.order.finalAmount}`);

r = await call('POST', '/api/order', { body: { name: 'W', phone: '123', productType: 'keychain', text: 'x' } });
check('bad phone -> 400', r.status === 400);

r = await call('POST', '/api/order', { body: { name: 'W', phone: '9999999999', productType: 'nonsense', text: 'x' } });
check('unknown product -> 400', r.status === 400);

/* ═══ operator: today / summary / patch ═══ */
console.log('\n-- operator dashboard --');

r = await call('GET', '/api/orders/today');
check('orders/today without PIN -> 401', r.status === 401);

r = await call('GET', '/api/orders/today', { pin: PIN });
check('orders/today lists the quick order in camelCase',
    r.status === 200 && r.data.length === 1 && r.data[0].name === 'Walkup'
    && r.data[0].finalAmount === 107 && typeof r.data[0].orderNum === 'string',
    JSON.stringify(r.data && r.data[0] && [r.data[0].orderNum, r.data[0].status]));

const orderNum = r.data[0].orderNum;

r = await call('GET', '/api/summary/today', { pin: PIN });
check('summary counts the unpaid order but no revenue',
    r.status === 200 && r.data.totalOrders === 1 && r.data.paidOrders === 0 && r.data.revenue === 0,
    JSON.stringify(r.data));

r = await call('PATCH', `/api/order/${orderNum}`, { pin: PIN, body: { status: 'Verified', upiTxnId: '123456789012' } });
check('operator marks Verified', r.status === 200 && r.data.order.status === 'Verified');

r = await call('GET', '/api/summary/today', { pin: PIN });
check('summary now shows paid revenue ₹107',
    r.data.paidOrders === 1 && r.data.revenue === 107, JSON.stringify(r.data));

r = await call('PATCH', `/api/order/${orderNum}`, { pin: PIN, body: { status: 'NotAThing' } });
check('invalid status -> 400 naming the allowed set', r.status === 400 && /Allowed/.test(r.data.error));

r = await call('PATCH', '/api/order/9999', { pin: PIN, body: { status: 'Printed' } });
check('unknown order -> 404', r.status === 404);

r = await call('PATCH', `/api/order/${orderNum}`, { body: { status: 'Printed' } });
check('patch without PIN -> 401', r.status === 401);

/* ═══ batches (persisted) ═══ */
console.log('\n-- batches --');

r = await call('GET', '/api/batches');
check('batches are public and read from the table',
    r.status === 200 && r.data.length === 1 && r.data[0].name === 'RED/WHITE');

r = await call('POST', '/api/batches', { pin: PIN, body: { baseColor: '#000000', fontColor: '#FFFFFF', count: 3 } });
check('admin adds a combo', r.status === 200 && r.data.activeBatches.length === 2);

r = await call('POST', '/api/batches', { pin: PIN, body: { baseColor: '#000000', fontColor: '#FFFFFF', count: 0 } });
check('count 0 removes the combo (the old parseInt||5 made 0 impossible)',
    r.status === 200 && r.data.activeBatches.length === 1, JSON.stringify(r.data.activeBatches));

r = await call('POST', '/api/batches', { body: { baseColor: '#111111', fontColor: '#FFFFFF', count: 2 } });
check('batch write without PIN -> 401', r.status === 401);

/* ═══ customer-api twin: same behaviours as the Cloudflare Functions ═══ */
console.log('\n-- customer cart/checkout (Vercel twin) --');
reset();

r = await call('GET', '/api/cart');
check('cart without token -> 401', r.status === 401);

const A = { token: 'aaa.bbb.ccc' };
r = await call('POST', '/api/cart', { ...A, body: { productType: 'keychain', text: 'Priya', quantity: 1, weightG: 20, unitPrice: 1, preview: 'data:image/jpeg;base64,PIC1' } });
check('add to cart -> ok', (r.status === 201 || r.status === 200) && r.data.item.text === 'Priya');
check('owner from token, not body', stub.tables.cart_items[0].user_id === 'user-A');

r = await call('POST', '/api/cart', { ...A, body: { productType: 'keychain', text: 'Priya', quantity: 2, weightG: 20 } });
check('identical design merges quantity instead of duplicating (their dedupe)',
    stub.tables.cart_items.length === 1 && Number(stub.tables.cart_items[0].quantity) === 3,
    `lines=${stub.tables.cart_items.length} qty=${stub.tables.cart_items[0].quantity}`);

r = await call('POST', '/api/cart', { ...A, body: { productType: 'keychain', text: 'Evil', quantity: 1, preview: 'data:image/svg+xml;base64,AAAA' } });
check('svg preview rejected server-side', r.data.item.preview === '');

r = await call('GET', '/api/cart', { token: 'ddd.eee.fff' });
check('user B sees an empty cart', r.data.items.length === 0);

r = await call('POST', '/api/checkout', { ...A, body: { contactName: 'Priya', contactPhone: '9999999999' } });
check('checkout -> 201 priced server-side',
    r.status === 201 && r.data.orderNum && r.data.totals.total > 200,   // 20g x3 = 107x3
    JSON.stringify(r.data && r.data.totals));
check('order carries user_id', stub.tables.orders.some((o) => o.user_id === 'user-A'));
check('order_items frozen with preview',
    stub.tables.order_items.length >= 1
    && stub.tables.order_items.some((l) => l.preview === 'data:image/jpeg;base64,PIC1'));
check('cart emptied after checkout',
    stub.tables.cart_items.filter((c) => c.user_id === 'user-A').length === 0);

/* ═══ my-orders on Express ═══ */
console.log('\n-- my-orders --');
r = await call('GET', '/api/my-orders', A);
check('customer sees their order', r.status === 200 && r.data.orders.length === 1);
r = await call('GET', '/api/my-orders', { token: 'ddd.eee.fff' });
check('user B sees none', r.data.orders.length === 0);

/* ═══ result ═══ */
httpServer.close();
const passed = results.filter(Boolean).length;
console.log('\n' + '='.repeat(40));
console.log(`RESULT: ${passed}/${results.length} express checks passed.`);
if (passed !== results.length) process.exit(1);
console.log('All checks passed.');
