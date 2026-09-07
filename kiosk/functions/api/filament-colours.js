import { json, guard } from '../../shared/http.js';
import { db } from '../../shared/db.js';
import { colourToApi, MADE_TO_ORDER_NOTICE } from '../../shared/filaments.js';

export const onRequestGet = guard(async ({ env }) => {
    const rows = await db(env).select(
        'filament_colours',
        'select=id,name,hex_color,storefront_state,sort_order,updated_at&order=sort_order.asc'
    );
    const colors = (rows || [])
        .filter((row) => row.storefront_state !== 'unavailable')
        .map(colourToApi);
    return json({ colors, madeToOrderNotice: MADE_TO_ORDER_NOTICE });
});
