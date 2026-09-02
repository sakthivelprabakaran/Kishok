/* Cart page: renders lines, handles quantity and removal.
 *
 * Every mutation goes through js/cart.js, so the same code path serves the
 * localStorage cart (signed out) and the RLS-scoped API cart (signed in).
 */
import * as Cart from './cart.js?v=kootzy1';

const el = {
    loading:  document.getElementById('cartLoading'),
    empty:    document.getElementById('cartEmpty'),
    filled:   document.getElementById('cartFilled'),
    lines:    document.getElementById('cartLines'),
    items:    document.getElementById('sumItems'),
    subtotal: document.getElementById('sumSubtotal'),
    error:    document.getElementById('cartError'),
    clear:    document.getElementById('btnClearCart'),
};

/* Product labels are shared with checkout via product-labels.js so the two
   pages cannot drift apart. */
import { PRODUCT_LABELS as LABELS } from './product-labels.js?v=kootzy1';

const rupees = (n) => '₹' + (Math.round(Number(n) || 0)).toLocaleString('en-IN');

/* Customer text goes into the DOM as a text node, never as HTML. It is the one
   field on this page an attacker fully controls. */
function lineNode(item) {
    const li = document.createElement('li');
    li.className = 'cart-line';
    li.dataset.id = item.id;

    // The exact preview captured when they hit Add to cart. Validated through
    // the same checker that gates storage — a data URL reaching src unchecked
    // would be an XSS vector. Falls back to colour swatches when absent.
    const safePreview = Cart.cleanPreview(item.preview);
    let thumb = null;
    if (safePreview) {
        thumb = document.createElement('img');
        thumb.className = 'cart-thumb';
        thumb.src = safePreview;
        thumb.alt = '';
        thumb.decoding = 'async';
        thumb.loading = 'lazy';
    } else {
        // Capture missing (failed at add time, or an older line): brand mark on
        // the mint well rather than an empty hole.
        thumb = document.createElement('div');
        thumb.className = 'cart-thumb cart-thumb-placeholder';
        const mark = document.createElement('img');
        mark.src = 'brand/icon-mark.svg';
        mark.alt = '';
        mark.width = 40;
        mark.height = 40;
        thumb.appendChild(mark);
    }

    const swatches = document.createElement('div');
    swatches.className = 'cart-swatches';
    const colors = (item.design && item.design.colors) || {};
    for (const key of ['base', 'font', 'outline', 'line2']) {
        const hex = colors[key];
        if (!/^#[0-9a-fA-F]{6}$/.test(String(hex || ''))) continue;   // validate before styling
        const dot = document.createElement('span');
        dot.className = 'cart-swatch';
        dot.style.background = hex;
        dot.title = key;
        swatches.appendChild(dot);
    }

    const info = document.createElement('div');
    info.className = 'cart-info';

    const name = document.createElement('p');
    name.className = 'cart-line-name';
    name.textContent = LABELS[item.productType] || item.productType;

    const text = document.createElement('p');
    text.className = 'cart-line-text';
    text.textContent = '“' + item.text + '”';

    const font = document.createElement('p');
    font.className = 'cart-line-meta';
    const fontName = (item.design && item.design.font) || '';
    font.textContent = fontName ? 'Font: ' + fontName : '';

    info.append(name, text);
    if (fontName) info.appendChild(font);
    info.appendChild(swatches);

    const controls = document.createElement('div');
    controls.className = 'cart-controls';

    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-qty';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'cart-qty-btn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Reduce quantity');
    minus.disabled = item.quantity <= 1;
    const qty = document.createElement('span');
    qty.className = 'cart-qty-val';
    qty.textContent = String(item.quantity);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'cart-qty-btn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Increase quantity');
    plus.disabled = item.quantity >= Cart.LIMITS.MAX_QTY;
    qtyWrap.append(minus, qty, plus);

    const price = document.createElement('p');
    price.className = 'cart-line-price';
    price.textContent = rupees(item.unitPrice * item.quantity);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'cart-remove';
    del.textContent = 'Remove';

    controls.append(qtyWrap, price, del);
    if (thumb) li.appendChild(thumb);
    li.append(info, controls);

    minus.addEventListener('click', () => mutate(() => Cart.setQuantity(item.id, item.quantity - 1)));
    plus.addEventListener('click', () => mutate(() => Cart.setQuantity(item.id, item.quantity + 1)));
    del.addEventListener('click', () => mutate(() => Cart.remove(item.id)));

    return li;
}

function showError(message) {
    el.error.textContent = message;
    el.error.hidden = false;
}

/* Disable the page while a mutation is in flight so a double tap cannot fire two
   quantity changes against the same line. */
let busy = false;
async function mutate(fn) {
    if (busy) return;
    busy = true;
    document.body.classList.add('cart-busy');
    el.error.hidden = true;
    try {
        await fn();
        await render();
    } catch (err) {
        showError(err.message || 'Something went wrong. Please try again.');
    } finally {
        busy = false;
        document.body.classList.remove('cart-busy');
    }
}

async function render() {
    let items;
    try {
        items = await Cart.list();
    } catch (err) {
        el.loading.hidden = true;
        showError(err.status === 401
            ? 'Please sign in again to see your cart.'
            : (err.message || 'Could not load your cart.'));
        return;
    }

    el.loading.hidden = true;

    if (items.length === 0) {
        el.empty.hidden = false;
        el.filled.hidden = true;
        return;
    }

    el.empty.hidden = true;
    el.filled.hidden = false;

    el.lines.textContent = '';
    const frag = document.createDocumentFragment();
    for (const item of items) frag.appendChild(lineNode(item));
    el.lines.appendChild(frag);

    const totalItems = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
    el.items.textContent = String(totalItems);
    el.subtotal.textContent = rupees(subtotal);
}

el.clear.addEventListener('click', () => {
    if (!window.confirm('Remove every design from your cart?')) return;
    mutate(() => Cart.clear());
});

render();
