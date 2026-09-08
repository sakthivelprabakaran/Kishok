import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
    STUDIO_PRODUCT_PROFILES,
    STUDIO_PRODUCT_SECTION_IDS,
    STUDIO_PRODUCT_TYPES,
} from '../public/js/studio-products.js';

const [studioHtml, viewerSource] = await Promise.all([
    readFile(new URL('../public/studio.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/viewer3d.js', import.meta.url), 'utf8'),
]);

const productSelect = studioHtml.match(/id="adminProductType"[\s\S]*?<\/select>/)?.[0] || '';
const dropdownTypes = [...productSelect.matchAll(/<option[^>]*value="([a-z_]+)"/g)]
    .map((match) => match[1]);

assert.deepEqual(
    [...STUDIO_PRODUCT_TYPES].sort(),
    [...dropdownTypes].sort(),
    'Every Studio product must have exactly one UI profile',
);

for (const type of STUDIO_PRODUCT_TYPES) {
    const profile = STUDIO_PRODUCT_PROFILES[type];
    assert.equal(profile.type, type);
    assert.ok(profile.label, `${type} needs a readable label`);
    assert.ok(profile.description, `${type} needs a product description`);
    assert.match(profile.scaleMode, /^(footprint|whole)$/);
    assert.ok(profile.scaleLabel, `${type} needs a scale label`);
    assert.ok(profile.scaleHelp, `${type} needs scale guidance`);
    assert.ok(Array.isArray(profile.controlSections));
}

for (const sectionId of STUDIO_PRODUCT_SECTION_IDS) {
    assert.match(
        studioHtml,
        new RegExp(`id="${sectionId}"`),
        `${sectionId} is registered but missing from studio.html`,
    );
}

const scaledProductsBody = viewerSource.match(/static get SCALED_PRODUCTS\(\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
const wholeModelProducts = [...scaledProductsBody.matchAll(/'([a-z_]+)'/g)]
    .map((match) => match[1]);
const profiledWholeModelProducts = STUDIO_PRODUCT_TYPES
    .filter((type) => STUDIO_PRODUCT_PROFILES[type].scaleMode === 'whole');

assert.deepEqual(
    [...profiledWholeModelProducts].sort(),
    [...wholeModelProducts].sort(),
    'Whole-model scale messaging must match viewer3d.js scaling behaviour',
);

assert.deepEqual(
    STUDIO_PRODUCT_TYPES.filter((type) => STUDIO_PRODUCT_PROFILES[type].standardStack).sort(),
    ['keychain', 'loveseries', 'nameplate', 'wordart'].sort(),
    'Only products using the shared layered builder may expose shared depth controls',
);

assert.equal(STUDIO_PRODUCT_PROFILES.keychain.scaleMode, 'footprint');
assert.equal(STUDIO_PRODUCT_PROFILES.keychain.ringControl, true);
assert.equal(STUDIO_PRODUCT_PROFILES.girly_keychain.standardStack, false);
assert.equal(STUDIO_PRODUCT_PROFILES.girly_keychain.supportsLayers, false);

console.log(`[PASS] ${STUDIO_PRODUCT_TYPES.length} Studio product profiles match the dropdown and geometry scale model`);
