import { mkdir } from "node:fs/promises";
import { expect, test } from "playwright/test";

const captureDirectory = process.env.VOXCEL_CAPTURE_DIR;

test.skip(!captureDirectory, "Set VOXCEL_CAPTURE_DIR to capture visual QA screenshots");

test("captures road-facing buildings, rooftop signs, and detailed vehicles", async ({ page }) => {
  test.setTimeout(60_000);
  await mkdir(captureDirectory, { recursive: true });
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    frontages: window.__voxcelBuildingFrontages?.ready ?? false,
    vehicles: window.__voxcelVehicles?.ready ?? false,
  }))).toEqual({ frontages: true, vehicles: true });
  await page.waitForTimeout(2_400);

  const expectViewportFit = async () => {
    const fit = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const bounds = canvas?.getBoundingClientRect();
      return {
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        canvasWidth: Math.round(bounds?.width ?? 0),
        canvasHeight: Math.round(bounds?.height ?? 0),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    expect(fit.horizontalOverflow).toBe(false);
    expect(fit.canvasWidth).toBe(fit.viewportWidth);
    expect(fit.canvasHeight).toBe(fit.viewportHeight);
  };
  await expectViewportFit();

  const buildingViews = [
    ["conv-south",  -28, -53,  Math.PI],
    ["cafe-north",  -28, -7,   0],
    ["cloth-east",   39, -42,  Math.PI / 2],
    ["hospital-west", 55, -20, -0.76],
  ];
  for (const [name, x, z, yaw] of buildingViews) {
    await page.evaluate(({ x, z, yaw }) => {
      window.__voxcelTest.setPlayer(x, z, yaw);
    }, { x, z, yaw });
    await page.waitForTimeout(220);
    await page.screenshot({
      path: `${captureDirectory}/${name}.png`,
      scale: "css",
    });
  }

  await page.evaluate(() => {
    window.__voxcelTest.setPlayer(101, 15, -Math.PI / 2);
    window.__voxcelPlayer.playerRoot.position.y = 131;
    window.__voxcelPlayer.playerRoot.visible = false;
    window.__voxcelPlayer.playerShadow.visible = false;
  });
  await page.waitForTimeout(220);
  await page.screenshot({
    path: `${captureDirectory}/office-rooftop.png`,
    scale: "css",
  });
  await page.evaluate(() => window.__voxcelTest.resetPlayer());

  await page.evaluate(() => {
    window.__voxcelTest.setPlayer(0, 0, 0.62);
    window.__voxcelTest.attachPlayerVehicle("ns", 0, 1, -14);
  });
  await page.waitForTimeout(220);
  await page.screenshot({
    path: `${captureDirectory}/detailed-car.png`,
    scale: "css",
  });

  await page.evaluate(() => {
    const handle = window.__voxcelPlayer;
    const bus = handle.vehicles.find(({ type }) => type === "bus");
    handle.state.vehicle.manual = false;
    handle.state.vehicle = bus;
    bus.manual = true;
    bus.driveSpeed = 0;
    bus.m.position.set(0, 0, -14);
    bus.m.rotation.y = 0;
    handle.playerRoot.visible = false;
    handle.playerShadow.visible = false;
  });
  await page.waitForTimeout(220);
  await page.screenshot({
    path: `${captureDirectory}/detailed-bus.png`,
    scale: "css",
  });

  await page.evaluate(() => window.__voxcelTest.resetPlayer());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__voxcelTest.setPlayer(-28, -7, 0));
  await page.waitForTimeout(1_500);
  await expectViewportFit();
  await page.screenshot({
    path: `${captureDirectory}/mobile-cafe.png`,
    scale: "css",
  });

  expect(runtimeErrors).toEqual([]);
});
