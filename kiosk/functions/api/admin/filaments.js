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

export const onRequestDelete = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const body = await readJson(request);
    if (body.resource !== 'colour') {
        return json({ error: 'Only filament colours can be permanently deleted' }, 400);
    }
    const id = validId(body.id);
    if (!id) return json({ error: 'A valid id is required' }, 400);

    const database = db(env);
    const colours = await database.select('filament_colours', `select=id,name&id=eq.${id}&limit=1`);
    if (!Array.isArray(colours) || colours.length === 0) {
        return json({ error: 'Filament colour not found' }, 404);
    }

    const spools = await database.select('filament_spools', `select=id&colour_id=eq.${id}&limit=1`);
    if (Array.isArray(spools) && spools.length > 0) {
        return json({
            error: 'This colour has spool history and cannot be deleted. Mark it Unavailable to preserve inventory records.',
        }, 409);
    }

    await database.remove('filament_colours', `id=eq.${id}`);
    return json({ success: true, deletedColour: colours[0], ...await payload(database) });
});
