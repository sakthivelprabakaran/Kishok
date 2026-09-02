/*
 * verify_control_coverage.js
 * Static verifier for Studio's parametric controls.
 *
 * The failures this guards against have all actually happened:
 *  (1) A builder scales the whole assembly but is missing from SCALED_PRODUCTS, so
 *      validatePrintability treats its baked-in constants as absolute millimetres
 *      and reports safe thicknesses for a model that shrank. bubble_keychain sat
 *      like this.
 *  (2) A slider is added to studio.html but never wired into SLIDER_MAP, so it is
 *      visible and inert.
 *  (3) SLIDER_MAP names an id that does not exist in studio.html, so the slider is
 *      silently null.
 *  (4) applyProductTypeUI toggles a section id that no longer exists, or a section
 *      exists that nothing ever shows.
 *  (5) The Word Art backing toggle stops refreshing section relevance, leaving the
 *      Base Layer stuck hidden.
 *
 * Run: node verify_control_coverage.js
 * (Exits non-zero if any check fails.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);                 // kiosk/public
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const studioApp  = read('admin-console.js');
const studioHtml = read('studio.html');
const viewerSrc  = read('js/viewer3d.js');

const reports = [];
function check(name, pass, detail) {
  reports.push({ name, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}` + (detail ? `\n        ${detail}` : ''));
}

/* ---------- extractors ---------- */

function methodBody(src, name) {
  const re = new RegExp(`\\n\\s{4}(?:static\\s+)?(?:get\\s+)?(?:async\\s+)?${name}\\s*\\(`);
  const m = re.exec(src);
  if (!m) return null;
  let i = src.indexOf('{', m.index);
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

// productType -> the builder that handles it. The five main-path products are all
// handled inside buildKeychain itself.
const BUILDER = {
  keychain:          'buildKeychain',
  nameplate:         'buildKeychain',
  wordart:           'buildKeychain',
  loveseries:        'buildKeychain',
  linked_initials:   'buildKeychain',
  tilekey:           '_buildTileKeychain',
  bubble_keychain:   '_buildBubbleKeychain',
  nametag:           '_buildWavyNametag',
  girly_keychain:    '_buildGirlyKeychain',
  bordered_keychain: '_buildBorderedKeychain',
  supported_text:    '_buildSupportedText',
  flower_keychain:   '_buildFlowerKeychain',
  desk_organizer:    '_buildDeskOrganizer',
  led_word_stand:    '_buildLedWordStand',
  led_word_art:      '_buildLedWordArt',
  name_beads:        '_buildNameBeads',
};

/* ---------- 1. product list is complete ---------- */

// Scope to the product dropdown: studio.html has other selects (wave mode, the
// yes/no toggles) whose option values are not product types.
const productRegion = (() => {
  const i = studioHtml.indexOf('id="adminProductType"');
  if (i < 0) return '';
  const j = studioHtml.indexOf('</select>', i);
  return studioHtml.slice(i, j < 0 ? undefined : j);
})();
const optionTypes = [...productRegion.matchAll(/<option[^>]*value="([a-z_]+)"/g)].map((m) => m[1]);
const missingFromMap = optionTypes.filter((t) => !BUILDER[t]);
check(
  '1a. every product in the Studio dropdown is mapped to a builder here',
  optionTypes.length > 0 && missingFromMap.length === 0,
  missingFromMap.length
    ? `unmapped: ${missingFromMap.join(', ')} — add them to BUILDER in this file`
    : `${optionTypes.length} product types, all mapped`
);

/* ---------- 2. SCALED_PRODUCTS matches which builders actually scale ---------- */

const scaledList = (() => {
  const body = methodBody(viewerSrc, 'SCALED_PRODUCTS') || '';
  return [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
})();

const scalesWholeAssembly = new Set();
for (const [product, builder] of Object.entries(BUILDER)) {
  if (builder === 'buildKeychain') continue;   // main path scales font size, not the group
  const body = methodBody(viewerSrc, builder);
  // Both forms count: setScalar(s), and set(s, -s, s) as the LED builders use to
  // combine scaling with the Y flip.
  if (body && /keychainGroup\.scale\.(?:setScalar|set)\s*\(/.test(body)) scalesWholeAssembly.add(product);
}

const missingScaled = [...scalesWholeAssembly].filter((p) => !scaledList.includes(p));
check(
  '2a. every builder that scales the whole assembly is in SCALED_PRODUCTS',
  missingScaled.length === 0,
  missingScaled.length
    ? `missing: ${missingScaled.join(', ')} — printability would validate their `
      + 'constants as absolute mm while the geometry shrinks'
    : `${scalesWholeAssembly.size} scaling builders, all declared`
);

const bogusScaled = scaledList.filter((p) => BUILDER[p] && !scalesWholeAssembly.has(p));
check(
  '2b. SCALED_PRODUCTS contains no product whose builder does not scale',
  bogusScaled.length === 0,
  bogusScaled.length
    ? `declared but does not scale: ${bogusScaled.join(', ')}`
    : 'no stale entries'
);

/* ---------- 3. every slider is wired both ways ---------- */

const mapRegion = (() => {
  const i = studioApp.indexOf('const SLIDER_MAP');
  const j = studioApp.indexOf('\n};', i);
  return i < 0 ? '' : studioApp.slice(i, j);
})();
const mappedIds = new Set([...mapRegion.matchAll(/'(admin\w+)'/g)].map((m) => m[1]));
const htmlSliderIds = [...studioHtml.matchAll(/class="sliderRange"\s+id="(\w+)"/g)].map((m) => m[1]);

const unwired = htmlSliderIds.filter((id) => !mappedIds.has(id));
check(
  '3a. every .sliderRange in studio.html is present in SLIDER_MAP',
  unwired.length === 0,
  unwired.length
    ? `not wired: ${unwired.join(', ')} — the slider would move and change nothing`
    : `${htmlSliderIds.length} sliders, all wired`
);

const orphanIds = [...mappedIds].filter((id) => !studioHtml.includes(`id="${id}"`));
check(
  '3b. every id in SLIDER_MAP exists in studio.html',
  orphanIds.length === 0,
  orphanIds.length ? `missing from markup: ${orphanIds.join(', ')}` : 'no orphan ids'
);

/* ---------- 4. product sections are declared and reachable ---------- */

// Only sections that start hidden need a script reference to reveal them.
// Always-visible sections (colours, scale) are legitimately never toggled.
const hiddenSectionIds = [...studioHtml.matchAll(
  /class="ctrlSection"\s+id="(admin\w+)"\s+style="display:\s*none;?"/g
)].map((m) => m[1]);
const neverToggled = hiddenSectionIds.filter(
  (id) => (studioApp.match(new RegExp(`'${id}'`, 'g')) || []).length === 0
);
check(
  '4a. every hidden-by-default control section is revealed by the Studio script',
  hiddenSectionIds.length > 0 && neverToggled.length === 0,
  neverToggled.length
    ? `orphan sections: ${neverToggled.join(', ')} — nothing ever shows them`
    : `${hiddenSectionIds.length} product sections, all reachable`
);

/* ---------- 5. relevance rules stay wired ---------- */

const relevance = (() => {
  const i = studioApp.indexOf('function syncStandardSectionRelevance');
  if (i < 0) return null;
  const j = studioApp.indexOf('\n}', i);
  return studioApp.slice(i, j);
})();

check(
  '5a. syncStandardSectionRelevance() exists and sets both sections both ways',
  relevance !== null
    && /adminRingSection/.test(relevance)
    && /adminBaseSection/.test(relevance)
    && /\?\s*'block'\s*:\s*'none'/.test(relevance),
  'must assign block OR none — a hide-only version leaves Base Layer stuck hidden'
);

check(
  '5b. it is called from applyProductTypeUI() and from the backing toggle',
  (studioApp.match(/syncStandardSectionRelevance\(\)/g) || []).length >= 3,
  'definition + product switch + word-art backing change'
);

check(
  '5c. the standard-stack visibility decision is shared, not recomputed',
  /_standardStackVisible\s*=\s*!hideStandard/.test(studioApp)
    && relevance !== null && /_standardStackVisible/.test(relevance),
  'relevance rules must respect products that hide the whole standard stack'
);

/* ---------- result ---------- */

const passed = reports.filter((r) => r.pass).length;
console.log('\n' + '='.repeat(40));
console.log(`RESULT: ${passed}/${reports.length} checks passed.`);
if (passed !== reports.length) {
  console.log('Failed: ' + reports.filter((r) => !r.pass).map((r) => r.name).join(', '));
  process.exit(1);
}
console.log('All checks passed.');
