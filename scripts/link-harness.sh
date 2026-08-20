#!/usr/bin/env bash
# Symlink every @deepseek-ai/* workspace package (plus React and its types)
# from a sibling deepseek-harness checkout into this repo's node_modules, so
# tsc and tsdown can resolve harness types and the inline-safe /remote
# contributions at build time. Runtime resolution is unaffected: the harness
# profile fallback provides @deepseek-ai/* when the plugin actually runs.
#
# Usage: ./scripts/link-harness.sh   (DSH_HARNESS overrides ../deepseek-harness)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS="${DSH_HARNESS:-$ROOT/../deepseek-harness}"

if [ ! -d "$HARNESS/packages" ]; then
  echo "link-harness: no harness checkout at $HARNESS (set DSH_HARNESS)" >&2
  exit 1
fi

mkdir -p "$ROOT/node_modules/@deepseek-ai"

linked=0

# Link the plugin's OWN @deepseek-ai packages first (they ship the generated
# Typert artifacts this checkout must build against — the harness copies
# cannot replace them). A name found under this repo's packages/ wins.
for manifest in "$ROOT"/packages/*/*/package.json; do
  [ -f "$manifest" ] || continue
  name="$(node -e "process.stdout.write(require('$manifest').name ?? '')" 2>/dev/null || true)"
  case "$name" in
    @deepseek-ai/*)
      link="$ROOT/node_modules/@deepseek-ai/${name#@deepseek-ai/}"
      if [ ! -e "$link" ]; then
        ln -s "$(dirname "$manifest")" "$link"
        linked=$((linked + 1))
      fi
      ;;
  esac
done

# Then every remaining @deepseek-ai/* workspace package from the harness, so
# tsc and tsdown can resolve harness types at build time.
for manifest in "$HARNESS"/packages/*/*/package.json; do
  [ -f "$manifest" ] || continue
  name="$(node -e "process.stdout.write(require('$manifest').name ?? '')" 2>/dev/null || true)"
  case "$name" in
    @deepseek-ai/*)
      target="$(dirname "$manifest")"
      link="$ROOT/node_modules/@deepseek-ai/${name#@deepseek-ai/}"
      if [ ! -e "$link" ]; then
        ln -s "$target" "$link"
        linked=$((linked + 1))
      fi
      ;;
  esac
done

# React + types from the harness pnpm store (needed by client tsc/jsx).
link_react() {
  local pattern="$1" link="$2"
  if [ -e "$link" ]; then return; fi
  local found
  found="$(ls -d "$HARNESS"/node_modules/.pnpm/$pattern 2>/dev/null | head -1 || true)"
  if [ -n "$found" ]; then
    mkdir -p "$(dirname "$link")"
    ln -s "$found" "$link"
    linked=$((linked + 1))
  fi
}
link_react 'react@18*/node_modules/react' "$ROOT/node_modules/react"
link_react '@types+react@18*/node_modules/@types/react' "$ROOT/node_modules/@types/react"
link_react '@types+node@22*/node_modules/@types/node' "$ROOT/node_modules/@types/node"

# Vendored framework packages (the harness overrides them to vendor/*; they
# are not under packages/, so the loop above misses them).
for v in cordis cosmokit schemastery; do
  if [ -d "$HARNESS/vendor/$v" ] && [ ! -e "$ROOT/node_modules/@deepseek-ai/$v" ]; then
    ln -s "$HARNESS/vendor/$v" "$ROOT/node_modules/@deepseek-ai/$v"
    linked=$((linked + 1))
  fi
done

echo "link-harness: linked $linked packages (from $HARNESS)"
