import { json, guard } from '../../shared/http.js';
import { db } from '../../shared/db.js';

/* Public, cheap, and deliberately hits Postgres.
 *
 * Supabase free projects pause after 7 days of *database* inactivity, so a
 * keep-alive has to issue a real query — /api/health only reads env vars and
 * would let the project idle into a pause while reporting "ok".
 *
 * Pinged daily by the separate Worker in kiosk/cron/ (Pages Functions cannot
 * carry Cron Triggers themselves).
 */
export const onRequestGet = guard(async ({ env }) => {
    const rows = await db(env).select('batches', 'select=id&limit=1');
    return json({
        ok: true,
        queried: 'batches',
        rows: Array.isArray(rows) ? rows.length : 0,
        timestamp: new Date().toISOString(),
    });
});
