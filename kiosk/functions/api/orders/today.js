import { json, guard, requireAdmin } from '../../../shared/http.js';
import { db, rowToOrder } from '../../../shared/db.js';
import { todayRangeIso } from '../../../shared/today.js';

// Admin: today's orders, newest first.
export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const { start, end } = todayRangeIso(env);
    const rows = await db(env).select(
        'orders',
        `select=*&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&order=created_at.desc`
    );
    return json((rows || []).map(rowToOrder));
});
