/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters -- this module is the I/O boundary for untrusted iframe messages; every value is parsed before use. */
import type { JsonValue, McpAppLink, McpAppToolResult } from "@opencode/client/promise"
import type { McpAppHost } from "../context/mcp-apps"

type BridgeHost = Pick<McpAppHost, "callTool" | "readResource" | "sendMessage" | "updateContext" | "openLink">

type RecordValue = Record<string, JsonValue>

type ToolResultParams = {
  content: Array<{ type: "text"; text: string }>
  isError: boolean
  structuredContent?: RecordValue
}

type ToolResponseParams = {
  content: McpAppToolResult["content"]
  isError: boolean
  structuredContent?: unknown
  _meta?: Record<string, JsonValue>
}

/** The `ui/initialize` result: host identity, capabilities, and the context a View reads on first paint. */
export function initializeResult(app: McpAppLink, theme: "light" | "dark") {
  return {
    protocolVersion: "2026-01-26",
    hostCapabilities: {
      serverTools: {},
      serverResources: {},
      logging: {},
      openLinks: {},
    },
    hostInfo: { name: "opencode-visuals", version: "2.2.5" },
    hostContext: {
      toolInfo: {
        tool: {
          name: app.tool,
          title: app.title,
          description: app.description,
          inputSchema: app.inputSchema ?? { type: "object" },
        },
      },
      theme,
      displayMode: "inline",
      availableDisplayModes: ["inline"],
      containerDimensions: { maxWidth: 720, maxHeight: 720 },
      platform: "desktop",
      userAgent: "opencode-visuals",
    },
  }
}

/** The complete tool arguments sent once the View is ready for them. */
export function toolInput(input: Record<string, JsonValue>) {
  return { arguments: input }
}

/** The tool result sent when the call finishes, or the error text when it failed. */
export function toolResult(input: { output?: string; status?: string; error?: string }) {
  const failed = input.status === "error" || input.error !== undefined
  const text = failed ? (input.error ?? input.output ?? "") : (input.output ?? "")

  if (!failed && input.output === undefined) return undefined

  const result: ToolResultParams = {
    content: [{ type: "text", text }],
    isError: failed,
  }

  const structured = structuredContent(text)

  if (structured) result.structuredContent = structured

  return result
}

/** Answers one View request. Throwing produces the JSON-RPC error response. */
export async function bridgeResponse(input: {
  readonly method: string
  readonly params: JsonValue
  readonly app: McpAppLink
  readonly host: BridgeHost
  readonly theme: "light" | "dark"
}) {
  if (input.method === "ui/initialize") return initializeResult(input.app, input.theme)

  if (input.method === "ping") return {}

  if (input.method === "tools/call") {
    const value = record(input.params)
    const name = text(value?.["name"])

    if (!name) throw new Error("tools/call needs a tool name")

    const args = record(value?.["arguments"]) ?? {}

    return toolResponse(await input.host.callTool({ server: input.app.server, tool: name, args }))
  }

  if (input.method === "resources/read") {
    const uri = text(record(input.params)?.["uri"])

    if (!uri) throw new Error("resources/read needs a uri")

    if (!uri.startsWith("ui://")) throw new Error("Only ui:// resources are available to an app")

    const value = await input.host.readResource({ server: input.app.server, uri })

    return { contents: [{ uri: value.uri, mimeType: value.mimeType, text: value.html }] }
  }

  if (input.method === "ui/open-link") {
    const url = text(record(input.params)?.["url"])

    if (!url) throw new Error("ui/open-link needs a url")

    input.host.openLink(url)

    return {}
  }

  if (input.method === "ui/message") {
    const body = text(record(record(input.params)?.["content"])?.["text"])

    if (!body) throw new Error("ui/message needs text content")

    input.host.sendMessage(body)

    return {}
  }

  if (input.method === "ui/update-model-context") {
    const value = record(input.params)

    input.host.updateContext({
      content: value?.["content"],
      structuredContent: record(value?.["structuredContent"]),
    })

    return {}
  }

  if (input.method === "ui/request-display-mode") return { mode: "inline" }

  throw new Error(`Unsupported method: ${input.method}`)
}

function toolResponse(result: McpAppToolResult) {
  const response: ToolResponseParams = {
    content: result.content,
    isError: result.isError,
  }

  if (result.structured !== undefined) response.structuredContent = result.structured

  if (result.meta !== undefined) response._meta = result.meta

  return response
}

function structuredContent(text: string): RecordValue | undefined {
  const trimmed = text.trim()

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined

  try {
    return record(JSON.parse(trimmed))
  } catch {
    return undefined
  }
}

function record(value: unknown): RecordValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined

  // SAFETY: the guard above proves a non-null, non-array object, so its own keys hold JSON values.
  return value as RecordValue
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined
}
