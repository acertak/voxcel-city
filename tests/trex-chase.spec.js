import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().started ?? false);
  }).toBe(true);
}

test.describe("dinosaur spawning", () => {
  test("does not load or spawn a t-rex", async ({ page }) => {
    await startGame(page);

    await page.waitForTimeout(500);
    expect(await page.locator('script[src*="trex-loader.js"]').count()).toBe(0);
    expect(await page.evaluate(() => window.__voxcelTRex)).toBeUndefined();
  });
});
