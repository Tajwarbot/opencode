import { expect, story } from "../../stories/playwright/story"

story("brokers an MCP App bridge end to end", async ({ mount }) => {
  const component = await mount("mcp-app-view--bridge")
  const frame = component.locator('iframe[title="Weather"]')

  await expect(frame).toHaveCount(1)

  const content = frame.contentFrame()

  await expect(content.getByRole("heading", { name: "Weather" })).toBeVisible()
  await expect(content.locator("#input")).toHaveText('input: {"city":"Oslo"}')
  await expect(content.locator("#result")).toHaveText('result: {"temperature":21}')

  await content.getByRole("button", { name: "Refresh" }).click()
  await expect(content.locator("#called")).toHaveText("called: 21 C / 21")
})
