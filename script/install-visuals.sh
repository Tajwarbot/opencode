#!/usr/bin/env bash
# Installs the latest OpenCode Visuals AppImage next to the original OpenCode.
set -euo pipefail

REPO="${OPENCODE_VISUALS_REPO:-Tajwarbot/opencode}"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/opencode-visuals"
BIN_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/128x128/apps"

case "$(uname -s)" in
  Linux) ;;
  *)
    echo "This installer supports Linux. Download another build from https://github.com/$REPO/releases" >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64 | amd64) arch="x86_64" ;;
  aarch64 | arm64) arch="arm64" ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

echo "Looking up the latest OpenCode Visuals release..."
release="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")"
url="$(printf '%s' "$release" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/' | grep -E "opencode-visuals-linux-.*${arch}.*\.AppImage$" | head -n1)"

if [ -z "$url" ]; then
  url="$(printf '%s' "$release" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/' | grep -E "opencode-visuals-linux-.*\.AppImage$" | head -n1)"
fi

if [ -z "$url" ]; then
  echo "No Linux AppImage found in the latest release." >&2
  echo "Open https://github.com/$REPO/releases and download one manually." >&2
  exit 1
fi

mkdir -p "$APP_DIR" "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR"

app="$APP_DIR/OpenCodeVisuals.AppImage"
tmp="$app.download"
echo "Downloading $url"
trap 'rm -f "$tmp"' EXIT
curl -fL "$url" -o "$tmp"
chmod +x "$tmp"
mv -f "$tmp" "$app"
trap - EXIT

tag="$(printf '%s' "$release" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)"
published="$(printf '%s' "$release" | sed -n 's/.*"published_at": *"\([^"]*\)".*/\1/p' | head -1)"
printf '%s\n%s\n' "$tag" "$published" > "$APP_DIR/release"

launcher="$BIN_DIR/opencode-visuals"
rm -f "$launcher"
if ! curl -fsSL "https://raw.githubusercontent.com/$REPO/dev/script/visuals-launcher.sh" -o "$launcher"; then
  echo "Could not download the launcher." >&2
  exit 1
fi
chmod +x "$launcher"

curl -fsSL "https://raw.githubusercontent.com/$REPO/dev/packages/desktop/icons/dev/128x128.png" -o "$ICON_DIR/opencode-visuals.png" || true

cat >"$DESKTOP_DIR/opencode-visuals.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=OpenCode Visuals
Comment=OpenCode with generative engineering and general-purpose visuals
Exec=$launcher %U
Icon=opencode-visuals
Terminal=false
Categories=Development;
StartupWMClass=ai.opencode.desktop.dev
EOF

chmod +x "$DESKTOP_DIR/opencode-visuals.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" >/dev/null 2>&1 || true
fi

echo
echo "Installed OpenCode Visuals."
echo "Launch it from your application menu, or run: opencode-visuals"
echo "AppImage: $app"
echo "Profile:  ${XDG_CONFIG_HOME:-$HOME/.config}/ai.opencode.desktop.dev"
