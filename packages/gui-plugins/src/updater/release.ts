/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters -- this module is the boundary for the GitHub release JSON. */
import { isRecord } from "@opencode/util/record"

/** A release asset the updater can offer. */
export interface ReleaseAsset {
  readonly name: string
  readonly url: string
}

/** The latest fork release, narrowed from GitHub's JSON. */
export interface ForkRelease {
  readonly tag: string
  readonly publishedAt: string
  readonly assets: readonly ReleaseAsset[]
}

export type ForkPlatform = "win32" | "darwin"

export type ForkArch = "x64" | "arm64"

const TAG_PREFIX = "visuals-v"

const DOWNLOAD_PREFIX = "/Tajwarbot/opencode/releases/download/"

/** Reads the fields the updater uses, ignoring a release that is not one of the fork's visual builds. */
export function parseRelease(value: unknown): ForkRelease | undefined {
  if (!isRecord(value)) return undefined
  const tag = value["tag_name"]
  const publishedAt = value["published_at"]
  const assets = value["assets"]

  if (typeof tag !== "string" || !tag.startsWith(TAG_PREFIX)) return undefined

  if (typeof publishedAt !== "string" || !publishedAt) return undefined

  if (!Array.isArray(assets)) return undefined

  const parsed: ReleaseAsset[] = []

  for (const asset of assets) {
    if (!isRecord(asset)) continue
    const name = asset["name"]
    const url = asset["browser_download_url"]

    if (typeof name === "string" && typeof url === "string") parsed.push({ name, url })
  }

  if (parsed.length === 0) return undefined

  return { tag, publishedAt, assets: parsed }
}

/** The installer for this platform and architecture, or undefined when the release has none. */
/** Whether a download URL is one of the fork's GitHub release assets. */
export function isUpdateURL(url: string) {
  try {
    const parsed = new URL(url)

    return parsed.protocol === "https:" && parsed.hostname === "github.com" && parsed.pathname.startsWith(DOWNLOAD_PREFIX)
  } catch {
    return false
  }
}

export function selectAsset(
  release: ForkRelease,
  platform: ForkPlatform,
  arch: ForkArch,
): ReleaseAsset | undefined {
  const name =
    platform === "win32"
      ? "opencode-visuals-win-x64.exe"
      : `opencode-visuals-mac-${arch === "arm64" ? "arm64" : "x64"}.dmg`

  return release.assets.find((asset) => asset.name === name)
}

/**
 * Whether the latest release is after the installed one. A build with no release tag stays put, so a build from
 * before the updater existed does not offer itself as an update.
 */
export function isNewer(installed: string | undefined, latest: string) {
  if (!installed || installed === latest) return false

  const current = parseTag(installed)
  const next = parseTag(latest)

  if (!current || !next) return true

  if (current.major !== next.major) return next.major > current.major

  if (current.minor !== next.minor) return next.minor > current.minor

  if (current.patch !== next.patch) return next.patch > current.patch

  return next.revision > current.revision
}

function parseTag(tag: string) {
  const match = /^visuals-v(\d+)\.(\d+)\.(\d+)(?:-r(\d+))?$/.exec(tag)

  if (!match) return undefined

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    revision: Number.parseInt(match[4] ?? "0", 10),
  }
}
