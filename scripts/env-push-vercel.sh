#!/usr/bin/env bash
# Push all secrets from a Bitwarden Secrets Manager project to a Vercel project,
# scoped to Production, Preview, and Development.
#
# Existing env vars with the same name are deleted and replaced (true upsert),
# so this is destructive — Bitwarden becomes the source of truth.
#
# Requires:  bws CLI, jq, curl. (`brew install bitwarden/tap/bws jq`)
#
# Required env (export in your shell rc or pass inline):
#   BWS_ACCESS_TOKEN    — Bitwarden machine-account token
#   BWS_PROJECT_ID      — Bitwarden project ID
#   VERCEL_TOKEN        — Vercel personal access token (Settings → Tokens)
#   VERCEL_PROJECT_ID   — Vercel project ID (Project → Settings → General)
#
# Optional:
#   VERCEL_TEAM_ID      — only if the project lives under a team
#
# Usage:
#   ./scripts/env-push-vercel.sh
#
# After it finishes, redeploy on Vercel for the changes to take effect.

set -euo pipefail

: "${BWS_ACCESS_TOKEN:?Set BWS_ACCESS_TOKEN}"
: "${BWS_PROJECT_ID:?Set BWS_PROJECT_ID}"
: "${VERCEL_TOKEN:?Set VERCEL_TOKEN}"
: "${VERCEL_PROJECT_ID:?Set VERCEL_PROJECT_ID}"

for tool in bws jq curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool" >&2
    exit 1
  fi
done

team_qs=""
if [ -n "${VERCEL_TEAM_ID:-}" ]; then
  team_qs="?teamId=${VERCEL_TEAM_ID}"
fi

list_url="https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${team_qs}"
existing="$(curl -fsSL -H "Authorization: Bearer ${VERCEL_TOKEN}" "${list_url}")"

if [ "$(echo "${existing}" | jq -r 'type')" != "object" ]; then
  echo "Vercel API returned an unexpected response:" >&2
  echo "${existing}" >&2
  exit 1
fi

secrets="$(bws secret list "${BWS_PROJECT_ID}" --output json)"
secret_count=$(echo "${secrets}" | jq 'length')
echo "Read ${secret_count} secret(s) from Bitwarden."

pushed=0
echo "${secrets}" | jq -c '.[]' | while IFS= read -r row; do
  key=$(echo "$row" | jq -r '.key')
  value=$(echo "$row" | jq -r '.value')

  ids=$(echo "${existing}" | jq -r --arg k "$key" '.envs[] | select(.key == $k) | .id')
  for id in $ids; do
    del_url="https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${id}${team_qs}"
    curl -fsSL -X DELETE \
      -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      "${del_url}" >/dev/null
  done

  payload=$(jq -n \
    --arg k "$key" \
    --arg v "$value" \
    '{key: $k, value: $v, type: "encrypted", target: ["production","preview","development"]}')

  curl -fsSL -X POST \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${payload}" \
    "${list_url}" >/dev/null

  pushed=$((pushed + 1))
  echo "  ✓ ${key}"
done

echo
echo "Done. Redeploy on Vercel for the new values to take effect:"
echo "  vercel --prod"
