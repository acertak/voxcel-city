import { expect, test } from "playwright/test";

const FACILITY_ID = "sky-water-athletic";
const REQUIRED_ROLES = [
  "entrance",
  "water-course",
  "fortress",
  "suspension-bridge",
  "warped-wall",
  "zipline",
];
const REMOVED_LANDMARK_CENTERS = [
  { x: -110, z: 112 },
  { x: -84, z: 118 },
];

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    started: window.__voxcelTest?.sample?.().started ?? false,
    athletics: window.__voxcelAthletics?.ready ?? false,
    map: window.__voxcelMap?.ready ?? false,
    enhancements: window.__voxcelEnhancements?.getState?.().ready ?? false,
  }))).toEqual({
    started: true,
    athletics: true,
    map: true,
    enhancements: true,
  });
  await page.waitForTimeout(180);
}

async function athleticsState(page) {
  return page.evaluate(() => window.__voxcelAthletics.getState());
}

async function setPlayer(page, point, yaw = Math.PI) {
  await page.evaluate(({ x, z, yaw: nextYaw }) => {
    window.__voxcelTest.setPlayer(x, z, nextYaw);
  }, { x: point.x, z: point.z, yaw });
  await page.waitForTimeout(180);
}

function pointFrom(value) {
  const source = value?.center || value?.position || value?.pos || value;
  return {
    x: Number(source?.x),
    z: Number(source?.z),
  };
}

function boundsCenter(bounds) {
  const direct = pointFrom(bounds);
  if (Number.isFinite(direct.x) && Number.isFinite(direct.z)) return direct;
  return {
    x: (Number(bounds?.minX) + Number(bounds?.maxX)) / 2,
    z: (Number(bounds?.minZ) + Number(bounds?.maxZ)) / 2,
  };
}

function challengeId(challenge) {
  return challenge?.id || challenge?.role || challenge?.type;
}

function findWaterChallenge(state) {
  return state.challenges.find((challenge) => (
    challengeId(challenge) === "water-course" ||
    challenge?.role === "water-course" ||
    /water|水上/i.test(`${challenge?.id || ""} ${challenge?.name || ""}`)
  ));
}

function stateChallenge(state, id) {
  return state.challenges?.find((challenge) => challengeId(challenge) === id) || null;
}

function idFromProgress(value) {
  if (typeof value === "string") return value;
  return value?.id || value?.role || value?.type || null;
}

function challengeIsActive(state, id) {
  const challenge = stateChallenge(state, id);
  return (
    idFromProgress(state.activeChallenge) === id ||
    state.activeChallengeId === id ||
    challenge?.active === true ||
    challenge?.status === "active" ||
    challenge?.status === "in-progress"
  );
}

function challengeIsCompleted(state, id) {
  const challenge = stateChallenge(state, id);
  const completed = state.completedChallenges || state.completedChallengeIds || [];
  return (
    completed.some((entry) => idFromProgress(entry) === id) ||
    challenge?.completed === true ||
    challenge?.status === "completed" ||
    challenge?.status === "complete"
  );
}

test.describe("Sky Water Athletic", () => {
  test("replaces two inaccessible landmarks with a complete outdoor course", async ({ page }) => {
    await startGame(page);
    const state = await athleticsState(page);

    expect(state).toMatchObject({
      ready: true,
      id: FACILITY_ID,
    });
    expect(Array.isArray(state.roles)).toBe(true);
    expect(state.roles).toEqual(expect.arrayContaining(REQUIRED_ROLES));

    const center = boundsCenter(state.bounds);
    expect(center.x).toBeCloseTo(-92, 0);
    expect(center.z).toBeCloseTo(106, 0);

    expect(Array.isArray(state.removedLandmarks)).toBe(true);
    for (const expectedCenter of REMOVED_LANDMARK_CENTERS) {
      const match = state.removedLandmarks.some((landmark) => {
        const centerPoint = pointFrom(landmark);
        return Math.hypot(
          centerPoint.x - expectedCenter.x,
          centerPoint.z - expectedCenter.z,
        ) < 1;
      });
      expect(match, `removed landmark at ${expectedCenter.x}, ${expectedCenter.z}`).toBe(true);
    }

    expect(Array.isArray(state.challenges)).toBe(true);
    expect(findWaterChallenge(state)).toBeTruthy();
  });

  test("starts and completes the public water course with the E key", async ({ page }) => {
    await startGame(page);
    const initial = await athleticsState(page);
    const challenge = findWaterChallenge(initial);
    expect(challenge).toBeTruthy();

    const id = challengeId(challenge);
    const start = pointFrom(challenge.start || challenge.startPoint);
    expect(Number.isFinite(start.x) && Number.isFinite(start.z)).toBe(true);

    await setPlayer(page, start);
    await expect(page.getByRole("button", { name: /水上コースに挑戦/ })).toBeVisible();
    await page.keyboard.press("e");

    await expect.poll(async () => challengeIsActive(await athleticsState(page), id)).toBe(true);
    expect(challengeIsCompleted(await athleticsState(page), id)).toBe(false);

    await expect.poll(
      async () => challengeIsCompleted(await athleticsState(page), id),
      { timeout: 8_000 },
    ).toBe(true);
    expect(challengeIsActive(await athleticsState(page), id)).toBe(false);
  });

  test("completes the wall and zipline experiences with their public controls", async ({ page }) => {
    test.setTimeout(35_000);
    await startGame(page);

    for (const id of ["wall", "zipline"]) {
      const before = await athleticsState(page);
      const challenge = stateChallenge(before, id);
      expect(challenge).toBeTruthy();
      const start = pointFrom(challenge.start);
      await setPlayer(page, start);
      await expect(page.getByRole("button", { name: challenge.label })).toBeVisible();
      await page.keyboard.press("e");

      await expect.poll(async () => challengeIsActive(await athleticsState(page), id)).toBe(true);
      await expect.poll(
        async () => challengeIsCompleted(await athleticsState(page), id),
        { timeout: challenge.durationMs + 3_000 },
      ).toBe(true);
      expect(challengeIsActive(await athleticsState(page), id)).toBe(false);
    }
  });

  test("registers and selects the athletic facility on the city map", async ({ page }) => {
    await startGame(page);
    const mapLocation = await page.evaluate((id) => (
      window.__voxcelMap.getState().locations.find((location) => location.id === id) || null
    ), FACILITY_ID);

    expect(mapLocation).toMatchObject({
      id: FACILITY_ID,
      enterable: false,
    });
    expect(mapLocation.name).toEqual(expect.any(String));
    expect(mapLocation.name.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "街の地図を開く" }).click();
    await expect(page.getByRole("dialog", { name: "🗺️ 街の地図" })).toBeVisible();

    const locationButton = page.locator(
      `.voxcel-map-location-button[data-map-location="${FACILITY_ID}"]`,
    );
    await expect(locationButton).toBeVisible();
    await expect(locationButton).toContainText(mapLocation.name);
    await locationButton.click();

    await expect.poll(async () => page.evaluate(() => (
      window.__voxcelMap.getState().selectedId
    ))).toBe(FACILITY_ID);
    await expect(locationButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(
      `.voxcel-map-location-shape[data-map-location="${FACILITY_ID}"]`,
    )).toHaveClass(/is-selected/);
  });
});
