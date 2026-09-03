/* Operator + kiosk quick-order API, backed by Supabase.
 *
 * Restores the four routes the server.js rewrite dropped — POST /api/order,
 * GET /api/orders/today, GET /api/summary/today, PATCH /api/order/:id — and
 * moves /api/batches off the in-memory arrays (which reset on every Vercel cold
 * start) onto the Supabase `batches` table.
 *
 * WHY SUPABASE AND NOT THE OLD EXCEL/SHEETS CODE: checkout orders already live
 * in Supabase. Restoring the old storage would give the operator a dashboard
 * that cannot see shop orders. One store, one dashboard.
 *
 * The JSON contract of every route matches the original Express implementation
 * (camelCase rowToOrder shape), so admin.html works unchanged.
 *
 * All writes here use SUPABASE_SERVICE_ROLE_KEY: order rows are server-owned
 * (price, status, dispatch), and the operator routes are gated by the admin PIN
 * rather than a customer session.
 */

module.exports = function mountOperatorRoutes(app, deps) {
    const { fetchWithTimeout, requireAdmin } = deps;

    const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const UTC_OFFSET_MIN = parseInt(process.env.KIOSK_UTC_OFFSET_MINUTES || '330', 10); // IST

    function configured(res) {
        if (SUPABASE_URL && SERVICE_KEY) return true;
        res.status(503).json({ error: 'Orders are not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' });
        return false;
    }

    async function rest(method, pathAndQuery, body, prefer) {
        const headers = {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
        };
        if (prefer) headers.Prefer = prefer;
        const res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        }, 8000);
        const raw = await res.text();
        if (!res.ok) {
            let msg = raw;
            try { msg = JSON.parse(raw).message || raw; } catch (_) { /* keep raw */ }
            const err = new Error(msg || `Database error (${res.status})`);
            err.status = res.status >= 400 && res.status < 600 ? res.status : 500;
            throw err;
        }
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    }

    function sendError(res, err, fallback) {
        console.error(fallback + ':', err.message || err);
        const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
        res.status(status).json({ error: err.message || fallback });
    }

    /* "Today" in kiosk-local time (IST by default) — an order placed 23:30 IST
       must not land on yesterday's report because the server thinks in UTC. */
    function todayRangeIso() {
        const nowLocal = new Date(Date.now() + UTC_OFFSET_MIN * 60000);
        const startLocal = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate());
        const start = new Date(startLocal - UTC_OFFSET_MIN * 60000);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start: start.toISOString(), end: end.toISOString() };
    }

    /* Same camelCase shape the old Express API returned — admin-dashboard.js
       depends on it. Extended (not changed) with fulfilment fields so the
       dashboard can grow into shipping. */
    function rowToOrder(r) {
        return {
            orderNum: r.order_num,
            timestamp: (r.created_at || '').replace('T', ' ').substring(0, 19),
            name: r.customer_name,
            phone: r.phone,
            productType: r.product_type,
            text: r.text_value,
            wordartBase: r.wordart_base,
            font: r.font,
            baseColor: r.base_color,
            fontColor: r.font_color,
            weightG: Number(r.weight_g),
            printTimeMins: Number(r.print_time_mins),
            materialCost: Number(r.material_cost),
            machineCost: Number(r.machine_cost),
            laborCost: Number(r.labor_cost),
            productionCost: Number(r.production_cost),
            finalAmount: Number(r.final_amount),
            batchSize: Number(r.batch_size),
            upiTxnId: r.upi_txn_id,
            status: r.status,
            fulfilmentMethod: r.fulfilment_method || 'pickup',
            quantity: Number(r.quantity) || 1,
            shipCity: r.ship_city || '',
            trackingNumber: r.tracking_number || '',
        };
    }

    const VALID_PRODUCT_TYPES = [
        'keychain', 'wordart', 'loveseries', 'tilekey', 'linked_initials',
        'nametag', 'girly_keychain', 'supported_text', 'flower_keychain',
        'led_word_stand', 'led_word_art', 'bordered_keychain', 'bubble_keychain',
        'nameplate', 'desk_organizer', 'name_beads',
    ];

    // Mirrors the check constraint in migration 002.
    const ALLOWED_STATUS = [
        'Pending', 'Verified', 'Printed', 'PickedUp', 'Cancelled',
        'PaymentFailed', 'Processing', 'QCHold', 'QCPassed', 'Packed',
        'Shipped', 'OutForDelivery', 'Delivered',
        'ReturnRequested', 'ReturnReceived', 'Refunded',
    ];

    /* ── kiosk quick order (public, anonymous) ─────────────────────────────── */
    app.post('/api/order', async (req, res) => {
        try {
            if (!configured(res)) return;
            const b = req.body || {};
            const name = String(b.name || '').trim();
            const phone = String(b.phone || '').replace(/\D/g, '');
            const text = String(b.text || '').trim();
            const productType = String(b.productType || '').trim();

            if (!name || !phone || !productType || !text) {
                return res.status(400).json({ error: 'Missing required fields: name, phone, productType, text' });
            }
            if (name.length > 100) return res.status(400).json({ error: 'Name is too long (max 100 characters)' });
            if (!/^[0-9]{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must be exactly 10 digits' });
            if (text.length > 200) return res.status(400).json({ error: 'Text is too long (max 200 characters)' });
            if (!VALID_PRODUCT_TYPES.includes(productType)) {
                return res.status(400).json({ error: 'Invalid productType' });
            }

            // Server-side price. The browser computed the same figure from the
            // same shared module for display; a tampered amount is overwritten.
            const { priceLine } = await import('./public/js/pricing.js');
            const priced = priceLine({ weightG: b.weightG, batchSize: b.batchSize });

            const wordartBase = ['none', 'solid', 'hollow'].includes(b.wordartBase) ? b.wordartBase : 'none';
            const quantity = Math.min(20, Math.max(1, parseInt(b.quantity, 10) || 1));

            const saved = await rest('POST', 'orders', {
                customer_name: name,
                phone,
                product_type: productType,
                text_value: text,
                wordart_base: wordartBase,
                font: b.font || 'Standard',
                base_color: b.baseColor || '#FFFFFF',
                font_color: b.fontColor || '#000000',
                weight_g: Number(b.weightG) > 0 ? Number(b.weightG) : 0,
                print_time_mins: priced.breakdown.printTimeMins,
                material_cost: priced.breakdown.materialCost,
                machine_cost: priced.breakdown.machineCost,
                labor_cost: priced.breakdown.labourCost,
                production_cost: priced.breakdown.productionCost,
                final_amount: priced.unitPrice,
                batch_size: priced.breakdown.batchSize,
                quantity,
                upi_txn_id: String(b.upiTxnId || '').slice(0, 30),
                status: 'Pending',
                fulfilment_method: 'pickup',
            }, 'return=representation');

            const row = Array.isArray(saved) ? saved[0] : saved;
            const order = rowToOrder(row);
            return res.status(201).json({ success: true, orderNum: order.orderNum, order });
        } catch (err) {
            sendError(res, err, 'Failed to submit order');
        }
    });

    /* ── operator: today's orders ──────────────────────────────────────────── */
    app.get('/api/orders/today', requireAdmin, async (req, res) => {
        try {
            if (!configured(res)) return;
            const { start, end } = todayRangeIso();
            const rows = await rest('GET',
                `orders?select=*&created_at=gte.${encodeURIComponent(start)}`
                + `&created_at=lt.${encodeURIComponent(end)}&order=created_at.desc`);
            res.json(Array.isArray(rows) ? rows.map(rowToOrder) : []);
        } catch (err) {
            sendError(res, err, 'Failed to load orders');
        }
    });

    /* ── operator: today's summary ─────────────────────────────────────────── */
    app.get('/api/summary/today', requireAdmin, async (req, res) => {
        try {
            if (!configured(res)) return;
            const { start, end } = todayRangeIso();
            const rows = await rest('GET',
                `orders?select=status,final_amount,weight_g,base_color,font_color`
                + `&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}`);
            const orders = Array.isArray(rows) ? rows : [];

            const UNPAID = new Set(['Pending', 'Cancelled', 'PaymentFailed']);
            const paid = orders.filter((o) => !UNPAID.has(o.status));
            const pendingPrints = orders.filter((o) => ['Verified', 'Processing'].includes(o.status)).length;

            const combos = {};
            for (const o of paid) {
                const key = `${o.base_color}|${o.font_color}`;
                combos[key] = (combos[key] || 0) + 1;
            }
            const topCombos = Object.entries(combos)
                .sort((a, b) => b[1] - a[1]).slice(0, 5)
                .map(([combo, count]) => ({ combo, count }));

            res.json({
                totalOrders: orders.length,
                paidOrders: paid.length,
                pendingPrints,
                revenue: paid.reduce((s, o) => s + (Number(o.final_amount) || 0), 0),
                filamentGrams: paid.reduce((s, o) => s + (Number(o.weight_g) || 0), 0),
                topCombos,
            });
        } catch (err) {
            sendError(res, err, 'Failed to load summary');
        }
    });

    /* ── operator: update an order (status / txn / dispatch) ───────────────── */
    app.patch('/api/order/:id', requireAdmin, async (req, res) => {
        try {
            if (!configured(res)) return;
            const orderNum = String(req.params.id || '').trim();
            if (!/^\d{1,10}$/.test(orderNum)) return res.status(400).json({ error: 'Invalid order number' });

            const patch = {};
            const b = req.body || {};
            if (b.status !== undefined) {
                if (!ALLOWED_STATUS.includes(b.status)) {
                    return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUS.join(', ')}` });
                }
                patch.status = b.status;
                if (b.status === 'Shipped') patch.dispatched_at = new Date().toISOString();
                if (b.status === 'Delivered' || b.status === 'PickedUp') patch.delivered_at = new Date().toISOString();
            }
            if (b.upiTxnId !== undefined) patch.upi_txn_id = String(b.upiTxnId).slice(0, 30);
            if (b.courier !== undefined) patch.courier = String(b.courier).slice(0, 60);
            if (b.trackingNumber !== undefined) patch.tracking_number = String(b.trackingNumber).slice(0, 60);
            if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

            const rows = await rest('PATCH',
                `orders?order_num=eq.${encodeURIComponent(orderNum)}`, patch, 'return=representation');
            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            res.json({ success: true, order: rowToOrder(rows[0]) });
        } catch (err) {
            sendError(res, err, 'Failed to update order');
        }
    });

    /* ── batches, persisted (in-memory arrays reset on every cold start) ───── */
    app.get('/api/batches', async (req, res) => {
        try {
            if (!configured(res)) return;
            const rows = await rest('GET', 'batches?select=*&order=updated_at.desc');
            res.json((Array.isArray(rows) ? rows : []).map((r) => ({
                baseColor: r.base_color,
                fontColor: r.font_color,
                name: r.name,
                count: Number(r.count),
            })));
        } catch (err) {
            sendError(res, err, 'Failed to load batches');
        }
    });

    app.post('/api/batches', requireAdmin, async (req, res) => {
        try {
            if (!configured(res)) return;
            const { baseColor, fontColor } = req.body || {};
            if (!baseColor || !fontColor) return res.status(400).json({ error: 'Missing baseColor or fontColor' });

            // `parseInt(x) || 5` would turn a deliberate 0 into 5 and make combos
            // undeletable — the exact bug the Sheets backend had.
            const parsed = parseInt(req.body.count, 10);
            const count = Number.isFinite(parsed) ? parsed : 5;
            const name = `${String(baseColor).toUpperCase()}/${String(fontColor).toUpperCase()}`;

            if (count <= 0) {
                await rest('DELETE',
                    `batches?base_color=eq.${encodeURIComponent(baseColor)}&font_color=eq.${encodeURIComponent(fontColor)}`);
            } else {
                await rest('POST', 'batches?on_conflict=base_color,font_color',
                    { base_color: baseColor, font_color: fontColor, name, count, updated_at: new Date().toISOString() },
                    'resolution=merge-duplicates,return=minimal');
            }

            const rows = await rest('GET', 'batches?select=*&order=updated_at.desc');
            res.json({
                success: true,
                activeBatches: (Array.isArray(rows) ? rows : []).map((r) => ({
                    baseColor: r.base_color, fontColor: r.font_color, name: r.name, count: Number(r.count),
                })),
            });
        } catch (err) {
            sendError(res, err, 'Failed to update batches');
        }
    });
};
