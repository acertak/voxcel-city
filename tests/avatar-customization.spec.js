import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().started ?? false);
  }).toBe(true);
  await page.waitForTimeout(250);
}

async function sample(page) {
  return page.evaluate(() => window.__voxcelTest.sample());
}

async function setPlayer(page, x, z, yaw = Math.PI) {
  await page.evaluate(({ x, z, yaw }) => window.__voxcelTest.setPlayer(x, z, yaw), { x, z, yaw });
  await page.waitForTimeout(180);
}

async function enterHairStudio(page) {
  await setPlayer(page, 28, -25.8);
  await page.keyboard.press("e");
  await page.waitForTimeout(180);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(320);
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect(page.locator("#mC")).toContainText("Hair Studio");
}

async function enterClothShop(page) {
  await setPlayer(page, 28, -49.8);
  await page.keyboard.press("e");
  await page.waitForTimeout(180);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(840);
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect(page.locator("#mC")).toContainText("👗 服");
}

test.describe("avatar customization", () => {
  test("long hair keeps the crown height fixed and extends downward", async ({ page }) => {
    await startGame(page);

    const before = await sample(page);
    await enterHairStudio(page);
    await page.locator("#mC .ic").filter({ hasText: "ロング" }).click();
    await page.waitForTimeout(180);
    const after = await sample(page);

    expect(after.appearance.hair.id).toBe(1);
    expect(after.appearance.hair.scaleY).toBeGreaterThan(before.appearance.hair.scaleY);
    expect(after.appearance.hair.topY).toBeCloseTo(before.appearance.hair.topY, 5);
    expect(after.appearance.hair.bottomY).toBeLessThan(before.appearance.hair.bottomY - 0.15);
  });

  test("pink dress switches to dress silhouette and restores default outfit cleanly", async ({ page }) => {
    await startGame(page);

    const initial = await sample(page);
    expect(initial.appearance.outfit.id).toBe(0);
    expect(initial.appearance.outfit.dressVisible).toBe(false);
    expect(initial.appearance.outfit.torsoVisible).toBe(true);

    await enterClothShop(page);
    await page.locator("#mC .ic").filter({ hasText: "ピンクワンピ" }).click();
    await page.waitForTimeout(180);
    const dressed = await sample(page);

    expect(dressed.appearance.outfit.id).toBe(5);
    expect(dressed.appearance.outfit.dressVisible).toBe(true);
    expect(dressed.appearance.outfit.torsoVisible).toBe(false);
    expect(dressed.appearance.outfit.dressColor).toBe(0xff88bb);
    expect(dressed.appearance.outfit.legColor).toBe(0xffd7b7);
    expect(dressed.appearance.outfit.legScale).toEqual({ x: 0.72, y: 0.7, z: 0.72 });

    await page.locator("#mC .ic").filter({ hasText: "デフォルト" }).click();
    await page.waitForTimeout(180);
    const restored = await sample(page);

    expect(restored.appearance.outfit.id).toBe(0);
    expect(restored.appearance.outfit.dressVisible).toBe(false);
    expect(restored.appearance.outfit.torsoVisible).toBe(true);
    expect(restored.appearance.outfit.legColor).toBe(0x1d2940);
    expect(restored.appearance.outfit.legScale).toEqual({ x: 1, y: 1, z: 1 });
  });
});
