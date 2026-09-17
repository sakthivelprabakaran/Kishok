import { json, guard, readJson, requireAdmin } from '../../../shared/http.js';
import { db } from '../../../shared/db.js';
import { loadStoreStatus, validateStoreStatusPatch } from '../../../shared/store-status.js';

export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return json({ storeStatus: await loadStoreStatus(db(env)) });
});

export const onRequestPatch = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const checked = validateStoreStatusPatch(await readJson(request));
    if (checked.error) return json({ error: checked.error }, 400);

    const database = db(env);
    const rows = await database.update('storefront_settings', 'id=eq.1', checked.patch);
    if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: 'Storefront settings record not found' }, 404);
    }
    return json({ success: true, storeStatus: await loadStoreStatus(database) });
});
