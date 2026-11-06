import { createSignal } from "solid-js"
import type { McpAppLink, McpAppResource, McpAppToolResult } from "@opencode/client/promise"
import { McpAppsProvider, type McpAppHost } from "../context/mcp-apps"
import { McpAppView } from "./mcp-app-frame"

const app: McpAppLink = {
  server: "weather",
  tool: "get_weather",
  name: "weather_get_weather",
  title: "Weather",
  description: "Current weather",
  resourceUri: "ui://weather/dashboard",
  inputSchema: { type: "object" },
}

const html = `<!doctype html>
<html>
<head>
<style>
  body { margin: 0; padding: 12px; background: #fff; color: #111; font: 13px/1.4 system-ui, sans-serif; }
  h1 { margin: 0 0 8px; font-size: 16px; }
  button { padding: 4px 10px; font: inherit; }
  pre { margin: 6px 0; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>Weather</h1>
<button id="refresh">Refresh</button>
<pre id="input">input: waiting</pre>
<pre id="result">result: waiting</pre>
<pre id="called">called: none</pre>
<script>
  let next = 1
  const pending = new Map()
  function request(method, params) {
    const id = next++
    parent.postMessage({ jsonrpc: "2.0", id: id, method: method, params: params }, "*")
    return new Promise((resolve, reject) => pending.set(String(id), { resolve: resolve, reject: reject }))
  }
  window.addEventListener("message", (event) => {
    const data = event.data
    if (!data || data.jsonrpc !== "2.0") return
    if (data.id !== undefined && data.method === undefined) {
      const slot = pending.get(String(data.id))
      if (!slot) return
      pending.delete(String(data.id))
      if (data.error) slot.reject(new Error(data.error.message))
      else slot.resolve(data.result)
      return
    }
    if (data.method === "ui/notifications/tool-input") {
      document.querySelector("#input").textContent = "input: " + JSON.stringify(data.params.arguments)
    }
    if (data.method === "ui/notifications/tool-result") {
      document.querySelector("#result").textContent = "result: " + data.params.content[0].text
    }
  })
  request("ui/initialize", { appCapabilities: { availableDisplayModes: ["inline"] } }).then(() => {
    parent.postMessage({ jsonrpc: "2.0", method: "ui/notifications/initialized" }, "*")
  })
  document.querySelector("#refresh").addEventListener("click", async () => {
    const result = await request("tools/call", { name: "refresh", arguments: { city: "Oslo" } })
    document.querySelector("#called").textContent = "called: " + result.content[0].text + " / " + result.structuredContent.temperature
  })
  parent.postMessage({ jsonrpc: "2.0", method: "ui/notifications/size-changed", params: { height: 240 } }, "*")
</script>
</body>
</html>`

function BridgeStory() {
  const [sent, setSent] = createSignal("")

  const host: McpAppHost = {
    apps: () => [app],
    loading: () => false,
    read: async (link): Promise<McpAppResource> => ({
      server: link.server,
      uri: link.resourceUri,
      mimeType: "text/html;profile=mcp-app",
      html,
      ui: { prefersBorder: true },
    }),
    readResource: async (input) => ({
      server: input.server,
      uri: input.uri,
      mimeType: "text/html;profile=mcp-app",
      html,
    }),
    callTool: async (): Promise<McpAppToolResult> => ({
      isError: false,
      content: [{ type: "text", text: "21 C" }],
      structured: { temperature: 21 },
    }),
    sendMessage: (text) => setSent(text),
    updateContext: () => undefined,
    openLink: () => undefined,
    theme: () => "light",
  }

  return (
    <McpAppsProvider {...host}>
      <div style={{ width: "640px", padding: "16px" }}>
        <McpAppView app={app} input={{ city: "Oslo" }} output={'{"temperature":21}'} status="completed" />
        <output data-testid="sent">{sent()}</output>
      </div>
    </McpAppsProvider>
  )
}

export default {
  title: "OpenCode/MCP App",
  id: "mcp-app-view",
  component: McpAppView,
  parameters: { layout: "fullscreen" },
}

export const Bridge = {
  render: () => <BridgeStory />,
}
