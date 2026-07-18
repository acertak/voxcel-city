import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => {
      const characterState = window.__voxcelCharacters?.getState?.();
      return Boolean(
        window.__voxcelTest?.sample().started &&
        window.__voxcelCharacters?.ready &&
        characterState?.ready,
      );
    });
  }).toBe(true);
}

async function characterState(page) {
  return page.evaluate(() => window.__voxcelCharacters.getState());
}

async function setPlayer(page, x, z, yaw = Math.PI) {
  await page.evaluate(
    ({ x, z, yaw }) => window.__voxcelTest.setPlayer(x, z, yaw),
    { x, z, yaw },
  );
  await page.waitForTimeout(180);
}

async function enterHairStudio(page) {
  await setPlayer(page, 28, -25.8);
  await page.keyboard.press("e");
  await setPlayer(page, 28, -18);
  await page.keyboard.press("e");
  await expect(page.locator("#mC")).toContainText("Hair Studio");
}

async function enterClothingShop(page) {
  await setPlayer(page, 28, -49.8);
  await page.keyboard.press("e");
  await setPlayer(page, 28, -38.5);
  await page.keyboard.press("e");
  await expect(page.locator("#mC")).toContainText("👗 服");
}

test.describe("modular characters", () => {
  test("loads the versioned geometry catalog and mounts one complete player", async ({ page }) => {
    await startGame(page);
    const state = await characterState(page);

    expect(state.error).toBeNull();
    expect(state.hookRegistered).toBe(true);
    expect(state.catalog).toEqual({
      schema: 1,
      geometryCount: 44,
      triangleCount: 4444,
      variantCounts: {
        top_detail: 10,
        face: 3,
        hair: 5,
        hips: 4,
        shoe: 5,
        top: 10,
      },
    });

    expect(state.player).toMatchObject({
      mounted: true,
      attached: true,
      rootCount: 1,
      visibleMeshCount: 19,
      appearance: {
        hairId: 0,
        hairColorId: 0,
        outfitId: 0,
        shoeId: 0,
        ownedShoes: [0],
      },
      partCounts: {
        top: 1,
        top_detail: 1,
        hips: 1,
        neck: 1,
        head: 1,
        face: 1,
        hair: 1,
        upper_arm: 2,
        forearm: 2,
        hand: 2,
        thigh: 2,
        shin: 2,
        shoe: 2,
      },
    });
    expect(state.player.visibleParts).toEqual(expect.arrayContaining([
      "GEO_top_0",
      "GEO_detail_0",
      "GEO_hips_0",
      "GEO_head",
      "GEO_face_0",
      "GEO_hair_0",
      "GEO_shoe_0",
    ]));
    expect(state.player.visibleParts.filter((name) => name === "GEO_shoe_0")).toHaveLength(2);

    const characterRequests = await page.evaluate(() => (
      performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /modular-character|model-walk-run|esm\.sh/.test(name))
    ));
    expect(characterRequests.filter((name) => name.includes("modular-character-parts.glb"))).toHaveLength(1);
    expect(characterRequests.some((name) => name.includes("model-walk-run.glb"))).toBe(false);
    expect(characterRequests.some((name) => name.includes("esm.sh"))).toBe(false);

    const root = await page.evaluate(() => ({
      name: window.__voxcelCharacters.playerRoot.name,
      isCharacterRoot: window.__voxcelCharacters.playerRoot.userData.voxcelCharacterRoot,
      attachedToPlayer: (
        window.__voxcelCharacters.playerRoot.parent === window.__voxcelPlayer.playerRoot
      ),
      characterRootCount: window.__voxcelPlayer.playerRoot.children.filter(
        (child) => child.userData?.voxcelCharacterRoot,
      ).length,
    }));
    expect(root).toEqual({
      name: "VoxcelModularPlayer",
      isCharacterRoot: true,
      attachedToPlayer: true,
      characterRootCount: 1,
    });
  });

  test("renders eighteen varied NPCs through shared InstancedMesh buckets", async ({ page }) => {
    await startGame(page);
    const state = await characterState(page);

    expect(state.npcs).toMatchObject({
      count: 18,
      visibleCount: 18,
      legacyVisualsHidden: true,
      distinctSignatures: 18,
      variantCounts: {
        hair: 5,
        face: 3,
        outfit: 10,
        shoe: 5,
      },
      instancedBucketCount: 44,
      renderedSlots: 342,
    });
    expect(state.npcs.appearances).toHaveLength(18);
    expect(state.npcs.appearanceSignatures).toHaveLength(18);
    expect(new Set(state.npcs.appearanceSignatures)).toHaveProperty("size", 18);
    for (const [index, appearance] of state.npcs.appearances.entries()) {
      expect(appearance.id).toBe(index);
      expect(appearance.hair).toBeGreaterThanOrEqual(0);
      expect(appearance.hair).toBeLessThan(5);
      expect(appearance.face).toBeGreaterThanOrEqual(0);
      expect(appearance.face).toBeLessThan(3);
      expect(appearance.outfit).toBeGreaterThanOrEqual(0);
      expect(appearance.outfit).toBeLessThan(10);
      expect(appearance.shoe).toBeGreaterThanOrEqual(0);
      expect(appearance.shoe).toBeLessThan(5);
    }

    expect(state.resources).toEqual({
      catalogGeometries: 44,
      playerGeometries: 44,
      npcGeometries: 44,
      sharedGeometryCount: 44,
      npcMaterials: 1,
      npcTextures: 0,
      npcMeshSlots: 342,
      drawCallUpperBound: 44,
    });

    const crowd = await page.evaluate(() => {
      const root = window.__voxcelCharacters.crowdRoot;
      const meshes = root.children;
      return {
        name: root.name,
        isCrowdRoot: root.userData.voxcelCrowdRoot,
        attachedToCity: root.parent === window.__voxcelEnhancements.cityScene,
        childCount: meshes.length,
        instancedMeshCount: meshes.filter((mesh) => mesh.isInstancedMesh).length,
        instanceCount: meshes.reduce((count, mesh) => count + mesh.count, 0),
        geometryCount: new Set(meshes.map((mesh) => mesh.geometry.uuid)).size,
        materialCount: new Set(meshes.map((mesh) => mesh.material.uuid)).size,
      };
    });
    expect(crowd).toEqual({
      name: "VoxcelModularCrowd",
      isCrowdRoot: true,
      attachedToCity: true,
      childCount: 44,
      instancedMeshCount: 44,
      instanceCount: 342,
      geometryCount: 44,
      materialCount: 1,
    });
  });

  test("shows shoe controls in the clothing shop and equips both modular shoes", async ({ page }) => {
    await startGame(page);
    await enterClothingShop(page);

    const shoeSection = page.locator("#mC [data-voxcel-shoes]");
    const shoeOptions = page.locator('#mC [data-option-kind="shoe"]');
    const clothingOptions = page.locator('#mC .ic[onclick^="W._cloth("]');
    await expect(page.locator("#mC")).toHaveAttribute("role", "dialog");
    await expect(page.locator("#mC")).toHaveAttribute("aria-modal", "true");
    await expect(clothingOptions).toHaveCount(10);
    expect(await clothingOptions.evaluateAll((options) => options.every((option) => (
      option.getAttribute("role") === "button" && option.tabIndex === 0
    )))).toBe(true);
    await expect(shoeSection).toHaveCount(1);
    await expect(shoeSection).toContainText("👟 靴");
    await expect(shoeOptions).toHaveCount(5);
    expect(await shoeOptions.evaluateAll((options) => (
      options.map((option) => option.dataset.optionId)
    ))).toEqual(["0", "1", "2", "3", "4"]);

    const runner = page.locator(
      '#mC [data-option-kind="shoe"][data-option-id="1"]',
    );
    await expect(runner).toHaveAttribute("role", "button");
    await expect(runner).toHaveAttribute("aria-pressed", "false");
    await expect(runner).toContainText("ランナー");
    await runner.click();
    await expect.poll(async () => (
      (await characterState(page)).player.appearance.shoeId
    )).toBe(1);
    await expect(runner).toHaveClass(/sel/);
    await expect(runner).toHaveAttribute("aria-pressed", "true");

    const equipped = await characterState(page);
    expect(equipped.player.appearance.ownedShoes).toEqual([0, 1]);
    expect(equipped.player.partCounts.shoe).toBe(2);
    expect(equipped.player.visibleParts.filter((name) => name === "GEO_shoe_1")).toHaveLength(2);
    expect(equipped.player.rootCount).toBe(1);
  });

  test("does not show shoe controls in the hair studio", async ({ page }) => {
    await startGame(page);
    await enterHairStudio(page);

    await expect(page.locator("#mC [data-voxcel-shoes]")).toHaveCount(0);
    await expect(page.locator('#mC [data-option-kind="shoe"]')).toHaveCount(0);
    await expect(page.locator("#mC")).toContainText("髪型");
    await expect(page.locator("#mC")).toContainText("髪色");
  });
});
