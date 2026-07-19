import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().enhancements?.ready ?? false);
  }).toBe(true);
  await page.waitForTimeout(220);
}

async function sample(page) {
  return page.evaluate(() => window.__voxcelTest.sample());
}

async function setPlayer(page, x, z, yaw = 0) {
  await page.evaluate(
    ({ x, z, yaw }) => window.__voxcelTest.setPlayer(x, z, yaw),
    { x, z, yaw },
  );
  await page.waitForTimeout(180);
}

async function enterBuilding(page, buildingId) {
  const entrance = await page.evaluate((id) => {
    const match = window.__voxcelPlayer.entrances.find(({ b }) => b.id === id);
    return { x: match.pos.x, z: match.pos.z };
  }, buildingId);
  await setPlayer(page, entrance.x, entrance.z, Math.PI);
  await page.keyboard.press("e");
}

test.describe("world enhancements", () => {
  test("uses soft layered clouds instead of the low-poly sphere clusters", async ({ page }) => {
    await startGame(page);
    const state = (await sample(page)).enhancements;

    expect(state.clouds.count).toBe(12);
    expect(state.clouds.meshCount).toBe(24);
    expect(state.clouds.oldSphereGroupsHidden).toBe(10);
    expect(state.clouds.minAltitude).toBeGreaterThan(20);
    expect(state.clouds.maxAltitude).toBeLessThan(45);
  });

  test("switches to a dedicated interior scene without enter or exit messages", async ({ page }) => {
    await startGame(page);
    await enterBuilding(page, "salon");

    await expect.poll(async () => (await sample(page)).enhancements.activeScene).toBe("interior");
    const entered = await sample(page);
    expect(entered.enhancements.buildingId).toBe("salon");
    expect(entered.enhancements.usingDedicatedScene).toBe(true);
    expect(entered.enhancements.themeFixtureCount).toBeGreaterThan(5);
    expect(entered.enhancements.fixtureRoles).toContain("styling-station");
    expect(await page.evaluate(() => {
      return window.__voxcelPlayer.scene !== window.__voxcelEnhancements.cityScene;
    })).toBe(true);
    await expect(page.locator("#toast")).not.toHaveClass(/show/);
    await expect(page.locator("#toast")).toHaveText("");
    await expect(page.locator("#lL")).toBeHidden();

    await setPlayer(page, 28, -18 - entered.enhancements.roomDimensions.depth / 2 + 1);
    await page.keyboard.press("e");
    await expect.poll(async () => (await sample(page)).enhancements.activeScene).toBe("city");

    const exited = await sample(page);
    expect(exited.enhancements.usingDedicatedScene).toBe(false);
    expect(await page.evaluate(() => {
      return window.__voxcelPlayer.scene === window.__voxcelEnhancements.cityScene;
    })).toBe(true);
    await expect(page.locator("#toast")).not.toHaveClass(/show/);
    await expect(page.locator("#toast")).toHaveText("");
  });

  test("blocks movement at outdoor props and interior furniture", async ({ page }) => {
    await startGame(page);

    await setPlayer(page, -90, 20.8);
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(850);
    await page.keyboard.up("ArrowDown");
    await page.waitForTimeout(120);
    const fountain = await sample(page);
    expect(Math.hypot(fountain.player.x + 90, fountain.player.z - 26)).toBeGreaterThan(3.45);
    expect(fountain.enhancements.blockedMoves).toBeGreaterThan(0);
    expect(fountain.enhancements.colliderCount).toBeGreaterThan(500);

    await page.evaluate(() => {
      window.__voxcelTest.attachPlayerVehicle();
      const vehicle = window.__voxcelPlayer.state.vehicle;
      vehicle.m.position.set(-90, 0, 19);
      vehicle.m.rotation.y = 0;
      vehicle.driveSpeed = 0;
    });
    await page.waitForTimeout(180);
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(1_200);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(120);
    const vehicleAtFountain = await sample(page);
    expect(vehicleAtFountain.player.z).toBeLessThan(21.3);
    expect(vehicleAtFountain.enhancements.vehicleBlockedMoves).toBeGreaterThan(0);

    await setPlayer(page, -98.8, 31.2);
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(850);
    await page.keyboard.up("ArrowDown");
    await page.waitForTimeout(120);
    const tree = await sample(page);
    expect(Math.hypot(tree.player.x + 98.8, tree.player.z - 34.8)).toBeGreaterThan(0.62);

    await enterBuilding(page, "salon");
    await expect.poll(async () => (await sample(page)).enhancements.activeScene).toBe("interior");
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(320);
    await page.keyboard.up("ArrowDown");
    await page.waitForTimeout(120);
    const salon = await sample(page);
    expect(salon.enhancements.blockedMoves).toBeGreaterThan(fountain.enhancements.blockedMoves);
    expect(salon.enhancements.colliderCount).toBeGreaterThan(3);

    await setPlayer(page, 28, -18);
    await page.keyboard.press("e");
    await expect(page.locator("#mC")).toContainText("Hair Studio");
  });

  test("blocks a driven car from passing through another vehicle", async ({ page }) => {
    await startGame(page);

    const setup = await page.evaluate(() => {
      window.__voxcelTest.attachPlayerVehicle("ns", 0, 1, -14);
      const playerVehicle = window.__voxcelPlayer.state.vehicle;
      const obstacle = window.__voxcelPlayer.vehicles.find((vehicle) => vehicle !== playerVehicle);
      playerVehicle.m.position.set(2, 0, -14);
      playerVehicle.m.rotation.y = 0;
      playerVehicle.driveSpeed = 0;
      obstacle.manual = true;
      obstacle.driveSpeed = 0;
      obstacle.curSp = 0;
      obstacle.m.position.set(2, 0, -8);
      obstacle.m.traverse((object) => {
        if (object.isMesh) object.userData.collisionMode = "none";
      });
      window.__voxcelEnhancements.refreshColliders();
      return { playerZ: playerVehicle.m.position.z, obstacleZ: obstacle.m.position.z };
    });

    expect(setup).toEqual({ playerZ: -14, obstacleZ: -8 });
    await page.waitForTimeout(180);
    await page.evaluate(() => {
      window.__voxcelPlayer.state.vehicle.m.position.z = -6;
    });
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => ({
      playerZ: window.__voxcelPlayer.state.vehicle.m.position.z,
      state: window.__voxcelEnhancements.getState(),
    }));
    expect(result.playerZ).toBeLessThan(-10.9);
    expect(result.state.vehicleToVehicleBlockedMoves).toBeGreaterThan(0);
    expect(result.state.lastCollisionObject).toBeTruthy();
  });
});
