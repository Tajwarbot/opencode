/* oxlint-disable anti-slop/no-runtime-typeof -- formatting a JSON value distinguishes its string form for display. */
import { createResource, type ParentProps } from "solid-js"
import type { JsonValue } from "@opencode/client/promise"
import { useTheme } from "@opencode/ui/theme/context"
import { useData } from "@opencode/session-ui/context"
import { McpAppsProvider, type McpAppHost } from "@opencode/session-ui/context/mcp-apps"
import { useComposerState } from "@/composer/persistence"
import { useServerSDK } from "@/runtime/server/client"
import { usePlatform } from "@/runtime/platform/platform"

/** Wires the MCP Apps bridge to the SDK, the composer, and the current theme. */
export function McpAppHostProvider(props: ParentProps) {
  const data = useData()
  const sdk = useServerSDK()
  const prompt = useComposerState()
  const theme = useTheme()
  const platform = usePlatform()

  const [catalog] = createResource(async () => {
    try {
      const result = await sdk.api.experimental.mcp.app.catalog({ location: { directory: data.directory } })

      return result.data.apps
    } catch {
      // A server without the experimental MCP Apps route (older build, partial rollout) must not take the session
      // screen down with it; the session works without the app catalog.
      return []
    }
  })

  const host: McpAppHost = {
    apps: () => catalog() ?? [],
    loading: () => catalog.loading,
    read: async (app) =>
      (
        await sdk.api.experimental.mcp.app.resource({
          location: { directory: data.directory },
          server: app.server,
          uri: app.resourceUri,
        })
      ).data,
    readResource: async (input) =>
      (
        await sdk.api.experimental.mcp.app.resource({
          location: { directory: data.directory },
          server: input.server,
          uri: input.uri,
        })
      ).data,
    callTool: async (input) => {
      const sessionID = data.sessionID

      if (!sessionID) throw new Error("MCP Apps need an open session")

      return (
        await sdk.api.experimental.mcp.app.tool({
          location: { directory: data.directory },
          sessionID,
          server: input.server,
          tool: input.tool,
          arguments: input.args,
        })
      ).data
    },
    sendMessage: (text) => {
      const parts = prompt.current()
      const offset = parts.reduce((max, part) => ("end" in part ? Math.max(max, part.end) : max), 0)
      const content = `${offset > 0 ? "\n\n" : ""}${text}`

      prompt.set(
        [...parts, { type: "text", content, start: offset, end: offset + content.length }],
        offset + content.length,
      )
    },
    updateContext: ({ content, structuredContent }) => {
      const comment = structuredContent === undefined ? stringify(content) : JSON.stringify(structuredContent)

      if (!comment) return

      const note = {
        type: "note" as const,
        origin: "mcp-app",
        label: "MCP App context",
        icon: "sparkles",
        subject: "MCP App",
        comment,
        commentID: `mcp-app-${Date.now()}`,
      }

      prompt.context.replaceComments([note])
    },
    openLink: (url) => {
      const target = safeURL(url)

      if (target) platform.openExternal(target)
    },
    theme: () => theme.mode(),
  }

  return <McpAppsProvider {...host}>{props.children}</McpAppsProvider>
}

function stringify(value: JsonValue | undefined) {
  if (value === undefined) return ""

  if (typeof value === "string") return value

  return JSON.stringify(value)
}

function safeURL(value: string) {
  try {
    const url = new URL(value)

    if (url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:") return url.toString()
  } catch {
    return undefined
  }

  return undefined
}
