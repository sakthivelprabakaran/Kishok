/* =========================================
   YOURSGIFTS — ADMIN CONSOLE JS (ES Module)
   Full-screen STL Generation Console
   ========================================= */

import { KeychainViewer } from './viewer3d.js';

// ===== FONT & COLOR DATA (mirrors script.js) =====

const FONTS = [
    { name: 'Brandy',             label: 'Brandy',          file: 'Fonts/Brandy.ttf',             lang: 'en' },
    { name: 'CANAVAR',            label: 'Canavar',         file: 'Fonts/CANAVAR.ttf',            lang: 'en' },
    { name: 'Super Bubble',       label: 'Super Bubble',    file: 'Fonts/Super Bubble.ttf',       lang: 'en' },
    { name: 'Franxurter',         label: 'Franxurter',      file: 'Fonts/Franxurter.ttf',         lang: 'en' },
    { name: 'Sunday Chillin',     label: 'Sunday Chillin',  file: 'Fonts/Sunday Chillin.ttf',     lang: 'en' },
    { name: 'Quicksilver Italic', label: 'Quicksilver',     file: 'Fonts/Quicksilver Italic.ttf', lang: 'en' },
    { name: 'Retrow Mentho',      label: 'Retrow Mentho',   file: 'Fonts/Retrow Mentho.ttf',      lang: 'en' },
    { name: 'BagelFatOne',        label: 'Bagel Fat One',   file: 'Fonts/BagelFatOne-Regular.ttf', lang: 'en' },
    { name: 'Flockey',            label: 'Flockey',         file: 'Fonts/Flockey.ttf',            lang: 'en' },
    { name: 'OleoScript',         label: 'Oleo Script',     file: 'Fonts/OleoScript-Bold.ttf',    lang: 'en' },
    { name: 'Rock Boys',          label: 'Rock Boys',       file: 'Fonts/Rock Boys.ttf',          lang: 'en' },
    { name: 'Storm Catcher',      label: 'Storm Catcher',   file: 'Fonts/Storm Catcher.otf',      lang: 'en' },
    { name: 'Nature Beauty',      label: 'Nature Beauty',   file: 'Fonts/Nature Beauty.ttf',      lang: 'en' },
    { name: 'Nasi',               label: 'Nasi',            file: 'Fonts/Nasi.otf',               lang: 'en' },
    { name: 'Baloo Thambi 2',     label: 'Baloo Thambi',    file: 'Fonts/BalooThambi2.ttf',       lang: 'ta' },
    { name: 'Hind Madurai',       label: 'Hind Madurai',    file: 'Fonts/HindMadurai.ttf',        lang: 'ta' },
    { name: 'Kavivanar',          label: 'Kavivanar',       file: 'Fonts/Kavivanar.ttf',          lang: 'ta' },
];

const COLOR_PALETTES = {
    base: [
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
        { hex: '#ff61a6', label: 'Pink' },
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#000000', label: 'Black' },
        { hex: '#FFFFFF', label: 'White' },
    ],
    font: [
        { hex: '#FFFFFF', label: 'White' },
        { hex: '#000000', label: 'Black' },
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
        { hex: '#ff61a6', label: 'Pink' },
    ],
    outline: [
        { hex: '#000000', label: 'Black' },
        { hex: '#FFFFFF', label: 'White' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
    ],
};

// ===== PRESETS =====

const PRESETS = {
    thin: {
        scaleFactor: 0.7,
        base:    { depth: 1,   bevelThickness: 1,   bevelSize: 3,   bevelSegments: 6 },     // 1 + 2 = 3mm
        outline: { depth: 0.6, bevelThickness: 0.2, bevelSize: 1,   bevelSegments: 3 },     // 0.6 + 0.4 = 1mm
        font:    { depth: 0.6, bevelThickness: 0.2, bevelSize: 0,   bevelSegments: 3 },     // 0.6 + 0.4 = 1mm
        ring:    { outerRadius: 6,  innerRadius: 2.5, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 4 },
    }, // Total = 5mm
    standard: {
        scaleFactor: 0.5,
        base:    { depth: 3,   bevelThickness: 0,   bevelSize: 3,   bevelSegments: 8 },     // 3 + 0 = 3mm
        outline: { depth: 1.5, bevelThickness: 0,   bevelSize: 2,   bevelSegments: 3 },     // 1.5 + 0 = 1.5mm
        font:    { depth: 1.5, bevelThickness: 0,   bevelSize: 0.2, bevelSegments: 3 },     // 1.5 + 0 = 1.5mm
        ring:    { outerRadius: 5.5, innerRadius: 3, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4 },
    }, // Total = 6.0mm
    thick: {
        scaleFactor: 1.3,
        base:    { depth: 4,   bevelThickness: 1.5, bevelSize: 5.5, bevelSegments: 10 },    // 4 + 3 = 7mm
        outline: { depth: 1.5, bevelThickness: 0.5, bevelSize: 2,   bevelSegments: 4 },     // 1.5 + 1 = 2.5mm
        font:    { depth: 1.5, bevelThickness: 0.5, bevelSize: 0,   bevelSegments: 4 },     // 1.5 + 1 = 2.5mm
        ring:    { outerRadius: 10, innerRadius: 4.5, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 5 },
    }, // Total = 12mm
};

// ===== STATE =====

const state = {
    name: 'Sample',
    lang: 'en',
    layers: '3L',
    selectedFont: null,
    selectedFontIndex: null,
    colors: {
        base:    '#ff9933',
        font:    '#FFFFFF',
        outline: '#000000',
    },
};

// ===== DOM REFERENCES =====

const $ = (id) => document.getElementById(id);
let viewer = null;

// Viewport elements
const viewportEl    = $('adminViewport');
const loadingEl     = $('adminLoading');
const autoRotBtn    = $('autoRotateBtn');
const vpPNGBtn      = $('vpDownloadPNG');
const vpSVGBtn      = $('vpDownloadSVG');
const vpSTLBtn      = $('vpDownloadSTL');
const dimWidth      = $('dimWidth');
const dimHeight     = $('dimHeight');
const dimDepth      = $('dimDepth');

// Control elements
const nameInput     = $('adminNameInput');
const charCountEl   = $('adminCharCount');
const langToggle    = $('adminLangToggle');
const fontChipsWrap = $('adminFontChips');
const layerToggle   = $('adminLayerToggle');
const outlineGroup  = $('adminOutlineSwatchGroup');
const outlineSection = $('adminOutlineSection');
const exportBtn     = $('adminExportSTL');
const resetBtn      = $('adminResetBtn');
const filenameInput = $('adminFilename');

// ===== SLIDER MAP =====
// Maps param keys to { range: rangeEl, num: numberInputEl }

const SLIDER_MAP = {
    scaleFactor:      { range: 'adminScaleFactor',      num: 'adminScaleNum' },
    baseDepth:        { range: 'adminBaseDepth',         num: 'adminBaseDepthNum' },
    baseBevelThk:     { range: 'adminBaseBevelThk',      num: 'adminBaseBevelThkNum' },
    baseBevelSize:    { range: 'adminBaseBevelSize',     num: 'adminBaseBevelSizeNum' },
    baseBevelSeg:     { range: 'adminBaseBevelSeg',      num: 'adminBaseBevelSegNum' },
    outlineDepth:     { range: 'adminOutlineDepth',      num: 'adminOutlineDepthNum' },
    outlineBevelThk:  { range: 'adminOutlineBevelThk',   num: 'adminOutlineBevelThkNum' },
    outlineBevelSize: { range: 'adminOutlineBevelSize',  num: 'adminOutlineBevelSizeNum' },
    fontDepth:        { range: 'adminFontDepth',         num: 'adminFontDepthNum' },
    fontBevelThk:     { range: 'adminFontBevelThk',      num: 'adminFontBevelThkNum' },
    fontBevelSize:    { range: 'adminFontBevelSize',     num: 'adminFontBevelSizeNum' },
    ringOuter:        { range: 'adminRingOuter',         num: 'adminRingOuterNum' },
    ringInner:        { range: 'adminRingInner',         num: 'adminRingInnerNum' },
};

// Resolve DOM references
const sliders = {};
for (const key in SLIDER_MAP) {
    sliders[key] = {
        range: $(SLIDER_MAP[key].range),
        num:   $(SLIDER_MAP[key].num),
    };
}

// ===== INITIALIZE 3D VIEWER =====

function initViewer() {
    viewer = new KeychainViewer(viewportEl);
}

function showLoading() { loadingEl.style.display = 'flex'; }
function hideLoading() { loadingEl.style.display = 'none'; }

// ===== BUILD FONT CHIPS =====

function buildFontChips() {
    fontChipsWrap.innerHTML = '';
    const filteredFonts = FONTS.filter(f => f.lang === state.lang);

    filteredFonts.forEach((font, idx) => {
        const chip = document.createElement('button');
        chip.className = 'font-chip' + (font.lang === 'ta' ? ' tamil' : '');
        chip.textContent = font.label;
        chip.style.fontFamily = `'${font.name}', sans-serif`;
        chip.dataset.fontIndex = FONTS.indexOf(font);
        chip.title = font.label;

        // Mark active if this was previously selected
        if (state.selectedFont && state.selectedFont.name === font.name) {
            chip.classList.add('active');
        }

        chip.addEventListener('click', () => {
            selectFont(FONTS.indexOf(font));
        });

        fontChipsWrap.appendChild(chip);
    });
}

function selectFont(index) {
    state.selectedFont = FONTS[index];
    state.selectedFontIndex = index;

    // Update active chip
    fontChipsWrap.querySelectorAll('.font-chip').forEach(c => c.classList.remove('active'));
    const active = fontChipsWrap.querySelector(`[data-font-index="${index}"]`);
    if (active) active.classList.add('active');

    // Trigger 3D update
    updateViewer();
}

// ===== BUILD COLOR SWATCHES =====

function buildSwatches() {
    const targets = {
        base:    $('adminBaseSwatches'),
        font:    $('adminFontSwatches'),
        outline: $('adminOutlineSwatches'),
    };

    for (const type in COLOR_PALETTES) {
        const container = targets[type];
        if (!container) continue;
        container.innerHTML = '';

        COLOR_PALETTES[type].forEach(item => {
            const swatch = document.createElement('div');
            swatch.className = 'ctrl-swatch' + (state.colors[type] === item.hex ? ' active' : '');
            swatch.style.backgroundColor = item.hex;
            swatch.title = item.label;

            // White swatch needs inner border
            if (item.hex === '#FFFFFF' || item.hex === '#fff') {
                swatch.style.boxShadow = 'inset 0 0 0 1.5px rgba(200,200,200,0.6)';
            }

            swatch.addEventListener('click', () => {
                state.colors[type] = item.hex;
                container.querySelectorAll('.ctrl-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                updateViewer();
            });

            container.appendChild(swatch);
        });
    }
}

// ===== LAYER TOGGLE (2L / 3L) =====

function initLayerToggle() {
    layerToggle.addEventListener('click', () => {
        const opts = layerToggle.querySelectorAll('.layer-opt');
        opts.forEach(o => o.classList.toggle('active'));
        const activeOpt = layerToggle.querySelector('.layer-opt.active');
        state.layers = activeOpt.dataset.val;

        // Show/hide outline section
        const is3L = state.layers === '3L';
        outlineGroup.style.display = is3L ? '' : 'none';
        outlineSection.style.display = is3L ? '' : 'none';

        updateViewer();
    });
}

// ===== LANGUAGE TOGGLE =====

function initLangToggle() {
    langToggle.addEventListener('click', () => {
        state.lang = state.lang === 'en' ? 'ta' : 'en';
        langToggle.textContent = state.lang.toUpperCase();

        // If current font doesn't match new language, deselect
        if (state.selectedFont && state.selectedFont.lang !== state.lang) {
            state.selectedFont = null;
            state.selectedFontIndex = null;
        }

        buildFontChips();
    });
}

// ===== TEXT INPUT =====

function clampMultiline(raw) {
    const lines = raw.split('\n').slice(0, 2);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > 15) lines[i] = lines[i].slice(0, 15);
    }
    return lines.join('\n');
}

function longestLineLen(text) {
    return (text || '').split('\n').reduce((n, l) => Math.max(n, l.length), 0);
}

function initTextInput() {
    nameInput.addEventListener('input', () => {
        const clamped = clampMultiline(nameInput.value);
        if (clamped !== nameInput.value) {
            const pos = nameInput.selectionStart;
            nameInput.value = clamped;
            const cap = Math.min(pos, clamped.length);
            nameInput.setSelectionRange(cap, cap);
        }
        state.name = nameInput.value || 'Sample';
        charCountEl.textContent = longestLineLen(nameInput.value);
        updateViewer();
    });
}

// ===== SLIDER <-> NUMBER INPUT SYNC =====

function initSliders() {
    for (const key in sliders) {
        const s = sliders[key];

        // Range → Number sync
        s.range.addEventListener('input', () => {
            s.num.value = s.range.value;
            debouncedRebuild();
        });

        // Number → Range sync
        s.num.addEventListener('input', () => {
            // Clamp value
            let val = parseFloat(s.num.value);
            const min = parseFloat(s.range.min);
            const max = parseFloat(s.range.max);
            if (isNaN(val)) return;
            if (val < min) val = min;
            if (val > max) val = max;
            s.range.value = val;
            debouncedRebuild();
        });

        // On blur, re-sync the number display
        s.num.addEventListener('blur', () => {
            s.num.value = s.range.value;
        });
    }
}

// ===== COLLECT PARAMS FROM SLIDERS =====

function collectParams() {
    return {
        scaleFactor: parseFloat(sliders.scaleFactor.range.value),
        layers: state.layers,
        base: {
            depth:          parseFloat(sliders.baseDepth.range.value),
            bevelThickness: parseFloat(sliders.baseBevelThk.range.value),
            bevelSize:      parseFloat(sliders.baseBevelSize.range.value),
            bevelSegments:  parseInt(sliders.baseBevelSeg.range.value, 10),
        },
        outline: {
            depth:          parseFloat(sliders.outlineDepth.range.value),
            bevelThickness: parseFloat(sliders.outlineBevelThk.range.value),
            bevelSize:      parseFloat(sliders.outlineBevelSize.range.value),
            bevelSegments:  3,
        },
        font: {
            depth:          parseFloat(sliders.fontDepth.range.value),
            bevelThickness: parseFloat(sliders.fontBevelThk.range.value),
            bevelSize:      parseFloat(sliders.fontBevelSize.range.value),
            bevelSegments:  3,
        },
        ring: {
            outerRadius:    parseFloat(sliders.ringOuter.range.value),
            innerRadius:    parseFloat(sliders.ringInner.range.value),
            bevelThickness: 0.5,
            bevelSize:      0.5,
            bevelSegments:  4,
        },
    };
}

// ===== SET SLIDERS FROM PARAMS =====

function setSliders(p) {
    sliders.scaleFactor.range.value   = p.scaleFactor;
    sliders.scaleFactor.num.value     = p.scaleFactor;
    sliders.baseDepth.range.value     = p.base.depth;
    sliders.baseDepth.num.value       = p.base.depth;
    sliders.baseBevelThk.range.value  = p.base.bevelThickness;
    sliders.baseBevelThk.num.value    = p.base.bevelThickness;
    sliders.baseBevelSize.range.value = p.base.bevelSize;
    sliders.baseBevelSize.num.value   = p.base.bevelSize;
    sliders.baseBevelSeg.range.value  = p.base.bevelSegments;
    sliders.baseBevelSeg.num.value    = p.base.bevelSegments;
    sliders.outlineDepth.range.value     = p.outline.depth;
    sliders.outlineDepth.num.value       = p.outline.depth;
    sliders.outlineBevelThk.range.value  = p.outline.bevelThickness;
    sliders.outlineBevelThk.num.value    = p.outline.bevelThickness;
    sliders.outlineBevelSize.range.value = p.outline.bevelSize;
    sliders.outlineBevelSize.num.value   = p.outline.bevelSize;
    sliders.fontDepth.range.value     = p.font.depth;
    sliders.fontDepth.num.value       = p.font.depth;
    sliders.fontBevelThk.range.value  = p.font.bevelThickness;
    sliders.fontBevelThk.num.value    = p.font.bevelThickness;
    sliders.fontBevelSize.range.value = p.font.bevelSize;
    sliders.fontBevelSize.num.value   = p.font.bevelSize;
    sliders.ringOuter.range.value     = p.ring.outerRadius;
    sliders.ringOuter.num.value       = p.ring.outerRadius;
    sliders.ringInner.range.value     = p.ring.innerRadius;
    sliders.ringInner.num.value       = p.ring.innerRadius;
}

// ===== DEBOUNCED REBUILD =====

let _rebuildTimer = null;

function debouncedRebuild() {
    clearTimeout(_rebuildTimer);
    _rebuildTimer = setTimeout(() => {
        if (!viewer) return;
        const params = collectParams();

        // Save to localStorage
        try { localStorage.setItem('adminConsoleParams', JSON.stringify(params)); } catch(e) {}

        viewer.rebuildWithParams(params);

        // Update dimensions after rebuild
        setTimeout(updateDimensions, 200);
    }, 250);
}

// ===== UPDATE VIEWER (full update with text + font + colors) =====

async function updateViewer() {
    if (!viewer || !state.selectedFont) return;

    showLoading();
    try {
        const params = collectParams();
        await viewer.update(
            state.name || 'Sample',
            state.selectedFont.file,
            state.colors,
            state.layers,
            params
        );
    } catch(err) {
        console.error('Admin console 3D viewer error:', err);
    }
    hideLoading();

    // Update dimensions
    setTimeout(updateDimensions, 200);

    // Save state
    try {
        localStorage.setItem('adminConsoleState', JSON.stringify({
            name: state.name,
            lang: state.lang,
            layers: state.layers,
            selectedFontIndex: state.selectedFontIndex,
            colors: state.colors,
        }));
    } catch(e) {}
}

// ===== UPDATE DIMENSIONS =====

function updateDimensions() {
    if (!viewer) return;
    const dims = viewer.getDimensions();
    dimWidth.textContent  = dims.width.toFixed(1);
    dimHeight.textContent = dims.height.toFixed(1);
    dimDepth.textContent  = dims.depth.toFixed(1);
}

// ===== VIEWPORT ACTION BUTTONS =====

function initViewportActions() {
    // Auto-rotate toggle
    autoRotBtn.addEventListener('click', () => {
        if (!viewer) return;
        const on = viewer.toggleAutoRotate();
        autoRotBtn.textContent = on ? '🔄' : '⏸️';
        autoRotBtn.title = on ? 'Pause auto-rotate' : 'Resume auto-rotate';
        autoRotBtn.classList.toggle('active', on);
    });

    // Hi-Res PNG
    vpPNGBtn.addEventListener('click', () => {
        if (viewer) viewer.downloadPNG(4);
    });

    // SVG (uses flat 2D preview if available)
    vpSVGBtn.addEventListener('click', () => {
        // Generate a quick SVG from current state
        if (!state.selectedFont || !state.name) return;
        const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const lines = state.name.split('\n').slice(0, 2);
        const twoLines = lines.length > 1;
        const fontSize = twoLines ? 48 : 60;
        const firstDy = twoLines ? '-0.55em' : '0';
        let tspans = '';
        for (let i = 0; i < lines.length; i++) {
            const content = (i === 0 ? '°' : '') + escapeXml(lines[i] || ' ');
            const dy = (i === 0) ? firstDy : '1.1em';
            tspans += '<tspan x="50%" dy="' + dy + '">' + content + '</tspan>';
        }
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 500 200');
        svg.setAttribute('xmlns', svgNS);
        svg.innerHTML =
            '<text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle"' +
            ' font-size="' + fontSize + '" fill="none"' +
            ' stroke="' + state.colors.base + '" stroke-width="15" stroke-linejoin="round"' +
            ' font-family="' + state.selectedFont.name + '">' + tspans + '</text>' +
            '<text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle"' +
            ' font-size="' + fontSize + '"' +
            ' fill="' + state.colors.font + '"' +
            ' stroke="' + state.colors.outline + '" stroke-width="1.6" stroke-linejoin="round"' +
            ' font-family="' + state.selectedFont.name + '">' + tspans + '</text>';
        KeychainViewer.downloadSVG(svg);
    });

    // Quick STL export
    vpSTLBtn.addEventListener('click', () => {
        if (viewer) viewer.exportSTL();
    });
}

// ===== PRESETS =====

function initPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = PRESETS[btn.dataset.preset];
            if (!preset) return;

            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            setSliders(preset);
            debouncedRebuild();
        });
    });
}

// ===== EXPORT & RESET =====

function initExportReset() {
    // Export STL
    exportBtn.addEventListener('click', () => {
        if (!viewer) return;
        const filename = (filenameInput.value.trim() || 'keychain_3d_print') + '.stl';
        viewer.exportSTL(filename);
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        setSliders(PRESETS.standard);
        document.querySelectorAll('.preset-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.preset === 'standard');
        });
        debouncedRebuild();
    });
}

// ===== RESTORE STATE FROM LOCALSTORAGE =====

function restoreState() {
    // Restore design state
    try {
        const saved = JSON.parse(localStorage.getItem('adminConsoleState'));
        if (saved) {
            if (saved.name) {
                state.name = saved.name;
                nameInput.value = saved.name;
                charCountEl.textContent = saved.name.length;
            }
            if (saved.lang) {
                state.lang = saved.lang;
                langToggle.textContent = state.lang.toUpperCase();
            }
            if (saved.layers) {
                state.layers = saved.layers;
                const opts = layerToggle.querySelectorAll('.layer-opt');
                opts.forEach(o => {
                    o.classList.toggle('active', o.dataset.val === state.layers);
                });
                const is3L = state.layers === '3L';
                outlineGroup.style.display = is3L ? '' : 'none';
                outlineSection.style.display = is3L ? '' : 'none';
            }
            if (saved.colors) {
                state.colors = saved.colors;
            }
            if (saved.selectedFontIndex !== null && saved.selectedFontIndex !== undefined) {
                state.selectedFontIndex = saved.selectedFontIndex;
                state.selectedFont = FONTS[saved.selectedFontIndex] || null;
            }
        }
    } catch(e) {}

    // Restore slider params
    try {
        const savedParams = JSON.parse(localStorage.getItem('adminConsoleParams'));
        if (savedParams && savedParams.base && savedParams.font) {
            setSliders(savedParams);
        }
    } catch(e) {}
}

// ===== INIT =====

function init() {
    // Initialize viewer
    initViewer();

    // Restore saved state
    restoreState();

    // Build UI
    buildFontChips();
    buildSwatches();

    // Wire up controls
    initTextInput();
    initLangToggle();
    initLayerToggle();
    initSliders();
    initPresets();
    initExportReset();
    initViewportActions();

    // Auto-select first font and trigger initial render if we have a saved font
    if (state.selectedFont) {
        selectFont(state.selectedFontIndex);
    } else {
        // Auto-select the first font
        const firstFont = FONTS.find(f => f.lang === state.lang);
        if (firstFont) {
            selectFont(FONTS.indexOf(firstFont));
        }
    }
}

// Start
init();
