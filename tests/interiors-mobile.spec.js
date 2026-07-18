import { expect, test } from "playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("mobile touch controls fit while the expanded bookstore remains usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).tap();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().enhancements?.ready ?? false);
  }).toBe(true);

  const book = await page.evaluate(() => ({
    ...window.__voxcelPlayer.buildings.find(({ id }) => id === "book"),
  }));
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), {
    x: book.x,
    z: book.z - book.d / 2 - 1.8,
  });
  await page.waitForTimeout(180);
  await page.locator("#iBtn").tap();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelEnhancements.getState().buildingId);
  }).toBe("book");

  const state = await page.evaluate(() => window.__voxcelEnhancements.getState());
  expect(state.roomDimensions).toEqual({ width: 22, depth: 22, height: 7.2 });
  expect(state.legacySurfaceCount).toBe(0);
  expect(state.fixtureRoles).toContain("wall-bookcase");

  const fit = await page.evaluate(() => {
    const bounds = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      movePad: bounds("#movePad"),
      lookPad: bounds("#lookPad"),
      interaction: bounds("#iBtn"),
    };
  });
  expect(fit.document.scrollWidth).toBeLessThanOrEqual(fit.viewport.width);
  expect(fit.document.scrollHeight).toBeLessThanOrEqual(fit.viewport.height);
  for (const region of [fit.movePad, fit.lookPad, fit.interaction]) {
    expect(region.left).toBeGreaterThanOrEqual(0);
    expect(region.top).toBeGreaterThanOrEqual(0);
    expect(region.right).toBeLessThanOrEqual(fit.viewport.width);
    expect(region.bottom).toBeLessThanOrEqual(fit.viewport.height);
  }

  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), {
    x: book.x,
    z: book.z - state.roomDimensions.depth / 2 + 1,
  });
  await page.waitForTimeout(180);
  await page.locator("#iBtn").tap();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelEnhancements.getState().activeScene);
  }).toBe("city");
});
