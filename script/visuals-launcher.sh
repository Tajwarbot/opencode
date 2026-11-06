#!/usr/bin/env bash
# Launch OpenCode Visuals and stage newer AppImage releases in the background.
set -euo pipefail

REPO="${OPENCODE_VISUALS_REPO:-Tajwarbot/opencode}"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}/opencode-visuals"
APP="$DATA/OpenCodeVisuals.AppImage"
STAGE="$DATA/OpenCodeVisuals.AppImage.new"
PENDING="$DATA/pending"
STATE="$DATA/release"
CHECK="$DATA/last-check"
INTERVAL=21600

mkdir -p "$DATA"

apply() {
  [ -f "$STAGE" ] || return 0
  [ -x "$STAGE" ] || return 0

  local size
  size=$(stat -c %s "$STAGE" 2>/dev/null || echo 0)
  [ "$size" -gt 100000000 ] || return 0

  mv -f "$STAGE" "$APP"
  chmod +x "$APP"

  if [ -f "$PENDING" ]; then
    mv -f "$PENDING" "$STATE"
  fi
}

update() {
  command -v curl >/dev/null 2>&1 || return 0
  command -v flock >/dev/null 2>&1 || return 0

  exec 9>"$DATA/update.lock"
  flock -n 9 || return 0

  local now last
  now=$(date +%s)
  last=0
  [ -f "$CHECK" ] && last=$(cat "$CHECK" 2>/dev/null || echo 0)
  [ $((now - last)) -lt "$INTERVAL" ] && return 0

  local release
  release=$(curl -fsSL --max-time 8 "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null) || return 0
  [ -n "$release" ] || return 0

  local latest published
  latest=$(printf '%s' "$release" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)
  published=$(printf '%s' "$release" | sed -n 's/.*"published_at": *"\([^"]*\)".*/\1/p' | head -1)
  [ -n "$latest" ] && [ -n "$published" ] || return 0

  local installed
  installed=$(sed -n '2p' "$STATE" 2>/dev/null || true)
  if [ "$installed" = "$published" ]; then
    printf '%s\n' "$now" > "$CHECK"
    return 0
  fi

  local url
  url=$(printf '%s' "$release" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/' | grep -E "opencode-visuals-linux-.*x86_64.*\.AppImage$" | head -1)
  if [ -z "$url" ]; then
    url=$(printf '%s' "$release" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/' | grep -E "opencode-visuals-linux-.*\.AppImage$" | head -1)
  fi
  [ -n "$url" ] || return 0

  local tmp="$STAGE.download"
  rm -f "$tmp"
  if ! curl -fL --max-time 900 "$url" -o "$tmp" 2>/dev/null; then
    rm -f "$tmp"
    return 0
  fi

  local sums
  sums=$(printf '%s' "$release" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/' | grep -E "SHA256SUMS.txt$" | head -1)
  if [ -n "$sums" ]; then
    local sumfile expected actual
    sumfile="$tmp.sums"
    if curl -fsSL --max-time 20 "$sums" -o "$sumfile" 2>/dev/null; then
      expected=$(grep " $(basename "$url")$" "$sumfile" | awk '{print $1}' | head -1)
      actual=$(sha256sum "$tmp" | awk '{print $1}')
      if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
        rm -f "$tmp" "$sumfile"
        return 0
      fi
    fi
    rm -f "$sumfile"
  fi

  chmod +x "$tmp"
  mv -f "$tmp" "$STAGE"
  printf '%s\n%s\n' "$latest" "$published" > "$PENDING"
  printf '%s\n' "$now" > "$CHECK"

  if command -v notify-send >/dev/null 2>&1; then
    notify-send "OpenCode Visuals" "Update $latest is ready. Restart the app to use it." 2>/dev/null || true
  fi
}

apply
update >/dev/null 2>&1 &

exec env APPIMAGE_EXTRACT_AND_RUN=1 "$APP" --ozone-platform=x11 "$@"
