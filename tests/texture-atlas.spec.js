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

test.describe("shared texture atlases", () => {
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

  test("shares the detail atlas across characters and the dedicated wide atlas across exterior signs", async ({
    page,
    request,
  }) => {
    const detailResponse = await request.get("/images/voxcel-detail-atlas.jpg");
    expect(detailResponse.ok()).toBe(true);
    expect(detailResponse.headers()["content-type"]).toContain("image/jpeg");
    expect((await detailResponse.body()).byteLength).toBeLessThan(125_000);

    const signResponse = await request.get("/images/voxcel-sign-atlas.png");
    expect(signResponse.ok()).toBe(true);
    expect(signResponse.headers()["content-type"]).toContain("image/png");
    expect((await signResponse.body()).byteLength).toBeLessThan(300_000);

    await startGame(page);
    const result = await page.evaluate(() => {
      const atlasState = window.__voxcelTextureAtlas.getState();
      const signAtlasState = window.__voxcelSignAtlas.getState();
      const enhancementState = window.__voxcelEnhancements.getState();
      const characterState = window.__voxcelCharacters.getState();
      const buildingSigns = window.__voxcelPlayer.buildings.map((building) => {
        const sign = window.__voxcelPlayer.buildingViews[building.id].sign;
        const image = sign.material.map?.image;
        const rect = sign.geometry.userData.voxcelSignAtlasRect;
        const width = image?.naturalWidth || image?.width || 0;
        const height = image?.naturalHeight || image?.height || 0;
        const pixelWidth = rect ? (rect.u1 - rect.u0) * width : 0;
        const pixelHeight = rect ? Math.abs(rect.v1 - rect.v0) * height : 0;
        return {
          buildingId: building.id,
          name: sign.name,
          region: sign.userData.voxcelSignAtlasRegion,
          textureUuid: sign.material.map?.uuid,
          textureName: sign.material.map?.name,
          width,
          height,
          isCanvas: image instanceof HTMLCanvasElement,
          geometryRegion: sign.geometry.userData.voxcelSignAtlasRegion,
          pixelAspect: pixelHeight > 0 ? pixelWidth / pixelHeight : 0,
        };
      });
      const signs = buildingSigns.filter(({ region }) => Boolean(region));
      const playerTextures = new Set();
      window.__voxcelCharacters.playerRoot.traverse((object) => {
        if (object.isMesh && object.material?.map) playerTextures.add(object.material.map.uuid);
      });
      const crowdTextures = new Set(
        window.__voxcelCharacters.crowdRoot.children
          .map((mesh) => mesh.material.map?.uuid)
          .filter(Boolean),
      );
      const detailRequests = performance.getEntriesByType("resource")
        .filter((entry) => entry.name.includes("voxcel-detail-atlas.jpg"));
      const signRequests = performance.getEntriesByType("resource")
        .filter((entry) => entry.name.includes("voxcel-sign-atlas.png"));
      return {
        atlasState,
        signAtlasState,
        enhancementAtlas: enhancementState.atlas,
        enhancementSignAtlas: enhancementState.signAtlas,
        characterTextureUuid: characterState.resources.sharedAtlasTexture,
        signs,
        officeSign: buildingSigns.find(({ buildingId }) => buildingId === "office") || null,
        signTextureCount: new Set(signs.map(({ textureUuid }) => textureUuid)).size,
        playerTextures: [...playerTextures],
        crowdTextures: [...crowdTextures],
        detailRequestCount: detailRequests.length,
        signRequestCount: signRequests.length,
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
      sharedTexture: true,
    });
    expect(result.signAtlasState).toMatchObject({
      ready: true,
      loading: false,
      error: null,
      width: 1024,
      height: 512,
      regionCount: 12,
      textureUuid: expect.any(String),
    });
    expect(result.enhancementSignAtlas).toMatchObject({
      status: "ready",
      ready: true,
      error: null,
      width: 1024,
      height: 512,
      regionCount: 12,
      exteriorSignCount: 12,
      appliedSignCount: 12,
      sharedTexture: true,
    });
    expect(result.signs).toHaveLength(12);
    expect(result.officeSign).toMatchObject({ buildingId: "office" });
    expect(result.officeSign.region).toBeFalsy();
    expect(result.signs.map(({ region }) => region)).toEqual([
      "exterior_convenience",
      "exterior_cafe",
      "exterior_bakery",
      "exterior_restaurant",
      "exterior_clothing",
      "exterior_salon",
      "exterior_furniture",
      "exterior_book",
      "exterior_hospital",
      "exterior_bank",
      "exterior_home",
      "exterior_police",
    ]);
    expect(result.signTextureCount).toBe(1);
    expect(result.signs.every((sign) => (
      sign.name.startsWith("ExteriorSign:") &&
      sign.textureName === "VoxcelSignAtlas" &&
      sign.width === 1024 &&
      sign.height === 512 &&
      !sign.isCanvas &&
      sign.geometryRegion === sign.region &&
      sign.pixelAspect >= 6
    ))).toBe(true);
    expect(result.playerTextures).toEqual([result.atlasState.textureUuid]);
    expect(result.crowdTextures).toEqual([result.atlasState.textureUuid]);
    expect(result.characterTextureUuid).toBe(result.atlasState.textureUuid);
    expect(result.enhancementAtlas.textureUuid).toBe(result.atlasState.textureUuid);
    expect(result.enhancementSignAtlas.textureUuid).toBe(result.signAtlasState.textureUuid);
    expect(result.signAtlasState.textureUuid).not.toBe(result.atlasState.textureUuid);
    expect(result.signs.every(({ textureUuid }) => (
      textureUuid === result.signAtlasState.textureUuid
    ))).toBe(true);
    expect(result.detailRequestCount).toBe(1);
    expect(result.signRequestCount).toBe(1);
  });

  test("keeps the original canvas signs when only the dedicated sign atlas fails", async ({
    page,
  }) => {
    await page.route("**/images/voxcel-sign-atlas.png", (route) => route.abort("failed"));
    await startGame(page);

    const fallback = await page.evaluate(() => {
      const enhancementState = window.__voxcelEnhancements.getState();
      const detailState = window.__voxcelTextureAtlas.getState();
      const characterState = window.__voxcelCharacters.getState();
      const signs = window.__voxcelPlayer.buildings
        .filter((building) => building.id !== "office")
        .map((building) => {
          const sign = window.__voxcelPlayer.buildingViews[building.id].sign;
          return {
            textureName: sign.material.map?.name || "",
            textureUuid: sign.material.map?.uuid || null,
            isCanvas: sign.material.map?.image instanceof HTMLCanvasElement,
            region: sign.userData.voxcelSignAtlasRegion || null,
          };
        });
      return {
        signAtlas: enhancementState.signAtlas,
        detailAtlas: enhancementState.atlas,
        detailState,
        characterTextureUuid: characterState.resources.sharedAtlasTexture,
        signs,
      };
    });

    expect(fallback.signAtlas).toMatchObject({
      status: "fallback",
      ready: false,
      error: expect.stringContaining("Could not load Voxcel sign atlas"),
      width: 1024,
      height: 512,
      regionCount: 12,
      exteriorSignCount: 0,
      appliedSignCount: 0,
      textureUuid: null,
      sharedTexture: false,
    });
    expect(fallback.detailAtlas).toMatchObject({
      status: "ready",
      ready: true,
      sharedTexture: true,
      textureUuid: fallback.detailState.textureUuid,
    });
    expect(fallback.characterTextureUuid).toBe(fallback.detailState.textureUuid);
    expect(fallback.signs).toHaveLength(12);
    expect(fallback.signs.every(({ textureName, isCanvas, region }) => (
      textureName !== "VoxcelSignAtlas" && isCanvas && region === null
    ))).toBe(true);
    expect(new Set(fallback.signs.map(({ textureUuid }) => textureUuid)).size).toBe(12);
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
