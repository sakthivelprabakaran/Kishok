import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('public/customize.html');
const app = read('public/js/kiosk-app.js');
const css = read('public/css/customize.css');
const cart = read('public/js/cart-page.js');
const checkout = read('public/js/checkout-page.js');
const orders = read('public/js/my-orders-page.js');
const admin = read('public/js/admin-dashboard.js');

for (const id of [
    'matchSetModeBtn',
    'matchSetBuilder',
    'matchSetOptions',
    'matchSetPreviewStrip',
    'matchSetRefresh',
    'matchSetStatus',
]) {
    assert.match(html, new RegExp(`id="${id}"`), `Missing Match Set control: ${id}`);
}

assert.match(app, /MATCH_SET_PRODUCTS[\s\S]*?'keychain'[\s\S]*?'bubble_keychain'[\s\S]*?'nameplate'/);
assert.match(app, /function setMatchSetMode/);
assert.match(app, /function refreshMatchSetPreviews/);
assert.match(app, /for \(let index = 0; index < products\.length; index \+= 1\)/);
assert.match(app, /state\.matchSet\.items\[product\.productType\] = await renderMatchSetProduct/);
assert.match(app, /function buildMatchSetCartLine/);
assert.match(app, /matchSet:\s*\{[\s\S]*?id:\s*setId[\s\S]*?itemIndex[\s\S]*?itemCount/);
assert.match(app, /await Cart\.add\(buildMatchSetCartLine/);
assert.match(app, /BatchOffers\.findBatchDiscount\(/);
assert.match(app, /matchSetProductAvailable/);
assert.match(app, /state\.catalogProducts/);
assert.match(app, /state\.matchSet\.enabled[\s\S]*?state\.crew\.enabled = false/);

assert.match(css, /\.match-set-options/);
assert.match(css, /\.match-set-mode-active \.qty-selector-wrap/);
assert.match(cart, /function matchSetMeta/);
assert.match(cart, /function matchSetHeadingNode/);
assert.match(checkout, /Kootzy Match Set/);
assert.match(orders, /Kootzy Match Set/);
assert.match(admin, /function itemMatchSet/);
assert.match(admin, /Kootzy Match Set/);

console.log('[PASS] Kootzy Match Set coordinates three exact products with one viewer and grouped order metadata.');
