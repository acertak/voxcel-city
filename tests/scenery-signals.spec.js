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
      const stopLinePlacements = handle.stopLines.map((stopLine) => {
        const [centerX, centerZ] = stopLine.intersectionId.split(",").map(Number);
        const direction = Math.sign(stopLine.dir);
        return stopLine.axis === "ns"
          ? {
              approachOffset: (stopLine.z - centerZ) * direction,
              laneOffset: (stopLine.x - centerX) * direction,
            }
          : {
              approachOffset: (stopLine.x - centerX) * direction,
              laneOffset: (stopLine.z - centerZ) * direction,
            };
      });
      const stopLineVisualsMatch = handle.stopLines.every((stopLine) => (
        stopLineMeshes.some((mesh) => (
          closeTo(mesh.x, stopLine.x) && closeTo(mesh.z, stopLine.z)
        ))
      ));
      return {
        streetscape,
        centerBarCount: centerBars.length,
        pedestrianFacingDots,
        rooftopSigns,
        stopLineMeshCount: stopLineMeshes.length,
        stopLineOffsets,
        stopLinePlacements,
        stopLineVisualsMatch,
      };
    });

    expect(result.streetscape).toMatchObject({
      elevatedSignCount: 13,
      vehicleSignalCount: 24,
      removedCenterBarCount: 72,
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
    expect(result.stopLinePlacements).toHaveLength(24);
    for (const placement of result.stopLinePlacements) {
      expect(placement.approachOffset).toBeCloseTo(-10.2, 5);
      expect(placement.laneOffset).toBeCloseTo(2, 5);
    }
    expect(result.stopLineVisualsMatch).toBe(true);
  });

  test("NPC traffic stops before red lights and resumes on green from every approach", async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(async () => {
      const handle = window.__voxcelPlayer;
      const delay = (milliseconds) => new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });
      const stageApproaches = (axis, redPhase) => {
        window.__voxcelTest.setSignal(redPhase, 0);
        return [-1, 1].map((direction) => {
          const vehicle = handle.vehicles.find((candidate) => (
            candidate.axis === axis &&
            candidate.road === 0 &&
            candidate.dir === direction &&
            candidate.type === "car"
          ));
          vehicle.manual = false;
          vehicle.curSp = vehicle.sp;
          vehicle.targetSp = vehicle.sp;
          if (axis === "ns") {
            vehicle.m.position.set(vehicle.lanePos, 0, -direction * 15);
            vehicle.m.rotation.y = direction > 0 ? 0 : Math.PI;
          } else {
            vehicle.m.position.set(-direction * 15, 0, vehicle.lanePos);
            vehicle.m.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
          return vehicle;
        });
      };
      const sampleApproaches = (axis, vehicles) => vehicles.map((vehicle) => {
        const stopLine = handle.stopLines.find((candidate) => (
          candidate.intersectionId === "0,0" &&
          candidate.axis === axis &&
          candidate.dir === vehicle.dir
        ));
        const coordinate = axis === "ns" ? vehicle.m.position.z : vehicle.m.position.x;
        const stopCoordinate = axis === "ns" ? stopLine.z : stopLine.x;
        return {
          direction: vehicle.dir,
          signedCoordinate: coordinate * vehicle.dir,
          signedFrontCoordinate: coordinate * vehicle.dir + vehicle.len / 2,
          signedStopCoordinate: stopCoordinate * vehicle.dir,
          speed: vehicle.curSp,
          targetSpeed: vehicle.targetSp,
        };
      });
      const verifyAxis = async ({ axis, redPhase, greenPhase }) => {
        const vehicles = stageApproaches(axis, redPhase);
        await delay(1_800);
        const stopped = sampleApproaches(axis, vehicles);
        const redSignal = window.__voxcelTest.sample().signal;
        window.__voxcelTest.setSignal(greenPhase, 0);
        const beforeGreen = sampleApproaches(axis, vehicles);
        await delay(650);
        const afterGreen = sampleApproaches(axis, vehicles);
        const greenSignal = window.__voxcelTest.sample().signal;
        for (const vehicle of vehicles) vehicle.manual = true;
        return { stopped, redSignal, beforeGreen, afterGreen, greenSignal };
      };

      for (const vehicle of handle.vehicles) vehicle.manual = true;
      return {
        ns: await verifyAxis({ axis: "ns", redPhase: 3, greenPhase: 0 }),
        ew: await verifyAxis({ axis: "ew", redPhase: 0, greenPhase: 3 }),
      };
    });

    for (const [axis, behavior] of Object.entries(result)) {
      expect(behavior.redSignal[axis]).toBe("r");
      expect(behavior.greenSignal[axis]).toBe("g");
      for (const stopped of behavior.stopped) {
        expect(stopped.signedStopCoordinate).toBeCloseTo(-10.2, 5);
        expect(stopped.signedCoordinate).toBeLessThanOrEqual(-10.15);
        expect(stopped.signedFrontCoordinate).toBeLessThanOrEqual(-10.05);
        expect(stopped.targetSpeed).toBe(0);
        expect(stopped.speed).toBeCloseTo(0, 1);
      }
      for (let index = 0; index < behavior.afterGreen.length; index += 1) {
        const before = behavior.beforeGreen[index];
        const after = behavior.afterGreen[index];
        expect(after.targetSpeed).toBeGreaterThan(0);
        expect(after.signedCoordinate).toBeGreaterThan(before.signedCoordinate);
      }
    }
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
