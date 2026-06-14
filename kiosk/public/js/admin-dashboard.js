/* =========================================
   YOURSGIFTS KIOSK — ADMIN DASHBOARD LOGIC
   ========================================= */

// ===== STATE =====
const state = {
    orders: [],
    batches: []
};

// ===== DOM CACHE =====
const el = {
    statOrders:   document.getElementById('statOrders'),
    statRevenue:  document.getElementById('statRevenue'),
    statPending:  document.getElementById('statPending'),
    orderList:    document.getElementById('orderList'),
    batchesList:  document.getElementById('batchesList'),
    btnRefresh:   document.getElementById('btnRefresh'),
    
    // Batch inputs
    batchBaseColor: document.getElementById('batchBaseColor'),
    batchFontColor: document.getElementById('batchFontColor'),
    batchSizeCount: document.getElementById('batchSizeCount'),
    btnAddBatch:    document.getElementById('btnAddBatch'),
    
    // Audio
    orderChime:     document.getElementById('orderChime')
};

// ===== API WORK =====

// Fetch active orders today
async function loadOrders(silent = false) {
    try {
        const response = await fetch('/api/orders/today');
        const data = await response.json();
        
        // Check if we have new orders to ring chime
        if (!silent && state.orders.length > 0 && data.length > state.orders.length) {
            playNewOrderChime();
        }
        
        state.orders = data;
        updateStats();
        renderOrders();
    } catch (err) {
        console.error('Failed to load orders:', err);
        el.orderList.innerHTML = '<div class="empty-state">Error fetching orders from server.</div>';
    }
}

// Fetch active batches
async function loadBatches() {
    try {
        const response = await fetch('/api/batches');
        state.batches = await response.json();
        renderBatches();
    } catch (err) {
        console.error('Failed to load batches:', err);
    }
}

// Update order status on server
async function updateOrderStatus(orderNum, newStatus) {
    try {
        const response = await fetch(`/api/order/${orderNum}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const resData = await response.json();
        if (resData.success) {
            // Reload orders silently
            await loadOrders(true);
        } else {
            alert('Failed to update status: ' + (resData.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Update status request failed:', err);
    }
}

// Add/update active printing batch
async function saveBatch(baseColor, fontColor, count) {
    try {
        const response = await fetch('/api/batches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseColor, fontColor, count })
        });
        const data = await response.json();
        if (data.success) {
            await loadBatches();
        }
    } catch (err) {
        console.error('Failed to save batch:', err);
    }
}

// ===== STATS UPDATER =====

function updateStats() {
    el.statOrders.textContent = state.orders.length;
    
    // Revenue counts verified or printed orders (i.e., paid)
    const totalRev = state.orders
        .filter(o => o.status === 'Verified' || o.status === 'Printed')
        .reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    el.statRevenue.textContent = `₹${totalRev}`;
    
    // Pending prints are orders that have been verified (paid) but not yet printed
    const pendingPrints = state.orders.filter(o => o.status === 'Verified').length;
    el.statPending.textContent = pendingPrints;
}

// ===== RENDERERS =====

function renderOrders() {
    el.orderList.innerHTML = '';
    
    if (state.orders.length === 0) {
        el.orderList.innerHTML = '<div class="empty-state">No orders received today yet.</div>';
        return;
    }
    
    // Show newest orders on top
    const sortedOrders = [...state.orders].reverse();
    
    sortedOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'admin-order-card';
        
        // Status class
        const statusClass = order.status.toLowerCase();
        
        // Parse specs
        const baseColorHex = order.baseColor;
        const fontColorHex = order.fontColor;
        
        // Format product type label
        let pLabel = order.productType;
        if (pLabel === 'bordered_keychain') pLabel = 'Bordered';
        else if (pLabel === 'flower_keychain') pLabel = 'Flower Initial';
        else if (pLabel === 'nametag') pLabel = 'Wavy Nametag';
        else if (pLabel === 'girly_keychain') pLabel = 'Girly Keychain';
        else if (pLabel === 'tilekey') pLabel = 'Letter Tiles';
        else if (pLabel === 'linked_initials') pLabel = 'Linked Initials';
        else if (pLabel === 'supported_text') pLabel = 'Supported Nameplate';
        else if (pLabel === 'wordart') pLabel = 'Word Art';
        else if (pLabel === 'loveseries') pLabel = 'LOVE Stand';
        
        // UPI card txn verification class
        const upiVerified = order.status !== 'Pending' ? 'verified-txn' : '';
        
        card.innerHTML = `
            <div class="card-header-row">
                <span class="order-badge-id">${order.orderNum}</span>
                <span class="order-time">${order.timestamp}</span>
                <span class="order-status-tag ${statusClass}">${order.status}</span>
            </div>
            
            <div class="cust-details-row">
                <span>👤 <strong>Name:</strong> ${order.name}</span>
                <span>📞 <strong>Phone:</strong> <a href="tel:${order.phone}" style="color:#a855f7;">${order.phone}</a></span>
            </div>
            
            <div class="spec-details-row">
                <div>🎨 <strong>Specs:</strong> ${pLabel} · "${order.text}" (Font: ${order.font})</div>
                <div style="margin-top:0.25rem;">
                    🌈 <strong>Colors:</strong>
                    <div class="color-indicator-swatches">
                        <span class="mini-swatch" style="background-color: ${baseColorHex};" title="Base"></span>
                        <span class="mini-swatch" style="background-color: ${fontColorHex};" title="Font"></span>
                    </div>
                    <span>(Base/Text)</span>
                    &nbsp;&nbsp;&nbsp;⚖️ <strong>Weight:</strong> ${order.weightG}g · 🖨️ <strong>Print:</strong> ${order.printTimeMins}m
                </div>
                <div style="margin-top:0.25rem; color: #ffffff;">
                    💰 <strong>Price Details:</strong> Raw Cost: ₹${order.productionCost} | <strong>Amount Paid: ₹${order.finalAmount}</strong>
                </div>
            </div>
            
            <div class="txn-id-row ${upiVerified}">
                🔑 <strong>UPI Transaction Reference:</strong> <code>${order.upiTxnId || 'N/A'}</code>
            </div>
            
            <div class="card-actions-row">
                ${order.status === 'Pending' ? `
                    <button class="action-btn verify" data-id="${order.orderNum}">Verify Payment</button>
                ` : ''}
                ${order.status === 'Verified' ? `
                    <button class="action-btn print" data-id="${order.orderNum}">Mark as Printed</button>
                ` : ''}
                ${order.status === 'Printed' ? `
                    <div style="text-align: center; color: var(--accent); font-size: 0.8rem; width: 100%; font-weight: 700; background: rgba(16, 185, 129, 0.05); padding: 0.35rem; border-radius: 8px;">✓ Print Completed</div>
                ` : ''}
            </div>
        `;
        
        // Action listeners
        const btnVerify = card.querySelector('.action-btn.verify');
        if (btnVerify) {
            btnVerify.addEventListener('click', () => {
                updateOrderStatus(order.orderNum, 'Verified');
            });
        }
        
        const btnPrint = card.querySelector('.action-btn.print');
        if (btnPrint) {
            btnPrint.addEventListener('click', () => {
                updateOrderStatus(order.orderNum, 'Printed');
            });
        }
        
        el.orderList.appendChild(card);
    });
}

function renderBatches() {
    el.batchesList.innerHTML = '';
    
    if (state.batches.length === 0) {
        el.batchesList.innerHTML = '<div class="empty-state" style="padding:1rem; font-size:0.75rem;">No active batches running.</div>';
        return;
    }
    
    state.batches.forEach(batch => {
        const item = document.createElement('div');
        item.className = 'batch-item-card';
        
        item.innerHTML = `
            <div class="batch-colors-preview">
                <span class="mini-swatch" style="background-color: ${batch.baseColor}; width:16px; height:16px;"></span>
                <span class="mini-swatch" style="background-color: ${batch.fontColor}; width:16px; height:16px;"></span>
                <span class="batch-name-label">${batch.name}</span>
                <span class="batch-qty-badge">${batch.count} items</span>
            </div>
            <button class="delete-batch-btn" data-base="${batch.baseColor}" data-font="${batch.fontColor}">&times;</button>
        `;
        
        item.querySelector('.delete-batch-btn').addEventListener('click', (e) => {
            const base = e.currentTarget.dataset.base;
            const font = e.currentTarget.dataset.font;
            saveBatch(base, font, 0); // Count 0 deletes batch
        });
        
        el.batchesList.appendChild(item);
    });
}

function playNewOrderChime() {
    if (el.orderChime) {
        el.orderChime.play().catch(e => console.warn('Audio play failed:', e));
    }
}

// ===== EVENT INITIALIZATIONS =====

function setupEvents() {
    // Refresh button
    el.btnRefresh.addEventListener('click', () => {
        loadOrders();
        loadBatches();
    });
    
    // Add batch combo
    el.btnAddBatch.addEventListener('click', () => {
        const base = el.batchBaseColor.value;
        const font = el.batchFontColor.value;
        const count = parseInt(el.batchSizeCount.value) || 5;
        
        saveBatch(base, font, count);
    });
}

// ===== INIT & POLLING =====

function init() {
    setupEvents();
    
    // Initial load
    loadOrders(true); // silent on first run
    loadBatches();
    
    // Set up 8s interval polling
    setInterval(() => {
        loadOrders();
    }, 8000);
}

window.addEventListener('DOMContentLoaded', init);
