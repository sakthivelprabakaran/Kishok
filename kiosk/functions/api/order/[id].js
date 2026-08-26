import { json, guard, readJson, requireAdmin } from '../../../shared/http.js';
import { db, rowToOrder } from '../../../shared/db.js';

const ALLOWED_STATUS = ['Pending', 'Verified', 'Printed', 'Cancelled'];

// Admin: update an order's status / UPI txn id. `id` is the order_num.
export const onRequestPatch = guard(async ({ request, env, params }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const { status, upiTxnId } = await readJson(request);
    const patch = {};
    if (status !== undefined) {
        if (!ALLOWED_STATUS.includes(status)) {
            return json({ error: `Invalid status. Expected one of: ${ALLOWED_STATUS.join(', ')}` }, 400);
        }
        patch.status = status;
    }
    if (upiTxnId !== undefined) patch.upi_txn_id = String(upiTxnId);

    if (Object.keys(patch).length === 0) {
        return json({ error: 'Nothing to update' }, 400);
    }

    const rows = await db(env).update(
        'orders',
        `order_num=eq.${encodeURIComponent(params.id)}`,
        patch
    );
    if (!rows || rows.length === 0) {
        return json({ error: `Order ${params.id} not found` }, 404);
    }
    return json({ success: true, order: rowToOrder(rows[0]) });
});
