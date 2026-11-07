import { describe, expect, test } from "bun:test"
import { isNewer, isUpdateURL, parseRelease, selectAsset } from "./release"

const release = {
  tag_name: "visuals-v2.2.5-r8",
  published_at: "2026-11-07T12:00:00Z",
  assets: [
    { name: "opencode-visuals-win-x64.exe", browser_download_url: "https://github.com/a.exe" },
    { name: "opencode-visuals-mac-arm64.dmg", browser_download_url: "https://github.com/a.dmg" },
    { name: "opencode-visuals-mac-x64.dmg", browser_download_url: "https://github.com/b.dmg" },
    { name: "SHA256SUMS.txt", browser_download_url: "https://github.com/sums" },
  ],
}

describe("parseRelease", () => {
  test("keeps the fork release fields", () => {
    expect(parseRelease(release)).toEqual({
      tag: "visuals-v2.2.5-r8",
      publishedAt: "2026-11-07T12:00:00Z",
      assets: [
        { name: "opencode-visuals-win-x64.exe", url: "https://github.com/a.exe" },
        { name: "opencode-visuals-mac-arm64.dmg", url: "https://github.com/a.dmg" },
        { name: "opencode-visuals-mac-x64.dmg", url: "https://github.com/b.dmg" },
        { name: "SHA256SUMS.txt", url: "https://github.com/sums" },
      ],
    })
  })

  test("ignores another tag or malformed assets", () => {
    expect(parseRelease({ tag_name: "v1.0.0", published_at: "x", assets: [] })).toBeUndefined()
    expect(parseRelease({ tag_name: "visuals-v2.2.5-r8", published_at: "x", assets: [{ name: 1 }] })).toBeUndefined()
    expect(parseRelease(undefined)).toBeUndefined()
  })
})

describe("isUpdateURL", () => {
  test("accepts only the fork's release downloads", () => {
    expect(isUpdateURL("https://github.com/Tajwarbot/opencode/releases/download/visuals-v2.2.5-r8/a.exe")).toBe(true)
    expect(isUpdateURL("https://github.com/Tajwarbot/opencode/releases/download/visuals-v2.2.5-r8/a.exe?x=1")).toBe(true)
    expect(isUpdateURL("https://github.com/other/repo/releases/download/x/a.exe")).toBe(false)
    expect(isUpdateURL("http://github.com/Tajwarbot/opencode/releases/download/x/a.exe")).toBe(false)
    expect(isUpdateURL("https://evil.example/Tajwarbot/opencode/releases/download/x/a.exe")).toBe(false)
    expect(isUpdateURL("not a url")).toBe(false)
  })
})

describe("selectAsset", () => {
  test("picks the Windows installer", () => {
    expect(selectAsset(parseRelease(release)!, "win32", "x64")?.name).toBe("opencode-visuals-win-x64.exe")
  })

  test("picks the macOS disk image for the architecture", () => {
    const parsed = parseRelease(release)!

    expect(selectAsset(parsed, "darwin", "arm64")?.url).toBe("https://github.com/a.dmg")
    expect(selectAsset(parsed, "darwin", "x64")?.url).toBe("https://github.com/b.dmg")
  })
})

describe("isNewer", () => {
  test("compares release revisions", () => {
    expect(isNewer("visuals-v2.2.5-r7", "visuals-v2.2.5-r8")).toBe(true)
    expect(isNewer("visuals-v2.2.5-r8", "visuals-v2.2.5-r8")).toBe(false)
    expect(isNewer("visuals-v2.2.5-r9", "visuals-v2.2.5-r8")).toBe(false)
    expect(isNewer("visuals-v2.2.5-r8", "visuals-v2.2.6-r1")).toBe(true)
    expect(isNewer("visuals-v2.2.6-r1", "visuals-v2.2.5-r9")).toBe(false)
    expect(isNewer(undefined, "visuals-v2.2.5-r8")).toBe(false)
  })
})
