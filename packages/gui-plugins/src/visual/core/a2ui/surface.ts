import { array, isObject, object, optionalStr, type Json, type JsonObject } from "../json"
import type { A2UIComponent, A2UISurfaces } from "./types"

export const EMPTY_SURFACES: A2UISurfaces = new Map()

/**
 * Applies every message that is complete enough to read. Components merge by ID, so a message that is still being
 * written can add the fields it has and the next parse fills the rest without duplicating anything.
 */
export function applyMessages(state: A2UISurfaces, messages: readonly Json[]): A2UISurfaces {
  const next = new Map(state)

  for (const message of messages) {
    if (!isObject(message)) continue

    const create = object(message.createSurface)

    if (create) {
      const id = optionalStr(create.surfaceId)
      const previous = id ? next.get(id) : undefined

      if (!id) continue

      next.set(id, {
        id,
        catalogId: optionalStr(create.catalogId) ?? previous?.catalogId,
        components: mergeComponents(previous?.components, create.components),
        data: mergeRoot(previous?.data, create.dataModel),
      })

      continue
    }

    const update = object(message.updateComponents)

    if (update) {
      const id = optionalStr(update.surfaceId)

      if (!id) continue

      const previous = next.get(id)

      next.set(id, {
        id,
        catalogId: previous?.catalogId,
        components: mergeComponents(previous?.components, update.components),
        data: previous?.data ?? {},
      })

      continue
    }

    const data = object(message.updateDataModel)

    if (data) {
      const id = optionalStr(data.surfaceId)

      if (!id) continue

      const previous = next.get(id)
      const value = data.value
      const path = optionalStr(data.path) ?? "/"

      next.set(id, {
        id,
        catalogId: previous?.catalogId,
        components: previous?.components ?? new Map(),
        data: writePath(previous?.data ?? {}, path, value),
      })

      continue
    }

    const remove = object(message.deleteSurface)
    const id = remove ? optionalStr(remove.surfaceId) : undefined

    if (id) next.delete(id)
  }

  return next
}

/** Resolves A2UI data bindings against a surface data model. */
export function resolveValue(value: Json | undefined, data: JsonObject): Json | undefined {
  if (value === undefined) return undefined

  if (Array.isArray(value)) {
    const out: Json[] = []

    for (const item of value) {
      const resolved = resolveValue(item, data)

      if (resolved === undefined) return undefined

      out.push(resolved)
    }

    return out
  }

  if (isObject(value)) {
    const path = optionalStr(value["@path"])

    if (path) return readPath(data, path)

    if (optionalStr(value["@call"])) return undefined

    const out: JsonObject = {}

    for (const [key, item] of Object.entries(value)) {
      const resolved = resolveValue(item, data)

      if (resolved !== undefined) out[key] = resolved
    }

    return out
  }

  return value
}

/** The binding path of a dynamic value, when it has one. */
export function pathOf(value: Json | undefined) {
  if (!isObject(value)) return undefined

  return optionalStr(value["@path"])
}

/** The string entries of a child list, ignoring templates for now. */
export function stringList(value: Json | undefined) {
  const out: string[] = []

  for (const item of array(value)) {
    const text = optionalStr(item)

    if (text !== undefined) out.push(text)
  }

  return out
}

/** Writes a JSON Pointer path, merging object values so partial updates do not drop earlier keys. */
export function writePath(data: JsonObject, path: string, value: Json): JsonObject {
  const segments = pointerSegments(path)

  if (segments.length === 0) return isObject(value) ? { ...data, ...value } : {}

  const next = write(data, segments, 0, value)

  return isObject(next) ? next : data
}

/** Reads a JSON Pointer path from a surface data model. */
export function readPath(data: JsonObject, path: string): Json | undefined {
  const segments = pointerSegments(path)
  let current: Json | undefined = data

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10)

      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined

      current = current[index]
      continue
    }

    if (!isObject(current)) return undefined

    current = current[segment]
  }

  return current
}

function mergeComponents(
  base: ReadonlyMap<string, A2UIComponent> | undefined,
  value: Json | undefined,
): ReadonlyMap<string, A2UIComponent> {
  const next = new Map(base)

  for (const item of array(value)) {
    if (!isObject(item)) continue

    const id = optionalStr(item.id)

    if (!id) continue

    const name = optionalStr(item.component)
    const previous = next.get(id)

    if (!name) {
      if (previous) next.set(id, { ...previous, ...item, id, component: previous.component })

      continue
    }

    next.set(id, { ...previous, ...item, id, component: name })
  }

  return next
}

function mergeRoot(base: JsonObject | undefined, value: Json | undefined): JsonObject {
  if (isObject(value)) return { ...(base ?? {}), ...value }

  return base ?? {}
}

function write(
  current: Json | undefined,
  segments: readonly string[],
  index: number,
  value: Json,
): Json | undefined {
  if (index === segments.length) {
    if (value === null) return undefined

    if (isObject(current) && isObject(value)) return { ...current, ...value }

    return value
  }

  const key = segments[index]

  if (Array.isArray(current)) {
    const position = Number.parseInt(key, 10)

    if (!Number.isInteger(position) || position < 0) return current

    const next = current.slice()
    const child = write(next[position], segments, index + 1, value)

    if (child === undefined) next.splice(position, 1)
    else next[position] = child

    return next
  }

  const next = isObject(current) ? { ...current } : {}
  const child = write(next[key], segments, index + 1, value)

  if (child === undefined) delete next[key]
  else next[key] = child

  return next
}

function pointerSegments(path: string) {
  if (path === "" || path === "/") return []

  const trimmed = path.startsWith("/") ? path.slice(1) : path

  return trimmed.split("/").map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
}
