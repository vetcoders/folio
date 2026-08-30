#!/bin/sh
# Build dist/folio.tar.gz from HEAD (git archive + export-ignore).
# Does not pack node_modules, wavs, or Grok sandbox chrome.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

VER=${FOLIO_VERSION:-$(git describe --tags --always)}
case "$VER" in
  v*) VER_NUM=${VER#v} ;;
  *) VER_NUM=$VER ;;
esac

mkdir -p dist
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

git archive --format=tar --prefix=folio/ HEAD | tar -C "$STAGE" -xf -
printf '%s\n' "$VER" > "$STAGE/folio/VERSION"
# installer lives at repo root; copy into the tarball so a lone archive is enough
if [ -f "$ROOT/install.sh" ]; then
  cp "$ROOT/install.sh" "$STAGE/folio/install.sh"
  chmod 0755 "$STAGE/folio/install.sh"
fi

OUT="dist/folio-${VER_NUM}.tar.gz"
tar -C "$STAGE" -czf "$OUT" folio
cp "$OUT" dist/folio.tar.gz
cp "$ROOT/install.sh" dist/install.sh
chmod 0755 dist/install.sh

if command -v sha256sum >/dev/null 2>&1; then
  (cd dist && sha256sum folio.tar.gz "folio-${VER_NUM}.tar.gz" install.sh > SHA256SUMS)
else
  (cd dist && shasum -a 256 folio.tar.gz "folio-${VER_NUM}.tar.gz" install.sh > SHA256SUMS)
fi

# fail the pack if a wav snuck in
if tar -tzf dist/folio.tar.gz | grep -E '\.wav$' >/dev/null; then
  echo "pack: wav inside tarball — refuse" >&2
  exit 1
fi

echo "packed $OUT"
ls -lh dist/folio.tar.gz dist/"folio-${VER_NUM}.tar.gz" dist/SHA256SUMS dist/install.sh
