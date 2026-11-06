import { For, Index, Show } from "solid-js"
import {
  array,
  bool,
  isObject,
  num,
  objects,
  optionalNum,
  optionalStr,
  str,
  type Json,
} from "../json"
import { pathOf, stringList } from "./surface"
import { Scene } from "./scene"
import type { CatalogComponent, CatalogProps } from "./types"

export const CATALOG = {
  Column,
  Row,
  Card,
  Text,
  Divider,
  Slider,
  CheckBox,
  TextField,
  ChoicePicker,
  Table,
  Metric,
  Callout,
  Steps,
  Scene,
} satisfies Record<string, CatalogComponent>

/** The entry for a component name, or undefined when the name is not in the catalog. */
export function catalogComponent(name: string) {
  return Object.entries(CATALOG).find(([key]) => key === name)?.[1]
}

function Column(props: CatalogProps) {
  return (
    <div
      class="vza-column"
      style={{
        gap: `${num(props.props().gap, 12)}px`,
        "align-items": align(props.props().align),
        "justify-content": justify(props.props().justify),
      }}
    >
      <Children props={props} />
    </div>
  )
}

function Row(props: CatalogProps) {
  return (
    <div
      class="vza-row"
      style={{
        gap: `${num(props.props().gap, 12)}px`,
        "align-items": align(props.props().align),
        "justify-content": justify(props.props().justify),
        "flex-wrap": bool(props.props().wrap, false) ? "wrap" : "nowrap",
      }}
    >
      <Children props={props} />
    </div>
  )
}

function Card(props: CatalogProps) {
  return (
    <div class="vza-card">
      <Children props={props} />
    </div>
  )
}

function Children(props: { props: CatalogProps }) {
  const ids = () => childIds(props.props)

  return <For each={ids()}>{(id) => props.props.ctx.render(id)}</For>
}

function Text(props: CatalogProps) {
  const value = () => visibleText(props.props().text)
  const variant = () => str(props.props().variant, "body")
  const heading = () => value().startsWith("# ")
  const content = () => (heading() ? value().slice(2) : value())

  return (
    <Show
      when={heading()}
      fallback={
        <p class={`vza-text vza-text-${variant()}`} style={{ "text-align": textAlign(props.props().align) }}>
          {content()}
        </p>
      }
    >
      <h3 class={`vza-text vza-text-${variant()}`}>{content()}</h3>
    </Show>
  )
}

function Divider() {
  return <div class="vza-divider" />
}

function Slider(props: CatalogProps) {
  const min = () => num(props.props().min, 0)
  const max = () => num(props.props().max, 100)
  const step = () => num(props.props().step, 1)
  const value = () => clamp(num(props.props().value, min()), min(), max())
  const path = () => pathOf(props.raw.value)

  return (
    <label class="vza-control">
      <span class="vza-control-head">
        <span>{str(props.props().label, "")}</span>
        <b>{format(value())}</b>
      </span>
      <input
        type="range"
        min={min()}
        max={max()}
        step={step()}
        value={value()}
        onInput={(event) => {
          const target = path()

          if (target) props.ctx.setData(target, Number(event.currentTarget.value))
        }}
      />
    </label>
  )
}

function CheckBox(props: CatalogProps) {
  const path = () => pathOf(props.raw.value)

  return (
    <label class="vza-check">
      <input
        type="checkbox"
        checked={bool(props.props().value, false)}
        onChange={(event) => {
          const target = path()

          if (target) props.ctx.setData(target, event.currentTarget.checked)
        }}
      />
      <span>{str(props.props().label, "")}</span>
    </label>
  )
}

function TextField(props: CatalogProps) {
  const path = () => pathOf(props.raw.value)

  return (
    <label class="vza-field">
      <span>{str(props.props().label, "")}</span>
      <input
        type="text"
        value={str(props.props().value, "")}
        placeholder={str(props.props().placeholder, "")}
        onInput={(event) => {
          const target = path()

          if (target) props.ctx.setData(target, event.currentTarget.value)
        }}
      />
    </label>
  )
}

function ChoicePicker(props: CatalogProps) {
  const path = () => pathOf(props.raw.value)

  const options = () => {
    const items: Array<{ label: string; value: string }> = []

    for (const item of array(props.props().options)) {
      if (isObject(item)) {
        const value = optionalStr(item.value)
        const label = optionalStr(item.label) ?? value

        if (value !== undefined) items.push({ label: label ?? value, value })
        continue
      }

      const value = optionalStr(item)

      if (value !== undefined) items.push({ label: value, value })
    }

    return items
  }

  return (
    <label class="vza-field">
      <span>{str(props.props().label, "")}</span>
      <select
        value={str(props.props().value, "")}
        onChange={(event) => {
          const target = path()

          if (target) props.ctx.setData(target, event.currentTarget.value)
        }}
      >
        <For each={options()}>{(option) => <option value={option.value}>{option.label}</option>}</For>
      </select>
    </label>
  )
}

function Table(props: CatalogProps) {
  const columns = () => {
    const items: Array<{ label: string; key: string }> = []

    array(props.props().columns).forEach((item, index) => {
      if (isObject(item)) {
        const key = str(item.key, String(index))

        items.push({ label: str(item.label, key), key })

        return
      }

      const label = optionalStr(item) ?? String(index)

      items.push({ label, key: String(index) })
    })

    return items
  }

  const rows = () => objects(props.props().rows)

  return (
    <div class="vza-table-wrap">
      <table class="vza-table">
        <thead>
          <tr>
            <For each={columns()}>{(column) => <th>{column.label}</th>}</For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr>
                <For each={columns()}>
                  {(column) => <td>{cell(isObject(row) ? row[column.key] : undefined)}</td>}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}

function Metric(props: CatalogProps) {
  const value = () => visibleText(props.props().value)

  return (
    <div class="vza-metric">
      <span class="vza-metric-label">{str(props.props().label, "")}</span>
      <span class="vza-metric-value">
        {value()}
        <Show when={optionalStr(props.props().unit)}>{(unit) => <small>{unit()}</small>}</Show>
      </span>
      <Show when={optionalStr(props.props().caption)}>{(caption) => <span class="vza-metric-caption">{caption()}</span>}</Show>
    </div>
  )
}

function Callout(props: CatalogProps) {
  return (
    <aside class={`vza-callout vza-callout-${str(props.props().tone, "info")}`}>
      <Show when={optionalStr(props.props().title)}>{(title) => <strong>{title()}</strong>}</Show>
      <span>{str(props.props().text, "")}</span>
    </aside>
  )
}

function Steps(props: CatalogProps) {
  return (
    <ol class="vza-steps">
      <Index each={objects(props.props().items)}>
        {(item) => (
          <li classList={{ "vza-step-done": str(item().state, "pending") === "done", "vza-step-active": str(item().state, "pending") === "active" }}>
            <i aria-hidden="true" />
            <span>
              <b>{str(item().label, "")}</b>
              <Show when={optionalStr(item().detail)}>{(detail) => <small>{detail()}</small>}</Show>
            </span>
          </li>
        )}
      </Index>
    </ol>
  )
}

function childIds(props: CatalogProps) {
  const value = props.props()
  const list = stringList(value.children)
  const child = optionalStr(value.child)

  if (list.length > 0) return list

  return child ? [child] : []
}

function visibleText(value: Json | undefined) {
  const text = optionalStr(value)

  if (text !== undefined) return text

  const number = optionalNum(value)

  return number === undefined ? "" : format(number)
}

function cell(value: Json | undefined) {
  if (value === null || value === undefined) return ""

  if (isObject(value) || Array.isArray(value)) return JSON.stringify(value)

  return String(value)
}

function textAlign(value: Json | undefined) {
  const name = str(value, "start")

  if (name === "center") return "center"

  if (name === "end") return "end"

  return "start"
}

function format(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function align(value: Json | undefined) {
  const name = str(value, "stretch")

  if (name === "center") return "center"

  if (name === "end") return "flex-end"

  if (name === "start") return "flex-start"

  return "stretch"
}

function justify(value: Json | undefined) {
  const name = str(value, "start")

  if (name === "center") return "center"

  if (name === "end") return "flex-end"

  if (name === "spaceBetween") return "space-between"

  if (name === "spaceAround") return "space-around"

  return "flex-start"
}
