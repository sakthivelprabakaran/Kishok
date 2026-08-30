import { json, guard, requireAdmin } from '../../../shared/http.js';
import { db, rowToOrder } from '../../../shared/db.js';
import { todayRangeIso } from '../../../shared/today.js';

// Admin: same aggregate shape the Express version returned, computed from
// today's rows. Small enough volumes that doing it in JS keeps it readable.
export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const { start, end } = todayRangeIso(env);
    const rows = await db(env).select(
        'orders',
        `select=*&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}`
    );
    const orders = (rows || []).map(rowToOrder);
    const paid = orders.filter(o => o.status === 'Verified' || o.status === 'Printed' || o.status === 'PickedUp');

    const comboMap = {};
    for (const o of paid) {
        const key = `${o.baseColor}|${o.fontColor}`;
        if (!comboMap[key]) comboMap[key] = { baseColor: o.baseColor, fontColor: o.fontColor, count: 0, grams: 0 };
        comboMap[key].count += 1;
        comboMap[key].grams += o.weightG || 0;
    }

    const grams = paid.reduce((s, o) => s + (o.weightG || 0), 0);
    return json({
        totalOrders:    orders.length,
        paidOrders:     paid.length,
        pendingPrints:  orders.filter(o => o.status === 'Verified').length,
        revenue:        paid.reduce((s, o) => s + (o.finalAmount || 0), 0),
        filamentGrams:  Math.round(grams * 10) / 10,
        topCombos:      Object.values(comboMap).sort((a, b) => b.count - a.count),
    });
});
