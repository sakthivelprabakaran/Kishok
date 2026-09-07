import { json, guard, requireAdmin } from '../../../shared/http.js';
import { db, rowToOrder, rowToOrderItem } from '../../../shared/db.js';
import { adminOrderRangeIso } from '../../../shared/today.js';

const VALID_STATUSES = new Set([
    'Pending', 'Verified', 'Processing', 'QCHold', 'QCPassed', 'Packed',
    'Printed', 'PickedUp', 'Shipped', 'OutForDelivery', 'Delivered',
    'Cancelled', 'PaymentFailed', 'ReturnRequested', 'ReturnReceived', 'Refunded',
]);

function statusFilter(value) {
    const statuses = String(value || '')
        .split(',')
        .map((status) => status.trim())
        .filter((status) => VALID_STATUSES.has(status));
    return [...new Set(statuses)];
}

async function fetchOrders(database, range, statuses) {
    const query = ['select=*'];
    if (range.start) query.push(`created_at=gte.${encodeURIComponent(range.start)}`);
    if (range.end) query.push(`created_at=lt.${encodeURIComponent(range.end)}`);
    if (statuses.length === 1) query.push(`status=eq.${encodeURIComponent(statuses[0])}`);
    if (statuses.length > 1) query.push(`status=in.(${statuses.map(encodeURIComponent).join(',')})`);
    query.push('order=created_at.desc');
    return database.select('orders', query.join('&'));
}

async function attachItems(database, orders) {
    if (!orders.length) return orders;
    const orderNums = orders
        .map((order) => order.orderNum)
        .filter((value) => /^\d{1,10}$/.test(value));
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
    return orders;
}

// Admin order history. Defaults to the most useful operational window while
// retaining /api/orders/today as a backwards-compatible today-only endpoint.
export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const url = new URL(request.url);
    const range = adminOrderRangeIso({
        range: url.searchParams.get('range'),
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
    }, env);
    if (range.error) return json({ error: range.error }, 400);

    const statuses = statusFilter(url.searchParams.get('status'));
    const database = db(env);
    const rows = await fetchOrders(database, range, statuses);
    const orders = await attachItems(database, (rows || []).map(rowToOrder));
    return json({ orders, range });
});
