#!/usr/bin/env bash
# One-shot launch-environment provisioning for sideletters.ectotropy.com.
#
# What it does (idempotent — safe to re-run):
#   1. Creates the Upstash Redis database "sideletters" (us-east-1, TLS) via the
#      management API if it does not exist yet.
#   2. Wires Vercel env (Production/Preview/Development) with a matching pair of
#      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, plus RESEND_API_KEY and
#      SESSION_SECRET (generated on first run, then reused from Bitwarden).
#   3. Wires STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET too, once they exist in the
#      Bitwarden "vercel" project (add them with bws-add after creating them in the
#      Stripe dashboard). Until then it prints a reminder.
#   4. Mirrors every value it sets into the Bitwarden "vercel" project so the
#      vault stays the source of truth. No secret value is ever printed.
#
# Requires: bws, jq, curl, vercel (logged in). Reads the BWS token from
# $BWS_ACCESS_TOKEN, the macOS keychain item "bws-admin", or ~/.env.secrets.
#
# Run it from anywhere:
#   bash /Users/christian/VSCode/Side-letter-extractor/scripts/provision-launch-env.sh

set -euo pipefail

UPSTASH_EMAIL="${UPSTASH_EMAIL:-chsbusch@gmail.com}"
BWS_PROJECT="${BWS_VERCEL_PROJECT_ID:-3b3ce56b-b80a-4aa5-a8d3-b45f014b75db}" # BWS project "vercel"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="sideletters"
DB_REGION="us-east-1"
ENVS=(production preview development)

log() { printf '%s\n' "$*"; }

bws_token() {
  if [[ -n "${BWS_ACCESS_TOKEN:-}" ]]; then printf '%s' "$BWS_ACCESS_TOKEN"; return; fi
  local t
  if t=$(security find-generic-password -s bws-admin -w 2>/dev/null) && [[ -n "$t" ]]; then
    printf '%s' "$t"; return
  fi
  t=$(grep -E '^(export )?BWS_ACCESS_TOKEN=' ~/.env.secrets 2>/dev/null | head -1 || true)
  t="${t#*=}"; t="${t%\"}"; t="${t#\"}"
  [[ -n "$t" ]] && { printf '%s' "$t"; return; }
  echo "No BWS token found (env, keychain 'bws-admin', or ~/.env.secrets)." >&2
  exit 1
}

TOKEN="$(bws_token)"

bws_get() { # bws_get KEY -> value on stdout, empty if absent
  local id
  id=$(BWS_ACCESS_TOKEN="$TOKEN" bws secret list "$BWS_PROJECT" -o json 2>/dev/null |
    jq -r --arg k "$1" '.[] | select(.key==$k) | .id' | head -1)
  [[ -z "$id" ]] && return 0
  BWS_ACCESS_TOKEN="$TOKEN" bws secret get "$id" -o json | jq -r .value
}

bws_put_if_absent() { # bws_put_if_absent KEY VALUE NOTE
  local existing
  existing=$(BWS_ACCESS_TOKEN="$TOKEN" bws secret list "$BWS_PROJECT" -o json 2>/dev/null |
    jq -r --arg k "$1" '.[] | select(.key==$k) | .id' | head -1)
  if [[ -n "$existing" ]]; then return 0; fi
  BWS_ACCESS_TOKEN="$TOKEN" bws secret create "$1" "$2" "$BWS_PROJECT" --note "$3" -o none
  log "  vault: stored $1"
}

vercel_set() { # vercel_set NAME VALUE — upsert across all three environments
  local name="$1" value="$2" env
  for env in "${ENVS[@]}"; do
    vercel env rm "$name" "$env" -y --cwd "$REPO_DIR" >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$env" --cwd "$REPO_DIR" >/dev/null
  done
  log "  vercel: set $name (production, preview, development)"
}

# --- 1. Upstash database -----------------------------------------------------
UPSTASH_KEY="$(bws_get UPSTASH_API_KEY)"
if [[ -z "$UPSTASH_KEY" ]]; then
  echo "UPSTASH_API_KEY missing in the BWS 'vercel' project." >&2
  exit 1
fi

log "Checking Upstash for database '$DB_NAME'…"
DB_JSON=$(curl -sf -u "$UPSTASH_EMAIL:$UPSTASH_KEY" https://api.upstash.com/v2/redis/databases |
  jq -r --arg n "$DB_NAME" '.[] | select(.database_name==$n)' | head -60)

if [[ -z "$DB_JSON" ]]; then
  log "  not found — creating ($DB_REGION, TLS)…"
  DB_JSON=$(curl -sf -u "$UPSTASH_EMAIL:$UPSTASH_KEY" -X POST \
    https://api.upstash.com/v2/redis/database \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$DB_NAME\",\"region\":\"$DB_REGION\",\"tls\":true}")
  log "  created."
else
  log "  found existing database."
fi

DB_ID=$(printf '%s' "$DB_JSON" | jq -r '.database_id')
DETAILS=$(curl -sf -u "$UPSTASH_EMAIL:$UPSTASH_KEY" "https://api.upstash.com/v2/redis/database/$DB_ID")
REST_URL="https://$(printf '%s' "$DETAILS" | jq -r '.endpoint')"
REST_TOKEN=$(printf '%s' "$DETAILS" | jq -r '.rest_token')

# --- 2. Session secret (create once, then stable) ----------------------------
SESSION_SECRET="$(bws_get SESSION_SECRET)"
if [[ -z "$SESSION_SECRET" ]]; then
  SESSION_SECRET=$(openssl rand -base64 48)
  log "Generated a new SESSION_SECRET."
fi

RESEND_KEY="$(bws_get RESEND_API_KEY)"
if [[ -z "$RESEND_KEY" ]]; then
  echo "RESEND_API_KEY missing in the BWS 'vercel' project." >&2
  exit 1
fi

# --- 3. Wire Vercel ----------------------------------------------------------
log "Writing Vercel environment variables…"
vercel_set UPSTASH_REDIS_REST_URL "$REST_URL"
vercel_set UPSTASH_REDIS_REST_TOKEN "$REST_TOKEN"
vercel_set RESEND_API_KEY "$RESEND_KEY"
vercel_set SESSION_SECRET "$SESSION_SECRET"

STRIPE_KEY="$(bws_get STRIPE_SECRET_KEY)"
STRIPE_WH="$(bws_get STRIPE_WEBHOOK_SECRET)"
if [[ -n "$STRIPE_KEY" ]]; then
  vercel_set STRIPE_SECRET_KEY "$STRIPE_KEY"
else
  log "  NOTE: STRIPE_SECRET_KEY not in the vault yet — payments stay disabled."
  log "        Create it in the Stripe dashboard, then:  bws-add STRIPE_SECRET_KEY"
fi
if [[ -n "$STRIPE_WH" ]]; then
  vercel_set STRIPE_WEBHOOK_SECRET "$STRIPE_WH"
else
  log "  NOTE: STRIPE_WEBHOOK_SECRET not in the vault yet. In Stripe: add a webhook"
  log "        endpoint https://sideletters.ectotropy.com/api/stripe/webhook for the"
  log "        event checkout.session.completed, then:  bws-add STRIPE_WEBHOOK_SECRET"
fi

# --- 4. Mirror into the vault ------------------------------------------------
log "Mirroring values into the BWS 'vercel' project…"
bws_put_if_absent UPSTASH_REDIS_REST_URL "$REST_URL" "sideletters Upstash REST URL"
bws_put_if_absent UPSTASH_REDIS_REST_TOKEN "$REST_TOKEN" "sideletters Upstash REST token"
bws_put_if_absent SESSION_SECRET "$SESSION_SECRET" "sideletters session cookie signing key"

log ""
log "Done. Redeploy for the new env to take effect:"
log "  vercel redeploy --cwd $REPO_DIR   (or merge the open PR — main auto-deploys)"
