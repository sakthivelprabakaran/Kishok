/* =========================================================
   YOURSGIFTS KIOSK — ADMIN DASHBOARD
   - PIN auth gate (sends x-admin-pin on mutating calls)
   - Production Queue grouped by colour combo
   - Diff-and-patch order feed (no flicker / scroll loss)
   - Reliable new-order chime keyed by order id
   - Search/filter + Picked-up status + day summary
   ========================================================= */

const state = {
    orders: [],
    batches: [],
    knownIds: new Set(),   // for reliable new-order detection
    filter: '',            // search text
    statusFilter: 'all',   // all | Pending | Verified | Printed | PickedUp
    pin: sessionStorage.getItem('ygAdminPin') || ''
};

const el = {};
function cacheEls() {
    [
        'statOrders','statRevenue','statPending','orderList','batchesList','btnRefresh',
        'batchBaseColor','batchFontColor','batchSizeCount','btnAddBatch','orderChime',
        'queueList','searchInput','statusFilter','btnSummary','summaryBox',
        'loginGate','pinInput','btnLogin','loginError','adminMain'
    ].forEach(id => { el[id] = document.getElementById(id); });
}

/* ---------- auth helpers ---------- */
function authHeaders(json) {
    const h = { 'x-admin-pin': state.pin };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

async function tryLogin(pin) {
    const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
    });
    return res.ok;
}

function showApp() {
    if (el.loginGate) el.loginGate.style.display = 'none';
    if (el.adminMain) el.adminMain.style.display = '';
    startDashboard();
}

/* ---------- data ---------- */
async function loadOrders(silent = false) {
    try {
        const res = await fetch('/api/orders/today');
        const data = await res.json();

        // reliable new-order detection by id (not array length)
        const incomingIds = new Set(data.map(o => o.orderNum));
        let hasNew = false;
        if (!silent) {
            for (const o of data) if (!state.knownIds.has(o.orderNum)) { hasNew = true; break; }
        }
        state.knownIds = incomingIds;
        state.orders = data;

        updateStats();
        renderQueue();
        renderOrders();          // diff-and-patch, keeps scroll
        if (hasNew) playNewOrderChime();
    } catch (err) {
        console.error('Failed to load orders:', err);
        if (el.orderList && !el.orderList.children.length)
            el.orderList.innerHTML = '<div class="empty-state">Error fetching orders.</div>';
    }
}

async function loadBatches() {
    try {
        const res = await fetch('/api/batches');
        state.batches = await res.json();
        renderBatches();
    } catch (err) { console.error('Failed to load batches:', err); }
}

async function updateOrderStatus(orderNum, newStatus) {
    try {
        const res = await fetch(`/api/order/${orderNum}`, {
            method: 'PATCH', headers: authHeaders(true),
            body: JSON.stringify({ status: newStatus })
        });
        if (res.status === 401) { alert('Session expired — re-enter PIN.'); return location.reload(); }
        const data = await res.json();
        if (data.success) await loadOrders(true);
        else alert('Failed: ' + (data.error || 'Unknown error'));
    } catch (err) { console.error('Status update failed:', err); }
}

async function saveBatch(baseColor, fontColor, count) {
    try {
        const res = await fetch('/api/batches', {
            method: 'POST', headers: authHeaders(true),
            body: JSON.stringify({ baseColor, fontColor, count })
        });
        if (res.status === 401) { alert('Session expired — re-enter PIN.'); return location.reload(); }
        const data = await res.json();
        if (data.success) await loadBatches();
    } catch (err) { console.error('Failed to save batch:', err); }
}

/* ---------- product label ---------- */
const P_LABELS = {
    bordered_keychain: 'Bordered', flower_keychain: 'Flower Initial', nametag: 'Wavy Nametag',
    girly_keychain: 'Girly Keychain', tilekey: 'Letter Tiles', linked_initials: 'Linked Initials',
    supported_text: 'Supported Nameplate', wordart: 'Word Art', loveseries: 'LOVE Stand',
    keychain: 'Keychain', nameplate: 'Nameplate'
};
const plabel = t => P_LABELS[t] || t;

/* ---------- stats ---------- */
function updateStats() {
    el.statOrders.textContent = state.orders.length;
    const rev = state.orders
        .filter(o => o.status === 'Verified' || o.status === 'Printed' || o.status === 'PickedUp')
        .reduce((s, o) => s + (o.finalAmount || 0), 0);
    el.statRevenue.textContent = `₹${rev}`;
    el.statPending.textContent = state.orders.filter(o => o.status === 'Verified').length;
}

/* ---------- PRODUCTION QUEUE by colour combo ---------- */
function renderQueue() {
    if (!el.queueList) return;
    // only orders that still need printing (paid + not yet printed)
    const toPrint = state.orders.filter(o => o.status === 'Verified');
    if (!toPrint.length) {
        el.queueList.innerHTML = '<div class="empty-state" style="padding:1rem;font-size:.78rem;">Nothing waiting to print. 🎉</div>';
        return;
    }
    const map = {};
    toPrint.forEach(o => {
        const key = `${o.baseColor}|${o.fontColor}`;
        if (!map[key]) map[key] = { baseColor: o.baseColor, fontColor: o.fontColor, items: [], grams: 0 };
        map[key].items.push(o);
        map[key].grams += (o.weightG || 0);
    });
    const combos = Object.values(map).sort((a, b) => b.items.length - a.items.length);
    const activeKey = new Set(state.batches.map(b => `${b.baseColor}|${b.fontColor}`));

    el.queueList.innerHTML = combos.map(c => {
        const isActive = activeKey.has(`${c.baseColor}|${c.fontColor}`);
        const names = c.items.map(i => `${i.orderNum} (${i.name})`).join(', ');
        return `
        <div class="queue-combo ${isActive ? 'active-batch' : ''}">
            <div class="queue-combo-head">
                <span class="combo-swatches">
                    <span class="mini-swatch" style="background:${c.baseColor}" title="Base"></span>
                    <span class="mini-swatch" style="background:${c.fontColor}" title="Font"></span>
                </span>
                <span class="combo-count">${c.items.length} to print</span>
                <span class="combo-grams">${Math.round(c.grams * 10) / 10}g</span>
                ${isActive ? '<span class="combo-active-tag">● BATCH ON</span>' : ''}
            </div>
            <div class="queue-combo-orders">${names}</div>
        </div>`;
    }).join('');
}

/* ---------- ORDER FEED (diff-and-patch) ---------- */
function visibleOrders() {
    let list = [...state.orders].reverse(); // newest first
    if (state.statusFilter !== 'all') list = list.filter(o => o.status === state.statusFilter);
    const q = state.filter.trim().toLowerCase();
    if (q) list = list.filter(o =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q) ||
        (o.orderNum || '').toLowerCase().includes(q) ||
        (o.text || '').toLowerCase().includes(q));
    return list;
}

function orderCardHTML(order) {
    const statusClass = (order.status || '').toLowerCase();
    const upiVerified = order.status !== 'Pending' ? 'verified-txn' : '';
    let actions = '';
    if (order.status === 'Pending')
        actions = `<button class="action-btn verify" data-id="${order.orderNum}">Verify Payment</button>`;
    else if (order.status === 'Verified')
        actions = `<button class="action-btn print" data-id="${order.orderNum}">Mark as Printed</button>`;
    else if (order.status === 'Printed')
        actions = `<button class="action-btn pickup" data-id="${order.orderNum}">Mark Picked Up</button>
                   <a class="action-btn wa" target="_blank" rel="noopener"
                      href="https://wa.me/91${(order.phone||'').replace(/\D/g,'').slice(-10)}?text=${encodeURIComponent('Hi ' + order.name + ', your YoursGifts order ' + order.orderNum + ' is printed and ready for pickup! 🎁')}">WhatsApp Ready</a>`;
    else if (order.status === 'PickedUp')
        actions = `<div class="done-tag">✓ Picked Up</div>`;

    return `
        <div class="card-header-row">
            <span class="order-badge-id">${order.orderNum}</span>
            <span class="order-time">${order.timestamp}</span>
            <span class="order-status-tag ${statusClass}">${order.status}</span>
        </div>
        <div class="cust-details-row">
            <span>👤 <strong>Name:</strong> ${order.name}</span>
            <span>📞 <strong>Phone:</strong> <a href="tel:${order.phone}" style="color:var(--primary-ink);">${order.phone}</a></span>
        </div>
        <div class="spec-details-row">
            <div>🎨 <strong>Specs:</strong> ${plabel(order.productType)} · "${order.text}" (Font: ${order.font})</div>
            <div style="margin-top:.25rem;">
                🌈 <strong>Colors:</strong>
                <div class="color-indicator-swatches">
                    <span class="mini-swatch" style="background-color:${order.baseColor};" title="Base"></span>
                    <span class="mini-swatch" style="background-color:${order.fontColor};" title="Font"></span>
                </div>
                <span>(Base/Text)</span>
                &nbsp;&nbsp;⚖️ <strong>Weight:</strong> ${order.weightG}g · 🖨️ <strong>Print:</strong> ${order.printTimeMins}m
            </div>
            <div style="margin-top:.25rem;">
                💰 <strong>Price:</strong> Raw ₹${order.productionCost} | <strong>Paid: ₹${order.finalAmount}</strong>
            </div>
        </div>
        <div class="txn-id-row ${upiVerified}">
            🔑 <strong>UPI Ref:</strong> <code>${order.upiTxnId || 'N/A'}</code>
        </div>
        <div class="card-actions-row">${actions}</div>`;
}

function wireCardActions(card, order) {
    const v = card.querySelector('.action-btn.verify');
    if (v) v.addEventListener('click', () => updateOrderStatus(order.orderNum, 'Verified'));
    const p = card.querySelector('.action-btn.print');
    if (p) p.addEventListener('click', () => updateOrderStatus(order.orderNum, 'Printed'));
    const u = card.querySelector('.action-btn.pickup');
    if (u) u.addEventListener('click', () => updateOrderStatus(order.orderNum, 'PickedUp'));
}

// Diff-and-patch: reuse existing card nodes (keyed by data-order), only
// rebuild a card when its content actually changed → no flicker, scroll kept.
function renderOrders() {
    const list = visibleOrders();
    if (!list.length) {
        el.orderList.innerHTML = '<div class="empty-state">No matching orders.</div>';
        return;
    }
    // drop the empty-state node if present
    if (el.orderList.querySelector('.empty-state')) el.orderList.innerHTML = '';

    const seen = new Set();
    let prev = null;
    list.forEach(order => {
        seen.add(order.orderNum);
        let card = el.orderList.querySelector(`[data-order="${order.orderNum}"]`);
        const html = orderCardHTML(order);
        if (!card) {
            card = document.createElement('div');
            card.className = 'admin-order-card';
            card.dataset.order = order.orderNum;
            card.dataset.sig = '';
        }
        const sig = order.status + '|' + order.upiTxnId; // cheap change signature
        if (card.dataset.sig !== sig) {
            card.innerHTML = html;
            card.dataset.sig = sig;
            wireCardActions(card, order);
        }
        // order in DOM: insert after prev (maintains newest-first order)
        if (prev) { if (prev.nextSibling !== card) el.orderList.insertBefore(card, prev.nextSibling); }
        else if (el.orderList.firstChild !== card) el.orderList.insertBefore(card, el.orderList.firstChild);
        prev = card;
    });
    // remove cards no longer visible
    Array.from(el.orderList.children).forEach(c => {
        if (c.dataset.order && !seen.has(c.dataset.order)) c.remove();
    });
}

/* ---------- batches ---------- */
function renderBatches() {
    el.batchesList.innerHTML = '';
    if (!state.batches.length) {
        el.batchesList.innerHTML = '<div class="empty-state" style="padding:1rem;font-size:.75rem;">No active batches running.</div>';
        return;
    }
    state.batches.forEach(batch => {
        const item = document.createElement('div');
        item.className = 'batch-item-card';
        item.innerHTML = `
            <div class="batch-colors-preview">
                <span class="mini-swatch" style="background-color:${batch.baseColor};width:16px;height:16px;"></span>
                <span class="mini-swatch" style="background-color:${batch.fontColor};width:16px;height:16px;"></span>
                <span class="batch-name-label">${batch.name}</span>
                <span class="batch-qty-badge">${batch.count} items</span>
            </div>
            <button class="delete-batch-btn" data-base="${batch.baseColor}" data-font="${batch.fontColor}">&times;</button>`;
        item.querySelector('.delete-batch-btn').addEventListener('click', (e) =>
            saveBatch(e.currentTarget.dataset.base, e.currentTarget.dataset.font, 0));
        el.batchesList.appendChild(item);
    });
}

/* ---------- day summary ---------- */
async function loadSummary() {
    if (!el.summaryBox) return;
    try {
        const res = await fetch('/api/summary/today', { headers: authHeaders(false) });
        if (res.status === 401) { alert('Session expired — re-enter PIN.'); return location.reload(); }
        const s = await res.json();
        const combos = (s.topCombos || []).slice(0, 5).map(c =>
            `<div class="sum-combo"><span class="mini-swatch" style="background:${c.baseColor}"></span><span class="mini-swatch" style="background:${c.fontColor}"></span> ×${c.count} · ${Math.round(c.grams*10)/10}g</div>`).join('');
        el.summaryBox.innerHTML = `
            <div class="sum-grid">
                <div><span>Orders</span><b>${s.totalOrders}</b></div>
                <div><span>Paid</span><b>${s.paidOrders}</b></div>
                <div><span>Revenue</span><b>₹${s.revenue}</b></div>
                <div><span>Filament</span><b>${s.filamentGrams}g</b></div>
            </div>
            <div class="sum-combos-title">Top colour combos</div>
            ${combos || '<div class="empty-state" style="font-size:.72rem;">No paid orders yet.</div>'}`;
        el.summaryBox.style.display = 'block';
    } catch (err) { console.error('summary failed', err); }
}

function playNewOrderChime() {
    if (el.orderChime) el.orderChime.play().catch(e => console.warn('Audio play failed:', e));
}

/* ---------- events + boot ---------- */
function setupEvents() {
    el.btnRefresh && el.btnRefresh.addEventListener('click', () => { loadOrders(); loadBatches(); });
    el.btnAddBatch && el.btnAddBatch.addEventListener('click', () => {
        saveBatch(el.batchBaseColor.value, el.batchFontColor.value, parseInt(el.batchSizeCount.value) || 5);
    });
    el.searchInput && el.searchInput.addEventListener('input', (e) => { state.filter = e.target.value; renderOrders(); });
    el.statusFilter && el.statusFilter.addEventListener('change', (e) => { state.statusFilter = e.target.value; renderOrders(); });
    el.btnSummary && el.btnSummary.addEventListener('click', loadSummary);
}

let _pollStarted = false;
function startDashboard() {
    if (_pollStarted) return;
    _pollStarted = true;
    setupEvents();
    loadOrders(true);
    loadBatches();
    setInterval(() => loadOrders(), 8000);
}

function init() {
    cacheEls();
    // Auth gate: if we have a cached PIN that still works, skip the gate.
    const boot = async () => {
        if (state.pin && await tryLogin(state.pin)) { showApp(); return; }
        if (el.loginGate) el.loginGate.style.display = 'flex';
        if (el.adminMain) el.adminMain.style.display = 'none';
    };
    if (el.btnLogin) {
        el.btnLogin.addEventListener('click', async () => {
            const pin = (el.pinInput.value || '').trim();
            if (await tryLogin(pin)) {
                state.pin = pin;
                sessionStorage.setItem('ygAdminPin', pin);
                showApp();
            } else {
                el.loginError.textContent = 'Invalid PIN';
                el.loginError.style.display = 'block';
            }
        });
        el.pinInput && el.pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') el.btnLogin.click(); });
    }
    boot();
}

window.addEventListener('DOMContentLoaded', init);
