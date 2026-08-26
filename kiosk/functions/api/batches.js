import { json, guard, readJson, requireAdmin } from '../../shared/http.js';
import { db, rowToBatch } from '../../shared/db.js';

// Public: the storefront reads this to show "Batch Savings" combos.
export const onRequestGet = guard(async ({ env }) => {
    const rows = await db(env).select('batches', 'select=*&order=updated_at.desc');
    return json((rows || []).map(rowToBatch));
});

// Admin: upsert a combo, or remove it when count <= 0 (same semantics as before).
export const onRequestPost = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;

    const { baseColor, fontColor, count } = await readJson(request);
    if (!baseColor || !fontColor) {
        return json({ error: 'Missing baseColor or fontColor' }, 400);
    }

    const d = db(env);
    // NB: server.js used `parseInt(count) || 5`, which turned 0 into 5 — so its own
    // `countVal <= 0` removal branch could never fire and operators could not clear
    // a combo. Treat any valid number (including 0) as given; only fall back on junk.
    const parsed = parseInt(count, 10);
    const countVal = Number.isFinite(parsed) ? parsed : 5;
    const filter = `base_color=eq.${encodeURIComponent(baseColor)}&font_color=eq.${encodeURIComponent(fontColor)}`;

    if (countVal <= 0) {
        await d.remove('batches', filter);
    } else {
        await d.upsert('batches', {
            base_color: baseColor,
            font_color: fontColor,
            name: `${String(baseColor).toUpperCase()}/${String(fontColor).toUpperCase()}`,
            count: countVal,
            updated_at: new Date().toISOString(),
        }, 'base_color,font_color');
    }

    const rows = await d.select('batches', 'select=*&order=updated_at.desc');
    return json({ success: true, batches: (rows || []).map(rowToBatch) });
});
