import { expect, test } from "playwright/test";

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => (
    window.__voxcelVehicles?.getState?.().ready ?? false
  ))).toBe(true);
  await page.waitForTimeout(180);
}

test.describe("vehicle detail system", () => {
  test("loads one 4x4 vehicle atlas shared by every detailed car and bus", async ({
    page,
    request,
  }) => {
    const response = await request.get("/images/voxcel-vehicle-atlas.png");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(1_000);

    await startGame(page);
    const result = await page.evaluate(() => {
      const atlas = window.__voxcelVehicleAtlas;
      const state = window.__voxcelVehicles.getState();
      const tiles = Object.values(atlas.tiles).map((tile) => ({
        ...tile,
        rect: atlas.getUvRect(tile.name),
      }));
      const textureUuids = new Set();
      const details = window.__voxcelPlayer.vehicles.map((vehicle) => {
        const body = vehicle.m.children.find((child) => (
          child.isMesh && child.geometry?.type === "BoxGeometry" && child.material?.color
        ));
        const detailRoot = vehicle.m.children.find(
          (child) => child.userData?.voxcelVehicleDetailRoot,
        );
        const meshes = [];
        detailRoot?.traverse((object) => {
          if (!object.isMesh) return;
          meshes.push(object);
          if (object.material?.map?.uuid) textureUuids.add(object.material.map.uuid);
        });
        return {
          type: vehicle.type,
          rootTagged: vehicle.m.userData.voxcelVehicleRoot,
          rootId: vehicle.m.userData.voxcelVehicleId,
          detailRootTagged: detailRoot?.userData.voxcelVehicleDetailRoot,
          detailRootCollisionMode: detailRoot?.userData.collisionMode,
          meshCount: meshes.length,
          allCollisionless: meshes.every((mesh) => mesh.userData.collisionMode === "none"),
          allTagged: meshes.every((mesh) => (
            typeof mesh.userData.voxcelVehicleRole === "string" &&
            typeof mesh.userData.voxcelVehiclePartId === "string" &&
            mesh.userData.voxcelVehicleId === vehicle.m.userData.voxcelVehicleId
          )),
          uniquePartIds: new Set(
            meshes.map((mesh) => mesh.userData.voxcelVehiclePartId),
          ).size,
          bodyColor: body?.material?.color?.getHex?.() ?? null,
          paintedPanelColors: meshes
            .filter((mesh) => ["door", "hood", "trunk"].includes(
              mesh.userData.voxcelVehicleRole,
            ))
            .map((mesh) => mesh.material?.color?.getHex?.() ?? null),
          allUseAtlas: meshes.every((mesh) => (
            mesh.material?.map?.uuid === state.atlas.textureUuid &&
            mesh.geometry?.userData?.voxcelVehicleAtlasTile ===
              mesh.userData.voxcelVehicleAtlasTile
          )),
          roles: [...new Set(meshes.map((mesh) => mesh.userData.voxcelVehicleRole))],
        };
      });
      return {
        state,
        atlasState: atlas.getState(),
        tileNames: tiles.map(({ name }) => name),
        tileIndexes: tiles.map(({ index }) => index),
        rectsInsideAtlas: tiles.every(({ rect }) => (
          rect.u0 >= 0 && rect.u0 < rect.u1 && rect.u1 <= 1 &&
          rect.v0 >= 0 && rect.v0 < rect.v1 && rect.v1 <= 1
        )),
        textureUuids: [...textureUuids],
        details,
      };
    });

    expect(result.atlasState).toMatchObject({
      ready: true,
      loading: false,
      error: null,
      width: 1024,
      height: 1024,
      tileCount: 16,
      textureUuid: expect.any(String),
    });
    expect(result.tileNames).toEqual([
      "windshield", "side_window", "grille", "rear_light",
      "headlight", "tire_tread", "wheel_face", "interior",
      "car_door", "hood", "trunk", "bumper",
      "bus_windows", "bus_door", "taxi_livery", "service_livery",
    ]);
    expect(result.tileIndexes).toEqual([...Array(16).keys()]);
    expect(result.rectsInsideAtlas).toBe(true);
    expect(result.state).toMatchObject({
      ready: true,
      status: "ready",
      busCount: 2,
      detailedVehicleCount: result.state.vehicleCount,
      detailRootCount: result.state.vehicleCount,
      taggedRootCount: result.state.vehicleCount,
      allDetailsCollisionless: true,
      originalBodiesPreserved: true,
      geometryReuse: true,
      atlas: {
        status: "ready",
        ready: true,
        width: 1024,
        height: 1024,
        gridSize: 4,
        tileCount: 16,
        textureUuid: result.atlasState.textureUuid,
        detailTextureCount: 1,
        sharedTexture: true,
      },
    });
    expect(result.state.carCount).toBe(result.state.vehicleCount - 2);
    expect(result.state.vehicleCount).toBeGreaterThan(10);
    expect(result.state.sharedGeometryCount).toBeLessThan(result.state.detailMeshCount / 2);
    expect(result.textureUuids).toEqual([result.atlasState.textureUuid]);
    expect(result.details.every((vehicle) => (
      vehicle.rootTagged === true &&
      typeof vehicle.rootId === "string" &&
      vehicle.detailRootTagged === true &&
      vehicle.detailRootCollisionMode === "none" &&
      vehicle.meshCount > 20 &&
      vehicle.uniquePartIds === vehicle.meshCount &&
      vehicle.allCollisionless &&
      vehicle.allTagged &&
      vehicle.allUseAtlas
    ))).toBe(true);

    const car = result.details.find(({ type }) => type === "car");
    const bus = result.details.find(({ type }) => type === "bus");
    expect(result.details.filter(({ type }) => type === "car").every((vehicle) => (
      vehicle.paintedPanelColors.length === 6 &&
      vehicle.paintedPanelColors.every((color) => color === vehicle.bodyColor)
    ))).toBe(true);
    expect(car.roles).toEqual(expect.arrayContaining([
      "windshield",
      "rear-window",
      "side-window",
      "grille",
      "headlight",
      "rear-light",
      "bumper",
      "mirror",
      "door",
      "hood",
      "trunk",
      "wheel-tread",
      "wheel-face",
    ]));
    expect(bus.roles).toEqual(expect.arrayContaining([
      "windshield",
      "rear-window",
      "bus-window",
      "bus-door",
      "grille",
      "headlight",
      "rear-light",
      "bumper",
      "mirror",
      "wheel-tread",
      "wheel-face",
    ]));
  });

  test("keeps the original body geometry and mounts details on the driven root", async ({ page }) => {
    await startGame(page);
    const bodies = await page.evaluate(() => window.__voxcelPlayer.vehicles.map((vehicle) => {
      const body = vehicle.m.children.find((child) => (
        child.isMesh && child.geometry?.type === "BoxGeometry" && child.material?.color
      ));
      const detailRoot = vehicle.m.children.find(
        (child) => child.userData?.voxcelVehicleDetailRoot,
      );
      const parameters = body.geometry.parameters;
      return {
        type: vehicle.type,
        dimensions: [parameters.width, parameters.height, parameters.depth],
        color: body.material.color.getHex(),
        rootScale: vehicle.m.scale.toArray(),
        detailLocalPosition: detailRoot.position.toArray(),
        detailLocalRotation: detailRoot.rotation.toArray().slice(0, 3),
        detailParentIsVehicle: detailRoot.parent === vehicle.m,
      };
    }));

    expect(bodies.filter(({ type }) => type === "car").every((body) => (
      JSON.stringify(body.dimensions) === JSON.stringify([2.2, 1.12, 4.6]) &&
      Number.isInteger(body.color)
    ))).toBe(true);
    expect(bodies.filter(({ type }) => type === "bus").every((body) => (
      JSON.stringify(body.dimensions) === JSON.stringify([2.6, 2.35, 10.2]) &&
      Number.isInteger(body.color)
    ))).toBe(true);
    expect(bodies.every((body) => (
      JSON.stringify(body.rootScale) === JSON.stringify([1, 1, 1]) &&
      JSON.stringify(body.detailLocalPosition) === JSON.stringify([0, 0, 0]) &&
      JSON.stringify(body.detailLocalRotation) === JSON.stringify([0, 0, 0]) &&
      body.detailParentIsVehicle
    ))).toBe(true);

    const before = await page.evaluate(() => {
      window.__voxcelTest.attachPlayerVehicle();
      const vehicle = window.__voxcelPlayer.state.vehicle;
      return {
        id: vehicle.m.userData.voxcelVehicleId,
        x: vehicle.m.position.x,
        z: vehicle.m.position.z,
        manual: vehicle.manual,
      };
    });
    expect(before.manual).toBe(true);

    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(650);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(100);

    const after = await page.evaluate(() => {
      const vehicle = window.__voxcelPlayer.state.vehicle;
      const detailRoot = vehicle.m.children.find(
        (child) => child.userData?.voxcelVehicleDetailRoot,
      );
      return {
        id: vehicle.m.userData.voxcelVehicleId,
        x: vehicle.m.position.x,
        z: vehicle.m.position.z,
        manual: vehicle.manual,
        driveSpeed: vehicle.driveSpeed,
        detailsStillMounted: detailRoot?.parent === vehicle.m,
        vehicleState: window.__voxcelVehicles.getState(),
      };
    });
    expect(after.id).toBe(before.id);
    expect(after.manual).toBe(true);
    expect(after.driveSpeed).toBeGreaterThan(0);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.05);
    expect(after.detailsStillMounted).toBe(true);
    expect(after.vehicleState.originalBodiesPreserved).toBe(true);
    expect(after.vehicleState.atlas.sharedTexture).toBe(true);
  });

  test("details police cars that are dispatched after startup", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.__voxcelTest.addCrime(82, "vehicle detail QA"));
    await expect.poll(async () => page.evaluate(() => {
      const policeCars = [];
      window.__voxcelPlayer.scene.traverse((object) => {
        if (Array.isArray(object.userData?.sirenMats)) policeCars.push(object);
      });
      const detailed = policeCars.filter((car) => car.children.some(
        (child) => child.userData?.voxcelVehicleDetailRoot,
      )).length;
      const dynamicVehicleCount = window.__voxcelVehicles.getState().dynamicVehicleCount;
      return policeCars.length > 0 &&
        detailed === policeCars.length &&
        dynamicVehicleCount === policeCars.length;
    })).toBe(true);

    const police = await page.evaluate(() => {
      let car = null;
      window.__voxcelPlayer.scene.traverse((object) => {
        if (!car && Array.isArray(object.userData?.sirenMats)) car = object;
      });
      const detailRoot = car.children.find(
        (child) => child.userData?.voxcelVehicleDetailRoot,
      );
      const meshes = [];
      detailRoot.traverse((object) => {
        if (object.isMesh) meshes.push(object);
      });
      return {
        rootTagged: car.userData.voxcelVehicleRoot,
        vehicleType: car.userData.voxcelVehicleType,
        keepsSirens: car.userData.sirenMats.length === 2,
        detailCount: meshes.length,
        allMapped: meshes.every((mesh) => (
          mesh.material?.map?.uuid === window.__voxcelVehicles.getState().atlas.textureUuid
        )),
        allCollisionless: meshes.every((mesh) => mesh.userData.collisionMode === "none"),
      };
    });
    expect(police).toEqual({
      rootTagged: true,
      vehicleType: "car",
      keepsSirens: true,
      detailCount: 29,
      allMapped: true,
      allCollisionless: true,
    });

    await page.evaluate(() => window.__voxcelTest.setWanted(0, "vehicle detail QA complete"));
    await expect.poll(async () => page.evaluate(() => (
      window.__voxcelVehicles.getState().dynamicVehicleCount
    ))).toBe(0);
  });

  test("keeps detailed vehicles driveable when the vehicle atlas cannot load", async ({ page }) => {
    await page.route("**/images/voxcel-vehicle-atlas.png", (route) => route.abort("failed"));
    await startGame(page);

    const fallback = await page.evaluate(() => {
      const state = window.__voxcelVehicles.getState();
      const meshes = [];
      for (const vehicle of window.__voxcelPlayer.vehicles) {
        vehicle.m.traverse((object) => {
          if (object.isMesh && object.userData?.voxcelVehicleDetail) meshes.push(object);
        });
      }
      window.__voxcelTest.attachPlayerVehicle();
      const vehicle = window.__voxcelPlayer.state.vehicle;
      return {
        state,
        mappedDetailCount: meshes.filter((mesh) => Boolean(mesh.material?.map)).length,
        detailCount: meshes.length,
        vehicleId: vehicle.m.userData.voxcelVehicleId,
        before: { x: vehicle.m.position.x, z: vehicle.m.position.z },
      };
    });

    expect(fallback.state).toMatchObject({
      ready: true,
      status: "ready",
      originalBodiesPreserved: true,
      allDetailsCollisionless: true,
      atlas: {
        status: "fallback",
        ready: false,
        sharedTexture: false,
        textureUuid: null,
        detailTextureCount: 0,
        error: expect.stringContaining("Could not load Voxcel vehicle atlas"),
      },
    });
    expect(fallback.detailCount).toBeGreaterThan(0);
    expect(fallback.mappedDetailCount).toBe(0);
    expect(fallback.vehicleId).toEqual(expect.any(String));

    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(650);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(100);

    const driven = await page.evaluate(() => {
      const vehicle = window.__voxcelPlayer.state.vehicle;
      return {
        id: vehicle.m.userData.voxcelVehicleId,
        x: vehicle.m.position.x,
        z: vehicle.m.position.z,
        speed: vehicle.driveSpeed,
      };
    });
    expect(driven.id).toBe(fallback.vehicleId);
    expect(driven.speed).toBeGreaterThan(0);
    expect(Math.hypot(driven.x - fallback.before.x, driven.z - fallback.before.z)).toBeGreaterThan(0.05);
  });
});
