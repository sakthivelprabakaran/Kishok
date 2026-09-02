/* Order pricing — the single source of truth for what a customer pays.
 * ============================================================================
 * This file lives in public/js/ so the BROWSER (kiosk-app.js) and the
 * SERVER (functions/api/checkout.js, functions/api/order/index.js) import the
 * same module. That is deliberate: the bug this replaces was the client showing
 * one number while the server charged another. One file cannot drift from
 * itself.
 *
 * The client uses it for display; the server's result is the one charged.
 *
 * The cost model and its constants come from kiosk-app.js, where they were
 * already computed and then discarded in favour of a hardcoded ₹10 test value:
 *
 *     material  = weight_g x MATERIAL_RATE
 *     machine   = (weight_g / THROUGHPUT_G_PER_HOUR) x MACHINE_RATE
 *     labour    = SETUP_PER_BATCH / batch_size + POST_PROCESS
 *     production = material + machine + labour
 *     price      = ceil(production x FAILURE_BUFFER)
 *
 * ⚠️ NO PROFIT MARGIN IS APPLIED. This returns cost-to-produce plus a 10%
 * failure allowance. It is the number the old code was computing, so adopting it
 * changes nothing about the business model — but it is a floor, not a selling
 * price. Set MARGIN_MULTIPLIER once the owner decides the markup.
 *
 * WEIGHT IS STILL CLIENT-REPORTED. The browser derives it from real geometry,
 * but a hostile client can send any number, so billable weight is clamped to
 * [MIN, MAX]_BILLABLE_WEIGHT_G. That bounds the damage (a lie can save at most
 * the difference to the floor), it does not eliminate it — the operator sees the
 * design and the weight on the order and remains the final check before
 * print/dispatch.
 * ============================================================================ */

export const RATES = {
    MATERIAL_RATE: 1.50,          // ₹ per gram of filament
    MACHINE_RATE: 25.00,          // ₹ per printer-hour (depreciation, power, upkeep)
    THROUGHPUT_G_PER_HOUR: 9.0,   // grams laid down per hour at kiosk settings
    SETUP_PER_BATCH: 30.00,       // ₹ per batch, divided across the batch
    POST_PROCESS: 5.00,           // ₹ per item, cleanup and finishing
    FAILURE_BUFFER: 1.10,         // 10% allowance for failed prints
    MARGIN_MULTIPLIER: 1.00,      // ⚠️ 1.00 = sold at cost. Owner decision.
    DEFAULT_BATCH_SIZE: 5,
    MIN_PRICE: 10.00,             // never charge less than the payment floor
    MIN_BILLABLE_WEIGHT_G: 2.0,   // lightest printable piece; clamps hostile input
    MAX_BILLABLE_WEIGHT_G: 400.0, // heaviest single piece the bed can take
};

/**
 * Price one line.
 * @param {{weightG:number, quantity?:number, batchSize?:number}} line
 * @returns {{unitPrice:number, lineTotal:number, breakdown:object}}
 */
export function priceLine(line) {
    const r = RATES;

    // A deliberate 0 must not silently become a default; only a non-finite or
    // negative weight falls back. Billable weight is clamped so a hostile client
    // cannot price a desk organizer as if it weighed a gram.
    const rawWeight = Number(line && line.weightG);
    const unclamped = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 0;
    const weightG = Math.min(r.MAX_BILLABLE_WEIGHT_G, Math.max(r.MIN_BILLABLE_WEIGHT_G, unclamped));

    const quantity = clampInt(line && line.quantity, 1, 20, 1);
    const batchSize = clampInt(line && line.batchSize, 1, 100, r.DEFAULT_BATCH_SIZE);

    const printTimeMins = (weightG / r.THROUGHPUT_G_PER_HOUR) * 60;
    const materialCost = weightG * r.MATERIAL_RATE;
    const machineCost = (printTimeMins / 60) * r.MACHINE_RATE;
    const labourCost = (r.SETUP_PER_BATCH / batchSize) + r.POST_PROCESS;
    const productionCost = materialCost + machineCost + labourCost;

    const withBuffer = productionCost * r.FAILURE_BUFFER * r.MARGIN_MULTIPLIER;
    const unitPrice = Math.max(r.MIN_PRICE, Math.ceil(withBuffer));

    return {
        unitPrice,
        lineTotal: unitPrice * quantity,
        breakdown: {
            weightG: round2(weightG),
            printTimeMins: Math.round(printTimeMins),
            materialCost: round2(materialCost),
            machineCost: round2(machineCost),
            labourCost: round2(labourCost),
            productionCost: round2(productionCost),
            batchSize,
            quantity,
        },
    };
}

/**
 * Price a whole cart.
 * @param {Array} lines  each { weightG, quantity }
 * @param {{shippingFee?:number}} options
 */
export function priceOrder(lines, options = {}) {
    const priced = (Array.isArray(lines) ? lines : []).map((line) => {
        const p = priceLine(line);
        return { ...line, unitPrice: p.unitPrice, lineTotal: p.lineTotal, breakdown: p.breakdown };
    });

    const subtotal = priced.reduce((n, l) => n + l.lineTotal, 0);
    const rawFee = Number(options.shippingFee);
    const shippingFee = Number.isFinite(rawFee) && rawFee > 0 ? round2(rawFee) : 0;

    return {
        lines: priced,
        subtotal: round2(subtotal),
        shippingFee,
        total: round2(subtotal + shippingFee),
        itemCount: priced.reduce((n, l) => n + (l.breakdown ? l.breakdown.quantity : 1), 0),
    };
}

function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}
