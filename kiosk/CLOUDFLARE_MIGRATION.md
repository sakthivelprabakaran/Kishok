# Migration: Vercel + Google Sheets → Cloudflare Pages + Supabase

## Why the two moves are one move

They are not independent. Cloudflare Pages Functions run on Workers, which has
**no Node filesystem and no Express**. The current backend is:

- `server.js` — Express + `helmet` + `cors` + `express-rate-limit`
- storage — Google Apps Script / Sheets when `GOOGLE_SCRIPT_URL` is set (it *is* set
  in production), with `exceljs` writing `data/orders.xlsx` as the local-dev fallback

None of that runs on Workers. So switching hosts forces the database swap — and the
good news is that the production code path was already pure `fetch` against an HTTP
endpoint, which is exactly the shape PostgREST wants. The port is mechanical.

## What already exists in this repo

```
kiosk/
├── supabase/schema.sql          ← run this once in the Supabase SQL editor
├── shared/                      ← helpers (outside functions/ so Pages doesn't route them)
│   ├── db.js                    ← PostgREST over plain fetch, no npm deps
│   ├── http.js                  ← json/CORS/admin-PIN/login-throttle
│   └── today.js                 ← timezone-explicit "today" range
├── functions/                   ← Cloudflare Pages Functions
│   ├── _middleware.js           ← CORS + security headers (replaces helmet)
│   ├── api/_middleware.js       ← unknown /api/* → JSON 404, never HTML
│   ├── api/health.js            ← GET  /api/health          (public)
│   ├── api/keepalive.js         ← GET  /api/keepalive       (public, real SELECT)
│   ├── api/batches.js           ← GET  /api/batches         (public)
│   │                              POST /api/batches         (admin)
│   ├── api/order/index.js       ← POST /api/order           (public)
│   ├── api/order/[id].js        ← PATCH /api/order/:id      (admin)
│   ├── api/orders/today.js      ← GET  /api/orders/today    (admin)
│   ├── api/summary/today.js     ← GET  /api/summary/today   (admin)
│   └── api/admin/{login,health}.js
├── public/_routes.json          ← only /api/* invokes a Function; static stays free
├── cron/                        ← standalone keep-alive Worker (Pages cannot do cron)
└── server.js                    ← UNTOUCHED, so Vercel keeps working until you cut over
```

The API contract is unchanged: same paths, same JSON shapes, same `x-admin-pin`
header. `kiosk-app.js` and `admin-dashboard.js` need **no changes**.

## Step 1 — Supabase project (you must do this; I have no account access)

1. supabase.com → New project. Pick the region closest to your customers
   (`ap-south-1` Mumbai for India). Save the database password somewhere safe.
2. SQL Editor → New query → paste all of `kiosk/supabase/schema.sql` → **Run**.
3. Project Settings → API. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`

> The `anon` key is not used. Only the Functions talk to the database, and they use
> `service_role`, which bypasses RLS. **Never** put `service_role` in client code —
> it is a full-access key. RLS is enabled with no policies precisely so that a leaked
> anon key grants nothing.

## Step 2 — Cloudflare Pages project

Dashboard route only, no CLI needed (nothing to install).

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git →
   pick `sakthivelprabakaran/Kishok`.
2. Build settings — these matter:
   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | *(leave empty)* |
   | Build output directory | `public` |
   | Root directory (advanced) | `kiosk` |

   Root directory `kiosk` mirrors what Vercel uses, so `functions/` is found at
   `kiosk/functions` and static assets come from `kiosk/public`.
3. Settings → Environment variables → add for **Production** (and Preview if you
   want previews to work):

   | Variable | Value | Type |
   |---|---|---|
   | `SUPABASE_URL` | from step 1 | plaintext |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 | **secret** |
   | `ADMIN_PIN` | your 4-digit operator PIN | **secret** |
   | `ALLOWED_ORIGIN` | your final origin, e.g. `https://yoursgifts.pages.dev` | plaintext |
   | `KIOSK_UTC_OFFSET_MINUTES` | `330` (IST) — optional, defaults to 330 | plaintext |

4. Deploy. You get `https://<project>.pages.dev`.

## Step 3 — Verify before switching anything

```bash
BASE=https://<project>.pages.dev

curl -s $BASE/api/health                        # {"ok":true,"backend":"supabase",...}
curl -s $BASE/api/batches                       # seeded RED/WHITE + BLACK/WHITE
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/orders/today          # 401
curl -s -H "x-admin-pin: <PIN>" $BASE/api/orders/today                   # [] or rows
curl -s -X POST $BASE/api/order -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"9999999999","productType":"wordart","text":"a/b","wordartBase":"hollow","weightG":34.6,"finalAmount":120}'
```

Then open `$BASE/customize.html?type=wordart` and place a test order end to end.
Delete the test rows afterwards from the Supabase table editor.

## Step 4 — Cut over

Vercel and Cloudflare can run side by side; they are separate deployments of the
same repo. Nothing breaks while you test.

- Custom domain: move the DNS record to Cloudflare Pages (Pages → Custom domains).
- No custom domain yet: just start sharing the `pages.dev` URL and set
  `ALLOWED_ORIGIN` to match.
- **Rollback** is instant: point traffic back at Vercel. `server.js` and
  `vercel.json` are untouched, so the old stack still works as long as
  `GOOGLE_SCRIPT_URL` stays configured there.

Once you are happy, delete the Vercel project and (optionally) `server.js`,
`package.json`, and `vercel.json` from `kiosk/`.

## Step 5 — Keep-alive Worker (stops the Supabase free-tier pause)

Cron Triggers exist on **Workers**, not Pages Functions, so this is a second, tiny
deployment. It has no database credentials — it just calls `/api/keepalive`, which
runs a real `SELECT`.

1. Workers & Pages → Create → **Worker**. Name it `yoursgifts-keepalive`.
2. Edit code → paste all of `kiosk/cron/keepalive-worker.js` → Deploy.
3. Settings → Variables → add `KIOSK_BASE_URL` = your Pages URL, no trailing slash
   (e.g. `https://yoursgifts.pages.dev`).
4. Settings → Triggers → Cron Triggers → Add → `0 6 * * *` (06:00 UTC = 11:30 IST).
5. Confirm it works by visiting the Worker's own URL — the `fetch` handler runs the
   same ping on demand and returns `{"ok":true,...}`.

`kiosk/cron/wrangler.toml` is there if you ever install wrangler and prefer
`wrangler deploy`. Nothing needs installing for the dashboard route.

## Free-tier limits worth knowing

**Supabase free**
- **Projects pause after 7 days of no activity.** Handled — see Step 5. Note that a
  keep-alive must run a *real query*; pinging `/api/health` would report "ok" while
  the project quietly idled into a pause, because health only reads env vars.
- 500 MB database, 5 GB egress/month. An order row is well under 1 KB, so 500 MB is
  roughly half a million orders — not a constraint.
- Two active projects per free org.

**Cloudflare Pages free**
- Static requests: unlimited, no bandwidth cap. This is a straight win over Vercel's
  100 GB/month.
- **Functions: 100,000 requests/day**, and `_routes.json` is what keeps static
  asset loads from counting against it.
- 500 builds/month, 1 concurrent build.
- No serverless cold-start penalty, and no "ephemeral /tmp" trap.

## Things this migration fixes on the way past

1. **`/tmp` data loss.** `server.js` sets `DATA_DIR = /tmp/kishok-data` on Vercel.
   Anything written there dies with the instance. It only ever mattered because
   `GOOGLE_SCRIPT_URL` short-circuits the Excel path — but the fallback was a trap.
2. **Racy order numbers.** Order numbers came from reading the last sheet row and
   adding one. Two simultaneous kiosk submissions could collide. Postgres assigns
   them from a sequence, atomically.
3. **In-memory `activeBatches` / `activeOrders`.** Module-level arrays in a
   serverless function are per-instance and vanish on cold start. Now they are rows.
4. **The Word Art backing never reached the operator.** The Sheets schema had no
   column for it, so `wordartBase` was dropped on the floor. `orders.wordart_base`
   stores it, and `/api/orders/today` returns it.
5. **Batch removal was dead code.** `parseInt(count) || 5` turned `0` into `5`, so
   the `countVal <= 0` removal branch could never fire. Fixed in the port.

## Existing order history

**Decision: start fresh.** Supabase begins empty and order numbers start at `0001`.
The Google Sheet behind `GOOGLE_SCRIPT_URL` stays untouched as a read-only archive —
do not delete it, and keep the env var set on Vercel so the old stack remains a
working rollback target.

If you later change your mind, export the sheet to CSV and use Supabase → Table
editor → `orders` → Import CSV, mapping the headers to snake_case
(`customer_name`, `text_value`, `weight_g`, …). Then move the sequence past the
highest imported number:
  ```sql
  select setval('public.order_num_seq', (select max(order_num::bigint) from public.orders));
  ```

## Testing without any account

`_fntest/` (untracked) runs every Function in Node against a stubbed PostgREST and
asserts the contract — auth gates, validation, day filtering, aggregation, throttling,
CORS, timeout-to-504, and JSON-not-HTML errors. 30/30 passing. Re-run with:

```bash
cd _fntest && node run.mjs
```
