/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion -- this parser is the boundary for model-authored JSON: it validates the kind and title, then narrows to the domain types. */
import { HTML_LIMITS, htmlBytes } from "./html-sandbox"
import { isObject, type Json } from "./json"

/**
 * The visual spec: the JSON an assistant writes inside a ```visual fence. The version stays at 1 for additive
 * changes; renderers ignore fields they do not know, so a newer assistant keeps working with an older app.
 */
export interface VisualSpec {
  readonly v: 1
  readonly kind: VisualKind
  readonly title: string
  readonly subtitle?: string
  readonly caption?: string
  readonly source?: string
  readonly note?: string
  readonly unit?: string
  readonly height?: number
  readonly data: Json
}

export const VISUAL_KINDS = [
  "diagram",
  "plot",
  "mechanism",
  "beam",
  "mohr",
  "stress-strain",
  "pv",
  "tolerance",
  "flow",
  "assembly",
  "task",
  "html",
] as const

export type VisualKind = (typeof VISUAL_KINDS)[number]

export type ParseResult =
  | { readonly ok: true; readonly spec: VisualSpec }
  | { readonly ok: false; readonly error: string }

const MAX_SPEC_BYTES = 256_000

/**
 * Parses one fenced block. The block must be JSON: comments, trailing commas and a missing `v` are rejected so a
 * malformed block falls back to the highlighted code instead of rendering a half-guessed picture.
 */
export function parseVisual(source: string): ParseResult {
  const text = source.trim()

  if (text.length === 0) return { ok: false, error: "The visual block is empty." }

  if (new TextEncoder().encode(text).length > MAX_SPEC_BYTES) return { ok: false, error: "The visual spec is larger than 256 kB." }

  let parsed: Json

  try {
    parsed = JSON.parse(text) as Json
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "The visual spec is not valid JSON." }
  }

  if (!isObject(parsed)) return { ok: false, error: "The visual spec must be a JSON object." }

  if (parsed.v !== 1) return { ok: false, error: "A visual spec needs \"v\": 1. This app does not render other versions." }

  const kind = parsed.kind

  if (typeof kind !== "string" || !(VISUAL_KINDS as readonly string[]).includes(kind))
    return { ok: false, error: `Unknown kind ${typeof kind === "string" ? `"${kind}"` : ""}. Use one of: ${VISUAL_KINDS.join(", ")}.` }

  const title = parsed.title

  if (typeof title !== "string" || title.trim().length === 0)
    return { ok: false, error: "A visual needs a title." }

  if (kind === "html") {
    if (!isObject(parsed.data)) return { ok: false, error: "An html visual needs a data object with a non-empty html string." }

    const html = parsed.data.html

    if (typeof html !== "string" || html.trim().length === 0)
      return { ok: false, error: "An html visual needs a non-empty data.html string." }

    if (htmlBytes(html) > HTML_LIMITS.html)
      return { ok: false, error: `The html body is larger than ${HTML_LIMITS.html / 1000} kB.` }

    const css = parsed.data.css

    if (css !== undefined && typeof css !== "string")
      return { ok: false, error: "data.css must be a string." }

    if (typeof css === "string" && htmlBytes(css) > HTML_LIMITS.css)
      return { ok: false, error: `The html CSS is larger than ${HTML_LIMITS.css / 1000} kB.` }

    const js = parsed.data.js

    if (js !== undefined && typeof js !== "string")
      return { ok: false, error: "data.js must be a string." }

    if (typeof js === "string" && htmlBytes(js) > HTML_LIMITS.js)
      return { ok: false, error: `The html script is larger than ${HTML_LIMITS.js / 1000} kB.` }
  }

  return {
    ok: true,
    spec: {
      v: 1,
      kind: kind as VisualKind,
      title: title.slice(0, 160),
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle.slice(0, 240) : undefined,
      caption: typeof parsed.caption === "string" ? parsed.caption.slice(0, 600) : undefined,
      source: typeof parsed.source === "string" ? parsed.source.slice(0, 300) : undefined,
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 600) : undefined,
      unit: typeof parsed.unit === "string" ? parsed.unit.slice(0, 40) : undefined,
      height: typeof parsed.height === "number" && parsed.height > 0 ? Math.min(720, parsed.height) : undefined,
      data: parsed.data ?? {},
    },
  }
}
