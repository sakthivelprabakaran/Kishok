/* =========================================================
   YOURSGIFTS — Animated product-card previews
   2D mirror of each product's real 3D keychain. Glyphs are the
   body (font-color fill + base-color halo), matching buildKeychain.
   Word Art / LOVE Series are 2-line; LED products glow; LED Word
   Stand sits on a stand foot. Pure 2D SVG, uses global opentype.js.
   ========================================================= */
(function () {
    'use strict';

    if (typeof opentype === 'undefined') return; // engine missing → keep <img>

    var FONT = {
        brandy:  'Fonts/Brandy.ttf',
        bagel:   'Fonts/BagelFatOne-Regular.ttf',
        anton:   'Fonts/Anton-Regular.ttf',
        pacifico:'Fonts/Pacifico-Regular.ttf',
        lobster: 'Fonts/Lobster-Regular.ttf',
        chewy:   'Fonts/Chewy-Regular.ttf',
        rockboys:'Fonts/Rock Boys.ttf',
    };

    var C = {
        orange:'#ff9933', purple:'#7b2fff', blue:'#3A88FE', red:'#FF2D78',
        green:'#7ed957', pink:'#ff61a6', gold:'#FFD700', black:'#1A1714',
        white:'#FFFFFF', cream:'#FBF6EE', ink:'#15131F', teal:'#0FB9B1',
    };

    // base = halo/body, font = line-1 face, line2 = line-2 face (2-line products)
    var COMBOS_VIVID = [
        { base: C.green,  font: C.black },
        { base: C.pink,   font: C.white },
        { base: C.blue,   font: C.gold  },
        { base: C.purple, font: C.white },
        { base: C.orange, font: C.black },
        { base: C.gold,   font: C.black },
    ];
    var COMBOS_WORDART = [
        { base: C.teal,   font: C.red,    line2: C.gold },
        { base: C.purple, font: C.gold,   line2: C.white },
        { base: C.black,  font: C.pink,   line2: C.teal },
        { base: C.blue,   font: C.white,  line2: C.gold },
    ];
    var COMBOS_LOVE = [
        { base: C.purple, font: C.gold,  line2: C.gold, heart: C.red },
        { base: C.blue,   font: C.white, line2: C.white, heart: C.red },
        { base: C.black,  font: C.pink,  line2: C.pink, heart: C.red },
    ];
    // LED Word Stand renders like the real 3D: solid block letters (light face,
    // colored side-wall) standing on a colored base bar. White-ish faces read best.
    var COMBOS_LED = [
        { base: C.orange, font: C.white },
        { base: C.blue,   font: C.white },
        { base: C.red,    font: C.white },
        { base: C.purple, font: C.gold  },
    ];

    // shape: 'letters' (glyph body + optional ring/stand) | 'tiles' | 'plaque' | 'lines' (2-line)
    var CONFIG = {
        keychain:          { lines: ['PRIYA'],        fonts: [FONT.anton],    shape: 'letters', ring: true, combos: COMBOS_VIVID },
        bordered_keychain: { lines: ['Priya'],        fonts: [FONT.bagel],    shape: 'letters', ring: true, combos: COMBOS_VIVID, halo: 9 },
        flower_keychain:   { lines: ['S'],            fonts: [FONT.pacifico], shape: 'letters', ring: true, combos: COMBOS_VIVID, halo: 11 },
        nametag:           { lines: ['Priya'],        fonts: [FONT.chewy],    shape: 'letters', ring: true, combos: COMBOS_VIVID },
        girly_keychain:    { lines: ['Priya'],        fonts: [FONT.pacifico], shape: 'letters', ring: true, combos: COMBOS_VIVID },
        tilekey:           { lines: ['ABC'],          fonts: [FONT.bagel],    shape: 'tiles',   ring: true, combos: COMBOS_VIVID },
        linked_initials:   { lines: ['SP'],           fonts: [FONT.bagel],    shape: 'letters', ring: true, combos: COMBOS_VIVID, halo: 8 },
        supported_text:    { lines: ['Priya'],        fonts: [FONT.lobster],  shape: 'lines',   ring: false, combos: COMBOS_WORDART },
        wordart:           { lines: ['Vivi', 'SAKTHI'], fonts: [FONT.pacifico, FONT.rockboys], shape: 'lines', ring: false, combos: COMBOS_WORDART },
        loveseries:        { lines: ['Anjali', 'LOVE'], fonts: [FONT.pacifico, FONT.bagel],    shape: 'lines', ring: false, combos: COMBOS_LOVE, heart: true },
        nameplate:         { lines: ['PRIYA'],        fonts: [FONT.anton],    shape: 'plaque',  ring: false, combos: COMBOS_VIVID },
        led_word_stand:    { lines: ['SAM'],          fonts: [FONT.anton],    shape: 'letters', ring: false, combos: COMBOS_LED, stand: true, halo: 9 },
        led_word_art:      { lines: ['Love'],         fonts: [FONT.lobster],  shape: 'letters', ring: false, combos: COMBOS_LED, halo: 9 },
    };

    var VB_W = 200, VB_H = 132;

    var fontCache = {};
    function loadFont(file) {
        if (fontCache[file]) return fontCache[file];
        var p = new Promise(function (resolve, reject) {
            opentype.load(file, function (err, font) { return err ? reject(err) : resolve(font); });
        });
        fontCache[file] = p;
        return p;
    }
    // Resolve cfg.fonts (one path per line) into an array of font objects.
    function loadLineFonts(files) {
        return Promise.all(files.map(loadFont));
    }

    function pathFor(font, text, fontSize) {
        var path = font.getPath(text, 0, 0, fontSize);
        var bb = path.getBoundingBox();
        return { d: path.toPathData(2), x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2,
                 w: (bb.x2 - bb.x1) || 1, h: (bb.y2 - bb.y1) || 1 };
    }

    // A small heart path (filled) centered at (cx,cy), `s` = full width.
    function heartPath(cx, cy, s) {
        var r = s / 2;
        var x = cx - r, y = cy - r * 0.85;
        return 'M' + cx + ',' + (cy + r * 0.9) +
               'C' + (cx - r * 1.3) + ',' + (cy - r * 0.2) + ' ' + (x) + ',' + (y - r * 0.5) + ' ' + cx + ',' + (cy - r * 0.15) +
               'C' + (cx + r) + ',' + (y - r * 0.5) + ' ' + (cx + r * 1.3) + ',' + (cy - r * 0.2) + ' ' + cx + ',' + (cy + r * 0.9) + 'Z';
    }

    // Render one glyph line as a solid extruded body, mirroring the 3D:
    // base-color side-wall halo + a faint offset "depth" copy + dark edge + face fill.
    function glyphBody(t, faceColor, baseColor, halo) {
        var s = '';
        // colored side-wall (the extruded base layer showing around the letter)
        s += '<path d="' + t.d + '" fill="none" stroke="' + baseColor + '" stroke-width="' + (halo * 2) +
             '" stroke-linejoin="round" stroke-linecap="round"/>';
        // subtle depth: a second base-color copy nudged down-right reads as thickness
        s += '<g transform="translate(2.2,2.6)"><path d="' + t.d + '" fill="' + baseColor + '"/></g>';
        // dark contour + light face
        s += '<path d="' + t.d + '" fill="none" stroke="#1A1714" stroke-width="2" stroke-linejoin="round"/>';
        s += '<path d="' + t.d + '" fill="' + faceColor + '"/>';
        return s;
    }

    // perLineFont: array of resolved opentype fonts, one per cfg.lines entry.
    function buildSVG(cfg, perLineFont, combo, uid) {
        var halo = cfg.halo || 7;
        var ringR = 12;
        var leftPad = cfg.ring ? ringR * 2 + 4 : 14;
        var boxX = leftPad, boxY = 14, boxW = VB_W - leftPad - 14, boxH = VB_H - 28;
        var inner = halo + 4;
        var uidSh = 's' + uid;

        var out = ['<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" xmlns="http://www.w3.org/2000/svg" class="cardpv-svg" preserveAspectRatio="xMidYMid meet">'];
        var defs = '<defs>';
        defs += '<filter id="' + uidSh + '" x="-30%" y="-30%" width="160%" height="160%">' +
                '<feDropShadow dx="2.5" dy="3" stdDeviation="0" flood-color="rgba(26,23,20,.85)"/></filter>';
        defs += '</defs>';
        out.push(defs);

        if (cfg.shape === 'plaque') {
            var px = boxX, py = boxY + 6, pw2 = boxW, ph2 = boxH - 12, rr = 12;
            out.push('<g filter="url(#' + uidSh + ')"><rect x="' + px + '" y="' + py + '" width="' + pw2 + '" height="' + ph2 +
                     '" rx="' + rr + '" fill="' + combo.base + '" stroke="#1A1714" stroke-width="2.5"/></g>');
            var ip = 16;
            var probe = pathFor(perLineFont[0], cfg.lines[0], 100);
            var s2 = Math.min((pw2 - ip * 2) / probe.w, (ph2 - ip * 2) / probe.h);
            var t2 = pathFor(perLineFont[0], cfg.lines[0], 100 * s2);
            var tx2 = px + (pw2 - t2.w) / 2 - t2.x1, ty2 = py + (ph2 - t2.h) / 2 - t2.y1;
            out.push('<path d="' + t2.d + '" transform="translate(' + tx2.toFixed(2) + ',' + ty2.toFixed(2) +
                     ')" fill="' + combo.font + '"/>');
            out.push('</svg>'); return out.join('');
        }

        if (cfg.shape === 'tiles') {
            var chars = cfg.lines[0].split('');
            var n = chars.length, gap = 7, pad = 12;
            var stripX = boxX, stripY = boxY + 18, stripW = boxW, stripH = boxH - 36;
            out.push('<g filter="url(#' + uidSh + ')"><rect x="' + stripX + '" y="' + (stripY + stripH/2 - 7) +
                     '" width="' + stripW + '" height="14" rx="5" fill="' + combo.base + '" stroke="#1A1714" stroke-width="2"/></g>');
            var tileW = (stripW - pad * 2 - gap * (n - 1)) / n, tileH = stripH;
            for (var i = 0; i < n; i++) {
                var x0 = stripX + pad + i * (tileW + gap);
                out.push('<g filter="url(#' + uidSh + ')"><rect x="' + x0.toFixed(1) + '" y="' + stripY +
                         '" width="' + tileW.toFixed(1) + '" height="' + tileH.toFixed(1) +
                         '" rx="5" fill="' + combo.base + '" stroke="#1A1714" stroke-width="2"/></g>');
                var ts = Math.min((tileW - 10) / 60, (tileH - 12) / 70) * 100;
                var ct = pathFor(perLineFont[0], chars[i], ts);
                var ctx = x0 + (tileW - ct.w) / 2 - ct.x1, cty = stripY + (tileH - ct.h) / 2 - ct.y1;
                out.push('<path d="' + ct.d + '" transform="translate(' + ctx.toFixed(2) + ',' + cty.toFixed(2) +
                         ')" fill="' + combo.font + '"/>');
            }
            out.push('</svg>'); return out.join('');
        }

        // ── Glyph-body shapes: 'letters' (1 line + ring), 'lines' (2-line), 'led' ──
        var lines = cfg.lines.slice();

        // Stand foot for LED Word Stand: a base-colored bar the letters stand on
        // (matches the 3D — orange base, letters seated on top).
        var standH = 0;
        var standY = 0;
        if (cfg.stand) {
            standH = 18;
            standY = boxY + boxH - standH;
            var sX = boxX, sW = boxW, rr2 = 5;
            out.push('<g filter="url(#' + uidSh + ')">');
            out.push('<rect x="' + sX + '" y="' + standY + '" width="' + sW + '" height="' + standH +
                     '" rx="' + rr2 + '" fill="' + combo.base + '" stroke="#1A1714" stroke-width="2.5"/>');
            // hint of the LED channel groove along the top of the bar
            out.push('<rect x="' + (sX + 7) + '" y="' + (standY + 4) + '" width="' + (sW - 14) +
                     '" height="3.5" rx="1.75" fill="rgba(0,0,0,.22)"/>');
            out.push('</g>');
        }

        // keyring (single-line letters products)
        if (cfg.ring) {
            var cx = ringR + 6, cy = VB_H / 2;
            out.push('<g filter="url(#' + uidSh + ')">');
            out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ringR + '" fill="' + combo.base +
                     '" stroke="#1A1714" stroke-width="2.5"/>');
            out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (ringR - 5) + '" fill="' + C.cream +
                     '" stroke="#1A1714" stroke-width="1.5"/>');
            out.push('</g>');
        }

        // Letters occupy the area above the stand bar, overlapping its top edge a
        // little so they read as standing ON it (like the 3D).
        var standOverlap = cfg.stand ? 5 : 0;
        var contentH = boxH - standH + standOverlap;
        var contentY = boxY;

        // Lay out lines stacked, fitted into [boxX,contentY,boxW,contentH].
        var lineGap = lines.length > 1 ? 6 : 0;
        // probe each line at 100
        var probes = lines.map(function (txt, i) { return pathFor(perLineFont[i] || perLineFont[0], txt, 100); });
        var maxW = 0, sumH = 0;
        probes.forEach(function (p) { if (p.w > maxW) maxW = p.w; sumH += p.h; });
        var availW = boxW - inner * 2, availH = contentH - inner * 2 - lineGap * (lines.length - 1);
        var scale = Math.min(availW / maxW, availH / sumH);
        var fs = 100 * scale;

        // recompute laid-out lines at fs, stack centered
        var laid = lines.map(function (txt, i) { return pathFor(perLineFont[i] || perLineFont[0], txt, fs); });
        var totalH = laid.reduce(function (a, p) { return a + p.h; }, 0) + lineGap * (lines.length - 1);
        var curY = contentY + (contentH - totalH) / 2;

        out.push('<g filter="url(#' + uidSh + ')">');
        for (var li = 0; li < laid.length; li++) {
            var lp = laid[li];
            var lx = boxX + (boxW - lp.w) / 2 - lp.x1;
            var ly = curY - lp.y1;
            // line color: line 0 = font, line 1 = line2 (fallback font)
            var face = (li === 1 && combo.line2) ? combo.line2 : combo.font;
            out.push('<g transform="translate(' + lx.toFixed(2) + ',' + ly.toFixed(2) + ')">' +
                     glyphBody(lp, face, combo.base, halo) + '</g>');

            // Heart after the LOVE line
            if (cfg.heart && li === laid.length - 1) {
                var hSize = lp.h * 0.62;
                var hx = boxX + (boxW + lp.w) / 2 + hSize * 0.75;
                var hy = curY + lp.h / 2;
                if (hx + hSize < VB_W - 4) {
                    out.push('<path d="' + heartPath(hx, hy, hSize) + '" fill="' + (combo.heart || C.red) +
                             '" stroke="#1A1714" stroke-width="1.5"/>');
                }
            }
            curY += lp.h + lineGap;
        }
        out.push('</g>');

        out.push('</svg>');
        return out.join('');
    }

    var _uid = 0;
    function animateCard(card, cfg, perLineFont) {
        var wrap = card.querySelector('.card-img-wrap');
        if (!wrap) return;
        wrap.classList.add('cardpv-wrap');
        wrap.innerHTML = '';

        var layerA = document.createElement('div');
        var layerB = document.createElement('div');
        layerA.className = 'cardpv-layer cardpv-on';
        layerB.className = 'cardpv-layer';
        wrap.appendChild(layerA);
        wrap.appendChild(layerB);

        var svgs = cfg.combos.map(function (combo) { return buildSVG(cfg, perLineFont, combo, _uid++); });
        layerA.innerHTML = svgs[0];
        var idx = 0, showingA = true;
        var startDelay = 400 + Math.random() * 1600;
        setTimeout(function () {
            setInterval(function () {
                if (document.hidden) return;
                idx = (idx + 1) % svgs.length;
                var incoming = showingA ? layerB : layerA;
                var outgoing = showingA ? layerA : layerB;
                incoming.innerHTML = svgs[idx];
                incoming.classList.add('cardpv-on');
                outgoing.classList.remove('cardpv-on');
                showingA = !showingA;
            }, 2400);
        }, startDelay);
    }

    function init() {
        var cards = document.querySelectorAll('.product-card[data-type]');
        cards.forEach(function (card) {
            var cfg = CONFIG[card.dataset.type];
            if (!cfg) return;
            loadLineFonts(cfg.fonts)
                .then(function (perLineFont) { animateCard(card, cfg, perLineFont); })
                .catch(function () { /* keep <img> fallback */ });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
