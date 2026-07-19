import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => {
    const enhancements = window.__voxcelEnhancements?.getState?.();
    const characters = window.__voxcelCharacters?.getState?.();
    return Boolean(enhancements?.ready && enhancements.atlas?.ready && characters?.ready);
  })).toBe(true);
  await page.waitForTimeout(220);
}

async function setPlayer(page, x, z, yaw = Math.PI) {
  await page.evaluate(
    ({ x, z, yaw }) => window.__voxcelTest.setPlayer(x, z, yaw),
    { x, z, yaw },
  );
  await page.waitForTimeout(140);
}

async function enterBuilding(page, id) {
  const building = await page.evaluate((buildingId) => {
    const match = window.__voxcelPlayer.buildings.find(({ id }) => id === buildingId);
    return { id: match.id, x: match.x, z: match.z, width: match.w, depth: match.d };
  }, id);
  await setPlayer(page, building.x, building.z - building.depth / 2 - 1.8);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().buildingId
  ))).toBe(id);
  await page.waitForTimeout(120);
  return building;
}

async function exitBuilding(page, building) {
  const room = await page.evaluate(() => (
    window.__voxcelEnhancements.getState().roomDimensions
  ));
  await setPlayer(page, building.x, building.z - room.depth / 2 + 1);
  await page.keyboard.press("e");
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelEnhancements.getState().activeScene
  ))).toBe("city");
}

test.describe("shared detail texture atlas", () => {
  test("keeps solid-color characters playable after an image failure and allows a retry", async ({
    page,
  }) => {
    await page.route("**/images/voxcel-detail-atlas.jpg", (route) => route.abort("failed"));
    await page.goto("/");
    await page.getByRole("button", { name: "ゲーム開始" }).click();
    await expect.poll(async () => page.evaluate(() => Boolean(
      window.__voxcelEnhancements?.ready && window.__voxcelCharacters?.ready,
    ))).toBe(true);

    const fallback = await page.evaluate(() => ({
      atlas: window.__voxcelEnhancements.getState().atlas,
      characters: window.__voxcelCharacters.getState(),
      mappedPlayerMaterials: (() => {
        const mapped = new Set();
        window.__voxcelCharacters.playerRoot.traverse((object) => {
          if (object.isMesh && object.material.map) mapped.add(object.material.map.uuid);
        });
        return mapped.size;
      })(),
    }));
    expect(fallback.atlas).toMatchObject({
      status: "fallback",
      ready: false,
      sharedTexture: false,
      textureUuid: null,
    });
    expect(fallback.atlas.error).toContain("Could not load Voxcel detail atlas");
    expect(fallback.characters).toMatchObject({
      ready: true,
      error: null,
      atlas: {
        ready: false,
        error: expect.stringContaining("Could not load Voxcel detail atlas"),
        textureUuid: null,
      },
      resources: {
        npcTextures: 0,
        sharedAtlasTexture: null,
      },
    });
    expect(fallback.mappedPlayerMaterials).toBe(0);

    await page.unroute("**/images/voxcel-detail-atlas.jpg");
    const retried = await page.evaluate(async () => {
      const referenceTexture = window.__voxcelPlayer.buildingViews.conv.sign.material.map;
      let prototype = Object.getPrototypeOf(referenceTexture);
      while (prototype && !Object.prototype.hasOwnProperty.call(prototype, "transformUv")) {
        prototype = Object.getPrototypeOf(prototype);
      }
      const texture = await window.__voxcelTextureAtlas.getTexture({
        TextureConstructor: prototype.constructor,
        referenceTexture,
        renderer: window.__voxcelPlayer.renderer,
      });
      return {
        textureName: texture.name,
        state: window.__voxcelTextureAtlas.getState(),
      };
    });
    expect(retried).toMatchObject({
      textureName: "VoxcelDetailAtlas",
      state: {
        ready: true,
        loading: false,
        error: null,
        width: 512,
        height: 512,
        tileCount: 64,
        textureUuid: expect.any(String),
      },
    });
  });

  test("serves one compact atlas and shares it across characters and all exterior signs", async ({
    page,
    request,
  }) => {
    const response = await request.get("/images/voxcel-detail-atlas.jpg");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/jpeg");
    expect((await response.body()).byteLength).toBeLessThan(125_000);

    await startGame(page);
    const result = await page.evaluate(() => {
      const atlasState = window.__voxcelTextureAtlas.getState();
      const enhancementState = window.__voxcelEnhancements.getState();
      const characterState = window.__voxcelCharacters.getState();
      const signs = window.__voxcelPlayer.buildings.map((building) => {
        const sign = window.__voxcelPlayer.buildingViews[building.id].sign;
        const image = sign.material.map?.image;
        return {
          buildingId: building.id,
          name: sign.name,
          tile: sign.userData.voxcelAtlasTile,
          textureUuid: sign.material.map?.uuid,
          textureName: sign.material.map?.name,
          width: image?.naturalWidth || image?.width || 0,
          height: image?.naturalHeight || image?.height || 0,
          isCanvas: image instanceof HTMLCanvasElement,
          geometryTile: sign.geometry.userData.voxcelAtlasTile,
        };
      });
      const playerTextures = new Set();
      window.__voxcelCharacters.playerRoot.traverse((object) => {
        if (object.isMesh && object.material?.map) playerTextures.add(object.material.map.uuid);
      });
      const crowdTextures = new Set(
        window.__voxcelCharacters.crowdRoot.children
          .map((mesh) => mesh.material.map?.uuid)
          .filter(Boolean),
      );
      const requests = performance.getEntriesByType("resource")
        .filter((entry) => entry.name.includes("voxcel-detail-atlas.jpg"));
      return {
        atlasState,
        enhancementAtlas: enhancementState.atlas,
        characterTextureUuid: characterState.resources.sharedAtlasTexture,
        signs,
        signTextureCount: new Set(signs.map(({ textureUuid }) => textureUuid)).size,
        playerTextures: [...playerTextures],
        crowdTextures: [...crowdTextures],
        atlasRequestCount: requests.length,
      };
    });

    expect(result.atlasState).toMatchObject({
      ready: true,
      loading: false,
      error: null,
      width: 512,
      height: 512,
      tileCount: 64,
      textureUuid: expect.any(String),
    });
    expect(result.enhancementAtlas).toMatchObject({
      status: "ready",
      ready: true,
      error: null,
      tileCount: 64,
      exteriorSignCount: 12,
      sharedTexture: true,
    });
    expect(result.signs).toHaveLength(12);
    expect(result.signs.map(({ tile }) => tile)).toEqual([
      "sign_convenience",
      "sign_cafe",
      "sign_bakery",
      "sign_restaurant",
      "sign_clothing",
      "sign_salon",
      "sign_furniture",
      "sign_book",
      "sign_hospital",
      "sign_bank",
      "sign_home",
      "sign_police",
    ]);
    expect(result.signTextureCount).toBe(1);
    expect(result.signs.every((sign) => (
      sign.name.startsWith("ExteriorSign:") &&
      sign.textureName === "VoxcelDetailAtlas" &&
      sign.width === 512 &&
      sign.height === 512 &&
      !sign.isCanvas &&
      sign.geometryTile === sign.tile
    ))).toBe(true);
    expect(result.playerTextures).toEqual([result.atlasState.textureUuid]);
    expect(result.crowdTextures).toEqual([result.atlasState.textureUuid]);
    expect(result.characterTextureUuid).toBe(result.atlasState.textureUuid);
    expect(result.enhancementAtlas.textureUuid).toBe(result.atlasState.textureUuid);
    expect(result.atlasRequestCount).toBe(1);
  });

  test("replaces repeated bookstore, product, fashion, and salon boxes without leaking textures", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await startGame(page);
    const atlasUuid = await page.evaluate(() => (
      window.__voxcelTextureAtlas.getState().textureUuid
    ));
    const initialTextureCount = await page.evaluate(() => (
      window.__voxcelPlayer.renderer.info.memory.textures
    ));

    const book = await enterBuilding(page, "book");
    const bookstore = await page.evaluate(() => {
      const state = window.__voxcelEnhancements.getState();
      const names = [];
      const atlasMeshes = [];
      window.__voxcelEnhancements.getActiveScene().traverse((object) => {
        names.push(object.name);
        if (object.isMesh && object.userData.voxcelAtlasTile) {
          atlasMeshes.push({
            name: object.name,
            tile: object.userData.voxcelAtlasTile,
            textureUuid: object.material.map?.uuid,
          });
        }
      });
      return {
        atlas: state.atlas,
        stripCount: names.filter((name) => name.includes(":book-strip:")).length,
        legacyBookCount: names.filter((name) => (
          name.startsWith("Bookcase:") && name.includes(":book:")
        )).length,
        newReleaseCount: names.filter((name) => name.startsWith("NewReleases:book:")).length,
        atlasMeshes,
      };
    });
    expect(bookstore.atlas).toMatchObject({
      bookStripCount: 28,
      productStripCount: 0,
      garmentTextureCount: 0,
      interiorVisualCount: 37,
      textureUuid: atlasUuid,
    });
    expect(bookstore.stripCount).toBe(28);
    expect(bookstore.legacyBookCount).toBe(0);
    expect(bookstore.newReleaseCount).toBe(8);
    expect(bookstore.atlasMeshes).toHaveLength(37);
    expect(bookstore.atlasMeshes.every(({ textureUuid }) => textureUuid === atlasUuid)).toBe(true);
    await exitBuilding(page, book);

    const convenience = await enterBuilding(page, "conv");
    const products = await page.evaluate(() => {
      const state = window.__voxcelEnhancements.getState();
      const names = [];
      const atlasTextures = new Set();
      window.__voxcelEnhancements.getActiveScene().traverse((object) => {
        names.push(object.name);
        if (object.isMesh && object.userData.voxcelAtlasTile) {
          atlasTextures.add(object.material.map?.uuid);
        }
      });
      return {
        atlas: state.atlas,
        productStrips: names.filter((name) => name.includes(":product-strip:")).length,
        legacyItems: names.filter((name) => (
          name.includes(":item:") || name.startsWith("RefrigeratorWall:drink:")
        )).length,
        atlasTextures: [...atlasTextures],
      };
    });
    expect(products.atlas).toMatchObject({
      bookStripCount: 0,
      productStripCount: 15,
      garmentTextureCount: 0,
      interiorVisualCount: 15,
      textureUuid: atlasUuid,
    });
    expect(products.productStrips).toBe(15);
    expect(products.legacyItems).toBe(0);
    expect(products.atlasTextures).toEqual([atlasUuid]);
    await exitBuilding(page, convenience);

    const clothing = await enterBuilding(page, "cloth");
    const fashion = await page.evaluate(() => {
      const state = window.__voxcelEnhancements.getState();
      const garmentColors = new Set();
      const atlasTextures = new Set();
      window.__voxcelEnhancements.getActiveScene().traverse((object) => {
        if (!object.isMesh || !object.userData.voxcelAtlasTile) return;
        atlasTextures.add(object.material.map?.uuid);
        if (object.name.includes(":garment:") || object.name.includes(":torso")) {
          garmentColors.add(object.material.color.getHex());
        }
      });
      return {
        atlas: state.atlas,
        garmentColors: [...garmentColors],
        atlasTextures: [...atlasTextures],
      };
    });
    expect(fashion.atlas).toMatchObject({
      bookStripCount: 0,
      productStripCount: 0,
      garmentTextureCount: 43,
      interiorVisualCount: 44,
      textureUuid: atlasUuid,
    });
    expect(fashion.garmentColors.length).toBeGreaterThanOrEqual(4);
    expect(fashion.atlasTextures).toEqual([atlasUuid]);
    await exitBuilding(page, clothing);

    const salon = await enterBuilding(page, "salon");
    const hairStudio = await page.evaluate(() => {
      const state = window.__voxcelEnhancements.getState();
      const cards = [];
      window.__voxcelEnhancements.getActiveScene().traverse((object) => {
        if (object.name.includes(":style-card")) cards.push(object.userData.voxcelAtlasTile);
      });
      return { atlas: state.atlas, cards };
    });
    expect(hairStudio.atlas).toMatchObject({
      interiorVisualCount: 5,
      textureUuid: atlasUuid,
    });
    expect(hairStudio.cards).toEqual([
      "hair_straight",
      "hair_wavy",
      "hair_curly",
      "hair_braid",
    ]);
    await exitBuilding(page, salon);

    const afterWarmup = await page.evaluate(() => ({
      atlas: window.__voxcelEnhancements.getState().atlas,
      textureCount: window.__voxcelPlayer.renderer.info.memory.textures,
    }));
    expect(afterWarmup.atlas).toMatchObject({
      sharedTexture: true,
      textureUuid: atlasUuid,
      interiorVisualCount: 0,
      bookStripCount: 0,
      productStripCount: 0,
      garmentTextureCount: 0,
    });

    // Visiting a building for the first time uploads its legacy native textures.
    // A second visit must reuse those textures and the one shared atlas instead of growing again.
    const repeatedSalon = await enterBuilding(page, "salon");
    await exitBuilding(page, repeatedSalon);
    await page.waitForTimeout(220);
    const afterRepeat = await page.evaluate(() => ({
      atlasUuid: window.__voxcelTextureAtlas.getState().textureUuid,
      textureCount: window.__voxcelPlayer.renderer.info.memory.textures,
      atlasRequests: performance.getEntriesByType("resource")
        .filter((entry) => entry.name.includes("voxcel-detail-atlas.jpg")).length,
    }));
    expect(afterRepeat.atlasUuid).toBe(atlasUuid);
    expect(afterRepeat.atlasRequests).toBe(1);
    expect(afterRepeat.textureCount).toBeLessThanOrEqual(afterWarmup.textureCount + 1);
    expect(afterRepeat.textureCount).toBeGreaterThanOrEqual(initialTextureCount);
  });
});
