import { describe, expect, test } from "bun:test"
import { object, objects, pairs, parsePartialJson } from "./json"
import { parseVisualStream } from "./spec"

describe("parsePartialJson", () => {
  test("matches JSON.parse once the document is complete", () => {
    const source = '{"v":1,"kind":"plot","title":"Stress","data":{"series":[{"points":[[1,2],[3,4]]}]}}'

    expect(parsePartialJson(source)).toEqual({ value: JSON.parse(source), complete: true, invalid: false })
  })

  test("keeps the members that already arrived", () => {
    const result = parsePartialJson('{"v":1,"kind":"plot","title":"Stress"')

    expect(result.invalid).toBe(false)
    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ v: 1, kind: "plot", title: "Stress" })
  })

  test("keeps complete points and drops the point that is still being written", () => {
    const result = parsePartialJson('{"data":{"series":[{"points":[[1,2],[3,4],[5')
    const data = object(result.value)?.data
    const series = objects(object(data)?.series)

    expect(result.complete).toBe(false)
    expect(series).toHaveLength(1)
    expect(pairs(series[0].points)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  test("drops a number that may still gain digits", () => {
    expect(parsePartialJson("[1, 2, 30").value).toEqual([1, 2])
    expect(parsePartialJson("[1, 2, 30,").value).toEqual([1, 2, 30])
  })

  test("keeps a partial string value, but not a partial key", () => {
    expect(parsePartialJson('{"title":"Stre')).toEqual({ value: { title: "Stre" }, complete: false, invalid: false })
    expect(parsePartialJson('{"tit')).toEqual({ value: {}, complete: false, invalid: false })
  })

  test("reads escapes and rejects a trailing comma", () => {
    expect(parsePartialJson('{"title":"a\\"b"}').value).toEqual({ title: 'a"b' })
    expect(parsePartialJson('{"v":1,}').invalid).toBe(true)
    expect(parsePartialJson('{"v":1').invalid).toBe(false)
  })
})

describe("parseVisualStream", () => {
  test("waits for the version, kind and title", () => {
    expect(parseVisualStream("")).toEqual({ status: "pending" })
    expect(parseVisualStream('{"v":1,"kind":"plo')).toEqual({ status: "pending" })
    expect(parseVisualStream('{"v":1,"kind":"plot"')).toEqual({ status: "pending" })
  })

  test("draws a plot as soon as its title arrives", () => {
    const result = parseVisualStream('{"v":1,"kind":"plot","title":"Stress')

    expect(result.status).toBe("ready")

    if (result.status !== "ready") return
    expect(result.complete).toBe(false)
    expect(result.spec.kind).toBe("plot")
    expect(result.spec.title).toBe("Stress")
    expect(result.spec.unit).toBeUndefined()
  })

  test("reads points while the series array is still open", () => {
    const result = parseVisualStream(
      '{"v":1,"kind":"plot","title":"Stress","data":{"series":[{"label":"S275","points":[[1,2],[3,4]',
    )

    expect(result.status).toBe("ready")

    if (result.status !== "ready") return
    const series = objects(object(result.spec.data)?.series)

    expect(series).toHaveLength(1)
    expect(pairs(series[0].points)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  test("validates the complete block through the strict parser", () => {
    expect(parseVisualStream('{"v":1,"kind":"plot","title":"Done"}')).toEqual({
      status: "ready",
      spec: expect.objectContaining({ kind: "plot", title: "Done" }),
      complete: true,
    })
    expect(parseVisualStream('{"v":1,"kind":"html","title":"No body"}').status).toBe("error")
    expect(parseVisualStream('{"v":2,"kind":"plot","title":"Future"}').status).toBe("error")
    expect(parseVisualStream('{"v":1,"kind":"spaceship","title":"No"}').status).toBe("error")
    expect(parseVisualStream('{"v":1,"kind":"plot",}').status).toBe("error")
  })
})
