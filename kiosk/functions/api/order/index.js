import { json, guard, readJson } from '../../../shared/http.js';
import { db, orderToRow, rowToOrder } from '../../../shared/db.js';
import { priceLine } from '../../../public/js/pricing.js';

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
    const priced = priceLine({ weightG: body.weightG, batchSize: body.batchSize });
    body.finalAmount = priced.unitPrice;
    body.materialCost = priced.breakdown.materialCost;
    body.machineCost = priced.breakdown.machineCost;
    body.laborCost = priced.breakdown.labourCost;
    body.productionCost = priced.breakdown.productionCost;
    body.printTimeMins = priced.breakdown.printTimeMins;

    const saved = await db(env).insert('orders', orderToRow(body));
    const order = rowToOrder(saved);
    return json({ success: true, orderNum: order.orderNum, order }, 201);
});
