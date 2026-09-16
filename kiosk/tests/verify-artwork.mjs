/*
 * Test the artwork pipeline on images whose correct answer is known by hand.
 *
 * Tracing bugs are silent: you get a shape, it is just the wrong shape. So the
 * checks here are about topology (does a donut have a hole, do two blobs stay
 * two) and about area being preserved, not about "it returned something".
 *
 * Possible in Node because artwork.js carries no three.js import.
 */
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
    stripBackdrop, quantize, traceMask, simplifyPath,
    signedArea, nestContours, traceImage, fitRegionsToSize,
} from '../public/js/artwork.js';

/** Build an RGBA buffer from a paint callback. */
function makeImage(w, h, paint) {
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = paint(x, y) || [255, 255, 255, 255];
            const i = (y * w + x) * 4;
            rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2];
            rgba[i + 3] = c[3] === undefined ? 255 : c[3];
        }
    }
    return rgba;
}

const BLACK = [0, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const RED = [220, 30, 40, 255];

describe('mask tracing', () => {
    test('a solid square yields one loop enclosing its area', () => {
        const w = 20, h = 20;
        const mask = new Uint8Array(w * h);
        for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) mask[y * w + x] = 1;

        const loops = traceMask(mask, w, h);
        assert.equal(loops.length, 1, 'one boundary expected');
        assert.equal(Math.abs(signedArea(loops[0])), 100, '10x10 square is 100px');
    });

    test('two separate blobs stay two loops', () => {
        const w = 30, h = 12;
        const mask = new Uint8Array(w * h);
        for (let y = 3; y < 9; y++) {
            for (let x = 2; x < 8; x++) mask[y * w + x] = 1;
            for (let x = 20; x < 26; x++) mask[y * w + x] = 1;
        }
        const loops = traceMask(mask, w, h);
        assert.equal(loops.length, 2);
    });

    test('a donut produces an outer and a hole, and nesting identifies them', () => {
        const w = 24, h = 24;
        const mask = new Uint8Array(w * h);
        for (let y = 4; y < 20; y++) for (let x = 4; x < 20; x++) mask[y * w + x] = 1;
        for (let y = 9; y < 15; y++) for (let x = 9; x < 15; x++) mask[y * w + x] = 0;

        const loops = traceMask(mask, w, h);
        assert.equal(loops.length, 2, 'outer plus hole');

        const regions = nestContours(loops);
        assert.equal(regions.length, 1, 'one region');
        assert.equal(regions[0].holes.length, 1, 'with one hole');
        assert.equal(Math.abs(signedArea(regions[0].outer)), 256, '16x16 outer');
        assert.equal(Math.abs(signedArea(regions[0].holes[0])), 36, '6x6 hole');
    });

    test('outer and hole wind in opposite directions', () => {
        const w = 24, h = 24;
        const mask = new Uint8Array(w * h);
        for (let y = 4; y < 20; y++) for (let x = 4; x < 20; x++) mask[y * w + x] = 1;
        for (let y = 9; y < 15; y++) for (let x = 9; x < 15; x++) mask[y * w + x] = 0;
        const regions = nestContours(traceMask(mask, w, h));
        const outerSign = Math.sign(signedArea(regions[0].outer));
        const holeSign = Math.sign(signedArea(regions[0].holes[0]));
        assert.notEqual(outerSign, holeSign, 'a hole must wind against its outer');
    });
});

describe('simplify', () => {
    test('collapses a straight run to its endpoints', () => {
        const line = [];
        for (let x = 0; x <= 20; x++) line.push([x, 0]);
        assert.equal(simplifyPath(line, 0.5).length, 2);
    });

    test('keeps a corner', () => {
        const pts = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]];
        const out = simplifyPath(pts, 0.5);
        assert.ok(out.length >= 3, 'the corner must survive');
        assert.deepEqual(out[0], [0, 0]);
        assert.deepEqual(out[out.length - 1], [10, 10]);
    });

    test('preserves square area within a pixel', () => {
        const w = 40, h = 40;
        const mask = new Uint8Array(w * h);
        for (let y = 5; y < 35; y++) for (let x = 5; x < 35; x++) mask[y * w + x] = 1;
        const raw = traceMask(mask, w, h)[0];
        const simplified = simplifyPath(raw, 0.9);
        assert.ok(Math.abs(Math.abs(signedArea(simplified)) - 900) < 2,
            `area drifted: ${Math.abs(signedArea(simplified))}`);
    });
});

describe('backdrop stripping', () => {
    test('removes a white surround but keeps an enclosed white region', () => {
        const w = 24, h = 24;
        // Black ring on white, with white trapped in the middle.
        const rgba = makeImage(w, h, (x, y) => {
            const inRing = x >= 4 && x < 20 && y >= 4 && y < 20;
            const inHole = x >= 9 && x < 15 && y >= 9 && y < 15;
            return (inRing && !inHole) ? BLACK : WHITE;
        });
        stripBackdrop(rgba, w, h);

        const alphaAt = (x, y) => rgba[(y * w + x) * 4 + 3];
        assert.equal(alphaAt(0, 0), 0, 'outer white should be stripped');
        assert.equal(alphaAt(11, 11), 255, 'enclosed white must be kept');
        assert.equal(alphaAt(5, 5), 255, 'the subject must be kept');
    });

    test('leaves a dark background alone', () => {
        const w = 12, h = 12;
        const rgba = makeImage(w, h, () => [20, 20, 20, 255]);
        stripBackdrop(rgba, w, h);
        assert.equal(rgba[3], 255, 'a dark border is probably part of the design');
    });
});

describe('quantize', () => {
    test('reduces to the requested number of colours', () => {
        const w = 20, h = 20;
        const rgba = makeImage(w, h, (x) => (x < 7 ? BLACK : (x < 14 ? RED : [30, 60, 200, 255])));
        const { palette } = quantize(rgba, w, h, 3);
        assert.equal(palette.length, 3);
    });

    test('is deterministic, so a reorder reproduces the same part', () => {
        const w = 16, h = 16;
        const paint = (x, y) => ((x + y) % 3 === 0 ? BLACK : ((x + y) % 3 === 1 ? RED : WHITE));
        const a = quantize(makeImage(w, h, paint), w, h, 3);
        const b = quantize(makeImage(w, h, paint), w, h, 3);
        assert.deepEqual(a.palette, b.palette);
    });

    test('skips transparent pixels', () => {
        const w = 10, h = 10;
        const rgba = makeImage(w, h, (x) => (x < 5 ? [0, 0, 0, 0] : BLACK));
        const { palette, indices } = quantize(rgba, w, h, 2);
        assert.ok(palette.length >= 1);
        assert.equal(indices[0], -1, 'transparent stays unassigned');
        assert.ok(indices[9] >= 0, 'opaque gets a colour');
    });
});

describe('end to end', () => {
    const w = 60, h = 40;
    // A red bar and a black bar on white — like a two-colour icon.
    const rgba = makeImage(w, h, (x, y) => {
        if (y >= 8 && y < 18 && x >= 8 && x < 52) return RED;
        if (y >= 22 && y < 32 && x >= 8 && x < 52) return BLACK;
        return WHITE;
    });

    test('separates the two ink colours and drops the backdrop', () => {
        const bodies = traceImage(Uint8ClampedArray.from(rgba), w, h, { colourCount: 3 });
        assert.ok(bodies.length >= 2, `expected 2 ink colours, got ${bodies.length}`);
        for (const b of bodies) {
            assert.match(b.color, /^#[0-9A-F]{6}$/);
            assert.ok(b.regions.length >= 1);
        }
    });

    test('orders bodies by coverage so the dominant colour is slot 1', () => {
        const bodies = traceImage(Uint8ClampedArray.from(rgba), w, h, { colourCount: 3 });
        for (let i = 1; i < bodies.length; i++) {
            assert.ok(bodies[i - 1].coverage >= bodies[i].coverage);
        }
    });

    test('fits to a requested millimetre size, centred on the origin', () => {
        const bodies = traceImage(Uint8ClampedArray.from(rgba), w, h, { colourCount: 3 });
        const mm = fitRegionsToSize(bodies, w, h, 38);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const b of mm) for (const r of b.regions) for (const [x, y] of r.outer) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        assert.ok(maxX - minX <= 38.01, `width ${maxX - minX} exceeds target`);
        assert.ok(Math.abs(minX + maxX) < 6, 'should be roughly centred on x');
        assert.ok(Math.abs(minY + maxY) < 6, 'should be roughly centred on y');
    });

    test('a blank image yields nothing rather than a degenerate body', () => {
        const blank = makeImage(20, 20, () => WHITE);
        assert.deepEqual(traceImage(blank, 20, 20, { colourCount: 4 }), []);
    });
});
