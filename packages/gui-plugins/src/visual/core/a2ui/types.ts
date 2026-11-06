import type { JSX } from "solid-js"
import type { Json, JsonObject } from "../json"

/** One A2UI component as it arrives on the wire. Properties are flat, next to `id` and `component`. */
export type A2UIComponent = JsonObject & {
  readonly id: string
  readonly component: string
}

/** One rendered surface: its component graph and its data model. */
export type A2UISurface = {
  readonly id: string
  readonly catalogId?: string
  readonly components: ReadonlyMap<string, A2UIComponent>
  readonly data: JsonObject
}

export type A2UISurfaces = ReadonlyMap<string, A2UISurface>

/** What a catalog component receives. Read `props()` in JSX so data binding stays reactive. */
export type CatalogProps = {
  readonly raw: A2UIComponent
  readonly props: () => JsonObject
  readonly ctx: CatalogContext
}

/** Shared surface state and actions for every catalog component. */
export type CatalogContext = {
  readonly surface: () => A2UISurface | undefined
  readonly data: () => JsonObject
  readonly render: (id: string) => JSX.Element
  readonly setData: (path: string, value: Json) => void
  readonly onAction?: (action: Json) => void
}

export type CatalogComponent = (props: CatalogProps) => JSX.Element
