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
const studioProducts = read('js/studio-products.js');
const viewerSrc  = read('js/viewer3d.js');
const kioskApp   = read('js/kiosk-app.js');

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

function functionSource(src, name) {
  const re = new RegExp(`function\\s+${name}\\s*\\(`);
  const m = re.exec(src);
  if (!m) return null;
  const open = src.indexOf('{', m.index);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(m.index, i + 1);
    }
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
  (id) => ((studioApp + studioProducts).match(new RegExp(`'${id}'`, 'g')) || []).length === 0
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

/* ---------- 6. storefront conditional sections stay product-scoped ---------- */

const conditionalSource = functionSource(kioskApp, 'isSectionUnavailable');
const desktopSource = functionSource(kioskApp, 'isDesktop');
const stepperSource = functionSource(kioskApp, 'renderStepper');

function storefrontVisibility(productType, desktop) {
  const vm = require('vm');
  const elements = [
    { id: 'ordinaryStep3', dataset: { step: '3' }, style: {} },
    { id: 'thicknessSection', dataset: { step: '3' }, style: {} },
    { id: 'ringPositionSection', dataset: { step: '3' }, style: {} },
    { id: 'batchPromoAlert', dataset: { step: '3' }, style: {} },
    { id: 'stepOne', dataset: { step: '1' }, style: {} },
  ];
  const noopClassList = { toggle() {} };
  const button = () => ({ style: {} });
  const state = { productType, currentStep: 3, matchedBatchSize: false };
  const context = {
    state,
    window: { matchMedia: () => ({ matches: desktop }) },
    document: {
      body: { classList: noopClassList },
      querySelectorAll(selector) {
        if (selector === '[data-step]') return elements;
        if (selector === `[data-step="${state.currentStep}"]`) {
          return elements.filter((e) => Number(e.dataset.step) === state.currentStep);
        }
        return [];
      },
      querySelector: () => ({ classList: noopClassList }),
    },
    el: {
      stepDots: [],
      stepLines: [],
      stepperText: null,
      btnPlaceOrder: button(),
      btnAddToCart: button(),
      btnPrevStep: button(),
      btnNextStep: button(),
    },
  };
  vm.runInNewContext(
    `${desktopSource || ''}\n${conditionalSource || ''}\n${stepperSource || ''}\nrenderStepper();`,
    context
  );
  return Object.fromEntries(elements.map((e) => [e.id, e.style.display]));
}

const classicDesktop = desktopSource && conditionalSource && stepperSource
  ? storefrontVisibility('keychain', true) : {};
const otherDesktop = desktopSource && conditionalSource && stepperSource
  ? storefrontVisibility('bubble_keychain', true) : {};
const classicMobile = desktopSource && conditionalSource && stepperSource
  ? storefrontVisibility('keychain', false) : {};
const otherMobile = desktopSource && conditionalSource && stepperSource
  ? storefrontVisibility('bubble_keychain', false) : {};

check(
  '6a. Classic Keychain shows Thickness and Ring on desktop and mobile step 3',
  classicDesktop.thicknessSection === ''
    && classicDesktop.ringPositionSection === ''
    && classicMobile.thicknessSection === ''
    && classicMobile.ringPositionSection === '',
  'both controls belong exclusively to the Classic Keychain'
);

check(
  '6b. non-Classic products hide Thickness and Ring on desktop and mobile step 3',
  otherDesktop.thicknessSection === 'none'
    && otherDesktop.ringPositionSection === 'none'
    && otherMobile.thicknessSection === 'none'
    && otherMobile.ringPositionSection === 'none',
  'the stepper must not reveal product-inapplicable controls'
);

check(
  '6c. mobile still hides cards from steps other than the active step',
  classicMobile.stepOne === 'none' && classicMobile.ordinaryStep3 === '',
  'conditional visibility must not bypass the step-by-step wizard'
);

/* ---------- 7. product thickness rules stay honest ---------- */

const buildKeychainSource = methodBody(viewerSrc, 'buildKeychain') || '';
check(
  '7a. Classic Keychain geometry owns the fixed 6mm stack',
  /p\.productType\s*===\s*'keychain'/.test(buildKeychainSource)
    && /p\.base\.depth\s*=\s*classicIsTwoLayer\s*\?\s*4\.5\s*:\s*3/.test(buildKeychainSource)
    && /p\.outline\.depth\s*=\s*1\.5/.test(buildKeychainSource)
    && /p\.font\.depth\s*=\s*1\.5/.test(buildKeychainSource),
  '3L must remain 3 + 1.5 + 1.5; 2L must remain 4.5 + 1.5'
);

check(
  '7b. Word Art has no hidden 6mm text or 4mm outline override',
  !/fontSettings\.depth\s*=\s*Math\.max\s*\(\s*p\.font\.depth\s*,\s*6\s*\)/.test(buildKeychainSource)
    && !/outlineSettings\.depth\s*=\s*Math\.max\s*\(/.test(buildKeychainSource),
  'the displayed Word Art depth controls must equal the generated geometry'
);

check(
  '7c. Studio locks fixed Classic Z controls but leaves other products editable',
  /function\s+syncClassicKeychainThicknessControls/.test(studioApp)
    && /controlled\.forEach\(\(slider\)\s*=>\s*setSliderPairDisabled\(slider,\s*isClassic\)\)/.test(studioApp),
  'only productType=keychain may disable the shared depth controls'
);

const tileBuilderSource = methodBody(viewerSrc, '_buildTileKeychain') || '';
check(
  '7d. Letter Tiles uses its dedicated depth and bevel controls',
  [
    'tile_strip_depth',
    'tile_strip_bevel',
    'tile_depth',
    'tile_bevel',
    'tile_letter_depth',
    'tile_letter_bevel',
  ].every((key) => tileBuilderSource.includes(`p.${key}`))
    && /adminTileSection/.test(studioProducts),
  'Letter Tile controls must drive generated geometry and remain reachable from its product profile'
);

check(
  '7e. Letter Tiles renders the selected letter colour without blackening it',
  /var\s+matLetter\s*=\s*new\s+THREE\.MeshBasicMaterial/.test(tileBuilderSource)
    && /color:\s+new\s+THREE\.Color\(letterColor\)/.test(tileBuilderSource)
    && /toneMapped:\s+false/.test(tileBuilderSource)
    && /new\s+THREE\.Mesh\(letterGeo,\s*matLetter\)/.test(tileBuilderSource),
  'letter faces must use colors.font directly and bypass physical-lighting tone darkening'
);

const nametagBuilderSource = methodBody(viewerSrc, '_buildWavyNametag') || '';
check(
  '7f. Wavy Nametag uses truthful ring placement and parameter-based validation',
  /adminNametagRingPlacement/.test(studioHtml)
    && /nametag_ring_placement/.test(studioApp)
    && /type\s*===\s*'nametag'/.test(viewerSrc)
    && /checkFeature\('Nametag backing'/.test(viewerSrc)
    && /if\s*\(hasRing\)/.test(nametagBuilderSource)
    && !/Explicit ring_x\/y passed[\s\S]*hasRing\s*=\s*true/.test(nametagBuilderSource)
    && /adminNametagThicknessSummary/.test(studioHtml),
  'automatic placement must match the customer model; manual coordinates and actual thicknesses must be explicit'
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
