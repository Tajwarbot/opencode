import { describe, expect, test } from "bun:test"
import { buildHtmlDocument, clampHtmlHeight, readHtmlTheme } from "./html-sandbox"

const data = {
  html: "<main><button id=\"run\">Run</button><output id=\"out\"></output></main>",
  css: ".run{color:var(--accent)}",
  js: "document.querySelector('#run').addEventListener('click', () => { document.querySelector('#out').textContent = 'ok' })",
}

describe("buildHtmlDocument", () => {
  test("builds an opaque, offline document", () => {
    const html = buildHtmlDocument({ data, tokens: readHtmlTheme() })

    expect(html).toContain("default-src 'none'")
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain("script-src 'unsafe-inline'")
    expect(html).toContain("--bg:")
    expect(html).toContain("<main><button")
    expect(html).toContain("querySelector('#run')")
  })

  test("removes a full-document wrapper", () => {
    const html = buildHtmlDocument({
      data: { ...data, html: "<!doctype html><html><body><p>inside</p></body></html>" },
      tokens: readHtmlTheme(),
    })

    expect(html).toContain("<p>inside</p>")
    expect(html.match(/<body>/g)?.length).toBe(1)
    expect(html.match(/<\/html>/g)?.length).toBe(1)
  })

  test("escapes closing script and style tags in the payload", () => {
    const html = buildHtmlDocument({
      data: { html: "<p>safe</p>", css: "p::after{content:'</style>'}", js: "const tag = '</script>'" },
      tokens: readHtmlTheme(),
    })

    expect(html).toContain("<\\/style>")
    expect(html).toContain("<\\/script>")
    expect(html).not.toContain("content:'</style>'")
    expect(html).not.toContain("const tag = '</script>'")
  })
})

describe("clampHtmlHeight", () => {
  test("defaults and clamps", () => {
    expect(clampHtmlHeight(undefined)).toBe(420)
    expect(clampHtmlHeight(10)).toBe(160)
    expect(clampHtmlHeight(9000)).toBe(1200)
    expect(clampHtmlHeight(501.4)).toBe(501)
  })
})

describe("readHtmlTheme", () => {
  test("falls back without a document", () => {
    const tokens = readHtmlTheme()

    expect(tokens["--bg"]).toBeTruthy()
    expect(tokens["--fg"]).toBeTruthy()
    expect(tokens["--font"]).toBeTruthy()
  })
})
