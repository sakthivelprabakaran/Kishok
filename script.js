/* =========================================
   YOURSGIFTS — KEYCHAIN DESIGNER SCRIPT
   Premium, Clean E-Commerce Customizer
   ========================================= */

'use strict';

// ===== CONFIGURATION =====

var FONTS = [
    { name: 'Brandy',             label: 'Brandy',          file: 'Fonts/Brandy.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'CANAVAR',            label: 'Canavar',         file: 'Fonts/CANAVAR.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Super Bubble',       label: 'Super Bubble',    file: 'Fonts/Super Bubble.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Franxurter',         label: 'Franxurter',      file: 'Fonts/Franxurter.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Sunday Chillin',     label: 'Sunday Chillin',  file: 'Fonts/Sunday Chillin.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Quicksilver Italic', label: 'Quicksilver',     file: 'Fonts/Quicksilver Italic.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Retrow Mentho',      label: 'Retrow Mentho',   file: 'Fonts/Retrow Mentho.ttf', lang: 'en', tags: ['retro'] },
    { name: 'BagelFatOne',        label: 'Bagel Fat One',   file: 'Fonts/BagelFatOne-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Flockey',            label: 'Flockey',         file: 'Fonts/Flockey.ttf', lang: 'en', tags: ['bold'] },
    { name: 'OleoScript',         label: 'Oleo Script',     file: 'Fonts/OleoScript-Bold.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Rock Boys',          label: 'Rock Boys',       file: 'Fonts/Rock Boys.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Storm Catcher',      label: 'Storm Catcher',   file: 'Fonts/Storm Catcher.otf', lang: 'en', tags: ['retro'] },
    { name: 'Nature Beauty',      label: 'Nature Beauty',   file: 'Fonts/Nature Beauty.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Nasi',               label: 'Nasi',            file: 'Fonts/Nasi.otf', lang: 'en', tags: ['retro'] },
    { name: 'Baloo Thambi 2',     label: 'Baloo Thambi',    file: 'Fonts/BalooThambi2.ttf', lang: 'ta', tags: ['bold'] },
    { name: 'Hind Madurai',       label: 'Hind Madurai',    file: 'Fonts/HindMadurai.ttf', lang: 'ta', tags: ['retro'] },
    { name: 'Kavivanar',          label: 'Kavivanar',       file: 'Fonts/Kavivanar.ttf', lang: 'ta', tags: ['cursive'] },
    // Wavy Nametag Fonts
    { name: 'Chewy',              label: 'Chewy',           file: 'Fonts/Chewy-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Bebas Neue',         label: 'Bebas Neue',      file: 'Fonts/BebasNeue-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Lobster',            label: 'Lobster',         file: 'Fonts/Lobster-Regular.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Pacifico',           label: 'Pacifico',        file: 'Fonts/Pacifico-Regular.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Raleway',            label: 'Raleway',         file: 'Fonts/Raleway-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Oswald',             label: 'Oswald',          file: 'Fonts/Oswald-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Anton',              label: 'Anton',           file: 'Fonts/Anton-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Archivo Black',      label: 'Archivo Black',   file: 'Fonts/ArchivoBlack-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Impact',             label: 'Impact',          file: 'Fonts/impact.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Playfair Display',   label: 'Playfair Display',file: 'Fonts/PlayfairDisplay-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Orbitron',           label: 'Orbitron',        file: 'Fonts/Orbitron-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Press Start 2P',     label: 'Press Start 2P',  file: 'Fonts/PressStart2P-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Creepster',          label: 'Creepster',       file: 'Fonts/Creepster-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Poppins',            label: 'Poppins',         file: 'Fonts/Poppins-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Monoton',            label: 'Monoton',         file: 'Fonts/Monoton-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Shadows Into Light', label: 'Shadows Into Light', file: 'Fonts/ShadowsIntoLight.ttf', lang: 'en', tags: ['cursive'] },
    { name: 'Fredoka One',        label: 'Fredoka One',     file: 'Fonts/FredokaOne-Regular.ttf', lang: 'en', tags: ['bold'] },
    { name: 'Cinzel',             label: 'Cinzel',          file: 'Fonts/Cinzel-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Amatic SC',          label: 'Amatic SC',       file: 'Fonts/AmaticSC-Regular.ttf', lang: 'en', tags: ['retro'] },
    { name: 'Exo 2',              label: 'Exo 2',           file: 'Fonts/Exo2-Regular.ttf', lang: 'en', tags: ['retro'] },
];

var COLOR_PALETTES = {
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
    line2: [
        { hex: '#FFD700', label: 'Gold' },
        { hex: '#FFFFFF', label: 'White' },
        { hex: '#000000', label: 'Black' },
        { hex: '#ff9933', label: 'Orange' },
        { hex: '#7b2fff', label: 'Purple' },
        { hex: '#3A88FE', label: 'Blue' },
        { hex: '#FF6251', label: 'Red' },
        { hex: '#7ed957', label: 'Green' },
        { hex: '#ff61a6', label: 'Pink' },
    ]
};

var PRICE_TABLE = {
    small:  149,
    medium: 189,
    large:  210,
    xl:     300,
};

var WHATSAPP_NUMBER = '919876543210'; // WhatsApp number

// ===== STATE =====

var state = {
    name: 'Sample',
    colors: {
        base:    '#ff9933',
        font:    '#FFFFFF',
        outline: '#000000',
        line2:   '#FFD700',
    },
    selectedFont: null,
    selectedFontIndex: null,
    wordartTopIndex:    null,
    wordartBottomIndex: null,
    wordartActiveSlot:  'top',
    size: 'small',
    quantity: 1,
    lang: 'en',
    layers: '3L',
    productType: 'keychain',
    ringPosition: 'left',     // which side the ring attaches (kept 'left')
    ringAnchor: 'top',        // vertical placement: 'top' corner | 'center'
    fontCategory: 'all',
    
    // Wavy Nametag parameters
    wave_mode: "wave",
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
    showFDMTexture: false,
    _tilekeyColorsApplied: false,
    _linkedInitialsColorsApplied: false,
    _nametagColorsApplied: false,
    _loveseriesColorsApplied: false,
    _girlyColorsApplied: false,
    _borderedColorsApplied: false,
    _supportedColorsApplied: false,
    _flowerColorsApplied: false,
};

var WORDART_DEFAULT_TOP    = 'OleoScript';
var WORDART_DEFAULT_BOTTOM = 'BagelFatOne';

var LOVESERIES_TOP_FONT_ALLOWLIST = ['OleoScript', 'Brandy', 'Sunday Chillin'];
var LOVESERIES_DEFAULT_TOP = 'OleoScript';
var LOVESERIES_DEFAULT_COLORS = {
    base:    '#ff61a6',
    font:    '#FFFFFF',
    outline: '#000000',
    line2:   '#FFD700',
};

var TILEKEY_FONT_ALLOWLIST = ['BagelFatOne', 'Super Bubble', 'Rock Boys', 'CANAVAR'];
var TILEKEY_DEFAULT_FONT   = 'BagelFatOne';
var TILEKEY_MAX_CHARS      = 8;
var TILEKEY_DEFAULT_COLORS = {
    base:    '#3A88FE',
    font:    '#000000',
    outline: '#000000',
    line2:   '#FFFFFF',
};

var NAMETAG_FONT_ALLOWLIST = [
    'Chewy', 'Bebas Neue', 'Lobster', 'Pacifico', 'Raleway', 'Oswald', 'Anton',
    'Archivo Black', 'Impact', 'Playfair Display', 'Orbitron', 'Press Start 2P',
    'Creepster', 'Poppins', 'Monoton', 'Shadows Into Light', 'Fredoka One',
    'Cinzel', 'Amatic SC', 'Exo 2'
];
var NAMETAG_DEFAULT_FONT = 'Chewy';
var NAMETAG_DEFAULT_COLORS = {
    base:    '#F85DE9',
    font:    '#F85DE9',
    outline: '#F85DE9',
};

var GIRLY_DEFAULT_FONT = 'Sunday Chillin';
var GIRLY_DEFAULT_COLORS = {
    base:    '#ff61a6',
    font:    '#FFFFFF',
    outline: '#000000',
};

// ===== DOM REFERENCES =====

var $ = function(id) { return document.getElementById(id); };
var nameInput    = $('nameInput');
var langToggleBtn= $('langToggleBtn');
var layerToggle  = $('layerToggle');
var charCount    = $('charCount');
var fontGrid     = $('fontGrid');
var priceDisplay = $('priceDisplay');
var qtyDisplay   = $('qtyDisplay');
var qtyMinus     = $('qtyMinus');
var qtyPlus      = $('qtyPlus');
var whatsappBtn  = $('whatsappBtn');
var addToCartBtn = $('addToCartBtn');
var summaryText  = $('summaryText');
var selSummary   = $('selectionSummary');
var toast        = $('toast');

// ===== EVENT DISPATCHING (to 3D Viewer) =====

function isWordartLike() {
    return state.productType === 'wordart' || state.productType === 'loveseries';
}

function buildWordartFontsPayload() {
    if (!isWordartLike()) return null;
    var top    = (state.wordartTopIndex    != null) ? FONTS[state.wordartTopIndex]    : null;
    var bottom = (state.wordartBottomIndex != null) ? FONTS[state.wordartBottomIndex] : null;
    return {
        top:    top    ? top.file    : null,
        bottom: bottom ? bottom.file : null,
    };
}

function dispatch3DFontSelected() {
    if (isWordartLike()) {
        if (state.wordartTopIndex == null && state.wordartBottomIndex == null) return;
    } else if (!state.selectedFont) {
        return;
    }
    var primary = state.selectedFont || (state.wordartTopIndex != null ? FONTS[state.wordartTopIndex] : null);
    if (!primary) return;
    window.dispatchEvent(new CustomEvent('font-selected', {
        detail: {
            text:         state.name || 'Sample',
            fontFile:     primary.file,
            fontName:     primary.name,
            colors:       { base: state.colors.base, font: state.colors.font, outline: state.colors.outline, line2: state.colors.line2 },
            layers:       state.layers,
            productType:  state.productType,
            wordartFonts: buildWordartFontsPayload(),
            ringPosition: state.ringPosition,
            ringAnchor:   state.ringAnchor,
        }
    }));
}

function dispatch3DDesignUpdated() {
    if (isWordartLike()) {
        if (state.wordartTopIndex == null && state.wordartBottomIndex == null) return;
    } else if (!state.selectedFont) {
        return;
    }
    var primary = state.selectedFont || (state.wordartTopIndex != null ? FONTS[state.wordartTopIndex] : null);
    if (!primary) return;
    window.dispatchEvent(new CustomEvent('design-updated', {
        detail: {
            text:         state.name || 'Sample',
            fontFile:     primary.file,
            fontName:     primary.name,
            colors:       { base: state.colors.base, font: state.colors.font, outline: state.colors.outline, line2: state.colors.line2 },
            layers:       state.layers,
            productType:  state.productType,
            wordartFonts: buildWordartFontsPayload(),
            ringPosition: state.ringPosition,
            ringAnchor:   state.ringAnchor,

            // Pass Wavy Nametag parameters
            wave_mode:      state.wave_mode,
            wave_amplitude: state.wave_amplitude,
            wave_cycles:    state.wave_cycles,
            text_size:      state.text_size,
            letter_gap:     state.letter_gap,
            base_thickness: state.base_thickness,
            height_even:    state.height_even,
            height_odd:     state.height_odd,
            ring_outer_d:   state.ring_outer_d,
            ring_inner_d:   state.ring_inner_d,
            ring_height:    state.ring_height,
            showFDMTexture: state.showFDMTexture,
        }
    }));
}

// ===== SVG KEYCHAIN PREVIEW (flat 2D, optimized for row views) =====

var OUTLINE_SIZE = 1.6;

function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildTspans(text, opts) {
    var withMarker = !opts || opts.withMarker !== false;
    var dyRatio    = (opts && opts.dyRatio) || 1.1;
    var lines = text.split('\n');
    var twoLines = lines.length > 1 && lines[1] !== undefined;
    var firstDy = twoLines ? (-(dyRatio / 2) + 'em') : '0';
    var html = '';
    for (var i = 0; i < lines.length && i < 2; i++) {
        var content = (i === 0 && withMarker ? '°' : '') + escapeXml(lines[i] || ' ');
        var dy = (i === 0) ? firstDy : (dyRatio + 'em');
        var lineColor = (opts && opts.perLineColors && opts.perLineColors[i]) || null;
        var fillAttr = lineColor ? ' fill="' + lineColor + '"' : '';
        html += '<tspan x="50%" dy="' + dy + '"' + fillAttr + '>' + content + '</tspan>';
    }
    return html;
}

function createKeychainSVG(text, fontFamily, baseColor, fontColor, outlineColor, mode, line2Color, previewArgs) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Preview in ' + fontFamily + ' font');
    svg.setAttribute('viewBox', '0 0 350 100'); // Clean wider landscape ratio

    if (mode === 'tilekey') {
        var rawT  = (text || '').replace(/[\r\n]/g, '');
        var chars = rawT.toUpperCase().split('').slice(0, 8);
        if (chars.length === 0) chars = [' '];

        var TILE   = 32;
        var GAP    = 3;
        var PADX   = 8;
        var PADTOP = 25;
        var PADBOT = 10;
        var stripW = TILE + PADX * 2;
        var stripH = chars.length * TILE + (chars.length - 1) * GAP + PADTOP + PADBOT;

        var VB_W = 350, VB_H = 100;
        var MARGIN = 4;
        var fit    = Math.min((VB_W - MARGIN * 2) / stripW, (VB_H - MARGIN * 2) / stripH);
        var drawW  = stripW * fit;
        var drawH  = stripH * fit;
        
        // Center vertically, offset horizontally to the right side of the row card
        var offX   = (VB_W - drawW) / 2;
        var offY   = (VB_H - drawH) / 2;

        var stripColor  = baseColor;
        var tileColor   = line2Color || '#FFFFFF';
        var letterColor = fontColor;

        var html = '<g transform="translate(' + offX + ',' + offY + ') scale(' + fit + ')">';
        html += '<rect x="0" y="0" width="' + stripW + '" height="' + stripH + '" rx="8" ry="8" fill="' + stripColor + '"/>';
        html += '<circle cx="' + (stripW / 2) + '" cy="11" r="5" fill="rgba(255,255,255,0.95)"/>';
        for (var i = 0; i < chars.length; i++) {
            var tx = PADX;
            var ty = PADTOP + i * (TILE + GAP);
            html += '<rect x="' + tx + '" y="' + ty + '" width="' + TILE + '" height="' + TILE + '" rx="4" ry="4" fill="' + tileColor + '"/>';
            html += '<text x="' + (tx + TILE / 2) + '" y="' + (ty + TILE / 2) + '"' +
                    ' text-anchor="middle" dominant-baseline="central"' +
                    ' font-size="' + (TILE * 0.7) + '"' +
                    ' fill="' + letterColor + '"' +
                    ' font-family="' + fontFamily + '">' + escapeXml(chars[i]) + '</text>';
        }
        html += '</g>';
        svg.innerHTML = html;
        return svg;
    }

    var uid = fontFamily.replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 999999);
    var hasTwoLines = text.indexOf('\n') !== -1;
    var isWordart    = mode === 'wordart' || mode === 'loveseries';
    var fontSize = hasTwoLines ? (isWordart ? 28 : 24) : 32;

    if (isWordart) {
        var topFontName = (previewArgs && previewArgs.topFontName) || fontFamily;
        var botFontName = (previewArgs && previewArgs.bottomFontName) || fontFamily;

        var lines = text.split('\n');
        var topLine = lines[0] || ' ';
        var botLine = (lines[1] != null) ? lines[1] : '';

        var topSize = fontSize;
        var botSize = Math.round(fontSize * 1.15);

        var topY = '42%';
        var botY = '85%';
        var topFill = fontColor;
        var botFill = line2Color || fontColor;

        var isLoveSeries = mode === 'loveseries';
        var heartGlyph   = isLoveSeries ? '❤' : '';
        var heartColor   = '#FF1F4B';

        var halo = '';
        halo =
            '<text x="50%" y="' + topY + '" text-anchor="middle" alignment-baseline="alphabetic"' +
            ' font-size="' + topSize + '" fill="none"' +
            ' stroke="' + outlineColor + '" stroke-width="' + (OUTLINE_SIZE * 3.5) + '" stroke-linejoin="round"' +
            ' font-family="' + topFontName + '">' + escapeXml(topLine) + (heartGlyph ? '<tspan font-family="sans-serif">' + heartGlyph + '</tspan>' : '') + '</text>';
        if (botLine) {
            halo +=
                '<text x="50%" y="' + botY + '" text-anchor="middle" alignment-baseline="alphabetic"' +
                ' font-size="' + botSize + '" fill="none"' +
                ' stroke="' + outlineColor + '" stroke-width="' + (OUTLINE_SIZE * 3.5) + '" stroke-linejoin="round"' +
                ' font-family="' + botFontName + '">' + escapeXml(botLine) + '</text>';
        }

        var fills =
            '<text x="50%" y="' + topY + '" text-anchor="middle" alignment-baseline="alphabetic"' +
            ' font-size="' + topSize + '" fill="' + topFill + '"' +
            ' font-family="' + topFontName + '">' + escapeXml(topLine) + (heartGlyph ? '<tspan fill="' + heartColor + '" font-family="sans-serif">' + heartGlyph + '</tspan>' : '') + '</text>';
        if (botLine) {
            fills +=
                '<text x="50%" y="' + botY + '" text-anchor="middle" alignment-baseline="alphabetic"' +
                ' font-size="' + botSize + '" fill="' + botFill + '"' +
                ' font-family="' + botFontName + '">' + escapeXml(botLine) + '</text>';
        }

        svg.innerHTML = halo + fills;
        return svg;
    }

    var tspansKey = buildTspans(text, { withMarker: true, dyRatio: 1.1 });
    svg.innerHTML =
        '<defs>' +
            '<filter id="shadow_' + uid + '" x="-20%" y="-20%" width="140%" height="140%">' +
                '<feOffset result="offOut" in="SourceAlpha" dx="1.5" dy="1.5" />' +
                '<feGaussianBlur result="blurOut" in="offOut" stdDeviation="1.5" />' +
                '<feBlend in="SourceGraphic" in2="blurOut" mode="normal" />' +
            '</filter>' +
        '</defs>' +
        '<text x="50%" y="50%"' +
            ' text-anchor="middle" alignment-baseline="middle"' +
            ' font-size="' + fontSize + '" fill="none"' +
            ' stroke="' + baseColor + '" stroke-width="8" stroke-linejoin="round"' +
            ' font-family="' + fontFamily + '"' +
            ' filter="url(#shadow_' + uid + ')">' + tspansKey + '</text>' +
        '<text x="50%" y="50%"' +
            ' text-anchor="middle" alignment-baseline="middle"' +
            ' font-size="' + fontSize + '"' +
            ' fill="' + fontColor + '"' +
            ' stroke="' + outlineColor + '" stroke-width="' + OUTLINE_SIZE + '" stroke-linejoin="round"' +
            ' font-family="' + fontFamily + '"' +
            ' filter="url(#shadow_' + uid + ')">' + tspansKey + '</text>';

    return svg;
}

// ===== SWATCH BUILDER =====

function buildSwatches() {
    for (var type in COLOR_PALETTES) {
        (function(colorType) {
            var palette = COLOR_PALETTES[colorType];
            var container = $(colorType + 'Swatches');
            if (!container) return;
            container.innerHTML = ''; // Clear stubs
            palette.forEach(function(item) {
                var swatch = document.createElement('div');
                swatch.className = 'swatch' + (state.colors[colorType] === item.hex ? ' active' : '');
                swatch.style.backgroundColor = item.hex;
                swatch.title = item.label;
                if (item.hex === '#FFFFFF' || item.hex === '#fff') {
                    swatch.style.boxShadow = 'inset 0 0 0 1.5px rgba(200,200,200,0.6)';
                }
                swatch.addEventListener('click', function() {
                    state.colors[colorType] = item.hex;
                    container.querySelectorAll('.swatch').forEach(function(s) { s.classList.remove('active'); });
                    swatch.classList.add('active');
                    renderFontCards();
                    dispatch3DDesignUpdated();
                });
                container.appendChild(swatch);
            });
        })(type);
    }
}

// ===== SIZE SELECTOR & QUANTITY =====

function initSizeSelector() {
    var sizeSelector = $('sizeSelector');
    if (!sizeSelector) return;
    sizeSelector.querySelectorAll('.size-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            sizeSelector.querySelectorAll('.size-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.size = btn.dataset.size;
            updatePrice();
        });
    });
}

function initQuantity() {
    if (!qtyMinus || !qtyPlus) return;
    qtyMinus.addEventListener('click', function() {
        if (state.quantity > 1) {
            state.quantity--;
            qtyDisplay.textContent = state.quantity;
            updatePrice();
        }
    });
    qtyPlus.addEventListener('click', function() {
        if (state.quantity < 99) {
            state.quantity++;
            qtyDisplay.textContent = state.quantity;
            updatePrice();
        }
    });
}

function updatePrice() {
    var base  = PRICE_TABLE[state.size] || 149;
    var total = base * state.quantity;
    if (priceDisplay) priceDisplay.textContent = '₹' + total;
}

function detectSize(text) {
    var lines = (text || '').split('\n');
    var longest = 0;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].length > longest) longest = lines[i].length;
    }
    if (longest <= 6)  return 'small';
    if (longest <= 9)  return 'medium';
    if (longest <= 10) return 'large';
    return 'xl';
}

function syncSizeFromName(text) {
    var autoSize = detectSize(text);
    state.size = autoSize;
    var sizeSelector = $('sizeSelector');
    if (sizeSelector) {
        sizeSelector.querySelectorAll('.size-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.size === autoSize);
        });
    }
    updatePrice();
}

// ===== FONT GRID RENDERING =====

function renderFontCards() {
    var displayText = state.name || 'Sample';
    if (!fontGrid) return;
    fontGrid.innerHTML = '';

    var isWordart    = state.productType === 'wordart';
    var isLoveSeries = state.productType === 'loveseries';
    var isTileKey    = state.productType === 'tilekey';
    var isWordartLikeMode = isWordart || isLoveSeries;
    
    var highlightedIdx = isWordartLikeMode
        ? (state.wordartActiveSlot === 'bottom' ? state.wordartBottomIndex : state.wordartTopIndex)
        : state.selectedFontIndex;

    var filteredFonts = FONTS.filter(function(f) { return f.lang === state.lang; });
    
    if (isLoveSeries) {
        filteredFonts = filteredFonts.filter(function(f) {
            return LOVESERIES_TOP_FONT_ALLOWLIST.indexOf(f.name) >= 0;
        });
    }
    if (isTileKey) {
        filteredFonts = filteredFonts.filter(function(f) {
            return TILEKEY_FONT_ALLOWLIST.indexOf(f.name) >= 0;
        });
    }
    var isNametag = state.productType === 'nametag';
    if (isNametag) {
        filteredFonts = filteredFonts.filter(function(f) {
            return NAMETAG_FONT_ALLOWLIST.indexOf(f.name) >= 0;
        });
    }

    // Category tag filter (All, Bold/Pop, Cursive, Retro)
    if (state.fontCategory !== 'all') {
        filteredFonts = filteredFonts.filter(function(f) {
            return f.tags && f.tags.indexOf(state.fontCategory) >= 0;
        });
    }

    filteredFonts.forEach(function(font) {
        var idx = FONTS.indexOf(font);
        var card = document.createElement('div');
        card.className = 'font-card' + (highlightedIdx === idx ? ' selected' : '');
        card.dataset.index = idx;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', 'Select ' + font.label + ' font');
        card.setAttribute('aria-pressed', highlightedIdx === idx ? 'true' : 'false');

        var nameTag = document.createElement('div');
        nameTag.className = 'font-name-tag';
        nameTag.textContent = font.label;

        var previewArgs;
        var previewText = displayText;
        if (isWordartLikeMode) {
            var topFontName, botFontName;
            if (isLoveSeries) {
                topFontName = font.name;
                botFontName = WORDART_DEFAULT_BOTTOM;
                var topOnly = (displayText || '').split('\n')[0] || '';
                previewText = topOnly + '\nLOVE';
            } else if (state.wordartActiveSlot === 'top') {
                topFontName = font.name;
                botFontName = (state.wordartBottomIndex != null) ? FONTS[state.wordartBottomIndex].name : font.name;
            } else {
                topFontName = (state.wordartTopIndex != null) ? FONTS[state.wordartTopIndex].name : font.name;
                botFontName = font.name;
            }
            previewArgs = { topFontName: topFontName, bottomFontName: botFontName };
        }

        var svg = createKeychainSVG(
            previewText,
            font.name,
            state.colors.base,
            state.colors.font,
            state.colors.outline,
            state.productType,
            state.colors.line2,
            previewArgs
        );

        card.appendChild(nameTag);
        card.appendChild(svg);

        var selectCard = function() {
            if (isLoveSeries) {
                state.wordartTopIndex = idx;
                renderFontCards();
                updateSummary();
                dispatch3DFontSelected();
                return;
            }
            if (isWordart) {
                if (state.wordartActiveSlot === 'bottom') {
                    state.wordartBottomIndex = idx;
                } else {
                    state.wordartTopIndex = idx;
                }
                updateWordartSlotLabels();
                renderFontCards();
                updateSummary();
                dispatch3DFontSelected();
                return;
            }
            state.selectedFont = font;
            state.selectedFontIndex = idx;
            fontGrid.querySelectorAll('.font-card').forEach(function(c) {
                c.classList.remove('selected');
                c.setAttribute('aria-pressed', 'false');
            });
            card.classList.add('selected');
            card.setAttribute('aria-pressed', 'true');
            updateSummary();
            dispatch3DFontSelected();
        };

        card.addEventListener('click', selectCard);
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(); }
        });

        fontGrid.appendChild(card);
    });
}

// ===== SUMMARY BAR & TOAST =====

function updateSummary() {
    if (!selSummary || !summaryText) return;
    if (isWordartLike()) {
        var topName = (state.wordartTopIndex != null) ? FONTS[state.wordartTopIndex].label : '—';
        var botName = (state.wordartBottomIndex != null) ? FONTS[state.wordartBottomIndex].label : '—';
        selSummary.classList.add('has-selection');
        summaryText.innerHTML = '✅ Font 1: <strong>' + topName + '</strong> · Font 2: <strong>' + botName + '</strong>';
    } else if (state.selectedFont) {
        selSummary.classList.add('has-selection');
        summaryText.innerHTML = '✅ Selected: <strong>' + state.selectedFont.label + '</strong> — looks great!';
    } else {
        selSummary.classList.remove('has-selection');
        summaryText.textContent = 'Choose a font from the style list';
    }
}

var toastTimer;
function showToast(msg, emoji) {
    if (!toast) return;
    emoji = emoji || '🎉';
    toast.textContent = emoji + ' ' + msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ===== ORDER WHATSAPP MESSAGE =====

function buildWhatsAppMessage() {
    var fontName = 'Not selected';
    if (isWordartLike()) {
        var topName = (state.wordartTopIndex != null) ? FONTS[state.wordartTopIndex].label : 'None';
        var botName = (state.wordartBottomIndex != null) ? FONTS[state.wordartBottomIndex].label : 'None';
        fontName = topName + ' + ' + botName;
    } else if (state.selectedFont) {
        fontName = state.selectedFont.label;
    }
    
    var total    = (PRICE_TABLE[state.size] || 149) * state.quantity;
    var sizeCap  = state.size.charAt(0).toUpperCase() + state.size.slice(1);
    
    var isTile = state.productType === 'tilekey';
    var isLinked = state.productType === 'linked_initials';
    var isNametag = state.productType === 'nametag';
    
    var productLabel = 'Keychain';
    if (state.productType === 'nameplate') productLabel = 'Nameplate';
    else if (state.productType === 'wordart') productLabel = 'Word Art Decor';
    else if (state.productType === 'loveseries') productLabel = 'LOVE Series';
    else if (isTile) productLabel = 'Letter Tiles';
    else if (isLinked) productLabel = 'Linked Initials';
    else if (isNametag) productLabel = 'Wavy Nametag';
    
    var baseColorLabel = isTile ? 'Strip Color' : (isNametag ? 'Tag Color' : 'Base Color');
    var fontColorLabel = isTile ? 'Letter Color' : (isLinked ? 'Left Letter Color' : 'Font Color');
    var outlineColorLabel = 'Outline Color';
    
    var lines = [
        '🎁 *YoursGifts — 3D ' + productLabel + ' Order*',
        '',
        '📝 Name/Text: *' + (state.name || 'N/A') + '*',
        '🎨 ' + baseColorLabel + ': ' + state.colors.base
    ];
    if (!isNametag) {
        lines.push('✍️ ' + fontColorLabel + ': ' + state.colors.font);
    }
    
    if (isTile) {
        lines.push('🎴 Tile Color: ' + state.colors.line2);
    } else if (isLinked) {
        lines.push('💞 Right Letter Color: ' + state.colors.line2);
        if (state.layers === '3L') {
            lines.push('🖊️ ' + outlineColorLabel + ': ' + state.colors.outline);
        }
    } else if (isNametag) {
        // No extra color rows
    } else {
        if (state.layers === '3L') {
            lines.push('🖊️ ' + outlineColorLabel + ': ' + state.colors.outline);
        }
        if (isWordartLike()) {
            lines.push('✍️ Line 2 Color: ' + state.colors.line2);
        }
    }
    
    // Add ring position to orders
    if (state.productType === 'keychain' || isTile || isLinked || isNametag) {
        lines.push('⭕ Ring Position: ' + (state.ringAnchor === 'center' ? 'CENTERED' : 'TOP CORNER'));
    }

    lines.push(
        '🔤 Font Style: *' + fontName + '*',
        '📐 Size: ' + sizeCap,
        '🔢 Quantity: ' + state.quantity,
        '💰 Total: ₹' + total,
        '',
        'Small Gifts, Big Meanings 💜'
    );
    return encodeURIComponent(lines.join('\n'));
}

// ===== CONTROLS UI SYNC =====

var _debounceTimer;
function debounce3DUpdate() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function() {
        dispatch3DDesignUpdated();
    }, 350);
}

var _transliterateTimer;

function clampMultiline(raw) {
    var isTile = state.productType === 'tilekey';
    var isLoveSeries = state.productType === 'loveseries';
    var isLinkedInitials = state.productType === 'linked_initials';
    var maxLines = (isTile || isLoveSeries || isLinkedInitials) ? 1 : 2;
    var perLineMax = isTile ? TILEKEY_MAX_CHARS : (isLinkedInitials ? 2 : 15);
    var lines = raw.split('\n').slice(0, maxLines);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].length > perLineMax) lines[i] = lines[i].slice(0, perLineMax);
    }
    var out = lines.join('\n');
    if (isTile || isLinkedInitials) out = out.toUpperCase();
    return out;
}

function longestLineLen(text) {
    var lines = (text || '').split('\n');
    var n = 0;
    for (var i = 0; i < lines.length; i++) if (lines[i].length > n) n = lines[i].length;
    return n;
}

// Input synchronizers
function handleSingleInput() {
    var clamped = clampMultiline(nameInput.value);
    if (clamped !== nameInput.value) {
        var pos = nameInput.selectionStart;
        nameInput.value = clamped;
        nameInput.setSelectionRange(Math.min(pos, clamped.length), Math.min(pos, clamped.length));
    }
    state.name = nameInput.value;
    charCount.textContent = longestLineLen(state.name);
    syncSizeFromName(state.name);
    renderFontCards();
    debounce3DUpdate();

    // Tamil transliteration
    clearTimeout(_transliterateTimer);
    if (state.lang !== 'ta') return;
    var currentText = nameInput.value;
    if (currentText.trim() === '') return;
    
    _transliterateTimer = setTimeout(async function() {
        try {
            var words = currentText.split(/(\s+)/);
            var translated = [];
            for (var i = 0; i < words.length; i++) {
                var word = words[i];
                if (!word.trim() || /[\u0B80-\u0BFF]/.test(word)) {
                    translated.push(word);
                    continue;
                }
                var res = await fetch('https://inputtools.google.com/request?text=' + encodeURIComponent(word) + '&itc=ta-t-i0-und&num=1');
                var data = await res.json();
                if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
                    translated.push(data[1][0][1][0]);
                } else {
                    translated.push(word);
                }
            }
            var newText = translated.join('');
            if (newText !== currentText && nameInput.value === currentText) {
                var cursor = nameInput.selectionStart;
                var lenDiff = newText.length - currentText.length;
                nameInput.value = newText;
                var newCursor = Math.max(0, cursor + lenDiff);
                nameInput.setSelectionRange(newCursor, newCursor);
                
                state.name = newText;
                charCount.textContent = longestLineLen(state.name);
                syncSizeFromName(state.name);
                renderFontCards();
                debounce3DUpdate();
            }
        } catch(e) {
            console.error('Transliteration error', e);
        }
    }, 450);
}

function handleWordartInput() {
    var l1 = $('wordartLine1').value.slice(0, 15);
    var l2 = $('wordartLine2').value.slice(0, 15);
    
    if ($('wordartLine1').value !== l1) $('wordartLine1').value = l1;
    if ($('wordartLine2').value !== l2) $('wordartLine2').value = l2;
    
    $('charCount1').textContent = l1.length;
    $('charCount2').textContent = l2.length;
    
    state.name = l1 + '\n' + l2;
    syncSizeFromName(state.name);
    renderFontCards();
    debounce3DUpdate();
    
    // Tamil transliteration
    if (state.lang === 'ta') {
        var activeEl = document.activeElement;
        if (activeEl === $('wordartLine1') || activeEl === $('wordartLine2')) {
            clearTimeout(_transliterateTimer);
            var currentVal = activeEl.value;
            _transliterateTimer = setTimeout(async function() {
                try {
                    var words = currentVal.split(/(\s+)/);
                    var translated = [];
                    for (var i = 0; i < words.length; i++) {
                        var word = words[i];
                        if (!word.trim() || /[\u0B80-\u0BFF]/.test(word)) {
                            translated.push(word);
                            continue;
                        }
                        var res = await fetch('https://inputtools.google.com/request?text=' + encodeURIComponent(word) + '&itc=ta-t-i0-und&num=1');
                        var data = await res.json();
                        if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
                            translated.push(data[1][0][1][0]);
                        } else {
                            translated.push(word);
                        }
                    }
                    var newText = translated.join('');
                    if (newText !== currentVal && activeEl.value === currentVal) {
                        var cursor = activeEl.selectionStart;
                        var lenDiff = newText.length - currentVal.length;
                        activeEl.value = newText;
                        var newCursor = Math.max(0, cursor + lenDiff);
                        activeEl.setSelectionRange(newCursor, newCursor);
                        
                        var line1Val = $('wordartLine1').value;
                        var line2Val = $('wordartLine2').value;
                        state.name = line1Val + '\n' + line2Val;
                        $('charCount1').textContent = line1Val.length;
                        $('charCount2').textContent = line2Val.length;
                        syncSizeFromName(state.name);
                        renderFontCards();
                        debounce3DUpdate();
                    }
                } catch(e) {
                    console.error('Transliteration error', e);
                }
            }, 450);
        }
    }
}

function applyProductTypeUI() {
    var isWordart    = state.productType === 'wordart';
    var isLoveSeries = state.productType === 'loveseries';
    var isTileKey    = state.productType === 'tilekey';
    var isLinkedInitials = state.productType === 'linked_initials';
    var isNametag    = state.productType === 'nametag';
    var isGirly      = state.productType === 'girly_keychain';
    var isBordered   = state.productType === 'bordered_keychain';
    var isSupported  = state.productType === 'supported_text';
    var isFlower     = state.productType === 'flower_keychain';
    var isWordartLike = isWordart || isLoveSeries;

    var line2Row    = $('line2ColorRow');
    var baseRow     = $('baseColorRow');
    var hint        = $('wordartHint');
    var fontLabel   = $('fontColorLabel');
    var line2Label  = document.querySelector('#line2ColorRow .swatch-group-label');
    var baseLabel   = document.querySelector('#baseColorRow .swatch-group-label');
    var slotTabs    = $('wordartSlotTabs');
    var previewSub  = $('previewSub');
    var nameLabelText = $('nameLabelText');
    var nameLabelDesc = $('nameLabelDesc');

    var singleInput = $('singleInputContainer');
    var dualInputs  = $('dualInputsContainer');

    // Toggle inputs
    if (isWordart) {
        if (singleInput) singleInput.style.display = 'none';
        if (dualInputs) {
            dualInputs.style.display = 'flex';
            var lines = (state.name || '').split('\n');
            $('wordartLine1').value = lines[0] || '';
            $('wordartLine2').value = lines[1] || '';
            $('charCount1').textContent = ($('wordartLine1').value).length;
            $('charCount2').textContent = ($('wordartLine2').value).length;
        }
    } else {
        if (singleInput) {
            singleInput.style.display = '';
            var lines = (state.name || '').split('\n');
            var joinedName = lines.join(' ').trim();
            if (state.productType === 'linked_initials') {
                joinedName = joinedName.slice(0, 2).toUpperCase();
            } else if (state.productType === 'tilekey') {
                joinedName = joinedName.slice(0, TILEKEY_MAX_CHARS).toUpperCase();
            } else if (state.productType === 'loveseries') {
                joinedName = lines[0] || '';
            } else if (isNametag || isGirly || isSupported) {
                joinedName = joinedName.slice(0, 15);
            } else if (isFlower) {
                joinedName = joinedName.slice(0, 1).toUpperCase();
            }
            if (nameInput) nameInput.value = joinedName;
            state.name = joinedName;
            charCount.textContent = longestLineLen(state.name);
            syncSizeFromName(state.name);
        }
        if (dualInputs) dualInputs.style.display = 'none';
    }

    // Toggle Ring Position
    var ringPosSec = $('ringPositionSection');
    if (ringPosSec) {
        var hasRing = state.productType === 'keychain' || state.productType === 'tilekey' || state.productType === 'linked_initials' || state.productType === 'nametag' || isBordered || isFlower;
        ringPosSec.style.display = hasRing ? '' : 'none';
    }

    // Color rows display
    var outlineRow = $('outlineColorRow');
    if (isTileKey) {
        if (line2Row)   line2Row.style.display   = '';
        if (baseRow)    baseRow.style.display    = '';
        if (outlineRow) outlineRow.style.display = 'none';
    } else if (isLinkedInitials) {
        if (line2Row)   line2Row.style.display   = '';
        if (baseRow)    baseRow.style.display    = 'none';
        if (outlineRow) outlineRow.style.display = 'none';
    } else if (isNametag || isGirly || isBordered || isFlower) {
        if (line2Row)   line2Row.style.display   = 'none';
        if (baseRow)    baseRow.style.display    = '';
        if (outlineRow) outlineRow.style.display = 'none';
    } else if (isSupported) {
        if (line2Row)   line2Row.style.display   = 'none';
        if (baseRow)    baseRow.style.display    = 'none';
        if (outlineRow) outlineRow.style.display = 'none';
    } else {
        if (line2Row)   line2Row.style.display   = isWordartLike ? '' : 'none';
        if (baseRow)    baseRow.style.display    = isWordartLike ? 'none' : '';
        if (outlineRow) outlineRow.style.display = (state.layers === '2L') ? 'none' : '';
    }

    var nametagSection = $('wavyNametagAdjustmentsSection');
    if (nametagSection) {
        nametagSection.style.display = isNametag ? '' : 'none';
    }

    if (layerToggle) layerToggle.style.display = (isLinkedInitials || isNametag || isGirly || isBordered || isSupported || isFlower) ? 'none' : '';
    if (hint)     hint.style.display     = isWordart ? '' : 'none';
    if (slotTabs) slotTabs.style.display = isWordart ? '' : 'none';

    // Descriptions & labels
    if (previewSub) {
        if (isTileKey)         previewSub.textContent = 'Each letter gets its own tile. Pick a bold pop font.';
        else if (isWordart)    previewSub.textContent = 'Pick a line tab below, then select a font.';
        else if (isLoveSeries) previewSub.textContent = 'Pick a font for the top name. Bottom reads ❤ LOVE.';
        else if (isLinkedInitials) previewSub.textContent = 'Type 2 letters. Left & right initials will merge.';
        else if (isNametag)    previewSub.textContent = 'Pick a fun font for your wavy nametag.';
        else if (isGirly)      previewSub.textContent = 'Custom keychain with an offset keyring tab and a 3D decorative bow.';
        else if (isBordered)   previewSub.textContent = 'Double line keychain with raised or engraved text and customized border.';
        else if (isSupported)  previewSub.textContent = 'Custom nameplate supported by heart or star bridges.';
        else if (isFlower)     previewSub.textContent = 'Flower initial keychain with a custom radial petal pattern.';
        else                   previewSub.textContent = 'Pick a font style to preview your text';
    }

    if (nameLabelText) {
        if (isTileKey)         nameLabelText.textContent = 'Your Name';
        else if (isLoveSeries) nameLabelText.textContent = 'Custom Name';
        else if (isLinkedInitials) nameLabelText.textContent = 'Enter Initials';
        else if (isNametag)    nameLabelText.textContent = 'Nametag Text';
        else if (isGirly)      nameLabelText.textContent = 'Your Name';
        else if (isBordered)   nameLabelText.textContent = 'Keychain Text';
        else if (isSupported)  nameLabelText.textContent = 'Nameplate Text';
        else if (isFlower)     nameLabelText.textContent = 'Initial Letter';
        else                   nameLabelText.textContent = 'Custom Name / Text';
    }
    if (nameLabelDesc) {
        if (isTileKey)         nameLabelDesc.textContent = 'Auto uppercase (maximum ' + TILEKEY_MAX_CHARS + ' letters)';
        else if (isLoveSeries) nameLabelDesc.textContent = '❤ LOVE series bottom text is locked';
        else if (isLinkedInitials) nameLabelDesc.textContent = 'Exactly 2 letters (will overlap)';
        else if (isNametag)    nameLabelDesc.textContent = 'Enter text to be generated in a sinusoidal wave (max 15)';
        else if (isGirly)      nameLabelDesc.textContent = 'Enter name to print (maximum 15 characters)';
        else if (isBordered)   nameLabelDesc.textContent = 'Enter 1 or 2 lines of text (maximum 31 characters)';
        else if (isSupported)  nameLabelDesc.textContent = 'Enter name to print (maximum 15 characters)';
        else if (isFlower)     nameLabelDesc.textContent = 'Enter a single uppercase initial (maximum 1 character)';
        else                   nameLabelDesc.textContent = 'Pick name/text to print on your item';
    }

    if (fontLabel) {
        if (isTileKey)         fontLabel.textContent = 'Letter';
        else if (isLoveSeries) fontLabel.textContent = 'Your Name';
        else if (isWordart)    fontLabel.textContent = 'Line 1';
        else if (isLinkedInitials) fontLabel.textContent = 'Left Init.';
        else                   fontLabel.textContent = 'Text';
    }
    if (line2Label) {
        if (isTileKey)         line2Label.textContent = 'Tile';
        else if (isLoveSeries) line2Label.textContent = 'LOVE';
        else if (isLinkedInitials) line2Label.textContent = 'Right Init.';
        else                   line2Label.textContent = 'Line 2';
    }
    if (baseLabel) {
        baseLabel.textContent = isTileKey ? 'Strip' : (isNametag ? 'Tag Color' : (isGirly ? 'Base & Bow' : 'Base'));
    }

    if (nameInput) {
        var rows = (isLoveSeries || isTileKey || isLinkedInitials || isNametag || isGirly || isSupported || isFlower) ? '1' : '2';
        var max = isTileKey ? String(TILEKEY_MAX_CHARS) : (isLinkedInitials ? '2' : (isFlower ? '1' : (isLoveSeries || isNametag || isGirly || isSupported ? '15' : '31')));
        nameInput.setAttribute('rows', rows);
        nameInput.setAttribute('maxlength', max);
        if (isTileKey)         nameInput.setAttribute('placeholder', 'e.g. ALEXA…');
        else if (isLoveSeries) nameInput.setAttribute('placeholder', 'e.g. Priya…');
        else if (isLinkedInitials) nameInput.setAttribute('placeholder', 'e.g. SP…');
        else if (isNametag)    nameInput.setAttribute('placeholder', 'e.g. PRIYA…');
        else if (isFlower)     nameInput.setAttribute('placeholder', 'e.g. S…');
        else if (isSupported)  nameInput.setAttribute('placeholder', 'e.g. SAKTHI…');
        else                   nameInput.setAttribute('placeholder', 'e.g. Priya, SAKTHI…');
    }

    if (isWordart)    { ensureWordartDefaults();    updateWordartSlotLabels(); }
    if (isLoveSeries) { ensureLoveSeriesDefaults(); }
    if (isTileKey)    { ensureTileKeyDefaults();    }
    if (isLinkedInitials) { ensureLinkedInitialsDefaults(); }
    if (isNametag)    { ensureNametagDefaults();    }
    if (state.productType === 'girly_keychain') { ensureGirlyDefaults(); }
    if (isBordered)   { ensureBorderedDefaults(); }
    if (isSupported)  { ensureSupportedDefaults(); }
    if (isFlower)     { ensureFlowerDefaults(); }
}

function ensureGirlyDefaults() {
    var idx = FONTS.findIndex(function(f) { return f.name === GIRLY_DEFAULT_FONT; });
    if (idx < 0) idx = 0;
    state.selectedFontIndex = idx;
    state.selectedFont      = FONTS[idx];

    if (!state._girlyColorsApplied) {
        state.colors.base    = GIRLY_DEFAULT_COLORS.base;
        state.colors.font    = GIRLY_DEFAULT_COLORS.font;
        state.colors.outline = GIRLY_DEFAULT_COLORS.outline;
        state._girlyColorsApplied = true;
        buildSwatches();
    }
}

function ensureBorderedDefaults() {
    if (!state._borderedColorsApplied) {
        state.colors.base    = '#000000';
        state.colors.font    = '#7ed957';
        state.colors.outline = '#000000';
        state._borderedColorsApplied = true;
        buildSwatches();
    }
}

function ensureSupportedDefaults() {
    if (!state._supportedColorsApplied) {
        state.colors.base    = '#ff9933';
        state.colors.font    = '#FFFFFF';
        state.colors.outline = '#000000';
        state._supportedColorsApplied = true;
        buildSwatches();
    }
}

function ensureFlowerDefaults() {
    var idx = FONTS.findIndex(function(f) { return f.name === 'Fredoka One' || f.name === 'Brandy'; });
    if (idx < 0) idx = 0;
    state.selectedFontIndex = idx;
    state.selectedFont      = FONTS[idx];

    if (!state._flowerColorsApplied) {
        state.colors.base    = '#ff61a6';
        state.colors.font    = '#FFFFFF';
        state.colors.outline = '#000000';
        state._flowerColorsApplied = true;
        buildSwatches();
    }
}


function ensureTileKeyDefaults() {
    var selectedAllowed = state.selectedFontIndex != null && TILEKEY_FONT_ALLOWLIST.indexOf(FONTS[state.selectedFontIndex].name) >= 0;
    if (!selectedAllowed) {
        var idx = FONTS.findIndex(function(f) { return f.name === TILEKEY_DEFAULT_FONT; });
        if (idx < 0) idx = 0;
        state.selectedFontIndex = idx;
        state.selectedFont      = FONTS[idx];
    }
    if (!state._tilekeyColorsApplied) {
        state.colors.base    = TILEKEY_DEFAULT_COLORS.base;
        state.colors.font    = TILEKEY_DEFAULT_COLORS.font;
        state.colors.outline = TILEKEY_DEFAULT_COLORS.outline;
        state.colors.line2   = TILEKEY_DEFAULT_COLORS.line2;
        state._tilekeyColorsApplied = true;
        buildSwatches();
    }
}

function ensureLinkedInitialsDefaults() {
    var idx = FONTS.findIndex(function(f) { return f.name === 'BagelFatOne'; });
    if (idx < 0) idx = 0;
    if (state.selectedFontIndex == null) {
        state.selectedFontIndex = idx;
        state.selectedFont      = FONTS[idx];
    }
    if (!state._linkedInitialsColorsApplied) {
        state.colors.base    = '#ff9933';
        state.colors.font    = '#FFFFFF';
        state.colors.outline = '#000000';
        state.colors.line2   = '#7b2fff';
        state._linkedInitialsColorsApplied = true;
        buildSwatches();
    }
}

function ensureNametagDefaults() {
    var selectedAllowed = state.selectedFontIndex != null && NAMETAG_FONT_ALLOWLIST.indexOf(FONTS[state.selectedFontIndex].name) >= 0;
    if (!selectedAllowed) {
        var idx = FONTS.findIndex(function(f) { return f.name === NAMETAG_DEFAULT_FONT; });
        if (idx < 0) idx = 0;
        state.selectedFontIndex = idx;
        state.selectedFont      = FONTS[idx];
    }
    if (!state._nametagColorsApplied) {
        state.colors.base    = NAMETAG_DEFAULT_COLORS.base;
        state.colors.font    = NAMETAG_DEFAULT_COLORS.font;
        state.colors.outline = NAMETAG_DEFAULT_COLORS.outline;
        
        // Reset wave defaults in state
        state.wave_mode = "wave";
        state.wave_amplitude = 5.0;
        state.wave_cycles = 1.0;
        state.height_even = 4.0;
        state.height_odd = 2.0;
        state.letter_gap = -2.5;
        state.base_thickness = 2.5;
        state.text_size = 22;

        // Reset sliders in DOM
        var paramsMap = [
            { id: 'nametagWaveAmplitude', stateKey: 'wave_amplitude', suffix: 'mm' },
            { id: 'nametagWaveCycles',    stateKey: 'wave_cycles',    suffix: '' },
            { id: 'nametagHeightEven',    stateKey: 'height_even',    suffix: 'mm' },
            { id: 'nametagHeightOdd',     stateKey: 'height_odd',     suffix: 'mm' },
            { id: 'nametagLetterGap',     stateKey: 'letter_gap',     suffix: 'mm' },
            { id: 'nametagBaseThickness', stateKey: 'base_thickness', suffix: 'mm' },
            { id: 'nametagTextSize',      stateKey: 'text_size',      suffix: 'mm' }
        ];
        paramsMap.forEach(function(item) {
            var slider = $(item.id);
            var valDisplay = $(item.id + 'Val');
            if (slider) {
                slider.value = state[item.stateKey];
                if (valDisplay) {
                    valDisplay.textContent = state[item.stateKey] + item.suffix;
                }
            }
        });

        state._nametagColorsApplied = true;
        buildSwatches();
    }
}

function ensureLoveSeriesDefaults() {
    var botIdx = FONTS.findIndex(function(f) { return f.name === WORDART_DEFAULT_BOTTOM; });
    state.wordartBottomIndex = botIdx >= 0 ? botIdx : 0;
    var topIsAllowed = state.wordartTopIndex != null && LOVESERIES_TOP_FONT_ALLOWLIST.indexOf(FONTS[state.wordartTopIndex].name) >= 0;
    if (!topIsAllowed) {
        var topIdx = FONTS.findIndex(function(f) { return f.name === LOVESERIES_DEFAULT_TOP; });
        state.wordartTopIndex = topIdx >= 0 ? topIdx : 0;
    }
    state.wordartActiveSlot = 'top';
    if (!state._loveseriesColorsApplied) {
        state.colors.base    = LOVESERIES_DEFAULT_COLORS.base;
        state.colors.font    = LOVESERIES_DEFAULT_COLORS.font;
        state.colors.outline = LOVESERIES_DEFAULT_COLORS.outline;
        state.colors.line2   = LOVESERIES_DEFAULT_COLORS.line2;
        state._loveseriesColorsApplied = true;
        buildSwatches();
    }
}

function ensureWordartDefaults() {
    if (state.wordartTopIndex == null) {
        var topIdx = FONTS.findIndex(function(f) { return f.name === WORDART_DEFAULT_TOP; });
        state.wordartTopIndex = topIdx >= 0 ? topIdx : 0;
    }
    if (state.wordartBottomIndex == null) {
        var botIdx = FONTS.findIndex(function(f) { return f.name === WORDART_DEFAULT_BOTTOM; });
        state.wordartBottomIndex = botIdx >= 0 ? botIdx : state.wordartTopIndex;
    }
}

function updateWordartSlotLabels() {
    var topName = (state.wordartTopIndex    != null) ? FONTS[state.wordartTopIndex].label    : '—';
    var botName = (state.wordartBottomIndex != null) ? FONTS[state.wordartBottomIndex].label : '—';
    if ($('slotTopName')) $('slotTopName').textContent = topName;
    if ($('slotBottomName')) $('slotBottomName').textContent = botName;
}

// ===== UI BINDINGS =====

function initProductType() {
    if (!productTypeToggle) return;
    productTypeToggle.querySelectorAll('.ptype-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (btn.classList.contains('active')) return;
            productTypeToggle.querySelectorAll('.ptype-opt').forEach(function(b) {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            state.productType = btn.dataset.val;
            
            // Reset style default application flags
            state._tilekeyColorsApplied = false;
            state._linkedInitialsColorsApplied = false;
            state._nametagColorsApplied = false;
            state._loveseriesColorsApplied = false;
            state._girlyColorsApplied = false;
            state._borderedColorsApplied = false;
            state._supportedColorsApplied = false;
            state._flowerColorsApplied = false;
            
            // Sync text inputs
            if (nameInput) {
                nameInput.value = clampMultiline(nameInput.value);
                state.name = nameInput.value;
                charCount.textContent = longestLineLen(state.name);
            }
            
            applyProductTypeUI();
            renderFontCards();
            dispatch3DDesignUpdated();
        });
    });
}

function initRingPosition() {
    var toggle = $('ringPositionToggle');
    if (!toggle) return;
    toggle.querySelectorAll('.ring-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
            toggle.querySelectorAll('.ring-opt').forEach(function(b) {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            state.ringAnchor = btn.dataset.val;   // 'top' | 'center'
            dispatch3DDesignUpdated();
        });
    });
}

function initFontCategoryTabs() {
    var tabs = $('fontCategoryTabs');
    if (!tabs) return;
    tabs.querySelectorAll('.font-cat-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.querySelectorAll('.font-cat-tab').forEach(function(t) {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            state.fontCategory = tab.dataset.cat;
            renderFontCards();
        });
    });
}

function initWordartSlotTabs() {
    var tabs = $('wordartSlotTabs');
    if (!tabs) return;
    tabs.querySelectorAll('.slot-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.querySelectorAll('.slot-tab').forEach(function(t) {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            state.wordartActiveSlot = tab.dataset.slot;
        });
    });
}
var _debouncedDispatchTimer = null;
function debouncedDispatch3D() {
    clearTimeout(_debouncedDispatchTimer);
    _debouncedDispatchTimer = setTimeout(function() {
        dispatch3DDesignUpdated();
    }, 100);
}

function initNametagSliders() {
    var paramsMap = [
        { id: 'nametagWaveAmplitude', stateKey: 'wave_amplitude', suffix: 'mm' },
        { id: 'nametagWaveCycles',    stateKey: 'wave_cycles',    suffix: '' },
        { id: 'nametagHeightEven',    stateKey: 'height_even',    suffix: 'mm' },
        { id: 'nametagHeightOdd',     stateKey: 'height_odd',     suffix: 'mm' },
        { id: 'nametagLetterGap',     stateKey: 'letter_gap',     suffix: 'mm' },
        { id: 'nametagBaseThickness', stateKey: 'base_thickness', suffix: 'mm' },
        { id: 'nametagTextSize',      stateKey: 'text_size',      suffix: 'mm' }
    ];

    paramsMap.forEach(function(item) {
        var slider = $(item.id);
        var valDisplay = $(item.id + 'Val');
        if (slider) {
            slider.value = state[item.stateKey];
            if (valDisplay) {
                valDisplay.textContent = state[item.stateKey] + item.suffix;
            }

            slider.addEventListener('input', function() {
                var val = parseFloat(slider.value);
                state[item.stateKey] = val;
                if (valDisplay) {
                    valDisplay.textContent = val + item.suffix;
                }
                debouncedDispatch3D();
            });
        }
    });
}

// ===== INITIALIZE =====

function init() {
    // Select default fonts
    var defaultIdx = FONTS.findIndex(function(f) { return f.name === 'Brandy'; });
    if (defaultIdx < 0) defaultIdx = 0;
    state.selectedFont = FONTS[defaultIdx];
    state.selectedFontIndex = defaultIdx;

    buildSwatches();
    initSizeSelector();
    initQuantity();
    initProductType();
    initRingPosition();
    initFontCategoryTabs();
    initWordartSlotTabs();
    initNametagSliders();
    
    // Wire up inputs
    if (nameInput) nameInput.addEventListener('input', handleSingleInput);
    if ($('wordartLine1')) $('wordartLine1').addEventListener('input', handleWordartInput);
    if ($('wordartLine2')) $('wordartLine2').addEventListener('input', handleWordartInput);

    var toggleFDM = $('toggleFDM');
    if (toggleFDM) {
        toggleFDM.addEventListener('click', function() {
            state.showFDMTexture = !state.showFDMTexture;
            toggleFDM.classList.toggle('active', state.showFDMTexture);
            toggleFDM.innerHTML = state.showFDMTexture ? '✨ Show CAD Render' : '🖨️ Show Print Finish';
            dispatch3DDesignUpdated();
        });
    }
    
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', function() {
            state.lang = (state.lang === 'en') ? 'ta' : 'en';
            langToggleBtn.textContent = (state.lang === 'en') ? 'EN' : 'TA';
            langToggleBtn.classList.toggle('ta', state.lang === 'ta');
            
            var filtered = FONTS.filter(function(f) { return f.lang === state.lang; });
            if (filtered.length > 0) {
                state.selectedFont = filtered[0];
                state.selectedFontIndex = FONTS.indexOf(filtered[0]);
            }
            
            renderFontCards();
            updateSummary();
            dispatch3DFontSelected();
        });
    }

    if (layerToggle) {
        layerToggle.addEventListener('click', function() {
            state.layers = (state.layers === '3L') ? '2L' : '3L';
            layerToggle.querySelectorAll('.layer-opt').forEach(function(opt) {
                opt.classList.toggle('active', opt.dataset.val === state.layers);
            });
            var outlineRow = $('outlineColorRow');
            if (outlineRow) {
                var hideForProduct = state.productType === 'tilekey' || state.productType === 'linked_initials';
                outlineRow.style.display = (hideForProduct || state.layers === '2L') ? 'none' : '';
            }
            renderFontCards();
            dispatch3DDesignUpdated();
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            var primary = state.selectedFont || (state.wordartTopIndex != null ? FONTS[state.wordartTopIndex] : null);
            if (!primary) { showToast('Please select a font style first!', '⚠️'); return; }
            var msg = buildWhatsAppMessage();
            window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg, '_blank');
        });
    }

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            var primary = state.selectedFont || (state.wordartTopIndex != null ? FONTS[state.wordartTopIndex] : null);
            if (!primary) { showToast('Please select a font style first!', '⚠️'); return; }
            if (!state.name) { showToast('Please enter a name first!', '⚠️'); return; }
            showToast('"' + state.name.replace('\n', ' ') + '" added to cart!', '🛒');
        });
    }

    applyProductTypeUI();
    renderFontCards();
    updateSummary();
    
    // Rebuild initial 3D scene
    setTimeout(function() {
        dispatch3DFontSelected();
    }, 400);
}

document.addEventListener('DOMContentLoaded', init);
