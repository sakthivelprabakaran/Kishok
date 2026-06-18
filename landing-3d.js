/* =========================================================
   YOURSGIFTS — Landing demo reel (REAL 3D)
   Loads the actual KeychainViewer (Three.js) used by the
   customizer and auto-plays sample designs through it, while
   a mock customizer UI animates alongside. Honours
   prefers-reduced-motion (renders one static design, no loop).
   ========================================================= */
import { KeychainViewer } from './viewer3d.js?v=poc4';

(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas    = document.getElementById('demoCanvas');
  var loading   = document.getElementById('demoLoading');
  var mockText  = document.getElementById('mockText');
  var mockFonts = document.getElementById('mockFonts');
  var mockColors= document.getElementById('mockColors');
  var caption   = document.getElementById('demoCaption');
  if (!canvas) return;

  /* ---- sample designs the reel cycles through ----
     fontPath/label mirror the customizer's FONTS catalog.
     colors use {base, font, outline} like viewer.update expects. */
  // Shuttle/space palette accents across the reel.
  var SCENES = [
    // 1. PRIYA — fresh combo (teal base, white text, gold outline)
    { text: 'PRIYA',  fontPath: 'Fonts/Anton-Regular.ttf',      fontName: 'Anton',         label: 'Classic Keychain', colors: { base:'#0FB9B1', font:'#FFFFFF', outline:'#FFD700' }, layers:'3L', product:'keychain' },
    // 2. Maya — orange base, white text
    { text: 'Maya',   fontPath: 'Fonts/Lobster-Regular.ttf',    fontName: 'Lobster',       label: 'Script Keychain',  colors: { base:'#FF8A1E', font:'#FFFFFF', outline:'#1A1714' }, layers:'2L', product:'keychain' },
    // 3. NEO — pink base, white text
    { text: 'NEO',    fontPath: 'Fonts/Orbitron-Regular.ttf',   fontName: 'Orbitron',      label: 'Retro Tech',       colors: { base:'#FF2D78', font:'#FFFFFF', outline:'#2B2D7F' }, layers:'3L', product:'keychain' },
    // 4. POC — LOVE Series (top line + locked "LOVE" bottom + red heart), Sunday Chillin
    { text: 'Anjali', fontPath: 'Fonts/Sunday Chillin.ttf',     fontName: 'Sunday Chillin', label: 'LOVE Series',     colors: { base:'#2B2D7F', font:'#FFD700', outline:'#FFFFFF', line2:'#FF2D78' }, layers:'3L', product:'loveseries' },
    // 5. POC — Letter Tiles (strip / letter / tile colours)
    { text: 'GO',     fontPath: 'Fonts/BagelFatOne-Regular.ttf',fontName: 'Bagel Fat One', label: 'Letter Tiles',     colors: { base:'#2B2D7F', font:'#FFFFFF', outline:'#FFD700', line2:'#0FB9B1' }, layers:'3L', product:'tilekey' },
    // 6. POC — Word Art, 2 lines: top=Retrow Mentho, bottom=Rock Boys
    { text: 'Vivi\nSAKTHI', fontPath: 'Fonts/Retrow Mentho.ttf', fontName: 'Word Art',     label: 'Word Art (2-line)', colors: { base:'#0FB9B1', font:'#FF2D78', outline:'#1A1714', line2:'#FFD700' }, layers:'3L', product:'wordart',
      wordartFonts: { top: 'Fonts/Retrow Mentho.ttf', bottom: 'Fonts/Rock Boys.ttf' } }
  ];

  /* ---- build the mock UI chips/swatches once ---- */
  SCENES.forEach(function (s, idx) {
    var chip = document.createElement('span');
    chip.className = 'mini-chip';
    chip.textContent = s.fontName;
    chip.dataset.idx = idx;
    mockFonts.appendChild(chip);
  });
  // Swatch row mirrors each scene's base colour (so the active one always lights up).
  SCENES.forEach(function (s, idx) {
    var sw = document.createElement('span');
    sw.className = 'mini-swatch';
    sw.style.background = s.colors.base;
    sw.dataset.idx = idx;
    mockColors.appendChild(sw);
  });
  var chipEls   = mockFonts.querySelectorAll('.mini-chip');
  var swatchEls = mockColors.querySelectorAll('.mini-swatch');

  // scene dots (cycling indicator, mainly for mobile reel-first layout)
  var reelDots = document.getElementById('reelDots');
  if (reelDots) {
    SCENES.forEach(function () { reelDots.appendChild(document.createElement('i')); });
  }
  var dotEls = reelDots ? reelDots.querySelectorAll('i') : [];

  function setActive(list, idx) {
    list.forEach(function (n, i) { n.classList.toggle('active', i === idx); });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function typeInto(el, str) {
    el.textContent = '';
    for (var i = 0; i < str.length; i++) { el.textContent += str[i]; await wait(85); }
  }

  /* ---- instantiate the real viewer ---- */
  var viewer;
  try {
    viewer = new KeychainViewer(canvas);
  } catch (e) {
    console.error('Demo viewer failed to start:', e);
    if (loading) loading.textContent = '3D preview unavailable';
    return;
  }

  async function build(scene) {
    return viewer.update(
      scene.text, scene.fontPath, scene.colors,
      scene.layers, {}, scene.product, scene.wordartFonts || null
    );
  }

  // Friendly text for the mock input (no raw "\n"; show LOVE's locked line).
  function displayText(scene) {
    if (scene.product === 'loveseries') return scene.text + ' ❤ LOVE';
    return scene.text.replace('\n', ' · ');
  }

  async function showScene(scene, idx, animate) {
    if (animate) {
      if (caption) caption.textContent = 'Building…';
      await typeInto(mockText, displayText(scene));
    } else {
      mockText.textContent = displayText(scene);
    }
    setActive(chipEls, idx);
    setActive(swatchEls, idx);
    setActive(dotEls, idx);
    try { await build(scene); } catch (e) { console.error('build error', e); }
    if (loading) loading.style.display = 'none';
    if (caption) caption.textContent = scene.label;
  }

  (async function run() {
    // wait for opentype + a frame so the canvas has size
    await wait(60);
    if (reduceMotion) {
      await showScene(SCENES[0], 0, false);
      viewer.toggleAutoRotate && viewer.toggleAutoRotate(); // off → static
      return;
    }
    var idx = 0;
    // first build (with typing)
    await showScene(SCENES[0], 0, true);
    await wait(2600);
    // loop the rest forever
    while (true) {
      idx = (idx + 1) % SCENES.length;
      await showScene(SCENES[idx], idx, true);
      await wait(2600);
    }
  })();
})();
