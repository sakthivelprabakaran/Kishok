/*
 * verify_input_perf.js
 * Static verifier for the typing hot path in the kiosk front-end and Studio.
 *
 * These are the invariants that keep typing cheap. Each one maps to a specific
 * regression that has already happened once, or that a plausible "simplify this"
 * edit would reintroduce:
 *
 *  (1) Typing must not rebuild the font strip. refreshFontPreviews() used to call
 *      renderFontList(), which wiped the strip and reconstructed all ~35 cards —
 *      ~35 opentype getPath() calls, ~35 SVG parses and a full strip layout per
 *      typing burst — and reset the strip's scroll position on every keystroke.
 *  (2) Preview rendering must stay idempotent and lazy, so off-screen cards cost
 *      nothing and a re-render of the same text is a no-op.
 *  (3) Handlers that rewrite input.value must preserve the caret, or mid-word
 *      edits are impossible.
 *  (4) Studio must debounce and coalesce rebuilds. updateViewer() used to fire
 *      per keystroke with no guard, so several viewer.update() calls ran
 *      concurrently, each calling _clearKeychain() on the shared group.
 *
 * Run: node verify_input_perf.js
 * (Exits non-zero if any check fails.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);                 // kiosk/public
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const frontApp  = read('js/kiosk-app.js');
const studioApp = read('admin-console.js');

const reports = [];
function check(name, pass, detail) {
  reports.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}` + (detail ? `\n        ${detail}` : ''));
}

/* ---------- extractor ---------- */

// Return the body of `function <name>(...) { ... }` by matching braces, ignoring
// braces inside strings, template literals, regex literals and comments. Naive
// regex is not good enough here: we need "is X called *inside* Y", not "does the
// file mention X".
function functionBody(src, name) {
  const sig = new RegExp(`function\\s+${name}\\s*\\(`);
  const m = sig.exec(src);
  if (!m) return null;

  let i = src.indexOf('{', m.index);
  if (i < 0) return null;

  let depth = 0;
  let inS = null;        // ' " ` when inside a string
  let inLine = false, inBlock = false, inRegex = false;
  const start = i;

  for (; i < src.length; i++) {
    const c = src[i], p = src[i - 1], n = src[i + 1];

    if (inLine)  { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inRegex) { if (c === '\\') { i++; continue; } if (c === '/') inRegex = false; continue; }
    if (inS)     { if (c === '\\') { i++; continue; } if (c === inS) inS = null; continue; }

    if (c === '/' && n === '/') { inLine = true;  i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    // A '/' starts a regex only where a value is expected.
    if (c === '/' && /[=(,:[!&|?{};\n]/.test((src.slice(0, i).match(/\S/g) || []).pop() || '\n')) {
      inRegex = true; continue;
    }

    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

// The body of the arrow function passed to setTimeout inside `name`.
function debouncedBody(src, name) {
  const body = functionBody(src, name);
  if (!body) return null;
  const i = body.indexOf('setTimeout(');
  return i < 0 ? null : body.slice(i);
}

/* ---------- 1. typing must not rebuild the strip ---------- */

const refresh = functionBody(frontApp, 'refreshFontPreviews');
check(
  '1a. refreshFontPreviews() does not reach renderFontList()',
  refresh !== null && !/\brenderFontList\b/.test(refresh),
  refresh === null
    ? 'refreshFontPreviews() not found'
    : 'typing swaps preview glyphs only; it never reconstructs the card DOM'
);
// NB: match the bare identifier, not `renderFontList(`. The regression form was
// `setTimeout(renderFontList, 300)` — a reference with no call parentheses.

check(
  '1b. refreshFontPreviews() is debounced',
  refresh !== null && /setTimeout\(/.test(refresh) && /clearTimeout\(/.test(refresh),
  'a burst of keystrokes collapses into one refresh'
);

const refreshTail = debouncedBody(frontApp, 'refreshFontPreviews');
check(
  '1c. refreshFontPreviews() bails when the preview text is unchanged',
  refreshTail !== null && /===\s*_previewSample|_previewSample\s*===/.test(refreshTail),
  'typing past the 6-char preview slice costs nothing'
);

check(
  '1d. no `input` listener reaches renderFontList()',
  (() => {
    const listeners = [];
    const re = /addEventListener\('input'/g;
    let m;
    while ((m = re.exec(frontApp)) !== null) {
      // Slice to the end of the listener: the next `});` at the same nesting.
      const end = frontApp.indexOf('\n    });', m.index);
      listeners.push(frontApp.slice(m.index, end < 0 ? m.index + 2000 : end));
    }
    return listeners.length > 0 && listeners.every((l) => !/\brenderFontList\b/.test(l));
  })(),
  'card construction stays out of the typing path'
);

/* ---------- 2. previews stay lazy and idempotent ---------- */

const renderCard = functionBody(frontApp, 'renderCardPreview');
check(
  '2a. renderCardPreview() is a no-op when the card already shows the sample',
  renderCard !== null && /dataset\.sample\s*===\s*_previewSample/.test(renderCard),
  'repeat renders of identical text do no glyph work'
);

check(
  '2b. renderCardPreview() discards superseded async results',
  renderCard !== null && (renderCard.match(/dataset\.sample\s*!==\s*sample/g) || []).length >= 2,
  'a slow font load cannot paint stale text over newer input (both then and catch)'
);

check(
  '2c. the preview observer is rooted on the font strip',
  /new IntersectionObserver\([\s\S]{0,600}?root:\s*el\.fontStrip/.test(frontApp),
  'only cards scrolled into view are rendered'
);

const renderList = functionBody(frontApp, 'renderFontList');
check(
  '2d. renderFontList() detaches the previous cards from the observer',
  renderList !== null
    && /_previewObserver\.disconnect\(\)/.test(renderList)
    && /_visibleCards\.clear\(\)/.test(renderList),
  'the visible set never retains nodes removed from the DOM'
);

check(
  '2e. there is a fallback when IntersectionObserver is unavailable',
  renderList !== null && /else\s*\{[\s\S]{0,120}renderCardPreview\(card\)/.test(renderList),
  'older browsers still get previews, eagerly'
);

/* ---------- 3. caret preservation ---------- */

const helper = functionBody(frontApp, 'setInputValuePreservingCaret');
check(
  '3a. a caret-preserving value setter exists',
  helper !== null
    && /selectionStart/.test(helper)
    && /setSelectionRange/.test(helper),
  'reads selectionStart before the write, restores it after'
);

check(
  '3b. it skips the write when the value is already correct',
  helper !== null && /input\.value\s*===\s*next/.test(helper),
  'no redundant DOM write, no redundant caret move'
);

check(
  '3c. no input handler assigns e.target.value directly',
  !/e\.target\.value\s*=\s*[^=]/.test(frontApp),
  'every rewrite goes through setInputValuePreservingCaret()'
);

/* ---------- 4. Studio debounces and coalesces ---------- */

const upd = functionBody(studioApp, 'updateViewer');
check(
  '4a. Studio updateViewer() is a debounce wrapper',
  upd !== null && /clearTimeout\(_updateViewerTimer\)/.test(upd) && /setTimeout\(/.test(upd),
  'one rebuild per typing burst, not one per keystroke'
);

check(
  '4b. Studio updateViewer() refuses to start a concurrent rebuild',
  upd !== null && /_updateViewerRunning/.test(upd) && /_updateViewerDirty\s*=\s*true/.test(upd),
  'overlapping viewer.update() calls would each run _clearKeychain() on the shared group'
);

const run = functionBody(studioApp, '_runUpdateViewer');
check(
  '4c. the rebuild clears its running flag and honours coalesced changes',
  run !== null
    && /_updateViewerRunning\s*=\s*true/.test(run)
    && /_updateViewerRunning\s*=\s*false/.test(run)
    && /if\s*\(_updateViewerDirty\)/.test(run),
  'a change that lands mid-build triggers exactly one more rebuild'
);

check(
  '4d. event handlers never call _runUpdateViewer() directly',
  (() => {
    // functionBody() spans '{'..'}', so the declaration's own name token is not
    // part of it — drop the declaration before counting call sites.
    const outside = studioApp
      .replace(functionBody(studioApp, '_runUpdateViewer') || '', '')
      .replace(/(async\s+)?function\s+_runUpdateViewer\s*\(\s*\)/g, '');
    const calls = (outside.match(/_runUpdateViewer\b/g) || []);
    // Permitted only inside updateViewer()/updateViewerNow() as a setTimeout target.
    const wrappers = (functionBody(studioApp, 'updateViewer') || '')
      + (functionBody(studioApp, 'updateViewerNow') || '');
    const inWrappers = (wrappers.match(/_runUpdateViewer\b/g) || []).length;
    return calls.length === inWrappers && inWrappers > 0;
  })(),
  'the debounce cannot be bypassed'
);

check(
  '4e. an undebounced path exists for init and product switching',
  functionBody(studioApp, 'updateViewerNow') !== null
    && /updateViewerNow\(\)/.test(studioApp),
  'switching product stays instant; only typing is debounced'
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
