import { createMemo, ErrorBoundary, Show, Suspense } from "solid-js"
import { VisualError } from "./frame"
import { parseVisualStream, type StreamParse } from "./spec"
import { RENDERERS } from "./registry"

/** Reparsing every chunk of a long spec costs more than the drawing it enables, so parse on a fixed length step. */
const PARSE_STEP = 48

/**
 * Renders one visual from its fenced block. Inline blocks keep the code for a malformed spec, because returning
 * nothing is the CodeBlock contract for "declined"; the workbench shows the parse error instead. While a streamed block
 * is incomplete, only kinds that can draw their prefix render; the rest keep a skeleton until the closing fence.
 */
export function VisualView(props: {
  code: string
  complete?: boolean
  context?: "inline" | "workbench"
  onError?: (message: string) => void
}) {
  let last: { bucket: number; complete: boolean; code: string; result: StreamParse } | undefined
  const complete = () => props.complete !== false

  const parsed = createMemo(() => {
    const code = props.code
    const ready = complete()
    const bucket = ready ? code.length : Math.floor(code.length / PARSE_STEP)

    if (last && last.bucket === bucket && last.complete === ready && last.code === code) return last.result

    const result = parseVisualStream(code)
    last = { bucket, complete: ready, code, result }

    return result
  })

  const spec = () => {
    const result = parsed()

    if (result.status !== "ready") return undefined

    if (!complete() && result.spec.kind !== "plot") return undefined

    return result.spec
  }

  const failure = () => {
    const result = parsed()

    return result.status === "error" ? result.error : ""
  }

  return (
    <Show
      when={spec()?.kind}
      keyed
      fallback={
        <Show when={props.context === "workbench" && failure()} fallback={<Skeleton />}>
          <VisualError message={failure()} />
        </Show>
      }
    >
      {(kind) => {
        const Component = RENDERERS[kind]

        const content = () => (
          <Suspense fallback={<div class="vz vz-loading" />}>
            <Show when={spec()}>{(value) => <Component spec={value()} streaming={!complete()} />}</Show>
          </Suspense>
        )

        if (props.context !== "workbench") return content()

        return (
          <ErrorBoundary
            fallback={(error: Error) => {
              props.onError?.(error.message)

              return <VisualError title="The renderer stopped" message={error.message} />
            }}
          >
            {content()}
          </ErrorBoundary>
        )
      }}
    </Show>
  )
}

function Skeleton() {
  return (
    <div class="vz vz-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

/** A stable, short id for a block, used to deduplicate the workbench list. */
export function visualID(code: string): string {
  let hash = 2166136261

  for (let index = 0; index < code.length; index += 1) {
    hash ^= code.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}
