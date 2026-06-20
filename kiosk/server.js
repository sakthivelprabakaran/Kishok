const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_VERCEL = Boolean(process.env.VERCEL);

// Cloud Sync URL (Google Sheets App Script Web App URL)
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

app.use(cors());
app.use(express.json());

// ===== ADMIN AUTH =====
// Shared-secret PIN. Set ADMIN_PIN in the environment for production; the
// default is only a dev fallback. The kiosk customer flow stays public —
// only admin/operator actions are gated.
const ADMIN_PIN = String(process.env.ADMIN_PIN || '1234').trim();

function requireAdmin(req, res, next) {
    const pin = String(req.headers['x-admin-pin'] || '').trim();
    if (pin && pin === ADMIN_PIN) return next();
    return res.status(401).json({ error: 'Unauthorized — admin PIN required' });
}

// Login: validate a PIN, let the client cache it for subsequent x-admin-pin headers.
app.post('/api/admin/login', (req, res) => {
    const pin = String((req.body || {}).pin || '').trim();
    if (pin && pin === ADMIN_PIN) return res.json({ success: true });
    return res.status(401).json({ success: false, error: 'Invalid PIN' });
});

// Non-secret deployment check for debugging environment configuration.
app.get('/api/admin/health', (req, res) => {
    res.json({
        adminPinConfigured: Boolean(process.env.ADMIN_PIN),
        adminPinLength: ADMIN_PIN.length
    });
});

// Serve public static files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder exists
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'kishok-data') : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const EXCEL_PATH = path.join(DATA_DIR, 'orders.xlsx');

// Initialize local Excel file with headers if it doesn't exist (only if not using Google Sheets)
async function initExcel() {
    if (GOOGLE_SCRIPT_URL) return; // Skip if in cloud sync mode
    
    if (!fs.existsSync(EXCEL_PATH)) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Orders');
        
        sheet.columns = [
            { header: 'Order #', key: 'orderNum', width: 12 },
            { header: 'Timestamp', key: 'timestamp', width: 22 },
            { header: 'Customer Name', key: 'name', width: 18 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Product Type', key: 'productType', width: 20 },
            { header: 'Text', key: 'text', width: 18 },
            { header: 'Font', key: 'font', width: 15 },
            { header: 'Base Color', key: 'baseColor', width: 12 },
            { header: 'Font Color', key: 'fontColor', width: 12 },
            { header: 'Weight (g)', key: 'weightG', width: 12 },
            { header: 'Print Time (min)', key: 'printTimeMins', width: 15 },
            { header: 'Material Cost (₹)', key: 'materialCost', width: 18 },
            { header: 'Machine Cost (₹)', key: 'machineCost', width: 18 },
            { header: 'Labor Cost (₹)', key: 'laborCost', width: 18 },
            { header: 'Production Cost (₹)', key: 'productionCost', width: 18 },
            { header: 'Final (w/ buffer) (₹)', key: 'finalAmount', width: 20 },
            { header: 'Batch Size Used', key: 'batchSize', width: 15 },
            { header: 'UPI Txn ID', key: 'upiTxnId', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        // Format header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        await workbook.xlsx.writeFile(EXCEL_PATH);
        console.log('Created local orders.xlsx spreadsheet.');
    }
}

// Helper to get next order number
async function getNextOrderNum() {
    if (GOOGLE_SCRIPT_URL) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL);
            const data = await response.json();
            return `KSK-${String(data.length + 1).padStart(3, '0')}`;
        } catch(err) {
            console.error('Failed to get count from Google Sheets:', err);
            return `KSK-${String(activeOrders.length + 1).padStart(3, '0')}`;
        }
    }
    
    await initExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.getWorksheet('Orders');
    const rowCount = sheet.actualRowCount;
    const nextNum = rowCount; // Header is row 1
    return `KSK-${String(nextNum).padStart(3, '0')}`;
}

// Active batches in memory (stores color combinations currently being batch-printed)
let activeBatches = [
    { baseColor: '#FF6251', fontColor: '#FFFFFF', name: 'RED/WHITE', count: 5 },
    { baseColor: '#000000', fontColor: '#FFFFFF', name: 'BLACK/WHITE', count: 3 }
];

// Active orders cache
let activeOrders = [];

function normalizeOrderRow(row) {
    if (!row || typeof row !== 'object') return null;

    const firstCol = row.orderNum || row['Order #'] || row['YoursGifts Kiosk Orders'] || '';
    const statusCol = row.status || row.Status || row[''] || 'Pending';
    const orderNum = String(firstCol || '').trim();

    if (!orderNum || orderNum.toLowerCase() === 'order #') return null;

    return {
        orderNum,
        timestamp: row.timestamp || row.Timestamp || '',
        name: row.name || row['Customer Name'] || '',
        phone: row.phone || row.Phone || '',
        productType: row.productType || row['Product Type'] || 'keychain',
        text: row.text || row.Text || '',
        font: row.font || row.Font || 'Standard',
        baseColor: row.baseColor || row['Base Color'] || '#FFFFFF',
        fontColor: row.fontColor || row['Font Color'] || '#000000',
        weightG: parseFloat(row.weightG || row['Weight (g)']) || 0,
        printTimeMins: parseFloat(row.printTimeMins || row['Print Time (min)']) || 0,
        materialCost: parseFloat(row.materialCost || row['Material Cost (₹)']) || 0,
        machineCost: parseFloat(row.machineCost || row['Machine Cost (₹)']) || 0,
        laborCost: parseFloat(row.laborCost || row['Labor Cost (₹)']) || 0,
        productionCost: parseFloat(row.productionCost || row['Production Cost (₹)']) || 0,
        finalAmount: parseFloat(row.finalAmount || row['Final (w/ buffer) (₹)']) || 0,
        batchSize: parseInt(row.batchSize || row['Batch Size Used']) || 5,
        upiTxnId: row.upiTxnId || row['UPI Txn ID'] || '',
        status: String(statusCol || 'Pending').trim()
    };
}

function normalizeOrders(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizeOrderRow).filter(Boolean);
}

// Load orders from source on startup
async function loadActiveOrders() {
    if (GOOGLE_SCRIPT_URL) {
        try {
            console.log('Fetching initial orders from Google Sheets...');
            const response = await fetch(GOOGLE_SCRIPT_URL);
            const data = await response.json();
            activeOrders = normalizeOrders(data);
            console.log(`Loaded ${activeOrders.length} orders from Google Sheets.`);
        } catch(err) {
            console.error('Failed to connect to Google Sheets on startup:', err);
        }
        return;
    }
    
    try {
        await initExcel();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(EXCEL_PATH);
        const sheet = workbook.getWorksheet('Orders');
        const orders = [];
        
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header
            
            orders.push({
                orderNum: row.getCell(1).value,
                timestamp: row.getCell(2).value,
                name: row.getCell(3).value,
                phone: row.getCell(4).value,
                productType: row.getCell(5).value,
                text: row.getCell(6).value,
                font: row.getCell(7).value,
                baseColor: row.getCell(8).value,
                fontColor: row.getCell(9).value,
                weightG: parseFloat(row.getCell(10).value) || 0,
                printTimeMins: parseFloat(row.getCell(11).value) || 0,
                materialCost: parseFloat(row.getCell(12).value) || 0,
                machineCost: parseFloat(row.getCell(13).value) || 0,
                laborCost: parseFloat(row.getCell(14).value) || 0,
                productionCost: parseFloat(row.getCell(15).value) || 0,
                finalAmount: parseFloat(row.getCell(16).value) || 0,
                batchSize: parseInt(row.getCell(17).value) || 5,
                upiTxnId: row.getCell(18).value || '',
                status: row.getCell(19).value || 'Pending'
            });
        });
        
        activeOrders = orders;
        console.log(`Loaded ${activeOrders.length} orders from local Excel.`);
    } catch (err) {
        console.error('Error loading active orders:', err);
    }
}

// Routes

// Get active batches
app.get('/api/batches', (req, res) => {
    res.json(activeBatches);
});

// Update active batches (admin only)
app.post('/api/batches', requireAdmin, (req, res) => {
    const { baseColor, fontColor, count } = req.body;
    if (!baseColor || !fontColor) {
        return res.status(400).json({ error: 'Missing baseColor or fontColor' });
    }

    const name = `${baseColor.toUpperCase()}/${fontColor.toUpperCase()}`;
    const existingIndex = activeBatches.findIndex(b => b.baseColor === baseColor && b.fontColor === fontColor);
    const countVal = parseInt(count) || 5;

    if (existingIndex > -1) {
        if (countVal <= 0) {
            activeBatches.splice(existingIndex, 1);
        } else {
            activeBatches[existingIndex].count = countVal;
        }
    } else if (countVal > 0) {
        activeBatches.push({ baseColor, fontColor, name, count: countVal });
    }

    res.json({ success: true, activeBatches });
});

// Submit a new order
app.post('/api/order', async (req, res) => {
    try {
        const orderData = req.body;
        
        if (!orderData.name || !orderData.phone || !orderData.productType || !orderData.text) {
            return res.status(400).json({ error: 'Missing required order details' });
        }

        const orderNum = await getNextOrderNum();
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const status = 'Pending';

        const order = {
            orderNum,
            timestamp,
            name: orderData.name,
            phone: orderData.phone,
            productType: orderData.productType,
            text: orderData.text,
            font: orderData.font || 'Standard',
            baseColor: orderData.baseColor || '#FFFFFF',
            fontColor: orderData.fontColor || '#000000',
            weightG: parseFloat(orderData.weightG) || 0,
            printTimeMins: parseFloat(orderData.printTimeMins) || 0,
            materialCost: parseFloat(orderData.materialCost) || 0,
            machineCost: parseFloat(orderData.machineCost) || 0,
            laborCost: parseFloat(orderData.laborCost) || 0,
            productionCost: parseFloat(orderData.productionCost) || 0,
            finalAmount: parseFloat(orderData.finalAmount) || 0,
            batchSize: parseInt(orderData.batchSize) || 5,
            upiTxnId: orderData.upiTxnId || '',
            status
        };

        if (GOOGLE_SCRIPT_URL) {
            // Post to Google Sheet App Script
            console.log('Forwarding order to Google Sheets...');
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            const sheetRes = await response.json();
            if (!sheetRes.success) {
                throw new Error(sheetRes.error || 'Failed to save order to Google Sheets');
            }
        } else {
            // Append to local Excel file
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(EXCEL_PATH);
            const sheet = workbook.getWorksheet('Orders');
            
            sheet.addRow([
                order.orderNum,
                order.timestamp,
                order.name,
                order.phone,
                order.productType,
                order.text,
                order.font,
                order.baseColor,
                order.fontColor,
                order.weightG,
                order.printTimeMins,
                order.materialCost,
                order.machineCost,
                order.laborCost,
                order.productionCost,
                order.finalAmount,
                order.batchSize,
                order.upiTxnId,
                order.status
            ]);

            await workbook.xlsx.writeFile(EXCEL_PATH);
        }
        
        // Push to active orders cache
        activeOrders.push(order);

        res.json({ success: true, orderNum, order });
    } catch (err) {
        console.error('Error saving order:', err);
        res.status(500).json({ error: 'Failed to save order to spreadsheet: ' + err.message });
    }
});

// Get all orders (with live fetch support for Google Sheets)
app.get('/api/orders/today', async (req, res) => {
    if (GOOGLE_SCRIPT_URL) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL);
            const data = await response.json();
            activeOrders = normalizeOrders(data);
            return res.json(activeOrders);
        } catch(err) {
            console.error('Error pulling live Google Sheets orders:', err);
            // Fallback to memory cache
            return res.json(activeOrders);
        }
    }
    
    res.json(activeOrders);
});

// Update order status (admin only)
app.patch('/api/order/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, upiTxnId } = req.body;

        if (GOOGLE_SCRIPT_URL) {
            // Forward patch action to Google Sheets App Script
            console.log(`Patching status to Google Sheets for ${id}...`);
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateStatus',
                    orderNum: id,
                    status: status
                })
            });
            const sheetRes = await response.json();
            if (!sheetRes.success) {
                return res.status(404).json({ error: sheetRes.error || 'Failed to update Google Sheets' });
            }
        } else {
            // Excel update
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(EXCEL_PATH);
            const sheet = workbook.getWorksheet('Orders');

            let foundRowIndex = -1;
            sheet.eachRow((row, rowNumber) => {
                if (row.getCell(1).value === id) {
                    foundRowIndex = rowNumber;
                }
            });

            if (foundRowIndex === -1) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const row = sheet.getRow(foundRowIndex);
            if (status) {
                row.getCell(19).value = status;
            }
            if (upiTxnId !== undefined) {
                row.getCell(18).value = upiTxnId;
            }

            await workbook.xlsx.writeFile(EXCEL_PATH);
        }

        // Update local memory cache
        const cacheIndex = activeOrders.findIndex(o => o.orderNum === id);
        if (cacheIndex > -1) {
            if (status) activeOrders[cacheIndex].status = status;
            if (upiTxnId !== undefined) activeOrders[cacheIndex].upiTxnId = upiTxnId;
        }

        res.json({ success: true, order: activeOrders[cacheIndex] });
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// End-of-day summary (admin only): totals + top colour combos + filament grams
app.get('/api/summary/today', requireAdmin, (req, res) => {
    const paid = activeOrders.filter(o => o.status === 'Verified' || o.status === 'Printed');
    const revenue = paid.reduce((s, o) => s + (o.finalAmount || 0), 0);
    const grams = paid.reduce((s, o) => s + (o.weightG || 0), 0);

    // group paid orders by base/font colour combo
    const comboMap = {};
    paid.forEach(o => {
        const key = `${o.baseColor}|${o.fontColor}`;
        if (!comboMap[key]) comboMap[key] = { baseColor: o.baseColor, fontColor: o.fontColor, count: 0, grams: 0 };
        comboMap[key].count += 1;
        comboMap[key].grams += (o.weightG || 0);
    });
    const topCombos = Object.values(comboMap).sort((a, b) => b.count - a.count);

    res.json({
        totalOrders: activeOrders.length,
        paidOrders: paid.length,
        pendingPrints: activeOrders.filter(o => o.status === 'Verified').length,
        revenue,
        filamentGrams: Math.round(grams * 10) / 10,
        topCombos
    });
});

// Debug Google Sheets payload structure
app.get('/api/debug-sheets', async (req, res) => {
    try {
        if (!GOOGLE_SCRIPT_URL) {
            return res.json({ error: 'GOOGLE_SCRIPT_URL is not set' });
        }
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        res.json({
            url: GOOGLE_SCRIPT_URL,
            type: typeof data,
            isArray: Array.isArray(data),
            length: data.length,
            firstItem: data[0] || null,
            rawSample: data.slice ? data.slice(0, 3) : data
        });
    } catch (err) {
        res.json({ error: err.message, stack: err.stack });
    }
});

// Serve the index.html fallback for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const ready = loadActiveOrders();

// Start the server locally. Vercel's Node runtime imports the Express app.
if (!IS_VERCEL) {
ready.then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Roadside Kiosk Backend running on http://localhost:${PORT}`);
        if (GOOGLE_SCRIPT_URL) {
            console.log('Cloud Sync active. Google Sheets is functioning as the primary database.');
        } else {
            console.log('Local Mode active. Excel is functioning as the primary database.');
        }
    });
});
}

module.exports = app;
