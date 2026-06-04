/* =========================================
   YOURSGIFTS — 3D KEYCHAIN VIEWER
   Three.js + opentype.js
   ========================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGLoader }     from 'three/addons/loaders/SVGLoader.js';
import { STLExporter }   from 'three/addons/exporters/STLExporter.js';

// ===================================================================
// KeychainViewer — renders a rotatable 3D extruded keychain from TTF
// ===================================================================

export class KeychainViewer {

    constructor(containerEl) {
        this.container = containerEl;
        this.fontCache  = {};
        this.keychainGroup = null;
        this.disposed = false;
        this._init();
    }

    /* ── Scene / Camera / Renderer / Lights / Controls ── */

    _init() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 2000);
        this.camera.position.set(0, 0, 160);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,   // needed for PNG export
            alpha: false,
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping      = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(10, 20, 30);
        keyLight.castShadow = false;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xc8b8ff, 0.5);
        fillLight.position.set(-15, -5, 10);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffd080, 0.35);
        rimLight.position.set(0, -10, -20);
        this.scene.add(rimLight);

        // Theme Support (Initialize properly on load)
        const isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        if (isLight) {
            this.scene.background = new THREE.Color(0xe8def8);
        } else {
            this.scene.background = new THREE.Color(0x120826);
        }

        window.addEventListener('theme-changed', (e) => {
            const theme = e.detail.theme;
            if (theme === 'light') {
                this.scene.background = new THREE.Color(0xe8def8);
            } else {
                this.scene.background = new THREE.Color(0x120826);
            }
        });

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping   = true;
        this.controls.dampingFactor   = 0.07;
        this.controls.autoRotate      = true;
        this.controls.autoRotateSpeed = 1.8;
        this.controls.minDistance      = 40;
        this.controls.maxDistance      = 400;
        this.controls.enablePan        = false;

        // Resize observer
        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(this.container);

        // Animation loop
        this._animate();
    }

    _animate() {
        if (this.disposed) return;
        requestAnimationFrame(() => this._animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    /* ── Font Loading (opentype.js) ── */

    async loadFont(fontPath) {
        if (this.fontCache[fontPath]) return this.fontCache[fontPath];
        const resp   = await fetch(fontPath);
        const buffer = await resp.arrayBuffer();
        // opentype is loaded as a global script
        const font   = opentype.parse(buffer);
        this.fontCache[fontPath] = font;
        return font;
    }

    /* ── Convert opentype text → Three.js Shapes via SVGLoader ── */

    _pathDataToShapes(pathData) {
        if (!pathData || !pathData.trim()) return [];
        const svgStr = '<svg xmlns="http://www.w3.org/2000/svg">'
                     + '<path d="' + pathData + '"/></svg>';
        const loader  = new SVGLoader();
        const svgData = loader.parse(svgStr);
        const shapes = [];
        for (const p of svgData.paths) {
            const s = SVGLoader.createShapes(p);
            shapes.push(...s);
        }
        return shapes;
    }

    _textToShapes(font, text, fontSize, lineHeightRatio) {
        const ratio = lineHeightRatio || 1.15;
        const lines = text.split('\n');
        const lineHeight = fontSize * ratio;
        let combined = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            const p = font.getPath(line, 0, i * lineHeight, fontSize);
            const d = p.toPathData(3);
            if (d) combined += ' ' + d;
        }
        return this._pathDataToShapes(combined);
    }

    // Returns [{ lineIndex, shapes }, ...] — one entry per non-empty line.
    // Used by word-art mode so each line can get its own color/material.
    _textToShapesPerLine(font, text, fontSize, lineHeightRatio) {
        const ratio = lineHeightRatio || 1.15;
        const lines = text.split('\n');
        const lineHeight = fontSize * ratio;
        const out = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            const p = font.getPath(line, 0, i * lineHeight, fontSize);
            const d = p.toPathData(3);
            const shapes = this._pathDataToShapes(d);
            if (shapes.length) out.push({ lineIndex: i, shapes: shapes });
        }
        return out;
    }

    // Word-art-specific: takes lineConfigs = [{ text, font, fontSize }, ...] and lays them
    // out vertically using REAL font metrics so descenders of line N overlap caps of line N+1.
    // Returns [{ lineIndex, shapes, baselineY, bounds }, ...].
    //
    // Why this is different from _textToShapesPerLine:
    //   - That helper assumes one font + one fontSize for all lines.
    //   - Word art needs two different fonts (e.g. cursive top + bold caps bottom) and a
    //     deliberate overlap so the meshes fuse into one printable solid.
    _wordartShapesPerLine(lineConfigs, overlapRatio) {
        const overlap = (overlapRatio == null) ? 0.35 : overlapRatio;
        const out = [];
        let baselineY = 0;
        let prevDescent = 0;

        for (let i = 0; i < lineConfigs.length; i++) {
            const cfg = lineConfigs[i];
            if (!cfg || !cfg.text || !cfg.font) continue;

            const font = cfg.font;
            const fs   = cfg.fontSize;
            const upm  = font.unitsPerEm || 1000;
            const ascent  = (font.ascender  || 0) *  fs / upm; // positive
            const descent = (font.descender || 0) * -fs / upm; // make positive

            if (i === 0) {
                baselineY = 0;            // top line: baseline at 0, glyphs span [-ascent, +descent]
            } else {
                // Place this line's baseline so its cap top sits INSIDE the previous line's
                // descender region. Overlap = fraction of THIS line's ascent.
                baselineY = prevDescent + ascent - (ascent * overlap);
            }

            const p = font.getPath(cfg.text, 0, baselineY, fs);
            const d = p.toPathData(3);
            const shapes = this._pathDataToShapes(d);
            const bb = p.getBoundingBox();
            if (shapes.length) {
                out.push({
                    lineIndex: i,
                    shapes:    shapes,
                    baselineY: baselineY,
                    bounds:    { x1: bb.x1, x2: bb.x2, y1: bb.y1, y2: bb.y2 },
                });
            }
            prevDescent = baselineY + descent;
        }
        return out;
    }

    /* ── Build the 3D Keychain Mesh ── */

    _clearKeychain() {
        if (!this.keychainGroup) return;
        this.scene.remove(this.keychainGroup);
        this.keychainGroup.traverse(function (obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(function (m) { m.dispose(); });
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.keychainGroup = null;
    }

    // Builds a closed heart THREE.Shape in opentype/SVG coords (Y-down: cusps at low Y, point at high Y).
    // (cx, cy) = TOP of the bounding box (= top of the cusps, NOT the cleft).
    // `size`   = exact bbox height. Width ends up ≈ size * (22/16).
    //
    // Canonical path (units): cleft at (0, 2.5), cusps top at (0, 0), point at (0, 16). Bbox height = 16.
    static makeHeartShape(cx, cy, size) {
        var s = size / 16;
        var h = new THREE.Shape();
        // Path is the same canonical heart, but offset so the cusps' top sits at y = 0 (then translated to cy).
        h.moveTo(cx + 0 * s,        cy + 2.5 * s);
        h.bezierCurveTo(cx + 0 * s,    cy + 2.5 * s,  cx + 2 * s,   cy + 0 * s,   cx + 5 * s,   cy + 0 * s);
        h.bezierCurveTo(cx + 11 * s,   cy + 0 * s,    cx + 11 * s,  cy + 7 * s,   cx + 11 * s,  cy + 7 * s);
        h.bezierCurveTo(cx + 11 * s,   cy + 10.5 * s, cx + 6 * s,   cy + 13.5 * s, cx + 0 * s,  cy + 16 * s);
        h.bezierCurveTo(cx - 6 * s,    cy + 13.5 * s, cx - 11 * s,  cy + 10.5 * s, cx - 11 * s, cy + 7 * s);
        h.bezierCurveTo(cx - 11 * s,   cy + 7 * s,    cx - 11 * s,  cy + 0 * s,   cx - 5 * s,   cy + 0 * s);
        h.bezierCurveTo(cx - 2 * s,    cy + 0 * s,    cx + 0 * s,   cy + 2.5 * s, cx + 0 * s,   cy + 2.5 * s);
        return h;
    }

    /* ── Default 3D Parameters ── */

    static getDefaults() {
        return {
            fontSize:          36,
            scaleFactor:       0.5,
            layers:            '3L',     // '2L' or '3L'
            productType:       'keychain', // 'keychain' | 'nameplate' | 'wordart'
            lineHeightRatio:   1.15,     // tight (~0.9) for word-art so descenders touch caps
            lineColors:        null,     // word-art only: [line0Color, line1Color]
            base: {
                depth:          3,
                bevelThickness: 0,
                bevelSize:      3,
                bevelSegments:  8,
            },
            outline: {
                depth:          1.5,
                bevelThickness: 0,
                bevelSize:      2,
                bevelSegments:  3,
            },
            font: {
                depth:          1.5,
                bevelThickness: 0,
                bevelSize:      0.2,
                bevelSegments:  3,
            },
            ring: {
                outerRadius:    5.5,
                innerRadius:    3.0,
                bevelThickness: 0.5,
                bevelSize:      0.5,
                bevelSegments:  4,
            },
        };
    }

    buildKeychain(text, font, baseColor, fontColor, outlineColor, params) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        // Merge user params with defaults
        var defaults = KeychainViewer.getDefaults();
        var p = Object.assign({}, defaults, params || {});
        p.base    = Object.assign({}, defaults.base,    (params && params.base)    || {});
        p.outline = Object.assign({}, defaults.outline, (params && params.outline) || {});
        p.font    = Object.assign({}, defaults.font,    (params && params.font)    || {});
        p.ring    = Object.assign({}, defaults.ring,    (params && params.ring)    || {});

        // Store current params for rebuildWithParams
        this._lastText       = text;
        this._lastFont       = font;
        this._lastBaseColor   = baseColor;
        this._lastFontColor   = fontColor;
        this._lastOutlineColor = outlineColor;
        this._lastParams     = p;

        // 1. Remove the degree symbol from 3D text (we will build a perfect 3D ring manually)
        var displayText = text.replace(/^\u00B0/, '');

        // Dynamic font sizing: ~50mm for ≤3 chars, ~75mm for 5+, linear interpolation between
        // For multi-line, size by the longest line so the keychain doesn't shrink unnecessarily
        var charLen = 0;
        var _lines = displayText.split('\n');
        for (var _i = 0; _i < _lines.length; _i++) {
            if (_lines[_i].length > charLen) charLen = _lines[_i].length;
        }
        var targetFontSize;
        if (charLen <= 3) {
            targetFontSize = Math.round(36 * (50 / 75));  // ~24
        } else if (charLen >= 5) {
            targetFontSize = 36;
        } else {
            // 4 chars: interpolate
            targetFontSize = Math.round(36 * (50 / 75) + (36 - 36 * (50 / 75)) * ((charLen - 3) / 2));
        }
        var fontSize = Math.round(targetFontSize * p.scaleFactor);

        var isWordart   = p.productType === 'wordart';
        var isNameplate = p.productType === 'nameplate';
        var isTileKey   = p.productType === 'tilekey';

        // Tile keychain takes a totally different geometry path. Branch early.
        if (isTileKey) {
            this._buildTileKeychain(text, font, baseColor, fontColor, outlineColor, p);
            return;
        }

        // Word-art uses a tight line height so descenders of line 1 touch caps of line 2,
        // making the bottom line act as a structural foot for the top line.
        var lineHeightRatio = p.lineHeightRatio;
        if (isWordart && (!params || params.lineHeightRatio === undefined)) {
            lineHeightRatio = 0.9;
        }

        // For word-art, build per-line shapes with REAL font metrics so descenders overlap
        // the next line's caps and the whole thing prints as a single fused solid.
        var perLine = null;
        var shapes;

        if (isWordart) {
            var rawLines = displayText.split('\n');
            // Collapse to non-empty lines for the layout.
            var nonEmpty = [];
            for (var li = 0; li < rawLines.length; li++) {
                if (rawLines[li] && rawLines[li].length) nonEmpty.push(rawLines[li]);
            }
            var fontTop    = (params && params.fontTop)    || font;
            var fontBottom = (params && params.fontBottom) || font;
            // Bottom line acts as structural foot — slightly larger so its width can match/exceed top.
            var bottomFontSizeBoost = 1.15;
            var lineConfigs = [];
            for (var lk = 0; lk < nonEmpty.length; lk++) {
                lineConfigs.push({
                    text:     nonEmpty[lk],
                    font:     (lk === 0) ? fontTop : fontBottom,
                    fontSize: (lk === 0) ? fontSize : Math.round(fontSize * bottomFontSizeBoost),
                });
            }
            // Overlap of bottom line's ascent. 0.55 was too aggressive — descenders impaled caps.
            // 0.40 gives a soft kiss between lines while still fusing into one printable solid
            // (the wider outline halo bevelSize bridges any residual gap).
            perLine = this._wordartShapesPerLine(lineConfigs, 0.40);

            // ── Optional trailing heart (LOVE Series) ──
            // Sized to match the top line's ACTUAL rendered ink height (bbox), not full em metrics.
            // Vertically clamped: heart's bbox top = top line's bbox top, bottom shrunk to fit.
            // Width is roughly bbox-height * 1.4 (heart aspect), positioned to the right with a gap.
            var heartShape = null;
            if (params && params.appendHeart && perLine.length > 0) {
                var topEntry = perLine[0];
                if (topEntry && topEntry.bounds) {
                    var inkTop    = topEntry.bounds.y1;
                    var inkBot    = topEntry.bounds.y2;
                    var inkHeight = inkBot - inkTop;
                    var rightEdge = topEntry.bounds.x2;

                    // Heart at ~85% of top line's ink height — visually balanced and guaranteed to
                    // fit inside the top line's vertical band (no bleed into the line below).
                    var heartSize     = inkHeight * 0.85;
                    var gap           = inkHeight * 0.18;
                    var heartHalfW    = heartSize * 11 / 16; // bezier half-width at this size
                    var heartCx       = rightEdge + gap + heartHalfW;
                    // Center the heart vertically on the top line's ink midline.
                    var heartTopY     = inkTop + (inkHeight - heartSize) / 2;
                    heartShape = KeychainViewer.makeHeartShape(heartCx, heartTopY, heartSize);
                }
            }

            // Union = per-line text shapes + (optional) heart, used for the halo.
            shapes = [];
            for (var lm = 0; lm < perLine.length; lm++) {
                for (var ln = 0; ln < perLine[lm].shapes.length; ln++) {
                    shapes.push(perLine[lm].shapes[ln]);
                }
            }
            if (heartShape) shapes.push(heartShape);

            // Stash heart for separate red mesh rendering later in the font block.
            this._wordartHeartShape = heartShape || null;
            this._wordartHeartColor = (params && params.heartColor) || '#FF1F4B';
        } else {
            shapes = this._textToShapes(font, displayText, fontSize, lineHeightRatio);
        }
        if (!shapes || shapes.length === 0) return;

        // For nameplate: compute the bounding box of the text shapes to size the plate
        var textBounds = null;
        if (isNameplate) {
            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (var si = 0; si < shapes.length; si++) {
                var pts = shapes[si].extractPoints(12).shape;
                for (var pi = 0; pi < pts.length; pi++) {
                    var pt = pts[pi];
                    if (pt.x < minX) minX = pt.x;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.y > maxY) maxY = pt.y;
                }
            }
            textBounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
        }

        // ── Materials ──
        var baseMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(baseColor),
            roughness:          0.32,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });

        var outlineMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(outlineColor),
            roughness:          0.30,
            metalness:          0.0,
            clearcoat:          0.90,
            clearcoatRoughness: 0.10,
            side:               THREE.DoubleSide,
        });

        var fontMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(fontColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });

        // ── Base Layer (Widest, bottom) ──
        // Word-art has no separate base — the letters themselves are the structure.
        if (!isWordart) {
            var baseSettings = {
                depth:         p.base.depth,
                bevelEnabled:  true,
                bevelThickness: p.base.bevelThickness,
                bevelSize:      p.base.bevelSize,
                bevelOffset:    0,
                bevelSegments:  p.base.bevelSegments,
            };
            var baseShapes;
            if (isNameplate) {
                // Build a rounded-rectangle plaque sized to text + padding.
                var padX = Math.max(8, fontSize * 0.6);
                var padY = Math.max(6, fontSize * 0.4);
                var rectMinX = textBounds.minX - padX;
                var rectMaxX = textBounds.maxX + padX;
                var rectMinY = textBounds.minY - padY;
                var rectMaxY = textBounds.maxY + padY;
                var rectW = rectMaxX - rectMinX;
                var rectH = rectMaxY - rectMinY;
                var corner = Math.min(rectH * 0.25, rectW * 0.08, 8);

                var plate = new THREE.Shape();
                plate.moveTo(rectMinX + corner, rectMinY);
                plate.lineTo(rectMaxX - corner, rectMinY);
                plate.quadraticCurveTo(rectMaxX, rectMinY, rectMaxX, rectMinY + corner);
                plate.lineTo(rectMaxX, rectMaxY - corner);
                plate.quadraticCurveTo(rectMaxX, rectMaxY, rectMaxX - corner, rectMaxY);
                plate.lineTo(rectMinX + corner, rectMaxY);
                plate.quadraticCurveTo(rectMinX, rectMaxY, rectMinX, rectMaxY - corner);
                plate.lineTo(rectMinX, rectMinY + corner);
                plate.quadraticCurveTo(rectMinX, rectMinY, rectMinX + corner, rectMinY);
                baseShapes = [plate];
            } else {
                baseShapes = shapes;
            }
            var baseGeo  = new THREE.ExtrudeGeometry(baseShapes, baseSettings);
            var baseMesh = new THREE.Mesh(baseGeo, baseMat);
            baseMesh.position.z = 0;
            this.keychainGroup.add(baseMesh);
        }

        // Base front Z = depth + bevelThickness (0 for word-art, since there's no base)
        var baseFrontZ = isWordart ? 0 : p.base.depth + p.base.bevelThickness;

        // Track the Z position for stacking layers
        var currentZ = baseFrontZ;

        // For nameplate mode: shear the text+outline along Y by Z so the bottom face stays
        // flush with the plate (Z = baseFrontZ stays put) and the top face slides backward.
        // 30° shear → walls form a 120° angle with the plate.
        // Skew direction: scale.y = -1 on the parent group flips the visual axis, so a +Y
        // shear in local coords actually slides backward in world view.
        var shearMatrix = null;
        if (isNameplate) {
            var shearAmount = Math.tan(Math.PI / 6); // tan(30°) ≈ 0.577
            shearMatrix = new THREE.Matrix4().set(
                1, 0, 0,           0,
                0, 1, shearAmount, -shearAmount * baseFrontZ,
                0, 0, 1,           0,
                0, 0, 0,           1
            );
        }
        var stackParent = this.keychainGroup;

        // ── Outline Layer (Medium width, middle) — only in 3L mode ──
        if (p.layers === '3L') {
            var outlineSettings = {
                depth:         p.outline.depth,
                bevelEnabled:  true,
                bevelThickness: p.outline.bevelThickness,
                bevelSize:      p.outline.bevelSize,
                bevelOffset:    0,
                bevelSegments:  p.outline.bevelSegments,
            };
            // Word-art: thicker outline AND wider bevelSize so the halo spreads outward
            // enough to bridge the visual seam between line 1 and line 2 — gives one
            // continuous silhouette like the inspiration ("schon HIER").
            if (isWordart) {
                outlineSettings.depth     = Math.max(outlineSettings.depth, 4);
                outlineSettings.bevelSize = Math.max(outlineSettings.bevelSize, 2.5);
                outlineSettings.bevelThickness = Math.max(outlineSettings.bevelThickness, 0.5);
            }
            var outlineGeo  = new THREE.ExtrudeGeometry(shapes, outlineSettings);
            var outlineLayerBottomZ = currentZ + p.outline.bevelThickness;
            outlineGeo.translate(0, 0, outlineLayerBottomZ);
            if (shearMatrix) outlineGeo.applyMatrix4(shearMatrix);
            var outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
            stackParent.add(outlineMesh);

            currentZ = currentZ + p.outline.bevelThickness + p.outline.depth + p.outline.bevelThickness;
        }

        // ── Text Layer (Narrowest, top face) ──
        // For word-art, each line gets its own mesh + material so colors can differ per line.
        var fontSettings = {
            depth:         p.font.depth,
            bevelEnabled:  true,
            bevelThickness: p.font.bevelThickness,
            bevelSize:      p.font.bevelSize,
            bevelOffset:    0,
            bevelSegments:  p.font.bevelSegments,
        };
        var fontLayerBottomZ = currentZ + p.font.bevelThickness;

        // Word-art uses thicker text since the letters ARE the structure (no plate behind).
        if (isWordart) {
            fontSettings.depth = Math.max(p.font.depth, 6);
        }

        if (isWordart && perLine && perLine.length > 0) {
            for (var lj = 0; lj < perLine.length; lj++) {
                var lineEntry = perLine[lj];
                var lineColor = (p.lineColors && p.lineColors[lineEntry.lineIndex]) || fontColor;
                var lineMat = new THREE.MeshPhysicalMaterial({
                    color:              new THREE.Color(lineColor),
                    roughness:          0.28,
                    metalness:          0.0,
                    clearcoat:          0.95,
                    clearcoatRoughness: 0.08,
                    side:               THREE.DoubleSide,
                });
                var lineGeo = new THREE.ExtrudeGeometry(lineEntry.shapes, fontSettings);
                lineGeo.translate(0, 0, fontLayerBottomZ);
                stackParent.add(new THREE.Mesh(lineGeo, lineMat));
            }
            // LOVE Series: trailing red heart, rendered as its own mesh so color is independent of line color.
            if (this._wordartHeartShape) {
                var heartMat = new THREE.MeshPhysicalMaterial({
                    color:              new THREE.Color(this._wordartHeartColor),
                    roughness:          0.30,
                    metalness:          0.0,
                    clearcoat:          0.95,
                    clearcoatRoughness: 0.08,
                    side:               THREE.DoubleSide,
                });
                var heartGeo = new THREE.ExtrudeGeometry(this._wordartHeartShape, fontSettings);
                heartGeo.translate(0, 0, fontLayerBottomZ);
                stackParent.add(new THREE.Mesh(heartGeo, heartMat));
            }
        } else {
            var fontGeo  = new THREE.ExtrudeGeometry(shapes, fontSettings);
            fontGeo.translate(0, 0, fontLayerBottomZ);
            if (shearMatrix) fontGeo.applyMatrix4(shearMatrix);
            var fontMesh = new THREE.Mesh(fontGeo, fontMat);
            stackParent.add(fontMesh);
        }

        // ── Programmatic Keychain Ring (Top-Left, like a Degree Symbol) ──
        // Skip for nameplates (sit flat on desk) and word-art (letters are the structure).
        if (!isNameplate && !isWordart) {
        var ringOuter = p.ring.outerRadius;
        var ringInner = p.ring.innerRadius;
        var ringShape = new THREE.Shape();
        ringShape.absarc(0, 0, ringOuter, 0, Math.PI * 2, false);
        var ringHole = new THREE.Path();
        ringHole.absarc(0, 0, ringInner, 0, Math.PI * 2, true);
        ringShape.holes.push(ringHole);

        // Ring depth matches the total base thickness
        var totalBaseThickness = p.base.depth + p.base.bevelThickness * 2;
        var ringDepth = totalBaseThickness - p.ring.bevelThickness * 2;

        var ringSettings = {
            depth:         Math.max(1, ringDepth),
            bevelEnabled:  true,
            bevelThickness: p.ring.bevelThickness,
            bevelSize:      p.ring.bevelSize,
            bevelOffset:    0,
            bevelSegments:  p.ring.bevelSegments,
        };
        var ringGeo = new THREE.ExtrudeGeometry(ringShape, ringSettings);
        var ringMesh = new THREE.Mesh(ringGeo, baseMat);
        // Align ring Z with base Z
        ringMesh.position.z = -p.base.bevelThickness + p.ring.bevelThickness;

        // Position the ring securely attached to the leftmost ink of the first character
        // (first char of the first non-empty line — supports multi-line text)
        var firstLine = '';
        for (var _li = 0; _li < _lines.length; _li++) {
            if (_lines[_li].length > 0) { firstLine = _lines[_li]; break; }
        }
        var firstChar = firstLine.charAt(0) || displayText.charAt(0) || ' ';
        var firstCharPath = font.getPath(firstChar, 0, 0, fontSize);
        var firstCharBox = firstCharPath.getBoundingBox();
        
        var minX = firstCharBox.x1;
        var yAtMinX = firstCharBox.y1; // fallback
        var closestX = Infinity;
        
        // Find the Y coordinate of the anchor point closest to the true left edge
        for (var i = 0; i < firstCharPath.commands.length; i++) {
            var cmd = firstCharPath.commands[i];
            if (cmd.x !== undefined) {
                var dist = Math.abs(cmd.x - minX);
                if (dist < closestX) {
                    closestX = dist;
                    yAtMinX = cmd.y;
                }
            }
        }

        // The base layer expands outward by p.base.bevelSize.
        // We want the ring to overlap this expanded base by a safe amount (max 4mm or 80% of ring radius)
        var overlap = Math.min(4, ringOuter * 0.8);
        ringMesh.position.x = minX - p.base.bevelSize - ringOuter + overlap;
        ringMesh.position.y = yAtMinX;
        this.keychainGroup.add(ringMesh);
        } // end !isNameplate

        // ── Flip Y (opentype/SVG Y-down → Three.js Y-up) ──
        this.keychainGroup.scale.y = -1;

        // ── Center the group ──
        var box    = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        this.scene.add(this.keychainGroup);

        // ── Fit camera ──
        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.2, maxDim * 2.2);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    /* ── Tile keychain (vertical letter-tile name tag) ──
       colors: base = strip, line2 = tile, font = letter (reused palette slots).
       text:   uppercased characters, one per tile, vertical (top-to-bottom).
    */
    _buildTileKeychain(text, font, stripColor, letterColor, outlineColorFallback, p) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        // Color slots reused (no new UI): strip = colors.base, letter = colors.font, tile = colors.line2.
        // (lineColors[1] carries colors.line2 in update() above.)
        var tileColor = (p.lineColors && p.lineColors[1]) || outlineColorFallback || '#FFFFFF';

        console.log('[TileKey rebuild]', { stripColor: stripColor, letterColor: letterColor, tileColor: tileColor, lineColors: p.lineColors });

        var rawText = (text || '').replace(/[\r\n]/g, '');
        var chars   = rawText.toUpperCase().split('').slice(0, 8);
        if (chars.length === 0) return;

        // ── Sizing (mm) ──
        var TILE_SIZE        = 22;            // square tile edge
        var TILE_GAP         = 1.5;           // vertical gap between tiles
        var STRIP_PAD_X      = 5;             // left/right margin around tiles
        var STRIP_PAD_TOP    = 18;            // extra top space for lanyard hole
        var STRIP_PAD_BOTTOM = 6;
        var STRIP_CORNER     = 8;
        var TILE_CORNER      = 4;
        var LANYARD_RADIUS   = 4;
        var LANYARD_FROM_TOP = 9;             // hole center distance from strip top
        var STRIP_DEPTH      = 3;
        var TILE_DEPTH       = 1.8;
        var LETTER_DEPTH     = 1.2;

        // Apply user scaleFactor to the whole assembly.
        var scale = p.scaleFactor || 1;

        var stripW = TILE_SIZE + STRIP_PAD_X * 2;
        var tilesH = chars.length * TILE_SIZE + (chars.length - 1) * TILE_GAP;
        var stripH = tilesH + STRIP_PAD_TOP + STRIP_PAD_BOTTOM;

        // Center the assembly at (0, 0). Strip y from -stripH/2 to +stripH/2.
        var stripMinX = -stripW / 2;
        var stripMaxX =  stripW / 2;
        var stripMinY = -stripH / 2;
        var stripMaxY =  stripH / 2;

        // ── Strip shape with rounded corners + circular lanyard hole ──
        var strip = new THREE.Shape();
        var c = STRIP_CORNER;
        strip.moveTo(stripMinX + c, stripMinY);
        strip.lineTo(stripMaxX - c, stripMinY);
        strip.quadraticCurveTo(stripMaxX, stripMinY, stripMaxX, stripMinY + c);
        strip.lineTo(stripMaxX, stripMaxY - c);
        strip.quadraticCurveTo(stripMaxX, stripMaxY, stripMaxX - c, stripMaxY);
        strip.lineTo(stripMinX + c, stripMaxY);
        strip.quadraticCurveTo(stripMinX, stripMaxY, stripMinX, stripMaxY - c);
        strip.lineTo(stripMinX, stripMinY + c);
        strip.quadraticCurveTo(stripMinX, stripMinY, stripMinX + c, stripMinY);

        // Lanyard hole at the top (circular cutout).
        var holeY = stripMaxY - LANYARD_FROM_TOP;
        var holePath = new THREE.Path();
        holePath.absarc(0, holeY, LANYARD_RADIUS, 0, Math.PI * 2, true);
        strip.holes.push(holePath);

        // ── Materials ──
        var matStrip = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(stripColor),
            roughness:          0.40,
            metalness:          0.0,
            clearcoat:          0.6,
            clearcoatRoughness: 0.2,
            side:               THREE.DoubleSide,
        });
        var matTile = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(tileColor),
            roughness:          0.30,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });
        var matLetter = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(letterColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });

        // ── Strip mesh ──
        var stripGeo = new THREE.ExtrudeGeometry(strip, {
            depth:          STRIP_DEPTH,
            bevelEnabled:   true,
            bevelThickness: 0.6,
            bevelSize:      1.2,
            bevelSegments:  4,
        });
        this.keychainGroup.add(new THREE.Mesh(stripGeo, matStrip));

        var tileFrontZ   = STRIP_DEPTH;       // top face of strip
        var letterFrontZ = tileFrontZ + TILE_DEPTH;

        // Tile + letter loop. Layout from top to bottom in screen-space.
        // Strip Y axis: positive up. First tile starts just below the lanyard area.
        var firstTileTopY = stripMaxY - STRIP_PAD_TOP;

        for (var i = 0; i < chars.length; i++) {
            var tileTopY    = firstTileTopY - i * (TILE_SIZE + TILE_GAP);
            var tileBotY    = tileTopY - TILE_SIZE;
            var tileMidY    = (tileTopY + tileBotY) / 2;
            var tileMinX    = -TILE_SIZE / 2;
            var tileMaxX    =  TILE_SIZE / 2;

            // Rounded square tile shape
            var tile = new THREE.Shape();
            var tc = TILE_CORNER;
            tile.moveTo(tileMinX + tc, tileBotY);
            tile.lineTo(tileMaxX - tc, tileBotY);
            tile.quadraticCurveTo(tileMaxX, tileBotY, tileMaxX, tileBotY + tc);
            tile.lineTo(tileMaxX, tileTopY - tc);
            tile.quadraticCurveTo(tileMaxX, tileTopY, tileMaxX - tc, tileTopY);
            tile.lineTo(tileMinX + tc, tileTopY);
            tile.quadraticCurveTo(tileMinX, tileTopY, tileMinX, tileTopY - tc);
            tile.lineTo(tileMinX, tileBotY + tc);
            tile.quadraticCurveTo(tileMinX, tileBotY, tileMinX + tc, tileBotY);

            var tileGeo = new THREE.ExtrudeGeometry(tile, {
                depth:          TILE_DEPTH,
                bevelEnabled:   true,
                bevelThickness: 0.3,
                bevelSize:      0.5,
                bevelSegments:  3,
            });
            tileGeo.translate(0, 0, tileFrontZ);
            this.keychainGroup.add(new THREE.Mesh(tileGeo, matTile));

            // Letter — fit a single char to ~70% of tile size.
            var ch = chars[i];
            var targetGlyphHeight = TILE_SIZE * 0.70;
            // Use font metrics to back-solve the fontSize that gives this glyph height.
            var upm     = font.unitsPerEm || 1000;
            var capH    = ((font.ascender || 0) * 1) / upm; // ratio of cap height to em
            // For most fonts ascender ≈ 0.7–0.8 of em; back-solve fontSize so cap height = target.
            var fontSize = targetGlyphHeight / capH;
            // Clamp absurd values
            if (!isFinite(fontSize) || fontSize <= 0) fontSize = TILE_SIZE * 0.8;
            fontSize = Math.min(fontSize, TILE_SIZE * 1.1);

            // Build glyph path centered horizontally; opentype getPath uses Y-down so we offset
            // such that the char's bbox center lines up with tileMidY.
            var charPath = font.getPath(ch, 0, 0, fontSize);
            var bb       = charPath.getBoundingBox();
            var glyphW   = bb.x2 - bb.x1;
            var glyphH   = bb.y2 - bb.y1;
            var glyphCx  = (bb.x1 + bb.x2) / 2;
            var glyphCy  = (bb.y1 + bb.y2) / 2;
            // Render path at origin, then translate via geometry.translate.
            var translatedPath = font.getPath(ch, -glyphCx, -glyphCy, fontSize);
            var pathData       = translatedPath.toPathData(3);
            var letterShapes   = this._pathDataToShapes(pathData);
            if (letterShapes.length === 0) continue;

            var letterGeo = new THREE.ExtrudeGeometry(letterShapes, {
                depth:          LETTER_DEPTH,
                bevelEnabled:   true,
                bevelThickness: 0.2,
                bevelSize:      0.3,
                bevelSegments:  3,
            });
            // opentype paths are Y-down (caps at negative Y after centering). Flip the
            // geometry's Y before translating into scene Y-up coords.
            letterGeo.scale(1, -1, 1);
            letterGeo.translate(0, tileMidY, letterFrontZ);
            this.keychainGroup.add(new THREE.Mesh(letterGeo, matLetter));
        }

        // ── Apply scale to the whole group ──
        if (scale !== 1) {
            this.keychainGroup.scale.setScalar(scale);
        }

        // ── Center & fit camera ──
        var box  = new THREE.Box3().setFromObject(this.keychainGroup);
        var ctr  = box.getCenter(new THREE.Vector3());
        var sz   = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(ctr);
        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(sz.x, sz.y, sz.z);
        this.camera.position.set(0, maxDim * 0.1, maxDim * 2.0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Stash for getDimensions / rebuild
        this._lastText        = text;
        this._lastFont        = font;
        this._lastBaseColor   = stripColor;
        this._lastFontColor   = letterColor;
        this._lastOutlineColor = _ignoredOutlineColor;
        this._lastParams      = p;
    }

    /* ── Get physical dimensions in mm (1 Three.js unit ≈ 1mm) ── */
    getDimensions() {
        if (!this.keychainGroup) return { width: 0, height: 0, depth: 0 };
        var box  = new THREE.Box3().setFromObject(this.keychainGroup);
        var size = box.getSize(new THREE.Vector3());
        return {
            width:  Math.round(size.x * 10) / 10,
            height: Math.round(size.y * 10) / 10,
            depth:  Math.round(size.z * 10) / 10,
        };
    }

    /* ── Rebuild with new params (admin panel live preview) ── */
    rebuildWithParams(params) {
        if (!this._lastFont) return;
        this.buildKeychain(
            this._lastText,
            this._lastFont,
            this._lastBaseColor,
            this._lastFontColor,
            this._lastOutlineColor,
            params
        );
    }



    /* ── Public: update the keychain ── */

    async update(text, fontPath, colors, layers, adminParams, productType, wordartFonts) {
        var font = await this.loadFont(fontPath);
        var params = Object.assign({}, adminParams || {}, {
            layers: layers || '3L',
            productType: productType || (adminParams && adminParams.productType) || 'keychain',
        });

        // LOVE Series = word-art with locked bottom line ("LOVE") and locked bottom font.
        // Internally we render through the wordart pipeline so the geometry is identical.
        if (params.productType === 'loveseries') {
            // Force the bottom line. Strip whatever the user supplied for line 2 and append "LOVE".
            var topOnly = (text || '').split('\n')[0] || '';
            text = topOnly + '\nLOVE';
            // Render as wordart from here on out.
            params.productType = 'wordart';
            // Force bottom font to BagelFatOne; don't trust whatever the UI tried to set.
            wordartFonts = wordartFonts || {};
            wordartFonts.bottom = 'Fonts/BagelFatOne-Regular.ttf';
            // Append a red heart at the end of the top line.
            params.appendHeart      = true;
            params.heartColor       = '#FF1F4B';
        }

        if (params.productType === 'tilekey') {
            // Pass tile color via lineColors[1] (reusing the slot to avoid expanding the API).
            // Strip color = colors.base, letter color = colors.font, tile color = colors.line2.
            params.lineColors = [
                colors.font || '#FFFFFF',
                colors.line2 || '#FFFFFF',
            ];
        }
        if (params.productType === 'wordart') {
            // Per-line colors
            params.lineColors = [
                colors.font || '#FFFFFF',
                colors.line2 || colors.font || '#FFFFFF',
            ];
            // Per-line fonts — fall back to the primary font for either slot if not given.
            if (wordartFonts) {
                if (wordartFonts.top)    params.fontTop    = await this.loadFont(wordartFonts.top);
                if (wordartFonts.bottom) params.fontBottom = await this.loadFont(wordartFonts.bottom);
            }
            if (!params.fontTop)    params.fontTop    = font;
            if (!params.fontBottom) params.fontBottom = font;
        }
        this.buildKeychain(text, font, colors.base, colors.font, colors.outline, params);
    }

    /* ── Auto-rotate toggle ── */

    setAutoRotate(enabled) {
        this.controls.autoRotate = enabled;
    }

    toggleAutoRotate() {
        this.controls.autoRotate = !this.controls.autoRotate;
        return this.controls.autoRotate;
    }

    /* ── Download PNG at high resolution ── */

    downloadPNG(scale) {
        scale = scale || 4;
        var w = this.container.clientWidth  * scale;
        var h = this.container.clientHeight * scale;

        // Temporarily resize renderer for high-res capture
        var origW = this.renderer.domElement.width;
        var origH = this.renderer.domElement.height;
        var origPixelRatio = this.renderer.getPixelRatio();

        this.renderer.setPixelRatio(1);
        this.renderer.setSize(w, h);
        this.renderer.render(this.scene, this.camera);

        var dataURL = this.renderer.domElement.toDataURL('image/png');

        // Restore original size
        this.renderer.setPixelRatio(origPixelRatio);
        this.renderer.setSize(origW / origPixelRatio, origH / origPixelRatio);

        // Trigger download
        var a    = document.createElement('a');
        a.href     = dataURL;
        a.download = 'keychain-design-4k.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /* ── Download STL (For 3D Printing) ── */
    exportSTL(filename) {
        if (!this.keychainGroup) return;
        
        // Use binary:true to produce a smaller, standard STL file for slicers
        const exporter = new STLExporter();
        const stlString = exporter.parse(this.keychainGroup, { binary: true });
        
        const blob = new Blob([stlString], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename || 'keychain_3d_print.stl';
        
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ── Download SVG (the flat 2D preview) ── */

    static downloadSVG(svgElement) {
        if (!svgElement) return;
        var serializer = new XMLSerializer();
        var svgStr     = serializer.serializeToString(svgElement);
        var blob       = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        var url        = URL.createObjectURL(blob);

        var a      = document.createElement('a');
        a.href     = url;
        a.download = 'keychain-design.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ── Cleanup ── */

    dispose() {
        this.disposed = true;
        this._resizeObserver.disconnect();
        this._clearKeychain();
        this.controls.dispose();
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
