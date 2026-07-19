import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().enhancements?.ready ?? false);
  }).toBe(true);
  await page.waitForTimeout(220);
}

async function setPlayer(page, x, z, yaw = Math.PI) {
  await page.evaluate(
    ({ x, z, yaw }) => window.__voxcelTest.setPlayer(x, z, yaw),
    { x, z, yaw },
  );
  await page.waitForTimeout(160);
}

async function enterBuilding(page, building) {
  const entrance = await page.evaluate((buildingId) => {
    const match = window.__voxcelPlayer.entrances.find(({ b }) => b.id === buildingId);
    return { x: match.pos.x, z: match.pos.z };
  }, building.id);
  await setPlayer(page, entrance.x, entrance.z);
  await page.keyboard.press("e");
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelEnhancements.getState().buildingId);
  }).toBe(building.id);
  await page.waitForTimeout(120);
}

async function exitBuilding(page, building, room) {
  await setPlayer(page, building.x, building.z - room.depth / 2 + 1);
  await page.keyboard.press("e");
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelEnhancements.getState().activeScene);
  }).toBe("city");
  await page.waitForTimeout(120);
}

test.describe("spacious themed interiors", () => {
  test("bookstore has one high ceiling, generous aisles, and bookstore-specific areas", async ({ page }) => {
    await startGame(page);
    const building = await page.evaluate(() => {
      return window.__voxcelPlayer.buildings.find(({ id }) => id === "book");
    });

    await enterBuilding(page, building);
    const state = await page.evaluate(() => window.__voxcelEnhancements.getState());
    const structure = await page.evaluate(() => {
      const scene = window.__voxcelEnhancements.getActiveScene();
      const names = [];
      scene.traverse((object) => names.push(object.name));
      return {
        floorCount: names.filter((name) => name === "InteriorFloor").length,
        ceilingCount: names.filter((name) => name === "InteriorCeiling").length,
      };
    });

    expect(state.roomDimensions).toEqual({ width: 22, depth: 22, height: 7.2 });
    expect(state.legacySurfaceCount).toBe(0);
    expect(structure).toEqual({ floorCount: 1, ceilingCount: 1 });
    expect(state.themeFixtureCount).toBeGreaterThan(40);
    expect(state.fixtureRoles).toEqual(expect.arrayContaining([
      "wall-bookcase",
      "island-bookcase",
      "new-releases",
      "reading-seat",
      "checkout",
    ]));

    // The player can walk beyond the old 12 m exterior footprint.
    await setPlayer(page, building.x + 5, building.z - 8, 0);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(420);
    await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(100);
    const walked = await page.evaluate(() => window.__voxcelTest.sample().player.x);
    expect(walked).toBeGreaterThan(building.x + building.w / 2 + 0.2);

    await exitBuilding(page, building, state.roomDimensions);
    const restored = await page.evaluate(() => {
      const book = window.__voxcelPlayer.buildings.find(({ id }) => id === "book");
      const entrance = window.__voxcelPlayer.entrances.find(({ b }) => b.id === "book");
      return {
        width: book.w,
        depth: book.d,
        player: window.__voxcelTest.sample().player,
        entrance: { x: entrance.pos.x, z: entrance.pos.z },
      };
    });
    expect(restored.width).toBe(12);
    expect(restored.depth).toBe(12);
    expect(restored.player.x).toBeCloseTo(restored.entrance.x, 1);
    expect(restored.player.z).toBeCloseTo(restored.entrance.z, 1);
  });

  test("all thirteen buildings use larger, distinct themed rooms and restore exterior sizes", async ({ page }) => {
    test.setTimeout(60_000);
    await startGame(page);
    const buildings = await page.evaluate(() => {
      return window.__voxcelPlayer.buildings.map((building) => ({ ...building }));
    });
    const themes = new Set();

    for (const building of buildings) {
      await enterBuilding(page, building);
      const state = await page.evaluate(() => window.__voxcelEnhancements.getState());

      expect(state.roomDimensions.width).toBeGreaterThan(building.w);
      expect(state.roomDimensions.depth).toBeGreaterThan(building.d);
      expect(state.roomDimensions.height).toBeGreaterThanOrEqual(6.2);
      expect(state.legacySurfaceCount).toBe(0);
      expect(state.themeFixtureCount).toBeGreaterThan(5);
      expect(state.fixtureRoles.length).toBeGreaterThan(1);
      themes.add(state.themeId);

      if (building.id === "police") {
        const jail = await page.evaluate(() => {
          const view = window.__voxcelPlayer.buildingViews.police;
          return {
            cell: { ...view.jailCell },
            maxBarY: Math.max(...view.jailBars.map((bar) => bar.position.y + bar.geometry.parameters.height * bar.scale.y / 2)),
          };
        });
        expect(jail.cell.x).toBeLessThan(building.x - 5);
        expect(jail.cell.z).toBeGreaterThan(building.z + 5);
        expect(jail.maxBarY).toBeLessThanOrEqual(state.roomDimensions.height);
      }

      await exitBuilding(page, building, state.roomDimensions);
      const restored = await page.evaluate((id) => {
        const current = window.__voxcelPlayer.buildings.find((building) => building.id === id);
        return { width: current.w, depth: current.d };
      }, building.id);
      expect(restored).toEqual({ width: building.w, depth: building.d });
      if (building.id === "police") {
        const restoredJail = await page.evaluate(() => {
          return { ...window.__voxcelPlayer.buildingViews.police.jailCell };
        });
        expect(restoredJail).toEqual({ x: 68.8, z: 54.5, w: 3.3, d: 2.8 });
      }
    }

    expect(themes.size).toBe(buildings.length);
  });
});
