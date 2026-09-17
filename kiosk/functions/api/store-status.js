import { json, guard } from '../../shared/http.js';
import { db } from '../../shared/db.js';
import { loadStoreStatus } from '../../shared/store-status.js';

export const onRequestGet = guard(async ({ env }) => json({
    storeStatus: await loadStoreStatus(db(env), { allowFallback: true }),
}));
