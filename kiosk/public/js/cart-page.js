/* Cart page: renders lines, handles quantity and removal.
 *
 * Every mutation goes through js/cart.js?v=k1, so the same code path serves the
 * localStorage cart (signed out) and the RLS-scoped API cart (signed in).
 */
import * as Cart from './cart.js?v=k1';
import { initAuth } from './auth.js?v=k1';
import { mountProfileChip } from './profile-chip.js?v=k1';

/* Header identity, same control as the rest of the site. initAuth() is
   memoised, so this costs nothing on top of the render path below. */
mountProfileChip('#headerProfile');

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

import { PRODUCT_LABELS as LABELS } from './product-labels.js?v=k2';

const rupees = (n) => '₹' + (Math.round(Number(n) || 0)).toLocaleString('en-IN');

function crewMeta(item) {
    const crew = item && item.design && item.design.crew;
    if (!crew || typeof crew !== 'object' || !String(crew.id || '').trim()) return null;
    return {
        id: String(crew.id),
        label: String(crew.label || 'Kootzy Crew'),
        memberIndex: Number(crew.memberIndex) || 0,
        memberCount: Number(crew.memberCount) || 0,
    };
}

function matchSetMeta(item) {
    const set = item && item.design && item.design.matchSet;
    if (!set || typeof set !== 'object' || !String(set.id || '').trim()) return null;
    return {
        id: String(set.id),
        label: String(set.label || 'Kootzy Match Set'),
        itemIndex: Number(set.itemIndex) || 0,
        itemCount: Number(set.itemCount) || 0,
    };
}

function lineNode(item) {
    const li = document.createElement('li');
    li.className = 'cart-line';
    li.dataset.id = item.id;

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
        if (!/^#[0-9a-fA-F]{6}$/.test(String(hex || ''))) continue;
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
    const crew = crewMeta(item);
    if (crew) {
        const crewLine = document.createElement('p');
        crewLine.className = 'cart-line-meta cart-crew-member-note';
        crewLine.textContent = `${crew.label} · Member ${crew.memberIndex} of ${crew.memberCount}`;
        info.appendChild(crewLine);
    }
    const matchSet = matchSetMeta(item);
    if (matchSet) {
        const setLine = document.createElement('p');
        setLine.className = 'cart-line-meta cart-crew-member-note';
        setLine.textContent = `${matchSet.label} · Product ${matchSet.itemIndex} of ${matchSet.itemCount}`;
        info.appendChild(setLine);
    }
    if (item.batchOffer && Number(item.batchOffer.savings) > 0) {
        const saving = document.createElement('p');
        saving.className = 'cart-line-meta batch-saving-note';
        saving.textContent = `${item.batchOffer.name}: saving ${rupees(item.batchOffer.savings)} each`;
        info.appendChild(saving);
    }
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

function crewHeadingNode(crew, members) {
    const li = document.createElement('li');
    li.className = 'cart-crew-heading';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = crew.label;
    const note = document.createElement('span');
    note.textContent = `${members.length} matching keychains · customized individually`;
    text.append(title, note);
    const total = document.createElement('strong');
    total.textContent = rupees(members.reduce(
        (sum, member) => sum + member.unitPrice * member.quantity,
        0
    ));
    li.append(text, total);
    return li;
}

function matchSetHeadingNode(set, items) {
    const li = document.createElement('li');
    li.className = 'cart-crew-heading';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = set.label;
    const note = document.createElement('span');
    note.textContent = `${items.length} coordinated products · one matching style`;
    text.append(title, note);
    const total = document.createElement('strong');
    total.textContent = rupees(items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
    ));
    li.append(text, total);
    return li;
}

function appendGroupedLines(fragment, items) {
    const renderedCrewIds = new Set();
    const renderedMatchSetIds = new Set();
    for (const item of items) {
        const crew = crewMeta(item);
        if (crew) {
            if (renderedCrewIds.has(crew.id)) continue;
            renderedCrewIds.add(crew.id);
            const members = items
                .filter((candidate) => crewMeta(candidate)?.id === crew.id)
                .sort((a, b) => crewMeta(a).memberIndex - crewMeta(b).memberIndex);
            fragment.appendChild(crewHeadingNode(crew, members));
            members.forEach((member) => fragment.appendChild(lineNode(member)));
            continue;
        }
        const matchSet = matchSetMeta(item);
        if (matchSet) {
            if (renderedMatchSetIds.has(matchSet.id)) continue;
            renderedMatchSetIds.add(matchSet.id);
            const setItems = items
                .filter((candidate) => matchSetMeta(candidate)?.id === matchSet.id)
                .sort((a, b) => matchSetMeta(a).itemIndex - matchSetMeta(b).itemIndex);
            fragment.appendChild(matchSetHeadingNode(matchSet, setItems));
            setItems.forEach((setItem) => fragment.appendChild(lineNode(setItem)));
            continue;
        }
        fragment.appendChild(lineNode(item));
    }
}

function showError(message) {
    el.error.textContent = message;
    el.error.hidden = false;
}

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
    // Must restore session before Cart.list(), otherwise signed-in users only
    // see leftover localStorage while checkout (which does initAuth) shows the
    // real server cart — the mismatch the customer reported.
    await initAuth();
    if (Cart.isSignedIn()) {
        try {
            const { failed } = await Cart.mergeLocalIntoServer();
            if (failed > 0) {
                // Never silent: the customer needs to know some designs are still
                // only in this browser and a retry (reload) will pick them up.
                showError(`${failed} design${failed === 1 ? '' : 's'} could not be moved to your `
                    + 'account yet — they are safe in this browser. Reload to retry.');
            }
        } catch (err) {
            console.error('cart merge on cart page:', err.message);
        }
    }

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
    appendGroupedLines(frag, items);
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

/* Re-render whenever the cart changes underneath us — most importantly when the
 * signed-in auto-merge finishes AFTER the first paint. Without this the page
 * showed the pre-merge (empty) server cart until a manual refresh. */
let renderQueued = false;
Cart.onChange(() => {
    if (busy || renderQueued) return;   // mutate() already re-renders its own change
    renderQueued = true;
    setTimeout(() => { renderQueued = false; render(); }, 150);
});

render();
