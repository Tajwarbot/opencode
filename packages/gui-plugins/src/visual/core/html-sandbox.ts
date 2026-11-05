/* oxlint-disable anti-slop/no-runtime-typeof -- this file is the boundary between model-authored strings and the sandboxed document. */
import { isObject, type Json } from "./json"

/** Size limits for the general-purpose HTML tier. The spec parser enforces the same numbers. */
export const HTML_LIMITS = {
  html: 160_000,
  css: 40_000,
  js: 80_000,
  minHeight: 160,
  maxHeight: 1200,
  defaultHeight: 420,
} as const

export interface HtmlVisualData {
  readonly html: string
  readonly css: string
  readonly js: string
}

const encoder = new TextEncoder()

export function htmlBytes(value: string): number {
  return encoder.encode(value).length
}

/** Reads the html payload. The parser has already rejected a missing or oversized document. */
export function readHtmlData(data: Json): HtmlVisualData {
  const value = isObject(data) ? data : {}

  return {
    html: typeof value.html === "string" ? value.html : "",
    css: typeof value.css === "string" ? value.css : "",
    js: typeof value.js === "string" ? value.js : "",
  }
}

export function clampHtmlHeight(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return HTML_LIMITS.defaultHeight

  return Math.max(HTML_LIMITS.minHeight, Math.min(HTML_LIMITS.maxHeight, Math.round(value)))
}

export interface HtmlTheme {
  readonly "--bg": string
  readonly "--surface": string
  readonly "--fg": string
  readonly "--muted": string
  readonly "--line": string
  readonly "--line-strong": string
  readonly "--accent": string
  readonly "--critical": string
  readonly "--success": string
  readonly "--font": string
  readonly "--mono": string
  readonly "--radius": string
}

/** Snapshots the host theme so the iframe starts on the same palette. */
export function readHtmlTheme(): HtmlTheme {
  if (typeof document === "undefined") {
    return {
      "--bg": "#121212",
      "--surface": "#151515",
      "--fg": "#ededed",
      "--muted": "rgba(255, 255, 255, 0.62)",
      "--line": "#202020",
      "--line-strong": "#2a2a2a",
      "--accent": "#fab283",
      "--critical": "#fc533a",
      "--success": "#12c905",
      "--font": "sans-serif",
      "--mono": "monospace",
      "--radius": "6px",
    }
  }

  const style = getComputedStyle(document.documentElement)

  const read = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim()

    return value.length > 0 ? value : fallback
  }

  return {
    "--bg": read("--background-strong", "#121212"),
    "--surface": read("--background-stronger", "#151515"),
    "--fg": read("--text-strong", "#ededed"),
    "--muted": read("--text-base", "rgba(255, 255, 255, 0.62)"),
    "--line": read("--border-weaker-base", "#202020"),
    "--line-strong": read("--border-weak-base", "#2a2a2a"),
    "--accent": read("--surface-brand-base", "#fab283"),
    "--critical": read("--surface-critical-strong", "#fc533a"),
    "--success": read("--surface-success-strong", "#12c905"),
    "--font": read("--font-family-sans", "sans-serif"),
    "--mono": read("--font-family-mono", "monospace"),
    "--radius": read("--radius-md", "6px"),
  }
}

function safeToken(value: string): string {
  return value.replaceAll("}", "").replaceAll("</style", "<\\/style").slice(0, 200)
}

function tokenCSS(tokens: HtmlTheme): string {
  const body = Object.entries(tokens)
    .map(([name, value]) => `${name}: ${safeToken(value)};`)
    .join("")

  return `:root{${body}}`
}

/** Removes a full-document wrapper so the fragment stays inside the workspace body. */
function stripDocumentWrapper(html: string): string {
  return html.replace(/<\/?body[^>]*>/gi, "").replace(/<\/?html[^>]*>/gi, "")
}

function escapeStyle(css: string): string {
  return css.replaceAll("</style", "<\\/style")
}

function escapeScript(js: string): string {
  return js.replaceAll("</script", "<\\/script")
}

const CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ")

const BASE_CSS = `
*{box-sizing:border-box}
html,body{margin:0;min-height:0;background:var(--bg);color:var(--fg);font-family:var(--font);font-size:13px;line-height:1.45}
body{padding:14px}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
`.trim()

const BOOTSTRAP = `(() => {
  let last = -1
  const post = (type, payload) => { try { parent.postMessage({ type, ...payload }, "*") } catch {} }
  const measure = () => {
    if (!document.body) return
    const height = Math.ceil(Math.max(document.body.scrollHeight, document.body.getBoundingClientRect().height))
    if (height === last) return
    last = height
    post("visual:height", { height })
  }
  const schedule = () => requestAnimationFrame(measure)
  window.addEventListener("load", schedule)
  window.addEventListener("error", (event) => post("visual:error", { message: String(event.message || "Script error") }))
  window.addEventListener("message", (event) => {
    const data = event.data
    if (!data || data.type !== "visual:theme" || !data.tokens) return
    for (const [name, value] of Object.entries(data.tokens)) {
      if (typeof value === "string") document.documentElement.style.setProperty(name, value)
    }
    schedule()
  })
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule)
    observer.observe(document.documentElement)
    if (document.body) observer.observe(document.body)
  }
  schedule()
  setTimeout(schedule, 200)
  setTimeout(schedule, 800)
})()`

/**
 * Builds the opaque iframe document. The frame has scripts but no same-origin access, no network, and no host
 * bridge; every byte comes from the spec and the host theme.
 */
export function buildHtmlDocument(input: { data: HtmlVisualData; tokens: HtmlTheme }): string {
  const html = stripDocumentWrapper(input.data.html)
  const css = escapeStyle(input.data.css)
  const js = escapeScript(input.data.js)

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${CSP}"><style>${tokenCSS(input.tokens)}${BASE_CSS}${css}</style></head><body>${html}<script>${BOOTSTRAP}</script><script>${js}</script></body></html>`
}
