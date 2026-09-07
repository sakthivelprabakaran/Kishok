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

let r = await call('POST', '/api/order', { body: { name: 'Walkup', phone: '9999999999', productType: 'keychain', text: 'Priya', weightG: 20, finalAmount: 1, batchSize: 100 } });
check('order accepted -> 201 with orderNum', r.status === 201 && Boolean(r.data.orderNum), JSON.stringify(r.data && r.data.orderNum));
check('client-claimed ₹1 overwritten with server price ₹107', r.data.order.finalAmount === 107, `₹${r.data.order.finalAmount}`);

r = await call('POST', '/api/order', { body: { name: 'W', phone: '123', productType: 'keychain', text: 'x' } });
check('bad phone -> 400', r.status === 400);

r = await call('POST', '/api/order', { body: { name: 'W', phone: '9999999999', productType: 'nonsense', text: 'x' } });
check('unknown product -> 400', r.status === 400);

/* ═══ operator: today / summary / patch ═══ */
console.log('\n-- operator dashboard --');

stub.tables.order_items.push(
    {
        id: 501, order_num: '0001', product_type: 'keychain', text_value: 'Priya',
        quantity: 1, design: { font: 'Brandy', colors: { base: '#FF9933', font: '#FFFFFF' } },
        preview: '', unit_price: 107, line_total: 107, weight_g: 20, production_status: 'queued',
    },
    {
        id: 502, order_num: '0001', product_type: 'wordart', text_value: 'Priya/LOVE',
        quantity: 1, design: { font: 'Brandy', colors: { base: '#000000', font: '#FFD700' } },
        preview: '', unit_price: 150, line_total: 150, weight_g: 30, production_status: 'printing',
    },
);
stub.tables.orders.push({
    ...stub.tables.orders[0],
    id: 999,
    order_num: '0999',
    created_at: '2020-01-01T05:00:00.000Z',
    customer_name: 'Historical Customer',
});

r = await call('GET', '/api/orders/today');
check('orders/today without PIN -> 401', r.status === 401);

r = await call('GET', '/api/orders/today', { pin: PIN });
check('orders/today lists the quick order in camelCase',
    r.status === 200 && r.data.length === 1 && r.data[0].name === 'Walkup'
    && r.data[0].finalAmount === 107 && typeof r.data[0].orderNum === 'string',
    JSON.stringify(r.data && r.data[0] && [r.data[0].orderNum, r.data[0].status]));
check('orders/today groups both frozen products under the checkout',
    r.data[0].items.length === 2 && r.data[0].items[1].productionStatus === 'printing');

const orderNum = r.data[0].orderNum;

r = await call('GET', '/api/orders?range=all');
check('order history without PIN -> 401', r.status === 401);

r = await call('GET', '/api/orders', { pin: PIN });
check('order history defaults to 30 days',
    r.status === 200 && r.data.range.range === '30d'
    && !r.data.orders.some((order) => order.orderNum === '0999'));

r = await call('GET', '/api/orders?range=all', { pin: PIN });
check('all-time order history includes earlier orders',
    r.status === 200 && r.data.orders.some((order) => order.orderNum === '0999'));

r = await call('GET', '/api/orders?range=custom&from=2020-01-02&to=2020-01-01', { pin: PIN });
check('invalid custom order range -> 400', r.status === 400);

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

r = await call('PATCH', '/api/order-item/501', {
    pin: PIN, body: { productionStatus: 'printed' },
});
check('operator updates a single product production status',
    r.status === 200 && stub.tables.order_items.find((item) => item.id === 501).production_status === 'printed');

r = await call('PATCH', '/api/order-item/502', {
    body: { productionStatus: 'packed' },
});
check('item production update without PIN -> 401', r.status === 401);

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

/* ═══ filament catalogue + inventory ═══ */
console.log('\n-- filament inventory --');
reset();
stub.tables.filament_colours.push(
    { id: 101, name: 'Orange', hex_color: '#FF9933', storefront_state: 'available', sort_order: 10 },
    { id: 102, name: 'Teal', hex_color: '#00B5C8', storefront_state: 'made_to_order', sort_order: 20 },
    { id: 103, name: 'Old Blue', hex_color: '#123456', storefront_state: 'unavailable', sort_order: 30 },
);
stub.tables.filament_spools.push(
    { id: 201, colour_id: 101, material: 'PLA', brand: 'A', lot_code: 'L1', initial_weight_g: 1000, remaining_weight_g: 600, cost: 900, status: 'open', notes: '' },
);

r = await call('GET', '/api/filament-colours');
check('public filament endpoint hides unavailable colours',
    r.status === 200 && r.data.colors.length === 2
    && r.data.colors.find((colour) => colour.state === 'made_to_order').notice === 'Ships in 2–3 days');

r = await call('GET', '/api/admin/filaments');
check('Express filament inventory requires PIN', r.status === 401);

r = await call('GET', '/api/admin/filaments', { pin: PIN });
check('Express admin loads all colours and spool totals',
    r.status === 200 && r.data.colours.length === 3
    && r.data.colours.find((colour) => colour.id === 101).remainingWeightG === 600);

r = await call('POST', '/api/admin/filaments', {
    pin: PIN,
    body: { resource: 'colour', name: 'Pink', hex: '#ff61a6', state: 'available', sortOrder: 40 },
});
check('Express admin adds a colour', r.status === 201
    && stub.tables.filament_colours.some((colour) => colour.hex_color === '#FF61A6'));

r = await call('PATCH', '/api/admin/filaments', {
    pin: PIN,
    body: { resource: 'colour', id: 102, state: 'unavailable' },
});
check('Express admin marks a colour unavailable', r.status === 200
    && stub.tables.filament_colours.find((colour) => colour.id === 102).storefront_state === 'unavailable');

r = await call('POST', '/api/admin/filaments', {
    pin: PIN,
    body: {
        resource: 'spool', colourId: 103, material: 'PLA', brand: 'New',
        initialWeightG: 1000, remainingWeightG: 1000, status: 'sealed', cost: 850,
    },
});
const expressSpool = stub.tables.filament_spools.find((spool) => spool.colour_id === 103);
check('Express admin adds a spool lot', r.status === 201 && expressSpool);

r = await call('PATCH', '/api/admin/filaments', {
    pin: PIN,
    body: { resource: 'spool', id: expressSpool.id, remainingWeightG: 700, status: 'open' },
});
check('Express admin manually adjusts spool stock',
    r.status === 200 && expressSpool.remaining_weight_g === 700 && expressSpool.status === 'open');

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
console.log('\n-- verified batch pricing --');
reset();
stub.tables.batches[0].count = 10;

r = await call('POST', '/api/order', {
    body: {
        name: 'Batch',
        phone: '9999999999',
        productType: 'keychain',
        text: 'Priya',
        layers: '2L',
        baseColor: '#FF6251',
        fontColor: '#FFFFFF',
        weightG: 20,
        batchSize: 1,
    },
});
check('Express quick order derives the live Classic batch',
    r.status === 201 && r.data.order.finalAmount === 103 && r.data.order.batchSize === 10,
    JSON.stringify(r.data.order && [r.data.order.finalAmount, r.data.order.batchSize]));

r = await call('POST', '/api/order', {
    body: {
        name: 'Word Art',
        phone: '9999999999',
        productType: 'wordart',
        text: 'Priya/LOVE',
        layers: '2L',
        baseColor: '#FF6251',
        fontColor: '#FFFFFF',
        weightG: 20,
        batchSize: 100,
    },
});
check('Express quick order rejects a Word Art batch claim',
    r.status === 201 && r.data.order.finalAmount === 107,
    JSON.stringify(r.data.order && r.data.order.finalAmount));

const batchDesign = {
    layers: '2L',
    colors: { base: '#FF6251', font: '#FFFFFF' },
};
await call('POST', '/api/cart', {
    token: 'aaa.bbb.ccc',
    body: {
        productType: 'keychain',
        text: 'Batch cart',
        quantity: 1,
        design: batchDesign,
        weightG: 20,
        unitPrice: 1,
    },
});
r = await call('GET', '/api/cart', { token: 'aaa.bbb.ccc' });
check('Express cart exposes the verified saving and server price',
    r.status === 200
    && r.data.items[0].unitPrice === 103
    && r.data.items[0].batchOffer.savings === 4,
    JSON.stringify(r.data.items[0] && [r.data.items[0].unitPrice, r.data.items[0].batchOffer]));
r = await call('POST', '/api/checkout', {
    token: 'aaa.bbb.ccc',
    body: { contactName: 'Priya', contactPhone: '9999999999' },
});
check('Express checkout revalidates the same saving',
    r.status === 201 && r.data.totals.total === 103 && r.data.totals.batchSavings === 4,
    JSON.stringify(r.data && r.data.totals));

httpServer.close();
const passed = results.filter(Boolean).length;
console.log('\n' + '='.repeat(40));
console.log(`RESULT: ${passed}/${results.length} express checks passed.`);
if (passed !== results.length) process.exit(1);
console.log('All checks passed.');
