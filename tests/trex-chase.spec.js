import { expect, test } from "playwright/test";

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().started ?? false);
  }).toBe(true);
}

test.describe("trex chase", () => {
  test("t-rex closes the distance to the player", async ({ page }) => {
    await startGame(page);

    await expect.poll(async () => {
      return page.evaluate(() => window.__voxcelTRex?.sample().spawned ?? false);
    }).toBe(true);

    await page.evaluate(() => {
      window.__voxcelTest.setPlayer(68, 10, Math.PI / 2);
    });

    await page.waitForTimeout(150);
    const before = await page.evaluate(() => window.__voxcelTRex.sample());

    let afterDistance = before.distanceToPlayer;
    await expect
      .poll(
        async () => {
          afterDistance = await page.evaluate(
            () => window.__voxcelTRex.sample().distanceToPlayer,
          );
          return afterDistance;
        },
        { timeout: 4000, intervals: [250, 400, 500] },
      )
      .toBeLessThan(before.distanceToPlayer - 3);

    const after = await page.evaluate(() => window.__voxcelTRex.sample());
    const facingError = await page.evaluate(() => {
      const trex = window.__voxcelTRex.sample();
      const player = window.__voxcelTest.sample().player;
      const desiredYaw = Math.atan2(
        player.x - trex.position.x,
        player.z - trex.position.z,
      );
      return Math.atan2(
        Math.sin(desiredYaw - trex.position.rotationY),
        Math.cos(desiredYaw - trex.position.rotationY),
      );
    });

    expect(before.distanceToPlayer).toBeGreaterThan(20);
    expect(afterDistance).toBeLessThan(before.distanceToPlayer - 3);
    expect(after.speed).toBeGreaterThan(1.5);
    expect(after.mode).toBe("chase");
    expect(Math.abs(normalizeAngle(facingError))).toBeLessThan(0.7);
  });
});
