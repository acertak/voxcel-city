import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => ({
      started: window.__voxcelTest?.sample().started ?? false,
      streetscape: window.__voxcelStreetscape?.ready ?? false,
    }));
  }).toEqual({ started: true, streetscape: true });
}

test.describe("signals and scenery", () => {
  test("traffic signals include yellow and all-red clearance states", async ({ page }) => {
    await startGame(page);

    const states = await page.evaluate(() => {
      return [0, 1, 2, 3].map((step) => window.__voxcelTest.setSignal(step).signal);
    });

    expect(states).toEqual([
      { phase: "ns_go", ns: "g", ew: "r", remaining: 9 },
      { phase: "ns_warn", ns: "y", ew: "r", remaining: 3 },
      { phase: "all_stop_1", ns: "r", ew: "r", remaining: 2 },
      { phase: "ew_go", ns: "r", ew: "g", remaining: 9 },
    ]);
  });

  test("roadside signals are distributed across every intersection and switch by axis", async ({ page }) => {
    await startGame(page);

    const nsGo = await page.evaluate(() => window.__voxcelTest.setSignal(0).trafficLights);
    const ewGo = await page.evaluate(() => window.__voxcelTest.setSignal(3).trafficLights);

    expect(nsGo.count).toBe(72);
    expect(nsGo.vehicleCount).toBe(24);
    expect(nsGo.pedestrianCount).toBe(48);
    expect(nsGo.intersections).toBe(6);
    expect(nsGo.nsGreen).toBe(12);
    expect(nsGo.ewGreen).toBe(0);
    expect(nsGo.pedWalkNs).toBe(0);
    expect(nsGo.pedWalkEw).toBe(24);

    expect(ewGo.nsGreen).toBe(0);
    expect(ewGo.ewGreen).toBe(12);
    expect(ewGo.pedWalkNs).toBe(24);
    expect(ewGo.pedWalkEw).toBe(0);
  });

  test("raises rooftop signs and gives signals and road markings clear real-world orientation", async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
      const handle = window.__voxcelPlayer;
      const streetscape = window.__voxcelStreetscape.getState();
      const closeTo = (value, expected, epsilon = 0.025) => Math.abs(value - expected) <= epsilon;
      const centerBars = handle.trafficLights
        .filter(({ kind }) => kind === "vehicle")
        .flatMap(({ group }) => group.children)
        .filter((mesh) => {
          const size = mesh.geometry?.parameters;
          return Boolean(
            mesh.isMesh &&
            size &&
            closeTo(size.width, 0.88) &&
            closeTo(size.height, 0.2) &&
            closeTo(size.depth, 0.18) &&
            closeTo(mesh.position.x, 6.15) &&
            closeTo(mesh.position.y, 3.72) &&
            closeTo(mesh.position.z, 0.34)
          );
        });
      const pedestrianFacingDots = handle.trafficLights
        .filter(({ kind }) => kind === "pedestrian")
        .map(({ group, intersectionId, crossAxis }) => {
          const [centerX, centerZ] = intersectionId.split(",").map(Number);
          const deltaX = crossAxis === "ns" ? centerX - group.position.x : 0;
          const deltaZ = crossAxis === "ew" ? centerZ - group.position.z : 0;
          return (
            Math.sin(group.rotation.y) * deltaX +
            Math.cos(group.rotation.y) * deltaZ
          ) / Math.hypot(deltaX, deltaZ);
        });
      const rooftopSigns = handle.buildings.map(({ id }) => {
        const sign = handle.buildingViews[id]?.roofSign;
        return {
          id,
          y: sign?.position.y ?? null,
          originalY: sign?.userData?.voxcelStreetscapeSignOriginalY ?? null,
          lift: sign?.userData?.voxcelStreetscapeSignLift ?? null,
        };
      });
      const stopLineMeshes = [];
      handle.scene.traverse((object) => {
        if (object.userData?.voxcelStopLine) {
          stopLineMeshes.push({ x: object.position.x, z: object.position.z });
        }
      });
      const stopLineOffsets = handle.stopLines.map((stopLine) => {
        const [centerX, centerZ] = stopLine.intersectionId.split(",").map(Number);
        return stopLine.axis === "ns"
          ? Math.abs(stopLine.z - centerZ)
          : Math.abs(stopLine.x - centerX);
      });
      return {
        streetscape,
        centerBarCount: centerBars.length,
        pedestrianFacingDots,
        rooftopSigns,
        stopLineMeshCount: stopLineMeshes.length,
        stopLineOffsets,
      };
    });

    expect(result.streetscape).toMatchObject({
      elevatedSignCount: 13,
      vehicleSignalCount: 24,
      removedCenterBarCount: 24,
      pedestrianSignalCount: 48,
      roadFacingPedestrianSignalCount: 48,
      stopLineCount: 24,
      crosswalkStripeCount: 144,
      streetMarkings: {
        crosswalkOuterOffset: 8.9,
        stopLineOffset: 10.2,
        stopLineInnerOffset: 10.1,
        minimumGap: 1.2,
      },
    });
    expect(result.rooftopSigns).toHaveLength(13);
    for (const sign of result.rooftopSigns) {
      expect(sign.originalY, `${sign.id} original rooftop sign height`).toEqual(expect.any(Number));
      expect(sign.lift, `${sign.id} rooftop sign lift`).toBeCloseTo(0.35, 5);
      expect(sign.y - sign.originalY, `${sign.id} raised rooftop sign`).toBeCloseTo(0.35, 5);
    }
    expect(result.centerBarCount).toBe(0);
    expect(result.pedestrianFacingDots).toHaveLength(48);
    expect(Math.min(...result.pedestrianFacingDots)).toBeGreaterThan(0.999);
    expect(result.stopLineMeshCount).toBe(24);
    expect(result.stopLineOffsets).toHaveLength(24);
    expect(result.stopLineOffsets.every((offset) => Math.abs(offset - 10.2) < 0.001)).toBe(true);
  });

  test("park fountain and trees stay off the road surface", async ({ page }) => {
    await startGame(page);

    const scenery = await page.evaluate(() => window.__voxcelTest.sample().scenery);

    expect(scenery.fountainOnRoad).toBe(false);
    expect(scenery.treeRoadOverlaps).toBe(0);
    expect(scenery.park.z).toBeGreaterThan(10);
  });

  test("wanted level dispatches police units after repeated traffic crimes", async ({ page }) => {
    await startGame(page);

    const state = await page.evaluate(() => {
      window.__voxcelTest.addCrime(82, "赤信号を無視した");
      return window.__voxcelTest.sample();
    });

    expect(state.wanted.level).toBeGreaterThanOrEqual(2);
    expect(state.wanted.reason).toContain("赤信号");
    expect(state.police.units).toBeGreaterThan(0);
  });
});
