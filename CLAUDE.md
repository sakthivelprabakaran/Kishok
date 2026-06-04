# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project type

Pure static site — vanilla HTML/CSS/JS. No package.json, no bundler, no build step, no tests. Three.js and opentype.js are loaded from CDNs at runtime (Three.js via an importmap at version `0.170.0`, opentype.js via a `<script>` tag).

## Running locally

ES modules + `fetch()` of local font files require an HTTP server — `file://` will not work. Serve the project root with any static server, e.g.:

```bash
python -m http.server 8000
# then open http://localhost:8000/index.html
```

The two entry points are:

- `index.html` — customer-facing keychain designer
- `admin.html` — full-screen STL generation console

The legacy in-page admin sidebar on `index.html` (driven by `admin-panel.js`) is unhidden when the URL contains `?admin=true`. `admin.html` is the newer/preferred admin surface.

## Architecture

### Two front-ends, one 3D engine

`viewer3d.js` is the only ES module shared between pages. It exports the `KeychainViewer` class, which owns the entire Three.js scene, materials, font cache (via `opentype.js`), and STL/PNG export logic. Both pages instantiate one `KeychainViewer` against a container element.

| File | Loaded by | Module type | Role |
|---|---|---|---|
| `script.js` | `index.html` | classic (non-module) | UI state, font cards, swatches, price, WhatsApp message |
| `viewer3d.js` | both | ES module | Three.js scene, extrusion, exports |
| `admin-panel.js` | `index.html` (only when `?admin=true`) | classic | Legacy in-page STL controls sidebar |
| `admin-console.js` | `admin.html` | ES module | Full-screen STL console (text + font + colors + sliders, all in one) |

`script.js` is intentionally **not** a module so it can run inline-friendly DOM code without import/export. To talk to `viewer3d.js` (which *is* a module and lives in `index.html`'s `<script type="module">` block), it dispatches **custom DOM events on `window`**. This event bus is the primary cross-boundary contract:

- `font-selected` / `design-updated` — `script.js` → viewer module: rebuild 3D model with `{ text, fontFile, colors, layers }`
- `theme-changed` — `script.js` → `viewer3d.js`: swap scene background between dark/light
- `admin-rebuild` — `admin-panel.js` → viewer module: rebuild with new STL params
- `admin-request-dimensions` / `admin-dimensions-response` — round-trip for the live W/H/D readout
- `admin-export-stl` — trigger STL download with custom filename

`admin-console.js` skips the event bus entirely because it owns its own `KeychainViewer` instance directly.

### How the 3D model is built (`KeychainViewer.buildKeychain`)

1. `opentype.js` parses the TTF/OTF, produces a path for the input text.
2. The path is serialized as SVG and re-parsed via Three.js `SVGLoader` to produce `THREE.Shape` objects (this detour is what gives proper holes/contours).
3. The shapes are extruded **three times** to produce stacked layers, each with its own material:
   - **Base** (widest, widest bevel) — bottom layer, also the color of the ring
   - **Outline** (medium) — only built when `layers === '3L'`
   - **Text/Font** (narrowest) — top face
4. The keyring is a separate `THREE.Shape` with a circular hole, extruded to the base's thickness, and positioned by inspecting `firstCharPath.commands` to anchor it to the leftmost stroke of the first glyph.
5. The whole group is Y-flipped (`scale.y = -1`) because opentype/SVG are Y-down while Three.js is Y-up, then centered.

1 Three.js unit ≈ 1 mm — `getDimensions()` reports rounded mm values that the admin UIs display as the live W/H/D readout.

### Duplicated config

`FONTS` (the catalog of available fonts) and `COLOR_PALETTES` are **duplicated verbatim** in `script.js` and `admin-console.js`. If you add/remove a font or palette color, update **both** files. Font files live in `Fonts/` and are loaded directly by their relative path; the `name` field must match the family used in CSS/SVG previews (so it doubles as the CSS font-family).

### Presets are also duplicated

`PRESETS` (thin/standard/thick STL parameter bundles) exist in both `admin-panel.js` and `admin-console.js`, **with different values**. `admin-console.js` is the authoritative one for `admin.html`; `admin-panel.js` is for the legacy in-page sidebar. Don't assume they're in sync.

### Persistence

LocalStorage keys (no other persistence layer):

- `adminSTLParams` — legacy `admin-panel.js` slider values
- `adminConsoleParams` — `admin-console.js` slider values
- `adminConsoleState` — `admin-console.js` design state (name, lang, layers, font index, colors)

### Tamil transliteration

When `state.lang === 'ta'`, typing in Latin script triggers a debounced (450 ms) call to Google Input Tools (`https://inputtools.google.com/request?...&itc=ta-t-i0-und`) per word. Each word is replaced in-place; words already containing Tamil characters (`஀-௿`) are skipped. There is no API key, but the endpoint is third-party — failures fall back silently to the original text.

### WhatsApp order flow

`WHATSAPP_NUMBER` in `script.js` is a placeholder (`919876543210`). `buildWhatsAppMessage()` URL-encodes a multi-line summary; the button opens `https://wa.me/<number>?text=...`. The `addToCartBtn` is a stub with a comment noting where a WooCommerce AJAX hook would go.

### STL admin gating

The STL download button on `index.html` is hidden by default and revealed only when the URL contains `?admin=true` (inline script in `index.html`). There is **no real authentication** — this is a UX gate, not a security boundary. Treat STL export as a trusted-user feature, not a secret.

## When making changes

- Adding a font: drop the file in `Fonts/`, add a row to the `FONTS` array in **both** `script.js` and `admin-console.js`. The `name` must match the `font-family` you want for SVG previews.
- Adding a swatch color: update `COLOR_PALETTES` in **both** files.
- Changing 3D parameters: `KeychainViewer.getDefaults()` in `viewer3d.js` is the source of truth; the admin presets override these when the user picks one.
- Don't break the `font-selected` / `design-updated` / `admin-rebuild` event payloads — they are the only contract between `script.js` (classic) and the viewer (module).
