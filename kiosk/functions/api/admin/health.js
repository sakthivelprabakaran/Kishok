import { json, guard, requireAdmin, adminConfigured } from '../../../shared/http.js';

export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return json({ adminPinConfigured: adminConfigured(env), status: 'ok' });
});
