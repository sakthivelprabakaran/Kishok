import { json, guard, readJson, requireAdmin } from '../../../shared/http.js';
import { db, rowToOrderItem } from '../../../shared/db.js';

const PRODUCTION_STATUSES = ['queued', 'printing', 'printed', 'qc_hold', 'qc_passed', 'packed'];

export const onRequestPatch = guard(async ({ request, env, params }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const id = Number(params && params.id);
    if (!Number.isInteger(id) || id < 1) return json({ error: 'Invalid order item id' }, 400);
    const { productionStatus } = await readJson(request);
    if (!PRODUCTION_STATUSES.includes(productionStatus)) {
        return json({ error: `Invalid production status. Allowed: ${PRODUCTION_STATUSES.join(', ')}` }, 400);
    }
    const rows = await db(env).update('order_items', `id=eq.${id}`, {
        production_status: productionStatus,
        production_updated_at: new Date().toISOString(),
    });
    if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'Order item not found' }, 404);
    return json({ success: true, item: rowToOrderItem(rows[0]) });
});
