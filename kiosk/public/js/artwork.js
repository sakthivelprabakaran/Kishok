/* =========================================
   KOOTZY — ARTWORK PIPELINE (raster → contours)

   Turns a bitmap into a small set of flat colour regions, each described by
   closed polygons, so it can be extruded as separate filament bodies.

   Deliberately free of any three.js import. Everything here is arithmetic on
   typed arrays and plain arrays, which means it can be unit-tested under Node
   without a renderer. The browser-side glue that converts contours into
   THREE.Shape lives in viewer3d.js.

   Pipeline:
     1. stripBackdrop   drop a near-uniform light background
     2. quantize        median-cut down to N flat colours
     3. traceMask       marching squares per colour → closed loops
     4. simplifyPath    Douglas-Peucker to kill redundant points
     5. nestContours    classify outers vs holes by area sign + containment

   Designed for what people actually upload: icons, logos, flat cartoon art and
   text. Photographs do not survive step 2 and are not the target.
   ========================================= */

/* ------------------------------------------------------------ backdrop ---- */

/**
 * Mark near-uniform light background pixels transparent.
 *
 * Sampling the border rather than assuming white: plenty of icons arrive on a
 * light grey or cream card, and a hard white test would leave them sitting on a
 * slab. Flood-fills inward from the edges so an enclosed light region (the white
 * of an eye, say) is kept.
 */
export function stripBackdrop(rgba, width, height, tolerance = 34) {
    const n = width * height;
    if (n === 0) return rgba;

    // Average the border to find what "background" means for this image.
    let r = 0, g = 0, b = 0, count = 0;
    const sample = (x, y) => {
        const i = (y * width + x) * 4;
        r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; count++;
    };
    for (let x = 0; x < width; x++) { sample(x, 0); sample(x, height - 1); }
    for (let y = 1; y < height - 1; y++) { sample(0, y); sample(width - 1, y); }
    if (!count) return rgba;
    r /= count; g /= count; b /= count;

    // Only strip if the border really is light and uniform; a dark or busy border
    // is probably part of the design.
    if ((r + g + b) / 3 < 140) return rgba;

    const close = (i) => (
        Math.abs(rgba[i] - r) <= tolerance
        && Math.abs(rgba[i + 1] - g) <= tolerance
        && Math.abs(rgba[i + 2] - b) <= tolerance
    );

    const seen = new Uint8Array(n);
    const stack = [];
    for (let x = 0; x < width; x++) { stack.push(x, x + (height - 1) * width); }
    for (let y = 0; y < height; y++) { stack.push(y * width, y * width + width - 1); }

    while (stack.length) {
        const p = stack.pop();
        if (p < 0 || p >= n || seen[p]) continue;
        const i = p * 4;
        if (rgba[i + 3] === 0) { seen[p] = 1; continue; }
        if (!close(i)) continue;
        seen[p] = 1;
        rgba[i + 3] = 0;
        const x = p % width, y = (p - x) / width;
        if (x > 0) stack.push(p - 1);
        if (x < width - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - width);
        if (y < height - 1) stack.push(p + width);
    }
    return rgba;
}

/* ------------------------------------------------------------ quantize ---- */

/**
 * Median-cut colour quantisation.
 *
 * Chosen over k-means because it is deterministic — the same upload must always
 * produce the same part, or a reorder would not match the original.
 */
export function quantize(rgba, width, height, colourCount = 4) {
    const pixels = [];
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] < 128) continue;          // transparent
        pixels.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
    }
    if (!pixels.length) return { palette: [], indices: new Int16Array(width * height).fill(-1) };

    const k = Math.max(1, Math.min(12, colourCount | 0));
    let buckets = [pixels];

    while (buckets.length < k) {
        // Split whichever bucket spans the widest channel.
        let target = -1, bestRange = -1, bestChannel = 0;
        for (let b = 0; b < buckets.length; b++) {
            if (buckets[b].length < 2) continue;
            for (let c = 0; c < 3; c++) {
                let lo = 255, hi = 0;
                for (const px of buckets[b]) {
                    if (px[c] < lo) lo = px[c];
                    if (px[c] > hi) hi = px[c];
                }
                if (hi - lo > bestRange) { bestRange = hi - lo; target = b; bestChannel = c; }
            }
        }
        if (target < 0 || bestRange <= 0) break;
        const bucket = buckets[target];
        bucket.sort((p, q) => p[bestChannel] - q[bestChannel]);
        const mid = bucket.length >> 1;
        buckets.splice(target, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    const palette = buckets.filter((b) => b.length).map((b) => {
        let r = 0, g = 0, bl = 0;
        for (const px of b) { r += px[0]; g += px[1]; bl += px[2]; }
        return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
    });

    // Assign every pixel to its nearest palette entry; -1 means transparent.
    const indices = new Int16Array(width * height).fill(-1);
    for (let p = 0, i = 0; p < width * height; p++, i += 4) {
        if (rgba[i + 3] < 128) continue;
        let best = 0, bestDist = Infinity;
        for (let c = 0; c < palette.length; c++) {
            const dr = rgba[i] - palette[c][0];
            const dg = rgba[i + 1] - palette[c][1];
            const db = rgba[i + 2] - palette[c][2];
            const d = dr * dr + dg * dg + db * db;
            if (d < bestDist) { bestDist = d; best = c; }
        }
        indices[p] = best;
    }
    return { palette, indices };
}

/* --------------------------------------------------------------- merge ---- */

/**
 * Perceptually weighted colour distance ("redmean" approximation).
 *
 * Plain RGB Euclidean distance is a poor judge of whether two colours will read
 * as the same filament: it treats a green shift the same as a blue one, when the
 * eye is far more sensitive to green. This weights the channels and biases by
 * where in the red range the pair sits, which is enough to tell a genuine second
 * colour from an anti-aliasing artefact without the cost of a full Lab convert.
 */
export function colourDistance(a, b) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    const rmean = (a[0] + b[0]) / 2;
    return Math.sqrt(
        (2 + rmean / 256) * dr * dr
        + 4 * dg * dg
        + (2 + (255 - rmean) / 256) * db * db
    );
}

/**
 * Collapse near-duplicate palette entries and keep the most significant ones.
 *
 * Median cut splits whichever bucket spans the widest channel, and an
 * anti-aliased edge is a smooth ramp between two real colours, so the ramp wins
 * splits that the actual artwork colours needed. A two-colour icon came back as
 * three bodies (#D81E28 and #D9242E from one red), and a four-colour logo spent
 * three of its four slots on near-identical reds.
 *
 * Fixing it at the split stage is hard. Fixing it after is easy: over-quantise
 * deliberately, then walk the entries from most to least populous, keeping one
 * only if it is perceptually clear of everything kept so far and folding the
 * rest into their nearest keeper. Population order matters — it means a real
 * colour covering thousands of pixels is never merged into an edge artefact.
 */
export function mergeNearColours(quantised, targetCount, minDistance = 46, minShare = 0.03) {
    const { palette, indices } = quantised;
    if (palette.length <= 1) return quantised;

    const counts = new Array(palette.length).fill(0);
    let ink = 0;
    for (let p = 0; p < indices.length; p++) {
        const idx = indices[p];
        if (idx >= 0) { counts[idx]++; ink++; }
    }
    if (!ink) return quantised;

    const order = palette
        .map((_, i) => i)
        .filter((i) => counts[i] > 0)
        .sort((a, b) => counts[b] - counts[a]);

    const kept = [];
    const remap = new Int16Array(palette.length).fill(-1);

    for (const i of order) {
        let nearest = -1, nearestD = Infinity;
        for (const k of kept) {
            const d = colourDistance(palette[i], palette[k]);
            if (d < nearestD) { nearestD = d; nearest = k; }
        }
        if (nearest >= 0 && (nearestD < minDistance || kept.length >= targetCount)) {
            remap[i] = nearest;
        } else {
            kept.push(i);
            remap[i] = i;
        }
    }

    // Second pass: a colour that occupies almost none of the artwork is an edge
    // artefact, not a design choice. Requesting four colours for a three-colour
    // logo would otherwise always spend the spare slot on an anti-aliasing
    // fringe, which costs a real filament slot to print a one-pixel outline.
    // Fold anything under the share floor into its nearest surviving colour.
    if (kept.length > 1) {
        const share = (id) => {
            let n = 0;
            for (let i = 0; i < palette.length; i++) if (remap[i] === id) n += counts[i];
            return n / ink;
        };
        let survivors = kept.slice();
        for (const id of kept.slice().sort((a, b) => share(a) - share(b))) {
            if (survivors.length <= 1) break;
            if (share(id) >= minShare) continue;
            const rest = survivors.filter((k) => k !== id);
            let nearest = rest[0], nearestD = Infinity;
            for (const k of rest) {
                const d = colourDistance(palette[id], palette[k]);
                if (d < nearestD) { nearestD = d; nearest = k; }
            }
            for (let i = 0; i < palette.length; i++) if (remap[i] === id) remap[i] = nearest;
            survivors = rest;
        }
        kept.length = 0;
        kept.push(...survivors);
    }

    // Averaging the merged members would drag a colour towards its own
    // anti-aliasing halo and wash it out, so each keeper stays at its own
    // centroid. The halo pixels simply adopt it.
    const finalIds = kept.slice();
    const compact = new Int16Array(palette.length).fill(-1);
    finalIds.forEach((id, n) => { compact[id] = n; });

    const outIndices = new Int16Array(indices.length).fill(-1);
    for (let p = 0; p < indices.length; p++) {
        const idx = indices[p];
        if (idx < 0) continue;
        const target = remap[idx];
        outIndices[p] = target >= 0 ? compact[target] : -1;
    }

    return { palette: finalIds.map((id) => palette[id]), indices: outIndices };
}

/* --------------------------------------------------------------- trace ---- */

/**
 * Crack-following boundary trace.
 *
 * Walks the "cracks" between filled and unfilled pixels. Every boundary is a
 * closed loop on the integer lattice, so there is no interpolation and no
 * saddle-case ambiguity of the sort marching squares has to special-case, and
 * the resulting polygons are exactly pixel-aligned.
 */
export function traceMask(mask, width, height) {
    const filled = (x, y) => (x < 0 || y < 0 || x >= width || y >= height)
        ? false : mask[y * width + x] !== 0;

    // Each lattice edge is identified by (x, y, dir) where dir 0 = rightward
    // along the top of cell (x,y), 1 = downward along the left of (x,y).
    const used = new Set();
    const loops = [];

    // Start from any pixel whose top edge is a boundary.
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!filled(x, y) || filled(x, y - 1)) continue;
            const startKey = `${x},${y},h`;
            if (used.has(startKey)) continue;

            const loop = [];
            let cx = x, cy = y, dir = 0;   // 0 right, 1 down, 2 left, 3 up
            let guard = 0;
            const limit = width * height * 8 + 64;

            do {
                loop.push([cx, cy]);
                if (++guard > limit) break;

                // Keep the filled region on one side and follow the crack: try turning,
                // then going straight, then the other way. Standard crack following.
                if (dir === 0) {                       // heading right along a top edge
                    used.add(`${cx},${cy},h`);
                    if (filled(cx, cy - 1)) { dir = 3; }
                    else if (filled(cx, cy)) { cx++; }
                    else { dir = 1; }
                } else if (dir === 1) {                // heading down along a right edge
                    used.add(`${cx},${cy},v`);
                    if (filled(cx, cy)) { dir = 0; }
                    else if (filled(cx - 1, cy)) { cy++; }
                    else { dir = 2; }
                } else if (dir === 2) {                // heading left along a bottom edge
                    if (filled(cx - 1, cy)) { dir = 1; }
                    else if (filled(cx - 1, cy - 1)) { cx--; }
                    else { dir = 3; }
                } else {                               // heading up along a left edge
                    if (filled(cx - 1, cy - 1)) { dir = 2; }
                    else if (filled(cx, cy - 1)) { cy--; }
                    else { dir = 0; }
                }
            } while (!(cx === x && cy === y && dir === 0));

            if (loop.length >= 4) loops.push(loop);
        }
    }
    return loops;
}

/* ------------------------------------------------------------ simplify ---- */

/** Douglas-Peucker. Pixel-traced outlines are extremely dense; this thins them. */
export function simplifyPath(points, epsilon = 0.8) {
    if (!points || points.length < 3) return points || [];

    const sqDist = (p, a, b) => {
        let x = a[0], y = a[1];
        let dx = b[0] - x, dy = b[1] - y;
        if (dx !== 0 || dy !== 0) {
            const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) { x = b[0]; y = b[1]; }
            else if (t > 0) { x += dx * t; y += dy * t; }
        }
        dx = p[0] - x; dy = p[1] - y;
        return dx * dx + dy * dy;
    };

    const eps2 = epsilon * epsilon;
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;

    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [first, last] = stack.pop();
        let maxD = 0, index = -1;
        for (let i = first + 1; i < last; i++) {
            const d = sqDist(points[i], points[first], points[last]);
            if (d > maxD) { maxD = d; index = i; }
        }
        if (maxD > eps2 && index > 0) {
            keep[index] = 1;
            stack.push([first, index], [index, last]);
        }
    }

    const out = [];
    for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
    return out;
}

/* --------------------------------------------------------------- nest ---- */

/** Signed area; positive is counter-clockwise. */
export function signedArea(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        a += (pts[j][0] * pts[i][1]) - (pts[i][0] * pts[j][1]);
    }
    return a / 2;
}

function pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > p[1]) !== (yj > p[1]))
            && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

/**
 * Sort raw loops into outers with their holes.
 *
 * Nesting by containment rather than by winding alone, because a traced bitmap
 * can produce either orientation depending on which boundary was met first.
 */
export function nestContours(loops) {
    const items = loops
        .map((pts) => ({ pts, area: Math.abs(signedArea(pts)) }))
        .filter((it) => it.area > 0.5)
        .sort((a, b) => b.area - a.area);

    const regions = [];
    for (const item of items) {
        const probe = item.pts[0];
        let parent = null;
        for (const region of regions) {
            if (pointInPoly(probe, region.outer)) parent = region;
        }
        if (parent) parent.holes.push(item.pts);
        else regions.push({ outer: item.pts, holes: [] });
    }
    return regions;
}

/* ------------------------------------------------------------ pipeline ---- */

/**
 * Full raster → flat colour regions.
 *
 * @returns {Array<{color: string, regions: Array<{outer: number[][], holes: number[][][]}>}>}
 *          Ordered largest-coverage first, so the dominant colour lands on
 *          filament slot 1.
 */
export function traceImage(rgba, width, height, options = {}) {
    const colourCount = options.colourCount ?? 4;
    const minAreaPx = options.minAreaPx ?? Math.max(8, (width * height) * 0.0004);
    const epsilon = options.simplify ?? 0.9;

    const pixels = options.stripBackdrop === false
        ? rgba
        : stripBackdrop(rgba, width, height, options.backdropTolerance ?? 34);

    // Over-quantise on purpose, then merge. Asking median cut for exactly the
    // requested number of colours lets anti-aliasing ramps consume slots the
    // real colours needed; asking for more and merging down by perceptual
    // distance spends every slot on a colour a customer would actually name.
    const overshoot = Math.min(12, Math.max(colourCount, colourCount * 3));
    const merged = mergeNearColours(
        quantize(pixels, width, height, overshoot),
        colourCount,
        options.mergeDistance ?? 46
    );
    const { palette, indices } = merged;
    if (!palette.length) return [];

    const hex = ([r, g, b]) => '#'
        + r.toString(16).padStart(2, '0')
        + g.toString(16).padStart(2, '0')
        + b.toString(16).padStart(2, '0');

    const out = [];
    const mask = new Uint8Array(width * height);

    for (let c = 0; c < palette.length; c++) {
        let coverage = 0;
        for (let p = 0; p < mask.length; p++) {
            const on = indices[p] === c ? 1 : 0;
            mask[p] = on;
            coverage += on;
        }
        if (coverage < minAreaPx) continue;

        const loops = traceMask(mask, width, height)
            .map((pts) => simplifyPath(pts, epsilon))
            .filter((pts) => pts.length >= 3 && Math.abs(signedArea(pts)) >= minAreaPx * 0.25);
        if (!loops.length) continue;

        out.push({
            color: hex(palette[c]).toUpperCase(),
            coverage: coverage / (width * height),
            regions: nestContours(loops),
        });
    }

    return out.sort((a, b) => b.coverage - a.coverage);
}

/**
 * Map contours from pixel space into millimetres, centred on the origin.
 *
 * Y is flipped because image space runs downward while the model space the
 * viewer builds in runs upward after its single group-level flip.
 */
export function fitRegionsToSize(colourBodies, width, height, targetLongestMm) {
    const scale = targetLongestMm / Math.max(width, height, 1);
    const cx = width / 2, cy = height / 2;
    const map = (pts) => pts.map(([x, y]) => [(x - cx) * scale, (y - cy) * scale]);
    return colourBodies.map((body) => ({
        color: body.color,
        coverage: body.coverage,
        regions: body.regions.map((r) => ({
            outer: map(r.outer),
            holes: r.holes.map(map),
        })),
    }));
}
