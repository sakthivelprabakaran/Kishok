import { json, guard } from '../../shared/http.js';
import { db } from '../../shared/db.js';
import { loadProductCatalog } from '../../shared/product-catalog.js';

export const onRequestGet = guard(async ({ env }) => json({
    products: await loadProductCatalog(db(env), { allowFallback: true }),
}));
