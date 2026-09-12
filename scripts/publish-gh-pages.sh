#!/usr/bin/env bash
# Push dist/ to origin/gh-pages. No Actions.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

npm run build
test -f dist/.nojekyll
test -f dist/index.html

work="$(mktemp -d)"
cleanup() { rm -rf "$work"; }
trap cleanup EXIT

git clone --depth 1 --branch gh-pages "https://github.com/RobertKodes/drawseed.git" "$work" 2>/dev/null \
  || git clone --depth 1 "https://github.com/RobertKodes/drawseed.git" "$work"

cd "$work"
git checkout --orphan gh-pages-new
git rm -rf . >/dev/null 2>&1 || true
cp -a "$root/dist/." .
git add -A
git commit -m "pages: drawseed dist"
git branch -M gh-pages
git push -f origin gh-pages
