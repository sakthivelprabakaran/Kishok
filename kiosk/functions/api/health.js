import { json, guard } from '../../shared/http.js';

// Public deployment check. Mirrors the old /api/health shape so existing
// monitoring keeps working; "cloudSyncConfigured" now means Supabase is wired.
export const onRequestGet = guard(async ({ env }) => json({
    ok: true,
    service: 'kiosk-api',
    backend: 'supabase',
    cloudSyncConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    timestamp: new Date().toISOString(),
}));
