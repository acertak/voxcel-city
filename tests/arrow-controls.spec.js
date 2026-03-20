import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().started ?? false);
  }).toBe(true);
  await page.waitForTimeout(300);
}

async function sample(page) {
  return page.evaluate(() => window.__voxcelTest.sample());
}

async function resetPlayer(page) {
  await page.evaluate(() => window.__voxcelTest.resetPlayer());
  await page.waitForTimeout(220);
}

async function pressForMotion(page, key, duration = 220) {
  const before = await sample(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  const during = await sample(page);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
  return { before, during };
}

function expectMotion(result, mode) {
  const dx = result.during.player.x - result.before.player.x;
  const dz = result.during.player.z - result.before.player.z;
  const worldDelta = Math.hypot(dx, dz);
  expect(worldDelta).toBeGreaterThan(0.8);

  const yaw = result.before.camera.yaw;
  const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const forwardDot = dx * forward.x + dz * forward.z;
  const rightDot = dx * right.x + dz * right.z;

  if (mode === "forward") {
    expect(forwardDot).toBeGreaterThan(0.8);
    expect(Math.abs(rightDot)).toBeLessThan(worldDelta);
  } else if (mode === "backward") {
    expect(forwardDot).toBeLessThan(-0.8);
    expect(Math.abs(rightDot)).toBeLessThan(worldDelta);
  } else if (mode === "left") {
    expect(rightDot).toBeLessThan(-0.8);
    expect(Math.abs(forwardDot)).toBeLessThan(worldDelta);
  } else if (mode === "right") {
    expect(rightDot).toBeGreaterThan(0.8);
    expect(Math.abs(forwardDot)).toBeLessThan(worldDelta);
  }
}

test.describe("arrow-key controls", () => {
  test("initial camera orientation keeps arrow movement aligned with the screen", async ({ page }) => {
    await startGame(page);

    await resetPlayer(page);
    expectMotion(await pressForMotion(page, "ArrowUp"), "forward");

    await resetPlayer(page);
    expectMotion(await pressForMotion(page, "ArrowDown"), "backward");

    await resetPlayer(page);
    expectMotion(await pressForMotion(page, "ArrowLeft"), "left");

    await resetPlayer(page);
    expectMotion(await pressForMotion(page, "ArrowRight"), "right");
  });

  test("camera rotation does not invert the directional controls", async ({ page }) => {
    await startGame(page);
    await resetPlayer(page);

    const canvasBox = await page.locator("canvas").first().boundingBox();
    if (!canvasBox) throw new Error("canvas not found");

    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 360, canvasBox.y + canvasBox.height / 2 - 30, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(180);

    const rotated = await sample(page);
    expect(Math.abs(rotated.camera.yaw - Math.PI)).toBeGreaterThan(0.5);

    expectMotion(await pressForMotion(page, "ArrowUp"), "forward");

    await resetPlayer(page);
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 360, canvasBox.y + canvasBox.height / 2 - 30, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(180);

    expectMotion(await pressForMotion(page, "ArrowDown"), "backward");

    await resetPlayer(page);
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 360, canvasBox.y + canvasBox.height / 2 - 30, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(180);

    expectMotion(await pressForMotion(page, "ArrowLeft"), "left");

    await resetPlayer(page);
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 360, canvasBox.y + canvasBox.height / 2 - 30, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(180);

    expectMotion(await pressForMotion(page, "ArrowRight"), "right");
  });
});
