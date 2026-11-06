import { isRecord } from "@opencode/util/record"

/** The MIME type an MCP App document declares. */
export const APP_MIME = "text/html;profile=mcp-app"

/** The UI metadata a tool declares for its view. */
export type ToolUi = {
  readonly resourceUri?: string
  readonly visibility: ReadonlyArray<"model" | "app">
}

/**
 * Reads `_meta.ui` from a tool definition. The flat `_meta["ui/resourceUri"]` form is deprecated but still accepted
 * because servers in the wild still send it.
 */
export function readToolUi(meta: Record<string, unknown> | undefined): ToolUi {
  const visibility = readVisibility(isRecord(meta) && isRecord(meta["ui"]) ? meta["ui"]["visibility"] : undefined)

  if (isRecord(meta) && isRecord(meta["ui"])) {
    const uri = meta["ui"]["resourceUri"]

    if (typeof uri === "string" && uri.startsWith("ui://")) return { resourceUri: uri, visibility }
  }

  if (isRecord(meta)) {
    const uri = meta["ui/resourceUri"]

    if (typeof uri === "string" && uri.startsWith("ui://")) return { resourceUri: uri, visibility }
  }

  return { visibility }
}

/** Whether a tool is visible to the model. Tools that omit visibility default to both model and app. */
export function modelVisible(meta: Record<string, unknown> | undefined) {
  return readToolUi(meta).visibility.includes("model")
}

/** Whether an app may call a tool on its own server. */
export function appVisible(meta: Record<string, unknown> | undefined) {
  return readToolUi(meta).visibility.includes("app")
}

/** Reads the UI resource metadata that carries CSP, permissions, and display preferences. */
export function readResourceUi(meta: Record<string, unknown> | undefined) {
  if (!isRecord(meta) || !isRecord(meta["ui"])) return undefined

  const ui = meta["ui"]

  return {
    csp: readCsp(ui["csp"]),
    permissions: readPermissions(ui["permissions"]),
    domain: typeof ui["domain"] === "string" ? ui["domain"] : undefined,
    prefersBorder: typeof ui["prefersBorder"] === "boolean" ? ui["prefersBorder"] : undefined,
  }
}

function readVisibility(value: unknown): ReadonlyArray<"model" | "app"> {
  if (!Array.isArray(value)) return ["model", "app"]

  const out: Array<"model" | "app"> = []

  for (const item of value) {
    if (item === "model" || item === "app") out.push(item)
  }

  return out.length === 0 ? ["model", "app"] : out
}

function readCsp(value: unknown) {
  if (!isRecord(value)) return undefined

  return {
    connectDomains: readDomains(value["connectDomains"]),
    resourceDomains: readDomains(value["resourceDomains"]),
    frameDomains: readDomains(value["frameDomains"]),
    baseUriDomains: readDomains(value["baseUriDomains"]),
  }
}

function readDomains(value: unknown) {
  if (!Array.isArray(value)) return undefined

  const out: string[] = []

  for (const item of value) {
    if (typeof item === "string" && item.length > 0) out.push(item)
  }

  return out.length === 0 ? undefined : out
}

function granted(value: unknown) {
  if (value === undefined || value === null || value === false) return undefined

  return true
}

function readPermissions(value: unknown) {
  if (!isRecord(value)) return undefined

  return {
    camera: granted(value["camera"]),
    microphone: granted(value["microphone"]),
    geolocation: granted(value["geolocation"]),
    clipboardWrite: granted(value["clipboardWrite"]),
  }
}
