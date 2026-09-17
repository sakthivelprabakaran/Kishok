export const MADE_TO_ORDER_NOTICE = 'Ships in 2–3 days';

// Numakers PLA+ swatches. Imperial Red uses the approved customer-facing value.
export const FALLBACK_FILAMENT_COLOURS = Object.freeze([
    { name: 'Imperial Red',      hex: '#C93655', state: 'available', sortOrder: 10 },
    { name: 'Water Blue',        hex: '#1D7D8D', state: 'available', sortOrder: 20 },
    { name: 'Terracotta Orange', hex: '#D67842', state: 'available', sortOrder: 30 },
    { name: 'Pure White',        hex: '#F1ECE1', state: 'available', sortOrder: 40 },
    { name: 'Pitch Black',       hex: '#0E0E10', state: 'available', sortOrder: 50 },
    { name: 'Forest Green',      hex: '#008351', state: 'available', sortOrder: 60 },
    { name: 'Army Green',        hex: '#7C8A68', state: 'available', sortOrder: 70 },
    { name: 'Light Beige',       hex: '#D7CAAB', state: 'available', sortOrder: 80 },
    { name: 'Lemon Yellow',      hex: '#F9A800', state: 'available', sortOrder: 90 },
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

export function approvedFilamentColours(values) {
    // Backwards-compatible export: once the API responds, Admin is the source
    // of truth. Never merge missing rows back from the static fallback because
    // "missing" is how the public API represents an unavailable colour.
    return normalizeFilamentColours(values);
}

export async function loadFilamentColours(fetchImpl = fetch) {
    try {
        const response = await fetchImpl(`/api/filament-colours?t=${Date.now()}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Filament catalogue returned ${response.status}`);
        const payload = await response.json();
        if (Array.isArray(payload && payload.colors)) {
            return approvedFilamentColours(payload.colors);
        }
    } catch (error) {
        console.warn('Using fallback filament colours:', error.message || error);
    }
    return normalizeFilamentColours(FALLBACK_FILAMENT_COLOURS);
}
