import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
    customizeHtml,
    kioskApp,
    customizeCss,
    cartPage,
    cartCss,
    checkoutPage,
    myOrdersPage,
    adminDashboard,
    studioHtml,
    studioApp,
] = await Promise.all([
    readFile(new URL('../public/customize.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/kiosk-app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/css/customize.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/cart-page.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/css/cart.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/checkout-page.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/my-orders-page.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/js/admin-dashboard.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/studio.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin-console.js', import.meta.url), 'utf8'),
]);

for (const id of [
    'crewModeCard',
    'soloModeBtn',
    'crewModeBtn',
    'crewBuilder',
    'crewCountMinus',
    'crewCountPlus',
    'crewCountValue',
    'crewMemberStrip',
    'crewRefreshPreviews',
    'crewStatus',
    'crewQuickSwitcher',
    'crewQuickMembers',
    'crewEditNamesBtn',
]) {
    assert.match(customizeHtml, new RegExp(`id="${id}"`), `${id} must exist in the customizer.`);
}

assert.match(customizeHtml, />Kootzy Crew</);
assert.match(kioskApp, /const CREW_MIN = 2;/);
assert.match(kioskApp, /const CREW_MAX = 6;/);
assert.match(
    kioskApp,
    /const available = state\.productType === 'keychain';/,
    'Crew mode must be limited to Classic Keychain in version one.',
);
assert.equal(
    [...kioskApp.matchAll(/new KeychainViewer\(/g)].length,
    1,
    'Crew mode must reuse the single customer WebGL viewer.',
);
assert.match(
    kioskApp,
    /for \(let index = 0; index < state\.crew\.count; index \+= 1\)[\s\S]*?renderCrewMemberExact/,
    'Crew previews must be generated sequentially with one viewer.',
);
assert.match(kioskApp, /member\.fontFile/);
assert.match(kioskApp, /member\.colors/);
assert.match(kioskApp, /member\.layers/);
assert.match(kioskApp, /member\.ringAnchor/);
assert.match(kioskApp, /configured:\s*Boolean\(existing\.configured\)/);
assert.match(kioskApp, /function nextUnconfiguredCrewIndex/);
assert.match(kioskApp, /function markActiveCrewConfigured/);
assert.match(kioskApp, /function renderCrewQuickSwitcher/);
assert.match(kioskApp, /function syncStepperNavClearance/);
assert.match(kioskApp, /function setupMobileKeyboardStability/);
assert.match(kioskApp, /function startMobileKeyboardSession/);
assert.match(kioskApp, /function finishMobileKeyboardSession/);
assert.match(kioskApp, /displacement <= correctionThreshold/);
assert.match(kioskApp, /nextDesktopLayout !== lastDesktopLayout/);
assert.match(kioskApp, /mobile-keyboard-active'[\s\S]*?!isTextEntryElement\(document\.activeElement\)/);
assert.match(kioskApp, /nav\.classList\.toggle\('is-crew-review'/);
assert.match(kioskApp, /Save & customize \$\{nextCrewName\}/);
assert.match(kioskApp, /state\.currentStep = 2;[\s\S]*?selectCrewMember\(nextCrewIndex\)/);
assert.match(kioskApp, /firstMissingCrewName/);
assert.match(kioskApp, /Add a name for member/);
assert.match(kioskApp, /crew:\s*\{[\s\S]*?id:\s*crewId[\s\S]*?memberIndex[\s\S]*?memberCount/);
assert.match(kioskApp, /quantity:\s*1,[\s\S]*?design,[\s\S]*?preview:\s*member\.preview/);
assert.match(kioskApp, /await Cart\.add\(buildCrewCartLine/);

assert.match(customizeCss, /\.crew-member-strip/);
assert.match(customizeCss, /\.crew-member-card\.active/);
assert.match(customizeCss, /\.crew-quick-switcher/);
assert.match(customizeCss, /\.crew-quick-member\.is-complete::after/);
assert.match(customizeCss, /body\.mobile-keyboard-active \.stepper-nav/);
assert.doesNotMatch(customizeCss, /body\.mobile-keyboard-active \.visualizer-pane/);
assert.match(customizeCss, /overscroll-behavior-y:\s*none/);
assert.match(customizeCss, /\.stepper-nav\.is-review\.is-crew-review/);
assert.match(customizeCss, /var\(--stepper-nav-height, 76px\)/);
assert.match(customizeCss, /@media \(max-width: 430px\)/);
assert.match(customizeCss, /\.crew-mode-active \.qty-selector-wrap \{ display: none; \}/);

assert.match(cartPage, /function appendGroupedLines/);
assert.match(cartPage, /cart-crew-heading/);
assert.match(cartPage, /Member \$\{crew\.memberIndex\} of \$\{crew\.memberCount\}/);
assert.match(cartCss, /\.cart-crew-heading/);
assert.match(checkoutPage, /Kootzy Crew/);
assert.match(myOrdersPage, /Kootzy Crew/);
assert.match(adminDashboard, /order-product-crew/);
assert.match(adminDashboard, /function orderProductsHTML/);
assert.match(adminDashboard, /class="order-crew-group"/);
assert.match(adminDashboard, /params\.set\('crew', encodeStudioCrew/);
assert.match(adminDashboard, /ringAnchor:\s*design\.ringAnchor \|\| 'top'/);

for (const id of [
    'studioCrewContext',
    'studioCrewMember',
    'studioCrewPrev',
    'studioCrewBack',
    'studioCrewNext',
    'adminClassicRingAnchor',
]) {
    assert.match(studioHtml, new RegExp(`id="${id}"`), `${id} must exist in Studio.`);
}

assert.match(studioApp, /function decodeStudioCrew/);
assert.match(studioApp, /function studioCrewMemberHref/);
assert.match(studioApp, /function renderStudioCrewContext/);
assert.match(studioApp, /anchor:\s*state\.ringAnchor/);
assert.match(studioApp, /const ringAnchorParam = params\.get\('ringAnchor'\)/);
assert.match(studioApp, /classicRingAnchorSelect\.addEventListener\('change'/);
assert.match(studioApp, /\/admin\.html\?tab=orders&order=/);

console.log('[PASS] Kootzy Crew supports 2–6 exact Classic Keychain designs with one viewer and grouped fulfilment metadata.');
