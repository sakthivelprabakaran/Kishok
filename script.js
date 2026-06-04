/* =========================================
   YOURSGIFTS — KEYCHAIN DESIGNER SCRIPT
   ========================================= */

'use strict';

// ===== CONFIGURATION =====

var FONTS = [
    { name: 'Brandy',             label: 'Brandy',          file: 'Fonts/Brandy.ttf', lang: 'en' },
    { name: 'CANAVAR',            label: 'Canavar',         file: 'Fonts/CANAVAR.ttf', lang: 'en' },
    { name: 'Super Bubble',       label: 'Super Bubble',    file: 'Fonts/Super Bubble.ttf', lang: 'en' },
    { name: 'Franxurter',         label: 'Franxurter',      file: 'Fonts/Franxurter.ttf', lang: 'en' },
    { name: 'Sunday Chillin',     label: 'Sunday Chillin',  file: 'Fonts/Sunday Chillin.ttf', lang: 'en' },
    { name: 'Quicksilver Italic', label: 'Quicksilver',     file: 'Fonts/Quicksilver Italic.ttf', lang: 'en' },
    { name: 'Retrow Mentho',      label: 'Retrow Mentho',   file: 'Fonts/Retrow Mentho.ttf', lang: 'en' },
    { name: 'BagelFatOne',        label: 'Bagel Fat One',   file: 'Fonts/BagelFatOne-Regular.ttf', lang: 'en' },
    { name: 'Flockey',            label: 'Flockey',         file: 'Fonts/Flockey.ttf', lang: 'en' },
    { name: 'OleoScript',         label: 'Oleo Script',     file: 'Fonts/OleoScript-Bold.ttf', lang: 'en' },
    { name: 'Rock Boys',          label: 'Rock Boys',       file: 'Fonts/Rock Boys.ttf', lang: 'en' },
    { name: 'Storm Catcher',      label: 'Storm Catcher',   file: 'Fonts/Storm Catcher.otf', lang: 'en' },
    { name: 'Nature Beauty',      label: 'Nature Beauty',   file: 'Fonts/Nature Beauty.ttf', lang: 'en' },
    { name: 'Nasi',               label: 'Nasi',            file: 'Fonts/Nasi.otf', lang: 'en' },
    { name: 'Baloo Thambi 2',     label: 'Baloo Thambi',    file: 'Fonts/BalooThambi2.ttf', lang: 'ta' },
    { name: 'Hind Madurai',       label: 'Hind Madurai',    file: 'Fonts/HindMadurai.ttf', lang: 'ta' },
    { name: 'Kavivanar',          label: 'Kavivanar',       file: 'Fonts/Kavivanar.ttf', lang: 'ta' },
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

var WHATSAPP_NUMBER = '919876543210'; // ← Replace with your WhatsApp business number

// ===== STATE =====

var state = {
    name: 'Sample',
    colors: {
        base:    '#ff9933',
        font:    '#FFFFFF',
        outline: '#000000',
        line2:   '#FFD700',  // word-art only: color for the second line
    },
    selectedFont: null,
    selectedFontIndex: null,
    // Word-art only: per-line font selections (indices into FONTS).
    // Defaults populated on init: top = a script font, bottom = a heavy caps font.
    wordartTopIndex:    null,
    wordartBottomIndex: null,
    wordartActiveSlot:  'top',  // 'top' | 'bottom' — which slot a font-card click assigns to
    size: 'small',
    quantity: 1,
    lang: 'en',
    layers: '3L',
    productType: 'keychain',  // 'keychain' | 'nameplate' | 'wordart'
};

// Sensible defaults — picked by browsing the FONTS catalog.
// These names must exist in the FONTS array above.
var WORDART_DEFAULT_TOP    = 'OleoScript';      // script-ish for top
var WORDART_DEFAULT_BOTTOM = 'BagelFatOne';     // heavy caps for bottom

// LOVE Series: bottom is locked to "LOVE" + BagelFatOne. Top font is a curated allowlist.
// Curated to fonts that pair well visually with bold caps below.
var LOVESERIES_TOP_FONT_ALLOWLIST = ['OleoScript', 'Brandy', 'Sunday Chillin'];
var LOVESERIES_DEFAULT_TOP = 'OleoScript';
// Defaults that scream "gift product"
var LOVESERIES_DEFAULT_COLORS = {
    base:    '#ff61a6',  // pink
    font:    '#FFFFFF',  // white top text
    outline: '#000000',
    line2:   '#FFD700',  // gold LOVE
};

// Letter Tiles (vertical scrabble-style keychain): heavy caps fonts only.
var TILEKEY_FONT_ALLOWLIST = ['BagelFatOne', 'Super Bubble', 'Rock Boys', 'CANAVAR'];
var TILEKEY_DEFAULT_FONT   = 'BagelFatOne';
var TILEKEY_MAX_CHARS      = 8;
// Defaults: blue strip + white tiles + black letters (matches the black tile in IMG_1167).
var TILEKEY_DEFAULT_COLORS = {
    base:    '#3A88FE',  // strip = blue
    font:    '#000000',  // letter = black
    outline: '#000000',  // unused for tile keychain
    line2:   '#FFFFFF',  // tile = white
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
        }
    }));
}

// ===== SVG KEYCHAIN PREVIEW (flat 2D, for font cards) =====

var OUTLINE_SIZE = 1.6;

function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildTspans(text, opts) {
    // Multi-line: 2 lines max. Use dy to stack. Degree marker only on the first non-empty line in keychain mode.
    var withMarker = !opts || opts.withMarker !== false;
    var dyRatio    = (opts && opts.dyRatio) || 1.1; // word-art uses ~0.85 for tight spacing
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

    // Tile keychain: render the vertical strip inside the SAME landscape viewBox as keychain
    // cards (500×200) so all product cards have the same aspect ratio. Strip auto-scales.
    if (mode === 'tilekey') {
        var rawT  = (text || '').replace(/[\r\n]/g, '');
        var chars = rawT.toUpperCase().split('').slice(0, 8);
        if (chars.length === 0) chars = [' '];

        // Authoring units (we'll scale these down to fit the 500×200 viewBox).
        var TILE   = 60;
        var GAP    = 5;
        var PADX   = 14;
        var PADTOP = 50;
        var PADBOT = 18;
        var stripW = TILE + PADX * 2;
        var stripH = chars.length * TILE + (chars.length - 1) * GAP + PADTOP + PADBOT;

        // Card viewBox: 500×200, same as other product cards.
        var VB_W = 500, VB_H = 200;
        svg.setAttribute('viewBox', '0 0 ' + VB_W + ' ' + VB_H);

        // Fit the strip inside the viewBox with margin. Constrained mostly by height.
        var MARGIN = 10;
        var fit    = Math.min((VB_W - MARGIN * 2) / stripW, (VB_H - MARGIN * 2) / stripH);
        var drawW  = stripW * fit;
        var drawH  = stripH * fit;
        var offX   = (VB_W - drawW) / 2;
        var offY   = (VB_H - drawH) / 2;

        var stripColor  = baseColor;
        var tileColor   = line2Color || '#FFFFFF';
        var letterColor = fontColor;

        var html = '<g transform="translate(' + offX + ',' + offY + ') scale(' + fit + ')">';
        // Strip
        html += '<rect x="0" y="0" width="' + stripW + '" height="' + stripH + '" rx="14" ry="14" fill="' + stripColor + '"/>';
        // Lanyard hole
        html += '<circle cx="' + (stripW / 2) + '" cy="22" r="9" fill="rgba(255,255,255,0.95)"/>';
        // Tiles + letters
        for (var i = 0; i < chars.length; i++) {
            var tx = PADX;
            var ty = PADTOP + i * (TILE + GAP);
            html += '<rect x="' + tx + '" y="' + ty + '" width="' + TILE + '" height="' + TILE + '" rx="8" ry="8" fill="' + tileColor + '"/>';
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

    svg.setAttribute('viewBox', '0 0 500 200');
    var uid = fontFamily.replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 999999);
    var hasTwoLines = text.indexOf('\n') !== -1;
    var isWordart    = mode === 'wordart' || mode === 'loveseries';
    var fontSize = hasTwoLines ? (isWordart ? 52 : 48) : 60;

    if (isWordart) {
        // Word-art preview: two different fonts (top + bottom) with overlapping baselines.
        // Bottom line is bigger (acts as foot) and uses the bottom font; top line uses the top font.
        var topFontName = (previewArgs && previewArgs.topFontName) || fontFamily;
        var botFontName = (previewArgs && previewArgs.bottomFontName) || fontFamily;

        var lines = text.split('\n');
        var topLine = lines[0] || ' ';
        var botLine = (lines[1] != null) ? lines[1] : '';

        var topSize = fontSize;
        var botSize = Math.round(fontSize * 1.15);

        var topY = '45%';
        var botY = '88%';
        var topFill = fontColor;
        var botFill = line2Color || fontColor;

        // LOVE Series: trailing red heart inside the top line.
        var isLoveSeries = mode === 'loveseries';
        var heartGlyph   = isLoveSeries ? '❤' : '';
        var heartColor   = '#FF1F4B';

        var halo = '';
        halo =
            '<text x="50%" y="' + topY + '" text-anchor="middle" alignment-baseline="alphabetic"' +
            ' font-size="' + topSize + '" fill="none"' +
            ' stroke="' + outlineColor + '" stroke-width="' + (OUTLINE_SIZE * 5) + '" stroke-linejoin="round"' +
            ' font-family="' + topFontName + '">' + escapeXml(topLine) + (heartGlyph ? '<tspan font-family="sans-serif">' + heartGlyph + '</tspan>' : '') + '</text>';
        if (botLine) {
            halo +=
                '<text x="50%" y="' + botY + '" text-anchor="middle" alignment-baseline="alphabetic"' +
                ' font-size="' + botSize + '" fill="none"' +
                ' stroke="' + outlineColor + '" stroke-width="' + (OUTLINE_SIZE * 5) + '" stroke-linejoin="round"' +
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
            '<filter id="shadow_' + uid + '" x="-50%" y="-50%" width="200%" height="200%">' +
                '<feOffset result="offOut" in="SourceAlpha" dx="3" dy="3" />' +
                '<feGaussianBlur result="blurOut" in="offOut" stdDeviation="3" />' +
                '<feBlend in="SourceGraphic" in2="blurOut" mode="normal" />' +
            '</filter>' +
        '</defs>' +
        '<text x="50%" y="50%"' +
            ' text-anchor="middle" alignment-baseline="middle"' +
            ' font-size="' + fontSize + '" fill="none"' +
            ' stroke="' + baseColor + '" stroke-width="15" stroke-linejoin="round"' +
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
                    dispatch3DDesignUpdated();   // Update 3D viewer
                });
                container.appendChild(swatch);
            });
        })(type);
    }
}

// ===== SIZE SELECTOR =====

function initSizeSelector() {
    $('sizeSelector').querySelectorAll('.size-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            $('sizeSelector').querySelectorAll('.size-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.size = btn.dataset.size;
            updatePrice();
        });
    });
}

// ===== QUANTITY =====

function initQuantity() {
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

// ===== PRICE =====

function updatePrice() {
    var base  = PRICE_TABLE[state.size];
    var total = base * state.quantity;
    priceDisplay.textContent = '₹' + total;
}

function detectSize(text) {
    // Size by the longest line — multi-line keychains keep per-line tiers
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
    $('sizeSelector').querySelectorAll('.size-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.size === autoSize);
    });
    updatePrice();
}

// ===== FONT CARDS =====

function renderFontCards() {
    var displayText = state.name || 'Sample';
    fontGrid.innerHTML = '';

    var isWordart    = state.productType === 'wordart';
    var isLoveSeries = state.productType === 'loveseries';
    var isTileKey    = state.productType === 'tilekey';
    var isWordartLikeMode = isWordart || isLoveSeries;
    // In word-art-like modes, the "selected" highlight follows the ACTIVE SLOT, not selectedFont.
    var highlightedIdx = isWordartLikeMode
        ? (state.wordartActiveSlot === 'bottom' ? state.wordartBottomIndex : state.wordartTopIndex)
        : state.selectedFontIndex;

    // Filter fonts by language
    var filteredFonts = FONTS.filter(function(f) { return f.lang === state.lang; });
    // LOVE Series: restrict to curated top fonts only.
    if (isLoveSeries) {
        filteredFonts = filteredFonts.filter(function(f) {
            return LOVESERIES_TOP_FONT_ALLOWLIST.indexOf(f.name) >= 0;
        });
    }
    // Tile keychain: restrict to bold caps allowlist.
    if (isTileKey) {
        filteredFonts = filteredFonts.filter(function(f) {
            return TILEKEY_FONT_ALLOWLIST.indexOf(f.name) >= 0;
        });
    }

    filteredFonts.forEach(function(font) {
        var idx = FONTS.indexOf(font); // keep original index for selection
        var card = document.createElement('div');
        card.className = 'font-card' + (highlightedIdx === idx ? ' selected' : '');
        card.dataset.index = idx;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', 'Select ' + font.label + ' font');
        card.setAttribute('aria-pressed', highlightedIdx === idx ? 'true' : 'false');

        var check = document.createElement('div');
        check.className = 'card-check';
        check.textContent = '✓';

        // For word-art-like modes, render the preview using the right font for each line.
        var previewArgs;
        var previewText = displayText;
        if (isWordartLikeMode) {
            var topFontName, botFontName;
            if (isLoveSeries) {
                // Top is always this card's font; bottom is always BagelFatOne with text "LOVE".
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
            previewArgs = {
                topFontName: topFontName,
                bottomFontName: botFontName,
            };
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

        var nameTag = document.createElement('div');
        nameTag.className = 'font-name-tag';
        nameTag.textContent = font.label;

        card.appendChild(check);
        card.appendChild(svg);
        card.appendChild(nameTag);

        var selectCard = function() {
            if (isLoveSeries) {
                // Bottom is locked; clicks always assign to top.
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
            dispatch3DFontSelected();   // Trigger 3D viewer
        };

        card.addEventListener('click', selectCard);
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(); }
        });

        fontGrid.appendChild(card);
    });
}

// ===== SUMMARY BAR =====

function updateSummary() {
    if (state.selectedFont) {
        selSummary.classList.add('has-selection');
        summaryText.innerHTML = '✅ Selected: <strong>' + state.selectedFont.label + '</strong> — looks great!';
    } else {
        selSummary.classList.remove('has-selection');
        summaryText.textContent = 'Tap a style above to choose your font';
    }
}

// ===== TOAST =====

var toastTimer;
function showToast(msg, emoji) {
    emoji = emoji || '🎉';
    toast.textContent = emoji + ' ' + msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ===== WHATSAPP ORDER =====

function buildWhatsAppMessage() {
    var fontName = state.selectedFont ? state.selectedFont.label : 'Not selected';
    var total    = PRICE_TABLE[state.size] * state.quantity;
    var sizeCap  = state.size.charAt(0).toUpperCase() + state.size.slice(1);
    var lines = [
        '🎁 *YoursGifts — 3D Keychain Order*',
        '',
        '📝 Name: *' + (state.name || 'N/A') + '*',
        '🎨 Base Color: ' + state.colors.base,
        '✍️ Font Color: ' + state.colors.font,
        '🖊️ Outline Color: ' + state.colors.outline,
        '🔤 Font Style: *' + fontName + '*',
        '📐 Size: ' + sizeCap,
        '🔢 Quantity: ' + state.quantity,
        '💰 Total: ₹' + total,
        '',
        'Small Gifts, Big Meanings 💜',
    ];
    return encodeURIComponent(lines.join('\n'));
}

// ===== EVENT LISTENERS =====

// Debounce helper for 3D updates while typing
var _debounceTimer;
function debounce3DUpdate() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function() {
        dispatch3DDesignUpdated();
    }, 350);
}

var _transliterateTimer;

// Enforce line cap and per-line char limit, plus per-product transforms.
function clampMultiline(raw) {
    var isTile = state.productType === 'tilekey';
    var isLoveSeries = state.productType === 'loveseries';
    var maxLines = (isTile || isLoveSeries) ? 1 : 2;
    var perLineMax = isTile ? TILEKEY_MAX_CHARS : 15;
    var lines = raw.split('\n').slice(0, maxLines);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].length > perLineMax) lines[i] = lines[i].slice(0, perLineMax);
    }
    var out = lines.join('\n');
    // Tile keychain: auto-uppercase (matches the product's identity).
    if (isTile) out = out.toUpperCase();
    return out;
}

function longestLineLen(text) {
    var lines = (text || '').split('\n');
    var n = 0;
    for (var i = 0; i < lines.length; i++) if (lines[i].length > n) n = lines[i].length;
    return n;
}

nameInput.addEventListener('input', function() {
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
    debounce3DUpdate();   // Update 3D viewer after typing pause

    // Auto convert to Tamil (Transliteration)
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
                // Skip if empty, whitespace, or already contains Tamil characters
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
                // Try to maintain cursor position
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
    }, 450); // 450ms pause after typing stops before auto-converting
});

langToggleBtn.addEventListener('click', function() {
    state.lang = (state.lang === 'en') ? 'ta' : 'en';
    langToggleBtn.textContent = (state.lang === 'en') ? 'EN' : 'TA';
    langToggleBtn.classList.toggle('ta', state.lang === 'ta');
    
    // Auto-select first font in the new language
    var filtered = FONTS.filter(function(f) { return f.lang === state.lang; });
    if (filtered.length > 0) {
        state.selectedFont = filtered[0];
        state.selectedFontIndex = FONTS.indexOf(filtered[0]);
    } else {
        state.selectedFont = null;
        state.selectedFontIndex = null;
    }
    
    renderFontCards();
    updateSummary();
    dispatch3DFontSelected();
});

layerToggle.addEventListener('click', function() {
    state.layers = (state.layers === '3L') ? '2L' : '3L';

    // Update button text
    layerToggle.querySelectorAll('.layer-opt').forEach(function(opt) {
        opt.classList.toggle('active', opt.dataset.val === state.layers);
    });

    // Show/hide outline color row (tile keychain never shows it)
    var outlineRow = document.getElementById('outlineColorRow');
    if (outlineRow) {
        var hideForProduct = state.productType === 'tilekey';
        outlineRow.style.display = (hideForProduct || state.layers === '2L') ? 'none' : '';
    }

    renderFontCards();
    dispatch3DDesignUpdated();
});

// Product type toggle (Keychain / Nameplate / Word Art)
var productTypeToggle = $('productTypeToggle');
function applyProductTypeUI() {
    var isWordart    = state.productType === 'wordart';
    var isLoveSeries = state.productType === 'loveseries';
    var isTileKey    = state.productType === 'tilekey';
    var isWordartLike = isWordart || isLoveSeries;

    var line2Row    = $('line2ColorRow');
    var baseRow     = $('baseColorRow');
    var hint        = $('wordartHint');
    var fontLabel   = $('fontColorLabel');
    var line2Label  = document.querySelector('#line2ColorRow .color-label');
    var baseLabel   = document.querySelector('#baseColorRow .color-label');
    var slotTabs    = $('wordartSlotTabs');
    var previewSub  = $('previewSub');
    var nameLabel   = document.querySelector('label[for="nameInput"]');
    var nameField   = $('nameInput');

    // Tile keychain shows base (= strip) + line2 (= tile) + font (= letter). Hide outline.
    var outlineRow = $('outlineColorRow');
    if (isTileKey) {
        if (line2Row)   line2Row.style.display   = '';
        if (baseRow)    baseRow.style.display    = '';
        if (outlineRow) outlineRow.style.display = 'none';
    } else {
        if (line2Row)   line2Row.style.display   = isWordartLike ? '' : 'none';
        if (baseRow)    baseRow.style.display    = isWordartLike ? 'none' : '';
        if (outlineRow) outlineRow.style.display = '';
    }

    if (hint)     hint.style.display     = isWordart ? '' : 'none';
    if (slotTabs) slotTabs.style.display = isWordart ? '' : 'none';

    if (previewSub) {
        if (isTileKey)         previewSub.textContent = 'Pick a bold font. Each letter gets its own tile.';
        else if (isWordart)    previewSub.textContent = 'Pick the active slot above (Top / Bottom), then click a font card.';
        else if (isLoveSeries) previewSub.textContent = 'Pick a font for your name. The bottom always reads ❤ LOVE.';
        else                   previewSub.textContent = 'Click a card to select it';
    }

    // Color labels per product
    if (fontLabel) {
        if (isTileKey)         fontLabel.textContent = 'Letter';
        else if (isLoveSeries) fontLabel.textContent = 'Your Name';
        else if (isWordart)    fontLabel.textContent = 'Line 1';
        else                   fontLabel.textContent = 'Text';
    }
    if (line2Label) {
        if (isTileKey)         line2Label.textContent = 'Tile';
        else if (isLoveSeries) line2Label.textContent = 'LOVE';
        else                   line2Label.textContent = 'Line 2';
    }
    if (baseLabel) {
        baseLabel.textContent = isTileKey ? 'Strip' : 'Base';
    }

    if (nameLabel) {
        var icon = nameLabel.querySelector('.label-icon');
        var iconHTML = icon ? icon.outerHTML + ' ' : '';
        if (isTileKey) {
            nameLabel.innerHTML = iconHTML + 'Your Name (auto UPPERCASE, max ' + TILEKEY_MAX_CHARS + ')';
        } else if (isLoveSeries) {
            nameLabel.innerHTML = iconHTML + 'Your Name (❤ LOVE locked below)';
        } else {
            nameLabel.innerHTML = iconHTML + 'Your Name / Text';
        }
    }
    if (nameField) {
        var rows = (isLoveSeries || isTileKey) ? '1' : '2';
        var max;
        if (isTileKey)         max = String(TILEKEY_MAX_CHARS);
        else if (isLoveSeries) max = '15';
        else                   max = '31';
        nameField.setAttribute('rows', rows);
        nameField.setAttribute('maxlength', max);
        if (isTileKey)         nameField.setAttribute('placeholder', 'e.g. ALEXA, ZACK, MS…');
        else if (isLoveSeries) nameField.setAttribute('placeholder', 'e.g. Sarah, Mom, Priya…');
        else                   nameField.setAttribute('placeholder', 'e.g. Priya, SAKTHI…  (Enter for 2nd line)');
    }

    if (isWordart)    { ensureWordartDefaults();    updateWordartSlotLabels(); }
    if (isLoveSeries) { ensureLoveSeriesDefaults(); }
    if (isTileKey)    { ensureTileKeyDefaults();    }
}

function ensureTileKeyDefaults() {
    // Pick a default font from allowlist if user's current selection is outside it.
    var selectedAllowed = state.selectedFontIndex != null
        && TILEKEY_FONT_ALLOWLIST.indexOf(FONTS[state.selectedFontIndex].name) >= 0;
    if (!selectedAllowed) {
        var idx = FONTS.findIndex(function(f) { return f.name === TILEKEY_DEFAULT_FONT; });
        if (idx < 0) idx = FONTS.findIndex(function(f) { return TILEKEY_FONT_ALLOWLIST.indexOf(f.name) >= 0; });
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
        // Reflect in swatch UI.
        ['base', 'font', 'line2'].forEach(function(type) {
            var container = $(type + 'Swatches');
            if (!container) return;
            container.querySelectorAll('.swatch').forEach(function(sw) {
                var bg = sw.style.backgroundColor;
                sw.classList.toggle('active', bg && rgbToHex(bg) === state.colors[type].toLowerCase());
            });
        });
    }
}

function ensureLoveSeriesDefaults() {
    // Always force bottom to BagelFatOne (engine enforces too — belt and suspenders).
    var botIdx = FONTS.findIndex(function(f) { return f.name === WORDART_DEFAULT_BOTTOM; });
    state.wordartBottomIndex = botIdx >= 0 ? botIdx : 0;

    // Top: keep the user's existing pick if it's in the allowlist; otherwise reset to default.
    var topIsAllowed = state.wordartTopIndex != null
        && LOVESERIES_TOP_FONT_ALLOWLIST.indexOf(FONTS[state.wordartTopIndex].name) >= 0;
    if (!topIsAllowed) {
        var topIdx = FONTS.findIndex(function(f) { return f.name === LOVESERIES_DEFAULT_TOP; });
        state.wordartTopIndex = topIdx >= 0 ? topIdx : 0;
    }

    // Active slot is always 'top' since 'bottom' is locked.
    state.wordartActiveSlot = 'top';

    // First time entering LOVE Series: apply gift-product default colors so it pops.
    if (!state._loveseriesColorsApplied) {
        state.colors.base    = LOVESERIES_DEFAULT_COLORS.base;
        state.colors.font    = LOVESERIES_DEFAULT_COLORS.font;
        state.colors.outline = LOVESERIES_DEFAULT_COLORS.outline;
        state.colors.line2   = LOVESERIES_DEFAULT_COLORS.line2;
        state._loveseriesColorsApplied = true;
        // Re-highlight the swatch UI to match.
        ['font', 'outline', 'line2'].forEach(function(type) {
            var container = $(type + 'Swatches');
            if (!container) return;
            container.querySelectorAll('.swatch').forEach(function(sw) {
                sw.classList.toggle('active', sw.style.backgroundColor && rgbToHex(sw.style.backgroundColor) === state.colors[type].toLowerCase());
            });
        });
    }
}

function rgbToHex(rgb) {
    // 'rgb(255, 97, 166)' → '#ff61a6'
    var m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return rgb.toLowerCase();
    return '#' + [m[0], m[1], m[2]].map(function(n) {
        var h = parseInt(n, 10).toString(16);
        return h.length === 1 ? '0' + h : h;
    }).join('').toLowerCase();
}

function ensureWordartDefaults() {
    if (state.wordartTopIndex == null) {
        var topIdx = FONTS.findIndex(function(f) { return f.name === WORDART_DEFAULT_TOP; });
        if (topIdx < 0) topIdx = 0;
        state.wordartTopIndex = topIdx;
    }
    if (state.wordartBottomIndex == null) {
        var botIdx = FONTS.findIndex(function(f) { return f.name === WORDART_DEFAULT_BOTTOM; });
        if (botIdx < 0) botIdx = state.wordartTopIndex;
        state.wordartBottomIndex = botIdx;
    }
}

function updateWordartSlotLabels() {
    var topName = (state.wordartTopIndex    != null) ? FONTS[state.wordartTopIndex].label    : '—';
    var botName = (state.wordartBottomIndex != null) ? FONTS[state.wordartBottomIndex].label : '—';
    var topEl = $('slotTopName');
    var botEl = $('slotBottomName');
    if (topEl) topEl.textContent = topName;
    if (botEl) botEl.textContent = botName;
}

// Slot tab click → switch which slot the next font-card click assigns to
(function initWordartSlotTabs() {
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
            renderFontCards(); // re-highlight which card is "selected for this slot"
        });
    });
})();
if (productTypeToggle) {
    productTypeToggle.querySelectorAll('.ptype-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (btn.classList.contains('active')) return;
            productTypeToggle.querySelectorAll('.ptype-opt').forEach(function(b) {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            state.productType = btn.dataset.val;
            applyProductTypeUI();
            renderFontCards();
            dispatch3DDesignUpdated();
        });
    });
}

whatsappBtn.addEventListener('click', function() {
    if (!state.selectedFont) { showToast('Please select a font style first!', '⚠️'); return; }
    var msg = buildWhatsAppMessage();
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg, '_blank');
});

addToCartBtn.addEventListener('click', function() {
    if (!state.selectedFont) { showToast('Please select a font style first!', '⚠️'); return; }
    if (!state.name)          { showToast('Please enter a name first!', '⚠️'); return; }
    showToast('"' + state.name + '" added to cart!', '🛒');
    // WooCommerce AJAX hook can be placed here
});

// ===== THEME TOGGLE (System Wide) =====

function updateSystemTheme() {
    var isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = isLight ? 'light' : 'dark';
    
    // Notify 3D Viewer to update its background and ground colors
    window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme: theme }
    }));
}

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', updateSystemTheme);
}

// ===== INIT =====

function init() {
    buildSwatches();
    initSizeSelector();
    initQuantity();
    updatePrice();
    renderFontCards();
    updateSummary();
    
    // Ensure initial theme is synced to 3D viewer if it loads late
    setTimeout(updateSystemTheme, 500);
}

document.addEventListener('DOMContentLoaded', init);
