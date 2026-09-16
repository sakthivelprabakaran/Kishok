/* =========================================
   KOOTZY — 3MF EXPORT WITH COLOUR DATA

   An STL is a bare triangle soup: exporting a multi-colour cap as STL throws the
   colour away and the operator has to reassign every filament by hand. 3MF keeps
   it, because each colour is a separate <object> tagged with a material, and
   Bambu Studio / OrcaSlicer / PrusaSlicer map those materials onto filament slots
   on import.

   No zip dependency: 3MF permits STORED (uncompressed) zip entries, so a minimal
   writer is a few dozen lines and avoids pulling a library into the browser
   bundle for one feature.

   This module is deliberately free of any three.js import. Mesh extraction needs
   three (it lives in viewer3d.js); serialising does not. Keeping the writer pure
   means it can be unit-tested under Node without a renderer.
   ========================================= */

/* ----------------------------------------------------------------- zip ---- */

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Build a ZIP archive with STORED entries.
 * @param {Array<{name: string, data: Uint8Array}>} entries
 */
function zipStore(entries) {
    const chunks = [];
    const central = [];
    let offset = 0;

    const enc = new TextEncoder();
    const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF];
    const u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];

    for (const entry of entries) {
        const nameBytes = enc.encode(entry.name);
        const crc = crc32(entry.data);
        const size = entry.data.length;

        const local = [
            ...u32(0x04034B50), ...u16(20), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0),               // no timestamp
            ...u32(crc), ...u32(size), ...u32(size),
            ...u16(nameBytes.length), ...u16(0),
        ];
        chunks.push(new Uint8Array(local), nameBytes, entry.data);

        central.push([
            ...u32(0x02014B50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0),
            ...u32(crc), ...u32(size), ...u32(size),
            ...u16(nameBytes.length), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0), ...u32(0),
            ...u32(offset),
        ]);
        central[central.length - 1].nameBytes = nameBytes;

        offset += local.length + nameBytes.length + size;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const rec of central) {
        const head = new Uint8Array(rec);
        chunks.push(head, rec.nameBytes);
        centralSize += head.length + rec.nameBytes.length;
    }

    chunks.push(new Uint8Array([
        ...u32(0x06054B50), ...u16(0), ...u16(0),
        ...u16(central.length), ...u16(central.length),
        ...u32(centralSize), ...u32(centralStart), ...u16(0),
    ]));

    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let p = 0;
    for (const c of chunks) { out.set(c, p); p += c.length; }
    return out;
}

/* ----------------------------------------------------------------- 3mf ---- */

function xmlEscape(s) {
    return String(s).replace(/[<>&"']/g, (ch) => (
        { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]
    ));
}

/** '#RGB' or '#RRGGBB' -> '#RRGGBBFF', which is what the 3MF material spec wants. */
function toArgb(hex) {
    let h = String(hex || '').trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) h = 'CCCCCC';
    return '#' + h.toUpperCase() + 'FF';
}

/**
 * Write a multi-colour 3MF.
 *
 * @param {Array<{name: string, color: string, positions: number[], triangles: number[]}>} bodies
 *        One entry per filament colour; order becomes the filament slot order.
 *        Mesh extraction lives in the viewer, which owns three.js — this function
 *        only serialises.
 * @returns {Uint8Array} the .3mf file
 */
export function buildThreeMF(bodies) {
    const usable = (bodies || [])
        .map((b) => ({
            name: b.name,
            color: b.color,
            geom: { positions: b.positions || [], triangles: b.triangles || [] },
        }))
        .filter((b) => b.geom.triangles.length > 0 && b.geom.positions.length > 0);

    if (!usable.length) throw new Error('Nothing to export: no triangles found.');

    // Guard against indices that would produce an unopenable file.
    for (const b of usable) {
        const vertCount = b.geom.positions.length / 3;
        for (const idx of b.geom.triangles) {
            if (!Number.isInteger(idx) || idx < 0 || idx >= vertCount) {
                throw new Error(`Triangle index ${idx} out of range for "${b.name}" `
                    + `(${vertCount} vertices).`);
            }
        }
    }

    // Drop the model onto z = 0 and into positive space; slicers cope with
    // negatives but every one of them is happier with a corner at the origin.
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    for (const b of usable) {
        const p = b.geom.positions;
        for (let i = 0; i < p.length; i += 3) {
            if (p[i] < minX) minX = p[i];
            if (p[i + 1] < minY) minY = p[i + 1];
            if (p[i + 2] < minZ) minZ = p[i + 2];
        }
    }

    const MAT_ID = 1;
    let nextId = MAT_ID + 1;
    const parts = [];

    const materials = usable.map((b, i) =>
        `   <base name="${xmlEscape(b.name || `Part ${i + 1}`)}" `
        + `displaycolor="${toArgb(b.color || '#CCCCCC')}"/>`).join('\n');

    for (let i = 0; i < usable.length; i++) {
        const body = usable[i];
        const id = nextId++;
        body.id = id;

        // Weld duplicate vertices. ExtrudeGeometry hands over non-indexed
        // geometry, so a naive dump repeats every corner for every triangle that
        // touches it — on Clipper-derived contours that ran to 134MB of XML for a
        // 38mm part. Quantising to the emitted precision and reusing the index
        // cuts it by roughly the average valence.
        const p = body.geom.positions;
        const t = body.geom.triangles;
        const map = new Map();
        const verts = [];
        const remap = new Int32Array(p.length / 3);

        for (let k = 0; k < p.length; k += 3) {
            const x = (p[k] - minX);
            const y = (p[k + 1] - minY);
            const z = (p[k + 2] - minZ);
            // 0.001mm is far finer than any FDM printer resolves.
            const sx = x.toFixed(3), sy = y.toFixed(3), sz = z.toFixed(3);
            const key = sx + ',' + sy + ',' + sz;
            let at = map.get(key);
            if (at === undefined) {
                at = verts.length;
                map.set(key, at);
                verts.push(`     <vertex x="${sx}" y="${sy}" z="${sz}"/>`);
            }
            remap[k / 3] = at;
        }

        const tris = [];
        for (let k = 0; k < t.length; k += 3) {
            const a = remap[t[k]], b = remap[t[k + 1]], c = remap[t[k + 2]];
            // Welding can collapse degenerate slivers; a zero-area triangle is
            // invalid in 3MF, so drop them rather than ship a rejected file.
            if (a === b || b === c || a === c) continue;
            tris.push(`     <triangle v1="${a}" v2="${b}" v3="${c}"/>`);
        }

        if (!tris.length) continue;

        parts.push(
            `  <object id="${id}" type="model" pid="${MAT_ID}" pindex="${i}"`
            + ` name="${xmlEscape(body.name || `Part ${i + 1}`)}">\n`
            + `   <mesh>\n    <vertices>\n${verts.join('\n')}\n    </vertices>\n`
            + `    <triangles>\n${tris.join('\n')}\n    </triangles>\n   </mesh>\n  </object>`
        );
    }

    if (!parts.length) throw new Error('Nothing to export: all triangles were degenerate.');

    const items = usable.filter((b) => b.id).map((b) => `  <item objectid="${b.id}"/>`).join('\n');

    const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
       xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
       xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
 <metadata name="Application">Kootzy Studio</metadata>
 <metadata name="Title">Kootzy MX Fidget Clicker</metadata>
 <resources>
  <basematerials id="${MAT_ID}">
${materials}
  </basematerials>
${parts.join('\n')}
 </resources>
 <build>
${items}
 </build>
</model>
`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

    const enc = new TextEncoder();
    return zipStore([
        { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
        { name: '_rels/.rels', data: enc.encode(rels) },
        { name: '3D/3dmodel.model', data: enc.encode(model) },
    ]);
}

export { crc32, zipStore };
