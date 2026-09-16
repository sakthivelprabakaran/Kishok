/*
 * Validate the 3MF writer for real: build one, unpack the zip, parse the model.
 *
 * A 3MF that "downloads fine" but that no slicer can open is worse than useless,
 * so this checks the things a slicer checks — a valid zip container, the three
 * required parts, well-formed model XML, materials present, every object bound to
 * one, and triangle indices in range.
 *
 * Possible only because threemf.js carries no three.js import.
 */
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { buildThreeMF, crc32 } from '../public/js/threemf.js';

/** Minimal STORED-zip reader, enough to verify what we wrote. */
function readStoredZip(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const files = new Map();
    let p = 0;
    while (p + 30 <= bytes.length && dv.getUint32(p, true) === 0x04034b50) {
        const method = dv.getUint16(p + 8, true);
        const crc = dv.getUint32(p + 14, true);
        const size = dv.getUint32(p + 18, true);
        const nameLen = dv.getUint16(p + 26, true);
        const extraLen = dv.getUint16(p + 28, true);
        const name = new TextDecoder().decode(bytes.subarray(p + 30, p + 30 + nameLen));
        const start = p + 30 + nameLen + extraLen;
        const data = bytes.subarray(start, start + size);
        assert.equal(method, 0, `${name} must be STORED`);
        assert.equal(crc32(data), crc, `${name} CRC must match`);
        files.set(name, data);
        p = start + size;
    }
    // End-of-central-directory must be present.
    let eocd = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    assert.ok(eocd >= 0, 'zip must have an end-of-central-directory record');
    return { files, entryCount: dv.getUint16(eocd + 10, true) };
}

/** A unit cube as plain arrays, offset along X. */
function cube(name, color, dx = 0) {
    const v = [
        [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
        [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
    ];
    const positions = [];
    for (const [x, y, z] of v) positions.push(x + dx, y, z);
    const triangles = [];
    for (const f of [
        [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
        [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
        [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
    ]) triangles.push(...f);
    return { name, color, positions, triangles };
}

const decode = (b) => new TextDecoder().decode(b);

describe('3MF container', () => {
    const out = buildThreeMF([
        cube('Housing', '#FF8B3D', 0),
        cube('Cap', '#5B6B7F', 20),
        cube('Artwork', '#ffffff', 40),
    ]);

    test('is a valid zip with the three required 3MF parts', () => {
        const { files, entryCount } = readStoredZip(out);
        assert.equal(entryCount, 3);
        for (const required of ['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model']) {
            assert.ok(files.has(required), `missing ${required}`);
        }
    });

    test('relationship points at the model part', () => {
        const { files } = readStoredZip(out);
        const rels = decode(files.get('_rels/.rels'));
        assert.match(rels, /Target="\/3D\/3dmodel\.model"/);
        assert.match(rels, /3dmanufacturing\/2013\/01\/3dmodel/);
    });

    test('content types declare the model part', () => {
        const { files } = readStoredZip(out);
        const ct = decode(files.get('[Content_Types].xml'));
        assert.match(ct, /3dmanufacturing-3dmodel\+xml/);
        assert.match(ct, /Extension="rels"/);
    });
});

describe('3MF model', () => {
    const model = (() => {
        const out = buildThreeMF([
            cube('Housing', '#FF8B3D', 0),
            cube('Cap', '#5B6B7F', 20),
            cube('Artwork', '#fff', 40),
        ]);
        return decode(readStoredZip(out).files.get('3D/3dmodel.model'));
    })();

    test('declares millimetres, which is what every slicer assumes', () => {
        assert.match(model, /unit="millimeter"/);
    });

    test('carries one base material per colour, in 8-digit ARGB', () => {
        const mats = [...model.matchAll(/<base name="([^"]+)" displaycolor="([^"]+)"\/>/g)];
        assert.equal(mats.length, 3);
        assert.deepEqual(mats.map((m) => m[1]), ['Housing', 'Cap', 'Artwork']);
        for (const m of mats) {
            assert.match(m[2], /^#[0-9A-F]{8}$/, `bad colour ${m[2]}`);
        }
        // 3-digit input must expand, not be dropped.
        assert.ok(mats.some((m) => m[2] === '#FFFFFFFF'), 'short hex should expand to white');
    });

    test('every object binds to a material index', () => {
        const objs = [...model.matchAll(/<object id="(\d+)"[^>]*pid="(\d+)" pindex="(\d+)"/g)];
        assert.equal(objs.length, 3);
        assert.deepEqual(objs.map((o) => o[3]), ['0', '1', '2']);
        for (const o of objs) assert.equal(o[2], '1', 'all objects share the material group');
    });

    test('build section places every object', () => {
        const items = [...model.matchAll(/<item objectid="(\d+)"\/>/g)];
        const objs = [...model.matchAll(/<object id="(\d+)"/g)].map((m) => m[1]);
        assert.equal(items.length, 3);
        assert.deepEqual(items.map((i) => i[1]).sort(), objs.sort());
    });

    test('triangle indices stay inside each object vertex list', () => {
        const blocks = model.split('<object ').slice(1);
        assert.equal(blocks.length, 3);
        for (const block of blocks) {
            const verts = [...block.matchAll(/<vertex /g)].length;
            const tris = [...block.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g)];
            assert.equal(verts, 8);
            assert.equal(tris.length, 12);
            for (const t of tris) {
                for (const i of [t[1], t[2], t[3]]) {
                    assert.ok(Number(i) < verts, `index ${i} exceeds ${verts} vertices`);
                }
            }
        }
    });

    test('geometry is moved into positive space', () => {
        const coords = [...model.matchAll(/<vertex x="(-?[\d.]+)" y="(-?[\d.]+)" z="(-?[\d.]+)"/g)];
        assert.ok(coords.length > 0);
        for (const c of coords) {
            for (const n of [c[1], c[2], c[3]]) {
                assert.ok(Number(n) >= -0.0001, `negative coordinate ${n}`);
            }
        }
    });
});

describe('3MF guards', () => {
    test('refuses to write an empty model rather than a broken file', () => {
        assert.throws(() => buildThreeMF([]), /Nothing to export/);
        assert.throws(() => buildThreeMF([{ name: 'x', color: '#fff', positions: [], triangles: [] }]),
            /Nothing to export/);
    });

    test('rejects out-of-range triangle indices instead of emitting them', () => {
        assert.throws(() => buildThreeMF([{
            name: 'bad', color: '#fff',
            positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
            triangles: [0, 1, 99],
        }]), /out of range/);
    });

    test('crc32 matches the standard check value', () => {
        assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
    });
});
