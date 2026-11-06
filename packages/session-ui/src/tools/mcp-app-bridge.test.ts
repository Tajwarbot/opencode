import { describe, expect, test } from "bun:test"
import { bridgeResponse, initializeResult, toolResult } from "./mcp-app-bridge"
import { buildMcpAppDocument, mcpAppAllow, mcpAppCsp } from "./mcp-app-document"

const app = {
  server: "weather",
  tool: "get_weather",
  name: "weather_get_weather",
  title: "Weather",
  resourceUri: "ui://weather/dashboard",
  description: "Current weather",
  inputSchema: { type: "object" },
}

const calls: string[] = []

const host = {
  callTool: async () => ({
    isError: false,
    content: [{ type: "text" as const, text: "21 C" }],
    structured: { temperature: 21 },
  }),
  readResource: async (input: { server: string; uri: string }) => ({
    server: input.server,
    uri: input.uri,
    mimeType: "text/html;profile=mcp-app",
    html: "<p>ok</p>",
  }),
  sendMessage: (text: string) => calls.push(`message:${text}`),
  updateContext: () => calls.push("context"),
  openLink: (url: string) => calls.push(`link:${url}`),
}

describe("MCP App document", () => {
  test("uses a restrictive CSP when the resource declares none", () => {
    const csp = mcpAppCsp(undefined)

    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("connect-src 'none'")
    expect(csp).toContain("frame-src 'none'")
    expect(csp).toContain("object-src 'none'")
  })

  test("opens only the directives a resource declares", () => {
    const csp = mcpAppCsp({
      connectDomains: ["https://api.example.com"],
      resourceDomains: ["https://cdn.example.com"],
      frameDomains: ["https://www.youtube.com"],
    })

    expect(csp).toContain("connect-src https://api.example.com")
    expect(csp).toContain("script-src 'unsafe-inline' https://cdn.example.com")
    expect(csp).toContain("frame-src https://www.youtube.com")
    expect(csp).toContain("object-src 'none'")
  })

  test("drops origins that are not http or websocket URLs", () => {
    const csp = mcpAppCsp({ connectDomains: ["javascript:alert(1)", "https://api.example.com", "data:"] })

    const connect = csp.split("; ").find((directive) => directive.startsWith("connect-src"))

    expect(connect).toBe("connect-src https://api.example.com")
  })

  test("adds the policy and theme inside an existing head", () => {
    const document = buildMcpAppDocument({
      html: "<!doctype html><html><head><title>App</title></head><body></body></html>",
      theme: "light",
    })

    expect(document).toContain('<head><meta http-equiv="Content-Security-Policy"')
    expect(document).toContain('<meta name="color-scheme" content="light">')
    expect(document).toContain("<title>App</title>")
  })

  test("wraps a fragment in a full document", () => {
    const document = buildMcpAppDocument({ html: "<p>hello</p>", theme: "dark" })

    expect(document).toBe(
      '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src \'self\' data:; media-src \'self\' data:; font-src \'self\' data:; connect-src \'none\'; frame-src \'none\'; base-uri \'self\'; object-src \'none\'"><meta name="color-scheme" content="dark"></head><body><p>hello</p></body></html>',
    )
  })

  test("maps declared permissions to an allow attribute", () => {
    expect(mcpAppAllow(undefined)).toBeUndefined()
    expect(
      mcpAppAllow({ camera: {}, microphone: null, geolocation: null, clipboardWrite: {} }),
    ).toBe("camera; clipboard-write")
  })
})

describe("MCP App bridge", () => {
  test("answers initialize with the tool and theme", async () => {
    // SAFETY: this method returns initializeResult for ui/initialize, tested here as a whole.
    const result = (await bridgeResponse({
      method: "ui/initialize",
      params: {},
      app,
      host,
      theme: "light",
    })) as ReturnType<typeof initializeResult>

    expect(result.protocolVersion).toBe("2026-01-26")
    expect(result.hostContext.toolInfo.tool.name).toBe("get_weather")
    expect(result.hostContext.theme).toBe("light")
    expect(result.hostCapabilities.serverTools).toEqual({})
  })

  test("proxies a tool call to the app's server", async () => {
    // SAFETY: this method returns a tool response, whose fields this test reads.
    const result = (await bridgeResponse({
      method: "tools/call",
      params: { name: "refresh", arguments: { city: "Oslo" } },
      app,
      host,
      theme: "dark",
    })) as { content: unknown[]; structuredContent: unknown }

    expect(result.content).toEqual([{ type: "text", text: "21 C" }])
    expect(result.structuredContent).toEqual({ temperature: 21 })
  })

  test("reads only ui:// resources", async () => {
    // SAFETY: this method returns resource contents, whose text this test reads.
    const result = (await bridgeResponse({
      method: "resources/read",
      params: { uri: "ui://weather/dashboard" },
      app,
      host,
      theme: "dark",
    })) as { contents: Array<{ text: string }> }

    expect(result.contents[0]?.text).toBe("<p>ok</p>")

    await expect(
      bridgeResponse({
        method: "resources/read",
        params: { uri: "file:///etc/passwd" },
        app,
        host,
        theme: "dark",
      }),
    ).rejects.toThrow("ui://")
  })

  test("routes messages, links, and context to the host", async () => {
    calls.length = 0
    await bridgeResponse({
      method: "ui/message",
      params: { content: { type: "text", text: "Show the forecast" } },
      app,
      host,
      theme: "dark",
    })
    await bridgeResponse({
      method: "ui/open-link",
      params: { url: "https://example.com" },
      app,
      host,
      theme: "dark",
    })
    await bridgeResponse({
      method: "ui/update-model-context",
      params: { structuredContent: { city: "Oslo" } },
      app,
      host,
      theme: "dark",
    })

    expect(calls).toEqual(["message:Show the forecast", "link:https://example.com", "context"])
  })

  test("rejects an unknown method", async () => {
    await expect(
      bridgeResponse({ method: "ui/unknown", params: {}, app, host, theme: "dark" }),
    ).rejects.toThrow("Unsupported method")
  })

  test("builds a tool result with structured content and an error flag", () => {
    expect(toolResult({ output: '{"temperature":21}' })).toEqual({
      content: [{ type: "text", text: '{"temperature":21}' }],
      isError: false,
      structuredContent: { temperature: 21 },
    })
    expect(toolResult({ status: "error", error: "boom" })).toEqual({
      content: [{ type: "text", text: "boom" }],
      isError: true,
    })
    expect(toolResult({ status: "running" })).toBeUndefined()
  })
})
