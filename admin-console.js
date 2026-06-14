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
    // Wavy Nametag Fonts
    { name: 'Chewy',              label: 'Chewy',           file: 'Fonts/Chewy-Regular.ttf',      lang: 'en' },
    { name: 'Bebas Neue',         label: 'Bebas Neue',      file: 'Fonts/BebasNeue-Regular.ttf',  lang: 'en' },
    { name: 'Lobster',            label: 'Lobster',         file: 'Fonts/Lobster-Regular.ttf',    lang: 'en' },
    { name: 'Pacifico',           label: 'Pacifico',        file: 'Fonts/Pacifico-Regular.ttf',   lang: 'en' },
    { name: 'Raleway',            label: 'Raleway',         file: 'Fonts/Raleway-Regular.ttf',    lang: 'en' },
    { name: 'Oswald',             label: 'Oswald',          file: 'Fonts/Oswald-Regular.ttf',     lang: 'en' },
    { name: 'Anton',              label: 'Anton',           file: 'Fonts/Anton-Regular.ttf',      lang: 'en' },
    { name: 'Archivo Black',      label: 'Archivo Black',   file: 'Fonts/ArchivoBlack-Regular.ttf', lang: 'en' },
    { name: 'Impact',             label: 'Impact',          file: 'Fonts/impact.ttf',             lang: 'en' },
    { name: 'Playfair Display',   label: 'Playfair Display',file: 'Fonts/PlayfairDisplay-Regular.ttf', lang: 'en' },
    { name: 'Orbitron',           label: 'Orbitron',        file: 'Fonts/Orbitron-Regular.ttf',   lang: 'en' },
    { name: 'Press Start 2P',     label: 'Press Start 2P',  file: 'Fonts/PressStart2P-Regular.ttf', lang: 'en' },
    { name: 'Creepster',          label: 'Creepster',       file: 'Fonts/Creepster-Regular.ttf',  lang: 'en' },
    { name: 'Poppins',            label: 'Poppins',         file: 'Fonts/Poppins-Regular.ttf',    lang: 'en' },
    { name: 'Monoton',            label: 'Monoton',         file: 'Fonts/Monoton-Regular.ttf',    lang: 'en' },
    { name: 'Shadows Into Light', label: 'Shadows Into Light', file: 'Fonts/ShadowsIntoLight.ttf', lang: 'en' },
    { name: 'Fredoka One',        label: 'Fredoka One',     file: 'Fonts/FredokaOne-Regular.ttf', lang: 'en' },
    { name: 'Cinzel',             label: 'Cinzel',          file: 'Fonts/Cinzel-Regular.ttf',     lang: 'en' },
    { name: 'Amatic SC',          label: 'Amatic SC',       file: 'Fonts/AmaticSC-Regular.ttf',   lang: 'en' },
    { name: 'Exo 2',              label: 'Exo 2',           file: 'Fonts/Exo2-Regular.ttf',       lang: 'en' },
];

const NAMETAG_FONT_ALLOWLIST = [
    'Chewy', 'Bebas Neue', 'Lobster', 'Pacifico', 'Raleway', 'Oswald', 'Anton',
    'Archivo Black', 'Impact', 'Playfair Display', 'Orbitron', 'Press Start 2P',
    'Creepster', 'Poppins', 'Monoton', 'Shadows Into Light', 'Fredoka One',
    'Cinzel', 'Amatic SC', 'Exo 2'
];
const NAMETAG_DEFAULT_FONT = 'Chewy';

const LOVESERIES_TOP_FONT_ALLOWLIST = ['OleoScript', 'Brandy', 'Sunday Chillin'];
const TILEKEY_FONT_ALLOWLIST = ['BagelFatOne', 'Super Bubble', 'Rock Boys', 'CANAVAR'];
const TILEKEY_DEFAULT_FONT = 'BagelFatOne';

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
        
        // Nametag specific
        wave_amplitude: 3.0,
        wave_cycles: 1.0,
        text_size: 18,
        letter_gap: -2.0,
        base_thickness: 1.5,
        height_even: 2.5,
        height_odd: 1.5,
        ring_outer_d: 8,
        ring_inner_d: 4,
        ring_height: 3.0,
        ring_x: -1,
        ring_y: 8,
    }, // Total = 5mm
    standard: {
        scaleFactor: 0.5,
        base:    { depth: 3,   bevelThickness: 0,   bevelSize: 3,   bevelSegments: 8 },     // 3 + 0 = 3mm
        outline: { depth: 1.5, bevelThickness: 0,   bevelSize: 2,   bevelSegments: 3 },     // 1.5 + 0 = 1.5mm
        font:    { depth: 1.5, bevelThickness: 0,   bevelSize: 0.2, bevelSegments: 3 },     // 1.5 + 0 = 1.5mm
        ring:    { outerRadius: 5.5, innerRadius: 3, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4 },
        
        // Nametag specific
        wave_amplitude: 5.0,
        wave_cycles: 1.0,
        text_size: 22,
        letter_gap: -2.5,
        base_thickness: 2.5,
        height_even: 4.0,
        height_odd: 2.0,
        ring_outer_d: 10,
        ring_inner_d: 5,
        ring_height: 4.5,
        ring_x: -1,
        ring_y: 10,
    }, // Total = 6.0mm
    thick: {
        scaleFactor: 1.3,
        base:    { depth: 4,   bevelThickness: 1.5, bevelSize: 5.5, bevelSegments: 10 },    // 4 + 3 = 7mm
        outline: { depth: 1.5, bevelThickness: 0.5, bevelSize: 2,   bevelSegments: 4 },     // 1.5 + 1 = 2.5mm
        font:    { depth: 1.5, bevelThickness: 0.5, bevelSize: 0,   bevelSegments: 4 },     // 1.5 + 1 = 2.5mm
        ring:    { outerRadius: 10, innerRadius: 4.5, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 5 },
        
        // Nametag specific
        wave_amplitude: 7.0,
        wave_cycles: 1.2,
        text_size: 26,
        letter_gap: -3.0,
        base_thickness: 3.5,
        height_even: 6.0,
        height_odd: 3.0,
        ring_outer_d: 12,
        ring_inner_d: 6,
        ring_height: 6.0,
        ring_x: -2,
        ring_y: 12,
    }, // Total = 12mm
};

// ===== STATE =====

const state = {
    name: 'Sample',
    lang: 'en',
    layers: '3L',
    productType: 'keychain',
    selectedFont: null,
    selectedFontIndex: null,
    colors: {
        base:    '#ff9933',
        font:    '#FFFFFF',
        outline: '#000000',
    },
    _girlyColorsApplied: false,
    _borderedColorsApplied: false,
    _flowerColorsApplied: false,
    _nametagColorsApplied: false,
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
    // Wavy Nametag Sliders
    wave_amplitude:   { range: 'adminWaveAmplitude',     num: 'adminWaveAmplitudeNum' },
    wave_cycles:      { range: 'adminWaveCycles',        num: 'adminWaveCyclesNum' },
    text_size:        { range: 'adminTextSize',          num: 'adminTextSizeNum' },
    letter_gap:       { range: 'adminLetterGap',         num: 'adminLetterGapNum' },
    base_thickness:   { range: 'adminBaseThickness',     num: 'adminBaseThicknessNum' },
    height_even:      { range: 'adminHeightEven',        num: 'adminHeightEvenNum' },
    height_odd:       { range: 'adminHeightOdd',         num: 'adminHeightOddNum' },
    ring_outer_d:     { range: 'adminRingOuterD',        num: 'adminRingOuterDNum' },
    ring_inner_d:     { range: 'adminRingInnerD',        num: 'adminRingInnerDNum' },
    ring_height:      { range: 'adminRingHeight',        num: 'adminRingHeightNum' },
    ring_x:           { range: 'adminRingX',             num: 'adminRingXNum' },
    ring_y:           { range: 'adminRingY',             num: 'adminRingYNum' },

    // Bordered Keychain Sliders
    bordered_border_thickness: { range: 'adminBorderedThickness',   num: 'adminBorderedThicknessNum' },
    bordered_border_height:    { range: 'adminBorderedHeight',      num: 'adminBorderedHeightNum' },
    bordered_text_height:      { range: 'adminBorderedTextHeight',  num: 'adminBorderedTextHeightNum' },
    bordered_text_size:        { range: 'adminBorderedTextSize',    num: 'adminBorderedTextSizeNum' },
    bordered_line_spacing:     { range: 'adminBorderedLineSpacing', num: 'adminBorderedLineSpacingNum' },
    bordered_ring_outer_d:     { range: 'adminBorderedRingOuterD',  num: 'adminBorderedRingOuterDNum' },
    bordered_ring_inner_d:     { range: 'adminBorderedRingInnerD',  num: 'adminBorderedRingInnerDNum' },
    bordered_ring_height:      { range: 'adminBorderedRingHeight',  num: 'adminBorderedRingHeightNum' },
    bordered_ring_x:           { range: 'adminBorderedRingX',       num: 'adminBorderedRingXNum' },
    bordered_ring_y:           { range: 'adminBorderedRingY',       num: 'adminBorderedRingYNum' },
    
    // Supported Nameplate Sliders
    supported_extrusion:       { range: 'adminSupportedExtrusion',   num: 'adminSupportedExtrusionNum' },
    supported_offs:            { range: 'adminSupportedOffs',        num: 'adminSupportedOffsNum' },
    supported_text_size:       { range: 'adminSupportedTextSize',    num: 'adminSupportedTextSizeNum' },
    supported_heart1_size:     { range: 'adminSupportedHeart1Size',  num: 'adminSupportedHeart1SizeNum' },
    supported_heart1_x:        { range: 'adminSupportedHeart1X',     num: 'adminSupportedHeart1XNum' },
    supported_heart1_y:        { range: 'adminSupportedHeart1Y',     num: 'adminSupportedHeart1YNum' },
    supported_heart1_angle:    { range: 'adminSupportedHeart1Angle', num: 'adminSupportedHeart1AngleNum' },
    supported_heart2_size:     { range: 'adminSupportedHeart2Size',  num: 'adminSupportedHeart2SizeNum' },
    supported_heart2_x:        { range: 'adminSupportedHeart2X',     num: 'adminSupportedHeart2XNum' },
    supported_heart2_y:        { range: 'adminSupportedHeart2Y',     num: 'adminSupportedHeart2YNum' },
    supported_heart2_angle:    { range: 'adminSupportedHeart2Angle', num: 'adminSupportedHeart2AngleNum' },
    supported_star1_size:      { range: 'adminSupportedStar1Size',   num: 'adminSupportedStar1SizeNum' },
    supported_star1_x:         { range: 'adminSupportedStar1X',      num: 'adminSupportedStar1XNum' },
    supported_star1_y:         { range: 'adminSupportedStar1Y',      num: 'adminSupportedStar1YNum' },
    supported_star2_size:      { range: 'adminSupportedStar2Size',   num: 'adminSupportedStar2SizeNum' },
    supported_star2_x:         { range: 'adminSupportedStar2X',      num: 'adminSupportedStar2XNum' },
    supported_star2_y:         { range: 'adminSupportedStar2Y',      num: 'adminSupportedStar2YNum' },

    // Flower Keychain Sliders
    flower_num_petals:            { range: 'adminFlowerNumPetals',            num: 'adminFlowerNumPetalsNum' },
    flower_base_thickness:        { range: 'adminFlowerBaseThickness',        num: 'adminFlowerBaseThicknessNum' },
    flower_center_disc_thickness: { range: 'adminFlowerCenterDiscThickness',  num: 'adminFlowerCenterDiscThicknessNum' },
    flower_letter_thickness:      { range: 'adminFlowerLetterThickness',      num: 'adminFlowerLetterThicknessNum' },
    flower_ring_outer_d:          { range: 'adminFlowerRingOuterD',          num: 'adminFlowerRingOuterDNum' },
    flower_ring_inner_d:          { range: 'adminFlowerRingInnerD',          num: 'adminFlowerRingInnerDNum' },
    flower_ring_height:           { range: 'adminFlowerRingHeight',           num: 'adminFlowerRingHeightNum' },
    flower_ring_offset:           { range: 'adminFlowerRingOffset',           num: 'adminFlowerRingOffsetNum' },
    flower_base_radius:           { range: 'adminFlowerBaseRadius',           num: 'adminFlowerBaseRadiusNum' },
    flower_petal_amplitude:       { range: 'adminFlowerPetalAmplitude',       num: 'adminFlowerPetalAmplitudeNum' },
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
    
    let filteredFonts = FONTS.filter(f => f.lang === state.lang);
    if (state.productType === 'nametag') {
        filteredFonts = filteredFonts.filter(f => NAMETAG_FONT_ALLOWLIST.includes(f.name));
    } else if (state.productType === 'loveseries') {
        filteredFonts = filteredFonts.filter(f => LOVESERIES_TOP_FONT_ALLOWLIST.includes(f.name));
    } else if (state.productType === 'tilekey') {
        filteredFonts = filteredFonts.filter(f => TILEKEY_FONT_ALLOWLIST.includes(f.name));
    } else {
        // Exclude nametag fonts for standard/classic products
        filteredFonts = filteredFonts.filter(f => !NAMETAG_FONT_ALLOWLIST.includes(f.name));
    }

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
    const p = {
        scaleFactor: parseFloat(sliders.scaleFactor.range.value),
        layers: state.layers,
        productType: state.productType,
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

    if (sliders.wave_amplitude) {
        p.wave_mode = $('adminWaveMode').value;
        p.wave_amplitude = parseFloat(sliders.wave_amplitude.range.value);
        p.wave_cycles = parseFloat(sliders.wave_cycles.range.value);
        p.text_size = parseFloat(sliders.text_size.range.value);
        p.letter_gap = parseFloat(sliders.letter_gap.range.value);
        p.base_thickness = parseFloat(sliders.base_thickness.range.value);
        p.height_even = parseFloat(sliders.height_even.range.value);
        p.height_odd = parseFloat(sliders.height_odd.range.value);
        p.ring_outer_d = parseFloat(sliders.ring_outer_d.range.value);
        p.ring_inner_d = parseFloat(sliders.ring_inner_d.range.value);
        p.ring_height = parseFloat(sliders.ring_height.range.value);
        p.ring_x = parseFloat(sliders.ring_x.range.value);
        p.ring_y = parseFloat(sliders.ring_y.range.value);
    }
    
    // Bordered Keychain
    if (sliders.bordered_border_thickness) {
        p.bordered_border_thickness = parseFloat(sliders.bordered_border_thickness.range.value);
        p.bordered_border_height = parseFloat(sliders.bordered_border_height.range.value);
        p.bordered_text_height = parseFloat(sliders.bordered_text_height.range.value);
        p.bordered_text_size = parseFloat(sliders.bordered_text_size.range.value);
        p.bordered_line_spacing = parseFloat(sliders.bordered_line_spacing.range.value);
        p.bordered_show_ring = $('adminBorderedShowRing').value === 'yes';
        p.bordered_ring_outer_d = parseFloat(sliders.bordered_ring_outer_d.range.value);
        p.bordered_ring_inner_d = parseFloat(sliders.bordered_ring_inner_d.range.value);
        p.bordered_ring_height = parseFloat(sliders.bordered_ring_height.range.value);
        p.bordered_ring_x = parseFloat(sliders.bordered_ring_x.range.value);
        p.bordered_ring_y = parseFloat(sliders.bordered_ring_y.range.value);
    }

    // Supported Nameplate
    if (sliders.supported_extrusion) {
        p.supported_extrusion = parseFloat(sliders.supported_extrusion.range.value);
        p.supported_offs = parseFloat(sliders.supported_offs.range.value);
        p.supported_text_size = parseFloat(sliders.supported_text_size.range.value);
        p.supported_heart1_enable = $('adminSupportedHeart1Enable').value === 'yes';
        p.supported_heart1_size = parseFloat(sliders.supported_heart1_size.range.value);
        p.supported_heart1_x = parseFloat(sliders.supported_heart1_x.range.value);
        p.supported_heart1_y = parseFloat(sliders.supported_heart1_y.range.value);
        p.supported_heart1_angle = parseFloat(sliders.supported_heart1_angle.range.value);
        p.supported_heart2_enable = $('adminSupportedHeart2Enable').value === 'yes';
        p.supported_heart2_size = parseFloat(sliders.supported_heart2_size.range.value);
        p.supported_heart2_x = parseFloat(sliders.supported_heart2_x.range.value);
        p.supported_heart2_y = parseFloat(sliders.supported_heart2_y.range.value);
        p.supported_heart2_angle = parseFloat(sliders.supported_heart2_angle.range.value);
        p.supported_star1_enable = $('adminSupportedStar1Enable').value === 'yes';
        p.supported_star1_size = parseFloat(sliders.supported_star1_size.range.value);
        p.supported_star1_x = parseFloat(sliders.supported_star1_x.range.value);
        p.supported_star1_y = parseFloat(sliders.supported_star1_y.range.value);
        p.supported_star2_enable = $('adminSupportedStar2Enable').value === 'yes';
        p.supported_star2_size = parseFloat(sliders.supported_star2_size.range.value);
        p.supported_star2_x = parseFloat(sliders.supported_star2_x.range.value);
        p.supported_star2_y = parseFloat(sliders.supported_star2_y.range.value);
    }

    // Flower Keychain
    if (sliders.flower_num_petals) {
        p.flower_num_petals = parseInt(sliders.flower_num_petals.range.value, 10);
        p.flower_base_thickness = parseFloat(sliders.flower_base_thickness.range.value);
        p.flower_center_disc_thickness = parseFloat(sliders.flower_center_disc_thickness.range.value);
        p.flower_letter_thickness = parseFloat(sliders.flower_letter_thickness.range.value);
        p.flower_ring_outer_d = parseFloat(sliders.flower_ring_outer_d.range.value);
        p.flower_ring_inner_d = parseFloat(sliders.flower_ring_inner_d.range.value);
        p.flower_ring_height = parseFloat(sliders.flower_ring_height.range.value);
        p.flower_ring_offset = parseFloat(sliders.flower_ring_offset.range.value);
        p.flower_base_radius = parseFloat(sliders.flower_base_radius.range.value);
        p.flower_petal_amplitude = parseFloat(sliders.flower_petal_amplitude.range.value);
    }
    return p;
}

// ===== SET SLIDERS FROM PARAMS =====

function setSliders(p) {
    if (p.scaleFactor !== undefined) {
        sliders.scaleFactor.range.value = p.scaleFactor;
        sliders.scaleFactor.num.value   = p.scaleFactor;
    }
    if (p.base) {
        sliders.baseDepth.range.value     = p.base.depth;
        sliders.baseDepth.num.value       = p.base.depth;
        sliders.baseBevelThk.range.value  = p.base.bevelThickness;
        sliders.baseBevelThk.num.value    = p.base.bevelThickness;
        sliders.baseBevelSize.range.value = p.base.bevelSize;
        sliders.baseBevelSize.num.value   = p.base.bevelSize;
        sliders.baseBevelSeg.range.value  = p.base.bevelSegments;
        sliders.baseBevelSeg.num.value    = p.base.bevelSegments;
    }
    if (p.outline) {
        sliders.outlineDepth.range.value     = p.outline.depth;
        sliders.outlineDepth.num.value       = p.outline.depth;
        sliders.outlineBevelThk.range.value  = p.outline.bevelThickness;
        sliders.outlineBevelThk.num.value    = p.outline.bevelThickness;
        sliders.outlineBevelSize.range.value = p.outline.bevelSize;
        sliders.outlineBevelSize.num.value   = p.outline.bevelSize;
    }
    if (p.font) {
        sliders.fontDepth.range.value     = p.font.depth;
        sliders.fontDepth.num.value       = p.font.depth;
        sliders.fontBevelThk.range.value  = p.font.bevelThickness;
        sliders.fontBevelThk.num.value    = p.font.bevelThickness;
        sliders.fontBevelSize.range.value = p.font.bevelSize;
        sliders.fontBevelSize.num.value   = p.font.bevelSize;
    }
    if (p.ring) {
        sliders.ringOuter.range.value     = p.ring.outerRadius;
        sliders.ringOuter.num.value       = p.ring.outerRadius;
        sliders.ringInner.range.value     = p.ring.innerRadius;
        sliders.ringInner.num.value       = p.ring.innerRadius;
    }

    // Nametag specific
    if (p.wave_mode !== undefined) {
        $('adminWaveMode').value = p.wave_mode;
    }
    if (p.wave_amplitude !== undefined) {
        sliders.wave_amplitude.range.value = p.wave_amplitude;
        sliders.wave_amplitude.num.value   = p.wave_amplitude;
    }
    if (p.wave_cycles !== undefined) {
        sliders.wave_cycles.range.value = p.wave_cycles;
        sliders.wave_cycles.num.value   = p.wave_cycles;
    }
    if (p.text_size !== undefined) {
        sliders.text_size.range.value = p.text_size;
        sliders.text_size.num.value   = p.text_size;
    }
    if (p.letter_gap !== undefined) {
        sliders.letter_gap.range.value = p.letter_gap;
        sliders.letter_gap.num.value   = p.letter_gap;
    }
    if (p.base_thickness !== undefined) {
        sliders.base_thickness.range.value = p.base_thickness;
        sliders.base_thickness.num.value   = p.base_thickness;
    }
    if (p.height_even !== undefined) {
        sliders.height_even.range.value = p.height_even;
        sliders.height_even.num.value   = p.height_even;
    }
    if (p.height_odd !== undefined) {
        sliders.height_odd.range.value = p.height_odd;
        sliders.height_odd.num.value   = p.height_odd;
    }
    if (p.ring_outer_d !== undefined) {
        sliders.ring_outer_d.range.value = p.ring_outer_d;
        sliders.ring_outer_d.num.value   = p.ring_outer_d;
    }
    if (p.ring_inner_d !== undefined) {
        sliders.ring_inner_d.range.value = p.ring_inner_d;
        sliders.ring_inner_d.num.value   = p.ring_inner_d;
    }
    if (p.ring_height !== undefined) {
        sliders.ring_height.range.value = p.ring_height;
        sliders.ring_height.num.value   = p.ring_height;
    }
    if (p.ring_x !== undefined) {
        sliders.ring_x.range.value = p.ring_x;
        sliders.ring_x.num.value   = p.ring_x;
    }
    if (p.ring_y !== undefined) {
        sliders.ring_y.range.value = p.ring_y;
        sliders.ring_y.num.value   = p.ring_y;
    }

    // Bordered Keychain
    if (p.bordered_border_thickness !== undefined) {
        sliders.bordered_border_thickness.range.value = p.bordered_border_thickness;
        sliders.bordered_border_thickness.num.value   = p.bordered_border_thickness;
    }
    if (p.bordered_border_height !== undefined) {
        sliders.bordered_border_height.range.value = p.bordered_border_height;
        sliders.bordered_border_height.num.value   = p.bordered_border_height;
    }
    if (p.bordered_text_height !== undefined) {
        sliders.bordered_text_height.range.value = p.bordered_text_height;
        sliders.bordered_text_height.num.value   = p.bordered_text_height;
    }
    if (p.bordered_text_size !== undefined) {
        sliders.bordered_text_size.range.value = p.bordered_text_size;
        sliders.bordered_text_size.num.value   = p.bordered_text_size;
    }
    if (p.bordered_line_spacing !== undefined) {
        sliders.bordered_line_spacing.range.value = p.bordered_line_spacing;
        sliders.bordered_line_spacing.num.value   = p.bordered_line_spacing;
    }
    if (p.bordered_show_ring !== undefined) {
        $('adminBorderedShowRing').value = p.bordered_show_ring ? 'yes' : 'no';
    }
    if (p.bordered_ring_outer_d !== undefined) {
        sliders.bordered_ring_outer_d.range.value = p.bordered_ring_outer_d;
        sliders.bordered_ring_outer_d.num.value   = p.bordered_ring_outer_d;
    }
    if (p.bordered_ring_inner_d !== undefined) {
        sliders.bordered_ring_inner_d.range.value = p.bordered_ring_inner_d;
        sliders.bordered_ring_inner_d.num.value   = p.bordered_ring_inner_d;
    }
    if (p.bordered_ring_height !== undefined) {
        sliders.bordered_ring_height.range.value = p.bordered_ring_height;
        sliders.bordered_ring_height.num.value   = p.bordered_ring_height;
    }
    if (p.bordered_ring_x !== undefined) {
        sliders.bordered_ring_x.range.value = p.bordered_ring_x;
        sliders.bordered_ring_x.num.value   = p.bordered_ring_x;
    }
    if (p.bordered_ring_y !== undefined) {
        sliders.bordered_ring_y.range.value = p.bordered_ring_y;
        sliders.bordered_ring_y.num.value   = p.bordered_ring_y;
    }

    // Supported Nameplate
    if (p.supported_extrusion !== undefined) {
        sliders.supported_extrusion.range.value = p.supported_extrusion;
        sliders.supported_extrusion.num.value   = p.supported_extrusion;
    }
    if (p.supported_offs !== undefined) {
        sliders.supported_offs.range.value = p.supported_offs;
        sliders.supported_offs.num.value   = p.supported_offs;
    }
    if (p.supported_text_size !== undefined) {
        sliders.supported_text_size.range.value = p.supported_text_size;
        sliders.supported_text_size.num.value   = p.supported_text_size;
    }
    if (p.supported_heart1_enable !== undefined) {
        $('adminSupportedHeart1Enable').value = p.supported_heart1_enable ? 'yes' : 'no';
    }
    if (p.supported_heart1_size !== undefined) {
        sliders.supported_heart1_size.range.value = p.supported_heart1_size;
        sliders.supported_heart1_size.num.value   = p.supported_heart1_size;
    }
    if (p.supported_heart1_x !== undefined) {
        sliders.supported_heart1_x.range.value = p.supported_heart1_x;
        sliders.supported_heart1_x.num.value   = p.supported_heart1_x;
    }
    if (p.supported_heart1_y !== undefined) {
        sliders.supported_heart1_y.range.value = p.supported_heart1_y;
        sliders.supported_heart1_y.num.value   = p.supported_heart1_y;
    }
    if (p.supported_heart1_angle !== undefined) {
        sliders.supported_heart1_angle.range.value = p.supported_heart1_angle;
        sliders.supported_heart1_angle.num.value   = p.supported_heart1_angle;
    }
    if (p.supported_heart2_enable !== undefined) {
        $('adminSupportedHeart2Enable').value = p.supported_heart2_enable ? 'yes' : 'no';
    }
    if (p.supported_heart2_size !== undefined) {
        sliders.supported_heart2_size.range.value = p.supported_heart2_size;
        sliders.supported_heart2_size.num.value   = p.supported_heart2_size;
    }
    if (p.supported_heart2_x !== undefined) {
        sliders.supported_heart2_x.range.value = p.supported_heart2_x;
        sliders.supported_heart2_x.num.value   = p.supported_heart2_x;
    }
    if (p.supported_heart2_y !== undefined) {
        sliders.supported_heart2_y.range.value = p.supported_heart2_y;
        sliders.supported_heart2_y.num.value   = p.supported_heart2_y;
    }
    if (p.supported_heart2_angle !== undefined) {
        sliders.supported_heart2_angle.range.value = p.supported_heart2_angle;
        sliders.supported_heart2_angle.num.value   = p.supported_heart2_angle;
    }
    if (p.supported_star1_enable !== undefined) {
        $('adminSupportedStar1Enable').value = p.supported_star1_enable ? 'yes' : 'no';
    }
    if (p.supported_star1_size !== undefined) {
        sliders.supported_star1_size.range.value = p.supported_star1_size;
        sliders.supported_star1_size.num.value   = p.supported_star1_size;
    }
    if (p.supported_star1_x !== undefined) {
        sliders.supported_star1_x.range.value = p.supported_star1_x;
        sliders.supported_star1_x.num.value   = p.supported_star1_x;
    }
    if (p.supported_star1_y !== undefined) {
        sliders.supported_star1_y.range.value = p.supported_star1_y;
        sliders.supported_star1_y.num.value   = p.supported_star1_y;
    }
    if (p.supported_star2_enable !== undefined) {
        $('adminSupportedStar2Enable').value = p.supported_star2_enable ? 'yes' : 'no';
    }
    if (p.supported_star2_size !== undefined) {
        sliders.supported_star2_size.range.value = p.supported_star2_size;
        sliders.supported_star2_size.num.value   = p.supported_star2_size;
    }
    if (p.supported_star2_x !== undefined) {
        sliders.supported_star2_x.range.value = p.supported_star2_x;
        sliders.supported_star2_x.num.value   = p.supported_star2_x;
    }
    if (p.supported_star2_y !== undefined) {
        sliders.supported_star2_y.range.value = p.supported_star2_y;
        sliders.supported_star2_y.num.value   = p.supported_star2_y;
    }

    // Flower Keychain
    if (p.flower_num_petals !== undefined) {
        sliders.flower_num_petals.range.value = p.flower_num_petals;
        sliders.flower_num_petals.num.value   = p.flower_num_petals;
    }
    if (p.flower_base_thickness !== undefined) {
        sliders.flower_base_thickness.range.value = p.flower_base_thickness;
        sliders.flower_base_thickness.num.value   = p.flower_base_thickness;
    }
    if (p.flower_center_disc_thickness !== undefined) {
        sliders.flower_center_disc_thickness.range.value = p.flower_center_disc_thickness;
        sliders.flower_center_disc_thickness.num.value   = p.flower_center_disc_thickness;
    }
    if (p.flower_letter_thickness !== undefined) {
        sliders.flower_letter_thickness.range.value = p.flower_letter_thickness;
        sliders.flower_letter_thickness.num.value   = p.flower_letter_thickness;
    }
    if (p.flower_ring_outer_d !== undefined) {
        sliders.flower_ring_outer_d.range.value = p.flower_ring_outer_d;
        sliders.flower_ring_outer_d.num.value   = p.flower_ring_outer_d;
    }
    if (p.flower_ring_inner_d !== undefined) {
        sliders.flower_ring_inner_d.range.value = p.flower_ring_inner_d;
        sliders.flower_ring_inner_d.num.value   = p.flower_ring_inner_d;
    }
    if (p.flower_ring_height !== undefined) {
        sliders.flower_ring_height.range.value = p.flower_ring_height;
        sliders.flower_ring_height.num.value   = p.flower_ring_height;
    }
    if (p.flower_ring_offset !== undefined) {
        sliders.flower_ring_offset.range.value = p.flower_ring_offset;
        sliders.flower_ring_offset.num.value   = p.flower_ring_offset;
    }
    if (p.flower_base_radius !== undefined) {
        sliders.flower_base_radius.range.value = p.flower_base_radius;
        sliders.flower_base_radius.num.value   = p.flower_base_radius;
    }
    if (p.flower_petal_amplitude !== undefined) {
        sliders.flower_petal_amplitude.range.value = p.flower_petal_amplitude;
        sliders.flower_petal_amplitude.num.value   = p.flower_petal_amplitude;
    }
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
            params,
            state.productType
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
            productType: state.productType,
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
            if (saved.productType) {
                state.productType = saved.productType;
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

// ===== ENSURE PRODUCT DEFAULTS =====

function ensureDefaultsForProductType() {
    if (state.productType === 'nametag') {
        const selectedAllowed = state.selectedFont && NAMETAG_FONT_ALLOWLIST.includes(state.selectedFont.name);
        if (!selectedAllowed) {
            const idx = FONTS.findIndex(f => f.name === NAMETAG_DEFAULT_FONT);
            selectFont(idx >= 0 ? idx : 0);
        }
        if (!state._nametagColorsApplied) {
            state.colors.base = '#F85DE9';
            state.colors.font = '#F85DE9';
            state.colors.outline = '#F85DE9';
            state._nametagColorsApplied = true;
            buildSwatches();
        }
    } else {
        if (state._nametagColorsApplied) {
            state.colors.base = '#ff9933';
            state.colors.font = '#FFFFFF';
            state.colors.outline = '#000000';
            state._nametagColorsApplied = false;
            buildSwatches();
        }

        if (state.productType !== 'girly_keychain' && state._girlyColorsApplied) {
            state.colors.base = '#ff9933';
            state.colors.font = '#FFFFFF';
            state.colors.outline = '#000000';
            state._girlyColorsApplied = false;
            buildSwatches();
        }
        if (state.productType !== 'bordered_keychain' && state._borderedColorsApplied) {
            state.colors.base = '#ff9933';
            state.colors.font = '#FFFFFF';
            state.colors.outline = '#000000';
            state._borderedColorsApplied = false;
            buildSwatches();
        }
        if (state.productType !== 'flower_keychain' && state._flowerColorsApplied) {
            state.colors.base = '#ff9933';
            state.colors.font = '#FFFFFF';
            state.colors.outline = '#000000';
            state._flowerColorsApplied = false;
            buildSwatches();
        }
        
        let selectedAllowed = true;
        if (state.productType === 'loveseries') {
            selectedAllowed = state.selectedFont && LOVESERIES_TOP_FONT_ALLOWLIST.includes(state.selectedFont.name);
            if (!selectedAllowed) {
                const idx = FONTS.findIndex(f => f.name === LOVESERIES_TOP_FONT_ALLOWLIST[0]);
                selectFont(idx >= 0 ? idx : 0);
            }
        } else if (state.productType === 'tilekey') {
            selectedAllowed = state.selectedFont && TILEKEY_FONT_ALLOWLIST.includes(state.selectedFont.name);
            if (!selectedAllowed) {
                const idx = FONTS.findIndex(f => f.name === TILEKEY_DEFAULT_FONT);
                selectFont(idx >= 0 ? idx : 0);
            }
        } else if (state.productType === 'girly_keychain') {
            selectedAllowed = state.selectedFont && state.selectedFont.name === 'Sunday Chillin';
            if (!selectedAllowed) {
                const idx = FONTS.findIndex(f => f.name === 'Sunday Chillin');
                selectFont(idx >= 0 ? idx : 0);
            }
            if (!state._girlyColorsApplied) {
                state.colors.base = '#ff61a6';
                state.colors.font = '#FFFFFF';
                state.colors.outline = '#000000';
                state._girlyColorsApplied = true;
                buildSwatches();
            }
        } else if (state.productType === 'bordered_keychain') {
            if (!state._borderedColorsApplied) {
                state.colors.base = '#000000';
                state.colors.font = '#7ed957';
                state.colors.outline = '#000000';
                state._borderedColorsApplied = true;
                buildSwatches();
            }
        } else if (state.productType === 'flower_keychain') {
            if (!state._flowerColorsApplied) {
                state.colors.base = '#ff61a6';
                state.colors.font = '#FFFFFF';
                state.colors.outline = '#000000';
                state._flowerColorsApplied = true;
                buildSwatches();
            }
        } else {
            selectedAllowed = state.selectedFont && !NAMETAG_FONT_ALLOWLIST.includes(state.selectedFont.name);
            if (!selectedAllowed) {
                const firstStandard = FONTS.find(f => f.lang === state.lang && !NAMETAG_FONT_ALLOWLIST.includes(f.name));
                const idx = firstStandard ? FONTS.indexOf(firstStandard) : 0;
                selectFont(idx);
            }
        }
    }
}

// ===== APPLY PRODUCT TYPE UI =====

function applyProductTypeUI() {
    const isNametag = state.productType === 'nametag';
    const isBordered = state.productType === 'bordered_keychain';
    const isSupported = state.productType === 'supported_text';
    const isFlower = state.productType === 'flower_keychain';

    // Show/hide sections
    $('adminNametagSection').style.display = isNametag ? 'block' : 'none';
    
    const borderedSection = $('adminBorderedSection');
    if (borderedSection) borderedSection.style.display = isBordered ? 'block' : 'none';

    const supportedSection = $('adminSupportedSection');
    if (supportedSection) supportedSection.style.display = isSupported ? 'block' : 'none';

    const flowerSection = $('adminFlowerSection');
    if (flowerSection) flowerSection.style.display = isFlower ? 'block' : 'none';

    const standardSections = [
        $('adminBaseSection'),
        $('adminOutlineSection'),
        $('adminFontSection'),
        $('adminRingSection'),
        $('adminPresetsSection')
    ];
    standardSections.forEach(sec => {
        if (sec) {
            const hideStandard = isNametag || isBordered || isSupported || isFlower;
            sec.style.display = hideStandard ? 'none' : 'block';
        }
    });

    const fontSwatchGroup = $('adminFontSwatchGroup');
    const outlineSwatchGroup = $('adminOutlineSwatchGroup');
    const layerToggleWrap = $('adminLayerToggleWrap');

    const hideOutlineAndLayers = isNametag || isBordered || isSupported || isFlower;

    if (fontSwatchGroup) fontSwatchGroup.style.display = isNametag ? 'none' : '';
    if (outlineSwatchGroup) outlineSwatchGroup.style.display = (hideOutlineAndLayers || state.layers !== '3L') ? 'none' : '';
    if (layerToggleWrap) layerToggleWrap.style.display = hideOutlineAndLayers ? 'none' : '';

    if (isNametag) {
        nameInput.placeholder = 'e.g. Priya (Max 15 chars)';
        nameInput.maxLength = 15;
        if (nameInput.value.includes('\n')) {
            nameInput.value = nameInput.value.replace(/\n/g, '');
            state.name = nameInput.value;
        }
    } else if (isFlower) {
        nameInput.placeholder = 'Initial e.g. S (Max 1 char)';
        nameInput.maxLength = 1;
        if (nameInput.value.length > 1) {
            nameInput.value = nameInput.value.charAt(0);
            state.name = nameInput.value;
        }
    } else if (isSupported) {
        nameInput.placeholder = 'e.g. SAKTHI (Max 15 chars)';
        nameInput.maxLength = 15;
        if (nameInput.value.includes('\n')) {
            nameInput.value = nameInput.value.replace(/\n/g, '');
            state.name = nameInput.value;
        }
    } else {
        nameInput.placeholder = 'e.g. Priya, SAKTHI…  (Enter for 2nd line)';
        nameInput.maxLength = 31;
    }

    ensureDefaultsForProductType();
    buildFontChips();
    updateViewer();
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

    // Bind product type selection
    const productTypeSelect = $('adminProductType');
    if (productTypeSelect) {
        productTypeSelect.value = state.productType || 'keychain';
        productTypeSelect.addEventListener('change', (e) => {
            state.productType = e.target.value;
            applyProductTypeUI();
        });
    }

    // Bind wave mode change
    const waveModeSelect = $('adminWaveMode');
    if (waveModeSelect) {
        waveModeSelect.addEventListener('change', () => {
            debouncedRebuild();
        });
    }

    // Initial product UI apply
    applyProductTypeUI();

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
