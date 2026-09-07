/* Runs the Cloudflare Pages Functions in Node against the PostgREST stub.
 *
 * These are the two most security-sensitive files in the repo (cart and
 * checkout), and until this suite existed they had NEVER been executed —
 * /api/cart and /api/checkout are Cloudflare-only, so the local Express server
 * 404s them. Testing at the seams: real handler code, stubbed database.
 *
 * Run: node tests/verify-functions.mjs   (wired into npm test)
 */
import { makeStub, ENV } from './pgrest-stub.mjs';

const cart = await import('../functions/api/cart.js');
const checkout = await import('../functions/api/checkout.js');
const quickOrder = await import('../functions/api/order/index.js');
const myOrders = await import('../functions/api/my-orders.js');
const filamentColours = await import('../functions/api/filament-colours.js');
const adminFilaments = await import('../functions/api/admin/filaments.js');
const orderHistory = await import('../functions/api/orders/index.js');
const ordersToday = await import('../functions/api/orders/today.js');
const orderItem = await import('../functions/api/order-item/[id].js');

let stub;
function reset() {
    stub = makeStub();
    globalThis.fetch = stub.fetch;
    stub.registerUser('aaa.bbb.ccc', { id: 'user-A', email: 'a@example.com' });
    stub.registerUser('ddd.eee.fff', { id: 'user-B', email: 'b@example.com' });
}

const AUTH_A = { Authorization: 'Bearer aaa.bbb.ccc' };
const AUTH_B = { Authorization: 'Bearer ddd.eee.fff' };

function req(method, path, { headers = {}, body } = {}) {
    return new Request(`http://kiosk.local${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

async function call(handler, request, params) {
    const res = await handler({ request, env: ENV, params });
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    return { status: res.status, data };
}

const results = [];
function check(label, pass, detail = '') {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}

const VALID_ITEM = {
    productType: 'keychain', text: 'Priya', quantity: 1,
    design: { font: 'Brandy', colors: { base: '#ff9933' } },
    unitPrice: 107, weightG: 20,
};

/* ═══ cart.js ═══ */
console.log('\n-- cart --');
reset();

let r = await call(cart.onRequestGet, req('GET', '/api/cart'));
check('GET without token -> 401', r.status === 401);

r = await call(cart.onRequestGet, req('GET', '/api/cart', { headers: AUTH_A }));
check('GET signed in, empty cart', r.status === 200 && r.data.items.length === 0 && r.data.count === 0);

r = await call(cart.onRequestPost, req('POST', '/api/cart', { headers: AUTH_A, body: VALID_ITEM }));
check('POST valid item -> 201', r.status === 201 && r.data.item.text === 'Priya');
check('owner comes from the token, not the body',
    stub.tables.cart_items[0].user_id === 'user-A');

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, productType: 'exploit' } }));
check('unknown productType -> 400', r.status === 400);

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, text: '' } }));
check('empty text -> 400', r.status === 400);

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, text: 'x'.repeat(201) } }));
check('text over 200 chars -> 400', r.status === 400);

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, quantity: 21 } }));
check('quantity over 20 -> 400', r.status === 400);

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, text: 'Pic', preview: 'data:image/jpeg;base64,AAAA' } }));
check('valid preview stored', r.data.item.preview === 'data:image/jpeg;base64,AAAA');

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, text: 'Svg', preview: 'data:image/svg+xml;base64,AAAA' } }));
check('svg preview rejected server-side, add still succeeds',
    r.status === 201 && r.data.item.preview === '');

r = await call(cart.onRequestPost, req('POST', '/api/cart',
    { headers: AUTH_A, body: { ...VALID_ITEM, design: ['not', 'an', 'object'] } }));
check('array design coerced to {}', r.status === 201
    && !Array.isArray(r.data.item.design) && typeof r.data.item.design === 'object');

/* isolation between users */
r = await call(cart.onRequestGet, req('GET', '/api/cart', { headers: AUTH_B }));
check('user B sees none of user A\'s cart', r.data.items.length === 0);

const aItems = (await call(cart.onRequestGet, req('GET', '/api/cart', { headers: AUTH_A }))).data.items;
const someId = aItems[0].id;
r = await call(cart.onRequestPatch, req('PATCH', '/api/cart',
    { headers: AUTH_B, body: { id: someId, quantity: 5 } }));
check('user B cannot PATCH user A\'s line -> 404', r.status === 404);

r = await call(cart.onRequestPatch, req('PATCH', '/api/cart',
    { headers: AUTH_A, body: { id: someId, quantity: 5 } }));
check('owner PATCH quantity works', r.status === 200 && r.data.item.quantity === 5);

await call(cart.onRequestPost, req('POST', '/api/cart', { headers: AUTH_B, body: { ...VALID_ITEM, text: 'Bline' } }));
await call(cart.onRequestDelete, req('DELETE', '/api/cart?all=1', { headers: AUTH_A }));
check('DELETE all=1 empties only the caller\'s cart',
    stub.tables.cart_items.every((row) => row.user_id === 'user-B')
    && stub.tables.cart_items.length === 1);

/* cap */
reset();
for (let i = 0; i < 25; i++) {
    await call(cart.onRequestPost, req('POST', '/api/cart', { headers: AUTH_A, body: { ...VALID_ITEM, text: 'n' + i } }));
}
r = await call(cart.onRequestPost, req('POST', '/api/cart', { headers: AUTH_A, body: { ...VALID_ITEM, text: 'over' } }));
check('26th design -> 409 cart cap', r.status === 409);

/* ═══ checkout.js ═══ */
console.log('\n-- checkout --');
reset();

r = await call(checkout.onRequestPost, req('POST', '/api/checkout', { body: {} }));
check('checkout without token -> 401', r.status === 401);

r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: { Authorization: 'Bearer zzz.zzz.zzz' }, body: {} }));
check('checkout with unknown token -> 401 session expired', r.status === 401);

r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { contactName: 'Priya', contactPhone: '9999999999' } }));
check('empty cart -> 409', r.status === 409);

/* seed a cart: 20g x1 and 5g x2, with tampered display prices */
async function seedCart() {
    await call(cart.onRequestPost, req('POST', '/api/cart',
        { headers: AUTH_A, body: { ...VALID_ITEM, text: 'Priya', weightG: 20, unitPrice: 1, preview: 'data:image/jpeg;base64,PIC1' } }));
    await call(cart.onRequestPost, req('POST', '/api/cart',
        { headers: AUTH_A, body: { ...VALID_ITEM, text: 'Arun', weightG: 5, quantity: 2, unitPrice: 1 } }));
}
await seedCart();

r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { contactName: 'Priya', contactPhone: '99999' } }));
check('bad contact phone -> 400', r.status === 400);

r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { fulfilmentMethod: 'ship', contactName: 'Priya', contactPhone: '9999999999', address: { recipientName: 'P', phone: '9999999999', line1: 'x', city: 'Chennai', state: 'TN', pincode: '0123' } } }));
check('ship with invalid pincode -> 400 naming the problem',
    r.status === 400 && /PIN/i.test(r.data.error));

/* pickup happy path — hand-computed: 20g=107, 5g=36x2=72, total 179 */
r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { contactName: 'Priya', contactPhone: '9999999999' } }));
check('pickup checkout -> 201 with orderNum', r.status === 201 && Boolean(r.data.orderNum));
check('paid is explicitly false', r.data.paid === false);
check('server-priced totals ignore the tampered ₹1 cache',
    r.data.totals.total === 179 && r.data.totals.itemCount === 3,
    JSON.stringify(r.data.totals));

const order = stub.tables.orders[0];
check('order carries user_id for RLS ownership', order.user_id === 'user-A');
check('order status starts Pending (unpaid)', order.status === 'Pending');
check('first line fills the kiosk columns for the operator dashboard',
    order.product_type === 'keychain' && order.text_value === 'Priya');

const lines = stub.tables.order_items;
check('order_items freeze both lines', lines.length === 2
    && lines.every((l) => l.order_num === order.order_num));
check('preview follows the order line', lines.find((l) => l.text_value === 'Priya').preview === 'data:image/jpeg;base64,PIC1');
check('cart emptied after checkout', stub.tables.cart_items.length === 0);

/* ship happy path freezes the address */
await seedCart();
r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { fulfilmentMethod: 'ship', contactName: 'Priya', contactPhone: '9999999999', address: { recipientName: 'Priya P', phone: '8888888888', line1: '12 Main St', line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600091' } } }));
const shipped = stub.tables.orders.find((o) => o.fulfilment_method === 'ship');
check('ship checkout freezes the address onto the order',
    r.status === 201 && shipped && shipped.ship_line1 === '12 Main St' && shipped.ship_pincode === '600091');

/* order_items failure -> order cancelled, honest error */
await seedCart();
stub.failNext('order_items', 'insert');
r = await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { contactName: 'Priya', contactPhone: '9999999999' } }));
const cancelled = stub.tables.orders.filter((o) => o.status === 'Cancelled');
check('order_items failure -> 500 and the order is cancelled, not orphaned',
    r.status === 500 && /nothing was charged/i.test(r.data.error) && cancelled.length === 1);
check('cart is preserved when checkout fails', stub.tables.cart_items.length === 2);

/* ═══ quick order (kiosk path) ═══ */
reset();
stub.tables.batches.push({
    id: 900,
    base_color: '#FF6251',
    font_color: '#FFFFFF',
    name: 'RED/WHITE',
    count: 10,
    updated_at: '2026-01-01',
});
await call(cart.onRequestPost, req('POST', '/api/cart', {
    headers: AUTH_A,
    body: {
        ...VALID_ITEM,
        weightG: 20,
        design: {
            layers: '2L',
            colors: { base: '#FF6251', font: '#FFFFFF' },
        },
    },
}));
r = await call(cart.onRequestGet, req('GET', '/api/cart', { headers: AUTH_A }));
check('cart exposes only a server-verified Classic batch saving',
    r.status === 200
    && r.data.items[0].unitPrice === 103
    && r.data.items[0].batchOffer.savings === 4,
    JSON.stringify(r.data.items[0] && [r.data.items[0].unitPrice, r.data.items[0].batchOffer]));
r = await call(checkout.onRequestPost, req('POST', '/api/checkout', {
    headers: AUTH_A,
    body: { contactName: 'Priya', contactPhone: '9999999999' },
}));
check('checkout revalidates and applies the same batch saving',
    r.status === 201 && r.data.totals.total === 103 && r.data.totals.batchSavings === 4,
    JSON.stringify(r.data.totals));

console.log('\n-- quick order --');
reset();
r = await call(quickOrder.onRequestPost, req('POST', '/api/order',
    { body: { name: 'Walkup', phone: '9999999999', productType: 'keychain', text: 'Hi', weightG: 20, finalAmount: 1, batchSize: 100 } }));
check('kiosk order overwrites the client price', r.status === 201
    && Number(stub.tables.orders[0].final_amount) === 107,
    `stored ₹${stub.tables.orders[0].final_amount}`);

r = await call(quickOrder.onRequestPost, req('POST', '/api/order',
    { body: { name: 'Walkup', phone: '9999999999', productType: 'keychain', text: 'Hi', weightG: 0.1, finalAmount: 1 } }));
check('kiosk order clamps a weight lie to the billable floor',
    Number(stub.tables.orders[1].final_amount) === 22,
    `stored ₹${stub.tables.orders[1].final_amount}`);

/* ═══ my-orders ═══ */
stub.tables.batches.push({
    id: 901,
    base_color: '#FF6251',
    font_color: '#FFFFFF',
    name: 'RED/WHITE',
    count: 10,
    updated_at: '2026-01-01',
});
r = await call(quickOrder.onRequestPost, req('POST', '/api/order', {
    body: {
        name: 'Batch',
        phone: '9999999999',
        productType: 'keychain',
        text: 'Hi',
        layers: '2L',
        baseColor: '#FF6251',
        fontColor: '#FFFFFF',
        weightG: 20,
        batchSize: 1,
    },
}));
check('kiosk server derives an eligible batch instead of trusting batchSize',
    r.status === 201
    && Number(stub.tables.orders[2].final_amount) === 103
    && Number(stub.tables.orders[2].batch_size) === 10,
    JSON.stringify([stub.tables.orders[2].final_amount, stub.tables.orders[2].batch_size]));
r = await call(quickOrder.onRequestPost, req('POST', '/api/order', {
    body: {
        name: 'Word Art',
        phone: '9999999999',
        productType: 'wordart',
        text: 'Hi/LOVE',
        layers: '2L',
        baseColor: '#FF6251',
        fontColor: '#FFFFFF',
        weightG: 20,
        batchSize: 100,
    },
}));
check('Word Art cannot claim a Classic Keychain batch',
    r.status === 201 && Number(stub.tables.orders[3].final_amount) === 107,
    `stored ${stub.tables.orders[3].final_amount}`);

stub.tables.order_items.push(
    {
        id: 501, order_num: stub.tables.orders[0].order_num, product_type: 'keychain',
        text_value: 'First', quantity: 1, design: { colors: { base: '#FF9933', font: '#FFFFFF' } },
        unit_price: 107, line_total: 107, weight_g: 20, production_status: 'queued',
    },
    {
        id: 502, order_num: stub.tables.orders[0].order_num, product_type: 'wordart',
        text_value: 'Second/Line', quantity: 1, design: { colors: { base: '#000000', font: '#FFD700' } },
        unit_price: 150, line_total: 150, weight_g: 30, production_status: 'printing',
    },
);
stub.tables.orders.push({
    ...stub.tables.orders[0],
    id: 999,
    order_num: '0999',
    created_at: '2020-01-01T05:00:00.000Z',
    customer_name: 'Historical Customer',
});
r = await call(ordersToday.onRequestGet,
    req('GET', '/api/orders/today', { headers: { 'x-admin-pin': ENV.ADMIN_PIN } }));
const groupedOrder = r.data.find((order) => order.orderNum === stub.tables.orders[0].order_num);
check('today endpoint groups multiple products under one order',
    r.status === 200 && groupedOrder && groupedOrder.items.length === 2
    && groupedOrder.items.map((item) => item.text).join('|') === 'First|Second/Line');

r = await call(orderHistory.onRequestGet, req('GET', '/api/orders?range=all'));
check('order history requires PIN', r.status === 401);

r = await call(orderHistory.onRequestGet,
    req('GET', '/api/orders', { headers: { 'x-admin-pin': ENV.ADMIN_PIN } }));
check('order history defaults to 30 days and excludes old orders',
    r.status === 200 && r.data.range.range === '30d'
    && !r.data.orders.some((order) => order.orderNum === '0999'));

r = await call(orderHistory.onRequestGet,
    req('GET', '/api/orders?range=all', { headers: { 'x-admin-pin': ENV.ADMIN_PIN } }));
check('all-time order history includes earlier orders',
    r.status === 200 && r.data.orders.some((order) => order.orderNum === '0999'));

r = await call(orderHistory.onRequestGet,
    req('GET', '/api/orders?range=custom&from=2020-01-02&to=2020-01-01',
        { headers: { 'x-admin-pin': ENV.ADMIN_PIN } }));
check('invalid custom order range returns 400', r.status === 400);

r = await call(orderItem.onRequestPatch,
    req('PATCH', '/api/order-item/501', {
        headers: { 'x-admin-pin': ENV.ADMIN_PIN },
        body: { productionStatus: 'printed' },
    }), { id: '501' });
check('admin updates one product production status independently',
    r.status === 200 && stub.tables.order_items.find((item) => item.id === 501).production_status === 'printed');

r = await call(orderItem.onRequestPatch,
    req('PATCH', '/api/order-item/501', {
        body: { productionStatus: 'packed' },
    }), { id: '501' });
check('order item production update requires PIN', r.status === 401);

/* ═══ filament catalogue + inventory ═══ */
console.log('\n-- filament inventory --');
reset();
stub.tables.filament_colours.push(
    { id: 101, name: 'Orange', hex_color: '#FF9933', storefront_state: 'available', sort_order: 10 },
    { id: 102, name: 'Teal', hex_color: '#00B5C8', storefront_state: 'made_to_order', sort_order: 20 },
    { id: 103, name: 'Old Blue', hex_color: '#123456', storefront_state: 'unavailable', sort_order: 30 },
);
stub.tables.filament_spools.push(
    { id: 201, colour_id: 101, material: 'PLA', brand: 'A', lot_code: 'L1', initial_weight_g: 1000, remaining_weight_g: 650, cost: 900, status: 'open', notes: '' },
    { id: 202, colour_id: 101, material: 'PLA', brand: 'A', lot_code: 'L0', initial_weight_g: 1000, remaining_weight_g: 50, cost: 900, status: 'retired', notes: '' },
);

r = await call(filamentColours.onRequestGet, req('GET', '/api/filament-colours'));
check('public colours hide unavailable records',
    r.status === 200 && r.data.colors.length === 2
    && !r.data.colors.some((colour) => colour.state === 'unavailable'));
check('made-to-order colour carries the fixed promise',
    r.data.colors.find((colour) => colour.state === 'made_to_order').notice === 'Ships in 2–3 days');

r = await call(adminFilaments.onRequestGet, req('GET', '/api/admin/filaments'));
check('filament admin requires PIN', r.status === 401);

r = await call(adminFilaments.onRequestGet,
    req('GET', '/api/admin/filaments', { headers: { 'x-admin-pin': ENV.ADMIN_PIN } }));
check('admin sees unavailable colours and active stock total',
    r.status === 200 && r.data.colours.length === 3
    && r.data.colours.find((colour) => colour.id === 101).remainingWeightG === 650);

r = await call(adminFilaments.onRequestPost,
    req('POST', '/api/admin/filaments', {
        headers: { 'x-admin-pin': ENV.ADMIN_PIN },
        body: { resource: 'colour', name: 'Bad', hex: 'orange', state: 'available', sortOrder: 40 },
    }));
check('invalid filament HEX -> 400', r.status === 400);

r = await call(adminFilaments.onRequestPost,
    req('POST', '/api/admin/filaments', {
        headers: { 'x-admin-pin': ENV.ADMIN_PIN },
        body: { resource: 'colour', name: 'Pink', hex: '#ff61a6', state: 'available', sortOrder: 40 },
    }));
check('admin adds a normalized colour',
    r.status === 201 && stub.tables.filament_colours.some((colour) => colour.hex_color === '#FF61A6'));

r = await call(adminFilaments.onRequestPatch,
    req('PATCH', '/api/admin/filaments', {
        headers: { 'x-admin-pin': ENV.ADMIN_PIN },
        body: { resource: 'colour', id: 102, state: 'unavailable' },
    }));
check('admin can hide a colour without deleting it',
    r.status === 200 && stub.tables.filament_colours.find((colour) => colour.id === 102).storefront_state === 'unavailable');

r = await call(adminFilaments.onRequestPost,
    req('POST', '/api/admin/filaments', {
        headers: { 'x-admin-pin': ENV.ADMIN_PIN },
        body: {
            resource: 'spool', colourId: 103, material: 'PLA', brand: 'New',
            initialWeightG: 1000, remainingWeightG: 1000, status: 'sealed', cost: 850,
        },
    }));
const newSpool = stub.tables.filament_spools.find((spool) => spool.colour_id === 103);
check('admin adds a full spool lot', r.status === 201 && newSpool && newSpool.remaining_weight_g === 1000);

r = await call(adminFilaments.onRequestPatch,
    req('PATCH', '/api/admin/filaments', {
        headers: { 'x-admin-pin': ENV.ADMIN_PIN },
        body: { resource: 'spool', id: newSpool.id, remainingWeightG: 725, status: 'open' },
    }));
check('manual spool adjustment updates grams and status',
    r.status === 200 && newSpool.remaining_weight_g === 725 && newSpool.status === 'open');

console.log('\n-- my-orders --');
reset();

r = await call(myOrders.onRequestGet, req('GET', '/api/my-orders'));
check('my-orders without token -> 401', r.status === 401);

r = await call(myOrders.onRequestGet, req('GET', '/api/my-orders', { headers: AUTH_A }));
check('empty history -> []', r.status === 200 && r.data.orders.length === 0);

/* place one pickup and one shipped order for user A */
await seedCart();
await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { contactName: 'Priya', contactPhone: '9999999999' } }));
await seedCart();
await call(checkout.onRequestPost, req('POST', '/api/checkout',
    { headers: AUTH_A, body: { fulfilmentMethod: 'ship', contactName: 'Priya', contactPhone: '9999999999', address: { recipientName: 'Priya P', phone: '8888888888', line1: '12 Main St', line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600091' } } }));

r = await call(myOrders.onRequestGet, req('GET', '/api/my-orders', { headers: AUTH_A }));
check('list shows both orders, newest first', r.status === 200 && r.data.orders.length === 2
    && r.data.orders[0].fulfilmentMethod === 'ship');
check('list rows carry status/total/itemCount',
    r.data.orders.every((o) => o.status === 'Pending' && o.total === 179 && o.itemCount === 3),
    JSON.stringify(r.data.orders.map((o) => [o.orderNum, o.total])));
check('pickup order exposes no address', r.data.orders[1].address === undefined);
check('shipped order exposes its frozen address',
    r.data.orders[0].address && r.data.orders[0].address.pincode === '600091');

const pickupNum = r.data.orders[1].orderNum;
r = await call(myOrders.onRequestGet, req('GET', `/api/my-orders?order=${pickupNum}`, { headers: AUTH_A }));
check('detail returns the order and its frozen lines',
    r.status === 200 && r.data.order.orderNum === pickupNum && r.data.items.length === 2);
check('detail lines carry the captured preview',
    r.data.items.some((i) => i.preview === 'data:image/jpeg;base64,PIC1'));
check('detail lines carry the charged prices',
    r.data.items.find((i) => i.text === 'Priya').lineTotal === 107
    && r.data.items.find((i) => i.text === 'Arun').lineTotal === 72);

r = await call(myOrders.onRequestGet, req('GET', `/api/my-orders?order=${pickupNum}`, { headers: AUTH_B }));
check('user B cannot read user A\'s order detail -> 404', r.status === 404);

r = await call(myOrders.onRequestGet, req('GET', '/api/my-orders', { headers: AUTH_B }));
check('user B\'s list does not contain user A\'s orders', r.data.orders.length === 0);

r = await call(myOrders.onRequestGet, req('GET', '/api/my-orders?order=9999', { headers: AUTH_A }));
check('unknown order number -> 404', r.status === 404);

r = await call(myOrders.onRequestGet, req('GET', '/api/my-orders?order=abc;drop', { headers: AUTH_A }));
check('malformed order param -> 400', r.status === 400);

/* ═══ result ═══ */
const passed = results.filter(Boolean).length;
console.log('\n' + '='.repeat(40));
console.log(`RESULT: ${passed}/${results.length} function checks passed.`);
if (passed !== results.length) process.exit(1);
console.log('All checks passed.');
