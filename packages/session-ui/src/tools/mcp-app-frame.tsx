/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type -- this module is the I/O boundary for untrusted iframe messages; every value is parsed before use. */
import { createEffect, createMemo, createResource, createSignal, on, onCleanup, onMount, Show, untrack } from "solid-js"
import type { JsonValue, McpAppLink } from "@opencode/client/promise"
import { useMcpApps } from "../context/mcp-apps"
import { bridgeResponse, toolInput, toolResult } from "./mcp-app-bridge"
import { buildMcpAppDocument, mcpAppAllow } from "./mcp-app-document"

const MIN_HEIGHT = 120

const MAX_HEIGHT = 720

const DEFAULT_HEIGHT = 320

type BridgeRequest = {
  readonly jsonrpc: "2.0"
  readonly id: string | number
  readonly method: string
  readonly params?: JsonValue
}

type BridgeMessage = {
  readonly jsonrpc: "2.0"
  readonly id?: string | number
  readonly method?: string
  readonly params?: JsonValue
  readonly result?: JsonValue
  readonly error?: { readonly code: number; readonly message: string }
}

/** Renders one MCP App in an opaque iframe and brokers its JSON-RPC bridge with the host app. */
export function McpAppView(props: {
  app: McpAppLink
  input: Record<string, JsonValue>
  output?: string
  status?: string
  error?: string
}) {
  const host = useMcpApps()

  const [resource] = createResource(
    () => props.app,
    (app) => host.read(app),
  )

  const [height, setHeight] = createSignal(DEFAULT_HEIGHT)
  const [initialized, setInitialized] = createSignal(false)
  let frame: HTMLIFrameElement | undefined
  let sentInput = false
  let sentResult = false

  const failure = createMemo(() => {
    const error = resource.error

    if (!error) return ""

    return error instanceof Error ? error.message : String(error)
  })

  const post = (message: BridgeMessage) => frame?.contentWindow?.postMessage(message, "*")

  const sendInput = () => {
    if (sentInput) return

    if (props.status === "streaming") return

    sentInput = true
    post({ jsonrpc: "2.0", method: "ui/notifications/tool-input", params: toolInput(props.input) })
  }

  const sendResult = () => {
    if (sentResult) return

    const result = toolResult({ output: props.output, status: props.status, error: props.error })

    if (!result) return

    sentResult = true
    post({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: result })
  }

  const settled = () => {
    if (!initialized()) return

    sendInput()
    sendResult()
  }

  createEffect(
    on(
      () => [initialized(), props.output, props.status, props.error] as const,
      () => settled(),
      { defer: true },
    ),
  )

  createEffect(
    on(
      () => host.theme(),
      (theme) => post({ jsonrpc: "2.0", method: "ui/notifications/host-context-changed", params: { theme } }),
      { defer: true },
    ),
  )

  const handle = async (request: BridgeRequest) => {
    try {
      const result = await bridgeResponse({
        method: request.method,
        params: request.params ?? null,
        app: props.app,
        host,
        theme: host.theme(),
      })

      // SAFETY: bridge results are built from JSON values: strings, numbers, booleans, arrays, and objects.
      post({ jsonrpc: "2.0", id: request.id, result: result as JsonValue })
    } catch (cause) {
      post({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message: cause instanceof Error ? cause.message : String(cause) },
      })
    }
  }

  onMount(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frame || event.source !== frame.contentWindow) return
      const data = record(event.data)

      if (!data || data["jsonrpc"] !== "2.0") return

      const method = text(data["method"])
      const id = data["id"]

      if (!method) return

      if (id === undefined) {
        if (method === "ui/notifications/initialized") {
          setInitialized(true)

          return
        }

        if (method === "ui/notifications/size-changed") {
          const size = record(data["params"])
          const next = number(size?.["height"])

          if (next !== undefined) setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(next))))

          return
        }

        if (method === "notifications/message") console.debug("MCP App log", data["params"])

        return
      }

      if (typeof id !== "string" && typeof id !== "number") return

      void handle({ jsonrpc: "2.0", id, method, params: data["params"] })
    }

    window.addEventListener("message", onMessage)

    onCleanup(() => {
      post({ jsonrpc: "2.0", id: "teardown", method: "ui/resource-teardown", params: { reason: "closed" } })
      window.removeEventListener("message", onMessage)
    })
  })

  const document = createMemo(() => {
    const value = resource()

    if (!value) return ""

    return buildMcpAppDocument({ html: value.html, csp: value.ui?.csp, theme: untrack(() => host.theme()) })
  })

  return (
    <Show
      when={resource()}
      fallback={
        <div class="mcp-app" role="status" aria-label={props.app.title ?? props.app.tool}>
          <Show
            when={failure()}
            fallback={
              <div class="mcp-app-loading">
                <span />
                <span />
              </div>
            }
          >
            <p class="mcp-app-error">{failure()}</p>
            <Show when={props.output}>
              {(text) => <pre class="mcp-app-fallback">{text()}</pre>}
            </Show>
          </Show>
        </div>
      }
    >
      {(value) => (
        <div class="mcp-app" data-mcp-app={props.app.tool}>
          <Show when={value().ui?.prefersBorder !== false}>
            <div class="mcp-app-title">{props.app.title ?? props.app.tool}</div>
          </Show>
          <iframe
            ref={frame}
            class="mcp-app-frame"
            title={props.app.title ?? props.app.tool}
            sandbox="allow-scripts allow-forms"
            allow={mcpAppAllow(value().ui?.permissions)}
            referrerpolicy="no-referrer"
            srcdoc={document()}
            style={{ height: `${height()}px` }}
          />
          <Show when={failure()}>
            <p class="mcp-app-error" role="status">
              {failure()}
            </p>
          </Show>
        </div>
      )}
    </Show>
  )
}

function record(value: unknown): Record<string, JsonValue> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined

  // SAFETY: the guard above proves a non-null, non-array object, so its own keys hold JSON values.
  return value as Record<string, JsonValue>
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
