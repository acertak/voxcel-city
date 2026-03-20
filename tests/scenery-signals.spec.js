import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => window.__voxcelTest?.sample().started ?? false);
  }).toBe(true);
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
