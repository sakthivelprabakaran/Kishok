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
 *
 * Also prunes stale login_attempts (older than 1 day) to keep the table small.
 */
export const onRequestGet = guard(async ({ env }) => {
    const d = db(env);
    const rows = await d.select('batches', 'select=id&limit=1');

    // Prune login attempts older than 1 day (fire-and-forget)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
        await d.remove('login_attempts', `at=lt.${encodeURIComponent(cutoff)}`);
    } catch (err) {
        console.error('login_attempts prune failed:', err.message);
    }

    return json({
        ok: true,
        queried: 'batches',
        rows: Array.isArray(rows) ? rows.length : 0,
        pruned: 'login_attempts',
        timestamp: new Date().toISOString(),
    });
});
