# YoursGifts — custom 3D-printed gifts

Static site + 3D customiser for made-to-order keychains, nameplates, letter tiles
and word art. Customers design a piece in the browser, see it in 3D, pay by UPI,
and collect it from the kiosk in 15–20 minutes.

No build step, no bundler, no package manager for the frontend. Three.js,
opentype.js and clipper-lib load from CDNs at runtime.

---

## ⚠️ Read this first: there are two storefronts, and only one is live

The repo contains a **current app** and a **dead legacy site** with near-identical
filenames. Editing the wrong half changes nothing.

| | Repo root (legacy) | `kiosk/` (**LIVE**) |
|---|---|---|
| Storefront | `index.html`, `customize.html`, `script.js` | `kiosk/public/index.html`, `customize.html`, `js/kiosk-app.js` |
| STL studio | `admin.html` + `admin-console.js` | `kiosk/public/studio.html` + `admin-console.js` |
| 3D engine | `viewer3d.js` | `kiosk/public/js/viewer3d.js` |
| Served in production | **nothing** | **everything** |

**Vercel's Root Directory is `kiosk`.** Verified: live `/customize.html` is
byte-identical to `kiosk/public/customize.html` and loads `kiosk-app.js`;
`/studio.html` and `/api/health` return 200; `/kiosk/*` returns 404 (there is no
`kiosk/` inside `kiosk/`).

So: **work in `kiosk/`.** The root copies are kept only so the two don't drift if
the legacy site is ever revived, and several files are deliberately mirrored — see
"Mirrored files" below.

Live site: <https://kiosk-nine-tau.vercel.app>

---

## Repo map

```
kiosk/                          ← the live app (Vercel root directory)
├── public/                     ← static assets, served as the site root
│   ├── index.html              ← product catalogue
│   ├── customize.html          ← designer  (?type=wordart, ?type=keychain, …)
│   ├── studio.html             ← STL Studio, operator PIN gated
│   ├── admin.html              ← order dashboard, operator PIN gated
│   ├── privacy|terms|refund|contact.html   ← policy pages
│   ├── js/viewer3d.js          ← THE 3D ENGINE (Three.js scene, extrusion, STL export)
│   ├── js/kiosk-app.js         ← storefront UI, cost engine, UPI flow
│   ├── js/legal-details.js     ← business identity used by the policy pages
│   ├── admin-console.js        ← STL Studio controls
│   └── _routes.json            ← Cloudflare: only /api/* invokes a Function
├── functions/                  ← Cloudflare Pages Functions (the new API)
├── shared/                     ← db/http/today helpers for those Functions
├── supabase/schema.sql         ← Postgres schema
├── cron/                       ← standalone keep-alive Worker
├── scripts/provision.sh        ← CLI provisioning (curl + python, no installs)
├── server.js                   ← the CURRENT API: Express, on Vercel
└── CLOUDFLARE_MIGRATION.md     ← runbook for the migration in progress
```

## Run it locally

ES modules and `fetch()` of local fonts need a real HTTP server; `file://` will not
work. Serve **`kiosk/public`**, because that is what production serves as `/`:

```bash
cd kiosk/public
python -m http.server 8780
# http://localhost:8780/index.html
```

The `/api/*` routes will 404 locally unless you also run the Express server
(`cd kiosk && node server.js`, needs `npm install`). Most frontend work does not
need them — only the batch-savings banner and order submission do.

## Deployment

**Today:** Vercel. Root Directory `kiosk`; `kiosk/vercel.json` routes `/api/*` to
`server.js` and everything else to `public/`. The database is a Google Apps Script
sheet behind the `GOOGLE_SCRIPT_URL` env var.

**In progress:** Cloudflare Pages + Supabase Postgres. All the code is on `main`
and inert until provisioned, so both stacks can run side by side and rollback is
just pointing traffic back. Start here:

- **[`kiosk/CLOUDFLARE_MIGRATION.md`](kiosk/CLOUDFLARE_MIGRATION.md)** — the full runbook: schema, Pages
  settings, env vars, cutover, rollback, free-tier limits, and the bugs the
  migration fixes on the way past.
- **[`kiosk/scripts/provision.sh`](kiosk/scripts/provision.sh)** — does it from the command line with `curl` +
  `python` only. Run `./provision.sh check` first; it is read-only and prints
  exactly which settings are wrong. (`wrangler`/`supabase` CLI are not usable
  here: npm is behind an authenticated registry, and `wrangler pages` cannot
  configure a Git-connected project's `root_dir` anyway.)

## Mirrored files — change both

Some files exist twice, once live and once legacy. Keep them in step:

| Live | Legacy mirror |
|---|---|
| `kiosk/public/js/viewer3d.js` | `viewer3d.js` |
| `kiosk/public/admin-console.js` | `admin-console.js` |
| `kiosk/public/admin-console.css` | `admin-console.css` |

Also duplicated *within* each side: the `FONTS` and `COLOR_PALETTES` arrays
(`kiosk-app.js` + `admin-console.js`) and the `PRESETS` bundles. Adding a font or
a swatch means editing both.

## Cache busting

Assets are versioned with `?v=` query strings (`viewer3d.js?v=wa1`,
`css/customize.css?v=wa1`). **Bump the token whenever you change the file**, or
returning visitors get stale code — this has bitten before, and it is worst for
ES-module imports because the browser caches them aggressively.

## Printability

`KeychainViewer.validatePrintability(params, productType)` is the FDM guard: hard
errors below 0.8 mm (2 perimeters at a 0.4 mm nozzle), warnings below 1.2 mm, plus
keyring geometry checks. Both STL Studios show it as a panel and **disable STL
export while errors stand**.

Two things it has to account for, and so do you:

1. An extruded layer's real thickness is `depth + 2 × bevelThickness`.
2. `scaleFactor` means different things per product. The main path (keychain,
   nameplate, word art, LOVE Series, linked initials) scales the *font size*, so
   the depth sliders are already true millimetres. Eight specialised builders
   (tile keys, nametag, girly, bordered, supported, flower, both LED products)
   scale the whole assembly, so their depths are baked-in constants × `scaleFactor`.

## Open before go-live

- **Payment is self-attested.** The customer types a 12-digit UPI reference and
  only its format is checked; nothing verifies the money arrived. Either enforce
  "operator confirms in the UPI app before marking Verified", or move to a
  payment gateway with webhook verification.
- **Provision Supabase + Cloudflare** (above).
- **Admin PIN is 4 digits**, guarding every customer name and phone number.
  Consider Cloudflare Access in front of `studio.html` / `admin.html`.
- **The legacy root site** should be deleted or left clearly marked.

## Other docs

- [`CLAUDE.md`](CLAUDE.md) — architecture notes and conventions for AI assistants
- [`DEVNOTES.md`](DEVNOTES.md) — running design/3D working notes
