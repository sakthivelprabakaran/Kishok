const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

let lastFetchTime = 0;
const CACHE_DURATION_MS = 15000;

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Fetch timed out')), timeout);
    });
    try {
        const response = await Promise.race([fetch(url, options), timeoutPromise]);
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
}));

const configuredOrigins = [
    process.env.ALLOWED_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || !process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGIN === '*') {
            return callback(null, true);
        }
        if (configuredOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1|.*\.run\.app|.*\.google\.com|.*\.vercel\.app)/.test(origin)) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-pin', 'Authorization'],
    credentials: true,
}));

app.use(express.json({ limit: '250kb' }));

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'kiosk-api',
        cloudSyncConfigured: Boolean(GOOGLE_SCRIPT_URL),
        timestamp: new Date().toISOString()
    });
});

const ADMIN_PIN = String(process.env.ADMIN_PIN || '9876').trim();
const VALID_PIN_RE = /^\d{4}$/;
const ADMIN_AUTH_CONFIGURED = VALID_PIN_RE.test(ADMIN_PIN) && ADMIN_PIN !== '1234';

function requireAdmin(req, res, next) {
    if (!ADMIN_AUTH_CONFIGURED) {
        return res.status(503).json({ error: 'Admin authentication is not configured' });
    }
    const pin = String(req.headers['x-admin-pin'] || '').trim();
    if (VALID_PIN_RE.test(pin) && pin === ADMIN_PIN) return next();
    return res.status(401).json({ error: 'Unauthorized — admin PIN required' });
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts — try again in 15 minutes.' },
    skipSuccessfulRequests: true,
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
    const pin = String((req.body || {}).pin || '').trim();
    if (!ADMIN_AUTH_CONFIGURED) return res.status(503).json({ success: false, error: 'Admin authentication is not configured' });
    if (!VALID_PIN_RE.test(pin)) return res.status(400).json({ success: false, error: 'PIN must be exactly 4 digits' });
    if (pin === ADMIN_PIN) return res.json({ success: true });
    return res.status(401).json({ success: false, error: 'Invalid PIN' });
});

app.get('/api/admin/health', requireAdmin, (req, res) => {
    res.json({ adminPinConfigured: ADMIN_AUTH_CONFIGURED, status: 'ok' });
});

app.use(express.static(path.join(__dirname, 'public')));

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

function bearerToken(req) {
    const header = String(req.headers.authorization || '');
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) return null;
    const token = match[1].trim();
    return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) ? token : null;
}

async function supabaseSelect(accessToken, table, query) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        const err = new Error('Orders are not configured (SUPABASE_URL / SUPABASE_ANON_KEY missing on the server)');
        err.status = 503;
        throw err;
    }
    const res = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/${table}?${query}`,
        {
            method: 'GET',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        },
        8000
    );
    const raw = await res.text();
    if (!res.ok) {
        let msg = raw;
        try { msg = JSON.parse(raw).message || raw; } catch (_) {}
        const err = new Error(msg || `Database error (${res.status})`);
        err.status = res.status >= 400 && res.status < 600 ? res.status : 500;
        throw err;
    }
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (_) { return []; }
}

const MY_ORDER_COLS = 'order_num,created_at,status,fulfilment_method,final_amount,'
    + 'shipping_fee,quantity,customer_name,phone,'
    + 'ship_recipient_name,ship_line1,ship_line2,ship_city,ship_state,ship_pincode,'
    + 'courier,tracking_number';

function toCustomerOrder(r) {
    const out = {
        orderNum: r.order_num,
        placedAt: r.created_at,
        status: r.status,
        fulfilmentMethod: r.fulfilment_method || 'pickup',
        total: Number(r.final_amount),
        shippingFee: Number(r.shipping_fee) || 0,
        itemCount: Number(r.quantity) || 1,
        contactName: r.customer_name,
    };
    if (out.fulfilmentMethod === 'ship') {
        out.address = {
            recipientName: r.ship_recipient_name,
            line1: r.ship_line1,
            line2: r.ship_line2,
            city: r.ship_city,
            state: r.ship_state,
            pincode: r.ship_pincode,
        };
        out.courier = r.courier || '';
        out.trackingNumber = r.tracking_number || '';
    }
    return out;
}

function toCustomerItem(r) {
    return {
        productType: r.product_type,
        text: r.text_value,
        quantity: Number(r.quantity),
        design: r.design || {},
        preview: r.preview || '',
        unitPrice: Number(r.unit_price),
        lineTotal: Number(r.line_total),
    };
}

app.get('/api/my-orders', async (req, res) => {
    try {
        const token = bearerToken(req);
        if (!token) return res.status(401).json({ error: 'Sign in to continue' });
        const orderNum = String(req.query.order || '').trim();
        if (orderNum) {
            if (!/^\d{1,10}$/.test(orderNum)) return res.status(400).json({ error: 'Invalid order number' });
            const rows = await supabaseSelect(token, 'orders', `select=${MY_ORDER_COLS}&order_num=eq.${encodeURIComponent(orderNum)}&limit=1`);
            if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Order not found' });
            const itemRows = await supabaseSelect(token, 'order_items', 'select=product_type,text_value,quantity,design,preview,unit_price,line_total' + `&order_num=eq.${encodeURIComponent(orderNum)}&order=id.asc`);
            return res.json({ order: toCustomerOrder(rows[0]), items: Array.isArray(itemRows) ? itemRows.map(toCustomerItem) : [] });
        }
        const rows = await supabaseSelect(token, 'orders', `select=${MY_ORDER_COLS}&order=created_at.desc&limit=50`);
        return res.json({ orders: Array.isArray(rows) ? rows.map(toCustomerOrder) : [] });
    } catch (err) {
        console.error('my-orders error:', err);
        const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
        return res.status(status).json({ error: err.message || 'Failed to load orders' });
    }
});

// Customer cart + checkout routes
try {
    require('./customer-api')(app, { fetchWithTimeout, bearerToken });
} catch (err) {
    console.error('Failed to mount customer API routes:', err);
}

// Operator dashboard + kiosk quick-order routes (Supabase-backed).
// These were dropped in the server rewrite, which killed admin.html and the
// walk-up pay flow; restored against the same store the shop writes to.
try {
    require('./operator-api')(app, { fetchWithTimeout, requireAdmin });
} catch (err) {
    console.error('Failed to mount operator API routes:', err);
}

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

if (!IS_VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Roadside Kiosk Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
