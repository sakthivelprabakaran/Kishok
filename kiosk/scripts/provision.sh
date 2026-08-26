#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# YoursGifts — provision Supabase + Cloudflare Pages from the command line.
#
# Uses only curl and python3. No npm, no wrangler, no supabase CLI — the npm
# registry here is authenticated (E401) and installing tooling is off the table.
#
# Your tokens NEVER leave this machine: they are read from the environment and
# only ever sent to api.supabase.com / api.cloudflare.com over HTTPS.
#
# ── Setup ────────────────────────────────────────────────────────────────────
#   Supabase → Account → Access Tokens → Generate new token
#     export SUPABASE_ACCESS_TOKEN=sbp_xxxxx
#     export SUPABASE_PROJECT_REF=abcdefghijklmnop      # the bit before .supabase.co
#
#   Cloudflare → My Profile → API Tokens → Create Token
#     Permissions needed:  Account · Cloudflare Pages · Edit
#     export CLOUDFLARE_API_TOKEN=xxxxx
#     export CLOUDFLARE_ACCOUNT_ID=xxxxx               # or let `check` find it
#     export CF_PAGES_PROJECT=kishok                   # your Pages project name
#
#   Values written into Pages (needed by `configure`):
#     export SUPABASE_URL=https://abcdefghijklmnop.supabase.co
#     export SUPABASE_SERVICE_ROLE_KEY=eyJ...          # stored as a Pages secret
#     export ADMIN_PIN=1234                            # stored as a Pages secret
#
# ── Usage ────────────────────────────────────────────────────────────────────
#   ./provision.sh check                 # read-only: tokens, account, project, config
#   ./provision.sh schema                # apply supabase/schema.sql
#   ./provision.sh configure             # set Pages build config + env vars
#   ./provision.sh deploy                # trigger a Pages deployment
#   ./provision.sh verify <base-url>     # curl every endpoint
#   ./provision.sh all                   # schema → configure → deploy
#
# Nothing writes anything until you run a write subcommand, and each one prints
# what it is about to change first.
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIOSK_DIR="$(dirname "$HERE")"
SCHEMA_FILE="$KIOSK_DIR/supabase/schema.sql"

SB_API="https://api.supabase.com/v1"
CF_API="https://api.cloudflare.com/client/v4"

# ── helpers ──────────────────────────────────────────────────────────────────

c_bold=$'\033[1m'; c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_off=$'\033[0m'
say()  { printf '%s\n' "$*"; }
head_() { printf '\n%s%s%s\n' "$c_bold" "$*" "$c_off"; }
ok()   { printf '  %s✓%s %s\n' "$c_grn" "$c_off" "$*"; }
warn() { printf '  %s!%s %s\n' "$c_ylw" "$c_off" "$*"; }
die()  { printf '  %s✗%s %s\n' "$c_red" "$c_off" "$*" >&2; exit 1; }

need_env() {
    local missing=()
    for v in "$@"; do [[ -z "${!v:-}" ]] && missing+=("$v"); done
    if (( ${#missing[@]} )); then
        die "missing environment variable(s): ${missing[*]}  (see the header of this script)"
    fi
}

json_get() {  # json_get '<json>' 'dotted.path'
    JSON="$1" PATHSPEC="$2" python - <<'PY'
import json, os, sys
try:
    data = json.loads(os.environ["JSON"] or "{}")
except Exception:
    sys.exit(1)
cur = data
for part in os.environ["PATHSPEC"].split("."):
    if part == "":
        continue
    if isinstance(cur, list):
        try: cur = cur[int(part)]
        except Exception: sys.exit(1)
    elif isinstance(cur, dict):
        if part not in cur: sys.exit(1)
        cur = cur[part]
    else:
        sys.exit(1)
print(cur if not isinstance(cur, (dict, list)) else json.dumps(cur))
PY
}

cf_ok() {  # true when a Cloudflare response has success:true
    [[ "$(json_get "$1" success 2>/dev/null)" == "True" ]]
}

cf_errors() { JSON="$1" python -c '
import json, os
d = json.loads(os.environ["JSON"] or "{}")
for e in (d.get("errors") or []):
    print(f"      [{e.get(\"code\")}] {e.get(\"message\")}")
'; }

# ── check ────────────────────────────────────────────────────────────────────

cmd_check() {
    head_ "Supabase"
    if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
        local r
        r="$(curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" "$SB_API/projects")"
        if [[ "$r" == \[* ]]; then
            ok "access token works"
            JSON="$r" python -c '
import json, os
for p in json.loads(os.environ["JSON"]):
    print(f"      {p.get(\"id\")}  {p.get(\"name\")}  region={p.get(\"region\")}  status={p.get(\"status\")}")
'
            [[ -n "${SUPABASE_PROJECT_REF:-}" ]] \
                && ok "using project ref: $SUPABASE_PROJECT_REF" \
                || warn "SUPABASE_PROJECT_REF not set — pick an id from the list above"
        else
            warn "token rejected or unexpected response: $(printf '%s' "$r" | head -c 200)"
        fi
    else
        warn "SUPABASE_ACCESS_TOKEN not set — skipping"
    fi

    head_ "Cloudflare"
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
        local v
        v="$(curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$CF_API/user/tokens/verify")"
        if cf_ok "$v"; then
            ok "API token is valid ($(json_get "$v" result.status))"
        else
            warn "token verify failed"; cf_errors "$v"
        fi

        local accts
        accts="$(curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$CF_API/accounts")"
        if cf_ok "$accts"; then
            JSON="$accts" python -c '
import json, os
for a in json.loads(os.environ["JSON"]).get("result", []):
    print(f"      account {a.get(\"id\")}  {a.get(\"name\")}")
'
        fi

        if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
            local projs
            projs="$(curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                "$CF_API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects")"
            if cf_ok "$projs"; then
                ok "Pages projects on this account:"
                JSON="$projs" python -c '
import json, os
for p in json.loads(os.environ["JSON"]).get("result", []):
    bc = p.get("build_config") or {}
    src = (p.get("source") or {}).get("config") or {}
    print(f"      {p.get(\"name\")}")
    print(f"        subdomain    : {p.get(\"subdomain\")}")
    print(f"        git repo     : {src.get(\"owner\")}/{src.get(\"repo_name\")} branch={src.get(\"production_branch\")}")
    print(f"        root_dir     : {bc.get(\"root_dir\")!r}   (must be \"kiosk\")")
    print(f"        output dir   : {bc.get(\"destination_dir\")!r}   (must be \"public\")")
    print(f"        build cmd    : {bc.get(\"build_command\")!r}   (must be empty)")
    env = ((p.get("deployment_configs") or {}).get("production") or {}).get("env_vars") or {}
    print(f"        env vars     : {sorted(env.keys()) or \"none set\"}")
'
            else
                warn "could not list Pages projects"; cf_errors "$projs"
            fi
        else
            warn "CLOUDFLARE_ACCOUNT_ID not set — copy one from the account list above"
        fi
    else
        warn "CLOUDFLARE_API_TOKEN not set — skipping"
    fi

    head_ "Local files"
    [[ -f "$SCHEMA_FILE" ]] && ok "schema found: $SCHEMA_FILE" || warn "schema missing: $SCHEMA_FILE"
}

# ── schema ───────────────────────────────────────────────────────────────────

cmd_schema() {
    need_env SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF
    [[ -f "$SCHEMA_FILE" ]] || die "schema not found: $SCHEMA_FILE"

    head_ "Applying schema to project $SUPABASE_PROJECT_REF"
    say "  $(wc -l < "$SCHEMA_FILE" | tr -d ' ') lines from $SCHEMA_FILE"
    say "  (the schema is idempotent — create table if not exists / on conflict do nothing)"

    local body
    body="$(SQL_FILE="$SCHEMA_FILE" python -c '
import json, os
print(json.dumps({"query": open(os.environ["SQL_FILE"], encoding="utf-8").read()}))
')"

    local r
    r="$(curl -sS -X POST "$SB_API/projects/$SUPABASE_PROJECT_REF/database/query" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        --data-binary "$body")"

    if printf '%s' "$r" | grep -qi '"message"'; then
        warn "Supabase replied with a message:"
        say "      $(printf '%s' "$r" | head -c 400)"
        say ""
        say "  If this endpoint is unavailable on your plan, paste the schema into"
        say "  the dashboard SQL Editor instead — same result:"
        say "    https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/sql/new"
        return 1
    fi
    ok "schema applied"

    head_ "Verifying tables"
    # Build the JSON in python — the SQL contains single quotes, which cannot be
    # nested inside a single-quoted shell string.
    local check_body check
    check_body="$(python - <<'PY'
import json
print(json.dumps({"query":
    "select table_name from information_schema.tables "
    "where table_schema = 'public' order by table_name;"}))
PY
)"
    check="$(curl -sS -X POST "$SB_API/projects/$SUPABASE_PROJECT_REF/database/query" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        --data-binary "$check_body")"
    say "      $check"
    say "  expected: batches, login_attempts, orders"
}

# ── configure ────────────────────────────────────────────────────────────────

cmd_configure() {
    need_env CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CF_PAGES_PROJECT \
             SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ADMIN_PIN

    head_ "Configuring Pages project '$CF_PAGES_PROJECT'"
    say "  build_config.root_dir        = kiosk"
    say "  build_config.destination_dir = public"
    say "  build_config.build_command   = (empty)"
    say "  env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret),"
    say "            ADMIN_PIN (secret), KIOSK_UTC_OFFSET_MINUTES"
    say ""

    local body
    body="$(SUPABASE_URL="$SUPABASE_URL" \
            SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
            ADMIN_PIN="$ADMIN_PIN" \
            OFFSET="${KIOSK_UTC_OFFSET_MINUTES:-330}" \
            ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-}" python - <<'PY'
import json, os
env = {
    "SUPABASE_URL":              {"type": "plain_text", "value": os.environ["SUPABASE_URL"]},
    "SUPABASE_SERVICE_ROLE_KEY": {"type": "secret_text", "value": os.environ["SUPABASE_SERVICE_ROLE_KEY"]},
    "ADMIN_PIN":                 {"type": "secret_text", "value": os.environ["ADMIN_PIN"]},
    "KIOSK_UTC_OFFSET_MINUTES":  {"type": "plain_text", "value": os.environ["OFFSET"]},
}
if os.environ.get("ALLOWED_ORIGIN"):
    env["ALLOWED_ORIGIN"] = {"type": "plain_text", "value": os.environ["ALLOWED_ORIGIN"]}
print(json.dumps({
    "build_config": {"build_command": "", "destination_dir": "public", "root_dir": "kiosk"},
    "deployment_configs": {"production": {"env_vars": env}},
}))
PY
)"

    local r
    r="$(curl -sS -X PATCH "$CF_API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$CF_PAGES_PROJECT" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data-binary "$body")"

    if cf_ok "$r"; then
        ok "project updated"
        say "      root_dir     = $(json_get "$r" result.build_config.root_dir)"
        say "      output dir   = $(json_get "$r" result.build_config.destination_dir)"
        say "      env vars set = $(JSON="$r" python -c '
import json, os
d = json.loads(os.environ["JSON"])
env = ((d["result"].get("deployment_configs") or {}).get("production") or {}).get("env_vars") or {}
print(sorted(env.keys()))
')"
        warn "secrets are write-only — Cloudflare will not echo their values back"
    else
        warn "update failed"; cf_errors "$r"
        say "      raw: $(printf '%s' "$r" | head -c 300)"
        return 1
    fi
}

# ── deploy ───────────────────────────────────────────────────────────────────

cmd_deploy() {
    need_env CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CF_PAGES_PROJECT
    head_ "Triggering a production deployment of '$CF_PAGES_PROJECT'"
    local r
    r="$(curl -sS -X POST "$CF_API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$CF_PAGES_PROJECT/deployments" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")"
    if cf_ok "$r"; then
        ok "deployment queued: $(json_get "$r" result.id)"
        say "      url: $(json_get "$r" result.url)"
        say "      watch: https://dash.cloudflare.com/?to=/:account/pages/view/$CF_PAGES_PROJECT"
    else
        warn "deploy failed"; cf_errors "$r"
        return 1
    fi
}

# ── verify ───────────────────────────────────────────────────────────────────

cmd_verify() {
    local base="${1:-}"
    [[ -n "$base" ]] || die "usage: provision.sh verify https://your-project.pages.dev"
    base="${base%/}"

    head_ "Verifying $base"
    local code

    code="$(curl -s -o /tmp/_pv_health -w '%{http_code}' "$base/api/health")"
    say "  GET /api/health           $code   $(head -c 160 /tmp/_pv_health)"

    code="$(curl -s -o /tmp/_pv_batches -w '%{http_code}' "$base/api/batches")"
    say "  GET /api/batches          $code   $(head -c 160 /tmp/_pv_batches)"

    code="$(curl -s -o /tmp/_pv_keep -w '%{http_code}' "$base/api/keepalive")"
    say "  GET /api/keepalive        $code   $(head -c 160 /tmp/_pv_keep)"

    code="$(curl -s -o /dev/null -w '%{http_code}' "$base/api/orders/today")"
    say "  GET /api/orders/today     $code   (401 expected — admin gate)"

    code="$(curl -s -o /dev/null -w '%{http_code}' "$base/api/nope")"
    say "  GET /api/nope             $code   (404 JSON expected)"

    for p in / /customize.html /studio.html /privacy.html; do
        code="$(curl -s -o /dev/null -w '%{http_code}' "$base$p")"
        say "  GET $p$(printf '%*s' $((24 - ${#p})) '')$code"
    done

    head_ "Next"
    say "  Place one real test order through $base/customize.html?type=wordart,"
    say "  then delete the row in the Supabase table editor."
}

# ── main ─────────────────────────────────────────────────────────────────────

case "${1:-}" in
    check)     cmd_check ;;
    schema)    cmd_schema ;;
    configure) cmd_configure ;;
    deploy)    cmd_deploy ;;
    verify)    shift; cmd_verify "$@" ;;
    all)       cmd_schema && cmd_configure && cmd_deploy ;;
    *)
        sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
        exit 1 ;;
esac
