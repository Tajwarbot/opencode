/* oxlint-disable anti-slop/no-runtime-typeof -- this file is the I/O boundary that turns an untrusted JSON block into the domain values the renderers read. */
/** A JSON value, the only shape a visual spec may carry. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/** A JSON object. */
export type JsonObject = { [key: string]: Json }

export function isObject(value: Json | undefined): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function object(value: Json | undefined): JsonObject | undefined {
  return isObject(value) ? value : undefined
}

export function array(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : []
}

export function objects(value: Json | undefined): JsonObject[] {
  return array(value).filter(isObject)
}

export function num(value: Json | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function optionalNum(value: Json | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function str(value: Json | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

export function optionalStr(value: Json | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export function bool(value: Json | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function pair(value: Json | undefined): [number, number] | undefined {
  const items = array(value)

  if (items.length < 2) return undefined
  const x = optionalNum(items[0])
  const y = optionalNum(items[1])

  return x === undefined || y === undefined ? undefined : [x, y]
}

export function pairs(value: Json | undefined, limit = 4000): Array<[number, number]> {
  return array(value)
    .slice(0, limit)
    .map(pair)
    .filter((item): item is [number, number] => item !== undefined)
}

/** Keeps a number inside a closed interval. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Rounds to a number of decimals without trailing zeros. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}

/** One prefix of a JSON document, as much as the model has written so far. */
export type PartialJson = {
  /** The value parsed so far, including partial arrays and objects. Undefined before the first value. */
  readonly value: Json | undefined
  /** True when the source ends on a complete value. */
  readonly complete: boolean
  /** True when the source leaves JSON's grammar, not merely its end. */
  readonly invalid: boolean
}

type Cursor = { readonly text: string; index: number }

type Read =
  | { readonly kind: "value"; readonly value: Json; readonly complete: boolean }
  | { readonly kind: "incomplete" }
  | { readonly kind: "invalid" }

type StringRead =
  | { readonly kind: "value"; readonly value: string; readonly complete: boolean }
  | { readonly kind: "incomplete" }
  | { readonly kind: "invalid" }

const MAX_DEPTH = 64

/**
 * Parses a JSON prefix without waiting for the closing brackets. Objects and arrays keep every member that is already
 * complete, so a streamed series can grow point by point; a number or string that still expects characters is dropped
 * until the next chunk settles it.
 */
export function parsePartialJson(source: string): PartialJson {
  const cursor: Cursor = { text: source, index: 0 }
  const read = readValue(cursor, 0)

  if (read.kind === "invalid") return { value: undefined, complete: false, invalid: true }

  if (read.kind === "incomplete") return { value: undefined, complete: false, invalid: false }

  skipSpace(cursor)

  if (cursor.index < cursor.text.length) return { value: read.value, complete: false, invalid: true }

  return { value: read.value, complete: read.complete, invalid: false }
}

function readValue(cursor: Cursor, depth: number): Read {
  if (depth > MAX_DEPTH) return { kind: "invalid" }

  skipSpace(cursor)

  if (cursor.index >= cursor.text.length) return { kind: "incomplete" }

  const char = cursor.text[cursor.index]

  if (char === "{") return readObject(cursor, depth)

  if (char === "[") return readArray(cursor, depth)

  if (char === "\"") return readString(cursor)

  if (char === "t" || char === "f" || char === "n") return readLiteral(cursor)

  if (char === "-" || (char >= "0" && char <= "9")) return readNumber(cursor)

  return { kind: "invalid" }
}

function readObject(cursor: Cursor, depth: number): Read {
  cursor.index += 1
  skipSpace(cursor)

  const value: JsonObject = {}

  if (cursor.index >= cursor.text.length) return { kind: "value", value, complete: false }

  if (cursor.text[cursor.index] === "}") {
    cursor.index += 1

    return { kind: "value", value, complete: true }
  }

  while (true) {
    skipSpace(cursor)

    if (cursor.index >= cursor.text.length) return { kind: "value", value, complete: false }

    if (cursor.text[cursor.index] !== "\"") return { kind: "invalid" }

    const key = readString(cursor)

    if (key.kind === "invalid") return key

    if (key.kind === "incomplete" || !key.complete) {
      cursor.index = cursor.text.length

      return { kind: "value", value, complete: false }
    }

    skipSpace(cursor)

    if (cursor.index >= cursor.text.length) return { kind: "value", value, complete: false }

    if (cursor.text[cursor.index] !== ":") return { kind: "invalid" }

    cursor.index += 1
    const item = readValue(cursor, depth + 1)

    if (item.kind === "invalid") return item

    if (item.kind === "incomplete") {
      cursor.index = cursor.text.length

      return { kind: "value", value, complete: false }
    }

    value[key.value] = item.value
    skipSpace(cursor)

    if (cursor.index >= cursor.text.length) return { kind: "value", value, complete: false }

    const next = cursor.text[cursor.index]

    if (next === ",") {
      cursor.index += 1
      continue
    }

    if (next === "}") {
      cursor.index += 1

      return { kind: "value", value, complete: true }
    }

    return { kind: "invalid" }
  }
}

function readArray(cursor: Cursor, depth: number): Read {
  cursor.index += 1
  skipSpace(cursor)

  const value: Json[] = []

  if (cursor.index >= cursor.text.length) return { kind: "value", value, complete: false }

  if (cursor.text[cursor.index] === "]") {
    cursor.index += 1

    return { kind: "value", value, complete: true }
  }

  while (true) {
    const item = readValue(cursor, depth + 1)

    if (item.kind === "invalid") return item

    if (item.kind === "incomplete") {
      cursor.index = cursor.text.length

      return { kind: "value", value, complete: false }
    }

    value.push(item.value)
    skipSpace(cursor)

    if (cursor.index >= cursor.text.length) return { kind: "value", value, complete: false }

    const next = cursor.text[cursor.index]

    if (next === ",") {
      cursor.index += 1
      continue
    }

    if (next === "]") {
      cursor.index += 1

      return { kind: "value", value, complete: true }
    }

    return { kind: "invalid" }
  }
}

function readString(cursor: Cursor): StringRead {
  cursor.index += 1
  let value = ""

  while (cursor.index < cursor.text.length) {
    const char = cursor.text[cursor.index]

    if (char === "\"") {
      cursor.index += 1

      return { kind: "value", value, complete: true }
    }

    if (char === "\\") {
      const escape = readEscape(cursor)

      if (escape === undefined) return { kind: "incomplete" }

      if (escape === null) return { kind: "invalid" }

      value += escape
      continue
    }

    if (char.charCodeAt(0) < 0x20) return { kind: "invalid" }

    value += char
    cursor.index += 1
  }

  return { kind: "value", value, complete: false }
}

function readEscape(cursor: Cursor): string | null | undefined {
  cursor.index += 1

  if (cursor.index >= cursor.text.length) return undefined

  const escape = cursor.text[cursor.index]

  if (escape !== "u") {
    const value = escaped(escape)

    if (value === undefined) return null

    cursor.index += 1

    return value
  }

  const hex = cursor.text.slice(cursor.index + 1, cursor.index + 5)

  if (hex.length < 4) return undefined

  if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null

  cursor.index += 5

  return String.fromCharCode(Number.parseInt(hex, 16))
}

function escaped(escape: string) {
  switch (escape) {
    case "\"":
      return "\""
    case "\\":
      return "\\"
    case "/":
      return "/"
    case "b":
      return "\b"
    case "f":
      return "\f"
    case "n":
      return "\n"
    case "r":
      return "\r"
    case "t":
      return "\t"
    default:
      return undefined
  }
}

function readLiteral(cursor: Cursor): Read {
  const rest = cursor.text.slice(cursor.index)

  const words: Array<[string, Json]> = [
    ["true", true],
    ["false", false],
    ["null", null],
  ]

  for (const [word, value] of words) {
    if (rest.startsWith(word)) {
      const end = cursor.index + word.length
      const next = cursor.text[end]

      if (next !== undefined && !isDelimiter(next)) return { kind: "invalid" }

      cursor.index = end

      return { kind: "value", value, complete: true }
    }

    if (word.startsWith(rest)) return { kind: "incomplete" }
  }

  return { kind: "invalid" }
}

function readNumber(cursor: Cursor): Read {
  const rest = cursor.text.slice(cursor.index)
  const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest)

  if (!match) {
    if (rest === "-") return { kind: "incomplete" }

    return { kind: "invalid" }
  }

  const end = cursor.index + match[0].length

  if (end >= cursor.text.length) return { kind: "incomplete" }

  const next = cursor.text[end]

  // A shorter valid prefix followed by number grammar still expects more digits, so it is not invalid yet.
  if (next === "." || next === "e" || next === "E" || next === "+" || next === "-" || (next >= "0" && next <= "9"))
    return { kind: "incomplete" }

  if (!isDelimiter(next)) return { kind: "invalid" }

  cursor.index = end

  return { kind: "value", value: Number(match[0]), complete: true }
}

function skipSpace(cursor: Cursor) {
  while (cursor.index < cursor.text.length && /\s/.test(cursor.text[cursor.index])) cursor.index += 1
}

function isDelimiter(char: string) {
  return char === "," || char === "]" || char === "}" || /\s/.test(char)
}
