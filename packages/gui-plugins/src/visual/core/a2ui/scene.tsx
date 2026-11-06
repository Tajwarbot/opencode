import { Index, Show, type Accessor, type JSX } from "solid-js"
import { bool, num, object, objects, optionalNum, optionalStr, pair, pairs, str, type Json, type JsonObject } from "../json"
import type { CatalogProps } from "./types"

const W = 640

const H = 360

/** A small SVG scene: shapes, groups, transforms, and one looping spin animation. */
export function Scene(props: CatalogProps) {
  const view = () => object(props.props().view) ?? {}
  const width = () => Math.max(120, num(view().width, W))
  const height = () => Math.max(80, num(view().height, H))

  const grid = () => {
    const value = view().grid

    if (value === false) return 0

    return num(value, 40)
  }

  const marks = () => objects(props.props().shapes)
  const label = () => str(props.props().label, "")

  return (
    <div class="vza-scene">
      <svg
        viewBox={`0 0 ${width()} ${height()}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label() || undefined}
      >
        <Show when={grid() > 0}>
          <Grid width={width()} height={height()} step={grid()} />
        </Show>
        <Index each={marks()}>{(mark) => renderMark(mark)}</Index>
      </svg>
    </div>
  )
}

function Grid(props: { width: number; height: number; step: number }) {
  const columns = () => Array.from({ length: Math.floor(props.width / props.step) + 1 }, (_, index) => index * props.step)
  const rows = () => Array.from({ length: Math.floor(props.height / props.step) + 1 }, (_, index) => index * props.step)

  return (
    <g class="vza-scene-grid">
      <Index each={columns()}>{(x) => <line x1={x()} x2={x()} y1={0} y2={props.height} />}</Index>
      <Index each={rows()}>{(y) => <line x1={0} x2={props.width} y1={y()} y2={y()} />}</Index>
    </g>
  )
}

function renderMark(mark: Accessor<JsonObject>): JSX.Element {
  const type = () => str(mark().type, "line")
  const stroke = () => paint(mark().tone, "var(--v-fg-2)")
  const fill = () => paint(mark().fill, "none")
  const width = () => num(mark().width, 1.6)
  const opacity = () => optionalNum(mark().opacity)
  const dash = () => (bool(mark().dash, false) ? "4 3" : undefined)
  const animate = () => object(mark().animate)

  const body = (): JSX.Element => {
    if (type() === "group") return <Index each={objects(mark().shapes)}>{(child) => renderMark(child)}</Index>

    if (type() === "arrow") {
      const from = pair(mark().from)
      const to = pair(mark().to)

      if (!from || !to) return null

      return (
        <>
          <line
            x1={from[0]}
            y1={from[1]}
            x2={to[0]}
            y2={to[1]}
            stroke={stroke()}
            stroke-width={width()}
            stroke-dasharray={dash()}
            opacity={opacity()}
          />
          <polygon points={arrowHead(from, to, num(mark().head, 9))} fill={stroke()} opacity={opacity()} />
        </>
      )
    }

    if (type() === "line") {
      const from = pair(mark().from)
      const to = pair(mark().to)

      if (!from || !to) return null

      return (
        <line
          x1={from[0]}
          y1={from[1]}
          x2={to[0]}
          y2={to[1]}
          stroke={stroke()}
          stroke-width={width()}
          stroke-dasharray={dash()}
          opacity={opacity()}
        />
      )
    }

    if (type() === "circle") {
      const at = pair(mark().at) ?? [0, 0]

      return (
        <circle
          cx={at[0]}
          cy={at[1]}
          r={num(mark().r, 5)}
          fill={fill()}
          stroke={stroke()}
          stroke-width={width()}
          opacity={opacity()}
        />
      )
    }

    if (type() === "rect") {
      const at = pair(mark().at) ?? [0, 0]
      const size = pair(mark().size) ?? [40, 40]

      return (
        <rect
          x={at[0] - size[0] / 2}
          y={at[1] - size[1] / 2}
          width={size[0]}
          height={size[1]}
          rx={num(mark().radius, 2)}
          fill={fill()}
          stroke={stroke()}
          stroke-width={width()}
          opacity={opacity()}
        />
      )
    }

    if (type() === "path") {
      return (
        <path
          d={str(mark().d, "")}
          fill={fill()}
          stroke={stroke()}
          stroke-width={width()}
          stroke-dasharray={dash()}
          opacity={opacity()}
        />
      )
    }

    if (type() === "polygon") {
      const points = pairs(mark().points)

      if (points.length === 0) return null

      return (
        <polygon
          points={points.map((point) => `${point[0]},${point[1]}`).join(" ")}
          fill={fill()}
          stroke={stroke()}
          stroke-width={width()}
          opacity={opacity()}
        />
      )
    }

    if (type() === "text") {
      const at = pair(mark().at) ?? [0, 0]

      return (
        <text
          x={at[0]}
          y={at[1]}
          text-anchor={anchor(mark().align)}
          fill={paint(mark().tone, "var(--v-fg)")}
          font-size={`${num(mark().size, 12)}`}
          font-weight={`${num(mark().weight, 500)}`}
          opacity={opacity()}
        >
          {str(mark().text, "")}
        </text>
      )
    }

    return null
  }

  return (
    <g transform={transformOf(mark())}>
      <Show when={animate()} fallback={body()}>
        {(value) => (
          <g>
            {spin(value(), mark())}
            {body()}
          </g>
        )}
      </Show>
    </g>
  )
}

function spin(value: JsonObject, mark: JsonObject) {
  const from = num(value.from, 0)
  const to = num(value.to, 360)
  const duration = Math.max(0.2, num(value.duration, 8))
  const center = pair(value.center) ?? pair(mark.origin) ?? pair(mark.at) ?? [0, 0]
  const repeat = bool(value.once, false) ? 1 : "indefinite"

  return (
    <animateTransform
      attributeName="transform"
      type="rotate"
      from={`${from} ${center[0]} ${center[1]}`}
      to={`${to} ${center[0]} ${center[1]}`}
      dur={`${duration}s`}
      repeatCount={repeat}
    />
  )
}

function transformOf(mark: JsonObject) {
  const parts: string[] = []
  const translate = pair(mark.translate)

  if (translate) parts.push(`translate(${translate[0]} ${translate[1]})`)

  const rotate = optionalNum(mark.rotate)

  if (rotate !== undefined) {
    const center = pair(mark.origin) ?? pair(mark.at) ?? [0, 0]

    parts.push(`rotate(${rotate} ${center[0]} ${center[1]})`)
  }

  const uniform = optionalNum(mark.scale)
  const scale = uniform === undefined ? pair(mark.scale) : [uniform, uniform]

  if (scale) parts.push(`scale(${scale[0]} ${scale[1]})`)

  return parts.length > 0 ? parts.join(" ") : undefined
}

function arrowHead(from: readonly [number, number], to: readonly [number, number], size: number) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0])
  const left = [to[0] - Math.cos(angle - 0.45) * size, to[1] - Math.sin(angle - 0.45) * size]
  const right = [to[0] - Math.cos(angle + 0.45) * size, to[1] - Math.sin(angle + 0.45) * size]

  return `${to[0]},${to[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}`
}

function anchor(value: Json | undefined) {
  const name = str(value, "middle")

  if (name === "start") return "start"

  if (name === "end") return "end"

  return "middle"
}

function paint(value: Json | undefined, fallback: string) {
  const color = optionalStr(value)

  if (!color) return fallback

  if (color === "accent") return "var(--v-accent)"

  if (color === "accent-2") return "var(--v-accent-2)"

  if (color === "muted") return "var(--v-fg-3)"

  if (color === "fg") return "var(--v-fg)"

  if (color === "critical") return "var(--v-critical)"

  if (color === "success") return "var(--v-success)"

  if (color === "line") return "var(--v-line-2)"

  if (color === "none") return "none"

  return color
}
