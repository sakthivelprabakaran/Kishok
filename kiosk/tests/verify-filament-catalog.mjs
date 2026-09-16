import assert from 'node:assert/strict';
import {
    FALLBACK_FILAMENT_COLOURS,
    MADE_TO_ORDER_NOTICE,
    approvedFilamentColours,
    loadFilamentColours,
    normalizeFilamentColours,
} from '../public/js/filament-catalog.js';

assert.deepEqual(
    FALLBACK_FILAMENT_COLOURS.map(({ name, hex }) => [name, hex]),
    [
        ['Imperial Red', '#7A414C'],
        ['Water Blue', '#1D7D8D'],
        ['Terracotta Orange', '#D67842'],
        ['Pure White', '#F1ECE1'],
        ['Pitch Black', '#0E0E10'],
        ['Forest Green', '#008351'],
        ['Army Green', '#50533C'],
        ['Light Beige', '#D7CAAB'],
        ['Lemon Yellow', '#F9A800'],
    ],
    'fallback selector must contain only the nine approved filament colours'
);
assert(FALLBACK_FILAMENT_COLOURS.every((colour) => !colour.approximate));

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

const approved = approvedFilamentColours([
    { id: 8, name: 'Old Gold', hex: '#FFD700', state: 'available', sortOrder: 1 },
    { id: 9, name: 'Forest Green', hex: '#008351', state: 'made_to_order', sortOrder: 60 },
]);
assert.equal(approved.length, 9);
assert(!approved.some((colour) => colour.hex === '#FFD700'));
assert.equal(approved.find((colour) => colour.hex === '#008351').notice, MADE_TO_ORDER_NOTICE);

const loaded = await loadFilamentColours(async () => new Response(JSON.stringify({
    colors: [
        { id: 8, name: 'Old Gold', hex: '#FFD700', state: 'available', sortOrder: 1 },
        { id: 9, name: 'Forest Green', hex: '#008351', state: 'made_to_order', sortOrder: 60 },
    ],
}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
assert.equal(loaded.length, 9);
assert(!loaded.some((colour) => colour.hex === '#FFD700'));
assert.equal(loaded.find((colour) => colour.hex === '#008351').state, 'made_to_order');

const fallback = await loadFilamentColours(async () => new Response('{}', { status: 503 }));
assert.equal(fallback.length, FALLBACK_FILAMENT_COLOURS.length);
assert(fallback.every((colour) => colour.state === 'available'));

console.log('PASS  filament catalogue normalization, filtering, made-to-order notice, and fallback');
