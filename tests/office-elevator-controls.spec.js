import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    office: window.__voxcelOffice?.ready ?? false,
    enhancements: window.__voxcelEnhancements?.getState?.().ready ?? false,
  }))).toEqual({ office: true, enhancements: true });
}

async function readElevatorState(page) {
  return page.evaluate(() => {
    const office = window.__voxcelOffice.getState();
    const elevatorVisual = window.__voxcelEnhancements.getState().elevatorVisual;
    return {
      mode: office.elevatorState.mode,
      direction: office.elevatorState.direction,
      doorsOpen: office.elevatorState.doorsOpen,
      cabinEntered: office.elevatorState.cabinEntered,
      targetFloor: office.elevatorState.targetFloor,
      currentFloor: office.currentFloor,
      doorProgress: elevatorVisual?.doorProgress ?? null,
      displayFloor: elevatorVisual?.displayFloor ?? null,
      displayGoal: elevatorVisual?.displayGoal ?? null,
      displayPhase: elevatorVisual?.displayPhase ?? null,
    };
  });
}

test("operates the office elevator with call, doors, destination, and animated display", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await startGame(page);
  const office = await page.evaluate(() => window.__voxcelOffice.getState());
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), {
    x: office.entrance.x,
    z: office.entrance.z,
  });
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => window.__voxcelEnhancements.getState().buildingId)).toBe("office");

  const elevator = await page.evaluate(() => window.__voxcelOffice.getState().elevator);
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), {
    x: elevator.x,
    z: elevator.z - 1.8,
  });
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: "▲ 上へ呼ぶ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "▼ 下へ呼ぶ" })).toBeDisabled();
  await expect.poll(async () => readElevatorState(page)).toMatchObject({
    mode: "call",
    doorsOpen: false,
    cabinEntered: false,
  });
  const lobbyVisual = await page.evaluate(() => (
    window.__voxcelEnhancements.getState().elevatorVisual
  ));
  expect(lobbyVisual).toMatchObject({
    cabinPlacement: { lobbyIntrusion: false },
    displayFacingCorrect: true,
  });
  const closedDoorProgress = lobbyVisual.doorProgress;

  await page.getByRole("button", { name: "▲ 上へ呼ぶ" }).click();
  await expect.poll(async () => readElevatorState(page)).toMatchObject({
    mode: "arriving",
    direction: "up",
    doorsOpen: false,
  });
  await expect(page.getByText(/呼び出し中/)).toBeVisible();
  await expect(page.getByRole("button", { name: "扉が開く・乗り込む" })).toBeVisible({ timeout: 2_000 });
  await expect.poll(async () => readElevatorState(page)).toMatchObject({
    mode: "arrived",
    doorsOpen: true,
    cabinEntered: false,
  });
  await expect.poll(async () => (await readElevatorState(page)).doorProgress).toBeGreaterThan(
    closedDoorProgress + 0.2,
  );
  await expect.poll(async () => (await readElevatorState(page)).doorProgress).toBeGreaterThan(0.75);

  await page.getByRole("button", { name: "扉が開く・乗り込む" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    scene: window.__voxcelEnhancements.getState().elevatorSceneActive,
    activeScene: window.__voxcelEnhancements.getState().activeScene,
  }))).toEqual({ scene: true, activeScene: "elevator" });
  await expect.poll(async () => readElevatorState(page)).toMatchObject({
    mode: "inside-open",
    doorsOpen: true,
    cabinEntered: true,
  });
  const positionBeforeWalk = await page.evaluate(() => ({
    x: window.__voxcelPlayer.playerRoot.position.x,
    z: window.__voxcelPlayer.playerRoot.position.z,
  }));
  await page.keyboard.down("w");
  await page.waitForTimeout(180);
  await page.keyboard.up("w");
  await page.waitForTimeout(60);
  const cabinWalk = await page.evaluate((before) => {
    const player = window.__voxcelPlayer.playerRoot.position;
    const enhancements = window.__voxcelEnhancements.getState();
    return {
      distance: Math.hypot(player.x - before.x, player.z - before.z),
      colliderCount: enhancements.colliderCount,
      cameraInside: enhancements.elevatorVisual?.cabinPlacement?.cameraInside,
    };
  }, positionBeforeWalk);
  expect(cabinWalk.distance).toBeGreaterThan(0.1);
  expect(cabinWalk.colliderCount).toBeGreaterThan(0);
  expect(cabinWalk.cameraInside).toBe(true);
  const cabinCamera = await page.evaluate(() => {
    const player = window.__voxcelPlayer.playerRoot.position;
    const camera = window.__voxcelPlayer.camera.position;
    const visual = window.__voxcelEnhancements.getState().elevatorVisual;
    return {
      distance: Math.hypot(camera.x - player.x, camera.z - player.z),
      cameraInside: visual?.cabinPlacement?.cameraInside,
    };
  });
  expect(cabinCamera.cameraInside).toBe(true);
  expect(cabinCamera.distance).toBeGreaterThan(4.6);
  expect(cabinCamera.distance).toBeLessThan(5.5);
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: "扉を閉じる" })).toBeVisible();
  const openDoorProgress = (await readElevatorState(page)).doorProgress;
  await page.getByRole("button", { name: "扉を閉じる" }).click();
  await expect.poll(async () => readElevatorState(page)).toMatchObject({
    mode: "inside-closed",
    doorsOpen: false,
    cabinEntered: true,
  });
  await expect(page.getByText("扉が閉まりました。行き先階を押してください")).toBeVisible();
  await expect.poll(async () => (await readElevatorState(page)).doorProgress).toBeLessThan(
    openDoorProgress - 0.2,
  );
  await expect.poll(async () => (await readElevatorState(page)).doorProgress).toBeLessThan(0.2);

  await page.evaluate(() => {
    const samples = [];
    const sampleDisplay = () => {
      const officeState = window.__voxcelOffice.getState();
      const visual = window.__voxcelEnhancements.getState().elevatorVisual;
      samples.push({
        mode: officeState.elevatorState.mode,
        displayFloor: visual?.displayFloor ?? null,
      });
    };
    sampleDisplay();
    window.__voxcelElevatorDisplayAudit = {
      samples,
      timer: window.setInterval(sampleDisplay, 16),
    };
  });

  await page.getByRole("button", { name: "25階", exact: true }).click();
  await expect.poll(async () => readElevatorState(page)).toMatchObject({
    mode: "moving",
    doorsOpen: false,
    cabinEntered: true,
    targetFloor: 25,
    displayGoal: 25,
    displayPhase: "moving",
  });
  await expect.poll(async () => page.evaluate(() => ({
    floor: window.__voxcelOffice.getState().currentFloor,
    mode: window.__voxcelOffice.getState().elevatorState.mode,
    displayGoal: window.__voxcelEnhancements.getState().elevatorVisual?.displayGoal,
    scene: window.__voxcelEnhancements.getState().elevatorSceneActive,
  })), { timeout: 15_000 }).toEqual({ floor: 25, mode: "arrived", displayGoal: 25, scene: true });
  const displayAudit = await page.evaluate(() => {
    const audit = window.__voxcelElevatorDisplayAudit;
    if (!audit) return [];
    window.clearInterval(audit.timer);
    const officeState = window.__voxcelOffice.getState();
    const visual = window.__voxcelEnhancements.getState().elevatorVisual;
    audit.samples.push({
      mode: officeState.elevatorState.mode,
      displayFloor: visual?.displayFloor ?? null,
    });
    return audit.samples;
  });
  expect(displayAudit.some(({ mode }) => mode === "moving")).toBe(true);
  expect(displayAudit.some(({ displayFloor }) => (
    Number.isFinite(displayFloor) && displayFloor > 1 && displayFloor < 25
  ))).toBe(true);

  await page.getByRole("button", { name: "扉が開く・降りる" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    scene: window.__voxcelEnhancements.getState().elevatorSceneActive,
    activeScene: window.__voxcelEnhancements.getState().activeScene,
  }))).toEqual({ scene: false, activeScene: "interior" });
  const visual = await page.evaluate(() => ({
    elevator: window.__voxcelEnhancements.getState().elevatorVisual,
    windows: window.__voxcelEnhancements.getState().officeWindows,
  }));
  expect(visual.elevator).toMatchObject({
    panelTexture: true,
    cabinPlacement: { lobbyIntrusion: false },
    displayFacingCorrect: true,
  });
  expect(visual.windows).toEqual({ count: 10, textured: true });
});

test("resets a waiting elevator after leaving and re-entering the office", async ({ page }) => {
  await startGame(page);
  const office = await page.evaluate(() => window.__voxcelOffice.getState());
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), office.entrance);
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().buildingId
  ))).toBe("office");

  const elevator = await page.evaluate(() => window.__voxcelOffice.getState().elevator);
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z - 1.8, Math.PI), elevator);
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "▲ 上へ呼ぶ" }).click();
  await page.getByRole("button", { name: "扉が開く・乗り込む" }).waitFor({ timeout: 2_000 });
  await page.keyboard.press("Escape");

  const exit = await page.evaluate(() => {
    const point = window.__voxcelPlayer.buildingViews.office.interiorPts
      .find(({ action }) => action === "exit").pos;
    return { x: point.x, z: point.z };
  });
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), exit);
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().activeScene
  ))).toBe("city");

  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), office.entrance);
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => ({
    building: window.__voxcelEnhancements.getState().buildingId,
    mode: window.__voxcelOffice.getState().elevatorState.mode,
    doorsOpen: window.__voxcelOffice.getState().elevatorState.doorsOpen,
    visualDoorsOpen: window.__voxcelEnhancements.getState().elevatorVisual?.doorsOpen,
  }))).toEqual({
    building: "office",
    mode: "idle",
    doorsOpen: false,
    visualDoorsOpen: false,
  });
});

test("cancels an in-flight ride when the office lifecycle ends", async ({ page }) => {
  await startGame(page);
  const office = await page.evaluate(() => window.__voxcelOffice.getState());
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z, Math.PI), office.entrance);
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().buildingId
  ))).toBe("office");

  const elevator = await page.evaluate(() => window.__voxcelOffice.getState().elevator);
  await page.evaluate(({ x, z }) => window.__voxcelTest.setPlayer(x, z - 1.8, Math.PI), elevator);
  await page.waitForTimeout(160);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "▲ 上へ呼ぶ" }).click();
  await page.getByRole("button", { name: "扉が開く・乗り込む" }).click({ timeout: 2_000 });
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().elevatorSceneActive
  ))).toBe(true);

  await page.getByRole("button", { name: "2階", exact: true }).click({ timeout: 2_000 });
  await expect.poll(async () => readElevatorState(page), { timeout: 5_000 }).toMatchObject({
    mode: "arrival-opening",
    currentFloor: 2,
    doorsOpen: true,
  });

  await page.evaluate(() => {
    window.__voxcelEnhancements.exitElevatorScene();
    window.__voxcelPlayer.exitBuilding();
  });
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().activeScene
  ))).toBe("city");
  await page.waitForTimeout(700);
  await expect.poll(async () => page.evaluate(() => {
    const officeState = window.__voxcelOffice.getState();
    const enhancements = window.__voxcelEnhancements.getState();
    return {
      mode: officeState.elevatorState.mode,
      pending: officeState.floorChangePending,
      doorsOpen: officeState.elevatorState.doorsOpen,
      scene: enhancements.elevatorSceneActive,
      insideOffice: officeState.insideOffice,
    };
  })).toEqual({
    mode: "idle",
    pending: false,
    doorsOpen: false,
    scene: false,
    insideOffice: false,
  });
});
