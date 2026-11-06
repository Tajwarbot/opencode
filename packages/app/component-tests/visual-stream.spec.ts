import type { mountCodeBlocks } from "./plugin-host.fixture"
import { expect, sourceURL, story } from "../../stories/playwright/story"

const fixture = sourceURL(new URL("./plugin-host.fixture.tsx", import.meta.url))

type CodeBlocksHost = ReturnType<typeof mountCodeBlocks>

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
