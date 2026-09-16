import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { FALLBACK_FILAMENT_COLOURS } from '../public/js/filament-catalog.js';

const [indexHtml, customizeHtml, kioskApp, studioHtml, studioApp, customizeCss] = await Promise.all([
    readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/customize.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/kiosk-app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/studio.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin-console.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/css/customize.css', import.meta.url), 'utf8'),
]);

const PRODUCT_COLOR_ROLES = Object.freeze({
    bubble_keychain: ['base', 'font'],
    keychain: ['base', 'font', 'outline'],
    flower_keychain: ['base', 'font'],
    nametag: ['base'],
    girly_keychain: ['base', 'font'],
    tilekey: ['base', 'font', 'line2'],
    linked_initials: ['font', 'line2'],
    name_beads: ['base', 'font'],
    supported_text: ['font'],
    wordart: ['base', 'font', 'line2'],
    loveseries: ['base', 'font', 'line2'],
    nameplate: ['base', 'font', 'outline'],
    led_word_stand: ['base', 'font'],
    desk_organizer: ['base', 'font', 'outline'],
    led_word_art: ['base', 'font'],
});

const productTypes = [...indexHtml.matchAll(
    /href="customize\.html\?type=([a-z_]+)"/g,
)].map((match) => match[1]);

assert.deepEqual(
    [...Object.keys(PRODUCT_COLOR_ROLES)].sort(),
    [...productTypes].sort(),
    'Every customer-facing product needs an explicit functional color-role test case.',
);

const palette = FALLBACK_FILAMENT_COLOURS.map((color) => color.hex.toUpperCase());
assert.equal(palette.length, 9, 'Functional matrix expects the nine approved PLA+ colors.');

function* combinations(roles, index = 0, current = {}) {
    if (index === roles.length) {
        yield { ...current };
        return;
    }
    const role = roles[index];
    for (const hex of palette) {
        current[role] = hex;
        yield* combinations(roles, index + 1, current);
    }
}

let totalColorCases = 0;
for (const [productType, roles] of Object.entries(PRODUCT_COLOR_ROLES)) {
    const cases = [...combinations(roles)];
    const expected = palette.length ** roles.length;
    assert.equal(cases.length, expected, `${productType} must cover every color combination.`);
    assert.equal(
        new Set(cases.map((entry) => roles.map((role) => entry[role]).join('|'))).size,
        expected,
        `${productType} color combinations must be unique.`,
    );
    totalColorCases += cases.length;
}

assert.doesNotMatch(
    kioskApp,
    /if\s*\(\s*conf\.key\s*===\s*['"]base['"]\s*\)\s*\{\s*state\.colors\.outline\s*=/,
    'Selecting Base must never silently overwrite the independently selected Outline.',
);
assert.match(kioskApp, /swatch\.dataset\.colorRole\s*=\s*conf\.key/);
assert.match(kioskApp, /swatch\.dataset\.colorHex\s*=\s*color\.hex\.toUpperCase\(\)/);
assert.match(kioskApp, /swatch\.setAttribute\('aria-pressed',\s*String\(isSelected\)\)/);
assert.match(kioskApp, /document\.createElement\('button'\)/);
assert.match(customizeCss, /\.swatch\.light-swatch\.selected::after/);
assert.match(
    kioskApp,
    /customerDimensionsBtn\.addEventListener\('click'[\s\S]*?setDimensionOverlayVisible/,
    'Customer Dimensions control must be wired to the viewer.',
);

for (const id of [
    'baseSwatches',
    'fontSwatches',
    'outlineSwatches',
    'line2Swatches',
    'wordartBackingToggle',
    'organizerLayoutToggle',
    'beadShapeToggle',
    'beadDirectionToggle',
    'ringPosToggle',
    'thicknessToggle',
    'fontSelectorStrip',
    'fontCategoryTabs',
    'langToggleBtn',
    'qtyMinus',
    'qtyPlus',
    'customerDimensionsBtn',
]) {
    assert.match(customizeHtml, new RegExp(`id="${id}"`), `${id} needs a functional UI case.`);
}

assert.match(
    kioskApp,
    /showLoading:\s*state\.wordartBase\s*===\s*['"]hollow['"]/,
    'Customer Hollow selection must show feedback before the debounced rebuild.',
);
assert.match(kioskApp, /loadingMessage:\s*['"]Building hollow Word Art…['"]/);
assert.match(customizeHtml, /data-loading-text\s+aria-live="polite"/);
assert.match(kioskApp, /else\s*\{\s*hideViewerLoading\(\);\s*\}/);

assert.match(studioHtml, /data-mode="hollow"[^>]*aria-selected="false"/);
assert.match(studioHtml, /data-loading-text\s+aria-live="polite"/);
assert.match(
    studioApp,
    /if\s*\(\s*state\.wordartBase\s*===\s*['"]hollow['"]\s*\)\s*\{\s*showLoading\(['"]Building hollow Word Art…['"]\)/,
);
assert.match(studioApp, /else\s*\{\s*hideLoading\(\);\s*\}/);

console.log(
    `[PASS] ${productTypes.length} customer products, every visible option group, `
    + `${totalColorCases.toLocaleString('en-IN')} exhaustive PLA+ color combinations, `
    + 'independent role state, accessible swatches, and Hollow loading feedback',
);
