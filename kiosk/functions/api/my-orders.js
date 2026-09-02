import { json, fail, guard, requireCustomer } from '../../shared/http.js';
import { db } from '../../shared/db.js';

/* GET /api/my-orders            — the signed-in customer's orders, newest first
 * GET /api/my-orders?order=0042 — one order with its frozen lines and previews
 *
 * Everything here runs user-scoped, so RLS answers the only question that
 * matters: whose orders are these? The list query has no user_id filter in the
 * code — the policy `auth.uid() = user_id` IS the filter, and adding one here
 * would hide a policy regression instead of surfacing it.
 *
 * The detail view fetches the ORDER first and 404s if RLS returns nothing, and
 * only then fetches its lines. That ordering is deliberate defence in depth:
 * order_items has its own EXISTS-on-parent policy, but even if that policy were
 * dropped by mistake, another customer's order number still dead-ends here at
 * the ownership check on the parent.
 */

const ORDER_COLS = 'order_num,created_at,status,fulfilment_method,final_amount,'
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

export const onRequestGet = guard(async ({ request, env }) => {
    const auth = requireCustomer(request);
    if (auth instanceof Response) return auth;

    const client = db(env, auth);
    const url = new URL(request.url);
    const orderNum = (url.searchParams.get('order') || '').trim();

    /* ── detail ── */
    if (orderNum) {
        if (!/^\d{1,10}$/.test(orderNum)) return fail('Invalid order number', 400);

        const rows = await client.select(
            'orders',
            `select=${ORDER_COLS}&order_num=eq.${encodeURIComponent(orderNum)}&limit=1`
        );
        if (!Array.isArray(rows) || rows.length === 0) {
            // Not found OR not theirs — indistinguishable on purpose.
            return fail('Order not found', 404);
        }

        const itemRows = await client.select(
            'order_items',
            `select=product_type,text_value,quantity,design,preview,unit_price,line_total`
            + `&order_num=eq.${encodeURIComponent(orderNum)}&order=id.asc`
        );

        return json({
            order: toCustomerOrder(rows[0]),
            items: Array.isArray(itemRows) ? itemRows.map(toCustomerItem) : [],
        });
    }

    /* ── list ── */
    const rows = await client.select(
        'orders',
        `select=${ORDER_COLS}&order=created_at.desc&limit=50`
    );
    return json({
        orders: Array.isArray(rows) ? rows.map(toCustomerOrder) : [],
    });
});
