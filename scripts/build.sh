#!/usr/bin/env bash
# Build every plugin package with the harness's pinned toolchain (this repo
# has no pnpm install of its own — @deepseek-ai types resolve through
# scripts/link-harness.sh). Emits each package's node half (lib/index.js) and
# browser bundle (lib/client.js).
#
# Usage: ./scripts/build.sh   (DSH_HARNESS overrides ../deepseek-harness)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS="${DSH_HARNESS:-$ROOT/../deepseek-harness}"

if [ ! -x "$HARNESS/node_modules/.bin/tsdown" ]; then
  echo "build: no tsdown at $HARNESS/node_modules/.bin/tsdown (set DSH_HARNESS)" >&2
  exit 1
fi

TSDOWN="$HARNESS/node_modules/.bin/tsdown"

for config in \
  "$ROOT/packages/ui-edex/tsdown.config.ts" \
  "$ROOT/packages/ui-theme-terminal/tsdown.config.ts" \
  "$ROOT/packages/host/system-metrics/tsdown.config.ts"; do
  echo "── building $(basename "$(dirname "$config")")"
  "$TSDOWN" -c "$config"
done

echo "build: done"
