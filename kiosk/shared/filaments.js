export const FILAMENT_STATES = ['available', 'made_to_order', 'unavailable'];
export const SPOOL_STATUSES = ['sealed', 'open', 'empty', 'retired'];
export const MADE_TO_ORDER_NOTICE = 'Ships in 2–3 days';

const HEX_RE = /^#[0-9A-F]{6}$/;

export function normalizedHex(value) {
    const hex = String(value || '').trim().toUpperCase();
    return HEX_RE.test(hex) ? hex : '';
}
function text(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max);
}

function finiteNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function colourToApi(row) {
    return {
        id: Number(row.id),
        name: row.name,
        hex: String(row.hex_color || '').toUpperCase(),
        state: row.storefront_state,
        notice: row.storefront_state === 'made_to_order' ? MADE_TO_ORDER_NOTICE : '',
        sortOrder: Number(row.sort_order) || 0,
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
    };
}

export function spoolToApi(row) {
    return {
        id: Number(row.id),
        colourId: Number(row.colour_id),
        material: row.material,
        brand: row.brand || '',
        lotCode: row.lot_code || '',
        initialWeightG: Number(row.initial_weight_g) || 0,
        remainingWeightG: Number(row.remaining_weight_g) || 0,
        purchaseDate: row.purchase_date || '',
        cost: Number(row.cost) || 0,
        status: row.status,
        notes: row.notes || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
    };
}

export function validateColourInput(body, { partial = false } = {}) {
    const row = {};
    if (!partial || body.name !== undefined) {
        const name = text(body.name, 50);
        if (!name) return { error: 'Colour name is required' };
        row.name = name;
    }
    if (!partial || body.hex !== undefined || body.hexColor !== undefined) {
        const hex = normalizedHex(body.hex ?? body.hexColor);
        if (!hex) return { error: 'Colour must be a 6-digit HEX value such as #FF9933' };
        row.hex_color = hex;
    }
    if (!partial || body.state !== undefined) {
        const state = String(body.state || '');
        if (!FILAMENT_STATES.includes(state)) {
            return { error: `Invalid storefront state. Allowed: ${FILAMENT_STATES.join(', ')}` };
        }
        row.storefront_state = state;
    }
    if (!partial || body.sortOrder !== undefined) {
        const sortOrder = finiteNumber(body.sortOrder);
        if (sortOrder === null || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
            return { error: 'Sort order must be a whole number between 0 and 100000' };
        }
        row.sort_order = sortOrder;
    }
    if (partial && Object.keys(row).length === 0) return { error: 'Nothing to update' };
    row.updated_at = new Date().toISOString();
    return { row };
}

export function validateSpoolInput(body, { partial = false } = {}) {
    const row = {};
    if (!partial || body.colourId !== undefined) {
        const colourId = finiteNumber(body.colourId);
        if (!colourId || !Number.isInteger(colourId) || colourId < 1) {
            return { error: 'A valid colour is required' };
        }
        row.colour_id = colourId;
    }
    if (!partial || body.material !== undefined) {
        const material = text(body.material || 'PLA', 30);
        if (!material) return { error: 'Material is required' };
        row.material = material;
    }
    if (!partial || body.initialWeightG !== undefined) {
        const initial = finiteNumber(body.initialWeightG);
        if (initial === null || initial <= 0 || initial > 100000) {
            return { error: 'Initial weight must be greater than 0g' };
        }
        row.initial_weight_g = initial;
    }
    if (!partial || body.remainingWeightG !== undefined) {
        const remaining = body.remainingWeightG === undefined && !partial
            ? finiteNumber(body.initialWeightG)
            : finiteNumber(body.remainingWeightG);
        if (remaining === null || remaining < 0 || remaining > 100000) {
            return { error: 'Remaining weight must be 0g or more' };
        }
        const initial = row.initial_weight_g ?? finiteNumber(body.initialWeightG);
        if (initial !== null && remaining > initial) {
            return { error: 'Remaining weight cannot exceed initial weight' };
        }
        row.remaining_weight_g = remaining;
    }
    if (!partial || body.status !== undefined) {
        const status = String(body.status || 'sealed');
        if (!SPOOL_STATUSES.includes(status)) {
            return { error: `Invalid spool status. Allowed: ${SPOOL_STATUSES.join(', ')}` };
        }
        row.status = status;
    }
    if (!partial || body.brand !== undefined) row.brand = text(body.brand, 60);
    if (!partial || body.lotCode !== undefined) row.lot_code = text(body.lotCode, 60);
    if (!partial || body.notes !== undefined) row.notes = text(body.notes, 500);
    if (!partial || body.cost !== undefined) {
        const cost = finiteNumber(body.cost ?? 0);
        if (cost === null || cost < 0 || cost > 10000000) return { error: 'Cost must be 0 or more' };
        row.cost = cost;
    }
    if (!partial || body.purchaseDate !== undefined) {
        const date = String(body.purchaseDate || '');
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Purchase date must be YYYY-MM-DD' };
        row.purchase_date = date || null;
    }
    if (partial && Object.keys(row).length === 0) return { error: 'Nothing to update' };
    row.updated_at = new Date().toISOString();
    return { row };
}

export function buildFilamentAdminPayload(colourRows, spoolRows) {
    const spools = (spoolRows || []).map(spoolToApi);
    const byColour = new Map();
    for (const spool of spools) {
        if (!byColour.has(spool.colourId)) byColour.set(spool.colourId, []);
        byColour.get(spool.colourId).push(spool);
    }
    const colours = (colourRows || []).map((row) => {
        const colour = colourToApi(row);
        const colourSpools = byColour.get(colour.id) || [];
        return {
            ...colour,
            spoolCount: colourSpools.length,
            remainingWeightG: colourSpools
                .filter((spool) => !['empty', 'retired'].includes(spool.status))
                .reduce((sum, spool) => sum + spool.remainingWeightG, 0),
            spools: colourSpools,
        };
    });
    return { colours, madeToOrderNotice: MADE_TO_ORDER_NOTICE };
}
