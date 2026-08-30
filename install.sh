#!/bin/sh
# folio — source install.
#   curl -fsSL https://github.com/vetcoders/folio/releases/latest/download/install.sh | sh
#
# Codescribe owns speech. This drops a notes canvas, not a second microphone.
set -eu

REPO="${FOLIO_REPO:-vetcoders/folio}"
PREFIX="${FOLIO_HOME:-$HOME/folio}"
TAG="${FOLIO_TAG:-latest}"
SKIP_NPM="${FOLIO_SKIP_NPM:-0}"

die() {
  printf 'folio: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "need $1"
}

if [ "$(id -u)" -eq 0 ] && [ "${FOLIO_ALLOW_ROOT:-0}" != 1 ]; then
  die "refusing to run as root (FOLIO_ALLOW_ROOT=1 to override)"
fi

need curl
need tar
need node

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  die "node >= 20 required (found $(node -v))"
fi

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

fetch() {
  # $1 url-or-path  $2 dest
  case "$1" in
    /* | ./* | ../*)
      cp "$1" "$2"
      ;;
    file://*)
      cp "${1#file://}" "$2"
      ;;
    *)
      curl -fsSL "$1" -o "$2"
      ;;
  esac
}


if [ -n "${FOLIO_TARBALL:-}" ]; then
  TARBALL_URL=$FOLIO_TARBALL
  SUMS_URL=${FOLIO_SHA256SUMS:-}
  RESOLVED_TAG="local"
elif [ "$TAG" = latest ]; then
  TARBALL_URL="https://github.com/${REPO}/releases/latest/download/folio.tar.gz"
  SUMS_URL="https://github.com/${REPO}/releases/latest/download/SHA256SUMS"
  RESOLVED_TAG="latest"
else
  TARBALL_URL="https://github.com/${REPO}/releases/download/${TAG}/folio.tar.gz"
  SUMS_URL="https://github.com/${REPO}/releases/download/${TAG}/SHA256SUMS"
  RESOLVED_TAG=$TAG
fi


TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

printf 'folio: fetching %s\n' "$TARBALL_URL" >&2
fetch "$TARBALL_URL" "$TMP/folio.tar.gz"

if [ -n "${SUMS_URL:-}" ]; then
  fetch "$SUMS_URL" "$TMP/SHA256SUMS" || die "could not fetch SHA256SUMS"
  EXPECTED=$(awk '/folio\.tar\.gz$/ {print $1; exit}' "$TMP/SHA256SUMS")
  [ -n "$EXPECTED" ] || die "folio.tar.gz missing from SHA256SUMS"
  GOT=$(checksum "$TMP/folio.tar.gz")
  [ "$EXPECTED" = "$GOT" ] || die "sha256 mismatch (expected $EXPECTED got $GOT)"
  printf 'folio: sha256 ok %s\n' "$GOT" >&2
fi

mkdir -p "$TMP/unpack"
tar -xzf "$TMP/folio.tar.gz" -C "$TMP/unpack"
if [ -d "$TMP/unpack/folio" ]; then
  SRC="$TMP/unpack/folio"
else
  SRC=$(find "$TMP/unpack" -mindepth 1 -maxdepth 1 -type d | head -1)
fi
[ -n "$SRC" ] && [ -f "$SRC/package.json" ] || die "tarball has no package.json"

if [ -e "$PREFIX" ] && [ "${FOLIO_FORCE:-0}" != 1 ]; then
  if [ -f "$PREFIX/package.json" ]; then
    printf 'folio: updating %s\n' "$PREFIX" >&2
  else
    die "$PREFIX exists and does not look like folio (FOLIO_FORCE=1 to overlay)"
  fi
fi

mkdir -p "$PREFIX"
# POSIX copy; keep existing node_modules unless we reinstall.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude node_modules --exclude .git "$SRC"/ "$PREFIX"/
else
  tar -C "$SRC" -cf - . | tar -C "$PREFIX" -xf -
fi

if [ "$SKIP_NPM" != 1 ]; then
  need npm
  printf 'folio: npm ci in %s\n' "$PREFIX" >&2
  (cd "$PREFIX" && npm ci)
fi

if [ -f "$PREFIX/VERSION" ]; then
  RESOLVED_TAG=$(tr -d '\n' < "$PREFIX/VERSION")
fi

printf '\nfolio %s → %s\n' "${RESOLVED_TAG:-unknown}" "$PREFIX"
printf 'run:  cd %s && npm run dev\n' "$PREFIX"
printf 'note: Codescribe owns the mic. Folio is a paste canvas.\n'
