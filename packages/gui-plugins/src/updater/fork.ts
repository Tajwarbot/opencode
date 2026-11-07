import { shell } from "electron"
import { Effect } from "effect"
import type { Platform } from "./machine"
import { isNewer, parseRelease, selectAsset, type ForkPlatform } from "./release"

const RELEASES = "https://api.github.com/repos/Tajwarbot/opencode/releases/latest"

const DOWNLOADS = "/Tajwarbot/opencode/releases/download/"

const CHECK_TIMEOUT_MS = 15_000

/**
 * The fork updater for packaged Windows and macOS builds. It checks the fork's latest GitHub release and offers the
 * platform installer as an external download, because the builds are unsigned and the version line is shared with
 * upstream. Linux stays on the AppImage launcher.
 */
export const make = Effect.fn("Updater.fork")(function* (installed: string) {
  if (process.platform !== "win32" && process.platform !== "darwin") return undefined

  const platform: ForkPlatform = process.platform
  const arch = process.arch === "arm64" ? "arm64" : "x64"

  return {
    checkForUpdate: Effect.tryPromise({
      try: async () => {
        const response = await fetch(RELEASES, {
          headers: {
            accept: "application/vnd.github+json",
            "user-agent": `opencode-visuals/${installed}`,
          },
          signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
        })

        if (!response.ok) throw new Error(`Release check failed: HTTP ${response.status}`)

        const release = parseRelease(await response.json())

        if (!release) throw new Error("The latest release is not a fork visual build")

        if (!isNewer(installed, release.tag)) return undefined

        const asset = selectAsset(release, platform, arch)

        if (!asset) throw new Error(`Release ${release.tag} has no ${platform} installer`)

        return { mode: "external", version: release.tag, url: asset.url } as const
      },
      catch: (error) => error,
    }),
    stageUpdate: () => Effect.void,
    installAndRestart: Effect.fail(new Error("This update uses the installer download")),
    externalInstall: (url) =>
      Effect.tryPromise({
        try: async () => {
          const parsed = new URL(url)

          if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !parsed.pathname.startsWith(DOWNLOADS))
            throw new Error("Unexpected update URL")

          await shell.openExternal(url)
        },
        catch: (error) => error,
      }),
  } satisfies Platform
})
