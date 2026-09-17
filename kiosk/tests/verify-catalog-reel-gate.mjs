import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const runtime = read('public/js/catalog-reel-gate.js');
const previews = read('public/js/card-previews.js');
const index = read('public/index.html');
const approvedColours = new Set([
    '#C93655', '#1D7D8D', '#D67842', '#F1ECE1', '#0E0E10',
    '#008351', '#7C8A68', '#D7CAAB', '#F9A800',
]);
const storefrontProducts = [...index.matchAll(/class="product-card" data-type="([^"]+)"/g)]
    .map((match) => match[1]);
const catalogProducts = storefrontProducts.filter((productType) => productType !== 'keychain');

assert.match(runtime, /previewReel'\)\s*===\s*'off'/);
for (const productType of catalogProducts) {
    assert.match(runtime, new RegExp(`['"]${productType}['"]`), `${productType} is missing from the reel runtime`);
}
assert.doesNotMatch(runtime, /new\s+KeychainViewer/);
assert.match(runtime, /__kootzyReelCoordinator/);
assert.match(runtime, /activeStops:\s*new Set/, 'visible catalogue reels must animate independently');
assert.match(previews, /if\s*\(reelsEnabled\)\s*return/, 'legacy SVG previews must yield to all default reels');
assert.match(index, /catalog-reel-gate\.js/);

assert.equal(storefrontProducts.length, 15, 'the storefront product count changed unexpectedly');
assert.equal(catalogProducts.length, 14, 'all non-Classic products must use catalogue reel manifests');

for (const productType of catalogProducts) {
    const manifestPath = path.join(root, 'public', 'assets', 'catalog-reels', productType, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), `${productType} manifest is missing`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.productType, productType);
    assert.equal(manifest.frame.width, 840);
    assert.equal(manifest.frame.height, 600);
    assert.equal(manifest.variants.length, 3);
    assert.equal(manifest.sample.showFDMTexture, false);
    for (const variant of manifest.variants) {
        for (const colour of Object.values(variant.colors)) {
            assert.ok(approvedColours.has(colour), `${productType}/${variant.id} uses unavailable colour ${colour}`);
        }
    }

    const hash = crypto.createHash('sha256');
    hash.update(productType);
    for (const relative of [
        'public/js/viewer3d.js',
        'public/js/classic-reel-renderer.js',
        'public/_classic-reel-renderer.html',
        'scripts/generate-classic-reel.mjs',
    ]) {
        hash.update(relative);
        hash.update(fs.readFileSync(path.join(root, relative)));
    }
    assert.equal(manifest.sourceHash, hash.digest('hex'), `${productType} assets are stale`);
    assert.ok(manifest.budgets.initialPosterBytes <= 100 * 1024);
    assert.ok(manifest.budgets.totalAssetBytes <= 1024 * 1024);
}

console.log('High-resolution catalogue reel gate verified.');
