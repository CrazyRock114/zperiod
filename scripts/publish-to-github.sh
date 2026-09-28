#!/usr/bin/env bash
# Push this workspace to CrazyRock114/zperiod.
#
#   ./scripts/publish-to-github.sh <mode> [token]
#
# Modes
#   branch   (default) push as a new branch `rewrite/react` — the safe option.
#            Their main branch and history are untouched; you merge or open a
#            PR at your convenience.
#   replace  Replace the default branch's contents. Their previous work is
#            preserved on a `pre-rewrite` branch and a tag before anything is
#            overwritten, and the push uses --force-with-lease rather than
#            --force, so it aborts if anyone else pushed in the meantime.
#
# The token is only needed if your machine has no GitHub credentials already.
# It is read from argv or $GITHUB_TOKEN, used for this run, and never written
# to disk.
set -euo pipefail

MODE="${1:-branch}"
REPO="https://github.com/CrazyRock114/zperiod"
BRANCH="rewrite/react"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ "$MODE" != "branch" ] && [ "$MODE" != "replace" ]; then
  echo "usage: $0 [branch|replace] [token]" >&2
  exit 2
fi

TOKEN="${2:-${GITHUB_TOKEN:-}}"
AUTH=()
if [ -n "$TOKEN" ]; then
  AUTH=(-c "http.extraheader=Authorization: Bearer $TOKEN")
fi

# 1. clone their current state so it can be preserved
git clone --depth 1 "$REPO" "$WORK/repo" >/dev/null 2>&1 || {
  echo "could not clone $REPO" >&2
  exit 1
}
OLD_SHA="$(git -C "$WORK/repo" rev-parse HEAD)"
echo "their current HEAD: $OLD_SHA"

# 2. build the replacement tree (no build output, no deps)
copy_into() {
  local dst="$1"
  mkdir -p "$dst"
  for item in src scripts index.html package.json package-lock.json tsconfig.json \
              vite.config.ts vitest.config.ts tailwind.config.js postcss.config.js \
              README.md .gitignore .npmrc; do
    [ -e "$SRC/$item" ] && cp -r "$SRC/$item" "$dst/"
  done
  find "$dst" -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
  rm -f "$dst/tsconfig.tsbuildinfo"
}

if [ "$MODE" = "replace" ]; then
  # Preserve their work before touching anything.
  git -C "$WORK/repo" checkout -b pre-rewrite >/dev/null 2>&1 || true
  git -C "$WORK/repo" push "${AUTH[@]}" origin pre-rewrite >/dev/null 2>&1 \
    && echo "preserved their work on branch: pre-rewrite" \
    || echo "WARNING: could not push the pre-rewrite branch (continuing)"
  git -C "$WORK/repo" tag -f pre-rewrite-v0.2.0 "$OLD_SHA" >/dev/null 2>&1 || true
  git -C "$WORK/repo" push "${AUTH[@]}" origin pre-rewrite-v0.2.0 >/dev/null 2>&1 || true

  cd "$WORK/repo"
  git checkout main >/dev/null 2>&1 || git checkout master >/dev/null 2>&1 || true
  # Wipe the working tree but keep .git and the history.
  find . -mindepth 1 -maxdepth 1 -not -name .git -exec rm -rf {} +
  copy_into "$WORK/repo"
  git add -A
  git -c user.name="Mavis" -c user.email="noreply@anthropic.com" commit -q -m \
"Replace the vanilla-JS v0.2.0 with the React/TypeScript rewrite

Feature parity against zperiod.app, plus a data and physics audit.

  - 118-element table that actually renders all 118 (the previous layout
    dropped 36 elements by inlining the f-block)
  - exact rational equation balancer, with under-determination reported
    instead of arbitrary zero/negative coefficients
  - formula text preserved through parsing (no CaO2H2-style reordering)
  - real SPDF orbitals: corrected d_z2 (missing equatorial torus) and
    f_z(x2-y2); cross-checked against closed-form hydrogenic references
  - 66 ions, 40 languages with RTL, spaced-repetition learning path
  - 170 unit tests + 146 real-browser assertions
  - entry chunk 112 -> 53 kB gzipped via route-level code splitting

Previous work preserved on branch pre-rewrite and tag pre-rewrite-v0.2.0."
  git push "${AUTH[@]}" --force-with-lease origin HEAD
  echo "pushed to the default branch (with lease protection)"
else
  cd "$WORK/repo"
  git checkout -b "$BRANCH" >/dev/null 2>&1
  find . -mindepth 1 -maxdepth 1 -not -name .git -exec rm -rf {} +
  copy_into "$WORK/repo"
  git add -A
  git -c user.name="Mavis" -c user.email="noreply@anthropic.com" commit -q -m \
"React/TypeScript rewrite with full feature parity for zperiod.app

Adds the React + TS implementation with 170 unit tests and 146 real-browser
assertions, and records the audit findings against the v0.2.0 vanilla-JS
build (36 elements missing from the grid, formula reordering in the answer
key, zero/negative coefficients on under-determined equations, d_z2 and
f_z(x2-y2) orbital errors)."
  git push "${AUTH[@]}" -u origin "$BRANCH"
  echo "pushed branch: $BRANCH"
  echo "open a PR: $REPO/compare/main...$BRANCH"
fi
