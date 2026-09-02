/*
 * verify_esm_parse.js
 * Parses every browser ES module AS A MODULE and fails on any syntax error.
 *
 * Why this exists: `node --check` parses .js files as CommonJS, where top-level
 * `return` is legal. A bad edit once glued a comment to a function declaration
 * (`...rewrite.function setInputValuePreservingCaret...`), swallowing the
 * function head; its body's braces leaked to top level and the `return`
 * statements became top-level — which CJS accepts and the browser rejects with
 * "Illegal return statement", killing the ENTIRE kiosk-app module and with it
 * the desktop layout. node --check passed; the browser did not.
 *
 * Run: node --experimental-vm-modules verify_esm_parse.js
 * (Exits non-zero if any module fails to parse.)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (typeof vm.SourceTextModule !== 'function') {
    console.error('run with: node --experimental-vm-modules verify_esm_parse.js');
    process.exit(2);
}

const ROOT = path.resolve(__dirname);   // kiosk/public

// Every file the browser loads with type="module" or that a module imports.
const MODULES = [
    'js/kiosk-app.js',
    'js/viewer3d.js',
    'js/cart.js',
    'js/cart-page.js',
    'js/checkout-page.js',
    'js/cart-badge.js',
    'js/pricing.js',
    'js/product-labels.js',
    'js/order-status.js',
    'js/my-orders-page.js',
    'js/legal-details.js',
    'js/landing-reel.js',
    'admin-console.js',
];

let failed = 0;
for (const rel of MODULES) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) {
        console.log(`[SKIP] ${rel} (not found)`);
        continue;
    }
    const src = fs.readFileSync(p, 'utf8');
    try {
        // Construction parses the module; nothing is linked or evaluated.
        new vm.SourceTextModule(src, { identifier: rel });
        console.log(`[PASS] ${rel}`);
    } catch (err) {
        failed++;
        console.log(`[FAIL] ${rel}: ${err.message}`);
    }
}

console.log('\n' + '='.repeat(40));
if (failed) {
    console.log(`RESULT: ${failed} module(s) do not parse as ESM.`);
    process.exit(1);
}
console.log(`RESULT: all ${MODULES.length} browser modules parse as ESM.`);
