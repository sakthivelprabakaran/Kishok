import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const index = read('public/index.html');
const runtime = read('public/js/classic-reel-pilot.js');
const previews = read('public/js/card-previews.js');
const css = read('public/css/kiosk.css');
const manifestPath = path.join(root, 'public/assets/classic-reel/manifest.json');

assert.match(index, /classic-reel-pilot\.js/, 'index must load the Classic reel');
assert.match(runtime, /previewReel'\)\s*===\s*'off'/, 'Classic reel must be enabled by default with an off switch');
assert.match(runtime, /data-type="keychain"/, 'pilot must target only the Classic Keychain card');
assert.doesNotMatch(runtime, /new\s+KeychainViewer/, 'catalogue pilot must not create a live 3D viewer');
assert.match(previews, /reelsEnabled\s*=\s*reelMode\s*!==\s*'off'/, 'the SVG preview dispatcher must yield to default-enabled reels');
assert.match(css, /\.classic-reel-stage/, 'pilot stage styles must exist');
assert.ok(fs.existsSync(manifestPath), 'generated Classic reel manifest is missing');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sourceHash = crypto.createHash('sha256');
sourceHash.update('keychain');
for (const relative of [
    'public/js/viewer3d.js',
    'public/js/classic-reel-renderer.js',
    'public/_classic-reel-renderer.html',
    'scripts/generate-classic-reel.mjs',
]) {
    sourceHash.update(relative);
    sourceHash.update(fs.readFileSync(path.join(root, relative)));
}
assert.equal(
    manifest.sourceHash,
    sourceHash.digest('hex'),
    'generated assets are stale because the viewer or render harness changed'
);
assert.equal(manifest.productType, 'keychain');
assert.equal(manifest.sample.text, 'Luna');
assert.equal(manifest.sample.font, 'Lobster');
assert.equal(manifest.sample.layers, '3L');
assert.equal(manifest.sample.ringPosition, 'left');
assert.equal(manifest.sample.ringAnchor, 'center');
assert.equal(manifest.sample.showFDMTexture, false);
assert.deepEqual(manifest.frame.angles, [-8, -4, 0, 4, 8]);
assert.equal(manifest.variants.length, 5);
assert.deepEqual(
    manifest.variants.map((variant) => variant.text),
    ['Luna', 'Zoya', 'MIRA', 'Aira', 'AARAV'],
    'Classic reel must demonstrate different customer names'
);
assert.equal(
    new Set(manifest.variants.map((variant) => variant.font)).size,
    5,
    'Classic reel must demonstrate five different fonts'
);
assert.deepEqual(
    manifest.variants.map((variant) => variant.layers),
    ['3L', '3L', '3L', '2L', '2L'],
    'Classic reel must demonstrate both 3-layer and 2-layer keychains'
);
assert.deepEqual(
    manifest.variants[0].colors,
    { base: '#A8E6CF', font: '#FFFFFF', outline: '#111111', line2: '#FFFFFF' },
    'the lead design must use the approved pastel green, white and black combination'
);
assert.ok(
    manifest.variants.every((variant) => variant.ringAnchor === 'center'),
    'every Classic reel design must use the vertically centred ring'
);

let totalBytes = 0;
for (const variant of manifest.variants) {
    assert.equal(variant.dimensions.depth, 6, `${variant.id} must retain the fixed 6mm thickness`);
    for (const key of ['sprite', 'poster']) {
        const assetPath = path.join(root, 'public', variant[key].replace(/^\//, ''));
        assert.ok(fs.existsSync(assetPath), `${variant[key]} is missing`);
        totalBytes += fs.statSync(assetPath).size;
    }
}
const fallbackPath = path.join(root, 'public', manifest.fallbackPoster.replace(/^\//, ''));
assert.ok(fs.existsSync(fallbackPath), 'PNG fallback poster is missing');
totalBytes += fs.statSync(fallbackPath).size;

const initialPosterPath = path.join(root, 'public', manifest.poster.replace(/^\//, ''));
assert.equal(manifest.frame.width, 840, '2x reel width must be 840px');
assert.equal(manifest.frame.height, 600, '2x reel height must be 600px');
assert.ok(fs.statSync(initialPosterPath).size <= 100 * 1024, 'initial poster exceeds 100KB');
assert.ok(totalBytes <= 1536 * 1024, 'Classic reel assets exceed 1.5MB');

console.log('Classic Keychain exact-render reel pilot verified.');
