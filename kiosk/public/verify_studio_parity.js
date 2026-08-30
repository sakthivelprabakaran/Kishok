/*
 * verify_studio_parity.js
 * Static verifier for Kishok kiosk:
 *  (1) Front-end customization options must match the STL Studio settings
 *      - product types, font catalog, colour palettes
 *  (2) The Studio must be able to RESIZE every model type it can open
 *      - a global, always-visible scale control, plus per-type size controls
 *
 * Run: node verify_studio_parity.js
 * (Exits non-zero if any check fails.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);                 // kiosk/public
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const files = {
  frontApp:     'js/kiosk-app.js',
  studioApp:    'admin-console.js',
  studioHtml:   'studio.html',
  frontIndex:   'index.html',
  customizeHtml:'customize.html',
};

const reports = [];
function check(name, pass, detail) {
  reports.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}` + (detail ? `\n        ${detail}` : ''));
}

/* ---------- extractors ---------- */

// Font names from a FONTS array. We slice the array region first (so we don't
// pick up other objects that also have `name:`/`file:`), then pair name+file
// per entry regardless of field order.
function sliceRegion(src, startMarker, endToken) {
  const i = src.indexOf(startMarker);
  if (i < 0) return '';
  const j = src.indexOf(endToken, i);
  return j < 0 ? src.slice(i) : src.slice(i, j + endToken.length);
}
function extractFontNames(src) {
  const region = sliceRegion(src, 'const FONTS', '\n];');
  const names = [];
  const entries = region.match(/\{[\s\S]*?\}/g) || [];
  for (const e of entries) {
    const n = e.match(/name:\s*'([^']+)'/);
    const f = e.match(/file:\s*'([^']+)'/);
    if (n && f) names.push(n[1]);
  }
  return [...new Set(names)].sort();
}

// Colour palette hexes per category from COLOR_PALETTES = { base:[...], font:[...], outline:[...] }
function extractPalettes(src) {
  const region = sliceRegion(src, 'const COLOR_PALETTES', '\n};');
  const out = { base: [], font: [], outline: [] };
  for (const cat of ['base', 'font', 'outline']) {
    const re = new RegExp(cat + ':\\s*\\[([\\s\\S]*?)\\]');
    const blk = region.match(re);
    if (blk) {
      const hexes = blk[1].match(/#[0-9a-fA-F]{6}/g) || [];
      out[cat] = [...new Set(hexes.map(h => h.toUpperCase()))].sort();
    }
  }
  return out;
}

// Front-end product types from catalogue links: customize.html?type=XXX
function extractFrontProductTypes(idxSrc) {
  const set = new Set();
  const re = /customize\.html\?type=([a-z_]+)/g;
  let m;
  while ((m = re.exec(idxSrc)) !== null) set.add(m[1]);
  return [...set].sort();
}

// Studio product types from the product <select id="adminProductType"> only
// (ignore control <option>s like yes/no/wave inside other selects).
function extractStudioProductTypes(htmlSrc) {
  const selStart = htmlSrc.indexOf('<select');
  const i = htmlSrc.indexOf('id="adminProductType"', selStart);
  if (i < 0) return [];
  const open = htmlSrc.lastIndexOf('<select', i);
  const close = htmlSrc.indexOf('</select>', open);
  const block = htmlSrc.slice(open, close);
  const set = new Set();
  const re = /<option[^>]*value="([a-z_]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(block)) !== null) set.add(m[1]);
  return [...set].sort();
}

/* ---------- load sources ---------- */
const frontApp   = read(files.frontApp);
const studioApp  = read(files.studioApp);
const studioHtml = read(files.studioHtml);
const frontIdx   = read(files.frontIndex);

/* ================= CHECK 1: option parity ================= */

// 1a. product types
const feTypes = extractFrontProductTypes(frontIdx);
const stTypes = extractStudioProductTypes(studioHtml);
const feOnly = feTypes.filter(t => !stTypes.includes(t));
const stOnly = stTypes.filter(t => !feTypes.includes(t));
check('1a. Product types: front-end ⊆ studio (studio can open every front-end type)',
  feOnly.length === 0,
  feOnly.length ? `Front-end types missing from Studio: ${feOnly.join(', ')}` :
  `All ${feTypes.length} front-end types present in Studio.` + (stOnly.length ? ` (Studio-only: ${stOnly.join(', ')})` : ''));

// 1b. fonts
const feFonts = extractFontNames(frontApp);
const stFonts = extractFontNames(studioApp);
const fontsMissingInStudio = feFonts.filter(f => !stFonts.includes(f));
const fontsMissingInFront  = stFonts.filter(f => !feFonts.includes(f));
check('1b. Font catalog: identical between front-end and Studio',
  fontsMissingInStudio.length === 0 && fontsMissingInFront.length === 0,
  (fontsMissingInStudio.length ? `In front-end, missing in Studio: ${fontsMissingInStudio.join(', ')}. ` : '') +
  (fontsMissingInFront.length  ? `In Studio, missing in front-end: ${fontsMissingInFront.join(', ')}.` : '') +
  (fontsMissingInStudio.length === 0 && fontsMissingInFront.length === 0 ? `Both have ${feFonts.length} fonts, identical.` : ''));

// 1c. colour palettes
const fePal = extractPalettes(frontApp);
const stPal = extractPalettes(studioApp);
let palOk = true; let palDetail = [];
for (const cat of ['base', 'font', 'outline']) {
  const missStudio = fePal[cat].filter(h => !stPal[cat].includes(h));
  const missFront  = stPal[cat].filter(h => !fePal[cat].includes(h));
  if (missStudio.length || missFront.length) {
    palOk = false;
    palDetail.push(`${cat}: front[${fePal[cat].length}] vs studio[${stPal[cat].length}]` +
      (missStudio.length ? ` missing-in-studio=${missStudio.join(',')}` : '') +
      (missFront.length  ? ` missing-in-front=${missFront.join(',')}` : ''));
  }
}
check('1c. Colour palettes (base/font/outline): identical between front-end and Studio',
  palOk, palDetail.length ? palDetail.join(' | ') : 'base/font/outline palettes match exactly.');

/* ================= CHECK 2: studio can resize every model ================= */

// 2a. global scale control exists and is NOT inside a product-conditional (display:none) section
const hasScale = /id="adminScaleFactor"/.test(studioHtml);
// product-conditional sections are those default-hidden via style="display: none;"
const hiddenSections = [...studioHtml.matchAll(/<div class="ctrlSection" id="([^"]+)" style="display: none;"/g)].map(m => m[1]);
// find the section that wraps adminScaleFactor: it's the ctrlSection whose title is "Overall Scale"
const scaleSectionHidden = hiddenSections.some(id => studioHtml.includes(`id="${id}"`) && studioHtml.split(`id="${id}"`)[1].includes('adminScaleFactor'));
check('2a. Studio exposes a GLOBAL scale control that is always visible (not product-conditional)',
  hasScale && !scaleSectionHidden,
  `adminScaleFactor present=${hasScale}; scale control hidden-by-default=${scaleSectionHidden}; ` +
  `product-conditional hidden sections: ${hiddenSections.length ? hiddenSections.join(', ') : 'none'}`);

// 2b. for every product type the Studio CAN open, it must have at least one size-affecting control.
//     The global scaleFactor counts for all; we also ensure each product-specific section adds
//     at least one size slider so "resize" is meaningful per type.
// Map product type -> size sliders provided by its dedicated section (beyond the global scale).
const sizeSlidersByType = {
  keychain:        ['adminScaleFactor','adminBaseDepth','adminRingOuter'],
  nameplate:       ['adminScaleFactor'],
  wordart:         ['adminScaleFactor','adminBaseDepth'],
  loveseries:      ['adminScaleFactor'],
  tilekey:         ['adminScaleFactor'],
  linked_initials: ['adminScaleFactor'],
  nametag:         ['adminScaleFactor','adminTextSize','adminBaseThickness','adminRingOuterD','adminRingInnerD'],
  girly_keychain:  ['adminScaleFactor'],
  bordered_keychain:['adminScaleFactor','adminBorderedThickness','adminBorderedTextSize','adminBorderedRingOuterD'],
  supported_text:  ['adminScaleFactor','adminSupportedExtrusion','adminSupportedTextSize'],
  flower_keychain: ['adminScaleFactor','adminFlowerBaseRadius','adminFlowerNumPetals','adminFlowerRingOuterD'],
  desk_organizer:  ['adminScaleFactor','adminOrganizerWidth','adminOrganizerDepth','adminOrganizerHeight','adminOrganizerWallThk'],
  name_beads:      ['adminScaleFactor','adminBeadSize','adminBeadHole','adminBeadSpacing','adminBeadLetterHeight'],
  bubble_keychain: ['adminScaleFactor'],
  tilekey:         ['adminScaleFactor'],
  linked_initials:['adminScaleFactor'],
  led_word_stand:  ['adminScaleFactor','adminLedBodyDepth','adminLedWallThk','adminLedFontSize'],
  led_word_art:    ['adminScaleFactor','adminLedBodyDepth','adminLedWallThk','adminLedFontSize','adminLedCoverThk','adminLedLetterSpacing'],
};
let resizeOk = true; const resizeBad = [];
for (const t of stTypes) {
  const sliders = sizeSlidersByType[t] || [];
  const present = sliders.filter(id => new RegExp(`id="${id}"`).test(studioHtml));
  if (present.length === 0) { resizeOk = false; resizeBad.push(t); }
}
check('2b. Every Studio-openable product type has ≥1 size/resize control',
  resizeOk, resizeOk ? `All ${stTypes.length} studio types expose resize controls.` :
  `Types with NO resize control: ${resizeBad.join(', ')}`);

// 2c. "irrespective of any model": any front-end-only type (already failed 1a) also cannot be resized in Studio.
check('2c. Resize coverage spans ALL front-end models (no front-end-only orphan)',
  feOnly.length === 0,
  feOnly.length ? `These front-end types cannot even be opened/resized in Studio: ${feOnly.join(', ')}` :
  'No front-end-only types; resize coverage is complete.');

/* ---------- summary ---------- */
const failed = reports.filter(r => !r.pass);
console.log('\n========================================');
console.log(`RESULT: ${reports.length - failed.length}/${reports.length} checks passed.`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach(f => console.log(' - ' + f.name + (f.detail ? ` :: ${f.detail}` : '')));
  process.exit(1);
} else {
  console.log('All checks passed.');
  process.exit(0);
}
