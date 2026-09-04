#!/usr/bin/env bash
# Deploys the "inventra" Cloudflare Pages project (feature/paywall-accounting),
# which has its own D1 database and KV namespace, separate from production
# ("openstock", wrangler.toml, main branch).
#
# Cloudflare Pages only reads bindings from a default-named wrangler.toml (no
# --config support), so this script temporarily swaps it in, deploys, and
# always restores the original production wrangler.toml afterward.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f wrangler.toml ]; then
  echo "wrangler.toml not found — aborting." >&2
  exit 1
fi

cp wrangler.toml wrangler.toml.prod-backup
restore() {
  mv -f wrangler.toml.prod-backup wrangler.toml
}
trap restore EXIT

cp wrangler.inventra.toml wrangler.toml

npx nuxi build --preset=cloudflare-pages
npx wrangler pages deploy dist --project-name inventra --branch feature/paywall-accounting "$@"
