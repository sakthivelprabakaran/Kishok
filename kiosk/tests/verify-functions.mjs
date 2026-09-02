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

async function call(handler, request) {
    const res = await handler({ request, env: ENV });
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
console.log('\n-- quick order --');
reset();
r = await call(quickOrder.onRequestPost, req('POST', '/api/order',
    { body: { name: 'Walkup', phone: '9999999999', productType: 'keychain', text: 'Hi', weightG: 20, finalAmount: 1 } }));
check('kiosk order overwrites the client price', r.status === 201
    && Number(stub.tables.orders[0].final_amount) === 107,
    `stored ₹${stub.tables.orders[0].final_amount}`);

r = await call(quickOrder.onRequestPost, req('POST', '/api/order',
    { body: { name: 'Walkup', phone: '9999999999', productType: 'keychain', text: 'Hi', weightG: 0.1, finalAmount: 1 } }));
check('kiosk order clamps a weight lie to the billable floor',
    Number(stub.tables.orders[1].final_amount) === 22,
    `stored ₹${stub.tables.orders[1].final_amount}`);

/* ═══ my-orders ═══ */
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
