import { json, fail, guard, readJson, requireCustomer } from '../../shared/http.js';
import { db, authUser, rowToOrder } from '../../shared/db.js';
import { priceOrder } from '../../public/js/pricing.js';

/* POST /api/checkout — turn the signed-in customer's cart into an order.
 *
 * Reads the cart user-scoped (so RLS proves ownership), prices it server-side,
 * then writes the order with the service_role client because order_num, status,
 * prices and dispatch fields are server-owned and must not be writable by the
 * customer whose cart it came from.
 *
 * The order is created UNPAID. No payment gateway is wired yet, so nothing here
 * may imply money changed hands: status starts at 'Pending' and dispatch is
 * blocked until an operator confirms payment.
 */

const MAX_NAME = 100;

function cleanAddress(a = {}) {
    return {
        recipient_name: String(a.recipientName || '').trim().slice(0, MAX_NAME),
        phone: String(a.phone || '').replace(/\D/g, ''),
        line1: String(a.line1 || '').trim().slice(0, 200),
        line2: String(a.line2 || '').trim().slice(0, 200),
        city: String(a.city || '').trim().slice(0, 100),
        state: String(a.state || '').trim().slice(0, 100),
        pincode: String(a.pincode || '').replace(/\D/g, ''),
        country: 'IN',
    };
}

function addressProblems(a) {
    const problems = [];
    if (!a.recipient_name) problems.push('recipient name');
    if (!/^[0-9]{10}$/.test(a.phone)) problems.push('a 10-digit phone number');
    if (!a.line1) problems.push('address line 1');
    if (!a.city) problems.push('city');
    if (!a.state) problems.push('state');
    // India Post PIN codes are six digits and never begin with 0.
    if (!/^[1-9][0-9]{5}$/.test(a.pincode)) problems.push('a valid 6-digit PIN code');
    return problems;
}

export const onRequestPost = guard(async ({ request, env }) => {
    const auth = requireCustomer(request);
    if (auth instanceof Response) return auth;

    // Resolve the owner through the auth server (which validates the signature),
    // NOT by decoding the JWT locally. Without user_id on the order, the RLS
    // policy `auth.uid() = user_id` can never match and the customer would never
    // see their own order again.
    const user = await authUser(env, auth.accessToken);
    if (!user) return fail('Your session has expired — please sign in again.', 401);

    const body = await readJson(request);
    const method = body.fulfilmentMethod === 'ship' ? 'ship' : 'pickup';

    const contactName = String(body.contactName || '').trim().slice(0, MAX_NAME);
    const contactPhone = String(body.contactPhone || '').replace(/\D/g, '');
    if (!contactName) return fail('We need a name for the order', 400);
    if (!/^[0-9]{10}$/.test(contactPhone)) return fail('Phone must be exactly 10 digits', 400);

    let address = cleanAddress({});
    if (method === 'ship') {
        address = cleanAddress(body.address);
        const problems = addressProblems(address);
        if (problems.length) {
            return fail(`To ship this order we still need ${problems.join(', ')}.`, 400);
        }
    }

    /* ── Read the cart as the customer, so RLS proves it is theirs ── */
    const userClient = db(env, auth);
    const cartRows = await userClient.select(
        'cart_items',
        'select=id,product_type,text_value,quantity,design,weight_g&order=created_at.asc'
    );
    if (!Array.isArray(cartRows) || cartRows.length === 0) {
        return fail('Your cart is empty', 409);
    }

    /* ── Price server-side. The client's numbers are never consulted. ── */
    const quote = priceOrder(cartRows.map((r) => ({
        productType: r.product_type,
        text: r.text_value,
        design: r.design || {},
        quantity: Number(r.quantity),
        weightG: Number(r.weight_g),
    })));

    /* ── Write the order with service_role: these columns are server-owned ── */
    const admin = db(env);
    const first = quote.lines[0];

    // public.orders keeps the kiosk's single-design columns; the first line
    // populates them so the existing operator dashboard and reports keep working
    // unchanged, while order_items carries the full basket.
    const orderRow = {
        user_id: user.id,           // ownership: lets RLS show the customer their order
        customer_name: contactName,
        phone: contactPhone,
        product_type: first.productType,
        text_value: first.text,
        wordart_base: (first.design && first.design.wordartBase) || 'none',
        font: (first.design && first.design.font) || 'Standard',
        base_color: (first.design && first.design.colors && first.design.colors.base) || '#FFFFFF',
        font_color: (first.design && first.design.colors && first.design.colors.font) || '#000000',
        weight_g: quote.lines.reduce((n, l) => n + (Number(l.weightG) || 0) * l.breakdown.quantity, 0),
        final_amount: quote.total,
        quantity: quote.itemCount,
        shipping_fee: quote.shippingFee,
        fulfilment_method: method,
        status: 'Pending',          // unpaid until an operator or gateway confirms
        ...(method === 'ship' ? {
            ship_recipient_name: address.recipient_name,
            ship_phone: address.phone,
            ship_line1: address.line1,
            ship_line2: address.line2,
            ship_city: address.city,
            ship_state: address.state,
            ship_pincode: address.pincode,
            ship_country: address.country,
        } : {}),
    };

    const saved = await admin.insert('orders', orderRow);
    const order = rowToOrder(saved);

    /* ── Freeze the basket onto the order, atomically ──
       One bulk insert = one PostgREST request = one transaction. A loop of single
       inserts could fail halfway and leave an order with a partial basket. If the
       bulk insert fails outright, cancel the order rather than leave a header
       with no lines. */
    try {
        await admin.insertMany('order_items', quote.lines.map((line) => ({
            order_num: order.orderNum,
            product_type: line.productType,
            text_value: line.text,
            quantity: line.breakdown.quantity,
            design: line.design || {},
            unit_price: line.unitPrice,
            line_total: line.lineTotal,
            weight_g: line.weightG || 0,
        })));
    } catch (err) {
        console.error('order_items insert failed, cancelling order', order.orderNum, err.message);
        try {
            await admin.update('orders', `order_num=eq.${encodeURIComponent(order.orderNum)}`,
                { status: 'Cancelled' });
        } catch (undoErr) {
            console.error('could not cancel orphaned order', order.orderNum, undoErr.message);
        }
        return fail('Could not save your order — nothing was charged. Please try again.', 500);
    }

    /* ── Empty the cart, as the customer ── */
    // Deliberately last: if this fails the order still exists and the customer can
    // clear the cart themselves, whereas clearing first could lose the basket with
    // no order to show for it.
    try {
        await userClient.remove('cart_items', 'id=gt.0');
    } catch (err) {
        console.error('cart clear after checkout failed:', err.message);
    }

    return json({
        success: true,
        orderNum: order.orderNum,
        fulfilmentMethod: method,
        paid: false,
        totals: {
            subtotal: quote.subtotal,
            shippingFee: quote.shippingFee,
            total: quote.total,
            itemCount: quote.itemCount,
        },
    }, 201);
});
