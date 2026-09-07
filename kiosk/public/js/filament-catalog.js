export const MADE_TO_ORDER_NOTICE = 'Ships in 2–3 days';

export const FALLBACK_FILAMENT_COLOURS = Object.freeze([
    { name: 'Orange', hex: '#FF9933', state: 'available', sortOrder: 10 },
    { name: 'Purple', hex: '#7B2FFF', state: 'available', sortOrder: 20 },
    { name: 'Blue',   hex: '#3A88FE', state: 'available', sortOrder: 30 },
    { name: 'Red',    hex: '#FF6251', state: 'available', sortOrder: 40 },
    { name: 'Green',  hex: '#7ED957', state: 'available', sortOrder: 50 },
    { name: 'Pink',   hex: '#FF61A6', state: 'available', sortOrder: 60 },
    { name: 'Gold',   hex: '#FFD700', state: 'available', sortOrder: 70 },
    { name: 'Black',  hex: '#000000', state: 'available', sortOrder: 80 },
    { name: 'White',  hex: '#FFFFFF', state: 'available', sortOrder: 90 },
]);

const HEX_RE = /^#[0-9A-F]{6}$/;
const STATES = new Set(['available', 'made_to_order', 'unavailable']);

export function normalizeHex(value) {
    const hex = String(value || '').trim().toUpperCase();
    return HEX_RE.test(hex) ? hex : '';
}
export function normalizeFilamentColour(value) {
    const hex = normalizeHex(value && (value.hex || value.hexColor || value.hex_color));
    const name = String(value && value.name || '').trim();
    const state = String(value && (value.state || value.storefrontState || value.storefront_state) || '');
    if (!hex || !name || !STATES.has(state)) return null;
    return {
        id: value.id == null ? null : Number(value.id),
        name,
        hex,
        state,
        notice: state === 'made_to_order' ? MADE_TO_ORDER_NOTICE : '',
        sortOrder: Number(value.sortOrder ?? value.sort_order) || 0,
    };
}

export function normalizeFilamentColours(values, { includeUnavailable = false } = {}) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map(normalizeFilamentColour)
        .filter((colour) => {
            if (!colour || seen.has(colour.hex)) return false;
            if (!includeUnavailable && colour.state === 'unavailable') return false;
            seen.add(colour.hex);
            return true;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function loadFilamentColours(fetchImpl = fetch) {
    try {
        const response = await fetchImpl('/api/filament-colours', {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Filament catalogue returned ${response.status}`);
        const payload = await response.json();
        const colours = normalizeFilamentColours(payload && payload.colors);
        if (colours.length) return colours;
    } catch (error) {
        console.warn('Using fallback filament colours:', error.message || error);
    }
    return FALLBACK_FILAMENT_COLOURS.map((colour) => ({ ...colour, id: null, notice: '' }));
}
