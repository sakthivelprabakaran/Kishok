import {
    CUSTOMER_PRODUCT_TYPES,
    PRODUCT_DEFINITIONS,
    PRODUCT_LIFECYCLE_STATES,
    defaultProductCatalog,
    defaultProductRecord,
    findProductDefinition,
} from '../public/js/product-registry.js';

const SELECT = [
    'product_type', 'display_name', 'category', 'lifecycle_state', 'sort_order',
    'display_time_minutes', 'badge', 'pause_message', 'resume_at', 'is_featured',
    'created_at', 'updated_at',
].join(',');

export { CUSTOMER_PRODUCT_TYPES, PRODUCT_LIFECYCLE_STATES };

function lifecycleFlags(state) {
    return {
        visible: state === 'active' || state === 'paused',
        orderable: state === 'active',
    };
}

export function rowToProduct(row) {
    const state = PRODUCT_LIFECYCLE_STATES.includes(row.lifecycle_state)
        ? row.lifecycle_state : 'draft';
    return {
        productType: row.product_type,
        displayName: row.display_name,
        category: row.category,
        lifecycleState: state,
        sortOrder: Number(row.sort_order) || 0,
        displayTimeMinutes: Number(row.display_time_minutes) || 0,
        badge: row.badge || '',
        pauseMessage: row.pause_message || '',
        resumeAt: row.resume_at || null,
        isFeatured: Boolean(row.is_featured),
        ...lifecycleFlags(state),
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

export async function loadProductCatalog(database, { allowFallback = false } = {}) {
    try {
        const rows = await database.select('product_catalog', `select=${SELECT}&order=sort_order.asc`);
        const byType = new Map((rows || []).map((row) => [row.product_type, row]));
        return PRODUCT_DEFINITIONS.map((definition) => {
            const row = byType.get(definition.type);
            if (row) return rowToProduct(row);
            return {
                ...defaultProductRecord(definition),
                lifecycleState: 'draft',
                visible: false,
                orderable: false,
            };
        });
    } catch (error) {
        if (!allowFallback) throw error;
        console.error('product catalogue unavailable, using code defaults:', error.message);
        return defaultProductCatalog();
    }
}

export async function requireOrderableProduct(database, productType) {
    const definition = findProductDefinition(productType);
    if (!definition) return { error: 'Unknown product type', status: 400 };

    const rows = await database.select(
        'product_catalog',
        `select=product_type,display_name,lifecycle_state,pause_message,resume_at&product_type=eq.${encodeURIComponent(productType)}&limit=1`
    );
    if (!Array.isArray(rows) || rows.length === 0) {
        return { error: 'This product is not available for ordering.', status: 409 };
    }

    const product = rowToProduct({
        category: definition.category,
        sort_order: definition.sortOrder,
        display_time_minutes: definition.displayTimeMinutes,
        badge: '',
        is_featured: false,
        ...rows[0],
    });
    if (!product.orderable) {
        return {
            error: product.pauseMessage || `${product.displayName} is not accepting new orders right now.`,
            status: 409,
            product,
        };
    }
    return { product };
}

export function validateProductPatch(body = {}) {
    const productType = String(body.productType || '').trim();
    if (!findProductDefinition(productType)) return { error: 'Unknown product type' };

    const patch = {};
    if (body.lifecycleState !== undefined) {
        const state = String(body.lifecycleState || '').trim();
        if (!PRODUCT_LIFECYCLE_STATES.includes(state)) {
            return { error: `Lifecycle state must be one of: ${PRODUCT_LIFECYCLE_STATES.join(', ')}` };
        }
        patch.lifecycle_state = state;
    }
    if (body.displayName !== undefined) {
        const value = String(body.displayName || '').trim();
        if (!value || value.length > 80) return { error: 'Display name must be 1–80 characters' };
        patch.display_name = value;
    }
    if (body.category !== undefined) {
        const value = String(body.category || '').trim();
        if (!['keychain', 'desk'].includes(value)) return { error: 'Category must be keychain or desk' };
        patch.category = value;
    }
    if (body.sortOrder !== undefined) {
        const value = Number(body.sortOrder);
        if (!Number.isInteger(value) || value < 0 || value > 100000) {
            return { error: 'Sort order must be a whole number from 0 to 100000' };
        }
        patch.sort_order = value;
    }
    if (body.displayTimeMinutes !== undefined) {
        const value = Number(body.displayTimeMinutes);
        if (!Number.isInteger(value) || value < 0 || value > 10000) {
            return { error: 'Display time must be a whole number from 0 to 10000 minutes' };
        }
        patch.display_time_minutes = value;
    }
    if (body.badge !== undefined) {
        const value = String(body.badge || '').trim();
        if (value.length > 40) return { error: 'Badge must be at most 40 characters' };
        patch.badge = value;
    }
    if (body.pauseMessage !== undefined) {
        const value = String(body.pauseMessage || '').trim();
        if (value.length > 180) return { error: 'Pause message must be at most 180 characters' };
        patch.pause_message = value;
    }
    if (body.resumeAt !== undefined) {
        const value = body.resumeAt ? new Date(body.resumeAt) : null;
        if (value && Number.isNaN(value.getTime())) return { error: 'Resume date is invalid' };
        patch.resume_at = value ? value.toISOString() : null;
    }
    if (body.isFeatured !== undefined) patch.is_featured = Boolean(body.isFeatured);
    if (Object.keys(patch).length === 0) return { error: 'No supported product fields were provided' };
    patch.updated_at = new Date().toISOString();
    return { productType, patch };
}
