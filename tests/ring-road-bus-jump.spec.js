import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    ring: window.__voxcelRingRoad?.ready ?? false,
    traffic: window.__voxcelTraffic?.ready ?? false,
    jump: window.__voxcelJump?.ready ?? false,
  })), { timeout: 60_000 }).toEqual({ ring: true, traffic: true, jump: true });
  await page.waitForTimeout(220);
}

function loopBusHandle() {
  return window.__voxcelPlayer.vehicles.find((vehicle) => vehicle.m.userData?.voxcelLoopBus);
}

test.describe("ring road and jumping", () => {
  test("lays a loop line around the field perimeter", async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page);

    const result = await page.evaluate(() => {
      const state = window.__voxcelRingRoad.getState();
      const handle = window.__voxcelPlayer;
      const chebyshev = (x, z) => Math.max(Math.abs(x), Math.abs(z));
      const ringMeshes = [];
      handle.scene.traverse((object) => {
        if (object.isMesh && object.userData?.voxcelRingRoad) ringMeshes.push(object);
      });
      const carriageway = ringMeshes.filter((mesh) => mesh.name.startsWith("ring-asphalt-"));
      return {
        state,
        geometry: window.__voxcelRingRoad.geometry(),
        ringMeshCount: ringMeshes.length,
        carriagewayNames: carriageway.map((mesh) => mesh.name).sort(),
        allCollisionless: ringMeshes.every((mesh) => mesh.userData.collisionMode === "none"),
        roadRectCount: handle.roadRects.length,
        treesInsideCorridor: handle.sceneryTrees.filter(
          (tree) => chebyshev(tree.x, tree.z) >= state.radius - state.roadWidth / 2 - 3,
        ).length,
        mapRings: handle.roads?.rings,
        // Nothing solid may be left standing in the carriageway, and every landmark that
        // had to move must have moved as a whole rather than leaving pieces behind.
        obstructions: (() => {
          const inner = state.radius - state.roadWidth / 2;
          const outer = state.radius + state.roadWidth / 2;
          const vehicleRoots = new Set(handle.vehicles.map((vehicle) => vehicle.m));
          const found = [];
          handle.scene.updateMatrixWorld(true);
          handle.scene.traverse((object) => {
            if (!object.isMesh) return;
            if (object.userData?.voxcelRingRoad || object.userData?.voxcelBusStop) return;
            if (object.userData?.collisionMode === "none") return;
            // Visibility is hierarchical: a cleared tree group keeps its children flagged
            // visible, so the whole ancestor chain has to be checked.
            for (let node = object; node; node = node.parent) {
              if (!node.visible) return;
              if (vehicleRoots.has(node) || node === handle.playerRoot) return;
            }
            const type = object.geometry?.type;
            if (type !== "BoxGeometry" && type !== "CylinderGeometry" && type !== "ConeGeometry") return;
            const parameters = object.geometry.parameters || {};
            if ((parameters.height ?? 0) < 0.4) return;
            const halfWidth = (parameters.width ?? (parameters.radius ?? parameters.radiusTop ?? 0) * 2) / 2;
            const halfDepth = (parameters.depth ?? (parameters.radius ?? parameters.radiusTop ?? 0) * 2) / 2;
            const position = object.getWorldPosition(new object.position.constructor());
            const maxCheb = Math.max(
              Math.abs(position.x) + halfWidth,
              Math.abs(position.z) + halfDepth,
            );
            const minCheb = Math.max(
              Math.max(0, Math.abs(position.x) - halfWidth),
              Math.max(0, Math.abs(position.z) - halfDepth),
            );
            if (maxCheb <= inner + 0.05 || minCheb >= outer) return;
            found.push(`${object.name || type}@${position.x.toFixed(1)},${position.z.toFixed(1)}`);
          });
          return found;
        })(),
        // Removals must take whole scenery groups (trees). Hiding individual meshes would
        // gut composite landmarks — a tower shell keeping its windows floating in mid-air.
        hiddenLooseMeshes: handle.scene.children.filter(
          (object) => object.userData?.voxcelRingRoadCleared && object.isMesh,
        ).length,
      };
    });

    expect(result.state).toMatchObject({
      ready: true,
      status: "ready",
      radius: 129,
      roadWidth: 10,
      registeredRoadRects: 4,
    });
    expect(result.geometry.radial).toMatchObject({ x: [0, 44], z: [-70, 0, 70] });
    expect(result.carriagewayNames).toEqual([
      "ring-asphalt-east",
      "ring-asphalt-north",
      "ring-asphalt-south",
      "ring-asphalt-west",
    ]);
    expect(result.ringMeshCount).toBeGreaterThan(150);
    expect(result.allCollisionless).toBe(true);
    expect(result.treesInsideCorridor).toBe(0);
    expect(result.obstructions).toEqual([]);
    expect(result.hiddenLooseMeshes).toBe(0);
    expect(result.state.movedLandmarkCount).toBeGreaterThan(0);
    expect(result.state.movedLandmarkMeshCount).toBeGreaterThan(
      result.state.movedLandmarkCount * 10,
    );
    expect(result.mapRings).toEqual([{ radius: 129, width: 10, id: "loop-line" }]);
    // A car driven on the loop must count as being on a road, not joyriding the pavement.
    expect(result.roadRectCount).toBeGreaterThan(4);
  });

  test("leaves the adventure park's own demolition alone", async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page);
    const athletics = await page.evaluate(() => window.__voxcelAthletics.getState());
    expect(athletics).toMatchObject({ ready: true, reason: "ready", removedBuildingCount: 2 });
  });

  test("carries the player on an automatic bus without any driving", async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page);

    const boarded = await page.evaluate(() => {
      const handle = window.__voxcelPlayer;
      const bus = handle.vehicles.find((vehicle) => vehicle.m.userData?.voxcelLoopBus);
      handle.state.vehicle = bus;
      handle.playerRoot.visible = false;
      handle.playerShadow.visible = false;
      return { type: bus.type, manual: bus.manual };
    });
    expect(boarded).toEqual({ type: "bus", manual: true });

    // Hold a movement key: an automatic bus must ignore the throttle entirely.
    await page.keyboard.down("ArrowUp");
    await expect.poll(async () => page.evaluate(
      () => window.__voxcelTraffic.getState().riding?.autopilot ?? false,
    ), { timeout: 30_000 }).toBe(true);
    const riding = await page.evaluate(() => ({
      state: window.__voxcelTraffic.getState(),
      driveSpeed: window.__voxcelPlayer.state.vehicle.driveSpeed,
      playerX: window.__voxcelPlayer.playerRoot.position.x,
      playerZ: window.__voxcelPlayer.playerRoot.position.z,
      busX: window.__voxcelPlayer.state.vehicle.m.position.x,
      busZ: window.__voxcelPlayer.state.vehicle.m.position.z,
      hud: document.getElementById("voxcelBusHud")?.textContent ?? "",
    }));
    await page.keyboard.up("ArrowUp");

    expect(riding.state.riding).toMatchObject({
      type: "bus",
      line: "loop",
      autopilot: true,
      movementLocked: true,
    });
    expect(riding.driveSpeed).toBe(0);
    expect(riding.hud).toContain("環状線");
    expect(Math.hypot(riding.playerX - riding.busX, riding.playerZ - riding.busZ)).toBeLessThan(0.001);

    const left = await page.evaluate(async () => {
      const handle = window.__voxcelPlayer;
      handle.state.vehicle = null;
      handle.playerRoot.visible = true;
      handle.playerShadow.visible = true;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { state: window.__voxcelTraffic.getState(), movementLocked: handle.movementLocked };
    });
    expect(left.state.riding).toBe(null);
    expect(left.movementLocked).toBe(false);
  });

  test("jumps from a standstill and while running", async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page);
    await page.evaluate(() => window.__voxcelTest.setPlayer(0, 20, Math.PI));
    await page.waitForTimeout(200);

    const groundY = await page.evaluate(() => window.__voxcelJump.getState().groundY);
    expect(groundY).toBeCloseTo(1.2, 2);

    await page.keyboard.down(" ");
    const airborne = await page.evaluate(async () => {
      const samples = [];
      for (let tick = 0; tick < 90; tick += 1) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        const state = window.__voxcelJump.getState();
        samples.push({
          airborne: state.airborne,
          y: window.__voxcelPlayer.playerRoot.position.y,
          shadowOpacity: window.__voxcelPlayer.playerShadow.material.opacity,
        });
        if (samples.length > 3 && !state.airborne) break;
      }
      return { samples, state: window.__voxcelJump.getState() };
    });
    await page.keyboard.up(" ");

    const peak = airborne.samples.reduce((best, sample) => Math.max(best, sample.y), 0);
    const airborneSamples = airborne.samples.filter((sample) => sample.airborne);
    expect(airborne.state.jumpCount).toBe(1);
    expect(airborne.state.landingCount).toBe(1);
    expect(peak).toBeGreaterThan(groundY + 1);
    expect(airborneSamples.every((sample) => sample.shadowOpacity < 0.18)).toBe(true);
    expect(airborne.state.peakHeight).toBeGreaterThan(1);

    const landed = await page.evaluate(() => ({
      y: window.__voxcelPlayer.playerRoot.position.y,
      shadowOpacity: window.__voxcelPlayer.playerShadow.material.opacity,
    }));
    expect(landed.y).toBeCloseTo(groundY, 3);
    expect(landed.shadowOpacity).toBeCloseTo(0.18, 3);

    // Running jump: the arc must not cost any ground speed.
    await page.keyboard.down("ArrowUp");
    await page.keyboard.down(" ");
    const running = await page.evaluate(async () => {
      const root = window.__voxcelPlayer.playerRoot;
      const origin = { x: root.position.x, z: root.position.z };
      let travelledWhileAirborne = 0;
      let sawAirborne = false;
      let animation = null;
      let previous = { ...origin };
      for (let tick = 0; tick < 90; tick += 1) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        const state = window.__voxcelJump.getState();
        if (state.airborne) {
          sawAirborne = true;
          travelledWhileAirborne += Math.hypot(
            root.position.x - previous.x,
            root.position.z - previous.z,
          );
          animation = window.__voxcelCharacters?.getState?.().player?.animation ?? animation;
        } else if (sawAirborne) {
          break;
        }
        previous = { x: root.position.x, z: root.position.z };
      }
      return {
        sawAirborne,
        travelledWhileAirborne,
        animation,
        state: window.__voxcelJump.getState(),
      };
    });
    await page.keyboard.up(" ");
    await page.keyboard.up("ArrowUp");

    expect(running.sawAirborne).toBe(true);
    expect(running.state.jumpCount).toBe(2);
    expect(running.travelledWhileAirborne).toBeGreaterThan(1);
    expect(running.animation).toBe("jump");
  });

  test("suspends jumping while riding and while the adventure park drives the player", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await startGame(page);

    const riding = await page.evaluate(async () => {
      const frames = (count) => new Promise((resolve) => {
        let remaining = count;
        const step = () => (remaining -= 1) <= 0 ? resolve() : requestAnimationFrame(step);
        requestAnimationFrame(step);
      });
      const handle = window.__voxcelPlayer;
      const bus = handle.vehicles.find((vehicle) => vehicle.m.userData?.voxcelLoopBus);
      handle.state.vehicle = bus;
      await frames(3);
      window.__voxcelJump.requestJump();
      await frames(5);
      const state = window.__voxcelJump.getState();
      handle.state.vehicle = null;
      return state;
    });
    expect(riding).toMatchObject({ airborne: false, jumpCount: 0, blockedReason: "riding" });

    // Let the traffic system finish releasing its own ride lock before taking it over.
    await expect.poll(async () => page.evaluate(
      () => window.__voxcelTraffic.getState().riding === null && !window.__voxcelPlayer.movementLocked,
    ), { timeout: 30_000 }).toBe(true);

    const locked = await page.evaluate(async () => {
      const frames = (count) => new Promise((resolve) => {
        let remaining = count;
        const step = () => (remaining -= 1) <= 0 ? resolve() : requestAnimationFrame(step);
        requestAnimationFrame(step);
      });
      const handle = window.__voxcelPlayer;
      handle.setMovementLocked(true);
      await frames(3);
      window.__voxcelJump.requestJump();
      await frames(5);
      const state = window.__voxcelJump.getState();
      handle.setMovementLocked(false);
      return state;
    });
    expect(locked).toMatchObject({ airborne: false, jumpCount: 0, blockedReason: "movement-locked" });
  });
});
