/* oxlint-disable anti-slop/no-shape-in-symbol-names -- SAFETY: A2UI's wire property is named `shapes`; the fixture mirrors the public format. */
import type { mountCodeBlocks } from "./plugin-host.fixture"
import { expect, sourceURL, story } from "../../stories/playwright/story"

const fixture = sourceURL(new URL("./plugin-host.fixture.tsx", import.meta.url))

type CodeBlocksHost = ReturnType<typeof mountCodeBlocks>

type DemoMessage = { version: string; createSurface?: object; updateComponents?: object }

type DemoSpec = { v: number; kind: string; title: string; data: { messages: DemoMessage[] } }

story.beforeEach(async ({ page }) => {
  await page.goto("/")
})

story("visual plots draw while their fence streams", async ({ page }) => {
  const host = await page.evaluateHandle(async (fixture) => {
    const { builtins, mountCodeBlocks, until } = await import(fixture)
    const visual = builtins.find((entry: { id: string }) => entry.id === "visual")

    if (!visual) throw new Error("The visual built-in is missing.")

    const host: CodeBlocksHost = mountCodeBlocks({ definitions: [visual] })

    await until(() => host.status("visual") === "active")
    host.show(
      '```visual\n{"v":1,"kind":"plot","title":"Stress amplitude","data":{"x":{"domain":[0,100000]},"y":{"domain":[0,450]},"series":[{"label":"S275","points":[[1000,420],[10000,330]]',
      true,
    )

    return host
  }, fixture)

  const root = page.getByTestId("code-blocks")
  const block = root.locator('[data-component="markdown-code"]')

  await expect(block.getByRole("heading", { name: "Stress amplitude" })).toBeVisible()
  await expect(block.locator("svg[data-streaming]")).toHaveCount(1)
  await expect(block.locator("svg.vz-streaming")).toHaveCount(0)
  await expect(block.locator(".vz-streaming-label")).toHaveCount(1)
  await expect(block.locator("svg text").filter({ hasText: /^450$/ })).toBeVisible()
  await expect(block.locator("path.vz-line-accent")).toHaveCount(1)

  await host.evaluate((host) =>
    host.show(
      '```visual\n{"v":1,"kind":"plot","title":"Stress amplitude","data":{"x":{"domain":[0,100000]},"y":{"domain":[0,450]},"series":[{"label":"S275","points":[[1000,420],[10000,330],[100000,240]]}]}}\n```\n',
    ),
  )

  await expect(block.locator("svg[data-streaming]")).toHaveCount(0)
  await expect(block.locator(".vz-streaming-label")).toHaveCount(0)
  await expect(block.locator("svg text").filter({ hasText: /^100k$/ })).toBeVisible()

  const path = await block.locator("path.vz-line-accent").getAttribute("d")

  expect(path?.split("L")).toHaveLength(3)
})

story("a native A2UI surface draws before its message stream ends", async ({ page }) => {
  const host = await page.evaluateHandle(async (fixture) => {
    const { builtins, mountCodeBlocks, until } = await import(fixture)
    const visual = builtins.find((entry: { id: string }) => entry.id === "visual")

    if (!visual) throw new Error("The visual built-in is missing.")

    const host: CodeBlocksHost = mountCodeBlocks({ definitions: [visual] })

    const scene = {
      id: "scene",
      component: "Scene",
      view: { width: 480, height: 280, grid: 40 },
      shapes: [
        {
          type: "group",
          translate: [240, 140],
          shapes: [
            {
              type: "group",
              rotate: { "@path": "/angle" },
              shapes: [
                { type: "rect", at: [0, 0], size: [96, 96], fill: "accent-2", tone: "accent" },
                { type: "arrow", from: [0, 0], to: [130, 0], tone: "accent" },
              ],
            },
            {
              type: "arrow",
              from: [0, 0],
              to: [{ "@path": "/tx" }, { "@path": "/ty" }],
              tone: "muted",
              dash: true,
            },
            {
              type: "group",
              translate: [{ "@path": "/tx" }, { "@path": "/ty" }],
              shapes: [
                { type: "circle", at: [0, 0], r: 5, fill: "accent", tone: "accent" },
                { type: "text", at: [0, -12], text: "t", tone: "fg" },
              ],
            },
            { type: "text", at: [-80, 70], text: "A", tone: "fg" },
          ],
        },
      ],
    }

    // SAFETY: the fixture has the DemoSpec shape; later messages push into the same array.
    const spec = {
      v: 1,
      kind: "a2ui",
      title: "Translation and rotation",
      data: {
        messages: [
          {
            version: "1.0",
            createSurface: {
              surfaceId: "main",
              components: [{ id: "root", component: "Column", children: ["scene"], gap: 10 }, scene],
              dataModel: { angle: 30, tx: 60, ty: -40 },
            },
          },
        ],
      },
    } as DemoSpec

    await until(() => host.status("visual") === "active")
    host.show(`\`\`\`visual\n${JSON.stringify(spec)}`, true)

    return { host, spec }
  }, fixture)

  const root = page.getByTestId("code-blocks")
  const block = root.locator('[data-component="markdown-code"]')

  await expect(block.getByRole("heading", { name: "Translation and rotation" })).toBeVisible()
  await expect(block.locator(".vza-scene svg")).toHaveCount(1)
  await expect(block.locator('g[transform^="rotate(30"]')).toHaveCount(1)
  await expect(block.locator('g[transform="translate(60 -40)"]')).toHaveCount(1)
  await expect(block.locator(".vza-scene text").filter({ hasText: "A" })).toBeVisible()

  await host.evaluate(({ host, spec }) => {
    spec.data.messages.push({
      version: "1.0",
      updateComponents: {
        surfaceId: "main",
        components: [
          { id: "root", component: "Column", children: ["scene", "angle", "tx", "ty"], gap: 10 },
          { id: "angle", component: "Slider", label: "Angle", min: 0, max: 360, step: 1, value: { "@path": "/angle" } },
          { id: "tx", component: "Slider", label: "Translation x", min: -120, max: 120, step: 2, value: { "@path": "/tx" } },
          { id: "ty", component: "Slider", label: "Translation y", min: -100, max: 100, step: 2, value: { "@path": "/ty" } },
        ],
      },
    })
    host.show(`\`\`\`visual\n${JSON.stringify(spec)}\n\`\`\`\n`)
  })

  await expect(block.locator('input[type="range"]')).toHaveCount(3)

  await block.locator('input[type="range"]').nth(0).evaluate((element) => {
    // SAFETY: the locator selects input[type="range"], so Element is an HTMLInputElement here.
    const input = element as HTMLInputElement

    input.value = "90"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await block.locator('input[type="range"]').nth(1).evaluate((element) => {
    // SAFETY: the locator selects input[type="range"], so Element is an HTMLInputElement here.
    const input = element as HTMLInputElement

    input.value = "100"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await expect(block.locator('g[transform^="rotate(90"]')).toHaveCount(1)
  await expect(block.locator('g[transform="translate(100 -40)"]')).toHaveCount(1)
})

story("a streamed visual that ends invalid falls back to its code", async ({ page }) => {
  const host = await page.evaluateHandle(async (fixture) => {
    const { builtins, mountCodeBlocks, until } = await import(fixture)
    const visual = builtins.find((entry: { id: string }) => entry.id === "visual")

    if (!visual) throw new Error("The visual built-in is missing.")

    const host: CodeBlocksHost = mountCodeBlocks({ definitions: [visual] })

    await until(() => host.status("visual") === "active")
    host.show(
      '```visual\n{"v":1,"kind":"plot","title":"Broken","data":{"series":[{"points":[[1,2]]',
      true,
    )

    return host
  }, fixture)

  const root = page.getByTestId("code-blocks")
  const block = root.locator('[data-component="markdown-code"]')

  await expect(block.getByRole("heading", { name: "Broken" })).toBeVisible()

  await host.evaluate((host) => host.show('```visual\n{"v":1,"kind":"plot","title":"Broken","data":{,}}\n```\n'))

  await expect(block.locator("pre")).toBeVisible()
  await expect(block.locator(".vz")).toHaveCount(0)
})

story("an A2UI page embeds a typed renderer", async ({ page }) => {
  const host = await page.evaluateHandle(async (fixture) => {
    const { builtins, mountCodeBlocks, until } = await import(fixture)
    const visual = builtins.find((entry: { id: string }) => entry.id === "visual")

    if (!visual) throw new Error("The visual built-in is missing.")

    const host: CodeBlocksHost = mountCodeBlocks({ definitions: [visual] })

    const spec = {
      v: 1,
      kind: "a2ui",
      title: "Embedded plot",
      data: {
        messages: [
          {
            version: "1.0",
            createSurface: {
              surfaceId: "main",
              components: [
                { id: "root", component: "Column", children: ["plot"] },
                {
                  id: "plot",
                  component: "Typed",
                  kind: "plot",
                  title: "Stress amplitude",
                  data: {
                    x: { domain: [0, 10] },
                    y: { domain: [0, 10] },
                    series: [{ label: "A", points: [[0, 0], [5, 6], [10, 9]] }],
                  },
                },
              ],
            },
          },
        ],
      },
    }

    await until(() => host.status("visual") === "active")
    host.show(`\`\`\`visual\n${JSON.stringify(spec)}\n\`\`\`\n`)

    return host
  }, fixture)

  const block = page.getByTestId("code-blocks").locator('[data-component="markdown-code"]')

  await expect(block.getByRole("heading", { name: "Embedded plot" })).toBeVisible()
  await expect(block.locator(".vz-embed svg").first()).toBeVisible()
  await expect(block.locator('path.vz-line-accent')).toHaveCount(1)

  await host.evaluate((host) => host.show('```visual\n{"v":1,"kind":"plot","title":"Replaced","data":{"series":[{"points":[[1,1]]}]}}\n```\n'))
  await expect(block.getByRole("heading", { name: "Replaced" })).toBeVisible()
})
