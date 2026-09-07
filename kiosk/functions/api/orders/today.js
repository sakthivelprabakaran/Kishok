import { json, guard, requireAdmin } from '../../../shared/http.js';
import { db, rowToOrder, rowToOrderItem } from '../../../shared/db.js';
import { todayRangeIso } from '../../../shared/today.js';

// Admin: today's orders, newest first.
export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const { start, end } = todayRangeIso(env);
    const database = db(env);
    const rows = await database.select(
        'orders',
        `select=*&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&order=created_at.desc`
    );
    const orders = (rows || []).map(rowToOrder);
    if (!orders.length) return json([]);

    const orderNums = orders.map((order) => order.orderNum).filter((value) => /^\d{1,10}$/.test(value));
    const itemRows = orderNums.length
        ? await database.select(
            'order_items',
            `select=*&order_num=in.(${orderNums.join(',')})&order=id.asc`
        )
        : [];
    const byOrder = new Map();
    for (const row of itemRows || []) {
        const item = rowToOrderItem(row);
        if (!byOrder.has(item.orderNum)) byOrder.set(item.orderNum, []);
        byOrder.get(item.orderNum).push(item);
    }
    for (const order of orders) order.items = byOrder.get(order.orderNum) || [];
    return json(orders);
});
