import { describe, expect, test } from "bun:test"
import { applyMessages, EMPTY_SURFACES, pathOf, readPath, resolveValue, writePath } from "./surface"

describe("A2UI surface reducer", () => {
  test("creates a surface with components and data", () => {
    const surfaces = applyMessages(EMPTY_SURFACES, [
      {
        version: "1.0",
        createSurface: {
          surfaceId: "main",
          components: [
            { id: "root", component: "Column", children: ["title"] },
            { id: "title", component: "Text", text: "Hello" },
          ],
          dataModel: { name: "Ada" },
        },
      },
    ])

    const surface = surfaces.get("main")

    expect(surface?.components.get("root")?.component).toBe("Column")
    expect(surface?.components.get("title")?.text).toBe("Hello")
    expect(surface?.data).toEqual({ name: "Ada" })
  })

  test("merges components by id and keeps earlier fields", () => {
    const first = applyMessages(EMPTY_SURFACES, [
      { version: "1.0", createSurface: { surfaceId: "main", components: [{ id: "root", component: "Column" }] } },
    ])

    const second = applyMessages(first, [
      {
        version: "1.0",
        updateComponents: {
          surfaceId: "main",
          components: [{ id: "root", children: ["a"] }],
        },
      },
    ])

    expect(second.get("main")?.components.get("root")).toMatchObject({
      id: "root",
      component: "Column",
      children: ["a"],
    })
  })

  test("updates nested data and replaces deleted values", () => {
    const withData = applyMessages(EMPTY_SURFACES, [
      { version: "1.0", createSurface: { surfaceId: "main", dataModel: { user: { name: "Ada", age: 36 } } } },
    ])

    const updated = applyMessages(withData, [
      { version: "1.0", updateDataModel: { surfaceId: "main", path: "/user/name", value: "Grace" } },
      { version: "1.0", updateDataModel: { surfaceId: "main", path: "/user/age", value: null } },
      { version: "1.0", updateDataModel: { surfaceId: "main", path: "/user", value: { role: "engineer" } } },
    ])

    expect(updated.get("main")?.data).toEqual({ user: { name: "Grace", role: "engineer" } })
  })

  test("deletes a surface and tolerates a missing one", () => {
    const surfaces = applyMessages(EMPTY_SURFACES, [
      { version: "1.0", createSurface: { surfaceId: "main" } },
      { version: "1.0", deleteSurface: { surfaceId: "main" } },
      { version: "1.0", deleteSurface: { surfaceId: "missing" } },
    ])

    expect(surfaces.size).toBe(0)
  })

  test("creates an implicit surface for an update that arrives first", () => {
    const surfaces = applyMessages(EMPTY_SURFACES, [
      {
        version: "1.0",
        updateComponents: { surfaceId: "main", components: [{ id: "root", component: "Text", text: "Early" }] },
      },
    ])

    expect(surfaces.get("main")?.components.get("root")?.text).toBe("Early")
  })
})

describe("A2UI data binding", () => {
  test("resolves paths inside objects and arrays", () => {
    const data = { angle: 30, point: { x: 2, y: 3 }, list: [10, 20] }

    expect(resolveValue({ "@path": "/angle" }, data)).toBe(30)
    expect(resolveValue({ "@path": "/point/x" }, data)).toBe(2)
    expect(resolveValue({ "@path": "/list/1" }, data)).toBe(20)
    expect(resolveValue({ x: { "@path": "/point/x" }, y: { "@path": "/point/y" } }, data)).toEqual({ x: 2, y: 3 })
    expect(resolveValue([{ "@path": "/point/x" }, { "@path": "/point/y" }], data)).toEqual([2, 3])
  })

  test("returns undefined for a missing path and reports a binding", () => {
    expect(resolveValue({ "@path": "/missing" }, {})).toBeUndefined()
    expect(pathOf({ "@path": "/angle" })).toBe("/angle")
    expect(pathOf(30)).toBeUndefined()
  })

  test("merges root objects and writes nested paths without mutating the source", () => {
    const data = { user: { name: "Ada" }, count: 1 }
    const next = writePath(data, "/user/name", "Grace")

    expect(next).toEqual({ user: { name: "Grace" }, count: 1 })
    expect(data).toEqual({ user: { name: "Ada" }, count: 1 })
    expect(writePath(data, "/", { count: 2 })).toEqual({ user: { name: "Ada" }, count: 2 })
    expect(readPath(data, "/user/name")).toBe("Ada")
  })
})
