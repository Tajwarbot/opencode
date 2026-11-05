/* oxlint-disable anti-slop/no-runtime-typeof -- messages from the sandboxed frame are untrusted. */
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { IconButton, ResetIcon } from "../controls"
import { VisualFrame } from "../frame"
import { buildHtmlDocument, clampHtmlHeight, readHtmlData, readHtmlTheme } from "../html-sandbox"
import type { VisualSpec } from "../spec"

/**
 * General-purpose tier. The model writes a fragment, CSS, and an optional classic script. The document runs in an
 * opaque iframe with scripts but no same-origin access, no network, and no bridge back to the app.
 */
export function HtmlVisual(props: { spec: VisualSpec }) {
  const data = readHtmlData(props.spec.data)
  const tokens = readHtmlTheme()
  const [height, setHeight] = createSignal(clampHtmlHeight(props.spec.height))
  const [error, setError] = createSignal("")
  const [generation, setGeneration] = createSignal(0)
  const frameContent = createMemo(() => `${buildHtmlDocument({ data, tokens })}<!--${generation()}-->`)
  let frame: HTMLIFrameElement | undefined

  const syncTheme = () => {
    const target = frame?.contentWindow

    if (!target) return

    target.postMessage({ type: "visual:theme", tokens: readHtmlTheme() }, "*")
  }

  const reload = () => {
    setError("")
    setGeneration((value) => value + 1)
  }

  onMount(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frame || event.source !== frame.contentWindow) return

      const payload: unknown = event.data

      if (typeof payload !== "object" || payload === null || !("type" in payload)) return

      const type = payload.type
      const value = "height" in payload ? payload.height : "message" in payload ? payload.message : undefined

      if (type === "visual:height" && typeof value === "number") setHeight(clampHtmlHeight(value))

      if (type === "visual:error" && typeof value === "string") setError(value.slice(0, 240))
    }

    const observer = new MutationObserver(syncTheme)

    window.addEventListener("message", onMessage)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })

    const timer = setTimeout(syncTheme, 250)

    onCleanup(() => {
      clearTimeout(timer)
      window.removeEventListener("message", onMessage)
      observer.disconnect()
    })
  })

  return (
    <VisualFrame
      spec={props.spec}
      height={height()}
      tools={
        <IconButton label="Reload generated UI" onClick={reload}>
          <ResetIcon />
        </IconButton>
      }
      stage={
        <div class="vz-html-wrap">
          <div class="vz-html" style={{ height: `${height()}px` }}>
            <iframe
              ref={frame}
              class="vz-html-frame"
              title={props.spec.title}
              sandbox="allow-scripts"
              referrerpolicy="no-referrer"
              srcdoc={frameContent()}
              onLoad={syncTheme}
            />
          </div>
          <Show when={error()}>
            <p class="vz-html-error" role="status">
              {error()}
            </p>
          </Show>
        </div>
      }
    />
  )
}
