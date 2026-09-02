/* Checkout: review, fulfilment choice, address, place order.
 *
 * Validation happens here for feedback speed, but the server re-validates and
 * re-prices everything — this file's numbers are never authoritative.
 */
import * as Cart from './cart.js?v=kootzy1';

const el = {
    loading:  document.getElementById('coLoading'),
    empty:    document.getElementById('coEmpty'),
    form:     document.getElementById('coForm'),
    lines:    document.getElementById('coLines'),
    items:    document.getElementById('coItems'),
    subtotal: document.getElementById('coSubtotal'),
    shipping: document.getElementById('coShipping'),
    addrBlock: document.getElementById('coAddressBlock'),
    submit:   document.getElementById('coSubmit'),
    error:    document.getElementById('coError'),
};

const LABELS = {
    keychain: 'Classic Keychain', bubble_keychain: 'Bubble Keychain',
    nameplate: 'Nameplate', wordart: 'Word Art', loveseries: 'LOVE Series',
    tilekey: 'Letter Tiles', linked_initials: 'Linked Initials',
    nametag: 'Wavy Nametag', girly_keychain: 'Girly Keychain',
    bordered_keychain: 'Bordered Keychain', supported_text: 'Supported Nameplate',
    flower_keychain: 'Flower Initial', desk_organizer: 'Desk Organizer',
    led_word_stand: 'LED Word Stand', led_word_art: 'LED Word Art',
    name_beads: 'Custom Name Beads',
};

const rupees = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const digits = (s) => String(s || '').replace(/\D/g, '');

function shipSelected() {
    const picked = el.form.querySelector('input[name="fulfilment"]:checked');
    return picked && picked.value === 'ship';
}

/* Address fields are only required when shipping, so toggle both visibility and
   the required flags together — a hidden required input blocks submit invisibly. */
function syncFulfilment() {
    const ship = shipSelected();
    el.addrBlock.hidden = !ship;
    for (const id of ['coRecipient', 'coAddrPhone', 'coLine1', 'coCity', 'coPincode', 'coState']) {
        document.getElementById(id).required = ship;
    }
    el.shipping.textContent = ship ? 'Confirmed before dispatch' : 'Not needed — collection';
}

function showError(message) {
    el.error.textContent = message;
    el.error.hidden = false;
    el.error.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function validate() {
    const problems = [];
    if (!document.getElementById('coName').value.trim()) problems.push('your name');
    if (digits(document.getElementById('coPhone').value).length !== 10) problems.push('a 10-digit phone number');

    if (shipSelected()) {
        if (!document.getElementById('coRecipient').value.trim()) problems.push('the recipient name');
        if (digits(document.getElementById('coAddrPhone').value).length !== 10) problems.push('a phone for the delivery address');
        if (!document.getElementById('coLine1').value.trim()) problems.push('the street address');
        if (!document.getElementById('coCity').value.trim()) problems.push('the city');
        if (!document.getElementById('coState').value.trim()) problems.push('the state');
        // Six digits, never starting with zero — matches India Post and the DB check.
        if (!/^[1-9][0-9]{5}$/.test(digits(document.getElementById('coPincode').value))) {
            problems.push('a valid 6-digit PIN code');
        }
    }
    return problems;
}

async function render() {
    let items;
    try {
        items = await Cart.list();
    } catch (err) {
        el.loading.hidden = true;
        showError(err.message || 'Could not load your cart.');
        return;
    }
    el.loading.hidden = true;

    if (items.length === 0) {
        el.empty.hidden = false;
        el.form.hidden = true;
        return;
    }

    el.empty.hidden = true;
    el.form.hidden = false;

    el.lines.textContent = '';
    for (const item of items) {
        const li = document.createElement('li');
        li.className = 'co-line';

        const name = document.createElement('span');
        name.className = 'co-line-name';
        // Customer text as a text node — never innerHTML.
        name.textContent = `${LABELS[item.productType] || item.productType} · “${item.text}”`;

        const qty = document.createElement('span');
        qty.className = 'co-line-qty';
        qty.textContent = '×' + item.quantity;

        li.append(name, qty);
        el.lines.appendChild(li);
    }

    el.items.textContent = String(items.reduce((n, i) => n + i.quantity, 0));
    el.subtotal.textContent = rupees(items.reduce((n, i) => n + i.unitPrice * i.quantity, 0));
    syncFulfilment();
}

el.form.addEventListener('change', (e) => {
    if (e.target.name === 'fulfilment') syncFulfilment();
});

el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.error.hidden = true;

    const problems = validate();
    if (problems.length) {
        showError('We still need ' + problems.join(', ') + '.');
        return;
    }

    el.submit.disabled = true;
    const original = el.submit.textContent;
    el.submit.textContent = 'Placing your order…';

    const payload = {
        fulfilmentMethod: shipSelected() ? 'ship' : 'pickup',
        contactName: document.getElementById('coName').value.trim(),
        contactPhone: digits(document.getElementById('coPhone').value),
    };
    if (shipSelected()) {
        payload.address = {
            recipientName: document.getElementById('coRecipient').value.trim(),
            phone: digits(document.getElementById('coAddrPhone').value),
            line1: document.getElementById('coLine1').value.trim(),
            line2: document.getElementById('coLine2').value.trim(),
            city: document.getElementById('coCity').value.trim(),
            state: document.getElementById('coState').value.trim(),
            pincode: digits(document.getElementById('coPincode').value),
        };
    }

    try {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Carries the Supabase session so the Function can read the cart
                // user-scoped; without it the server cannot tell whose cart it is.
                ...Cart.authHeaders(),
            },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            // 401 means the session expired or was never established. Say so
            // plainly rather than showing a generic failure.
            throw new Error(res.status === 401
                ? 'Please sign in to place this order.'
                : (data && data.error) || `Could not place the order (${res.status})`);
        }
        window.location.href = 'order-success.html?order=' + encodeURIComponent(data.orderNum);
    } catch (err) {
        showError(err.message || 'Could not place the order. Please try again.');
        el.submit.disabled = false;
        el.submit.textContent = original;
    }
});

render();
