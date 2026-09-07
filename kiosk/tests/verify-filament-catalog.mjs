import assert from 'node:assert/strict';
import {
    FALLBACK_FILAMENT_COLOURS,
    MADE_TO_ORDER_NOTICE,
    loadFilamentColours,
    normalizeFilamentColours,
} from '../public/js/filament-catalog.js';

const normalized = normalizeFilamentColours([
    { id: 1, name: 'Orange', hex: '#ff9933', state: 'available', sortOrder: 20 },
    { id: 2, name: 'Teal', hex: '#00b5c8', state: 'made_to_order', sortOrder: 10 },
    { id: 3, name: 'Hidden', hex: '#123456', state: 'unavailable', sortOrder: 1 },
    { id: 4, name: 'Duplicate', hex: '#00B5C8', state: 'available', sortOrder: 30 },
    { id: 5, name: 'Invalid', hex: 'red', state: 'available', sortOrder: 40 },
]);

assert.deepEqual(normalized.map((colour) => colour.name), ['Teal', 'Orange']);
assert.equal(normalized[0].hex, '#00B5C8');
assert.equal(normalized[0].notice, MADE_TO_ORDER_NOTICE);

const loaded = await loadFilamentColours(async () => new Response(JSON.stringify({
    colors: [
        { id: 8, name: 'Gold', hex: '#FFD700', state: 'available', sortOrder: 1 },
    ],
}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
assert.equal(loaded.length, 1);
assert.equal(loaded[0].name, 'Gold');

const fallback = await loadFilamentColours(async () => new Response('{}', { status: 503 }));
assert.equal(fallback.length, FALLBACK_FILAMENT_COLOURS.length);
assert(fallback.every((colour) => colour.state === 'available'));

console.log('PASS  filament catalogue normalization, filtering, made-to-order notice, and fallback');
