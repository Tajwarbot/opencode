import type { JsonValue, McpAppLink, McpAppResource, McpAppToolResult } from "@opencode/client/promise"
import { createSimpleContext } from "@opencode/ui/context"

/** One app tool call as the MCP Apps bridge asks the host to run it. */
export type McpAppCall = {
  readonly server: string
  readonly tool: string
  readonly args: Record<string, JsonValue>
}

/** The host side of the MCP Apps bridge. The app package implements it with the SDK client and the composer. */
export type McpAppHost = {
  readonly apps: () => readonly McpAppLink[]
  readonly loading: () => boolean
  readonly read: (app: McpAppLink) => Promise<McpAppResource>
  readonly readResource: (input: { readonly server: string; readonly uri: string }) => Promise<McpAppResource>
  readonly callTool: (input: McpAppCall) => Promise<McpAppToolResult>
  readonly sendMessage: (text: string) => void
  readonly updateContext: (input: {
    readonly content?: JsonValue
    readonly structuredContent?: Record<string, JsonValue>
  }) => void
  readonly openLink: (url: string) => void
  readonly theme: () => "light" | "dark"
}

export const { use: useMcpApps, provider: McpAppsProvider, context: McpAppsContext } = createSimpleContext({
  name: "McpApps",
  gate: false,
  init: (props: McpAppHost) => props,
})
