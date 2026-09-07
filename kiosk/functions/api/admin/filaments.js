import { json, guard, readJson, requireAdmin } from '../../../shared/http.js';
import { db } from '../../../shared/db.js';
import {
    buildFilamentAdminPayload,
    validateColourInput,
    validateSpoolInput,
} from '../../../shared/filaments.js';

async function payload(database) {
    const [colours, spools] = await Promise.all([
        database.select('filament_colours', 'select=*&order=sort_order.asc'),
        database.select('filament_spools', 'select=*&order=updated_at.desc'),
    ]);
    return buildFilamentAdminPayload(colours, spools);
}

function validId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : 0;
}

export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return json(await payload(db(env)));
});
export const onRequestPost = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await readJson(request);
    const database = db(env);
    if (body.resource === 'colour') {
        const checked = validateColourInput(body);
        if (checked.error) return json({ error: checked.error }, 400);
        await database.insert('filament_colours', checked.row);
    } else if (body.resource === 'spool') {
        const checked = validateSpoolInput(body);
        if (checked.error) return json({ error: checked.error }, 400);
        await database.insert('filament_spools', checked.row);
    } else {
        return json({ error: 'Resource must be colour or spool' }, 400);
    }
    return json({ success: true, ...await payload(database) }, 201);
});

export const onRequestPatch = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await readJson(request);
    const id = validId(body.id);
    if (!id) return json({ error: 'A valid id is required' }, 400);
    const database = db(env);
    let rows;
    if (body.resource === 'colour') {
        const checked = validateColourInput(body, { partial: true });
        if (checked.error) return json({ error: checked.error }, 400);
        rows = await database.update('filament_colours', `id=eq.${id}`, checked.row);
    } else if (body.resource === 'spool') {
        const checked = validateSpoolInput(body, { partial: true });
        if (checked.error) return json({ error: checked.error }, 400);
        rows = await database.update('filament_spools', `id=eq.${id}`, checked.row);
    } else {
        return json({ error: 'Resource must be colour or spool' }, 400);
    }
    if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'Inventory record not found' }, 404);
    return json({ success: true, ...await payload(database) });
});
