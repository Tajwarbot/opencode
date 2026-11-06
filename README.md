# OpenCode Visuals

OpenCode Visuals is a fork of [OpenCode](https://github.com/anomalyco/opencode) that adds a built-in generative visual layer to the desktop app. The assistant can turn an engineering or general explanation into an interactive visual in the conversation.

The model makes the decision in its own response. There is no separate router and no extra model call. The `visual` skill tells the assistant to decide silently whether a visual proves the point, and to always include one when the user asks for a visual.

## What this fork adds

- **Typed engineering visuals:** mechanism, beam, Mohr circle, stress-strain, pressure-volume cycle, tolerance stack, process flow, exploded assembly, task state, diagram, and plot.
- **General-purpose generated UI:** an `html` kind for interactive explainers, comparisons, calculators, timelines, layouts, and one-off diagrams that do not fit the engineering catalog.
- **One visual format:** a fenced `visual` block with a small JSON spec. Typed kinds keep the math and units inside the renderer. The `html` kind runs in an opaque iframe with no network, storage, parent access, or host bridge.
- **Appearance > Visuals:** choose inline in chat or the side panel. The choice is stored as `appearance.visuals` and exposed to plugins as `ctx.appearance.visualDisplay()`.
- **A session workbench, composer pill, `/visual` command, and `visual` skill.**

The typed tier stays the default for engineering. The generated tier exists for the long tail. Adding a visual kind means adding a renderer; the `html` kind is the escape hatch when a typed kind does not fit.

## Install

Download the latest build from [Releases](https://github.com/Tajwarbot/opencode/releases/latest). It installs as **OpenCode Visuals**, next to the original OpenCode, with its own profile at `~/.config/ai.opencode.desktop.dev`.

| Platform | Asset |
| --- | --- |
| Linux x86_64 | AppImage, deb, rpm (package name `opencode-visuals`) |
| Windows x64 | NSIS installer |
| macOS arm64 and x64 | dmg |

Linux one command:

```bash
curl -fsSL https://raw.githubusercontent.com/Tajwarbot/opencode/dev/script/install-visuals.sh | bash
```

The installer downloads the AppImage to `~/.local/share/opencode-visuals`, adds `opencode-visuals` to `~/.local/bin`, and creates a desktop entry. The launcher uses XWayland when the session is Wayland and extracts the AppImage when FUSE is unavailable. It does not touch an existing OpenCode installation.

Debian and Ubuntu can install the `.deb` asset directly:

```bash
sudo apt install ./opencode-visuals-linux-amd64.deb
```

Fedora and other rpm distributions can install the `.rpm` asset. Windows and macOS users download the installer from Releases. The build is unsigned, so macOS may require Open Anyway in System Settings.

The build does not use the upstream update feed. Install a newer release to update it.

## Build from source

```bash
git clone https://github.com/Tajwarbot/opencode.git
cd opencode
bun install
bun run --cwd packages/cli build --single --skip-install
bun run --cwd packages/desktop build
OPENCODE_CHANNEL=dev bun run --cwd packages/desktop pack
```

`pack` writes the Linux AppImage, deb, and rpm to `dist/desktop`. Cross-platform builds are produced by `.github/workflows/visuals-release.yml`.

## Limits

- The generated `html` tier has no CDN, so it uses vanilla HTML, CSS, SVG, canvas, and JavaScript. Three.js stays in the typed `assembly` kind.
- The generated frame cannot start a follow-up turn, open files, or read the workspace. Those actions belong to the typed catalog and the host.
- Localization is partial. Commands and menu items follow the locale; the workbench and frame copy are English-first.
- The desktop build is unsigned. Linux may ask you to mark the AppImage executable the first time.
- Windows and macOS builds are unsigned. Windows SmartScreen and macOS Gatekeeper will warn on first launch.

## Upstream README

---

<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@opencode/cli"><img alt="npm" src="https://img.shields.io/npm/v/@opencode/cli?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/release.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/release.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Package managers
npm i -g @opencode/cli@latest      # or bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OpenCode is also available as a desktop application. Download it from [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installation Directory

The install script installs OpenCode to `$HOME/.opencode/bin`.

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/v2/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/v2/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
