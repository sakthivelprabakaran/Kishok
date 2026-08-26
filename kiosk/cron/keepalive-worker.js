/* Supabase keep-alive — a standalone Cloudflare Worker, NOT a Pages Function.
 *
 * Cloudflare Cron Triggers only exist on Workers, so this cannot live in
 * kiosk/functions/. Deploy it as its own Worker and give it one cron trigger.
 *
 * It calls the kiosk's /api/keepalive endpoint, which runs a real SELECT. That
 * keeps the Supabase free-tier project from pausing after 7 idle days, and means
 * this Worker needs no database credentials of its own.
 *
 * Required environment variable:
 *   KIOSK_BASE_URL   e.g. https://yoursgifts.pages.dev   (no trailing slash)
 */

async function ping(env) {
    const base = (env.KIOSK_BASE_URL || '').replace(/\/+$/, '');
    if (!base) {
        console.error('KEEPALIVE: KIOSK_BASE_URL is not set');
        return { ok: false, error: 'KIOSK_BASE_URL not set' };
    }
    try {
        const res = await fetch(`${base}/api/keepalive`, {
            headers: { 'User-Agent': 'yoursgifts-keepalive/1.0' },
            signal: AbortSignal.timeout(10000),
        });
        const body = await res.text();
        if (!res.ok) {
            // Surfaces in `wrangler tail` / the Worker's log stream.
            console.error(`KEEPALIVE FAILED ${res.status}: ${body.slice(0, 200)}`);
            return { ok: false, status: res.status, body: body.slice(0, 200) };
        }
        console.log(`KEEPALIVE OK: ${body.slice(0, 200)}`);
        return { ok: true, status: res.status };
    } catch (err) {
        console.error(`KEEPALIVE ERROR: ${err.message}`);
        return { ok: false, error: err.message };
    }
}

export default {
    // Cron entry point.
    async scheduled(event, env, ctx) {
        ctx.waitUntil(ping(env));
    },
    // Same logic over HTTP so you can trigger it by hand to confirm it works.
    async fetch(request, env) {
        const result = await ping(env);
        return new Response(JSON.stringify(result), {
            status: result.ok ? 200 : 502,
            headers: { 'Content-Type': 'application/json' },
        });
    },
};
