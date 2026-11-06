import { createMemo, createSignal, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { createKeyed } from "@opencode/plugin/gui"
import { array, object, optionalStr, type Json } from "../json"
import type { VisualSpec } from "../spec"
import { VisualFrame } from "../frame"
import { catalogComponent } from "./catalog"
import { applyMessages, EMPTY_SURFACES, resolveValue, writePath } from "./surface"
import type { A2UIComponent, CatalogContext } from "./types"

/**
 * Renders one A2UI surface from the messages collected so far. Components and data merge by ID, so a partial message
 * draws what it already carries and the next chunk fills the rest.
 */
export function A2UIVisual(props: { spec: VisualSpec; streaming?: boolean; onAction?: (action: Json) => void }) {
  const data = () => object(props.spec.data) ?? {}
  const messages = () => array(data().messages)
  const surfaces = createMemo(() => applyMessages(EMPTY_SURFACES, messages()))

  const surface = () => {
    const requested = optionalStr(data().surfaceId)
    const all = surfaces()

    return (requested ? all.get(requested) : undefined) ?? all.values().next().value
  }

  const [overrides, setOverrides] = createSignal<Record<string, Json>>({})

  createKeyed(() => surface()?.id, () => setOverrides({}))

  const merged = () => {
    let result = surface()?.data ?? {}

    for (const [path, value] of Object.entries(overrides())) result = writePath(result, path, value)

    return result
  }

  const context: CatalogContext = {
    surface,
    data: merged,
    render: (id) => <ComponentView id={id} ctx={context} />,
    setData: (path, value) => setOverrides((current) => ({ ...current, [path]: value })),
    onAction: props.onAction,
  }

  return (
    <VisualFrame
      spec={props.spec}
      stage={
        <div class="vza-root">
          <Show
            when={surface()?.components.get("root")}
            fallback={
              <div class="vza-waiting" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            }
          >
            <ComponentView id="root" ctx={context} />
          </Show>
        </div>
      }
    />
  )
}

function ComponentView(props: { id: string; ctx: CatalogContext }) {
  const raw = () => props.ctx.surface()?.components.get(props.id)

  const resolved = () => {
    const value = raw()

    return value ? object(resolveValue(value, props.ctx.data())) ?? {} : {}
  }

  return (
    <Show when={raw()} fallback={null}>
      {(value) => {
        const component = () => catalogComponent(value().component)

        return (
          <Show when={component()} fallback={<Unknown component={value()} />}>
            {(entry) => <Dynamic component={entry()} raw={value()} props={resolved} ctx={props.ctx} />}
          </Show>
        )
      }}
    </Show>
  )
}

function Unknown(props: { component: A2UIComponent }) {
  return (
    <div class="vza-unknown">
      <span>{props.component.component}</span>
    </div>
  )
}
