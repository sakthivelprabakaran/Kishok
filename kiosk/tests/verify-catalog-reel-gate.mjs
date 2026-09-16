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

assert.match(runtime, /previewReel'\)\s*===\s*'off'/);
assert.match(runtime, /wordart/);
assert.match(runtime, /desk_organizer/);
assert.doesNotMatch(runtime, /new\s+KeychainViewer/);
assert.match(runtime, /__kootzyReelCoordinator/);
assert.match(previews, /\['wordart', 'desk_organizer'\]/);
assert.match(index, /catalog-reel-gate\.js/);

for (const productType of ['wordart', 'desk_organizer']) {
    const manifestPath = path.join(root, 'public', 'assets', 'catalog-reels', productType, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), `${productType} manifest is missing`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.productType, productType);
    assert.equal(manifest.frame.width, 840);
    assert.equal(manifest.frame.height, 600);
    assert.equal(manifest.variants.length, 3);
    assert.equal(manifest.sample.showFDMTexture, false);

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
