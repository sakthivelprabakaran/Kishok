/* My orders: list + detail (?order=NNNN in the URL).
 *
 * Signed-out visitors get a sign-in prompt rather than an error — the API would
 * 401 anyway, but saying why beats a failed fetch. All customer-controlled text
 * lands via textContent, and previews pass through Cart.cleanPreview before
 * touching img.src, same as the cart page.
 */
import { bootAuthUi } from './auth-ui.js?v=auth1';
import * as Cart from './cart.js?v=kootzy1';
import { PRODUCT_LABELS } from './product-labels.js?v=kootzy1';
import { metaFor, flowFor } from './order-status.js?v=kootzy1';

const $ = (id) => document.getElementById(id);
const rupees = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function showError(message) {
    $('ordersError').textContent = message;
    $('ordersError').hidden = false;
}

async function fetchJson(path) {
    const res = await fetch(path, { headers: { ...Cart.authHeaders() } });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const err = new Error((data && data.error) || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}

/* A status chip is colour + glyph + text, never colour alone. */
function chipNode(status) {
    const meta = metaFor(status);
    const chip = document.createElement('span');
    chip.className = 'status-chip';

    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.style.background = meta.color;
    dot.textContent = { ok: '✓', active: '●', attention: '!', terminal: '✕' }[meta.tone] || '●';

    const label = document.createElement('span');
    label.textContent = meta.label;

    chip.append(dot, label);
    return chip;
}

function fmtDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return ''; }
}

/* ── list ── */
async function renderList() {
    // No session -> no API call. The server would 401 anyway; saying why up
    // front beats a failed fetch (and locally the API does not even exist).
    if (!Cart.isSignedIn()) {
        $('ordersLoading').hidden = true;
        $('ordersSignedOut').hidden = false;
        return;
    }
    let data;
    try {
        data = await fetchJson('/api/my-orders');
    } catch (err) {
        $('ordersLoading').hidden = true;
        if (err.status === 401) { $('ordersSignedOut').hidden = false; return; }
        showError(err.message);
        return;
    }
    $('ordersLoading').hidden = true;

    if (data.orders.length === 0) { $('ordersEmpty').hidden = false; return; }

    const list = $('ordersList');
    list.hidden = false;
    for (const order of data.orders) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'order-card';
        a.href = 'my-orders.html?order=' + encodeURIComponent(order.orderNum);

        const head = document.createElement('div');
        head.className = 'order-card-head';
        const num = document.createElement('span');
        num.className = 'order-card-num';
        num.textContent = '#' + order.orderNum;
        const date = document.createElement('span');
        date.className = 'order-card-date';
        date.textContent = fmtDate(order.placedAt);
        head.append(num, date);

        const foot = document.createElement('div');
        foot.className = 'order-card-foot';
        const meta = document.createElement('span');
        meta.className = 'order-card-meta';
        meta.textContent = `${order.itemCount} item${order.itemCount === 1 ? '' : 's'} · ${rupees(order.total)}`
            + (order.fulfilmentMethod === 'ship' ? ' · Delivery' : ' · Kiosk pickup');
        foot.append(meta, chipNode(order.status));

        a.append(head, foot);
        li.appendChild(a);
        list.appendChild(li);
    }
}

/* ── detail ── */
function renderTimeline(order) {
    const flow = flowFor(order);
    const idx = flow.indexOf(order.status);
    const tl = $('odTimeline');

    // Off-flow statuses (Cancelled, QCHold, returns…) are not a step on the
    // happy path — the chip above carries the message, the timeline greys out.
    tl.classList.toggle('od-timeline-muted', idx === -1);

    flow.forEach((step, i) => {
        const meta = metaFor(step);
        const li = document.createElement('li');
        li.className = idx === -1 ? '' : (i < idx ? 'done' : i === idx ? 'current' : '');
        const dot = document.createElement('span');
        dot.className = 'od-step-dot';
        if (i <= idx && idx !== -1) dot.style.background = meta.color;
        dot.textContent = i < idx && idx !== -1 ? '✓' : '';
        const label = document.createElement('span');
        label.textContent = meta.label;
        li.append(dot, label);
        tl.appendChild(li);
    });
}

async function renderDetail(orderNum) {
    $('listView').hidden = true;
    $('detailView').hidden = false;

    if (!Cart.isSignedIn()) {
        $('detailView').hidden = true;
        $('listView').hidden = false;
        $('ordersLoading').hidden = true;
        $('ordersSignedOut').hidden = false;
        return;
    }

    let data;
    try {
        data = await fetchJson('/api/my-orders?order=' + encodeURIComponent(orderNum));
    } catch (err) {
        if (err.status === 401) {
            $('detailView').hidden = true;
            $('listView').hidden = false;
            $('ordersLoading').hidden = true;
            $('ordersSignedOut').hidden = false;
            return;
        }
        showError(err.status === 404 ? 'We could not find that order on your account.' : err.message);
        return;
    }

    const { order, items } = data;
    $('odNum').textContent = '#' + order.orderNum;
    $('odChip').appendChild(chipNode(order.status));
    $('odNote').textContent = metaFor(order.status).customerNote;
    renderTimeline(order);

    for (const item of items) {
        const li = document.createElement('li');
        li.className = 'cart-line';

        const safePreview = Cart.cleanPreview(item.preview);
        if (safePreview) {
            const img = document.createElement('img');
            img.className = 'cart-thumb';
            img.src = safePreview;
            img.alt = '';
            img.decoding = 'async';
            img.loading = 'lazy';
            li.appendChild(img);
        } else {
            // No capture (older order, or capture failed at add time): show the
            // brand mark as a placeholder rather than an empty hole in the card.
            const ph = document.createElement('div');
            ph.className = 'cart-thumb cart-thumb-placeholder';
            const mark = document.createElement('img');
            mark.src = 'brand/icon-mark.svg';
            mark.alt = '';
            mark.width = 40;
            mark.height = 40;
            ph.appendChild(mark);
            li.appendChild(ph);
        }

        const info = document.createElement('div');
        info.className = 'cart-info';
        const name = document.createElement('p');
        name.className = 'cart-line-name';
        name.textContent = PRODUCT_LABELS[item.productType] || item.productType;
        const text = document.createElement('p');
        text.className = 'cart-line-text';
        text.textContent = '“' + item.text + '”';
        const meta = document.createElement('p');
        meta.className = 'cart-line-meta';
        meta.textContent = `×${item.quantity} · ${rupees(item.lineTotal)}`;
        info.append(name, text, meta);
        li.appendChild(info);
        $('odItems').appendChild(li);
    }

    $('odItemCount').textContent = String(order.itemCount);
    $('odTotal').textContent = rupees(order.total);
    if (order.shippingFee > 0) {
        $('odShipFeeLabel').hidden = false;
        $('odShipFee').hidden = false;
        $('odShipFee').textContent = rupees(order.shippingFee);
    }

    if (order.address) {
        $('odAddress').hidden = false;
        const a = order.address;
        $('odAddressText').textContent =
            `${a.recipientName}, ${a.line1}${a.line2 ? ', ' + a.line2 : ''}, ${a.city}, ${a.state} ${a.pincode}`;
        if (order.trackingNumber) {
            $('odTracking').hidden = false;
            $('odTracking').textContent = `${order.courier || 'Courier'}: ${order.trackingNumber}`;
        }
    }
}

/* Auth first so Cart.isSignedIn() / authHeaders() see the session. */
await bootAuthUi();

const orderParam = new URLSearchParams(window.location.search).get('order');
if (orderParam && /^\d{1,10}$/.test(orderParam)) {
    renderDetail(orderParam);
} else {
    renderList();
}
