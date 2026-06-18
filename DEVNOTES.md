# YoursGifts / Kishok — Dev Notes (working log)

_Last updated: 2026-06-18. Living doc for ongoing frontend/3D work._

## What this repo is
Static vanilla HTML/CSS/JS 3D-printed-keychain studio. **Two surfaces in one repo:**

| Surface | Lives in | Deploy |
|---|---|---|
| Marketing + customizer (root site) | repo root (`index.html`, `customize.html`, `viewer3d.js`, `script.js`, `styles.css`, `landing.css`, `tokens.css`, `landing-3d.js`) | **This is what Vercel serves at `/`** |
| Kiosk app (mobile, UPI) | `kiosk/public/` + `kiosk/server.js` | Lives at `/kiosk/public/…` on the same URL |

**Live URL:** https://kiosk-nine-tau.vercel.app/ → serves the **root** site.
Vercel Root Directory = repo root, so `kiosk/vercel.json` (`server.js` + `/api/*`) is **ignored** → the kiosk's UPI backend (`/api/batches`, QR, verify) returns 404 on this deployment. To make the kiosk the live homepage with UPI working, set Vercel **Root Directory = `kiosk`** and redeploy. (User chose to keep the root site as homepage, 2026-06-18.)

## Design system — "Maker Studio"
Replaced the old purple-on-white/Inter theme. Warm riso workshop:
- Tokens in `tokens.css` (root) and inlined into `kiosk/public/css/kiosk.css` (kiosk's `customize.css` inherits them).
- Palette: paper `#FBF6EE`, ink `#1A1714`, **vermilion `#FF4D2E`** (primary), cobalt `#1F4FD8`, gold `#E8A317`, WhatsApp green.
- Fonts: **Bricolage Grotesque** (display) / **Hanken Grotesk** (body) / **Space Mono** (numeric/mono).
- Stamped buttons (hard offset shadow), grain overlay, cutting-mat grid, extruded `t3d` text-shadow typography.
- Accessibility: focus rings, `prefers-reduced-motion`, aria-labels, lazy images, `font-display:swap`.

## The 3D engine (`viewer3d.js`) — shared
`KeychainViewer` class. `viewer.update(text, fontPath, {base,font,outline,line2}, layers, adminParams, productType, wordartFonts)`.
- Word Art: `text = "line1\nline2"`, per-line fonts via `wordartFonts:{top,bottom}` (paths), per-line colours `{font, line2}`.
- LOVE Series: pass top line only; viewer auto-appends `\nLOVE` + red heart, forces bottom font BagelFatOne.
- Tiles (`tilekey`): colours = base(strip)/font(letter)/line2(tile).

### Ring placement fix (2026-06-18)
OG bug: ring Y anchored to an arbitrary glyph path-command near the edge → off-center for some letters (P) but fine for others (Z).
Fixed to anchor on the text run's true vertical span (`glyphMinY/maxY` over all `shapes`). Then added a **`ring.anchor` option** ported from the **Achuva** project:
- `'top'` (default) = top-corner: `ringY = glyphMinY + ringOuter*0.5`
- `'center'` = `(glyphMinY+glyphMaxY)/2`
Applied to BOTH left & right branches. Tune height via the `ringOuter * 0.5` multiplier.
Customizer toggle ("Ring Attachment Position") was rewired from Left/Right/None → **Top Corner / Centered** (`state.ringAnchor` → dispatch → `getParamsPayload` → `ring:{anchor}` → `p.ring.anchor`). `ringPosition` stays `'left'`.

## Landing demo reel (`landing-3d.js`) — ES module
Loads the REAL `KeychainViewer` and auto-plays sample designs (types name → highlights font chip + swatch → rebuilds 3D). Mock customizer UI beside it. Reel pace 2.6s/scene. Scenes include POCs: LOVE Series, Letter Tiles, Word Art (2-line). Reduced-motion → one static design.

## Dev workflow / gotchas
- **Serve locally:** `cd /tmp/Kishok && python -m http.server 8000` (no build step).
- **ES module caching:** browsers cache `viewer3d.js` hard. After editing it, bump the `?v=` query in BOTH `landing-3d.js` import and `customize.html` import (currently `?v=poc4`). Then hard-refresh.
- Validate JS with `node --check`. CSS sanity = brace balance.
- **All JS-toggled classes must be preserved** when restyling: `.active .selected .show .has-selection .expanded .completed`.
- **Kiosk has its OWN viewer logic** under `kiosk/public/js/` — ring fix + anchor toggle applied to ROOT `viewer3d.js` only; port to kiosk if needed.

## Git / deploy
- No GitHub auth in the dev shell (askpass fails headless). User pushes from their own terminal, or via token inline (⚠️ a PAT was once pasted in chat — must be revoked; never paste tokens in chat).
- Wire `git config --global credential.helper manager` for browser login.
- Commits land locally in `/tmp/Kishok`; push to `main` → Vercel auto-deploys ~1 min.

## Reference project
**Achuva** (https://github.com/sakthivelprabakaran/Achuva.git) — Next.js port of this 3D engine (`src/lib/viewer3d.js`). Has the ring `position: 'top'|'center'` toggle we ported. Its top logic uses single-glyph `firstCharBox.y1`; ours improved to whole-run `glyphMinY`.

## Open / next ideas
- Word Art 2-line preview was the originally-broken path — verify both lines render.
- Optional: print-bed CSS behind the customizer's live viewer (needs WebGL canvas `alpha:true`, touches PNG export).
- Optional: apply ring fix + Maker Studio to the kiosk viewer/app.
- Push the landing-reel + ring work to `main` (committed locally, not yet pushed as of 2026-06-18).
