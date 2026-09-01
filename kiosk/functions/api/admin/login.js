import { json, fail, guard, readJson, adminConfigured, pinMatches, clientIp, loginBlocked, recordLoginAttempt } from '../../../shared/http.js';

const VALID_PIN_RE = /^\d{4}$/;

export const onRequestPost = guard(async ({ request, env }) => {
    if (!adminConfigured(env)) {
        return json({ success: false, error: 'Admin authentication is not configured' }, 503);
    }

    const ip = clientIp(request);
    if (await loginBlocked(env, ip)) {
        return json({ success: false, error: 'Too many login attempts — try again in 15 minutes.' }, 429);
    }

    const pin = String((await readJson(request)).pin || '').trim();
    if (!VALID_PIN_RE.test(pin)) {
        return json({ success: false, error: 'PIN must be exactly 4 digits' }, 400);
    }

    if (pinMatches(pin, String(env.ADMIN_PIN))) {
        return json({ success: true });
    }

    // Only failures count against the limit (matches skipSuccessfulRequests).
    await recordLoginAttempt(env, ip);
    return json({ success: false, error: 'Invalid PIN' }, 401);
});
