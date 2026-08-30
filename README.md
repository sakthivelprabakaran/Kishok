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

**Today (legacy):** Vercel. Root Directory `kiosk`; `kiosk/vercel.json` routes `/api/*` to
`server.js` and everything else to `public/`. The database is a Google Apps Script
sheet behind the `GOOGLE_SCRIPT_URL` env var.

**Now live (migrated): Cloudflare Pages + Supabase Postgres.** All code is on `main`
and both stacks can run side-by-side — rollback is just pointing DNS/traffic back.
Detailed runbook: [`kiosk/CLOUDFLARE_MIGRATION.md`](kiosk/CLOUDFLARE_MIGRATION.md).

### Cloudflare + Supabase — what is integrated

#### 1. Supabase (Postgres + PostgREST)

**Schema** `kiosk/supabase/schema.sql` — run once in Supabase SQL Editor (idempotent):

| Object | Purpose | Notes |
|---|---|---|
| `sequence public.order_num_seq` | Atomic order numbers → `0001`, `0002`… via `lpad(nextval(...),4,'0')` | Replaces race-prone `lastRow+1` Sheets logic |
| `table public.orders` | All kiosk orders | `order_num` unique, `created_at timestamptz`, `customer_name/phone/product_type/text_value/wordart_base/font/base_color/font_color`, costs `weight_g/print_time_mins/material_cost/machine_cost/labor_cost/production_cost/final_amount`, `batch_size`, `upi_txn_id`, `status Pending/Verified/Printed/Cancelled`; added `wordart_base none/solid/hollow` (Sheets had no column, choice was dropped) |
| `table public.batches` | Active filament combos for Batch Savings | `base_color/font_color` unique, `name`, `count`, `updated_at`; seeded `RED/WHITE #FF6251/#FFFFFF ×5`, `BLACK/WHITE #000000/#FFFFFF ×3` |
| `table public.login_attempts` | Admin PIN rate-limit store | `ip`, `at timestamptz`; replaces `express-rate-limit` memory store (Workers have no durable process memory) |
| `indexes` | `orders_created_at_idx desc`, `orders_status_idx`, `login_attempts_ip_at_idx` | Powers `/api/orders/today` & `/api/summary/today` |
| `function public.prune_login_attempts()` | `security definer` helper — `delete where at < now()-1day` | Called by cron/cleanup; **revoked from `anon,authenticated,public`** so anon PostgREST key cannot invoke RPC |
| `RLS` | `enable row level security` on all 3 tables, **no policies** | `service_role` bypasses RLS; `anon` key leaks → reads nothing |

Access model: Pages Functions use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only) via PostgREST. Never expose `service_role` to client. `anon` key is unused.

#### 2. Shared helpers (dependency-free)

| File | Replaces | Role |
|---|---|---|
| `kiosk/shared/db.js` | `@supabase/supabase-js` + `exceljs` Sheets path | Plain `fetch` PostgREST client, `DEFAULT_TIMEOUT_MS 8000` with `AbortSignal.timeout` → `504` on stall. Exports `db(env).select/insert/insertQuiet/upsert/update/remove`, plus `rowToOrder/rowToBatch/orderToRow` translators (snake_case DB ↔ camelCase frontend, so `kiosk-app.js`/`admin-dashboard.js` unchanged). Handles `wordartBase` allowlist, `batchSize parseInt` fix (`0` no longer → `5`). |
| `kiosk/shared/http.js` | `helmet` + `cors` + `express-rate-limit` | `json/fail/errorResponse/guard/readJson`, `adminConfigured/requireAdmin` (4-digit `ADMIN_PIN` with timing-safe `pinMatches`), `clientIp` (`CF-Connecting-IP` → `x-forwarded-for`), `loginBlocked/recordLoginAttempt` (10/15 min window via `login_attempts` table, fail-open), `corsHeaders` (echoes `ALLOWED_ORIGIN` only on exact `Origin` match, `Access-Control-Allow-Methods GET,POST,PATCH,OPTIONS`, `Vary: Origin`). |
| `kiosk/shared/today.js` | Vercel ambient TZ | `todayRangeIso(env)` — IST-explicit (`KIOSK_UTC_OFFSET_MINUTES` default `330`) → `{start,end}` ISO for `created_at gte/lt` queries. Prevents late-evening IST orders landing on yesterday's sheet. |

#### 3. Cloudflare Pages Functions (`kiosk/functions/`)

API contract is **unchanged** — same paths, JSON shapes, `x-admin-pin` header. Frontend needs zero changes.

| Function | Method | Auth | Description |
|---|---|---|---|
| `functions/_middleware.js` | * | — | Global: answers `OPTIONS 204` CORS preflight, proxies `next()`, adds `corsHeaders`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` (replaces `helmet`), JSON-errors on unhandled throw |
| `functions/api/_middleware.js` | * | — | Unknown `/api/*` → `404 {error:"API route not found"}` JSON (never HTML, fixes `Unexpected token '<'` fetch bug) |
| `functions/api/health.js` | `GET /api/health` | public | `{ok, service:"kiosk-api", backend:"supabase", cloudSyncConfigured, timestamp}` — mirrors old shape |
| `functions/api/keepalive.js` | `GET /api/keepalive` | public | **Real DB ping** `select batches limit 1` → `{ok, queried:"batches", rows, timestamp}`. Health only reads env vars and would let Supabase idle-pause; keepalive proves DB is hot |
| `functions/api/batches.js` | `GET /api/batches` | public | All batches `order=updated_at.desc` → `rowToBatch[]` (storefront Batch Savings banner) |
| | `POST /api/batches` | admin `x-admin-pin` | Upsert `{baseColor,fontColor,count}`; `count<=0` deletes; fixes `parseInt(count)||5` dead-code (now `Number.isFinite(parsed)?parsed:5` so `0` actually removes) |
| `functions/api/order/index.js` | `POST /api/order` | public | Validates `name/phone/productType/text`, `productType ≤40`, inserts `orderToRow(body)` via sequence → `201 {orderNum, order}` |
| `functions/api/order/[id].js` | `PATCH /api/order/:id` | admin | Updates `status ∈ Pending/Verified/Printed/Cancelled` + `upiTxnId` where `order_num=eq.id` → `404` if miss |
| `functions/api/orders/today.js` | `GET /api/orders/today` | admin | `todayRangeIso` filtered `created_at gte start lt end order=created_at.desc` → `rowToOrder[]` |
| `functions/api/summary/today.js` | `GET /api/summary/today` | admin | Aggregates today: `totalOrders/paidOrders/pendingPrints/revenue/filamentGrams` + `topCombos` by `baseColor|fontColor` from `Verified/Printed` |
| `functions/api/admin/login.js` | `POST /api/admin/login` | — | Throttled: `loginBlocked(ip)` → `429`, `pin` 4-digit check → `400`, `pin===ADMIN_PIN →200 {success:true}` else `recordLoginAttempt` + `401` (only failures count) |
| `functions/api/admin/health.js` | `GET /api/admin/health` | admin | PIN gate check → `{adminPinConfigured, status:"ok"}` |

#### 4. Routing & static

- `kiosk/public/_routes.json:1` `{"version":1,"include":["/api/*"]}` — only `/api/*` invokes a Function; every static asset (Three.js, fonts) is served directly and **does not count against the 100k/day Functions quota**.
- `kiosk/vercel.json:1` retained untouched for rollback: `builds [server.js → @vercel/node, public/** → @vercel/static]`, `routes /api/* → server.js`, `/ → public/$1`. Vercel Root Directory `kiosk` ≡ Cloudflare `build_config.root_dir = "kiosk"`.

#### 5. Keep-alive Worker (separate from Pages)

Pages Functions cannot have Cron Triggers — so `kiosk/cron/` is a second deployment:

- `kiosk/cron/keepalive-worker.js:1` — Worker with `scheduled` (cron) + `fetch` (manual) handlers; `fetch(${KIOSK_BASE_URL}/api/keepalive, {signal: AbortSignal.timeout(10000)})` and logs success/failure. Needs **zero DB credentials**.
- `kiosk/cron/wrangler.toml:1` `name="yoursgifts-keepalive"`, `compatibility_date 2026-08-26`, `triggers.crons = ["0 6 * * *"]` (06:00 UTC = 11:30 IST, well inside 7-day pause window). Vars `KIOSK_BASE_URL = https://REPLACE-ME.pages.dev` (set in dashboard).

Deploy: Workers & Pages → Create → Worker → paste `keepalive-worker.js` → Settings → Variables `KIOSK_BASE_URL` → Triggers → Cron `0 6 * * *` → visit Worker URL to verify `{ok:true}`.

#### 6. Environment variables

| Var | Where | Type | Required | Description |
|---|---|---|---|---|
| `SUPABASE_URL` | Pages | plain | yes | `https://<ref>.supabase.co` (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Pages | **secret** | yes | `service_role` key — bypasses RLS, server only |
| `ADMIN_PIN` | Pages | **secret** | yes | 4-digit operator PIN (`/^\d{4}$/`) |
| `ALLOWED_ORIGIN` | Pages | plain | no | Exact origin to echo in `Access-Control-Allow-Origin`, e.g. `https://yoursgifts.pages.dev`. Same-origin kiosk needs no header. |
| `KIOSK_UTC_OFFSET_MINUTES` | Pages | plain | no | `330` default (IST). Controls “today” window |
| `KIOSK_BASE_URL` | Worker | plain | yes (worker) | Pages URL without trailing slash for keepalive fetch |
| `GOOGLE_SCRIPT_URL` | Vercel (legacy) | secret | for rollback | Sheets backend — keep set so old stack stays rollback-ready |

#### 7. Provisioning automation

**`kiosk/scripts/provision.sh:1`** — zero-install (only `curl` + `python3`) CLI; npm registry is authenticated, `wrangler pages` cannot set `root_dir` on Git-connected projects.

```bash
./provision.sh check                 # read-only: verifies Supabase token, Cloudflare token/account, Pages project root_dir/output/buildCmd/envVars, local schema presence
./provision.sh schema                # POST schema.sql to Supabase via /v1/projects/<ref>/database/query (idempotent), then verifies tables batches/login_attempts/orders
./provision.sh configure             # PATCH Cloudflare Pages: build_config {root_dir:"kiosk", destination_dir:"public", build_command:""}, env_vars production {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY*, ADMIN_PIN*, KIOSK_UTC_OFFSET_MINUTES, ALLOWED_ORIGIN}
./provision.sh deploy                # POST /accounts/<id>/pages/projects/<name>/deployments
./provision.sh verify <base-url>     # curls /api/health /api/batches /api/keepalive /api/orders/today(→401) /api/nope(→404 JSON) and static routes
./provision.sh all                   # schema → configure → deploy
```

Flow: `export SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROJECT_REF=… CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… CF_PAGES_PROJECT=… SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… ADMIN_PIN=…` then run above. Secrets never leave machine except over HTTPS to `api.supabase.com`/`api.cloudflare.com`.

#### 8. Pages project settings (dashboard)

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `public` |
| Root directory (advanced) | `kiosk` |
| Env vars Production (+Preview if needed) | See table above |

Verify after deploy:

```bash
BASE=https://<project>.pages.dev
curl -s $BASE/api/health                          # {"ok":true,"backend":"supabase"}
curl -s $BASE/api/batches                         # seeded RED/WHITE + BLACK/WHITE
curl -s -w '%{http_code}\n' $BASE/api/orders/today # 401
curl -s -H "x-admin-pin: <PIN>" $BASE/api/orders/today
curl -s -X POST $BASE/api/order -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"9999999999","productType":"wordart","text":"a/b","wordartBase":"hollow","weightG":34.6,"finalAmount":120}'
```

Then `open $BASE/customize.html?type=wordart` end-to-end, delete test rows in Supabase table editor.

#### 9. Cutover & rollback

- Both Vercel and Pages can run concurrently (separate deployments). Move DNS (Pages → Custom domains) or just share `pages.dev` URL.
- **Rollback instant:** point traffic back to Vercel — `server.js`/`vercel.json` untouched, `GOOGLE_SCRIPT_URL` still set, sheet stays as read-only archive.
- To retire Vercel: delete project, optionally remove `server.js`/`vercel.json`/`package.json` from `kiosk/`.

#### 10. Free-tier limits & fixes

**Supabase free:** 7-day pause without DB activity (solved by keepalive daily `SELECT`), 500 MB DB (~500k orders), 5 GB egress, 2 projects/org.
**Cloudflare Pages free:** Static unlimited (win over Vercel 100 GB), **Functions 100k req/day** (`_routes.json` protects it), 500 builds/month.

Migration fixes on the way past:
1. `/tmp/kishok-data` loss on Vercel (ephemeral) → Postgres durable.
2. Race on `lastRow+1` order numbers → `order_num_seq` atomic.
3. In-memory `activeBatches/activeOrders` lost on cold start → rows.
4. `wordartBase` dropped (no Sheets column) → `orders.wordart_base`.
5. Batch `count=0` dead code (`parseInt||5 →5`) → now removable.

Existing history: Supabase starts at `0001`; sheet stays archive. To import history: CSV → Supabase Table Editor → `select setval('public.order_num_seq', max(order_num::bigint))`.

**Testing without accounts:** `_fntest/` (untracked) runs Functions in Node against stubbed PostgREST — `cd _fntest && node run.mjs` (30/30).

Start here:

- **[`kiosk/CLOUDFLARE_MIGRATION.md`](kiosk/CLOUDFLARE_MIGRATION.md)** — verbatim runbook (this section is its distilled form)
- **[`kiosk/scripts/provision.sh`](kiosk/scripts/provision.sh)** — read-only `check` first, then `all`

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
