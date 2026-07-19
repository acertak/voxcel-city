import { expect, test } from "playwright/test";

const EXPECTED_FRONTS = Object.freeze({
  conv: { axis: "z", direction: -1, road: -70 },
  cafe: { axis: "z", direction: 1, road: 0 },
  bake: { axis: "z", direction: -1, road: 0 },
  rest: { axis: "z", direction: 1, road: 70 },
  cloth: { axis: "x", direction: 1, road: 44 },
  salon: { axis: "x", direction: 1, road: 44 },
  furn: { axis: "x", direction: 1, road: 44 },
  book: { axis: "x", direction: 1, road: 44 },
  hosp: { axis: "x", direction: -1, road: 44 },
  bank: { axis: "z", direction: 1, road: 0 },
  home: { axis: "x", direction: -1, road: 44 },
  police: { axis: "z", direction: 1, road: 70 },
  office: { axis: "z", direction: -1, road: 0 },
});

const EXPECTED_SIGN_REGIONS = Object.freeze({
  conv: "exterior_convenience",
  cafe: "exterior_cafe",
  bake: "exterior_bakery",
  rest: "exterior_restaurant",
  cloth: "exterior_clothing",
  salon: "exterior_salon",
  furn: "exterior_furniture",
  book: "exterior_book",
  hosp: "exterior_hospital",
  bank: "exterior_bank",
  home: "exterior_home",
  police: "exterior_police",
});

async function startGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ゲーム開始" }).click();
  await expect.poll(async () => page.evaluate(() => ({
    office: window.__voxcelOffice?.ready ?? false,
    enhancements: window.__voxcelEnhancements?.getState?.().ready ?? false,
    signAtlas: window.__voxcelSignAtlas?.getState?.().ready ?? false,
  }))).toEqual({ office: true, enhancements: true, signAtlas: true });
  await page.waitForTimeout(220);
}

async function setPlayer(page, x, z, yaw = Math.PI) {
  await page.evaluate(({ x: nextX, z: nextZ, yaw: nextYaw }) => {
    window.__voxcelTest.setPlayer(nextX, nextZ, nextYaw);
  }, { x, z, yaw });
  await page.waitForTimeout(160);
}

test.describe("road-facing buildings and rooftop signs", () => {
  test("orients every facility entrance and door toward its adjacent road", async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
      const handle = window.__voxcelPlayer;
      const worldPosition = (object) => {
        if (!object) return null;
        object.updateWorldMatrix(true, false);
        const elements = object.matrixWorld.elements;
        return { x: elements[12], y: elements[13], z: elements[14] };
      };
      const plainFront = (front) => front && ({
        axis: front.axis,
        direction: front.direction,
        road: front.road,
      });

      return handle.buildings.map((building) => {
        const view = handle.buildingViews[building.id];
        const entrance = handle.entrances.find(({ b }) => (
          b === building || b?.id === building.id
        ));
        return {
          id: building.id,
          center: { x: building.x, z: building.z },
          dimensions: { x: building.w, z: building.d },
          front: plainFront(building.front),
          viewFront: plainFront(view?.front),
          entrance: entrance?.pos
            ? { x: entrance.pos.x, y: entrance.pos.y, z: entrance.pos.z }
            : null,
          door: worldPosition(view?.door),
          frontWindows: (view?.frontWindows || []).map(worldPosition),
        };
      });
    });

    expect(result).toHaveLength(13);
    expect(result.map(({ id }) => id).sort()).toEqual(Object.keys(EXPECTED_FRONTS).sort());

    for (const building of result) {
      const expected = EXPECTED_FRONTS[building.id];
      const crossAxis = expected.axis === "x" ? "z" : "x";
      const halfExtent = building.dimensions[expected.axis] / 2;
      const facade = building.center[expected.axis] + expected.direction * halfExtent;

      expect(building.front, `${building.id} building.front`).toEqual(expected);
      expect(building.viewFront, `${building.id} view.front`).toEqual(expected);
      expect(building.entrance, `${building.id} entrance`).not.toBeNull();
      expect(building.door, `${building.id} door`).not.toBeNull();

      expect(
        (building.entrance[expected.axis] - building.center[expected.axis]) * expected.direction,
        `${building.id} entrance must be outside the road-facing wall`,
      ).toBeGreaterThan(halfExtent);
      expect(
        (building.door[expected.axis] - building.center[expected.axis]) * expected.direction,
        `${building.id} door must be on the road-facing wall`,
      ).toBeGreaterThan(halfExtent - 0.65);
      expect(
        Math.abs(building.door[expected.axis] - facade),
        `${building.id} door must sit on the facade plane`,
      ).toBeLessThan(0.65);
      expect(
        Math.abs(building.entrance[crossAxis] - building.door[crossAxis]),
        `${building.id} entrance and door must share the same frontage`,
      ).toBeLessThan(0.85);
      expect(
        (expected.road - building.center[expected.axis]) * expected.direction,
        `${building.id} front.road must be beyond the selected facade`,
      ).toBeGreaterThan(halfExtent);
      expect(
        Math.abs(expected.road - building.entrance[expected.axis]),
        `${building.id} entrance must be closer to the road than the building center`,
      ).toBeLessThan(Math.abs(expected.road - building.center[expected.axis]));

      const needsRelocatedFacade = !(expected.axis === "z" && expected.direction === -1);
      expect(building.frontWindows, `${building.id} road-facing display windows`).toHaveLength(
        needsRelocatedFacade ? 2 : 0,
      );
      for (const windowPosition of building.frontWindows) {
        expect(
          Math.abs(windowPosition[expected.axis] - facade),
          `${building.id} display window must sit on the selected facade`,
        ).toBeLessThan(0.65);
        expect(
          Math.abs(windowPosition[crossAxis] - building.center[crossAxis]),
          `${building.id} display window must flank the entrance`,
        ).toBeGreaterThan(2);
      }
    }
  });

  test("mounts four-sided rooftop signs above all thirteen roofs", async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
      const handle = window.__voxcelPlayer;
      const signAtlas = window.__voxcelSignAtlas.getState();
      const worldYBounds = (root) => {
        let min = Infinity;
        let max = -Infinity;
        root?.updateWorldMatrix(true, true);
        root?.traverse((object) => {
          const position = object.geometry?.getAttribute?.("position");
          if (!position) return;
          const matrix = object.matrixWorld.elements;
          for (let index = 0; index < position.count; index += 1) {
            const x = position.getX(index);
            const y = position.getY(index);
            const z = position.getZ(index);
            const worldY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
            min = Math.min(min, worldY);
            max = Math.max(max, worldY);
          }
        });
        return Number.isFinite(min) ? { min, max } : null;
      };
      const sideUvs = (mesh) => {
        const uv = mesh?.geometry?.getAttribute?.("uv");
        const normal = mesh?.geometry?.getAttribute?.("normal");
        const sides = { "+x": [], "-x": [], "+z": [], "-z": [] };
        if (!uv || !normal || uv.count !== normal.count) return sides;
        for (let index = 0; index < normal.count; index += 1) {
          let side = null;
          if (normal.getX(index) > 0.9) side = "+x";
          if (normal.getX(index) < -0.9) side = "-x";
          if (normal.getZ(index) > 0.9) side = "+z";
          if (normal.getZ(index) < -0.9) side = "-z";
          if (side) sides[side].push({ u: uv.getX(index), v: uv.getY(index) });
        }
        return Object.fromEntries(Object.entries(sides).map(([side, values]) => ({
          side,
          vertexCount: values.length,
          uMin: values.length ? Math.min(...values.map(({ u }) => u)) : null,
          uMax: values.length ? Math.max(...values.map(({ u }) => u)) : null,
          vMin: values.length ? Math.min(...values.map(({ v }) => v)) : null,
          vMax: values.length ? Math.max(...values.map(({ v }) => v)) : null,
        })).map(({ side, ...summary }) => [side, summary]));
      };

      const signs = handle.buildings.map((building) => {
        const view = handle.buildingViews[building.id];
        const roofSign = view?.roofSign;
        const materials = roofSign
          ? (Array.isArray(roofSign.material) ? roofSign.material : [roofSign.material])
          : [];
        const maps = materials.map((material) => material?.map).filter(Boolean);
        roofSign?.updateWorldMatrix(true, false);
        const matrix = roofSign?.matrixWorld?.elements;
        const dimensions = roofSign?.geometry?.parameters;
        return {
          id: building.id,
          exists: Boolean(roofSign),
          marker: roofSign?.userData?.voxcelRooftopSign ?? false,
          roofBounds: worldYBounds(view?.roof),
          signBounds: worldYBounds(roofSign),
          region: roofSign?.userData?.voxcelSignAtlasRegion ?? null,
          geometryRegion: roofSign?.geometry?.userData?.voxcelSignAtlasRegion ?? null,
          rect: roofSign?.geometry?.userData?.voxcelSignAtlasRect ?? null,
          textureUuids: [...new Set(maps.map(({ uuid }) => uuid))],
          textureNames: [...new Set(maps.map(({ name }) => name))],
          canvasTexture: maps.some(({ image }) => image instanceof HTMLCanvasElement),
          sides: sideUvs(roofSign),
          position: matrix ? { x: matrix[12], y: matrix[13], z: matrix[14] } : null,
          dimensions: dimensions ? {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth,
          } : null,
        };
      });

      const antenna = handle.scene.getObjectByName("CityOffice:antenna");
      antenna?.updateWorldMatrix(true, false);
      const antennaMatrix = antenna?.matrixWorld?.elements;

      return {
        atlasTextureUuid: signAtlas.textureUuid,
        signs,
        officeAntenna: antennaMatrix
          ? { x: antennaMatrix[12], y: antennaMatrix[13], z: antennaMatrix[14] }
          : null,
      };
    });

    expect(result.signs).toHaveLength(13);
    for (const sign of result.signs) {
      expect(sign.exists, `${sign.id} roofSign`).toBe(true);
      expect(sign.marker, `${sign.id} rooftop marker`).toBe(true);
      expect(sign.roofBounds, `${sign.id} roof bounds`).not.toBeNull();
      expect(sign.signBounds, `${sign.id} roofSign bounds`).not.toBeNull();
      expect(
        sign.signBounds.min,
        `${sign.id} roofSign must be wholly above the roof`,
      ).toBeGreaterThan(sign.roofBounds.max + 0.04);
    }

    const atlasSigns = result.signs.filter(({ id }) => id !== "office");
    expect(atlasSigns).toHaveLength(12);
    expect(result.atlasTextureUuid).toEqual(expect.any(String));
    expect(new Set(atlasSigns.flatMap(({ textureUuids }) => textureUuids))).toEqual(
      new Set([result.atlasTextureUuid]),
    );

    for (const sign of atlasSigns) {
      const expectedRegion = EXPECTED_SIGN_REGIONS[sign.id];
      expect(sign.region, `${sign.id} atlas region`).toBe(expectedRegion);
      expect(sign.geometryRegion, `${sign.id} geometry atlas region`).toBe(expectedRegion);
      expect(sign.textureUuids, `${sign.id} shared sign texture`).toEqual([
        result.atlasTextureUuid,
      ]);
      expect(sign.textureNames, `${sign.id} sign texture name`).toEqual(["VoxcelSignAtlas"]);
      expect(sign.canvasTexture, `${sign.id} must not allocate a canvas texture`).toBe(false);
      expect(sign.rect, `${sign.id} atlas UV rect`).not.toBeNull();

      const uMin = Math.min(sign.rect.u0, sign.rect.u1);
      const uMax = Math.max(sign.rect.u0, sign.rect.u1);
      const vMin = Math.min(sign.rect.v0, sign.rect.v1);
      const vMax = Math.max(sign.rect.v0, sign.rect.v1);
      for (const side of ["+x", "-x", "+z", "-z"]) {
        const uv = sign.sides[side];
        expect(uv.vertexCount, `${sign.id} ${side} side UV vertices`).toBeGreaterThanOrEqual(4);
        expect(uv.uMin, `${sign.id} ${side} UV uMin`).toBeCloseTo(uMin, 5);
        expect(uv.uMax, `${sign.id} ${side} UV uMax`).toBeCloseTo(uMax, 5);
        expect(uv.vMin, `${sign.id} ${side} UV vMin`).toBeCloseTo(vMin, 5);
        expect(uv.vMax, `${sign.id} ${side} UV vMax`).toBeCloseTo(vMax, 5);
      }
    }

    // The office has no dedicated atlas region, but its canvas artwork must still wrap every
    // lateral face so the rooftop sign stays legible from all four directions.
    const office = result.signs.find(({ id }) => id === "office");
    expect(office).toBeTruthy();
    expect(office.region).toBeNull();
    expect(office.geometryRegion).toBeNull();
    expect(office.textureUuids).toHaveLength(1);
    expect(office.canvasTexture).toBe(true);
    expect(office.dimensions).toMatchObject({
      width: expect.any(Number),
      height: 2.8,
      depth: expect.any(Number),
    });
    expect(office.dimensions.width).toBeGreaterThanOrEqual(7.5);
    expect(office.dimensions.depth).toBeGreaterThanOrEqual(7.5);
    expect(result.officeAntenna).not.toBeNull();
    expect(
      Math.abs(office.position.x - result.officeAntenna.x),
      "office rooftop sign must clear the central antenna",
    ).toBeGreaterThan(office.dimensions.width / 2 + 0.25);
    expect(
      Math.abs(office.position.z - result.officeAntenna.z),
      "office rooftop sign must clear the antenna in the perpendicular view",
    ).toBeGreaterThan(office.dimensions.depth / 2 + 0.25);
    for (const side of ["+x", "-x", "+z", "-z"]) {
      const uv = office.sides[side];
      expect(uv.vertexCount, `office ${side} side UV vertices`).toBeGreaterThanOrEqual(4);
      expect(uv.uMin, `office ${side} UV uMin`).toBeCloseTo(0, 5);
      expect(uv.uMax, `office ${side} UV uMax`).toBeCloseTo(1, 5);
      expect(uv.vMin, `office ${side} UV vMin`).toBeCloseTo(0, 5);
      expect(uv.vMax, `office ${side} UV vMax`).toBeCloseTo(1, 5);
    }
  });

  test("returns the player to each representative road-side entrance", async ({ page }) => {
    test.setTimeout(60_000);
    await startGame(page);

    for (const buildingId of ["conv", "cafe", "cloth", "hosp"]) {
      const entrance = await page.evaluate((id) => {
        const match = window.__voxcelPlayer.entrances.find(({ b }) => b?.id === id);
        return { x: match.pos.x, z: match.pos.z };
      }, buildingId);

      await setPlayer(page, entrance.x, entrance.z);
      await page.keyboard.press("e");
      await expect.poll(async () => page.evaluate(() => (
        window.__voxcelEnhancements.getState().buildingId
      ))).toBe(buildingId);

      const exitPoint = await page.evaluate((id) => {
        const point = window.__voxcelPlayer.buildingViews[id].interiorPts
          .find(({ action }) => action === "exit").pos;
        return { x: point.x, z: point.z };
      }, buildingId);
      await setPlayer(page, exitPoint.x, exitPoint.z);
      await page.keyboard.press("e");
      await expect.poll(async () => page.evaluate(() => (
        window.__voxcelEnhancements.getState().activeScene
      ))).toBe("city");

      const player = await page.evaluate(() => window.__voxcelTest.sample().player);
      expect(
        Math.hypot(player.x - entrance.x, player.z - entrance.z),
        `${buildingId} exit must restore the matching exterior entrance`,
      ).toBeLessThan(0.75);
    }
  });
});
