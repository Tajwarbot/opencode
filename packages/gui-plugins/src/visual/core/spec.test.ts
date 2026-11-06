import { describe, expect, test } from "bun:test"
import { parseVisual, parseVisualStream } from "./spec"

const mechanism = JSON.stringify({
  v: 1,
  kind: "mechanism",
  title: "Crank-rocker",
  unit: "mm",
  data: { type: "fourbar", a: 34, b: 104, c: 74, d: 128 },
})

describe("parseVisual", () => {
  test("accepts a complete mechanism spec", () => {
    const result = parseVisual(mechanism)
    expect(result.ok).toBe(true)

    if (!result.ok) return
    expect(result.spec.kind).toBe("mechanism")
    expect(result.spec.unit).toBe("mm")
    expect(result.spec.v).toBe(1)
  })

  test("rejects a block without a title", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "plot", data: {} }))
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("title")
  })

  test("requires spec version 1", () => {
    const missing = parseVisual(JSON.stringify({ kind: "task", title: "No version" }))
    expect(missing.ok).toBe(false)
    const future = parseVisual(JSON.stringify({ v: 2, kind: "task", title: "Future" }))
    expect(future.ok).toBe(false)
    const zero = parseVisual(JSON.stringify({ v: 0, kind: "task", title: "Zero" }))
    expect(zero.ok).toBe(false)
  })

  test("rejects an unknown kind", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "spaceship", title: "No" }))
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("Unknown kind")
  })

  test("rejects invalid JSON", () => {
    const result = parseVisual("{ nope }")
    expect(result.ok).toBe(false)
  })

  test("rejects a non-object root", () => {
    const result = parseVisual("[]")
    expect(result.ok).toBe(false)
  })

  test("trims long titles and keeps optional fields", () => {
    const result = parseVisual(
      JSON.stringify({
        v: 1,
        kind: "task",
        title: "x".repeat(400),
        caption: "Keep me",
        note: "Idealized",
        source: "Plan",
        height: 9000,
        data: {},
      }),
    )

    expect(result.ok).toBe(true)

    if (!result.ok) return
    expect(result.spec.title.length).toBe(160)
    expect(result.spec.caption).toBe("Keep me")
    expect(result.spec.note).toBe("Idealized")
    expect(result.spec.source).toBe("Plan")
    expect(result.spec.height).toBe(720)
  })

  test("caps oversized input", () => {
    const result = parseVisual(`{"v":1,"kind":"task","title":"x","data":{"a":"${"x".repeat(300_000)}"}}`)
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("larger than")
  })

  test("allows a visual without data", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "task", title: "Working" }))
    expect(result.ok).toBe(true)

    if (!result.ok) return
    expect(result.spec.data).toEqual({})
  })
})


describe("parseVisual html", () => {
  test("accepts a general-purpose html visual", () => {
    const result = parseVisual(
      JSON.stringify({
        v: 1,
        kind: "html",
        title: "A gear train trades speed for torque",
        height: 420,
        data: { html: "<div id=\"app\"></div>", css: "#app{height:40px}", js: "document.querySelector('#app').textContent = 'ok'" },
      }),
    )

    expect(result.ok).toBe(true)

    if (!result.ok) return
    expect(result.spec.kind).toBe("html")
    expect(result.spec.data).toEqual({ html: "<div id=\"app\"></div>", css: "#app{height:40px}", js: "document.querySelector('#app').textContent = 'ok'" })
  })

  test("rejects html without a document", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "html", title: "Empty", data: { css: "body{}" } }))
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("data.html")
  })

  test("rejects an oversized html body", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "html", title: "Huge", data: { html: "x".repeat(160_001) } }))
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("html body")
  })

  test("rejects a non-string stylesheet", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "html", title: "Bad css", data: { html: "<p>ok</p>", css: 3 } }))
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("data.css")
  })

  test("accepts an a2ui message stream", () => {
    const result = parseVisual(
      JSON.stringify({
        v: 1,
        kind: "a2ui",
        title: "Translation and rotation",
        data: {
          messages: [
            {
              version: "1.0",
              createSurface: {
                surfaceId: "main",
                components: [{ id: "root", component: "Text", text: "Rotate me" }],
              },
            },
          ],
        },
      }),
    )

    expect(result.ok).toBe(true)

    if (!result.ok) return
    expect(result.spec.kind).toBe("a2ui")
  })

  test("rejects a2ui without messages", () => {
    const result = parseVisual(JSON.stringify({ v: 1, kind: "a2ui", title: "Empty", data: {} }))
    expect(result.ok).toBe(false)

    if (result.ok) return
    expect(result.error).toContain("data.messages")
  })

  test("lets an a2ui surface start before its messages are complete", () => {
    const result = parseVisualStream('{"v":1,"kind":"a2ui","title":"Transform","data":{"messages":[')

    expect(result.status).toBe("ready")

    if (result.status !== "ready") return
    expect(result.complete).toBe(false)
    expect(result.spec.kind).toBe("a2ui")
  })
})
