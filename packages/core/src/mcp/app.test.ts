import { describe, expect, test } from "bun:test"
import { appVisible, modelVisible, readResourceUi, readToolUi } from "./app"

describe("MCP tool UI metadata", () => {
  test("reads a resource URI and visibility from _meta.ui", () => {
    const meta = { ui: { resourceUri: "ui://weather/dashboard", visibility: ["app"] } }

    expect(readToolUi(meta)).toEqual({ resourceUri: "ui://weather/dashboard", visibility: ["app"] })
    expect(modelVisible(meta)).toBe(false)
    expect(appVisible(meta)).toBe(true)
  })

  test("accepts the deprecated flat resource URI", () => {
    expect(readToolUi({ "ui/resourceUri": "ui://legacy/view" }).resourceUri).toBe("ui://legacy/view")
  })

  test("defaults to both audiences", () => {
    const meta = { ui: { resourceUri: "ui://weather/dashboard" } }

    expect(readToolUi(meta).visibility).toEqual(["model", "app"])
    expect(modelVisible(meta)).toBe(true)
    expect(appVisible(meta)).toBe(true)
  })

  test("ignores a non-ui URI and an empty audience list", () => {
    expect(readToolUi({ ui: { resourceUri: "https://example.com" } }).resourceUri).toBeUndefined()
    expect(readToolUi({ ui: { resourceUri: "ui://x", visibility: [] } }).visibility).toEqual(["model", "app"])
    expect(readToolUi(undefined).visibility).toEqual(["model", "app"])
  })
})

describe("MCP resource UI metadata", () => {
  test("keeps declared CSP domains and preferences", () => {
    const meta = {
      ui: {
        csp: { connectDomains: ["https://api.example.com"], frameDomains: ["https://www.youtube.com"] },
        permissions: { camera: {}, microphone: null, clipboardWrite: false },
        prefersBorder: false,
      },
    }

    expect(readResourceUi(meta)).toEqual({
      csp: {
        connectDomains: ["https://api.example.com"],
        resourceDomains: undefined,
        frameDomains: ["https://www.youtube.com"],
        baseUriDomains: undefined,
      },
      permissions: { camera: true, microphone: undefined, geolocation: undefined, clipboardWrite: undefined },
      domain: undefined,
      prefersBorder: false,
    })
  })

  test("returns undefined without ui metadata", () => {
    expect(readResourceUi(undefined)).toBeUndefined()
    expect(readResourceUi({})).toBeUndefined()
  })
})
