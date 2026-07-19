import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    office: window.__voxcelOffice?.ready ?? false,
    enhancements: window.__voxcelEnhancements?.getState?.().ready ?? false,
  }))).toEqual({ office: true, enhancements: true });
}

test("operates the office elevator with call, doors, destination, and animated display", async ({ page }) => {
  test.setTimeout(45_000);
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

  await page.getByRole("button", { name: "▲ 上へ呼ぶ" }).click();
  await expect(page.getByText(/呼び出し中/)).toBeVisible();
  await expect(page.getByRole("button", { name: "扉が開く・乗り込む" })).toBeVisible({ timeout: 2_000 });
  await page.getByRole("button", { name: "扉が開く・乗り込む" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    scene: window.__voxcelEnhancements.getState().elevatorSceneActive,
    activeScene: window.__voxcelEnhancements.getState().activeScene,
  }))).toEqual({ scene: true, activeScene: "elevator" });
  expect(await page.evaluate(() => {
    const player = window.__voxcelPlayer.playerRoot.position;
    const camera = window.__voxcelPlayer.camera.position;
    return Math.hypot(camera.x - player.x, camera.z - player.z);
  })).toBeLessThan(3);
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: "扉を閉じる" })).toBeVisible();
  await page.getByRole("button", { name: "扉を閉じる" }).click();
  await expect(page.getByText(/行き先階を押してください/)).toBeVisible();

  await page.getByRole("button", { name: "25階", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => ({
    floor: window.__voxcelOffice.getState().currentFloor,
    mode: window.__voxcelOffice.getState().elevatorState.mode,
    displayGoal: window.__voxcelEnhancements.getState().elevatorVisual?.displayGoal,
    scene: window.__voxcelEnhancements.getState().elevatorSceneActive,
  }))).toEqual({ floor: 25, mode: "arrived", displayGoal: 25, scene: true });
  await page.getByRole("button", { name: "扉が開く・降りる" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    scene: window.__voxcelEnhancements.getState().elevatorSceneActive,
    activeScene: window.__voxcelEnhancements.getState().activeScene,
  }))).toEqual({ scene: false, activeScene: "interior" });
  const visual = await page.evaluate(() => ({
    elevator: window.__voxcelEnhancements.getState().elevatorVisual,
    windows: window.__voxcelEnhancements.getState().officeWindows,
  }));
  expect(visual.elevator.panelTexture).toBe(true);
  expect(visual.windows).toEqual({ count: 10, textured: true });
});
