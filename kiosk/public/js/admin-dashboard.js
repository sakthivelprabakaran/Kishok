/* =========================================================
   KOOTZY KIOSK — ADMIN DASHBOARD
   - PIN auth gate (sends x-admin-pin on mutating calls)
   - Production Queue grouped by colour combo
   - Diff-and-patch order feed (no flicker / scroll loss)
   - Reliable new-order chime keyed by order id
   - Search/filter + Picked-up status + day summary
   ========================================================= */

const state = {
    orders: [],
    batches: [],
    filaments: [],
    knownIds: new Set(),   // for reliable new-order detection
    filter: '',            // search text
    statusFilter: 'all',   // all | Pending | Verified | Printed | PickedUp
    fulfilmentFilter: 'all',
    productFilter: 'all',
    sortOrder: 'newest',
    dateRange: '30d',
    dateFrom: '',
    dateTo: '',
    rangeMeta: null,
    activeTab: sessionStorage.getItem('ygAdminTab') || 'overview',
    pin: sessionStorage.getItem('ygAdminPin') || ''
};

const el = {};
function cacheEls() {
    [
        'statOrders','statRevenue','statPending','orderList','batchesList','btnRefresh',
        'batchBaseColor','batchFontColor','batchSizeCount','btnAddBatch','orderChime',
        'queueList','searchInput','statusFilter','sortOrder','btnSummary','summaryBox',
        'loginGate','pinInput','btnLogin','loginError','adminMain',
        'btnFilamentsRefresh','filamentMessage','filamentColourForm','filamentList',
        'newFilamentName','newFilamentHex','newFilamentState','newFilamentSort',
        'customersList','customersRangeLabel','dateRangeFilter','dateFrom','dateTo',
        'customFromField','customToField','btnApplyDateRange','fulfilmentFilter',
        'productFilter','btnClearOrderFilters','orderResultsMeta'
    ].forEach(id => { el[id] = document.getElementById(id); });
}

/* ---------- XSS protection ---------- */
// Escape all user-supplied data before inserting into innerHTML.
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderColorSwatches(colorVal, title, extraStyle = '') {
    if (!colorVal) return '';
    const HEX_RE = /^#[0-9a-fA-F]{6}$/;
    const safeTitle = esc(title);
    const safeExtra = String(extraStyle || '').replace(/[^a-zA-Z0-9:; %.\-#]/g, '');
    return colorVal.split('/').map(c => {
        const raw = c.trim();
        if (!HEX_RE.test(raw)) return '';
        return `<span class="mini-swatch" style="background-color:${esc(raw)};${safeExtra}" title="${safeTitle}"></span>`;
    }).join('');
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
        const params = new URLSearchParams({ range: state.dateRange, t: Date.now() });
        if (state.dateRange === 'custom') {
            if (!state.dateFrom || !state.dateTo) return;
            params.set('from', state.dateFrom);
            params.set('to', state.dateTo);
        }
        const res = await fetch(`/api/orders?${params}`, { headers: authHeaders(false) });
        if (res.status === 401) { alert('Session expired — re-enter PIN.'); return location.reload(); }
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load order history');
        const data = Array.isArray(payload) ? payload : (payload.orders || []);
        state.rangeMeta = Array.isArray(payload) ? null : payload.range;

        // reliable new-order detection by id (not array length)
        const incomingIds = new Set(data.map(o => o.orderNum));
        let hasNew = false;
        if (!silent) {
            for (const o of data) if (!state.knownIds.has(o.orderNum)) { hasNew = true; break; }
        }
        state.knownIds = incomingIds;
        state.orders = data;

        refreshProductFilterOptions();
        updateStats();
        renderQueue();
        renderOrders();          // diff-and-patch, keeps scroll
        renderCustomers();
        renderOrderResultsMeta();
        if (hasNew) playNewOrderChime();
    } catch (err) {
        console.error('Failed to load orders:', err);
        if (el.orderList)
            el.orderList.innerHTML = `<div class="empty-state">${esc(err.message || 'Error fetching orders.')}</div>`;
        if (el.orderResultsMeta) el.orderResultsMeta.textContent = 'Order history could not be loaded.';
    }
}

async function loadBatches() {
    try {
        const res = await fetch(`/api/batches?t=${Date.now()}`);
        state.batches = await res.json();
        renderBatches();
    } catch (err) { console.error('Failed to load batches:', err); }
}

function showFilamentMessage(message, isError = false) {
    if (!el.filamentMessage) return;
    el.filamentMessage.hidden = !message;
    el.filamentMessage.textContent = message || '';
    el.filamentMessage.classList.toggle('error', isError);
}

async function filamentRequest(method = 'GET', body) {
    const res = await fetch(`/api/admin/filaments${method === 'GET' ? `?t=${Date.now()}` : ''}`, {
        method,
        headers: authHeaders(method !== 'GET'),
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) {
        alert('Session expired — re-enter PIN.');
        location.reload();
        return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Filament inventory request failed');
    return data;
}

async function loadFilaments() {
    try {
        const data = await filamentRequest();
        if (!data) return;
        state.filaments = Array.isArray(data.colours) ? data.colours : [];
        renderFilaments();
        showFilamentMessage('');
    } catch (err) {
        console.error('Failed to load filament inventory:', err);
        showFilamentMessage(err.message, true);
        if (el.filamentList) el.filamentList.innerHTML =
            '<div class="empty-state">Inventory is unavailable. Apply migration 004 and refresh.</div>';
    }
}

async function saveFilament(method, body, successMessage) {
    try {
        showFilamentMessage('Saving…');
        const data = await filamentRequest(method, body);
        if (!data) return;
        state.filaments = Array.isArray(data.colours) ? data.colours : [];
        renderFilaments();
        showFilamentMessage(successMessage);
    } catch (err) {
        console.error('Failed to save filament inventory:', err);
        showFilamentMessage(err.message, true);
    }
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

async function updateOrderItemStatus(itemId, productionStatus) {
    try {
        const res = await fetch(`/api/order-item/${itemId}`, {
            method: 'PATCH', headers: authHeaders(true),
            body: JSON.stringify({ productionStatus })
        });
        if (res.status === 401) { alert('Session expired — re-enter PIN.'); return location.reload(); }
        const data = await res.json();
        if (data.success) await loadOrders(true);
        else alert('Failed: ' + (data.error || 'Unknown error'));
    } catch (err) { console.error('Item production update failed:', err); }
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
    desk_organizer: 'Desk Organizer',
    name_beads: 'Name Beads',
    bubble_keychain: 'Bubble Badge',
    led_word_art: 'LED Word Art',
    led_word_stand: 'LED Word Stand',
    keychain: 'Keychain', nameplate: 'Nameplate'
};
const plabel = t => P_LABELS[t] || t;

function orderItems(order) {
    if (Array.isArray(order.items) && order.items.length) return order.items;
    return [{
        id: null,
        productType: order.productType,
        text: order.text,
        quantity: Number(order.quantity) || 1,
        design: {
            font: order.font,
            colors: {
                base: order.baseColor,
                font: String(order.fontColor || '').split('/').pop(),
            },
        },
        unitPrice: Number(order.finalAmount) || 0,
        lineTotal: Number(order.finalAmount) || 0,
        weightG: Number(order.weightG) || 0,
        productionStatus: ['Printed', 'PickedUp'].includes(order.status) ? 'printed' : 'queued',
    }];
}

function localDateValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function orderRangeLabel() {
    if (state.dateRange === 'today') return 'Today';
    if (state.dateRange === '7d') return 'Last 7 days';
    if (state.dateRange === '30d') return 'Last 30 days';
    if (state.dateRange === 'all') return 'All time';
    if (state.dateRange === 'custom' && state.dateFrom && state.dateTo) {
        return `${state.dateFrom} to ${state.dateTo}`;
    }
    return 'Custom dates';
}

function setCustomDateVisibility() {
    const show = state.dateRange === 'custom';
    [el.customFromField, el.customToField, el.btnApplyDateRange].forEach((node) => {
        if (node) node.hidden = !show;
    });
}

function refreshProductFilterOptions() {
    if (!el.productFilter) return;
    const products = [...new Set(state.orders.flatMap((order) =>
        orderItems(order).map((item) => item.productType).filter(Boolean)
    ))].sort((a, b) => plabel(a).localeCompare(plabel(b)));
    if (state.productFilter !== 'all' && !products.includes(state.productFilter)) {
        state.productFilter = 'all';
    }
    el.productFilter.innerHTML = [
        '<option value="all">All products</option>',
        ...products.map((type) =>
            `<option value="${esc(type)}" ${state.productFilter === type ? 'selected' : ''}>${esc(plabel(type))}</option>`
        ),
    ].join('');
}

function renderOrderResultsMeta() {
    const visible = visibleOrders().length;
    const total = state.orders.length;
    const label = orderRangeLabel();
    if (el.orderResultsMeta) {
        el.orderResultsMeta.textContent = `${label} · Showing ${visible} of ${total} order${total === 1 ? '' : 's'}`;
    }
    if (el.customersRangeLabel) {
        el.customersRangeLabel.textContent =
            `Repeated purchases are grouped by phone number for ${label.toLowerCase()}.`;
    }
}

function itemColours(item, order) {
    const colors = item && item.design && item.design.colors;
    if (colors && typeof colors === 'object') {
        const values = Object.values(colors).filter((value) => /^#[0-9a-fA-F]{6}$/.test(String(value)));
        if (values.length) return values;
    }
    return [order.baseColor, ...String(order.fontColor || '').split('/')]
        .filter((value) => /^#[0-9a-fA-F]{6}$/.test(String(value)));
}

/* ---------- stats ---------- */
function updateStats() {
    el.statOrders.textContent = state.orders.length;
    const unpaid = new Set(['Pending', 'Cancelled', 'PaymentFailed']);
    const rev = state.orders
        .filter((order) => !unpaid.has(order.status))
        .reduce((s, o) => s + (o.finalAmount || 0), 0);
    el.statRevenue.textContent = `₹${rev}`;
    el.statPending.textContent = state.orders
        .filter((order) => ['Verified', 'Processing'].includes(order.status))
        .flatMap(orderItems)
        .filter((item) => !['printed', 'qc_passed', 'packed'].includes(item.productionStatus))
        .reduce((sum, item) => sum + item.quantity, 0);
}

/* ---------- PRODUCTION QUEUE by colour combo ---------- */
function renderQueue() {
    if (!el.queueList) return;
    const toPrint = state.orders
        .filter((order) => ['Verified', 'Processing'].includes(order.status))
        .flatMap((order) => orderItems(order).map((item) => ({ order, item })))
        .filter(({ item }) => !['printed', 'qc_passed', 'packed'].includes(item.productionStatus));
    if (!toPrint.length) {
        el.queueList.innerHTML = '<div class="empty-state" style="padding:1rem;font-size:.78rem;">Nothing waiting to print. 🎉</div>';
        return;
    }
    const map = {};
    toPrint.forEach(({ order, item }) => {
        const colours = itemColours(item, order);
        const key = colours.join('|');
        if (!map[key]) map[key] = { colours, items: [], grams: 0, count: 0 };
        map[key].items.push({ order, item });
        map[key].count += item.quantity;
        map[key].grams += (item.weightG || 0) * item.quantity;
    });
    const combos = Object.values(map).sort((a, b) => b.count - a.count);
    const activeKey = new Set(state.batches.map(b => `${b.baseColor}|${b.fontColor}`));

    el.queueList.innerHTML = combos.map(c => {
        const isActive = c.colours.length === 2 && activeKey.has(c.colours.join('|'));
        const names = c.items.map(({ order, item }) =>
            `${order.orderNum} · ${plabel(item.productType)} “${item.text}”`
        ).join(', ');
        return `
        <div class="queue-combo ${isActive ? 'active-batch' : ''}">
            <div class="queue-combo-head">
                <span class="combo-swatches">${renderColorSwatches(c.colours.join('/'), 'Product colours')}</span>
                <span class="combo-count">${c.count} to print</span>
                <span class="combo-grams">${Math.round(c.grams * 10) / 10}g</span>
                ${isActive ? '<span class="combo-active-tag">● BATCH ON</span>' : ''}
            </div>
            <div class="queue-combo-orders">${esc(names)}</div>
        </div>`;
    }).join('');
}

/* ---------- ORDER FEED (diff-and-patch) ---------- */
function visibleOrders() {
    let list = [...state.orders]; // API is newest first
    if (state.statusFilter !== 'all') list = list.filter(o => o.status === state.statusFilter);
    if (state.fulfilmentFilter !== 'all') {
        list = list.filter((order) => (order.fulfilmentMethod || 'pickup') === state.fulfilmentFilter);
    }
    if (state.productFilter !== 'all') {
        list = list.filter((order) =>
            orderItems(order).some((item) => item.productType === state.productFilter));
    }
    const q = state.filter.trim().toLowerCase();
    if (q) list = list.filter(o =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q) ||
        (o.orderNum || '').toLowerCase().includes(q) ||
        (o.text || '').toLowerCase().includes(q) ||
        orderItems(o).some((item) =>
            (item.text || '').toLowerCase().includes(q)
            || plabel(item.productType).toLowerCase().includes(q)));
    const itemCount = (order) => orderItems(order).reduce((sum, item) => sum + item.quantity, 0);
    if (state.sortOrder === 'oldest') list.reverse();
    if (state.sortOrder === 'amount_desc') list.sort((a, b) => Number(b.finalAmount) - Number(a.finalAmount));
    if (state.sortOrder === 'amount_asc') list.sort((a, b) => Number(a.finalAmount) - Number(b.finalAmount));
    if (state.sortOrder === 'items_desc') list.sort((a, b) => itemCount(b) - itemCount(a));
    return list;
}

const PRODUCTION_LABELS = {
    queued: 'Queued',
    printing: 'Printing',
    printed: 'Printed',
    qc_hold: 'QC hold',
    qc_passed: 'QC passed',
    packed: 'Packed',
};

function productionOptions(selected) {
    return Object.entries(PRODUCTION_LABELS).map(([value, label]) =>
        `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`
    ).join('');
}

function itemDesignLink(order, item) {
    const design = item.design && typeof item.design === 'object' ? item.design : {};
    const colors = design.colors && typeof design.colors === 'object' ? design.colors : {};
    const productType = item.productType || order.productType || '';
    const primaryFontColor = colors.font || String(order.fontColor || '').split('/').pop() || '';
    const secondaryFontColor = colors.line2 || colors.outline || '';
    let fontColor = primaryFontColor;
    if (secondaryFontColor) {
        fontColor = productType === 'keychain'
            ? `${secondaryFontColor}/${primaryFontColor}`
            : `${primaryFontColor}/${secondaryFontColor}`;
    }
    const params = new URLSearchParams({
        text: item.text || '',
        productType,
        scaleFactor: Number.isFinite(Number(design.scaleFactor)) ? String(design.scaleFactor) : '0.5',
        font: design.font || order.font || '',
        baseColor: colors.base || order.baseColor || '',
        fontColor,
        wordartBase: design.wordartBase || order.wordartBase || 'none',
        orderNum: order.orderNum || '',
    });
    return `/studio.html?${params.toString()}`;
}

function orderItemHTML(order, item, index) {
    const colours = itemColours(item, order);
    const itemId = Number(item.id);
    const editable = Number.isInteger(itemId) && itemId > 0
        && !['Pending', 'Cancelled', 'PaymentFailed'].includes(order.status);
    return `
        <div class="order-product-item" data-item-id="${itemId || ''}">
            ${item.preview ? `<img class="order-product-preview" src="${esc(item.preview)}" alt="">` : ''}
            <div class="order-product-main">
                <div class="order-product-title">
                    <strong>${index + 1}. ${esc(plabel(item.productType))}</strong>
                    <span>×${esc(item.quantity)}</span>
                </div>
                <div class="order-product-text">&quot;${esc(item.text)}&quot;</div>
                <div class="order-product-meta">
                    <span class="color-indicator-swatches">${renderColorSwatches(colours.join('/'), 'Product colours')}</span>
                    <span>${esc(item.weightG)}g each</span>
                    <span>₹${esc(item.lineTotal || item.unitPrice)}</span>
                </div>
            </div>
            <div class="order-product-production">
                ${editable ? `
                    <label>Production
                        <select class="item-production-status">${productionOptions(item.productionStatus)}</select>
                    </label>` : `<span class="production-chip ${esc(item.productionStatus)}">${esc(PRODUCTION_LABELS[item.productionStatus] || item.productionStatus)}</span>`}
                <a class="action-btn design" href="${itemDesignLink(order, item)}">DESIGN</a>
            </div>
        </div>`;
}

function orderCardHTML(order) {
    const statusClass = esc((order.status || '').toLowerCase());
    const upiVerified = order.status !== 'Pending' ? 'verified-txn' : '';
    const items = orderItems(order);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const allProduced = items.every((item) => ['printed', 'qc_passed', 'packed'].includes(item.productionStatus));

    let actions = '';
    if (order.status === 'Pending')
        actions = `<button class="action-btn verify" data-id="${esc(order.orderNum)}">Verify Payment</button>`;
    else if (order.status === 'Verified')
        actions = allProduced
            ? `<button class="action-btn print" data-id="${esc(order.orderNum)}">Mark order ready</button>`
            : `<button class="action-btn waiting" disabled>Complete each product first</button>`;
    else if (order.status === 'Printed')
        actions = `<button class="action-btn pickup" data-id="${esc(order.orderNum)}">Mark Picked Up</button>
                   <a class="action-btn wa" target="_blank" rel="noopener"
                      href="https://wa.me/91${encodeURIComponent((order.phone||'').replace(/\D/g,'').slice(-10))}?text=${encodeURIComponent('Hi ' + order.name + ', your Kootzy order ' + order.orderNum + ' is printed and ready for pickup! 🎁')}">WhatsApp Ready</a>`;
    else if (order.status === 'PickedUp')
        actions = `<div class="done-tag">✓ Picked Up</div>`;

    return `
        <div class="card-header-row">
            <span class="order-badge-id">${esc(order.orderNum)}</span>
            <span class="order-time">${esc(order.timestamp)}</span>
            <span class="order-status-tag ${statusClass}">${esc(order.status)}</span>
        </div>
        <div class="cust-details-row">
            <span>👤 <strong>Name:</strong> ${esc(order.name)}</span>
            <span>📞 <strong>Phone:</strong> <a href="tel:${esc(order.phone)}" style="color:var(--primary-ink);">${esc(order.phone)}</a></span>
            <span><strong>${items.length}</strong> product${items.length === 1 ? '' : 's'} · ${itemCount} item${itemCount === 1 ? '' : 's'}</span>
        </div>
        <div class="order-products">${items.map((item, index) => orderItemHTML(order, item, index)).join('')}</div>
        <div class="order-total-row"><span>Order total</span><strong>₹${esc(order.finalAmount)}</strong></div>
        <div class="txn-id-row ${upiVerified}">
            🔑 <strong>UPI Ref:</strong> <code>${esc(order.upiTxnId || 'N/A')}</code>
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
    card.querySelectorAll('.order-product-item[data-item-id]').forEach((row) => {
        const select = row.querySelector('.item-production-status');
        const itemId = Number(row.dataset.itemId);
        if (select && itemId) {
            select.addEventListener('change', () => updateOrderItemStatus(itemId, select.value));
        }
    });
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
        const sig = JSON.stringify(order);
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

function renderCustomers() {
    if (!el.customersList) return;
    const groups = new Map();
    for (const order of visibleOrders()) {
        const phone = String(order.phone || '').replace(/\D/g, '');
        const key = phone || `name:${String(order.name || '').toLowerCase()}`;
        if (!groups.has(key)) {
            groups.set(key, { name: order.name || 'Unknown', phone, orders: [], total: 0, items: 0 });
        }
        const customer = groups.get(key);
        customer.orders.push(order);
        customer.total += Number(order.finalAmount) || 0;
        customer.items += orderItems(order).reduce((sum, item) => sum + item.quantity, 0);
    }
    const customers = [...groups.values()].sort((a, b) => b.orders.length - a.orders.length || b.total - a.total);
    if (!customers.length) {
        el.customersList.innerHTML = '<div class="empty-state">No customers match the selected filters.</div>';
        return;
    }
    el.customersList.innerHTML = customers.map((customer) => `
        <article class="customer-card">
            <div>
                <strong>${esc(customer.name)}</strong>
                <a href="tel:${esc(customer.phone)}">${esc(customer.phone || 'No phone')}</a>
            </div>
            <div><strong>${customer.orders.length}</strong><span>order${customer.orders.length === 1 ? '' : 's'}</span></div>
            <div><strong>${customer.items}</strong><span>items</span></div>
            <div><strong>₹${customer.total}</strong><span>value</span></div>
            <div class="customer-order-ids">${customer.orders.map((order) => esc(order.orderNum)).join(', ')}</div>
        </article>
    `).join('');
}

function setAdminTab(tab) {
    const allowed = new Set(['overview', 'orders', 'production', 'filament', 'batches', 'customers']);
    state.activeTab = allowed.has(tab) ? tab : 'overview';
    sessionStorage.setItem('ygAdminTab', state.activeTab);
    document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.adminPanel !== state.activeTab;
    });
    document.querySelectorAll('[data-admin-tab]').forEach((button) => {
        const active = button.dataset.adminTab === state.activeTab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-current', active ? 'page' : 'false');
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
                ${renderColorSwatches(batch.baseColor, 'Base', 'width:16px;height:16px;')}
                ${renderColorSwatches(batch.fontColor, 'Font', 'width:16px;height:16px;')}
                <span class="batch-name-label">${esc(batch.name)}</span>
                <span class="batch-qty-badge">${esc(batch.count)} items</span>
            </div>
            <button class="delete-batch-btn" data-base="${esc(batch.baseColor)}" data-font="${esc(batch.fontColor)}">&times;</button>`;
        item.querySelector('.delete-batch-btn').addEventListener('click', (e) =>
            saveBatch(e.currentTarget.dataset.base, e.currentTarget.dataset.font, 0));
        el.batchesList.appendChild(item);
    });
}

function filamentStateLabel(value) {
    return {
        available: 'Available',
        made_to_order: 'Made to order',
        unavailable: 'Unavailable',
    }[value] || value;
}

function spoolStatusOptions(selected) {
    return ['sealed', 'open', 'empty', 'retired'].map((status) =>
        `<option value="${status}" ${status === selected ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`
    ).join('');
}

function renderFilaments() {
    if (!el.filamentList) return;
    if (!state.filaments.length) {
        el.filamentList.innerHTML = '<div class="empty-state">No filament colours yet. Add the first colour above.</div>';
        return;
    }
    el.filamentList.innerHTML = state.filaments.map((colour) => {
        const spools = Array.isArray(colour.spools) ? colour.spools : [];
        const spoolRows = spools.length ? spools.map((spool) => `
            <div class="spool-row" data-spool-id="${spool.id}">
                <div>
                    <strong>${esc(spool.material)}</strong>
                    <span>${esc(spool.brand || 'No brand')}${spool.lotCode ? ` · Lot ${esc(spool.lotCode)}` : ''}</span>
                </div>
                <label>Remaining
                    <input class="spool-remaining" type="number" min="0" max="${esc(spool.initialWeightG)}"
                        step="0.01" value="${esc(spool.remainingWeightG)}">
                    <small>of ${esc(spool.initialWeightG)}g</small>
                </label>
                <label>Status
                    <select class="spool-status">${spoolStatusOptions(spool.status)}</select>
                </label>
                <button type="button" class="refresh-btn" data-action="save-spool">Save</button>
            </div>`).join('') : '<div class="spool-empty">No spool lots recorded.</div>';

        return `
        <article class="filament-card" data-colour-id="${colour.id}">
            <div class="filament-card-head">
                <span class="filament-large-swatch" style="background:${esc(colour.hex)}"></span>
                <div class="filament-title">
                    <strong>${esc(colour.name)}</strong>
                    <span>${esc(colour.hex)} · ${esc(filamentStateLabel(colour.state))}</span>
                </div>
                <div class="filament-stock-total">
                    <strong>${Math.round(Number(colour.remainingWeightG || 0) * 100) / 100}g</strong>
                    <span>${esc(colour.spoolCount || 0)} spool${Number(colour.spoolCount) === 1 ? '' : 's'}</span>
                </div>
            </div>
            <div class="filament-edit-grid">
                <label>Name<input class="colour-name" maxlength="50" value="${esc(colour.name)}"></label>
                <label>HEX<input class="colour-hex" type="color" value="${esc(colour.hex)}"></label>
                <label>Storefront
                    <select class="colour-state">
                        ${['available', 'made_to_order', 'unavailable'].map((value) =>
                            `<option value="${value}" ${colour.state === value ? 'selected' : ''}>${filamentStateLabel(value)}</option>`
                        ).join('')}
                    </select>
                </label>
                <label>Sort<input class="colour-sort" type="number" min="0" max="100000" value="${esc(colour.sortOrder)}"></label>
                <button type="button" class="add-batch-btn" data-action="save-colour">Save colour</button>
            </div>
            <details class="spool-details">
                <summary>Spool lots and manual stock adjustments</summary>
                <div class="spool-list">${spoolRows}</div>
                <form class="spool-add-form">
                    <label>Material<input name="material" value="PLA" maxlength="30" required></label>
                    <label>Brand<input name="brand" maxlength="60" placeholder="Optional"></label>
                    <label>Lot code<input name="lotCode" maxlength="60" placeholder="Optional"></label>
                    <label>Initial grams<input name="initialWeightG" type="number" min="0.01" step="0.01" value="1000" required></label>
                    <label>Remaining grams<input name="remainingWeightG" type="number" min="0" step="0.01" value="1000" required></label>
                    <label>Status
                        <select name="status">${spoolStatusOptions('sealed')}</select>
                    </label>
                    <label>Purchase date<input name="purchaseDate" type="date"></label>
                    <label>Cost ₹<input name="cost" type="number" min="0" step="0.01" value="0"></label>
                    <label class="spool-notes">Notes<input name="notes" maxlength="500" placeholder="Optional"></label>
                    <button class="add-batch-btn" type="submit">Add spool lot</button>
                </form>
            </details>
        </article>`;
    }).join('');
}

function readNumber(input) {
    return input && input.value !== '' ? Number(input.value) : null;
}

function setupFilamentEvents() {
    el.filamentColourForm && el.filamentColourForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveFilament('POST', {
            resource: 'colour',
            name: el.newFilamentName.value,
            hex: el.newFilamentHex.value,
            state: el.newFilamentState.value,
            sortOrder: readNumber(el.newFilamentSort),
        }, 'Colour added.');
        if (!el.filamentMessage.classList.contains('error')) {
            el.newFilamentName.value = '';
        }
    });

    el.filamentList && el.filamentList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const card = button.closest('.filament-card');
        if (!card) return;
        const colourId = Number(card.dataset.colourId);
        if (button.dataset.action === 'save-colour') {
            saveFilament('PATCH', {
                resource: 'colour',
                id: colourId,
                name: card.querySelector('.colour-name').value,
                hex: card.querySelector('.colour-hex').value,
                state: card.querySelector('.colour-state').value,
                sortOrder: readNumber(card.querySelector('.colour-sort')),
            }, 'Colour updated. Storefront availability is now current.');
        }
        if (button.dataset.action === 'save-spool') {
            const row = button.closest('.spool-row');
            saveFilament('PATCH', {
                resource: 'spool',
                id: Number(row.dataset.spoolId),
                remainingWeightG: readNumber(row.querySelector('.spool-remaining')),
                status: row.querySelector('.spool-status').value,
            }, 'Spool stock updated.');
        }
    });

    el.filamentList && el.filamentList.addEventListener('submit', (event) => {
        const form = event.target.closest('.spool-add-form');
        if (!form) return;
        event.preventDefault();
        const card = form.closest('.filament-card');
        const data = new FormData(form);
        saveFilament('POST', {
            resource: 'spool',
            colourId: Number(card.dataset.colourId),
            material: data.get('material'),
            brand: data.get('brand'),
            lotCode: data.get('lotCode'),
            initialWeightG: Number(data.get('initialWeightG')),
            remainingWeightG: Number(data.get('remainingWeightG')),
            status: data.get('status'),
            purchaseDate: data.get('purchaseDate'),
            cost: Number(data.get('cost') || 0),
            notes: data.get('notes'),
        }, 'Spool lot added.');
    });
}

/* ---------- day summary ---------- */
async function loadSummary() {
    if (!el.summaryBox) return;
    try {
        const res = await fetch(`/api/summary/today?t=${Date.now()}`, { headers: authHeaders(false) });
        if (res.status === 401) { alert('Session expired — re-enter PIN.'); return location.reload(); }
        const s = await res.json();
        const combos = (s.topCombos || []).slice(0, 5).map(c =>
            `<div class="sum-combo">${renderColorSwatches(c.baseColor, 'Base')}${renderColorSwatches(c.fontColor, 'Font')} ×${c.count} · ${Math.round(c.grams*10)/10}g</div>`).join('');
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
function renderFilteredViews() {
    renderOrders();
    renderCustomers();
    renderOrderResultsMeta();
}

function applySelectedDateRange() {
    if (state.dateRange === 'custom') {
        state.dateFrom = el.dateFrom ? el.dateFrom.value : '';
        state.dateTo = el.dateTo ? el.dateTo.value : '';
        if (!state.dateFrom || !state.dateTo) {
            if (el.orderResultsMeta) el.orderResultsMeta.textContent = 'Choose both From and To dates.';
            return;
        }
        if (state.dateFrom > state.dateTo) {
            if (el.orderResultsMeta) el.orderResultsMeta.textContent = 'From date cannot be after To date.';
            return;
        }
    }
    state.knownIds = new Set();
    loadOrders(true);
}

function clearOrderFilters() {
    state.filter = '';
    state.statusFilter = 'all';
    state.fulfilmentFilter = 'all';
    state.productFilter = 'all';
    state.sortOrder = 'newest';
    state.dateRange = '30d';
    if (el.searchInput) el.searchInput.value = '';
    if (el.statusFilter) el.statusFilter.value = 'all';
    if (el.fulfilmentFilter) el.fulfilmentFilter.value = 'all';
    if (el.productFilter) el.productFilter.value = 'all';
    if (el.sortOrder) el.sortOrder.value = 'newest';
    if (el.dateRangeFilter) el.dateRangeFilter.value = '30d';
    setCustomDateVisibility();
    applySelectedDateRange();
}

function setupEvents() {
    const today = localDateValue();
    state.dateFrom = state.dateFrom || today;
    state.dateTo = state.dateTo || today;
    if (el.dateFrom) el.dateFrom.value = state.dateFrom;
    if (el.dateTo) el.dateTo.value = state.dateTo;
    if (el.dateRangeFilter) el.dateRangeFilter.value = state.dateRange;
    setCustomDateVisibility();

    el.btnRefresh && el.btnRefresh.addEventListener('click', () => { loadOrders(); loadBatches(); });
    el.btnFilamentsRefresh && el.btnFilamentsRefresh.addEventListener('click', loadFilaments);
    el.btnAddBatch && el.btnAddBatch.addEventListener('click', () => {
        saveBatch(el.batchBaseColor.value, el.batchFontColor.value, parseInt(el.batchSizeCount.value) || 5);
    });
    el.searchInput && el.searchInput.addEventListener('input', (e) => {
        state.filter = e.target.value;
        renderFilteredViews();
    });
    el.statusFilter && el.statusFilter.addEventListener('change', (e) => {
        state.statusFilter = e.target.value;
        renderFilteredViews();
    });
    el.fulfilmentFilter && el.fulfilmentFilter.addEventListener('change', (e) => {
        state.fulfilmentFilter = e.target.value;
        renderFilteredViews();
    });
    el.productFilter && el.productFilter.addEventListener('change', (e) => {
        state.productFilter = e.target.value;
        renderFilteredViews();
    });
    el.sortOrder && el.sortOrder.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        renderFilteredViews();
    });
    el.dateRangeFilter && el.dateRangeFilter.addEventListener('change', (e) => {
        state.dateRange = e.target.value;
        setCustomDateVisibility();
        if (state.dateRange === 'custom') {
            state.dateFrom = '';
            state.dateTo = '';
            if (el.orderResultsMeta) el.orderResultsMeta.textContent = 'Choose From and To dates, then apply.';
            return;
        }
        applySelectedDateRange();
    });
    el.btnApplyDateRange && el.btnApplyDateRange.addEventListener('click', applySelectedDateRange);
    el.btnClearOrderFilters && el.btnClearOrderFilters.addEventListener('click', clearOrderFilters);
    el.btnSummary && el.btnSummary.addEventListener('click', loadSummary);
    setupFilamentEvents();
    document.querySelectorAll('[data-admin-tab]').forEach((button) => {
        button.addEventListener('click', () => setAdminTab(button.dataset.adminTab));
    });
    setAdminTab(state.activeTab);
}

let _pollStarted = false;
function startDashboard() {
    if (_pollStarted) return;
    _pollStarted = true;
    setupEvents();
    loadOrders(true);
    loadBatches();
    loadFilaments();
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
