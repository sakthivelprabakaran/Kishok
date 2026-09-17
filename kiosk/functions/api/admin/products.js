import { json, guard, readJson, requireAdmin } from '../../../shared/http.js';
import { db } from '../../../shared/db.js';
import { loadProductCatalog, validateProductPatch } from '../../../shared/product-catalog.js';

export const onRequestGet = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    return json({ products: await loadProductCatalog(db(env)) });
});

export const onRequestPatch = guard(async ({ request, env }) => {
    const denied = requireAdmin(request, env);
    if (denied) return denied;
    const checked = validateProductPatch(await readJson(request));
    if (checked.error) return json({ error: checked.error }, 400);

    const database = db(env);
    const rows = await database.update(
        'product_catalog',
        `product_type=eq.${encodeURIComponent(checked.productType)}`,
        checked.patch
    );
    if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: 'Product catalogue record not found' }, 404);
    }
    return json({ success: true, products: await loadProductCatalog(database) });
});
