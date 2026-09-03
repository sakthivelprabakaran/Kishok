/* Checkout: review, fulfilment choice, address, place order.
 *
 * Validation happens here for feedback speed, but the server re-validates and
 * re-prices everything — this file's numbers are never authoritative.
 */
import * as Cart from './cart.js?v=k1';
import {
    initAuth,
    isSignedIn,
    signInWithGoogle,
    onAuthChange,
    friendlyAuthError,
    getSession,
} from './auth.js?v=k1';

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

import { PRODUCT_LABELS as LABELS } from './product-labels.js?v=k1';

const rupees = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const digits = (s) => String(s || '').replace(/\D/g, '');

function shipSelected() {
    const picked = el.form.querySelector('input[name="fulfilment"]:checked');
    return picked && picked.value === 'ship';
}

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

function clearError() {
    el.error.hidden = true;
    el.error.textContent = '';
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
        if (!/^[1-9][0-9]{5}$/.test(digits(document.getElementById('coPincode').value))) {
            problems.push('a valid 6-digit PIN code');
        }
    }
    return problems;
}

function hasSession() {
    return Boolean(isSignedIn() || Cart.isSignedIn() || getSession()?.access_token);
}

function authHeaders() {
    const token = getSession()?.access_token || null;
    if (token) return { Authorization: 'Bearer ' + token };
    return Cart.authHeaders();
}

function setSignedOutUi() {
    el.submit.disabled = false;
    el.submit.type = 'button';
    el.submit.textContent = 'Continue with Google';
    el.submit.dataset.mode = 'signin';
    showError('Sign in with Google to place this order. Your designs stay saved in this browser — nothing is charged here.');
}

function setSignedInUi() {
    el.submit.disabled = false;
    el.submit.type = 'submit';
    el.submit.textContent = 'Place order';
    el.submit.dataset.mode = 'place';
    clearError();
}

function syncAuthUi() {
    if (hasSession()) setSignedInUi();
    else setSignedOutUi();
}

async function startGoogleSignIn() {
    el.submit.disabled = true;
    el.submit.textContent = 'Opening Google…';
    try {
        await signInWithGoogle(
            `${window.location.origin}/auth/callback.html?next=${encodeURIComponent('/checkout.html')}`
        );
    } catch (err) {
        showError(friendlyAuthError(err));
        el.submit.disabled = false;
        el.submit.textContent = 'Continue with Google';
        el.submit.dataset.mode = 'signin';
    }
}

async function render() {
    await initAuth();

    // Keep cart page and checkout on the same source of truth when signed in.
    if (Cart.isSignedIn()) {
        try {
            await Cart.mergeLocalIntoServer();
        } catch (err) {
            console.error('cart merge on checkout:', err.message);
        }
    }

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

    syncAuthUi();

    el.lines.textContent = '';
    for (const item of items) {
        const li = document.createElement('li');
        li.className = 'co-line';

        const safePreview = Cart.cleanPreview(item.preview);
        if (safePreview) {
            const img = document.createElement('img');
            img.className = 'co-thumb';
            img.src = safePreview;
            img.alt = '';
            img.decoding = 'async';
            li.appendChild(img);
        }

        const name = document.createElement('span');
        name.className = 'co-line-name';
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

el.submit.addEventListener('click', async (e) => {
    if (el.submit.dataset.mode === 'signin') {
        e.preventDefault();
        await startGoogleSignIn();
    }
});

el.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    await initAuth();

    if (el.submit.dataset.mode === 'signin' || !hasSession()) {
        setSignedOutUi();
        await startGoogleSignIn();
        return;
    }

    clearError();

    const problems = validate();
    if (problems.length) {
        showError('We still need ' + problems.join(', ') + '.');
        return;
    }

    el.submit.disabled = true;
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
        const headers = {
            'Content-Type': 'application/json',
            ...authHeaders(),
        };
        if (!headers.Authorization) {
            setSignedOutUi();
            await startGoogleSignIn();
            return;
        }

        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            if (res.status === 401) {
                setSignedOutUi();
                showError('Please sign in with Google to place this order.');
                return;
            }
            throw new Error((data && data.error) || `Could not place the order (${res.status})`);
        }
        const q = new URLSearchParams({
            orderNum: data.orderNum,
            name: payload.contactName,
            amt: String(data.totals.total),
            qty: String(data.totals.itemCount),
            ship: payload.fulfilmentMethod === 'ship' ? '1' : '0',
        });
        window.location.href = 'order-success.html?' + q.toString();
    } catch (err) {
        showError(err.message || 'Could not place the order. Please try again.');
        el.submit.disabled = false;
        el.submit.textContent = hasSession() ? 'Place order' : 'Continue with Google';
        el.submit.dataset.mode = hasSession() ? 'place' : 'signin';
    }
});

onAuthChange(() => {
    if (el.form.hidden) return;
    syncAuthUi();
});

render();
