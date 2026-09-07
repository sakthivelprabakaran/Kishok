import { json, guard, readJson } from '../../../shared/http.js';
import { db, orderToRow, rowToBatch, rowToOrder } from '../../../shared/db.js';
import { priceLine, RATES } from '../../../public/js/pricing.js';
import { findBatchDiscount } from '../../../public/js/batch-offers.js';

// Public: place an order. The order number is assigned by a Postgres sequence,
// so concurrent kiosk submissions can no longer collide the way the
// read-last-row-then-increment logic could.
export const onRequestPost = guard(async ({ request, env }) => {
    const body = await readJson(request);

    if (!body.name || !body.phone || !body.productType || !body.text) {
        return json({ error: 'Missing required fields: name, phone, productType, text' }, 400);
    }
    if (typeof body.productType !== 'string' || body.productType.length > 40) {
        return json({ error: 'Invalid productType' }, 400);
    }

    // Price server-side. The browser computes the same figure from the same
    // shared module for display, so honest clients already agree with this
    // number — and a tampered finalAmount is simply overwritten, never stored.
    let batches = [];
    try {
        const rows = await db(env).select('batches', 'select=*&order=updated_at.desc');
        batches = (rows || []).map(rowToBatch);
    } catch (err) {
        console.error('quick-order batch lookup failed:', err.message);
    }
    const fontParts = String(body.fontColor || '').split('/');
    const design = {
        layers: body.layers === '2L' ? '2L' : '3L',
        colors: {
            base: body.baseColor,
            outline: fontParts.length === 2 ? fontParts[0] : '',
            font: fontParts.length === 2 ? fontParts[1] : body.fontColor,
        },
    };
    const offer = findBatchDiscount({
        productType: body.productType,
        design,
        weightG: body.weightG,
    }, batches, priceLine, RATES.DEFAULT_BATCH_SIZE);
    const priced = priceLine({
        weightG: body.weightG,
        batchSize: offer ? offer.batchSize : RATES.DEFAULT_BATCH_SIZE,
    });
    body.finalAmount = priced.unitPrice;
    body.materialCost = priced.breakdown.materialCost;
    body.machineCost = priced.breakdown.machineCost;
    body.laborCost = priced.breakdown.labourCost;
    body.productionCost = priced.breakdown.productionCost;
    body.printTimeMins = priced.breakdown.printTimeMins;
    body.batchSize = priced.breakdown.batchSize;

    const saved = await db(env).insert('orders', orderToRow(body));
    const order = rowToOrder(saved);
    return json({ success: true, orderNum: order.orderNum, order }, 201);
});
