export const DEFAULT_STORE_STATUS = Object.freeze({
    acceptingOrders: true,
    pauseMessage: '',
    resumeAt: null,
    updatedAt: null,
});

const SELECT = 'id,accepting_orders,pause_message,resume_at,updated_at';

export function rowToStoreStatus(row = {}) {
    return {
        acceptingOrders: row.accepting_orders !== false,
        pauseMessage: String(row.pause_message || ''),
        resumeAt: row.resume_at || null,
        updatedAt: row.updated_at || null,
    };
}

export async function loadStoreStatus(database, { allowFallback = false } = {}) {
    try {
        const rows = await database.select('storefront_settings', `select=${SELECT}&id=eq.1&limit=1`);
        if (!Array.isArray(rows) || rows.length === 0) {
            if (allowFallback) return { ...DEFAULT_STORE_STATUS };
            throw new Error('Storefront settings record not found');
        }
        return rowToStoreStatus(rows[0]);
    } catch (error) {
        if (!allowFallback) throw error;
        console.error('storefront status unavailable, accepting orders by default:', error.message);
        return { ...DEFAULT_STORE_STATUS };
    }
}

export async function requireStoreAcceptingOrders(database) {
    const status = await loadStoreStatus(database);
    if (status.acceptingOrders) return { status };
    return {
        error: status.pauseMessage || 'New orders are temporarily paused. Please check back shortly.',
        statusCode: 409,
        storeStatus: status,
    };
}

export function validateStoreStatusPatch(body = {}) {
    const patch = {};
    if (body.acceptingOrders !== undefined) {
        if (typeof body.acceptingOrders !== 'boolean') {
            return { error: 'Accepting orders must be true or false' };
        }
        patch.accepting_orders = body.acceptingOrders;
    }
    if (body.pauseMessage !== undefined) {
        const value = String(body.pauseMessage || '').trim();
        if (value.length > 240) return { error: 'Pause message must be at most 240 characters' };
        patch.pause_message = value;
    }
    if (body.resumeAt !== undefined) {
        const value = body.resumeAt ? new Date(body.resumeAt) : null;
        if (value && Number.isNaN(value.getTime())) return { error: 'Resume date is invalid' };
        patch.resume_at = value ? value.toISOString() : null;
    }
    if (Object.keys(patch).length === 0) return { error: 'No supported store fields were provided' };
    patch.updated_at = new Date().toISOString();
    return { patch };
}
