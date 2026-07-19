import { expect, test } from "playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("mobile touch controls fit while the expanded bookstore remains usable", async ({ page }) => {
  await page.goto("/");

  const instructions = page.locator(".fl");
  await expect(instructions).toContainText(/画面(?:の)?左半分/);
  await expect(instructions).toContainText(/右半分/);
  await expect(instructions).not.toContainText("スティック");

  await page.getByRole("button", { name: "ゲーム開始" }).tap();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().enhancements?.ready ?? false);
  }).toBe(true);

  expect(await page.locator(
    ".stick-pad:visible, .stick-knob:visible, .stick-hint:visible",
  ).count()).toBe(0);

  await page.evaluate(() => {
    window.__voxcelInteractionPointerAudit = [];
    window.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest("#iBtn")) {
        window.__voxcelInteractionPointerAudit.push({
          defaultPrevented: event.defaultPrevented,
          pointerType: event.pointerType,
        });
      }
    });
  });

  const { book, entrance } = await page.evaluate(() => {
    const match = window.__voxcelPlayer.buildings.find(({ id }) => id === "book");
    const exteriorEntrance = window.__voxcelPlayer.entrances.find(({ b }) => b.id === "book");
    return {
      book: { ...match },
      entrance: { x: exteriorEntrance.pos.x, z: exteriorEntrance.pos.z },
    };
  });
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), {
    x: entrance.x,
    z: entrance.z,
  });
  await page.waitForTimeout(180);
  await page.locator("#iBtn").tap();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelEnhancements.getState().buildingId);
  }).toBe("book");
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelInteractionPointerAudit.length
  ))).toBe(1);

  const state = await page.evaluate(() => window.__voxcelEnhancements.getState());
  expect(state.roomDimensions).toEqual({ width: 22, depth: 22, height: 7.2 });
  expect(state.legacySurfaceCount).toBe(0);
  expect(state.fixtureRoles).toContain("wall-bookcase");

  const fit = await page.evaluate(() => {
    const bounds = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    const touchZone = (selector) => {
      const element = document.querySelector(selector);
      const style = getComputedStyle(element);
      return {
        ...bounds(selector),
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderStyle: style.borderStyle,
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
      };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      moveZone: touchZone("#movePad"),
      lookZone: touchZone("#lookPad"),
      interaction: bounds("#iBtn"),
    };
  });
  expect(fit.document.scrollWidth).toBeLessThanOrEqual(fit.viewport.width);
  expect(fit.document.scrollHeight).toBeLessThanOrEqual(fit.viewport.height);
  for (const region of [fit.moveZone, fit.lookZone, fit.interaction]) {
    expect(region.left).toBeGreaterThanOrEqual(0);
    expect(region.top).toBeGreaterThanOrEqual(0);
    expect(region.right).toBeLessThanOrEqual(fit.viewport.width);
    expect(region.bottom).toBeLessThanOrEqual(fit.viewport.height);
  }
  expect(fit.moveZone.left).toBe(0);
  expect(fit.moveZone.right).toBeCloseTo(fit.viewport.width / 2, 0);
  expect(fit.lookZone.left).toBeCloseTo(fit.viewport.width / 2, 0);
  expect(fit.lookZone.right).toBe(fit.viewport.width);
  for (const zone of [fit.moveZone, fit.lookZone]) {
    expect(zone.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(zone.backgroundImage).toBe("none");
    expect(zone.borderStyle).toBe("none");
    expect(zone.boxShadow).toBe("none");
    expect(zone.outlineStyle).toBe("none");
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

  const interactionAudit = await page.evaluate(() => window.__voxcelInteractionPointerAudit);
  expect(interactionAudit).toHaveLength(2);
  expect(interactionAudit.every(({ defaultPrevented }) => !defaultPrevented)).toBe(true);
  expect(interactionAudit.every(({ pointerType }) => pointerType === "touch")).toBe(true);
});
