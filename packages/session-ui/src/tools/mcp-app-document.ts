import type { McpUiCsp, McpUiPermissions } from "@opencode/client/promise"

const DEFAULT_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ")

const PERMISSION_NAMES: ReadonlyArray<[keyof McpUiPermissions, string]> = [
  ["camera", "camera"],
  ["microphone", "microphone"],
  ["geolocation", "geolocation"],
  ["clipboardWrite", "clipboard-write"],
]

/**
 * Builds the CSP a View runs under. Declared domains widen only the directive they belong to; everything else keeps
 * the restrictive default. The document is a srcdoc frame, so a meta element is the only header the sandbox honors.
 */
export function mcpAppCsp(csp: McpUiCsp | undefined) {
  if (!csp) return DEFAULT_CSP

  const directives = [
    "default-src 'none'",
    sourceList("script-src", ["'unsafe-inline'", ...origins(csp.resourceDomains)]),
    sourceList("style-src", ["'unsafe-inline'", ...origins(csp.resourceDomains)]),
    sourceList("img-src", ["'self'", "data:", ...origins(csp.resourceDomains)]),
    sourceList("media-src", ["'self'", "data:", ...origins(csp.resourceDomains)]),
    sourceList("font-src", ["'self'", "data:", ...origins(csp.resourceDomains)]),
    sourceList("connect-src", origins(csp.connectDomains)),
    sourceList("frame-src", origins(csp.frameDomains)),
    sourceList("base-uri", ["'self'", ...origins(csp.baseUriDomains)]),
    "object-src 'none'",
  ]

  return directives.join("; ")
}

/** The iframe `allow` attribute from declared permissions. Undeclared capabilities stay denied. */
export function mcpAppAllow(permissions: McpUiPermissions | undefined) {
  if (!permissions) return undefined

  const granted = PERMISSION_NAMES.flatMap(([key, name]) => {
    const value = permissions[key]

    return value !== undefined && value !== null && value !== false ? [name] : []
  })

  return granted.length === 0 ? undefined : granted.join("; ")
}

/**
 * Places the CSP and the host theme ahead of the server's document. The document keeps every script and style it
 * already carried; the meta element only narrows what those may load.
 */
export function buildMcpAppDocument(input: {
  readonly html: string
  readonly csp?: McpUiCsp
  readonly theme: "light" | "dark"
}) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(mcpAppCsp(input.csp))}">`
  const themeMeta = `<meta name="color-scheme" content="${input.theme}">`
  const head = `${meta}${themeMeta}`

  if (/<head[\s>]/i.test(input.html)) return input.html.replace(/<head([^>]*)>/i, `<head$1>${head}`)

  if (/<html[\s>]/i.test(input.html)) return input.html.replace(/<html([^>]*)>/i, `<html$1><head>${head}</head>`)

  return `<!doctype html><html><head>${head}</head><body>${input.html}</body></html>`
}

function origins(domains: readonly string[] | undefined) {
  if (!domains || domains.length === 0) return []

  return domains.flatMap((domain) => (isOrigin(domain) ? [domain.endsWith("/") ? domain.slice(0, -1) : domain] : []))
}

function sourceList(name: string, values: readonly string[]) {
  return `${name} ${values.length === 0 ? "'none'" : values.join(" ")}`
}

function isOrigin(value: string) {
  return /^https?:\/\/[^ "';]+$/.test(value) || /^wss?:\/\/[^ "';]+$/.test(value)
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
}
