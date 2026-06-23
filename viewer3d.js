/* =========================================
   YOURSGIFTS — 3D KEYCHAIN VIEWER
   Three.js + opentype.js
   ========================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGLoader }     from 'three/addons/loaders/SVGLoader.js';
import { STLExporter }   from 'three/addons/exporters/STLExporter.js';
// Mesh-boolean engine for the LED Word Stand (hollow channels, peg tabs, slots).
import { Evaluator, Brush, SUBTRACTION, ADDITION } from 'three-bvh-csg';

// ===================================================================
// Clipper CAD helpers for boolean difference operations
// ===================================================================

function shapeToClipperPaths(shape, scale) {
    const paths = [];
    const pointsObj = shape.extractPoints(8);
    
    // Add outer contour
    const contour = [];
    for (let i = 0; i < pointsObj.shape.length; i++) {
        contour.push({
            X: Math.round(pointsObj.shape[i].x * scale),
            Y: Math.round(pointsObj.shape[i].y * scale)
        });
    }
    // Clean contour
    if (contour.length > 0) {
        const first = contour[0];
        const last = contour[contour.length - 1];
        if (first.X === last.X && first.Y === last.Y) {
            contour.pop();
        }
    }
    if (contour.length > 2) {
        paths.push(contour);
    }
    
    // Add holes
    if (pointsObj.holes) {
        for (let h = 0; h < pointsObj.holes.length; h++) {
            const holePoints = pointsObj.holes[h];
            const holeContour = [];
            for (let i = 0; i < holePoints.length; i++) {
                holeContour.push({
                    X: Math.round(holePoints[i].x * scale),
                    Y: Math.round(holePoints[i].y * scale)
                });
            }
            if (holeContour.length > 0) {
                const first = holeContour[0];
                const last = holeContour[holeContour.length - 1];
                if (first.X === last.X && first.Y === last.Y) {
                    holeContour.pop();
                }
            }
            if (holeContour.length > 2) {
                paths.push(holeContour);
            }
        }
    }
    return paths;
}

function polyTreeToShapes(polyTree, scale) {
    const shapes = [];

    function processOuterNode(node) {
        const pts = [];
        const contour = node.Contour();
        for (let i = 0; i < contour.length; i++) {
            pts.push(new THREE.Vector2(contour[i].X / scale, contour[i].Y / scale));
        }
        if (pts.length < 3) return null;
        
        const shape = new THREE.Shape(pts);
        
        for (let i = 0; i < node.ChildCount(); i++) {
            const holeNode = node.Childs()[i];
            if (holeNode.IsHole()) {
                const holePts = [];
                const holeContour = holeNode.Contour();
                for (let j = 0; j < holeContour.length; j++) {
                    holePts.push(new THREE.Vector2(holeContour[j].X / scale, holeContour[j].Y / scale));
                }
                if (holePts.length >= 3) {
                    const holePath = new THREE.Path(holePts);
                    shape.holes.push(holePath);
                }
                // Process any nested outer shapes within this hole
                for (let j = 0; j < holeNode.ChildCount(); j++) {
                    const nestedOuterNode = holeNode.Childs()[j];
                    const nestedShape = processOuterNode(nestedOuterNode);
                    if (nestedShape) {
                        shapes.push(nestedShape);
                    }
                }
            } else {
                const nestedShape = processOuterNode(holeNode);
                if (nestedShape) {
                    shapes.push(nestedShape);
                }
            }
        }
        return shape;
    }

    for (let i = 0; i < polyTree.ChildCount(); i++) {
        const topNode = polyTree.Childs()[i];
        if (!topNode.IsHole()) {
            const shape = processOuterNode(topNode);
            if (shape) {
                shapes.push(shape);
            }
        } else {
            for (let j = 0; j < topNode.ChildCount(); j++) {
                const childNode = topNode.Childs()[j];
                const shape = processOuterNode(childNode);
                if (shape) {
                    shapes.push(shape);
                }
            }
        }
    }

    return shapes;
}

function subtractShapes(subjShapes, clipShapes) {
    if (typeof ClipperLib === 'undefined') {
        console.warn('ClipperLib not loaded yet, skipping subtraction.');
        return subjShapes;
    }
    const scale = 100000;
    const clipper = new ClipperLib.Clipper();
    
    // Add subject shapes
    for (let i = 0; i < subjShapes.length; i++) {
        const paths = shapeToClipperPaths(subjShapes[i], scale);
        clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
    }
    
    // Add clip shapes
    for (let i = 0; i < clipShapes.length; i++) {
        const paths = shapeToClipperPaths(clipShapes[i], scale);
        clipper.AddPaths(paths, ClipperLib.PolyType.ptClip, true);
    }
    
    const polyTree = new ClipperLib.PolyTree();
    clipper.Execute(
        ClipperLib.ClipType.ctDifference,
        polyTree,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );
    
    return polyTreeToShapes(polyTree, scale);
}

function unionShapes(subjShapes, clipShapes) {
    if (typeof ClipperLib === 'undefined') {
        return subjShapes.concat(clipShapes);
    }
    const scale = 100000;
    const clipper = new ClipperLib.Clipper();
    for (let i = 0; i < subjShapes.length; i++) {
        const paths = shapeToClipperPaths(subjShapes[i], scale);
        clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
    }
    for (let i = 0; i < clipShapes.length; i++) {
        const paths = shapeToClipperPaths(clipShapes[i], scale);
        clipper.AddPaths(paths, ClipperLib.PolyType.ptClip, true);
    }
    const polyTree = new ClipperLib.PolyTree();
    clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        polyTree,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );
    return polyTreeToShapes(polyTree, scale);
}

function offsetShapes(shapes, delta) {
    if (typeof ClipperLib === 'undefined' || delta === 0) {
        return shapes;
    }
    const scale = 100000;
    const co = new ClipperLib.ClipperOffset();
    for (let i = 0; i < shapes.length; i++) {
        const paths = shapeToClipperPaths(shapes[i], scale);
        co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
    }
    const polyTree = new ClipperLib.PolyTree();
    co.Execute(polyTree, delta * scale);
    return polyTreeToShapes(polyTree, scale);
}

// Union all glyph shapes, then offset outward by `padding` to get the box/cover
// footprint. When `isHollow`, also offset by `padding - wallThk` and subtract to
// produce a wall ring. Returns { coverShapes, wallShapes } or null on failure.
// Used by the LED Word Art / LED Word Stand builders. (Ported from Achuva.)
function clipperUnionAndOffset(baseShapes, padding, wallThk, isHollow) {
    if (typeof ClipperLib === 'undefined') {
        console.warn('ClipperLib not loaded; cannot build LED housing.');
        return null;
    }
    const scale = 1000;

    try {
        // 1. Boolean union of all character shapes.
        const clipper = new ClipperLib.Clipper();
        for (let i = 0; i < baseShapes.length; i++) {
            const paths = shapeToClipperPaths(baseShapes[i], scale);
            clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
        }

        const unionedTree = new ClipperLib.PolyTree();
        clipper.Execute(
            ClipperLib.ClipType.ctUnion,
            unionedTree,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );

        const unionedPaths = ClipperLib.Clipper.PolyTreeToPaths(unionedTree);

        // 2. Offset by `padding` for the outer contour (round joins fillet corners).
        const coOuter = new ClipperLib.ClipperOffset();
        coOuter.AddPaths(unionedPaths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
        coOuter.ArcTolerance = 0.25 * scale;

        const outerTree = new ClipperLib.PolyTree();
        coOuter.Execute(outerTree, padding * scale);

        const outerShapes = polyTreeToShapes(outerTree, scale);

        if (!isHollow) {
            return { coverShapes: outerShapes, wallShapes: [] };
        }

        // 3. Inner contour = offset by (padding - wallThk).
        const coInner = new ClipperLib.ClipperOffset();
        coInner.AddPaths(unionedPaths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
        coInner.ArcTolerance = 0.25 * scale;

        const innerTree = new ClipperLib.PolyTree();
        coInner.Execute(innerTree, (padding - wallThk) * scale);

        // 4. Wall ring = outer minus inner.
        const clipperDiff = new ClipperLib.Clipper();
        const outerPaths = ClipperLib.Clipper.PolyTreeToPaths(outerTree);
        const innerPaths = ClipperLib.Clipper.PolyTreeToPaths(innerTree);

        clipperDiff.AddPaths(outerPaths, ClipperLib.PolyType.ptSubject, true);
        clipperDiff.AddPaths(innerPaths, ClipperLib.PolyType.ptClip, true);

        const wallTree = new ClipperLib.PolyTree();
        clipperDiff.Execute(
            ClipperLib.ClipType.ctDifference,
            wallTree,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );

        const wallShapes = polyTreeToShapes(wallTree, scale);

        return { coverShapes: outerShapes, wallShapes: wallShapes };

    } catch (err) {
        console.error('clipperUnionAndOffset failed:', err);
        return null;
    }
}

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
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
        keyLight.position.set(30, 80, 50);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 300;
        const d = 80;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xc8b8ff, 0.6);
        fillLight.position.set(-30, -10, 20);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffd080, 0.4);
        rimLight.position.set(0, -20, -30);
        this.scene.add(rimLight);

        // Ground Plane for Shadows
        const shadowPlaneGeo = new THREE.PlaneGeometry(1000, 1000);
        const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.16 });
        this.shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
        this.shadowPlane.rotation.x = -Math.PI / 2;
        this.shadowPlane.position.y = -20;
        this.shadowPlane.receiveShadow = true;
        this.scene.add(this.shadowPlane);

        // Theme Support (Clean neutral studio backdrop)
        const isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        if (isLight) {
            this.scene.background = new THREE.Color(0xf5f5f7);
        } else {
            this.scene.background = new THREE.Color(0x12111a);
        }

        window.addEventListener('theme-changed', (e) => {
            const theme = e.detail.theme;
            if (theme === 'light') {
                this.scene.background = new THREE.Color(0xf5f5f7);
            } else {
                this.scene.background = new THREE.Color(0x12111a);
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
            ringPosition:      'left',   // 'left' | 'right' | 'none'
            lineHeightRatio:   1.15,     // tight (~0.9) for word-art so descenders touch caps
            lineColors:        null,     // word-art only: [line0Color, line1Color]
            showFDMTexture:    false,
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
                // Vertical anchor of the keyring relative to the text run:
                //   'top'    — sits at the top corner above the first letter (default, most attractive)
                //   'center' — vertically centred on the keychain body
                anchor:         'top',
            },
        };
    }

    _applyFDMTexture(material, p) {
        if (!p || !p.showFDMTexture) return;
        
        material.customProgramCacheKey = () => 'fdm_on';
        material.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                'varying vec3 vLocalPosition;\nvoid main() {\nvLocalPosition = position;'
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                'void main() {',
                'varying vec3 vLocalPosition;\nvoid main() {'
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <normal_fragment_maps>',
                `#include <normal_fragment_maps>
                
                // Realistic 3D print layer/infill lines simulation (0.2mm layers equivalent)
                float layerFrequency = 90.0;
                float layerStrength = 0.08;
                
                float infillFrequency = 14.0;
                float infillStrength = 0.05;
                
                vec3 geomNormal = normalize(vNormal);
                
                if (abs(geomNormal.z) > 0.8) {
                    // Top / bottom face: rectilinear 45-deg infill lines
                    float infillVal = sin((vLocalPosition.x + vLocalPosition.y) * infillFrequency);
                    float infillSlope = cos((vLocalPosition.x + vLocalPosition.y) * infillFrequency);
                    vec3 infillPerturbation = vec3(infillSlope, -infillSlope, 0.0) * infillStrength;
                    normal = normalize(normal + infillPerturbation);
                } else {
                    // Vertical sides: Z-layer lines
                    float layerVal = sin(vLocalPosition.z * layerFrequency);
                    float layerSlope = cos(vLocalPosition.z * layerFrequency);
                    vec3 layerPerturbation = vec3(0.0, 0.0, layerSlope) * layerStrength;
                    normal = normalize(normal + layerPerturbation);
                }
                `
            );
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
        var isLinkedInitials = p.productType === 'linked_initials';

        // Tile keychain takes a totally different geometry path. Branch early.
        if (isTileKey) {
            this._buildTileKeychain(text, font, baseColor, fontColor, outlineColor, p);
            return;
        }

        var isBordered = p.productType === 'bordered_keychain';
        if (isBordered) {
            this._buildBorderedKeychain(text, font, baseColor, fontColor, outlineColor, p);
            return;
        }

        var isSupported = p.productType === 'supported_text';
        if (isSupported) {
            this._buildSupportedText(text, font, baseColor, fontColor, outlineColor, p);
            return;
        }

        var isFlower = p.productType === 'flower_keychain';
        if (isFlower) {
            this._buildFlowerKeychain(text, font, baseColor, fontColor, outlineColor, p);
            return;
        }

        var isNametag = p.productType === 'nametag';
        if (isNametag) {
            this._buildWavyNametag(text, font, baseColor, p);
            return;
        }

        var isGirly = p.productType === 'girly_keychain';
        if (isGirly) {
            this._buildGirlyKeychain(text, font, baseColor, fontColor, outlineColor, p);
            return;
        }

        var isLedWordStand = p.productType === 'led_word_stand';
        if (isLedWordStand) {
            this._buildLedWordStand(text, font, baseColor, fontColor, p);
            return;
        }

        var isLedWordArt = p.productType === 'led_word_art';
        if (isLedWordArt) {
            this._buildLedWordArt(text, font, baseColor, fontColor, p);
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
        var shapesLeft = null;
        var shapesRight = null;
        var shapesHeart = null;
        var initialSize = 0;
        var cx1 = 0, cy1 = 0, cx2 = 0, cy2 = 0;
        var xOffset = 0, yOffset = 0;
        var leftMat = null;

        if (isLinkedInitials) {
            var char1 = displayText.charAt(0) || 'S';
            var char2 = displayText.charAt(1) || 'P';
            
            initialSize = Math.round(55 * p.scaleFactor);
            
            xOffset = Math.round(15 * p.scaleFactor);
            yOffset = Math.round(10 * p.scaleFactor);
            
            // Left Initial (Shifted left and up in Three.js / negative Y in SVG)
            var path1 = font.getPath(char1, 0, 0, initialSize);
            var bb1 = path1.getBoundingBox();
            cx1 = (bb1.x1 + bb1.x2) / 2;
            cy1 = (bb1.y1 + bb1.y2) / 2;
            var leftPath = font.getPath(char1, -xOffset - cx1, -yOffset - cy1, initialSize);
            var rawShapesLeft = this._pathDataToShapes(leftPath.toPathData(3));
            
            // Right Initial (Shifted right and down in Three.js / positive Y in SVG)
            var path2 = font.getPath(char2, 0, 0, initialSize);
            var bb2 = path2.getBoundingBox();
            cx2 = (bb2.x1 + bb2.x2) / 2;
            cy2 = (bb2.y1 + bb2.y2) / 2;
            var rightPath = font.getPath(char2, xOffset - cx2, yOffset - cy2, initialSize);
            var rawShapesRight = this._pathDataToShapes(rightPath.toPathData(3));
            
            // Heart shape in center (Cute and small, size ~26% of letter size)
            var hSize = Math.round(initialSize * 0.26);
            var heartShape = KeychainViewer.makeHeartShape(0, -hSize / 2, hSize);
            shapesHeart = [heartShape];

            // Perform 2D CSG boolean subtraction to cut out the heart area from the letters
            shapesLeft = subtractShapes(rawShapesLeft, shapesHeart);
            shapesRight = subtractShapes(rawShapesRight, shapesHeart);
            
            shapes = [...shapesLeft, ...shapesRight, ...shapesHeart];
        } else if (isWordart) {
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
                var pts = shapes[si].extractPoints(8).shape;
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
        this._applyFDMTexture(baseMat, p);

        var outlineMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(outlineColor),
            roughness:          0.30,
            metalness:          0.0,
            clearcoat:          0.90,
            clearcoatRoughness: 0.10,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(outlineMat, p);

        var fontMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(fontColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(fontMat, p);

        // ── Base Layer (Widest, bottom) ──
        // Word-art has no separate base — the letters themselves are the structure.
        if (!isWordart && !isLinkedInitials) {
            var baseSettings = {
                depth:         p.base.depth,
                bevelEnabled:  true,
                bevelThickness: p.base.bevelThickness,
                bevelSize:      p.base.bevelSize,
                bevelOffset:    0,
                bevelSegments:  p.base.bevelSegments,
                curveSegments:  8,
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
        if (p.layers === '3L' && !isLinkedInitials) {
            var outlineSettings = {
                depth:         p.outline.depth,
                bevelEnabled:  true,
                bevelThickness: p.outline.bevelThickness,
                bevelSize:      p.outline.bevelSize,
                bevelOffset:    0,
                bevelSegments:  p.outline.bevelSegments,
                curveSegments:  8,
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
            curveSegments:  8,
        };
        var fontLayerBottomZ = currentZ + p.font.bevelThickness;

        // Word-art and Linked Initials use thicker text since they have no base plate.
        if (isWordart || isLinkedInitials) {
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
                this._applyFDMTexture(lineMat, p);
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
                this._applyFDMTexture(heartMat, p);
                var heartGeo = new THREE.ExtrudeGeometry(this._wordartHeartShape, fontSettings);
                heartGeo.translate(0, 0, fontLayerBottomZ);
                stackParent.add(new THREE.Mesh(heartGeo, heartMat));
            }
        } else if (isLinkedInitials) {
            // Left Initial mesh
            leftMat = new THREE.MeshPhysicalMaterial({
                color:              new THREE.Color((p.lineColors && p.lineColors[0]) || fontColor),
                roughness:          0.28,
                metalness:          0.0,
                clearcoat:          0.95,
                clearcoatRoughness: 0.08,
                side:               THREE.DoubleSide,
            });
            this._applyFDMTexture(leftMat, p);
            var leftGeo = new THREE.ExtrudeGeometry(shapesLeft, fontSettings);
            leftGeo.translate(0, 0, fontLayerBottomZ);
            stackParent.add(new THREE.Mesh(leftGeo, leftMat));

            // Right Initial mesh
            var rightMat = new THREE.MeshPhysicalMaterial({
                color:              new THREE.Color((p.lineColors && p.lineColors[1]) || outlineColor),
                roughness:          0.28,
                metalness:          0.0,
                clearcoat:          0.95,
                clearcoatRoughness: 0.08,
                side:               THREE.DoubleSide,
            });
            this._applyFDMTexture(rightMat, p);
            var rightGeo = new THREE.ExtrudeGeometry(shapesRight, fontSettings);
            rightGeo.translate(0, 0, fontLayerBottomZ);
            stackParent.add(new THREE.Mesh(rightGeo, rightMat));

            // Central connecting red heart mesh
            var heartMat = new THREE.MeshPhysicalMaterial({
                color:              new THREE.Color('#FF1F4B'), // Red heart
                roughness:          0.30,
                metalness:          0.0,
                clearcoat:          0.95,
                clearcoatRoughness: 0.08,
                side:               THREE.DoubleSide,
            });
            this._applyFDMTexture(heartMat, p);
            var heartGeo = new THREE.ExtrudeGeometry(shapesHeart, fontSettings);
            heartGeo.translate(0, 0, fontLayerBottomZ);
            stackParent.add(new THREE.Mesh(heartGeo, heartMat));
        } else {
            var fontGeo  = new THREE.ExtrudeGeometry(shapes, fontSettings);
            fontGeo.translate(0, 0, fontLayerBottomZ);
            if (shearMatrix) fontGeo.applyMatrix4(shearMatrix);
            var fontMesh = new THREE.Mesh(fontGeo, fontMat);
            stackParent.add(fontMesh);
        }

        // ── Programmatic Keychain Ring (Top-Left, like a Degree Symbol) ──
        // Skip for nameplates (sit flat on desk) and word-art (letters are the structure).
        if (!isNameplate && !isWordart && p.ringPosition !== 'none') {
        var ringOuter = p.ring.outerRadius;
        var ringInner = p.ring.innerRadius;
        var ringShape = new THREE.Shape();
        ringShape.absarc(0, 0, ringOuter, 0, Math.PI * 2, false);
        var ringHole = new THREE.Path();
        ringHole.absarc(0, 0, ringInner, 0, Math.PI * 2, true);
        ringShape.holes.push(ringHole);

        // Ring depth matches the total base thickness (or total font thickness if no base)
        var ringDepthSettings;
        var ringMat = baseMat;
        var ringZ;

        if (isLinkedInitials) {
            ringMat = (p.ringPosition === 'right') ? (rightMat || fontMat) : (leftMat || fontMat);
            var totalFontThickness = fontSettings.depth + fontSettings.bevelThickness * 2;
            var ringDepth = totalFontThickness - p.ring.bevelThickness * 2;
            ringDepthSettings = {
                depth:         Math.max(1, ringDepth),
                bevelEnabled:  true,
                bevelThickness: p.ring.bevelThickness,
                bevelSize:      p.ring.bevelSize,
                bevelOffset:    0,
                bevelSegments:  p.ring.bevelSegments,
                curveSegments:  8,
            };
            ringZ = fontLayerBottomZ - fontSettings.bevelThickness + p.ring.bevelThickness;
        } else {
            var totalBaseThickness = p.base.depth + p.base.bevelThickness * 2;
            var ringDepth = totalBaseThickness - p.ring.bevelThickness * 2;
            ringDepthSettings = {
                depth:         Math.max(1, ringDepth),
                bevelEnabled:  true,
                bevelThickness: p.ring.bevelThickness,
                bevelSize:      p.ring.bevelSize,
                bevelOffset:    0,
                bevelSegments:  p.ring.bevelSegments,
                curveSegments:  8,
            };
            ringZ = -p.base.bevelThickness + p.ring.bevelThickness;
        }

        var ringGeo = new THREE.ExtrudeGeometry(ringShape, ringDepthSettings);
        var ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.z = ringZ;

        if (p.ringPosition === 'right') {
            if (isLinkedInitials) {
                // Find rightmost edge of the second initial (shapesRight)
                var linkedMaxX = -Infinity;
                var linkedYAtMaxX = 0;
                var linkedClosestX = Infinity;
                
                for (var si = 0; si < shapesRight.length; si++) {
                    var pts = shapesRight[si].extractPoints(8).shape;
                    for (var pi = 0; pi < pts.length; pi++) {
                        var pt = pts[pi];
                        if (pt.x > linkedMaxX) {
                            linkedMaxX = pt.x;
                        }
                    }
                }
                if (linkedMaxX === -Infinity) {
                    linkedMaxX = xOffset; // fallback
                }
                
                // Find the Y coordinate of the anchor point closest to the true right edge
                for (var si = 0; si < shapesRight.length; si++) {
                    var pts = shapesRight[si].extractPoints(8).shape;
                    for (var pi = 0; pi < pts.length; pi++) {
                        var pt = pts[pi];
                        var dist = Math.abs(pt.x - linkedMaxX);
                        if (dist < linkedClosestX) {
                            linkedClosestX = dist;
                            linkedYAtMaxX = pt.y;
                        }
                    }
                }

                var overlap = Math.min(4, ringOuter * 0.8);
                ringMesh.position.x = linkedMaxX + ringOuter - overlap;
                ringMesh.position.y = linkedYAtMaxX;
                this.keychainGroup.add(ringMesh);
            } else {
                // Find rightmost edge + the VERTICAL CENTRE of the whole text run.
                // (Same fix as the left branch: anchor Y to the text mid-line, not to
                // an arbitrary path point at the right edge, which jumped per-glyph.)
                var maxX = -Infinity;
                var rGlyphMinY = Infinity, rGlyphMaxY = -Infinity;
                for (var si = 0; si < shapes.length; si++) {
                    var pts = shapes[si].extractPoints(8).shape;
                    for (var pi = 0; pi < pts.length; pi++) {
                        var pt = pts[pi];
                        if (pt.x > maxX) maxX = pt.x;
                        if (pt.y < rGlyphMinY) rGlyphMinY = pt.y;
                        if (pt.y > rGlyphMaxY) rGlyphMaxY = pt.y;
                    }
                }
                if (maxX === -Infinity) {
                    maxX = fontSize * 3; // fallback
                }
                var ringY;
                if (rGlyphMinY === Infinity) {
                    ringY = 0;
                } else if ((p.ring.anchor || 'top') === 'top') {
                    ringY = rGlyphMinY + ringOuter * 0.5;   // top corner (opentype Y-down)
                } else {
                    ringY = (rGlyphMinY + rGlyphMaxY) / 2;
                }

                // Overlap by a safe amount
                var overlap = Math.min(4, ringOuter * 0.8);
                ringMesh.position.x = maxX + p.base.bevelSize + ringOuter - overlap;
                ringMesh.position.y = ringY;
                this.keychainGroup.add(ringMesh);
            }
        } else {
            // Default left positioning
            if (isLinkedInitials) {
                // Find leftmost edge of the first initial (shapesLeft)
                var linkedMinX = Infinity;
                var linkedYAtMinX = 0;
                var linkedClosestX = Infinity;
                
                for (var si = 0; si < shapesLeft.length; si++) {
                    var pts = shapesLeft[si].extractPoints(8).shape;
                    for (var pi = 0; pi < pts.length; pi++) {
                        var pt = pts[pi];
                        if (pt.x < linkedMinX) {
                            linkedMinX = pt.x;
                        }
                    }
                }
                if (linkedMinX === Infinity) {
                    linkedMinX = -xOffset; // fallback
                }
                
                // Find the Y coordinate of the anchor point closest to the true left edge
                for (var si = 0; si < shapesLeft.length; si++) {
                    var pts = shapesLeft[si].extractPoints(8).shape;
                    for (var pi = 0; pi < pts.length; pi++) {
                        var pt = pts[pi];
                        var dist = Math.abs(pt.x - linkedMinX);
                        if (dist < linkedClosestX) {
                            linkedClosestX = dist;
                            linkedYAtMinX = pt.y;
                        }
                    }
                }

                // Position the ring securely attached to the leftmost edge of the first initial
                var overlap = Math.min(4, ringOuter * 0.8);
                ringMesh.position.x = linkedMinX - ringOuter + overlap;
                ringMesh.position.y = linkedYAtMinX;
                this.keychainGroup.add(ringMesh);
            } else {
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

                // Anchor the ring to the VERTICAL CENTRE of the whole text run, not to
                // some arbitrary path-command point on the first glyph's left edge.
                // The old "closest command at min-X" logic gave a different Y per glyph
                // (e.g. correct for Z, but too high/low for P), which is the placement bug.
                // Compute the combined vertical span of every glyph shape and use its midpoint.
                var glyphMinY = Infinity, glyphMaxY = -Infinity;
                for (var si = 0; si < shapes.length; si++) {
                    var gpts = shapes[si].extractPoints(8).shape;
                    for (var pi = 0; pi < gpts.length; pi++) {
                        if (gpts[pi].y < glyphMinY) glyphMinY = gpts[pi].y;
                        if (gpts[pi].y > glyphMaxY) glyphMaxY = gpts[pi].y;
                    }
                }
                // Fallback to the first glyph's own box if shapes didn't yield points.
                if (glyphMinY === Infinity) { glyphMinY = firstCharBox.y1; glyphMaxY = firstCharBox.y2; }

                // Anchor mode: 'top' tucks the ring into the top corner above the first
                // letter; 'center' keeps it on the body mid-line. (opentype is Y-down, so
                // glyphMinY is the visual TOP of the run.)
                var ringY;
                if ((p.ring.anchor || 'top') === 'top') {
                    ringY = glyphMinY + ringOuter * 0.5;   // nudge down so the ring meets the corner
                } else {
                    ringY = (glyphMinY + glyphMaxY) / 2;
                }

                // The base layer expands outward by p.base.bevelSize.
                // We want the ring to overlap this expanded base by a safe amount (max 4mm or 80% of ring radius)
                var overlap = Math.min(4, ringOuter * 0.8);
                ringMesh.position.x = minX - p.base.bevelSize - ringOuter + overlap;
                ringMesh.position.y = ringY;
                this.keychainGroup.add(ringMesh);
            }
        }
        } // end !isNameplate && !isWordart && p.ringPosition !== 'none'

        // ── Flip Y (opentype/SVG Y-down → Three.js Y-up) ──
        this.keychainGroup.scale.y = -1;

        // ── Center the group ──
        var box    = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        // Enable shadows on all child meshes
        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Position shadow plane exactly at the bottom of the object
        if (this.shadowPlane) {
            this.shadowPlane.position.y = -size.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        // ── Fit camera ──
        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.55, maxDim * 1.85); // elevated camera view for a professional 3D shot
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
        if (p.ringPosition !== 'none') {
            var holeY = stripMaxY - LANYARD_FROM_TOP;
            var holePath = new THREE.Path();
            holePath.absarc(0, holeY, LANYARD_RADIUS, 0, Math.PI * 2, true);
            strip.holes.push(holePath);
        }

        // ── Materials ──
        var matStrip = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(stripColor),
            roughness:          0.40,
            metalness:          0.0,
            clearcoat:          0.6,
            clearcoatRoughness: 0.2,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(matStrip, p);

        var matTile = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(tileColor),
            roughness:          0.30,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(matTile, p);

        var matLetter = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(letterColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(matLetter, p);

        // ── Strip mesh ──
        var stripGeo = new THREE.ExtrudeGeometry(strip, {
            depth:          STRIP_DEPTH,
            bevelEnabled:   true,
            bevelThickness: 0.6,
            bevelSize:      1.2,
            bevelSegments:  4,
            curveSegments:  8,
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
                curveSegments:  8,
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
                curveSegments:  8,
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

        // Enable shadows on all child meshes
        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Position shadow plane exactly at the bottom of the object
        if (this.shadowPlane) {
            this.shadowPlane.position.y = -sz.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(sz.x, sz.y, sz.z);
        this.camera.position.set(0, maxDim * 0.45, maxDim * 1.75); // elevated camera view for a professional 3D shot
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Stash for getDimensions / rebuild
        this._lastText        = text;
        this._lastFont        = font;
        this._lastBaseColor   = stripColor;
        this._lastFontColor   = letterColor;
        this._lastOutlineColor = outlineColorFallback;
        this._lastParams      = p;
    }

    _buildWavyNametag(text, font, tagColor, p) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        // 1. Resolve custom params with OpenSCAD defaults
        var text_size = p.text_size || 22;
        var letter_gap = p.letter_gap !== undefined ? p.letter_gap : -2.5;
        var base_thickness = p.base_thickness || 2.5;
        var wave_mode = p.wave_mode || "wave";
        var wave_amplitude = p.wave_amplitude !== undefined ? p.wave_amplitude : 5.0;
        var wave_cycles = p.wave_cycles !== undefined ? p.wave_cycles : 1.0;
        var height_even = p.height_even || 4.0;
        var height_odd = p.height_odd || 2.0;
        var ring_outer_d = p.ring_outer_d || 10;
        var ring_inner_d = p.ring_inner_d || 5;
        var ring_height = p.ring_height || 4.5;
        var ring_x = p.ring_x;
        var ring_y = p.ring_y;

        var scale = p.scaleFactor || 1;

        // Clean text
        var rawText = (text || '').replace(/[\r\n]/g, '');
        var n = rawText.length;
        if (n === 0) return;

        var upm = font.unitsPerEm || 1000;

        // 2. Compute character positions: pos_x(i), center_x(i), total_width()
        var posX = [];
        var advanceWidths = [];
        for (var i = 0; i < n; i++) {
            var char = rawText[i];
            var glyph = font.charToGlyph(char);
            var adv = (glyph ? (glyph.advanceWidth || 0) : 0) * (text_size / upm);
            advanceWidths.push(adv);
            if (i === 0) {
                posX.push(0);
            } else {
                posX.push(posX[i - 1] + advanceWidths[i - 1] + letter_gap);
            }
        }

        var totalWidth = posX[n - 1] + advanceWidths[n - 1];

        // Compute Y offset pos_y(i)
        var posY = [];
        for (var i = 0; i < n; i++) {
            if (wave_mode === "zigzag") {
                posY.push(0);
            } else {
                var cx = posX[i] + advanceWidths[i] / 2;
                var phase = totalWidth > 0 ? (cx / totalWidth) * wave_cycles * 2 * Math.PI : 0;
                posY.push(wave_amplitude * Math.sin(phase));
            }
        }

        // 3. 2D letter shapes
        var letter2DShapes = [];
        var allBaseShapes = [];
        for (var i = 0; i < n; i++) {
            var char = rawText[i];
            var path = font.getPath(char, posX[i], posY[i], text_size);
            var pathData = path.toPathData(3);
            var shapes = this._pathDataToShapes(pathData);
            if (shapes && shapes.length > 0) {
                letter2DShapes.push({ index: i, shapes: shapes });
                allBaseShapes.push(...shapes);
            }
        }

        if (allBaseShapes.length === 0) return;

        // 4. Determine ring presence and positions
        var ringOuterR = ring_outer_d / 2;
        var ringInnerR = ring_inner_d / 2;
        var hasRing = (p.ringPosition !== 'none');

        if (ring_x === undefined || ring_y === undefined) {
            if (p.ringPosition === 'none') {
                hasRing = false;
            } else if (p.ringPosition === 'right') {
                var overlap = Math.min(4, ringOuterR * 0.8);
                ring_x = totalWidth + ringOuterR - overlap;
                ring_y = posY[n - 1];
            } else {
                // default left
                var overlap = Math.min(4, ringOuterR * 0.8);
                ring_x = posX[0] - ringOuterR + overlap;
                ring_y = posY[0];
            }
        } else {
            // Explicit ring_x/y passed (admin console)
            hasRing = true;
        }

        // 5. Materials
        var tagMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(tagColor),
            roughness:          0.32,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(tagMat, p);

        // 6. Punch the hole from the base plate shapes if we have a ring
        var finalBaseShapes = [];
        for (var i = 0; i < allBaseShapes.length; i++) {
            var shape = allBaseShapes[i];
            
            // Get character X bounds roughly (safety margin of 2mm)
            var charMinX = (posX[i] || 0) - 2;
            var charMaxX = (posX[i] || 0) + (advanceWidths[i] || 0) + 2;
            
            // Check if the keyring hole X-range intersects this character's X-range
            var overlapX = hasRing && (ring_x + ringInnerR >= charMinX) && (ring_x - ringInnerR <= charMaxX);
            
            if (overlapX && typeof ClipperLib !== 'undefined') {
                var holeShape = new THREE.Shape();
                holeShape.absarc(ring_x, ring_y, ringInnerR, 0, Math.PI * 2, false);
                var subtracted = subtractShapes([shape], [holeShape]);
                finalBaseShapes.push(...subtracted);
            } else {
                finalBaseShapes.push(shape);
            }
        }

        // Extrude base plate
        var baseGeo = new THREE.ExtrudeGeometry(finalBaseShapes, {
            depth:          base_thickness,
            bevelEnabled:   false,
            curveSegments:  8,
        });
        var baseMesh = new THREE.Mesh(baseGeo, tagMat);
        this.keychainGroup.add(baseMesh);

        // 7. Extrude hollow ring post at [ring_x, ring_y] if active
        if (hasRing) {
            var ringShape = new THREE.Shape();
            ringShape.absarc(ring_x, ring_y, ringOuterR, 0, Math.PI * 2, false);
            var ringHole = new THREE.Path();
            ringHole.absarc(ring_x, ring_y, ringInnerR, 0, Math.PI * 2, true);
            ringShape.holes.push(ringHole);

            var ringGeo = new THREE.ExtrudeGeometry(ringShape, {
                depth:          ring_height,
                bevelEnabled:   false,
                curveSegments:  8,
            });
            var ringMesh = new THREE.Mesh(ringGeo, tagMat);
            this.keychainGroup.add(ringMesh);
        }

        // 8. Extrude raised letters sitting on top of base plate
        for (var i = 0; i < letter2DShapes.length; i++) {
            var item = letter2DShapes[i];
            var charIndex = item.index;
            var h = (charIndex % 2 === 0) ? height_even : height_odd;

            var letterGeo = new THREE.ExtrudeGeometry(item.shapes, {
                depth:          h,
                bevelEnabled:   false,
                curveSegments:  8,
            });
            // sit on base
            letterGeo.translate(0, 0, base_thickness);
            
            var letterMesh = new THREE.Mesh(letterGeo, tagMat);
            this.keychainGroup.add(letterMesh);
        }

        // 9. Scale group
        if (scale !== 1) {
            this.keychainGroup.scale.setScalar(scale);
        }

        // 10. Flip Y axis (opentype is Y-down relative to Three.js)
        this.keychainGroup.scale.y = -1;

        // 11. Center group
        var box    = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        // Enable shadows
        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Set shadow plane
        if (this.shadowPlane) {
            this.shadowPlane.position.y = -size.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        // Fit camera
        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.55, maxDim * 1.85);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Stash state for dimensions / rebuild
        this._lastText         = text;
        this._lastFont         = font;
        this._lastBaseColor     = tagColor;
        this._lastFontColor     = tagColor;
        this._lastOutlineColor  = tagColor;
        this._lastParams       = p;
    }

    _buildGirlyKeychain(text, font, baseColor, fontColor, outlineColor, p) {
        // Dynamic font sizing
        var displayText = text.replace(/^\u00B0/, '');
        var charLen = displayText.length || 1;
        var targetFontSize = charLen <= 3 ? 24 : charLen >= 5 ? 36 : 30;
        var fontSize = Math.round(targetFontSize * p.scaleFactor);

        // Convert text to shapes
        var shapes = this._textToShapes(font, displayText, fontSize, p.lineHeightRatio);
        if (!shapes || shapes.length === 0) return;

        // Compute text bounds
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (var si = 0; si < shapes.length; si++) {
            var pts = shapes[si].extractPoints(8).shape;
            for (var pi = 0; pi < pts.length; pi++) {
                var pt = pts[pi];
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            }
        }
        var textBounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };

        // Rounded rect base dimensions
        var padX = Math.max(8, fontSize * 0.6);
        var padY = Math.max(6, fontSize * 0.4);
        var rectMinX = textBounds.minX - padX;
        var rectMaxX = textBounds.maxX + padX;
        var rectMinY = textBounds.minY - padY;
        var rectMaxY = textBounds.maxY + padY;
        var rectW = rectMaxX - rectMinX;
        var rectH = rectMaxY - rectMinY;
        var corner = Math.min(rectH * 0.25, rectW * 0.08, 8);

        // 1. Create rounded rectangle shape
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

        // 2. Create left circular tab
        var ringOuterR = 11.5;
        var ringHoleR = 3.5;
        var tabX = rectMinX - 2.0;
        var tabY = (rectMinY + rectMaxY) / 2;

        var tabShape = new THREE.Shape();
        tabShape.absarc(tabX, tabY, ringOuterR, 0, Math.PI * 2, false);

        // 3. Union plate and tab
        var baseShapes = unionShapes([plate], [tabShape]);

        // 4. Punch the keyring hole
        var holeShape = new THREE.Shape();
        holeShape.absarc(tabX, tabY, ringHoleR, 0, Math.PI * 2, false);
        baseShapes = subtractShapes(baseShapes, [holeShape]);

        // 5. Extrude base plate
        var baseThickness = 5.79;
        var baseSettings = {
            depth:          baseThickness - 0.4,
            bevelEnabled:   true,
            bevelThickness: 0.2,
            bevelSize:      0.2,
            bevelOffset:    0,
            bevelSegments:  3,
            curveSegments:  8,
        };
        var baseMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(baseColor),
            roughness:          0.32,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(baseMat, p);

        var baseGeo = new THREE.ExtrudeGeometry(baseShapes, baseSettings);
        var baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.z = 0;
        this.keychainGroup.add(baseMesh);

        // 6. Build the 3D bow shapes centered at (tabX, tabY)
        // Center-knot
        var knotOuterR = 5.5;
        var knotShape = new THREE.Shape();
        knotShape.absarc(tabX, tabY, knotOuterR, 0, Math.PI * 2, false);
        var knotHole = new THREE.Path();
        knotHole.absarc(tabX, tabY, ringHoleR, 0, Math.PI * 2, true);
        knotShape.holes.push(knotHole);

        // Left Loop
        var leftLoop = new THREE.Shape();
        leftLoop.moveTo(tabX - 3, tabY + 2.5);
        leftLoop.bezierCurveTo(tabX - 9, tabY + 8, tabX - 15, tabY + 6, tabX - 15, tabY + 1);
        leftLoop.bezierCurveTo(tabX - 15, tabY - 4, tabX - 9, tabY - 6, tabX - 3, tabY - 2.5);
        leftLoop.lineTo(tabX - 3, tabY + 2.5);
        var leftLoopHole = new THREE.Path();
        leftLoopHole.moveTo(tabX - 4, tabY + 1.2);
        leftLoopHole.bezierCurveTo(tabX - 7, tabY + 3.5, tabX - 11, tabY + 3, tabX - 11, tabY + 0.5);
        leftLoopHole.bezierCurveTo(tabX - 11, tabY - 2, tabX - 7, tabY - 2.5, tabX - 4, tabY - 1.2);
        leftLoopHole.lineTo(tabX - 4, tabY + 1.2);
        leftLoop.holes.push(leftLoopHole);

        // Right Loop
        var rightLoop = new THREE.Shape();
        rightLoop.moveTo(tabX + 3, tabY + 2.5);
        rightLoop.bezierCurveTo(tabX + 9, tabY + 8, tabX + 15, tabY + 6, tabX + 15, tabY + 1);
        rightLoop.bezierCurveTo(tabX + 15, tabY - 4, tabX + 9, tabY - 6, tabX + 3, tabY - 2.5);
        rightLoop.lineTo(tabX + 3, tabY + 2.5);
        var rightLoopHole = new THREE.Path();
        rightLoopHole.moveTo(tabX + 4, tabY + 1.2);
        rightLoopHole.bezierCurveTo(tabX + 7, tabY + 3.5, tabX + 11, tabY + 3, tabX + 11, tabY + 0.5);
        rightLoopHole.bezierCurveTo(tabX + 11, tabY - 2, tabX + 7, tabY - 2.5, tabX + 4, tabY - 1.2);
        rightLoopHole.lineTo(tabX + 4, tabY + 1.2);
        rightLoop.holes.push(rightLoopHole);

        // Left Tail
        var leftTail = new THREE.Shape();
        leftTail.moveTo(tabX - 1.5, tabY - 3);
        leftTail.lineTo(tabX - 8, tabY - 12);
        leftTail.lineTo(tabX - 4, tabY - 13);
        leftTail.lineTo(tabX - 0.5, tabY - 4);
        leftTail.lineTo(tabX - 1.5, tabY - 3);

        // Right Tail
        var rightTail = new THREE.Shape();
        rightTail.moveTo(tabX + 1.5, tabY - 3);
        rightTail.lineTo(tabX + 8, tabY - 12);
        rightTail.lineTo(tabX + 4, tabY - 13);
        rightTail.lineTo(tabX + 0.5, tabY - 4);
        rightTail.lineTo(tabX + 1.5, tabY - 3);

        var bowShapes = [knotShape, leftLoop, rightLoop, leftTail, rightTail];
        var bowThickness = 2.0;
        var bowSettings = {
            depth:          bowThickness - 0.2,
            bevelEnabled:   true,
            bevelThickness: 0.1,
            bevelSize:      0.1,
            bevelOffset:    0,
            bevelSegments:  3,
            curveSegments:  8,
        };

        var bowGeo = new THREE.ExtrudeGeometry(bowShapes, bowSettings);
        bowGeo.translate(0, 0, baseThickness);
        var bowMesh = new THREE.Mesh(bowGeo, baseMat);
        this.keychainGroup.add(bowMesh);

        // 7. Extrude text layer
        var fontThickness = 2.0;
        var fontSettings = {
            depth:          fontThickness - 0.2,
            bevelEnabled:   true,
            bevelThickness: 0.1,
            bevelSize:      0.1,
            bevelOffset:    0,
            bevelSegments:  3,
            curveSegments:  8,
        };
        var fontMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(fontColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(fontMat, p);

        var fontGeo = new THREE.ExtrudeGeometry(shapes, fontSettings);
        var offsetX = ringOuterR * 0.5;
        fontGeo.translate(offsetX, 0, baseThickness);
        var fontMesh = new THREE.Mesh(fontGeo, fontMat);
        this.keychainGroup.add(fontMesh);

        // 8. Scale & Center the group
        if (p.scaleFactor !== 1) {
            this.keychainGroup.scale.setScalar(p.scaleFactor);
        }
        this.keychainGroup.scale.y = -1;

        var box = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        // Enable shadows
        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (this.shadowPlane) {
            this.shadowPlane.position.y = -size.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.55, maxDim * 1.85);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Stash state
        this._lastText = text;
        this._lastFont = font;
        this._lastBaseColor = baseColor;
        this._lastFontColor = fontColor;
        this._lastOutlineColor = outlineColor;
        this._lastParams = p;
    }

    _buildBorderedKeychain(text, font, baseColor, fontColor, outlineColor, p) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        // 1. Parameters (with OpenSCAD defaults)
        var text_height = p.bordered_text_height !== undefined ? p.bordered_text_height : 1.5;
        var text_size = p.bordered_text_size || 12;
        var line_spacing = p.bordered_line_spacing || 1.2;
        var border_thickness = p.bordered_border_thickness !== undefined ? p.bordered_border_thickness : 3.0;
        var border_height = p.bordered_border_height || 3.0;
        var show_ring = p.bordered_show_ring !== undefined ? p.bordered_show_ring : true;
        var ring_outer_d = p.bordered_ring_outer_d || 11;
        var ring_inner_d = p.bordered_ring_inner_d || 4;
        var ring_height = p.bordered_ring_height || 3.0;
        var ring_x = p.bordered_ring_x !== undefined ? p.bordered_ring_x : 0.0;
        var ring_y = p.bordered_ring_y !== undefined ? p.bordered_ring_y : 0.0;

        var scale = p.scaleFactor || 1;

        // Clean text
        var displayText = (text || '').replace(/\r/g, '');
        var lines = displayText.split('\n');
        var twoLines = lines.length > 1 && lines[1] !== '';

        // Generate text shapes centered horizontally, positioned vertically
        var combined = '';
        var width1 = 0, width2 = 0;
        if (twoLines) {
            var yOffset = (text_size * line_spacing) / 2;
            var path1 = font.getPath(lines[0], 0, -yOffset, text_size);
            var bbox1 = path1.getBoundingBox();
            width1 = bbox1.x2 - bbox1.x1;
            var path1Cent = font.getPath(lines[0], -(bbox1.x1 + width1 / 2), -yOffset, text_size);
            combined += ' ' + path1Cent.toPathData(3);

            var path2 = font.getPath(lines[1], 0, yOffset, text_size);
            var bbox2 = path2.getBoundingBox();
            width2 = bbox2.x2 - bbox2.x1;
            var path2Cent = font.getPath(lines[1], -(bbox2.x1 + width2 / 2), yOffset, text_size);
            combined += ' ' + path2Cent.toPathData(3);
        } else {
            var path1 = font.getPath(lines[0] || 'Sample', 0, 0, text_size);
            var bbox1 = path1.getBoundingBox();
            width1 = bbox1.x2 - bbox1.x1;
            var path1Cent = font.getPath(lines[0] || 'Sample', -(bbox1.x1 + width1 / 2), 0, text_size);
            combined += ' ' + path1Cent.toPathData(3);
        }

        var textShapes = this._pathDataToShapes(combined);
        if (!textShapes || textShapes.length === 0) return;

        // Base shape via Clipper Offset
        var baseShapes = offsetShapes(textShapes, border_thickness);

        // Materials
        var baseMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(baseColor),
            roughness:          0.32,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(baseMat, p);

        var fontMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(fontColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(fontMat, p);

        // Ring construction
        var finalBaseShapes = baseShapes;
        if (show_ring) {
            var maxW = Math.max(width1, width2);
            var yOffset = (text_size * line_spacing) / 2;
            var ringX = -(maxW / 2 + border_thickness + ring_outer_d / 4) + ring_x;
            var ringY = (twoLines ? -yOffset : 0) + ring_y;

            var solidRing = new THREE.Shape();
            solidRing.absarc(ringX, ringY, ring_outer_d / 2, 0, Math.PI * 2, false);

            var unionedBase = unionShapes(baseShapes, [solidRing]);

            var ringHole = new THREE.Shape();
            ringHole.absarc(ringX, ringY, ring_inner_d / 2, 0, Math.PI * 2, false);

            finalBaseShapes = subtractShapes(unionedBase, [ringHole]);

            // stand-alone ring mesh if height is different
            if (Math.abs(ring_height - border_height) > 0.05) {
                var ringShape = new THREE.Shape();
                ringShape.absarc(ringX, ringY, ring_outer_d / 2, 0, Math.PI * 2, false);
                var ringHolePath = new THREE.Path();
                ringHolePath.absarc(ringX, ringY, ring_inner_d / 2, 0, Math.PI * 2, true);
                ringShape.holes.push(ringHolePath);

                var ringSettings = { depth: ring_height, bevelEnabled: false, curveSegments: 16 };
                var ringGeo = new THREE.ExtrudeGeometry([ringShape], ringSettings);
                var ringMesh = new THREE.Mesh(ringGeo, baseMat);
                this.keychainGroup.add(ringMesh);
            }
        }

        // Extrude Base and Text
        if (text_height >= 0) {
            var baseSettings = { depth: border_height, bevelEnabled: false, curveSegments: 16 };
            var baseGeo = new THREE.ExtrudeGeometry(finalBaseShapes, baseSettings);
            var baseMesh = new THREE.Mesh(baseGeo, baseMat);
            this.keychainGroup.add(baseMesh);

            var textSettings = { depth: text_height, bevelEnabled: false, curveSegments: 16 };
            var textGeo = new THREE.ExtrudeGeometry(textShapes, textSettings);
            textGeo.translate(0, 0, border_height);
            var textMesh = new THREE.Mesh(textGeo, fontMat);
            this.keychainGroup.add(textMesh);
        } else {
            var absH = Math.abs(text_height);
            var bottomH = Math.max(0.2, border_height - absH);

            var bottomSettings = { depth: bottomH, bevelEnabled: false, curveSegments: 16 };
            var bottomGeo = new THREE.ExtrudeGeometry(finalBaseShapes, bottomSettings);
            var bottomMesh = new THREE.Mesh(bottomGeo, baseMat);
            this.keychainGroup.add(bottomMesh);

            var hollowShapes = subtractShapes(finalBaseShapes, textShapes);
            var topSettings = { depth: absH, bevelEnabled: false, curveSegments: 16 };
            var topGeo = new THREE.ExtrudeGeometry(hollowShapes, topSettings);
            topGeo.translate(0, 0, bottomH);
            var topMesh = new THREE.Mesh(topGeo, baseMat);
            this.keychainGroup.add(topMesh);

            var textSettings = { depth: absH, bevelEnabled: false, curveSegments: 16 };
            var textGeo = new THREE.ExtrudeGeometry(textShapes, textSettings);
            textGeo.translate(0, 0, bottomH);
            var textMesh = new THREE.Mesh(textGeo, fontMat);
            this.keychainGroup.add(textMesh);
        }

        // Scale & Center
        if (scale !== 1) {
            this.keychainGroup.scale.setScalar(scale);
        }
        this.keychainGroup.scale.y = -1;

        var box = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (this.shadowPlane) {
            this.shadowPlane.position.y = -size.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.55, maxDim * 1.85);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this._lastText = text;
        this._lastFont = font;
        this._lastBaseColor = baseColor;
        this._lastFontColor = fontColor;
        this._lastOutlineColor = outlineColor;
        this._lastParams = p;
    }

    _buildSupportedText(text, font, baseColor, fontColor, outlineColor, p) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        var extrusion = p.supported_extrusion || 3.0;
        var offs = p.supported_offs !== undefined ? p.supported_offs : 0.01;
        var fontSize = p.text_size || 12;

        var heart1_enable = p.supported_heart1_enable !== undefined ? p.supported_heart1_enable : false;
        var heart1_size = p.supported_heart1_size || 5.0;
        var heart1_x = p.supported_heart1_x !== undefined ? p.supported_heart1_x : 0.0;
        var heart1_y = p.supported_heart1_y !== undefined ? p.supported_heart1_y : 0.0;
        var heart1_angle = p.supported_heart1_angle !== undefined ? p.supported_heart1_angle : -45;

        var heart2_enable = p.supported_heart2_enable !== undefined ? p.supported_heart2_enable : false;
        var heart2_size = p.supported_heart2_size || 5.0;
        var heart2_x = p.supported_heart2_x !== undefined ? p.supported_heart2_x : 0.0;
        var heart2_y = p.supported_heart2_y !== undefined ? p.supported_heart2_y : 0.0;
        var heart2_angle = p.supported_heart2_angle !== undefined ? p.supported_heart2_angle : -45;

        var star1_enable = p.supported_star1_enable !== undefined ? p.supported_star1_enable : false;
        var star1_size = p.supported_star1_size || 5.0;
        var star1_x = p.supported_star1_x !== undefined ? p.supported_star1_x : 0.0;
        var star1_y = p.supported_star1_y !== undefined ? p.supported_star1_y : 0.0;

        var star2_enable = p.supported_star2_enable !== undefined ? p.supported_star2_enable : false;
        var star2_size = p.supported_star2_size || 5.0;
        var star2_x = p.supported_star2_x !== undefined ? p.supported_star2_x : 0.0;
        var star2_y = p.supported_star2_y !== undefined ? p.supported_star2_y : 0.0;

        var scale = p.scaleFactor || 1;

        var displayText = (text || '').replace(/[\r\n]/g, '');
        if (displayText === '') displayText = 'Name';

        var path = font.getPath(displayText, 0, 0, fontSize);
        var bbox = path.getBoundingBox();
        var width = bbox.x2 - bbox.x1;
        var centeredTextPath = font.getPath(displayText, -(bbox.x1 + width / 2), 0, fontSize);
        var textShapes = this._pathDataToShapes(centeredTextPath.toPathData(3));

        var finalShapes = offsetShapes(textShapes, offs);

        var mainMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(fontColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(mainMat, p);

        var extrudeSettings = { depth: extrusion, bevelEnabled: false, curveSegments: 16 };
        var textGeo = new THREE.ExtrudeGeometry(finalShapes, extrudeSettings);
        var textMesh = new THREE.Mesh(textGeo, mainMat);
        this.keychainGroup.add(textMesh);

        if (heart1_enable) {
            var hShape = KeychainViewer.makeHeartShape(0, 0, heart1_size);
            var hGeo = new THREE.ExtrudeGeometry([hShape], extrudeSettings);
            var hMesh = new THREE.Mesh(hGeo, mainMat);
            hMesh.position.set(heart1_x, heart1_y, 0);
            hMesh.rotation.z = heart1_angle * Math.PI / 180;
            this.keychainGroup.add(hMesh);
        }
        if (heart2_enable) {
            var hShape = KeychainViewer.makeHeartShape(0, 0, heart2_size);
            var hGeo = new THREE.ExtrudeGeometry([hShape], extrudeSettings);
            var hMesh = new THREE.Mesh(hGeo, mainMat);
            hMesh.position.set(heart2_x, heart2_y, 0);
            hMesh.scale.x = -1;
            hMesh.rotation.z = heart2_angle * Math.PI / 180;
            this.keychainGroup.add(hMesh);
        }

        function localMakeStarShape(size) {
            var pPoints = 5;
            var r1 = size * 0.5;
            var r2 = size;
            var s = new THREE.Shape();
            for (var i = 0; i <= pPoints * 2; i++) {
                var angle = (Math.PI * i) / pPoints;
                var x = (i % 2 === 0 ? r1 : r2) * Math.cos(angle - Math.PI / 2);
                var y = (i % 2 === 0 ? r1 : r2) * Math.sin(angle - Math.PI / 2);
                if (i === 0) s.moveTo(x, y);
                else s.lineTo(x, y);
            }
            s.closePath();
            return s;
        }

        if (star1_enable) {
            var sShape = localMakeStarShape(star1_size);
            var sGeo = new THREE.ExtrudeGeometry([sShape], extrudeSettings);
            var sMesh = new THREE.Mesh(sGeo, mainMat);
            sMesh.position.set(star1_x, star1_y, 0);
            sMesh.rotation.z = 54 * Math.PI / 180;
            this.keychainGroup.add(sMesh);
        }
        if (star2_enable) {
            var sShape = localMakeStarShape(star2_size);
            var sGeo = new THREE.ExtrudeGeometry([sShape], extrudeSettings);
            var sMesh = new THREE.Mesh(sGeo, mainMat);
            sMesh.position.set(star2_x, star2_y, 0);
            sMesh.rotation.z = 54 * Math.PI / 180;
            this.keychainGroup.add(sMesh);
        }

        if (scale !== 1) {
            this.keychainGroup.scale.setScalar(scale);
        }
        this.keychainGroup.scale.y = -1;

        var box = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (this.shadowPlane) {
            this.shadowPlane.position.y = -size.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.55, maxDim * 1.85);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this._lastText = text;
        this._lastFont = font;
        this._lastBaseColor = baseColor;
        this._lastFontColor = fontColor;
        this._lastOutlineColor = outlineColor;
        this._lastParams = p;
    }

    _buildFlowerKeychain(text, font, baseColor, fontColor, outlineColor, p) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        var num_petals = p.flower_num_petals || 12;
        var flower_base_thickness = p.flower_base_thickness || 3.0;
        var center_disc_thickness = p.flower_center_disc_thickness || 1.0;
        var letter_thickness = p.flower_letter_thickness || 1.5;

        var ring_outer_d = p.flower_ring_outer_d || 10;
        var ring_inner_d = p.flower_ring_inner_d || 5;
        var ring_height = p.flower_ring_height || 3.0;
        var ring_offset = p.flower_ring_offset !== undefined ? p.flower_ring_offset : 0.0;

        var base_radius = p.flower_base_radius || 25.0;
        var petal_amplitude = p.flower_petal_amplitude || 6.0;

        var scale = p.scaleFactor || 1;

        var char = (text || 'A').charAt(0).toUpperCase();

        var baseMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(baseColor),
            roughness:          0.32,
            metalness:          0.0,
            clearcoat:          0.85,
            clearcoatRoughness: 0.12,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(baseMat, p);

        var fontMat = new THREE.MeshPhysicalMaterial({
            color:              new THREE.Color(fontColor),
            roughness:          0.28,
            metalness:          0.0,
            clearcoat:          0.95,
            clearcoatRoughness: 0.08,
            side:               THREE.DoubleSide,
        });
        this._applyFDMTexture(fontMat, p);

        var flowerShape = new THREE.Shape();
        var steps = 120;
        for (var i = 0; i < steps; i++) {
            var theta = (i / steps) * Math.PI * 2;
            var r = base_radius + petal_amplitude * Math.abs(Math.sin((num_petals * theta) / 2));
            var x = r * Math.cos(theta);
            var y = r * Math.sin(theta);
            if (i === 0) flowerShape.moveTo(x, y);
            else flowerShape.lineTo(x, y);
        }
        flowerShape.closePath();

        var topTheta = -Math.PI / 2;
        var r_top = base_radius + petal_amplitude * Math.abs(Math.sin((num_petals * topTheta) / 2));
        var tabY = -r_top + ring_offset;
        var tabX = 0;

        var solidRing = new THREE.Shape();
        solidRing.absarc(tabX, tabY - ring_outer_d / 2 + 2.0, ring_outer_d / 2, 0, Math.PI * 2, false);

        var unionedFlower = unionShapes([flowerShape], [solidRing]);

        var ringHole = new THREE.Shape();
        ringHole.absarc(tabX, tabY - ring_outer_d / 2 + 2.0, ring_inner_d / 2, 0, Math.PI * 2, false);

        var finalFlowerShapes = subtractShapes(unionedFlower, [ringHole]);

        var baseSettings = { depth: flower_base_thickness, bevelEnabled: false, curveSegments: 16 };
        var baseGeo = new THREE.ExtrudeGeometry(finalFlowerShapes, baseSettings);
        var baseMesh = new THREE.Mesh(baseGeo, baseMat);
        this.keychainGroup.add(baseMesh);

        var centerDiscShape = new THREE.Shape();
        centerDiscShape.absarc(0, 0, base_radius * 0.9, 0, Math.PI * 2, false);
        var discSettings = { depth: center_disc_thickness, bevelEnabled: false, curveSegments: 16 };
        var discGeo = new THREE.ExtrudeGeometry([centerDiscShape], discSettings);
        discGeo.translate(0, 0, flower_base_thickness);
        var discMesh = new THREE.Mesh(discGeo, baseMat);
        this.keychainGroup.add(discMesh);

        var charFontSize = base_radius * 1.25;
        var charPath = font.getPath(char, 0, 0, charFontSize);
        var charBBox = charPath.getBoundingBox();
        var charW = charBBox.x2 - charBBox.x1;
        var charH = charBBox.y2 - charBBox.y1;
        var charX = -(charBBox.x1 + charW / 2);
        var charY = -(charBBox.y1 + charH / 2);
        var centeredCharPath = font.getPath(char, charX, charY, charFontSize);
        var charShapes = this._pathDataToShapes(centeredCharPath.toPathData(3));

        var letterSettings = { depth: letter_thickness, bevelEnabled: false, curveSegments: 16 };
        var letterGeo = new THREE.ExtrudeGeometry(charShapes, letterSettings);
        letterGeo.translate(0, 0, flower_base_thickness + center_disc_thickness);
        var letterMesh = new THREE.Mesh(letterGeo, fontMat);
        this.keychainGroup.add(letterMesh);

        if (scale !== 1) {
            this.keychainGroup.scale.setScalar(scale);
        }
        this.keychainGroup.scale.y = -1;

        var box = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (this.shadowPlane) {
            this.shadowPlane.position.y = -size.y / 2 - 0.15;
        }

        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.55, maxDim * 1.85);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this._lastText = text;
        this._lastFont = font;
        this._lastBaseColor = baseColor;
        this._lastFontColor = fontColor;
        this._lastOutlineColor = outlineColor;
        this._lastParams = p;
    }

    // ── LED Word Stand ───────────────────────────────────────────────────────
    // Modular per-letter housings that clip onto a hollow LED-channel stand foot.
    // Uses three-bvh-csg mesh booleans for the channels/pegs/slots. (Ported from Achuva.)
    _buildLedWordStand(text, font, baseColor, coverColor, p) {
        function isPointInPolygon(pt, polygon) {
            var isInside = false;
            for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                var xi = polygon[i].x, yi = polygon[i].y;
                var xj = polygon[j].x, yj = polygon[j].y;
                var intersect = ((yi > pt.y) !== (yj > pt.y)) &&
                                (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
                if (intersect) isInside = !isInside;
            }
            return isInside;
        }

        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        // ── Parameters ───────────────────────────────────────────────────────
        var font_size              = p.font_size              !== undefined ? parseFloat(p.font_size)              : 100.0;
        var body_depth             = p.body_depth             !== undefined ? parseFloat(p.body_depth)             : 25.0;
        var wall_thickness         = p.wall_thickness         !== undefined ? parseFloat(p.wall_thickness)         : 2.0;
        var back_wall_thickness    = p.back_wall_thickness    !== undefined ? parseFloat(p.back_wall_thickness)    : 2.0;
        var cover_thickness        = p.cover_thickness        !== undefined ? parseFloat(p.cover_thickness)        : 2.0;
        var cover_lip_depth        = p.cover_lip_depth        !== undefined ? parseFloat(p.cover_lip_depth)        : 3.0;
        var cover_lip_width        = p.cover_lip_width        !== undefined ? parseFloat(p.cover_lip_width)        : 1.5;
        var cover_tolerance        = p.cover_tolerance        !== undefined ? parseFloat(p.cover_tolerance)        : 0.15;
        var stand_height           = p.stand_height           !== undefined ? parseFloat(p.stand_height)           : 18.0;
        var stand_wall             = p.stand_wall             !== undefined ? parseFloat(p.stand_wall)             : 2.5;
        var letter_spacing         = p.letter_spacing         !== undefined ? parseFloat(p.letter_spacing)         : 4.0;
        var corner_radius          = p.corner_radius          !== undefined ? parseFloat(p.corner_radius)          : 3.0;
        var led_channel_h          = p.led_channel_h          !== undefined ? parseFloat(p.led_channel_h)          : 6.0;
        var led_channel_w          = p.led_channel_w          !== undefined ? parseFloat(p.led_channel_w)          : 10.0;
        var cable_hole_d           = p.cable_hole_d           !== undefined ? parseFloat(p.cable_hole_d)           : 6.0;
        var cover_insert_clearance = p.cover_insert_clearance !== undefined ? parseFloat(p.cover_insert_clearance) : 0.3;
        var explode_cover          = p.explode_cover          !== undefined ? parseFloat(p.explode_cover)          : 0.0;
        var explode_stand          = p.explode_stand          !== undefined ? parseFloat(p.explode_stand)          : 0.0;
        var scale                  = p.scaleFactor || 1;

        // ── Materials ────────────────────────────────────────────────────────
        var matBase = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(baseColor), roughness: 0.35, metalness: 0.08,
            clearcoat: 0.5, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
        });

        var matCover = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(coverColor), roughness: 0.3, metalness: 0.0,
            transparent: true, opacity: 0.82, clearcoat: 0.5, clearcoatRoughness: 0.1,
            side: THREE.DoubleSide,
        });


        // ── Text (max 3 letters) ─────────────────────────────────────────────
        var rawText = (text && text.trim().length > 0) ? text.trim().substring(0, 3).toUpperCase() : 'A';
        var upm     = font.unitsPerEm || 1000;
        var sfactor = font_size / upm;

        var letterAdvances = [];
        for (var i = 0; i < rawText.length; i++) {
            var g = font.charToGlyph(rawText[i]);
            letterAdvances.push((g ? (g.advanceWidth || 0) : 0) * sfactor);
        }
        var totalWidth = letterAdvances.reduce(function(s, w) { return s + w; }, 0)
                         + letter_spacing * (rawText.length - 1);

        // ── Derived geometry constants ────────────────────────────────────────
        var sfDepth = body_depth + cover_thickness + cover_insert_clearance;

        // Main LED channel (runs left→right, X direction)
        //   cross-section in Y×Z: led_channel_h tall, led_channel_w deep
        //   positioned at mid-height of stand (Y) and centered in Z
        var mainChH   = Math.min(led_channel_h, stand_height - stand_wall * 2 - 0.1);
        var mainChZ   = Math.min(led_channel_w, sfDepth - stand_wall * 2 - 0.1);
        var mainChCY  = -(stand_height * 0.5);         // Y center of channel (mid-height of stand)
        var mainChCZ  = sfDepth / 2;                   // Z center (mid-depth of stand)

        // Branch channels (run Y direction, per letter, from main channel to stand top)
        var branchW  = Math.min(5.0, mainChZ * 0.6);  // X width of branch
        var branchZs = Math.min(5.0, mainChZ * 0.6);  // Z width of branch

        // Tab/peg (protrudes from stand top into the letter cavity)
        var tabW     = branchW  + stand_wall * 2;      // tab X width (slightly wider than branch)
        var tabD     = branchZs + stand_wall * 2;      // tab Z depth
        var tabH     = Math.min(8.0, stand_height * 0.3);  // how far peg protrudes above stand top
        var tabTol   = 0.25;                           // tab-to-slot clearance

        // Stand foot bounds
        var sfLeft   = -totalWidth / 2;
        var sfRight  =  totalWidth / 2;

        // Dynamic peg placement based on solid footprints at baseline
        var letterPegs = []; // Array of arrays: letterPegs[li] = [pegX1, pegX2, ...]
        var letterMaxY = []; // Array of lowest Y coordinates per letter
        var cx0 = sfLeft;

        for (var ii = 0; ii < rawText.length; ii++) {
            var ch = rawText[ii];
            var advW = letterAdvances[ii];
            var path = font.getPath(ch, cx0, 0, font_size);
            var shapes = this._pathDataToShapes(path.toPathData(3));

            if (!shapes || shapes.length === 0) {
                letterPegs.push([cx0 + advW / 2]);
                letterMaxY.push(0);
                cx0 += advW + letter_spacing;
                continue;
            }

            var offR = clipperUnionAndOffset(shapes, 0, wall_thickness, true);
            var outerShapes = offR.coverShapes;

            var maxY = -Infinity;
            for (var i = 0; i < outerShapes.length; i++) {
                var pts = outerShapes[i].extractPoints();
                for (var j = 0; j < pts.shape.length; j++) {
                    if (pts.shape[j].y > maxY) maxY = pts.shape[j].y;
                }
            }
            if (maxY === -Infinity) maxY = 0;
            letterMaxY.push(maxY);

            var solidIntervals = [];
            var inSolid = false;
            var startX = 0;
            var scanY = maxY - 0.1;

            // Scan near the lowest point to find solid footprints
            for (var x = cx0; x <= cx0 + advW; x += 1) {
                var pt = { x: x, y: scanY };
                var solid = false;
                for (var i = 0; i < outerShapes.length; i++) {
                    var pts = outerShapes[i].extractPoints();
                    if (isPointInPolygon(pt, pts.shape)) {
                        var insideHole = false;
                        for (var j = 0; j < pts.holes.length; j++) {
                            if (isPointInPolygon(pt, pts.holes[j])) {
                                insideHole = true;
                                break;
                            }
                        }
                        if (!insideHole) { solid = true; break; }
                    }
                }

                if (solid && !inSolid) {
                    inSolid = true;
                    startX = x;
                } else if (!solid && inSolid) {
                    inSolid = false;
                    solidIntervals.push({ start: startX, end: x - 1 });
                }
            }
            if (inSolid) {
                solidIntervals.push({ start: startX, end: cx0 + advW });
            }

            var pegs = [];
            for (var k = 0; k < solidIntervals.length; k++) {
                if (solidIntervals[k].end - solidIntervals[k].start > 2) {
                    pegs.push((solidIntervals[k].start + solidIntervals[k].end) / 2);
                }
            }
            if (pegs.length === 0) pegs.push(cx0 + advW / 2);

            letterPegs.push(pegs);
            cx0 += advW + letter_spacing;
        }

        // ════════════════════════════════════════════════════════════════════
        // BUILD: STAND FOOT  (one solid piece)
        //
        // Local Y conventions (before scale.y=-1 flip):
        //   Y = 0             → ground level (stand bottom)
        //   Y = -stand_height → stand top = letter bottom
        //   Y < -stand_height → tab peg region (protrudes into letter space)
        // ════════════════════════════════════════════════════════════════════

        // 1. Solid box (full width, stand height, sfDepth)
        var standBoxG = new THREE.BoxGeometry(totalWidth, stand_height, sfDepth);
        standBoxG.translate(0, -stand_height / 2, sfDepth / 2);

        var bStand = new Brush(standBoxG, matBase);
        bStand.updateMatrixWorld(true);
        var ev = new Evaluator();
        var standR = bStand;

        // 2. Subtract main horizontal LED channel (runs from first to last peg)
        var firstPeg = letterPegs[0][0];
        var lastLetterPegs = letterPegs[rawText.length - 1];
        var lastPeg = lastLetterPegs[lastLetterPegs.length - 1];

        var mainChLength = (lastPeg - firstPeg) + branchW;
        var mainChCX = (firstPeg + lastPeg) / 2;
        var mainChG = new THREE.BoxGeometry(mainChLength, mainChH, mainChZ);
        mainChG.translate(mainChCX, mainChCY, mainChCZ);
        var bMainCh = new Brush(mainChG, matBase);
        bMainCh.updateMatrixWorld(true);
        standR = ev.evaluate(standR, bMainCh, SUBTRACTION);

        // 3. Type-C female port – back face (Z=0) at the center of the stand
        var typeCw = 9.0;
        var typeCh = 3.2;
        var typeCd = mainChCZ + 2; // Deep enough to reach the main channel
        var typeCG = new THREE.BoxGeometry(typeCw, typeCh, typeCd);
        typeCG.translate(mainChCX, mainChCY, typeCd / 2);
        var bTypeC = new Brush(typeCG, matBase);
        bTypeC.updateMatrixWorld(true);
        standR = ev.evaluate(standR, bTypeC, SUBTRACTION);

        // 4. Per letter: branch channels + hollow peg tabs
        for (var li = 0; li < rawText.length; li++) {
            var pegs = letterPegs[li];
            for (var pi = 0; pi < pegs.length; pi++) {
                var lcx = pegs[pi];

                // Branch channel: runs Y direction from main channel ceiling to stand top
                // In local Y: from (mainChCY - mainChH/2) up to -stand_height
                var branchCeilY  = mainChCY - mainChH / 2;   // top of main channel
                var branchTopY   = -stand_height;             // stand top
                var branchHeight = branchCeilY - branchTopY;  // positive value

                if (branchHeight > 0.1) {
                    var branchMidY = branchTopY + branchHeight / 2;
                    var branchG = new THREE.BoxGeometry(branchW, branchHeight, branchZs);
                    branchG.translate(lcx, branchMidY, mainChCZ);
                    var bBranch = new Brush(branchG, matBase);
                    bBranch.updateMatrixWorld(true);
                    standR = ev.evaluate(standR, bBranch, SUBTRACTION);
                }

                // Tab peg: solid box ABOVE stand top (Y < -stand_height in local space)
                // Outer: tabW × tabH × tabD  (solid shell)
                var tabMidY = -stand_height - tabH / 2;
                var tabOuterG = new THREE.BoxGeometry(tabW, tabH, tabD);
                tabOuterG.translate(lcx, tabMidY, mainChCZ);
                var bTabO = new Brush(tabOuterG, matBase);
                bTabO.updateMatrixWorld(true);
                standR = ev.evaluate(standR, bTabO, ADDITION);   // union tab onto stand

                // Hollow the peg center (branch channel continues through the tab)
                var tabChG = new THREE.BoxGeometry(branchW, tabH + 2, branchZs);
                tabChG.translate(lcx, tabMidY, mainChCZ);
                var bTabCh = new Brush(tabChG, matBase);
                bTabCh.updateMatrixWorld(true);
                standR = ev.evaluate(standR, bTabCh, SUBTRACTION);
            }
        }

        var standMesh = new THREE.Mesh(standR.geometry, matBase);
        standMesh.position.y += explode_stand;
        standMesh.castShadow    = true;
        standMesh.receiveShadow = true;
        this.keychainGroup.add(standMesh);
        this._wordStandFeet     = [standMesh];
        this._wordStandHousings = [];
        this._wordStandCovers   = [];

        // ════════════════════════════════════════════════════════════════════
        // BUILD: LETTER HOUSINGS  (one per letter)
        // ════════════════════════════════════════════════════════════════════

        var cursorX2 = sfLeft;
        for (var li2 = 0; li2 < rawText.length; li2++) {
            var ch   = rawText[li2];
            var advW = letterAdvances[li2];
            var pegs = letterPegs[li2];

            var path  = font.getPath(ch, cursorX2, 0, font_size);
            var shapes = this._pathDataToShapes(path.toPathData(3));

            if (!shapes || shapes.length === 0) {
                cursorX2 += advW + letter_spacing;
                continue;
            }

            var offR       = clipperUnionAndOffset(shapes, 0, wall_thickness, true);
            var outerShapes = offR.coverShapes;
            var wallShapes  = offR.wallShapes;

            // Back wall (solid plate)
            var backGeom = new THREE.ExtrudeGeometry(outerShapes, {
                depth: back_wall_thickness, bevelEnabled: false, steps: 1,
            });
            var backMesh = new THREE.Mesh(backGeom, matBase);

            // Side walls (extruded outline, needs a hole punched at the bottom for wires)
            var wallGeom = new THREE.ExtrudeGeometry(wallShapes, {
                depth: body_depth - back_wall_thickness, bevelEnabled: false, steps: 1,
            });
            wallGeom.translate(0, 0, back_wall_thickness);

            var bWall = new Brush(wallGeom, matBase);
            bWall.updateMatrixWorld(true);

            var letterMaxYVal = letterMaxY[li2];
            var evPunch = new Evaluator();
            var bWallHollowed = bWall;

            var housingGroup = new THREE.Group();

            for (var pi = 0; pi < pegs.length; pi++) {
                var lcx2 = pegs[pi];

                // The stand top in local coordinates (before shift) is at -wall_thickness
                var standTopY = -wall_thickness;

                // Outer shell needs to cover the gap between the stand and the letter's lowest point
                var slotBottomY = Math.max(standTopY, letterMaxYVal);
                var slotTopY    = standTopY - (tabH + tabTol); // Highest physical point of the tab

                var slotFrameH = slotBottomY - slotTopY;
                var slotMidY   = (slotTopY + slotBottomY) / 2;

                var slotOutW   = tabW + tabTol * 2 + wall_thickness * 2;
                var slotOutD   = tabD + tabTol * 2 + wall_thickness * 2;

                var slotInW    = tabW + tabTol * 2;
                var slotInD    = tabD + tabTol * 2;
                var slotInH    = slotFrameH + 2; // Hole ensures clear passage through bottom
                var slotInMidY = slotTopY + slotInH / 2;

                var slotOutG = new THREE.BoxGeometry(slotOutW, slotFrameH, slotOutD);
                slotOutG.translate(lcx2, slotMidY, mainChCZ);
                var slotInG  = new THREE.BoxGeometry(slotInW, slotInH, slotInD);
                slotInG.translate(lcx2, slotInMidY, mainChCZ);

                var evSlot   = new Evaluator();
                var bSlotOut = new Brush(slotOutG, matBase);
                var bSlotIn  = new Brush(slotInG,  matBase);
                bSlotOut.updateMatrixWorld(true);
                bSlotIn.updateMatrixWorld(true);
                var slotFrame = evSlot.evaluate(bSlotOut, bSlotIn, SUBTRACTION);
                housingGroup.add(new THREE.Mesh(slotFrame.geometry, matBase));

                // Hole puncher to completely cut through the letter's bottom wall
                var punchH = (letterMaxYVal + 2) - slotTopY;
                if (punchH < 1) punchH = 1; // Safeguard
                var punchMidY = slotTopY + punchH / 2;
                var punchG = new THREE.BoxGeometry(slotInW, punchH, slotInD);
                punchG.translate(lcx2, punchMidY, mainChCZ);

                var bPunch = new Brush(punchG, matBase);
                bPunch.updateMatrixWorld(true);
                bWallHollowed = evPunch.evaluate(bWallHollowed, bPunch, SUBTRACTION);
            }

            housingGroup.add(backMesh);
            housingGroup.add(new THREE.Mesh(bWallHollowed.geometry, matBase));

            // Shift housing so typographic baseline is maintained (local Y=0 maps to stand top + wall_thickness)
            var shiftY = -stand_height + wall_thickness;
            housingGroup.position.y = shiftY;

            // ── Diffuser cover ──────────────────────────────────────────────
            var coverGroup = new THREE.Group();
            var lipOR = clipperUnionAndOffset(shapes, -(wall_thickness + cover_tolerance), 0, false);
            var lipIR = clipperUnionAndOffset(shapes, -(wall_thickness + cover_tolerance + cover_lip_width), 0, false);
            var lipSh = subtractShapes(lipOR.coverShapes, lipIR.coverShapes);
            if (lipSh && lipSh.length > 0) {
                coverGroup.add(new THREE.Mesh(
                    new THREE.ExtrudeGeometry(lipSh, { depth: cover_lip_depth, bevelEnabled: false }),
                    matCover
                ));
            }
            var frontG = new THREE.ExtrudeGeometry(outerShapes, { depth: cover_thickness, bevelEnabled: false });
            frontG.translate(0, 0, cover_lip_depth);
            coverGroup.add(new THREE.Mesh(frontG, matCover));
            coverGroup.position.y = shiftY;
            coverGroup.position.z  = body_depth - cover_lip_depth + 0.1 + explode_cover;

            this.keychainGroup.add(housingGroup);
            this.keychainGroup.add(coverGroup);
            this._wordStandHousings.push(housingGroup);
            this._wordStandCovers.push(coverGroup);

            cursorX2 += advW + letter_spacing;
        }

        // ── Finalize: flip Y (opentype → 3D) and center ──────────────────────
        if (scale !== 1) {
            this.keychainGroup.scale.set(scale, -scale, scale);
        } else {
            this.keychainGroup.scale.y = -1;
        }

        var box    = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        this.scene.add(this.keychainGroup);

        // Camera framing
        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.4, maxDim * 1.7);
        this.camera.near = maxDim * 0.01;
        this.camera.far  = maxDim * 10;
        this.camera.updateProjectionMatrix();
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this._lastFontColor    = coverColor;
        this._lastOutlineColor = baseColor;
        this._lastParams       = p;
    }

    // ── Unified LED Word Art ─────────────────────────────────────────────────
    // One unified hollow tray housing for the whole word; the text doubles as a
    // friction-fit diffuser cover. Clipper-only (no mesh booleans). (Ported from Achuva.)
    _buildLedWordArt(text, font, baseColor, coverColor, p) {
        this._clearKeychain();
        this.keychainGroup = new THREE.Group();

        var font_size      = p.font_size      !== undefined ? parseFloat(p.font_size)      : 100.0;
        var letter_spacing = p.letter_spacing !== undefined ? parseFloat(p.letter_spacing) : 4.0;
        var wall_thickness = p.wall_thickness !== undefined ? parseFloat(p.wall_thickness) : 2.0;
        var body_depth     = p.body_depth     !== undefined ? parseFloat(p.body_depth)     : 25.0;
        var back_wall_thickness = p.back_wall_thickness !== undefined ? parseFloat(p.back_wall_thickness) : 2.0;
        var cover_thickness = p.cover_thickness !== undefined ? parseFloat(p.cover_thickness) : 2.0;

        var cover_tolerance = p.cover_tolerance !== undefined ? parseFloat(p.cover_tolerance) : 0.15;
        var cover_lip_width = p.cover_lip_width !== undefined ? parseFloat(p.cover_lip_width) : 1.5;
        var cover_lip_depth = p.cover_lip_depth !== undefined ? parseFloat(p.cover_lip_depth) : 3.0;

        var explode_cover   = p.explode_cover !== undefined ? parseFloat(p.explode_cover) : 0.0;
        var scale           = p.scaleFactor || 1;

        var matBase = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(baseColor),
            roughness: 0.35, metalness: 0.08,
            clearcoat: 0.5, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
        });


        var matCover = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(coverColor),
            roughness: 0.3, metalness: 0.0,
            transparent: true, opacity: 0.82, clearcoat: 0.5, clearcoatRoughness: 0.1,
            side: THREE.DoubleSide,
        });


        var rawText = (text && text.trim().length > 0) ? text.trim() : 'TEXT';
        var upm     = font.unitsPerEm || 1000;
        var sfactor = font_size / upm;

        var letterAdvances = [];
        for (var i = 0; i < rawText.length; i++) {
            var g = font.charToGlyph(rawText[i]);
            letterAdvances.push((g ? (g.advanceWidth || 0) : 0) * sfactor);
        }
        var totalWidth = letterAdvances.reduce(function(s, w) { return s + w; }, 0)
                         + letter_spacing * (rawText.length - 1);

        var sfLeft = -totalWidth / 2;
        var cx0 = sfLeft;

        var allShapes = [];
        for (var ii = 0; ii < rawText.length; ii++) {
            var ch = rawText[ii];
            var advW = letterAdvances[ii];
            var path = font.getPath(ch, cx0, 0, font_size);
            var shapes = this._pathDataToShapes(path.toPathData(3));
            if (shapes && shapes.length > 0) {
                for (var j = 0; j < shapes.length; j++) {
                    allShapes.push(shapes[j]);
                }
            }
            cx0 += advW + letter_spacing;
        }

        if (allShapes.length === 0) return;

        var offR = clipperUnionAndOffset(allShapes, 0, wall_thickness, true);
        if (!offR) return;
        var outerShapes = offR.coverShapes;
        var wallShapes  = offR.wallShapes;

        var backGeom = new THREE.ExtrudeGeometry(outerShapes, {
            depth: back_wall_thickness, bevelEnabled: false, steps: 1,
        });
        var backMesh = new THREE.Mesh(backGeom, matBase);

        var wallGeom = new THREE.ExtrudeGeometry(wallShapes, {
            depth: body_depth - back_wall_thickness, bevelEnabled: false, steps: 1,
        });
        wallGeom.translate(0, 0, back_wall_thickness);
        var wallMesh = new THREE.Mesh(wallGeom, matBase);

        var housingGroup = new THREE.Group();
        housingGroup.add(backMesh);
        housingGroup.add(wallMesh);

        var coverGroup = new THREE.Group();

        var frontG = new THREE.ExtrudeGeometry(outerShapes, {
            depth: cover_thickness, bevelEnabled: false
        });
        frontG.translate(0, 0, cover_lip_depth);
        coverGroup.add(new THREE.Mesh(frontG, matCover));

        var lipOR = clipperUnionAndOffset(allShapes, -(wall_thickness + cover_tolerance), 0, false);
        var lipIR = clipperUnionAndOffset(allShapes, -(wall_thickness + cover_tolerance + cover_lip_width), 0, false);

        if (lipOR && lipIR && lipOR.coverShapes.length > 0) {
            var lipSh = subtractShapes(lipOR.coverShapes, lipIR.coverShapes);
            if (lipSh && lipSh.length > 0) {
                var lipG = new THREE.ExtrudeGeometry(lipSh, {
                    depth: cover_lip_depth, bevelEnabled: false
                });
                coverGroup.add(new THREE.Mesh(lipG, matCover));
            }
        }

        coverGroup.position.z = body_depth - cover_lip_depth + 0.1 + explode_cover;

        this.keychainGroup.add(housingGroup);
        this.keychainGroup.add(coverGroup);

        if (scale !== 1) {
            this.keychainGroup.scale.set(scale, -scale, scale);
        } else {
            this.keychainGroup.scale.y = -1;
        }

        var box    = new THREE.Box3().setFromObject(this.keychainGroup);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        this.keychainGroup.position.sub(center);

        this.keychainGroup.traverse(function(child) {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        this.scene.add(this.keychainGroup);

        var maxDim = Math.max(size.x, size.y, size.z);
        this.camera.position.set(0, maxDim * 0.4, maxDim * 1.7);
        this.camera.near = maxDim * 0.01;
        this.camera.far  = maxDim * 10;
        this.camera.updateProjectionMatrix();
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this._lastFontColor    = coverColor;
        this._lastOutlineColor = baseColor;
        this._lastParams       = p;
    }

    calculateMeshVolume(mesh) {
        mesh.updateMatrixWorld(true);
        var geometry = mesh.geometry;
        if (!geometry || !geometry.isBufferGeometry) return 0;
        
        var volume = 0;
        var p1 = new THREE.Vector3();
        var p2 = new THREE.Vector3();
        var p3 = new THREE.Vector3();
            
        var positions = geometry.attributes.position;
        var indices = geometry.index;
        
        if (indices) {
            for (var i = 0; i < indices.count; i += 3) {
                p1.fromBufferAttribute(positions, indices.getX(i + 0)).applyMatrix4(mesh.matrixWorld);
                p2.fromBufferAttribute(positions, indices.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
                p3.fromBufferAttribute(positions, indices.getX(i + 2)).applyMatrix4(mesh.matrixWorld);
                volume += p1.dot(p2.cross(p3)) / 6.0;
            }
        } else {
            for (var j = 0; j < positions.count; j += 3) {
                p1.fromBufferAttribute(positions, j + 0).applyMatrix4(mesh.matrixWorld);
                p2.fromBufferAttribute(positions, j + 1).applyMatrix4(mesh.matrixWorld);
                p3.fromBufferAttribute(positions, j + 2).applyMatrix4(mesh.matrixWorld);
                volume += p1.dot(p2.cross(p3)) / 6.0;
            }
        }
        return Math.abs(volume);
    }

    /* ── Get physical dimensions in mm (1 Three.js unit ≈ 1mm) ── */
    getDimensions() {
        if (!this.keychainGroup) return { width: 0, height: 0, depth: 0, volumeCm3: 0, weightGrams: 0 };
        var box  = new THREE.Box3().setFromObject(this.keychainGroup);
        var size = box.getSize(new THREE.Vector3());
        
        // Compute Total Solid Volume
        var totalVolumeMm3 = 0;
        var self = this;
        this.keychainGroup.traverse(function(obj) {
            if (obj.isMesh && obj.geometry) {
                totalVolumeMm3 += self.calculateMeshVolume(obj);
            }
        });
        
        // 1 cm³ = 1000 mm³. Density of standard PLA is ~1.24 g/cm³.
        var solidVolumeCm3 = totalVolumeMm3 / 1000;
        
        // Slicer compensation: 3D prints are rarely 100% solid. 
        // For flat keychains with 3 perimeters and 40% infill, actual plastic volume is ~57% of the mathematical solid volume.
        var INFILL_FACTOR = 0.57;
        var weightGrams = (solidVolumeCm3 * INFILL_FACTOR) * 1.24;
        
        return {
            width:  Math.round(size.x * 10) / 10,
            height: Math.round(size.y * 10) / 10,
            depth:  Math.round(size.z * 10) / 10,
            volumeCm3: Math.round(solidVolumeCm3 * 100) / 100,
            weightGrams: Math.round(weightGrams * 100) / 100
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

        if (params.productType === 'linked_initials') {
            // Left color = colors.font, right color = colors.line2.
            params.lineColors = [
                colors.font || '#FFFFFF',
                colors.line2 || '#7b2fff',
            ];
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
