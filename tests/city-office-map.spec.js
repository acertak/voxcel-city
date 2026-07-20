import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    office: window.__voxcelOffice?.ready ?? false,
    map: window.__voxcelMap?.ready ?? false,
    enhancements: window.__voxcelEnhancements?.getState?.().ready ?? false,
  }))).toEqual({ office: true, map: true, enhancements: true });
  await page.waitForTimeout(180);
}

async function setPlayer(page, x, z, yaw = Math.PI) {
  await page.evaluate(({ x, z, yaw }) => {
    window.__voxcelTest.setPlayer(x, z, yaw);
  }, { x, z, yaw });
  await page.waitForTimeout(140);
}

test.describe("natural city layout and named map", () => {
  test("separates residences from facilities and adds a lightweight office lot", async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
      const buildings = window.__voxcelPlayer.buildings.map((building) => ({
        id: building.id,
        x: building.x,
        z: building.z,
        w: building.mapW || building.w,
        d: building.mapD || building.d,
        floors: building.floors || null,
      }));
      const decorative = window.__voxcelPlayer.decorativeBuildings.map((building, index) => ({
        id: building.layoutId || `decorative-${index}`,
        x: building.x,
        z: building.z,
        w: building.w,
        d: building.d,
      }));
      const overlaps = (left, right) => (
        Math.abs(left.x - right.x) < (left.w + right.w) / 2 &&
        Math.abs(left.z - right.z) < (left.d + right.d) / 2
      );
      const conflicts = [];
      for (const residence of decorative) {
        for (const building of buildings) {
          if (overlaps(residence, building)) conflicts.push([residence.id, building.id]);
        }
      }
      for (let left = 0; left < buildings.length; left += 1) {
        for (let right = left + 1; right < buildings.length; right += 1) {
          if (overlaps(buildings[left], buildings[right])) {
            conflicts.push([buildings[left].id, buildings[right].id]);
          }
        }
      }
      return {
        buildings,
        decorative,
        conflicts,
        office: window.__voxcelOffice.getState(),
      };
    });

    expect(result.buildings).toHaveLength(13);
    expect(result.decorative).toHaveLength(7);
    expect(result.conflicts).toEqual([]);
    expect(result.buildings.find(({ id }) => id === "office")).toMatchObject({
      x: 101,
      z: 15,
      w: 22,
      d: 18,
      floors: 50,
    });
    expect(result.office.layout.residences).toHaveLength(6);
    expect(result.office.layout.movedResidenceCount).toBeGreaterThanOrEqual(3);
    expect(result.office.layout.movedResidenceObjectCount).toBeGreaterThan(140);
    expect(result.office.rendering).toEqual({
      meshCount: expect.any(Number),
      facadeTexture: { width: 256, height: 1024 },
    });
    expect(result.office.rendering.meshCount).toBeLessThanOrEqual(20);
  });

  test("opens a complete map and blocks game movement while it is visible", async ({ page }) => {
    await startGame(page);

    const state = await page.evaluate(() => window.__voxcelMap.getState());
    expect(state.locationCount).toBe(15);
    expect(state.locations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "conv", "cloth", "salon", "hosp", "bank", "home", "police", "office", "park",
      "sky-water-athletic",
    ]));
    expect(state.locations.find(({ id }) => id === "office")).toMatchObject({
      name: "シティオフィスタワー",
      floors: 50,
      w: 22,
      d: 18,
    });

    await page.getByRole("button", { name: "街の地図を開く" }).click();
    await expect(page.getByRole("dialog", { name: "🗺️ 街の地図" })).toBeVisible();
    await expect(page.getByRole("button", { name: "🏢 シティオフィスタワーを地図で確認" })).toBeVisible();
    await expect(page.getByRole("button", { name: "🌳 セントラルパークを地図で確認" })).toBeVisible();
    expect(await page.locator("[data-map-location]").count()).toBeGreaterThanOrEqual(28);

    const before = await page.evaluate(() => window.__voxcelTest.sample().player);
    await page.keyboard.down("w");
    await page.waitForTimeout(320);
    await page.keyboard.up("w");
    const after = await page.evaluate(() => window.__voxcelTest.sample().player);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.02);

    await page.keyboard.press("m");
    await expect(page.getByRole("dialog", { name: "🗺️ 街の地図" })).toBeHidden();
    expect(await page.evaluate(() => window.__voxcelMap.getState().open)).toBe(false);
  });
});

test.describe("50-floor office tower", () => {
  test("enters the lobby, changes only the active floor, and exits from 1F", async ({ page }) => {
    test.setTimeout(45_000);
    await startGame(page);

    const office = await page.evaluate(() => window.__voxcelOffice.getState());
    await setPlayer(page, office.entrance.x, office.entrance.z);
    await page.keyboard.press("e");
    await expect.poll(async () => page.evaluate(() => (
      window.__voxcelEnhancements.getState().buildingId
    ))).toBe("office");

    let state = await page.evaluate(() => window.__voxcelEnhancements.getState());
    expect(state.roomDimensions).toEqual({ width: 30, depth: 26, height: 7.2 });
    expect(state.themeId).toBe("office-tower");
    expect(state.office).toEqual({
      active: true,
      floor: 1,
      currentFloor: 1,
      floorCount: 50,
      variant: "lobby",
      exitAvailable: true,
      loadedFloorCount: 1,
    });
    expect(state.fixtureRoles).toEqual(expect.arrayContaining([
      "office-reception", "security-gate", "office-waiting", "elevator",
    ]));

    const elevator = await page.evaluate(() => window.__voxcelOffice.getState().elevator);
    await setPlayer(page, elevator.x, elevator.z);
    await expect(page.getByRole("button", { name: "▲ 上へ呼ぶ", exact: true })).toBeVisible();
    await expect(page.locator("#mO")).not.toHaveClass(/show/);
    await expect(page.locator(".office-floor-button")).toHaveCount(0);
    expect(await page.evaluate(() => window.__voxcelEnhancements.setOfficeFloor(25))).toBe(true);

    state = await page.evaluate(() => window.__voxcelEnhancements.getState());
    expect(state.office).toMatchObject({
      active: true,
      currentFloor: 25,
      floorCount: 50,
      variant: "general",
      exitAvailable: false,
      loadedFloorCount: 1,
    });
    expect(state.fixtureRoles).toEqual(expect.arrayContaining([
      "workstation", "meeting-room", "office-pantry", "copy-area", "elevator",
    ]));
    const upperExit = await page.evaluate(() => {
      const point = window.__voxcelPlayer.buildingViews.office.interiorPts
        .find(({ action }) => action === "exit").pos;
      return { x: point.x, y: point.y, z: point.z };
    });
    expect(upperExit.y).toBeGreaterThan(9_000);
    await setPlayer(page, 101, 3);
    await page.keyboard.press("e");
    expect(await page.evaluate(() => window.__voxcelPlayer.state.insideBld?.id)).toBe("office");

    const directSync = await page.evaluate(() => {
      const result = window.__voxcelEnhancements.setOfficeFloor(37);
      return {
        result,
        officeFloor: window.__voxcelOffice.getState().currentFloor,
        buildingFloor: window.__voxcelOffice.building.currentFloor,
        elevatorLabel: window.__voxcelOffice.elevatorPoint.label,
      };
    });
    expect(directSync).toEqual({
      result: true,
      officeFloor: 37,
      buildingFloor: 37,
      elevatorLabel: "▲ / ▼ エレベーターを呼ぶ",
    });

    expect(await page.evaluate(() => window.__voxcelEnhancements.setOfficeFloor(50))).toBe(true);
    state = await page.evaluate(() => window.__voxcelEnhancements.getState());
    expect(state.office).toMatchObject({ currentFloor: 50, variant: "executive" });
    expect(state.fixtureRoles).toEqual(expect.arrayContaining([
      "boardroom", "executive-office", "executive-lounge", "executive-reception",
    ]));

    await page.keyboard.press("m");
    await expect(page.locator(".voxcel-map-current")).toContainText("50階");
    await page.keyboard.press("m");

    expect(await page.evaluate(() => window.__voxcelEnhancements.setOfficeFloor(1))).toBe(true);
    const exit = await page.evaluate(() => {
      const point = window.__voxcelPlayer.buildingViews.office.interiorPts
        .find(({ action }) => action === "exit").pos;
      return { x: point.x, y: point.y, z: point.z };
    });
    expect(exit.y).toBe(0);
    await setPlayer(page, exit.x, exit.z);
    await page.keyboard.press("e");
    await expect.poll(async () => page.evaluate(() => (
      window.__voxcelEnhancements.getState().activeScene
    ))).toBe("city");

    const restored = await page.evaluate(() => {
      const building = window.__voxcelPlayer.buildings.find(({ id }) => id === "office");
      return { w: building.w, d: building.d, inside: window.__voxcelPlayer.state.insideBld };
    });
    expect(restored).toEqual({ w: 22, d: 18, inside: null });
  });

  test("keeps the expanded map inside a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startGame(page);
    await page.getByRole("button", { name: "街の地図を開く" }).click();

    const geometry = await page.locator(".voxcel-map-dialog").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        touchPointerEvents: getComputedStyle(document.getElementById("touchLayer")).pointerEvents,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(390);
    expect(geometry.bottom).toBeLessThanOrEqual(844);
    expect(geometry.touchPointerEvents).toBe("none");
  });
});
