import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(
    () => window.__voxcelTraffic?.ready ?? false,
  ), { timeout: 60_000 }).toBe(true);
  await page.waitForTimeout(200);
}

// The headless renderer here manages barely a frame a second, far too little for traffic
// to actually go anywhere. `simulate` steps the same code path without waiting on frames;
// the signal phase is driven alongside it because that lives in the game's own loop.
async function runTraffic(page, seconds, collect) {
  return page.evaluate(({ seconds, collect }) => {
    const observations = [];
    const sample = new Function(`return (${collect})`)();
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.5) {
      window.__voxcelTraffic.simulate(0.5);
      window.__voxcelTest.advanceSignal(0.5);
      observations.push(sample());
    }
    return observations;
  }, { seconds, collect: collect.toString() });
}

test.describe("city traffic", () => {
  test("wires the loop line into the city grid as one road network", async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page);

    const state = await page.evaluate(() => window.__voxcelTraffic.getState());
    expect(state).toMatchObject({ ready: true, status: "ready" });
    // Four north-south roads (two grid, two loop) crossing five east-west ones.
    expect(state.nodeCount).toBe(20);
    expect(state.edgeCount).toBe(62);
    // Only the original grid crossings keep signals; loop tie-ins are give-way.
    expect(state.signalledNodeCount).toBe(6);
    expect(state.ringEdgeCount).toBe(28);
    expect(state.routedVehicleCount).toBe(state.routedBusCount + 10);
    expect(state.routedBusCount).toBe(3);
    expect(state.stops.length).toBe(18);
    expect(state.stops.filter((stop) => stop.kind === "ring").length).toBe(8);
    expect(state.shelterMeshCount).toBeGreaterThan(state.stops.length * 4);
    expect(state.loopBus).toMatchObject({ type: "bus", manual: true, onRing: true });
  });

  test("drives every vehicle across the whole network, loop line included", async ({ page }) => {
    test.setTimeout(180_000);
    await startGame(page);

    const observations = await runTraffic(page, 260, () => {
      const state = window.__voxcelTraffic.getState();
      const handle = window.__voxcelPlayer;
      return {
        visitedRing: state.visitedRingCount,
        onRing: state.onRingCount,
        routed: state.routedVehicleCount,
        positions: handle.vehicles.map((vehicle) => [
          Math.round(vehicle.m.position.x * 10) / 10,
          Math.round(vehicle.m.position.z * 10) / 10,
        ]),
        offRoad: handle.vehicles.filter((vehicle) => !handle.roadRects.some((rect) => (
          Math.abs(vehicle.m.position.x - rect.x) <= rect.w / 2 + 0.6 &&
          Math.abs(vehicle.m.position.z - rect.z) <= rect.d / 2 + 0.6
        ))).length,
      };
    });

    const last = observations[observations.length - 1];
    const routed = last.routed;
    expect(routed).toBeGreaterThan(10);
    // Every single vehicle has to have used the loop line at least once.
    expect(last.visitedRing).toBe(routed);
    // ...without the loop swallowing the city: the grid still carries most of the traffic.
    const ringShare = observations.reduce((sum, entry) => sum + entry.onRing, 0)
      / observations.length / routed;
    expect(ringShare).toBeGreaterThan(0.05);
    expect(ringShare).toBeLessThan(0.6);
    // Nothing may leave the tarmac, and nothing may sit still for the whole run.
    expect(observations.every((entry) => entry.offRoad === 0)).toBe(true);

    const travelled = new Array(routed).fill(0);
    for (let index = 1; index < observations.length; index += 1) {
      const previous = observations[index - 1].positions;
      const current = observations[index].positions;
      for (let vehicle = 0; vehicle < routed; vehicle += 1) {
        const step = Math.hypot(
          current[vehicle][0] - previous[vehicle][0],
          current[vehicle][1] - previous[vehicle][1],
        );
        // Ignore the jump a vehicle makes if the player teleports it.
        if (step < 12) travelled[vehicle] += step;
      }
    }
    expect(Math.min(...travelled)).toBeGreaterThan(300);
  });

  test("turns at junctions and holds at red lights", async ({ page }) => {
    test.setTimeout(180_000);
    await startGame(page);

    const observations = await runTraffic(page, 200, () => {
      const state = window.__voxcelTraffic.getState();
      return {
        turning: state.turningCount,
        headings: window.__voxcelPlayer.vehicles.map(
          (vehicle) => Math.round(vehicle.m.rotation.y * 100) / 100,
        ),
      };
    });
    expect(observations.some((entry) => entry.turning > 0)).toBe(true);
    const changedHeading = observations[0].headings.filter((heading, index) => (
      observations.some((entry) => Math.abs(entry.headings[index] - heading) > 0.5)
    ));
    expect(changedHeading.length).toBe(observations[0].headings.length);

    // Hold every approach on red. Whatever was already crossing clears, and no signalled
    // junction may be entered again for as long as it stays red.
    const held = await page.evaluate(() => {
      window.__voxcelTest.setSignal(2, 0);
      const handle = window.__voxcelPlayer;
      const crossings = [0, 44].flatMap((x) => [-70, 0, 70].map((z) => ({ x, z })));
      const inside = () => handle.vehicles.filter((vehicle) => crossings.some((node) => (
        Math.abs(vehicle.m.position.x - node.x) < 5 && Math.abs(vehicle.m.position.z - node.z) < 5
      ))).length;
      for (let tick = 0; tick < 80; tick += 1) window.__voxcelTraffic.simulate(0.25);
      const cleared = inside();
      let peak = 0;
      for (let tick = 0; tick < 160; tick += 1) {
        window.__voxcelTraffic.simulate(0.25);
        peak = Math.max(peak, inside());
      }
      return { signal: window.__voxcelTest.sample().signal, cleared, peak };
    });
    expect(held.signal).toMatchObject({ ns: "r", ew: "r" });
    expect(held.cleared).toBe(0);
    expect(held.peak).toBe(0);
  });

  test("halts buses at their stops", async ({ page }) => {
    test.setTimeout(180_000);
    await startGame(page);

    const observations = await runTraffic(page, 260, () => {
      const state = window.__voxcelTraffic.getState();
      const buses = window.__voxcelPlayer.vehicles.filter((vehicle) => vehicle.type === "bus");
      return {
        visits: state.busStopVisits,
        halted: state.haltedAtStopCount,
        stoppedBuses: buses.filter((bus) => (bus.curSp ?? 0) < 0.05).length,
        loopStops: state.loopBus?.stopCount ?? 0,
      };
    });

    const last = observations[observations.length - 1];
    expect(last.visits).toBeGreaterThan(8);
    expect(last.loopStops).toBeGreaterThan(4);
    // A stop is a real halt, not just a slow crawl past the shelter.
    expect(observations.some((entry) => entry.halted > 0)).toBe(true);
    expect(observations.some((entry) => entry.stoppedBuses > 0)).toBe(true);
  });

  test("hands a vehicle back to the network when the player steps out", async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page);

    const boarded = await page.evaluate(() => {
      const attached = window.__voxcelTest.attachPlayerVehicle();
      return {
        attached: Boolean(attached),
        type: window.__voxcelPlayer.state.vehicle?.type ?? null,
        routed: window.__voxcelTraffic.getState().routedVehicleCount,
      };
    });
    expect(boarded.attached).toBe(true);
    expect(boarded.type).toBe("car");

    // Driving is still the player's job in a car; the throttle has to reach the wheels.
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(700);
    const driving = await page.evaluate(() => ({
      driveSpeed: window.__voxcelPlayer.state.vehicle.driveSpeed,
      movementLocked: window.__voxcelPlayer.movementLocked,
    }));
    await page.keyboard.up("ArrowUp");
    expect(driving.movementLocked).toBe(false);
    expect(driving.driveSpeed).toBeGreaterThan(0);

    const returned = await page.evaluate(async () => {
      const handle = window.__voxcelPlayer;
      const car = handle.state.vehicle;
      handle.state.vehicle = null;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const before = { x: car.m.position.x, z: car.m.position.z };
      window.__voxcelTraffic.simulate(6);
      return {
        manual: car.manual,
        routed: window.__voxcelTraffic.getState().routedVehicleCount,
        moved: Math.hypot(car.m.position.x - before.x, car.m.position.z - before.z),
      };
    });
    expect(returned.manual).toBe(true);
    expect(returned.routed).toBe(boarded.routed);
    expect(returned.moved).toBeGreaterThan(1);
  });
});
