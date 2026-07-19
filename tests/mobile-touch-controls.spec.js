import { expect, test } from "playwright/test";

test.use({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});

function point(id, x, y) {
  return {
    id,
    x: Math.round(x),
    y: Math.round(y),
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
  };
}

async function dispatchTouch(session, type, points) {
  await session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points,
  });
}

async function releaseAllTouches(session) {
  try {
    await dispatchTouch(session, "touchCancel", []);
  } catch {
    // The gesture may already have ended normally.
  }
}

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).tap();
  await expect.poll(async () => page.evaluate(() => {
    const sample = window.__voxcelTest?.sample?.();
    return Boolean(sample?.started && sample?.enhancements?.ready);
  })).toBe(true);
  await page.evaluate(() => window.__voxcelTest.resetPlayer());
  await page.waitForTimeout(180);
}

async function sample(page) {
  return page.evaluate(() => window.__voxcelTest.sample());
}

function playerDistance(before, after) {
  return Math.hypot(
    after.player.x - before.player.x,
    after.player.z - before.player.z,
  );
}

function angleDistance(before, after) {
  return Math.abs(Math.atan2(
    Math.sin(after - before),
    Math.cos(after - before),
  ));
}

async function gesturePoints(page) {
  return page.evaluate(() => {
    const y = innerHeight * 0.42;
    return {
      leftStart: { x: innerWidth * 0.25, y },
      leftForward: { x: innerWidth * 0.25, y: y - 90 },
      rightStart: { x: innerWidth * 0.75, y },
      rightLook: { x: innerWidth * 0.75 + 90, y: y - 55 },
    };
  });
}

test.describe("mobile half-screen touch controls", () => {
  test("dragging from the middle of the left half moves and stops on release", async ({ page }) => {
    await startGame(page);
    const session = await page.context().newCDPSession(page);
    const positions = await gesturePoints(page);
    const start = point(1, positions.leftStart.x, positions.leftStart.y);
    const forward = point(1, positions.leftForward.x, positions.leftForward.y);

    try {
      const before = await sample(page);
      await dispatchTouch(session, "touchStart", [start]);
      await dispatchTouch(session, "touchMove", [forward]);
      await page.waitForTimeout(280);
      const during = await sample(page);

      expect(playerDistance(before, during)).toBeGreaterThan(0.8);
      expect(angleDistance(before.camera.yaw, during.camera.yaw)).toBeLessThan(0.02);
      expect(Math.abs(during.camera.pitch - before.camera.pitch)).toBeLessThan(0.02);

      await dispatchTouch(session, "touchEnd", []);
      await page.waitForTimeout(80);
      const stoppedAt = await sample(page);
      await page.waitForTimeout(260);
      const afterRelease = await sample(page);
      expect(playerDistance(stoppedAt, afterRelease)).toBeLessThan(0.25);
    } finally {
      await releaseAllTouches(session);
    }
  });

  test("dragging from the middle of the right half rotates only the camera", async ({ page }) => {
    await startGame(page);
    const session = await page.context().newCDPSession(page);
    const positions = await gesturePoints(page);
    const start = point(2, positions.rightStart.x, positions.rightStart.y);
    const look = point(2, positions.rightLook.x, positions.rightLook.y);

    try {
      const before = await sample(page);
      await dispatchTouch(session, "touchStart", [start]);
      await dispatchTouch(session, "touchMove", [look]);
      await page.waitForTimeout(180);
      const during = await sample(page);

      expect(angleDistance(before.camera.yaw, during.camera.yaw)).toBeGreaterThan(0.15);
      expect(Math.abs(during.camera.pitch - before.camera.pitch)).toBeGreaterThan(0.05);
      expect(playerDistance(before, during)).toBeLessThan(0.2);

      await dispatchTouch(session, "touchEnd", []);
      await page.waitForTimeout(80);
      const stoppedAt = await sample(page);
      await page.waitForTimeout(220);
      const afterRelease = await sample(page);
      expect(angleDistance(stoppedAt.camera.yaw, afterRelease.camera.yaw)).toBeLessThan(0.02);
      expect(Math.abs(afterRelease.camera.pitch - stoppedAt.camera.pitch)).toBeLessThan(0.02);
    } finally {
      await releaseAllTouches(session);
    }
  });

  test("two simultaneous touches move and look until both are released", async ({ page }) => {
    await startGame(page);
    const session = await page.context().newCDPSession(page);
    const positions = await gesturePoints(page);
    const leftStart = point(3, positions.leftStart.x, positions.leftStart.y);
    const leftForward = point(3, positions.leftForward.x, positions.leftForward.y);
    const rightStart = point(4, positions.rightStart.x, positions.rightStart.y);
    const rightLook = point(4, positions.rightLook.x, positions.rightLook.y);

    try {
      const before = await sample(page);
      await dispatchTouch(session, "touchStart", [leftStart, rightStart]);
      await dispatchTouch(session, "touchMove", [leftForward, rightLook]);
      await page.waitForTimeout(280);
      const bothActive = await sample(page);

      expect(playerDistance(before, bothActive)).toBeGreaterThan(0.8);
      expect(angleDistance(before.camera.yaw, bothActive.camera.yaw)).toBeGreaterThan(0.15);

      await dispatchTouch(session, "touchEnd", []);
      await page.waitForTimeout(80);
      const allReleasedAt = await sample(page);
      await page.waitForTimeout(260);
      const afterAllReleased = await sample(page);
      expect(playerDistance(allReleasedAt, afterAllReleased)).toBeLessThan(0.25);
      expect(angleDistance(
        allReleasedAt.camera.yaw,
        afterAllReleased.camera.yaw,
      )).toBeLessThan(0.02);
      expect(Math.abs(
        afterAllReleased.camera.pitch - allReleasedAt.camera.pitch,
      )).toBeLessThan(0.02);
    } finally {
      await releaseAllTouches(session);
    }
  });
});
