import { expect, test } from "playwright/test";

const FACILITY_ID = "sky-water-athletic";
const CANONICAL_ID = "greenia-voxcel-adventure";
const AREA_IDS = [
  "mt-kingdom",
  "chibidoland",
  "wonder-amembo",
  "yahhoy",
  "de-kairiki",
  "mecya-forest",
  "mt-king",
  "zip-slide",
];
const REMOVED_LANDMARKS = [
  { id: "southwest-tower-west", x: -110, z: 112 },
  { id: "southwest-tower-east", x: -84, z: 118 },
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

async function playerState(page) {
  return page.evaluate(() => window.__voxcelTest.sample().player);
}

function planarDistance(left, right) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

async function holdKey(page, key, duration) {
  await page.keyboard.down(key);
  try {
    await page.waitForTimeout(duration);
  } finally {
    await page.keyboard.up(key);
  }
}

async function holdKeyUntil(page, key, read, predicate, timeout) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => predicate(await read(page)), {
      timeout,
      intervals: [50, 75, 100],
    }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(90);
}

test.describe("GREENIA VOXCEL ADVENTURE", () => {
  test("builds the expanded field with all eight areas and removes two old towers", async ({ page }) => {
    await startGame(page);
    const state = await athleticsState(page);

    expect(state).toMatchObject({
      ready: true,
      reason: "ready",
      version: 3,
      id: FACILITY_ID,
      canonicalId: CANONICAL_ID,
      controlMode: "manual",
      fieldExpanded: true,
      rootAttached: true,
      mapRegistered: true,
      removedBuildingCount: 2,
    });
    expect(state.facility).toMatchObject({
      id: FACILITY_ID,
      canonicalId: CANONICAL_ID,
      x: -254,
      z: 254,
      w: 412,
      d: 352,
      entrance: { x: -92, z: 83.5 },
    });
    expect(state.bounds.maxX - state.bounds.minX).toBe(state.facility.w);
    expect(state.bounds.maxZ - state.bounds.minZ).toBe(state.facility.d);

    expect(state.research).toMatchObject({
      officialAreaCount: 8,
      representedAreaCount: 8,
      officialTotalPoints: 168,
      representedAttractions: 168,
    });
    expect(state.officialAttractionCount).toBe(168);
    expect(state.officialAttractions).toHaveLength(168);
    expect(new Set(state.officialAttractions.map(({ officialId }) => officialId)).size).toBe(168);
    expect(new Set(state.officialAttractions.map(({ sourceUrl }) => sourceUrl)).size).toBe(168);
    expect(state.officialAttractions.every(({ sourceUrl }) => (
      sourceUrl.startsWith("https://www.rokkosan.com/greenia/athletic/")
    ))).toBe(true);
    expect(state.officialAttractions.every(({ meshCount, playable }) => meshCount > 0 && playable)).toBe(true);
    const officialById = Object.fromEntries(state.officialAttractions.map((attraction) => [
      attraction.officialId,
      attraction,
    ]));
    expect(decodeURIComponent(officialById.ch04.sourceUrl)).toBe(
      "https://www.rokkosan.com/greenia/athletic/chibidoland/壁越えミニボルダリン-グ/",
    );
    expect(decodeURIComponent(officialById.ya20.sourceUrl)).toBe(
      "https://www.rokkosan.com/greenia/athletic/yahhoy/白熱！フリスビーシュー-ター/",
    );
    expect(officialById.ch02).toMatchObject({
      template: "mini-hydraulic-excavator",
      publishedJoystickCount: 2,
      publishedHydraulicCylinderCount: 3,
      publishedOperationStageCount: 4,
      publishedTrackTreadCount: 48,
      publishedTrackRollerCount: 6,
      interactive: true,
    });
    expect(officialById.ki01).toMatchObject({
      template: "castle-net-gate",
      publishedHeightMeters: 5.5,
      interactive: true,
    });
    expect(officialById.ki09).toMatchObject({
      template: "three-swords",
      publishedWeightsKg: [17, 37, 57],
      interactive: true,
    });
    expect(officialById.ki10).toMatchObject({
      template: "progressive-rope-weights",
      publishedWeightCount: 5,
      interactive: true,
    });
    expect(officialById.ki11).toMatchObject({ template: "magic-ball-maze", interactive: true });
    expect(officialById.ki17).toMatchObject({
      template: "jump-touch-panels",
      publishedTargetCount: 13,
      targetInteractionRadius: 1.05,
      interactive: true,
    });
    expect(officialById.ki18).toMatchObject({
      template: "punch-sandbag",
      railTravelLimit: 0.74,
      interactive: true,
    });
    expect(officialById.ki30).toMatchObject({
      template: "dragon",
      publishedLengthMeters: 25,
      rideLength: 25,
      interactive: true,
    });
    expect(officialById.ki31).toMatchObject({
      template: "gong-log-finale",
      publishedSuspensionRopeCount: 2,
      publishedHandRopeCount: 4,
      interactive: true,
    });
    expect(officialById.ya01).toMatchObject({
      template: "long-monkey-bars",
      publishedLengthMeters: 7.6,
      interactive: true,
    });
    expect(officialById.ya10).toMatchObject({
      template: "polygon-antlion-bowl",
      publishedFacetCount: 10,
      publishedEntryStepCount: 8,
      publishedRopeRailLevels: 2,
      interactive: true,
    });
    expect(officialById.ya11).toMatchObject({
      template: "dense-pole-climb",
      publishedPoleCount: 18,
      publishedDeckLevels: 2,
      interactive: true,
    });
    expect(officialById.ya12).toMatchObject({
      template: "brick-heist-wall",
      publishedLadderRungCount: 8,
      publishedLedgeCount: 6,
      interactive: true,
    });
    expect(officialById.ya13).toMatchObject({
      template: "cooperative-sail-hoist",
      publishedParallelRopeCount: 2,
      publishedTopTieCount: 9,
      publishedRequiredPullCount: 2,
      interactive: true,
    });
    expect(officialById.me08).toMatchObject({
      template: "zip",
      publishedLengthMeters: 220,
      rideLength: 220.2,
      interactive: true,
    });
    expect(["me01", "me06", "me09", "me15", "me20", "me29"].map((id) => (
      officialById[id].stairStepCount
    ))).toEqual([10, 14, 12, 16, 13, 15]);
    expect(new Set(["me01", "me06", "me09", "me15", "me20", "me29"].map((id) => (
      officialById[id].detailProfile
    ))).size).toBe(6);
    for (const id of ["me02", "me18", "me24", "me25", "me32", "me34", "me36"]) {
      expect(officialById[id].detailProfile, `${id} flexible net`).toContain("flex-rig");
    }
    expect(officialById.me23.detailProfile).toContain("irregular-long-short-angular-height-varied");
    expect(officialById.wa16).toMatchObject({
      template: "three-second-wall",
      publishedWidthMeters: 4,
      interactive: true,
    });
    expect(officialById.wa32).toMatchObject({
      template: "water-dash",
      publishedLengthMeters: 9,
    });
    expect(officialById.wa27).toMatchObject({
      template: "rope-jungle",
      detailProfile: "official-description-matched-three-dimensional-rope-jungle-logs-hammock-and-eleven-point-weave",
      interactive: true,
    });
    expect(officialById.wa28).toMatchObject({
      template: "cling-log-wall",
      detailProfile: "photo-matched-ten-natural-log-wall-white-u-handles-pink-tiny-feet-and-ten-point-cling-traverse",
      interactive: true,
    });
    expect(officialById.de05).toMatchObject({ template: "rope-forest", interactive: true });
    expect(officialById.de07).toMatchObject({ template: "hanging-stairs", interactive: true });
    expect(officialById.de15).toMatchObject({ template: "finger-ledge", interactive: true });
    expect(officialById.de20).toMatchObject({ template: "resistance-bell", interactive: true });
    expect(officialById.zi01).toMatchObject({ publishedLengthMeters: 256, interactive: true });
    expect(officialById.zi02).toMatchObject({ publishedLengthMeters: 201, interactive: true });
    expect(state.officialAttractionMeshCount).toBeGreaterThan(6_000);
    expect(state.animationCount).toBeGreaterThan(600);
    expect(state.challenges.map(({ id }) => id)).toEqual(AREA_IDS);
    expect(state.challenges).toHaveLength(8);
    for (const area of state.challenges) {
      expect(area.checkpoints.length, `${area.id} checkpoints`).toBe(area.officialPoints);
      expect(area.start, `${area.id} start`).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
      }));
      expect(area.finish, `${area.id} finish`).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
      }));
    }

    expect(state.removedLandmarks).toHaveLength(2);
    for (const expected of REMOVED_LANDMARKS) {
      expect(state.removedLandmarks).toContainEqual(expect.objectContaining({
        ...expected,
        detached: true,
      }));
    }
    expect(state.removedObjectCount).toBeGreaterThanOrEqual(state.removedBuildingCount);
    expect(state.meshCount).toBeGreaterThan(0);
    expect(state.surfaceCount).toBeGreaterThan(0);
    expect(state.hazardCount).toBeGreaterThan(0);
  });

  test("walks from the city, enters with E, and plays manually with keyboard input", async ({ page }) => {
    test.setTimeout(70_000);
    await startGame(page);

    // The initial camera faces north: ArrowUp increases z and ArrowRight decreases x.
    // This route stays north of the dense shop blocks before turning toward the gate.
    await holdKeyUntil(page, "ArrowUp", playerState, ({ z }) => z >= 76, 12_000);
    await holdKeyUntil(page, "ArrowRight", playerState, ({ x }) => x <= -88.5, 17_000);
    await holdKeyUntil(page, "ArrowUp", playerState, ({ z }) => z >= 81, 4_000);

    const atEntrance = await playerState(page);
    expect(planarDistance(atEntrance, { x: -92, z: 83.5 })).toBeLessThan(6);
    await expect(page.getByRole("button", { name: "GREENIAで遊ぶ" })).toBeVisible();

    await page.keyboard.press("e");
    await expect.poll(async () => (await athleticsState(page)).playModeActive).toBe(true);
    await expect(page.getByRole("region", { name: "GREENIA アスレチック情報" })).toBeVisible();

    const idlePlayer = await playerState(page);
    const idleState = await athleticsState(page);
    await page.waitForTimeout(450);
    const afterIdlePlayer = await playerState(page);
    const afterIdleState = await athleticsState(page);
    expect(planarDistance(idlePlayer, afterIdlePlayer)).toBeLessThan(0.16);
    expect(afterIdleState.distanceTravelled - idleState.distanceTravelled).toBeLessThan(0.16);
    expect(afterIdleState.fallCount).toBe(idleState.fallCount);
    expect(afterIdleState.grounded).toBe(true);

    const beforeWalk = await playerState(page);
    const beforeWalkState = await athleticsState(page);
    await holdKey(page, "w", 480);
    await page.waitForTimeout(120);
    const afterWalk = await playerState(page);
    const afterWalkState = await athleticsState(page);
    expect(planarDistance(beforeWalk, afterWalk)).toBeGreaterThan(1.2);
    expect(afterWalk.z).toBeGreaterThan(beforeWalk.z + 0.8);
    expect(afterWalkState.distanceTravelled).toBeGreaterThan(beforeWalkState.distanceTravelled + 1);

    const beforeJumpPlayer = await playerState(page);
    const beforeJumpState = await athleticsState(page);
    await page.keyboard.press("Space");
    await expect.poll(async () => (await athleticsState(page)).jumpCount).toBe(
      beforeJumpState.jumpCount + 1,
    );
    await expect.poll(async () => (await playerState(page)).y).toBeGreaterThan(
      beforeJumpPlayer.y + 0.35,
    );
    await expect.poll(async () => (await athleticsState(page)).grounded, {
      timeout: 2_500,
    }).toBe(true);
    const landedPlayer = await playerState(page);
    expect(landedPlayer.y).toBeCloseTo(beforeJumpPlayer.y, 1);

    const amemboChip = page.getByRole("button", { name: "wonder amemboへ移動" });
    await expect(amemboChip).toBeVisible();
    await amemboChip.click();
    await expect.poll(async () => {
      const state = await athleticsState(page);
      return {
        active: state.activeChallenge,
        checkpoint: state.lastCheckpoint.id,
        index: state.checkpointIndex,
      };
    }).toEqual({ active: "wonder-amembo", checkpoint: "amembo-start", index: 0 });

    const beforeFall = await athleticsState(page);
    const waterStart = { ...beforeFall.lastCheckpoint };
    await holdKeyUntil(
      page,
      "d",
      athleticsState,
      (state) => state.fallCount > beforeFall.fallCount,
      4_000,
    );
    const falling = await athleticsState(page);
    expect(falling.lastRespawnReason).toBe("water");
    expect(falling.lastCheckpoint).toMatchObject({
      id: "amembo-start",
      areaId: "wonder-amembo",
      index: 0,
    });

    await expect.poll(async () => (await athleticsState(page)).respawnCount, {
      timeout: 3_000,
    }).toBe(beforeFall.respawnCount + 1);
    await expect.poll(async () => (await athleticsState(page)).gameplayMode).toBe("running");
    const respawnedState = await athleticsState(page);
    const respawnedPlayer = await playerState(page);
    expect(respawnedState.grounded).toBe(true);
    expect(respawnedState.activeChallenge).toBe("wonder-amembo");
    expect(respawnedState.checkpointIndex).toBe(0);
    expect(planarDistance(respawnedPlayer, waterStart)).toBeLessThan(0.8);
  });

  test("cancels an active zip when switching courses or respawning", async ({ page }) => {
    await startGame(page);

    expect(await page.evaluate(() => window.__voxcelAthletics.enterPlayMode())).toBe(true);
    const zipChip = page.getByRole("button", { name: "zip slideへ移動" });
    const amemboChip = page.getByRole("button", { name: "wonder amemboへ移動" });

    await zipChip.click();
    await expect.poll(async () => {
      const state = await athleticsState(page);
      return {
        active: state.activeChallenge,
        checkpoint: state.lastCheckpoint.id,
        mode: state.gameplayMode,
      };
    }).toEqual({ active: "zip-slide", checkpoint: "zip-start", mode: "running" });
    expect(await page.evaluate(() => (
      window.__voxcelAthletics.activateInteraction("zip-go")
    ))).toBe(true);
    await expect.poll(async () => {
      const state = await athleticsState(page);
      const player = await playerState(page);
      return state.gameplayMode === "ziplining"
        && state.ziplineProgress > 0.025
        && planarDistance(player, state.lastCheckpoint) > 0.25;
    }).toBe(true);

    await amemboChip.click();
    await expect.poll(async () => {
      const state = await athleticsState(page);
      return {
        active: state.activeChallenge,
        checkpoint: state.lastCheckpoint.id,
        mode: state.gameplayMode,
        ziplineProgress: state.ziplineProgress,
      };
    }).toEqual({
      active: "wonder-amembo",
      checkpoint: "amembo-start",
      mode: "running",
      ziplineProgress: null,
    });
    const switchedState = await athleticsState(page);
    const switchedPlayer = await playerState(page);
    expect(planarDistance(switchedPlayer, switchedState.lastCheckpoint)).toBeLessThan(0.2);
    expect(Math.abs(switchedPlayer.y - switchedState.lastCheckpoint.y)).toBeLessThan(0.2);
    await page.waitForTimeout(400);
    expect(planarDistance(await playerState(page), switchedState.lastCheckpoint)).toBeLessThan(0.2);

    await zipChip.click();
    expect(await page.evaluate(() => (
      window.__voxcelAthletics.activateInteraction("zip-go")
    ))).toBe(true);
    await expect.poll(async () => {
      const state = await athleticsState(page);
      const player = await playerState(page);
      return state.gameplayMode === "ziplining"
        && state.ziplineProgress > 0.025
        && planarDistance(player, state.lastCheckpoint) > 0.25;
    }).toBe(true);

    const beforeRespawn = await athleticsState(page);
    const requested = await page.evaluate(() => {
      const accepted = window.__voxcelAthletics.respawn();
      const state = window.__voxcelAthletics.getState();
      return {
        accepted,
        checkpoint: state.lastCheckpoint.id,
        mode: state.gameplayMode,
        ziplineProgress: state.ziplineProgress,
      };
    });
    expect(requested).toEqual({
      accepted: true,
      checkpoint: "zip-start",
      mode: "respawning",
      ziplineProgress: null,
    });
    await expect.poll(async () => (await athleticsState(page)).respawnCount, {
      timeout: 3_000,
    }).toBe(beforeRespawn.respawnCount + 1);
    await expect.poll(async () => (await athleticsState(page)).gameplayMode).toBe("running");

    const respawnedState = await athleticsState(page);
    const respawnedPlayer = await playerState(page);
    expect(respawnedState.activeChallenge).toBe("zip-slide");
    expect(respawnedState.ziplineProgress).toBeNull();
    expect(planarDistance(respawnedPlayer, respawnedState.lastCheckpoint)).toBeLessThan(0.2);
    expect(Math.abs(respawnedPlayer.y - respawnedState.lastCheckpoint.y)).toBeLessThan(0.2);
    await page.waitForTimeout(400);
    expect(planarDistance(await playerState(page), respawnedState.lastCheckpoint)).toBeLessThan(0.2);
  });

  test("operates the photo-matched rope, wall, stair, finger, and resistance challenges", async ({ page }) => {
    await startGame(page);

    const pathCases = [
      ["mt-kingdom", "official-ki30-dragon-crawl"],
      ["wonder-amembo", "official-wa27-jungle-path"],
      ["wonder-amembo", "official-wa28-cling-path"],
      ["de-kairiki", "official-de05-rope-forest"],
      ["de-kairiki", "official-de07-metal-stairs"],
      ["yahhoy", "official-ya10-spiral-ascent"],
      ["yahhoy", "official-ya11-weave-and-climb"],
      ["yahhoy", "official-ya12-wall-heist-traverse"],
    ];
    for (const [areaId, interactionId] of pathCases) {
      const result = await page.evaluate(({ areaId: targetArea, interactionId: targetInteraction }) => {
        window.__voxcelAthletics.startChallenge(targetArea);
        const activated = window.__voxcelAthletics.activateInteraction(targetInteraction);
        const state = window.__voxcelAthletics.getState();
        return {
          activated,
          activeArea: state.activeChallenge,
          rideId: state.activeRideId,
          rideKind: state.activeRideKind,
        };
      }, { areaId, interactionId });
      expect(result, interactionId).toEqual({
        activated: true,
        activeArea: areaId,
        rideId: interactionId,
        rideKind: "path-course",
      });
    }

    const fingerInputs = await page.evaluate(() => {
      window.__voxcelAthletics.startChallenge("de-kairiki");
      return Array.from(
        { length: 9 },
        () => window.__voxcelAthletics.activateInteraction("official-de15-finger-steps"),
      );
    });
    expect(fingerInputs).toEqual(Array(9).fill(true));

    const beltName = "Greenia:de20-bell-resistance-belt";
    const beltResult = await page.evaluate((name) => {
      window.__voxcelAthletics.startChallenge("de-kairiki");
      const belt = window.__voxcelAthletics.root.getObjectByName(name);
      const baseScaleY = belt.scale.y;
      const pulls = Array.from(
        { length: 5 },
        () => window.__voxcelAthletics.activateInteraction("official-de20-resist"),
      );
      return { baseScaleY, pulls };
    }, beltName);
    await page.waitForTimeout(120);
    const stretchedScaleY = await page.evaluate((name) => (
      window.__voxcelAthletics.root.getObjectByName(name).scale.y
    ), beltName);
    expect(beltResult.pulls).toEqual(Array(5).fill(true));
    expect(stretchedScaleY).toBeGreaterThan(beltResult.baseScaleY * 1.08);
    await expect.poll(async () => (await athleticsState(page)).activeRideId).toBe(
      "official-de20-resistance-run",
    );
  });

  test("operates the five dedicated Mt.Kingdom mechanisms through their full input sequences", async ({ page }) => {
    await startGame(page);

    const sequences = await page.evaluate(() => {
      window.__voxcelAthletics.startChallenge("mt-kingdom");
      const activate = (id, count) => Array.from(
        { length: count },
        () => window.__voxcelAthletics.activateInteraction(id),
      );
      return {
        progressiveWeights: activate("official-ki10-progressive-pull", 5),
        magicMaze: activate("official-ki11-maze-ball", 7),
        jumpTargets: activate("official-ki17-jump-touch", 13),
        sandbag: activate("official-ki18-punch", 1),
        gongFinale: activate("official-ki31-gong-kick", 3),
      };
    });

    expect(sequences.progressiveWeights).toEqual(Array(5).fill(true));
    expect(sequences.magicMaze).toEqual(Array(7).fill(true));
    expect(sequences.jumpTargets).toEqual(Array(13).fill(true));
    expect(sequences.sandbag).toEqual([true]);
    expect(sequences.gongFinale).toEqual(Array(3).fill(true));
    await expect.poll(async () => {
      const state = await athleticsState(page);
      return state.officialAttractions.find(({ officialId }) => officialId === "ki31").gongContactVerified;
    }, { timeout: 2_000 }).toBe(true);
  });

  test("operates the photo-matched excavator cycle and cooperative sail hoist", async ({ page }) => {
    await startGame(page);
    const result = await page.evaluate(() => {
      window.__voxcelAthletics.startChallenge("chibidoland");
      const excavator = Array.from(
        { length: 4 },
        () => window.__voxcelAthletics.activateInteraction("official-ch02-four-stage-excavator"),
      );
      window.__voxcelAthletics.startChallenge("yahhoy");
      const sail = Array.from(
        { length: 2 },
        () => window.__voxcelAthletics.activateInteraction("official-ya13-two-rope-hoist"),
      );
      return { excavator, sail };
    });
    expect(result.excavator).toEqual(Array(4).fill(true));
    expect(result.sail).toEqual(Array(2).fill(true));
  });

  test("releases the movement lock on vehicle, building, and arrest state transitions", async ({ page }) => {
    await startGame(page);
    const hud = page.locator(".voxcel-athletic-hud");
    const transitions = ["vehicle", "building", "arrest"];

    for (const transition of transitions) {
      const entered = await page.evaluate(() => {
        const handle = window.__voxcelPlayer;
        handle.state.vehicle = null;
        handle.state.insideBld = null;
        handle.state.arrestPhase = null;
        handle.state.arrestTimer = 0;
        handle.playerRoot.rotation.x = 0;
        window.__voxcelTest.setPlayer(0, 15, Math.PI);
        return window.__voxcelAthletics.enterPlayMode();
      });
      expect(entered, `${transition} setup`).toBe(true);
      await expect.poll(async () => page.evaluate(() => ({
        active: window.__voxcelAthletics.getState().playModeActive,
        locked: window.__voxcelPlayer.movementLocked,
        playingClass: document.body.classList.contains("voxcel-athletic-playing"),
      }))).toEqual({ active: true, locked: true, playingClass: true });
      await expect(hud).toBeVisible();
      const before = await playerState(page);

      const applied = await page.evaluate((kind) => {
        const handle = window.__voxcelPlayer;
        if (kind === "vehicle") {
          const vehicle = handle.vehicles.find((candidate) => (
            candidate.type === "car" && !candidate.manual
          ));
          if (!vehicle) return false;
          window.__athleticTransitionVehicle = {
            vehicle,
            x: vehicle.m.position.x,
            y: vehicle.m.position.y,
            z: vehicle.m.position.z,
            rotationY: vehicle.m.rotation.y,
            manual: vehicle.manual,
            driveSpeed: vehicle.driveSpeed,
            currentSpeed: vehicle.curSp,
            targetSpeed: vehicle.targetSp,
          };
          vehicle.manual = true;
          vehicle.driveSpeed = 0;
          vehicle.curSp = 0;
          vehicle.targetSp = 0;
          vehicle.m.position.set(
            handle.playerRoot.position.x,
            0,
            handle.playerRoot.position.z,
          );
          vehicle.m.rotation.y = handle.playerRoot.rotation.y;
          handle.state.vehicle = vehicle;
          return true;
        }
        if (kind === "building") {
          handle.state.insideBld = handle.buildings[0] || { id: "athletic-transition-test" };
          return true;
        }
        handle.state.arrestPhase = "athletic-transition-test";
        handle.state.arrestTimer = 0;
        return true;
      }, transition);
      expect(applied, `${transition} transition`).toBe(true);

      await expect.poll(async () => page.evaluate(() => ({
        active: window.__voxcelAthletics.getState().playModeActive,
        locked: window.__voxcelPlayer.movementLocked,
        playingClass: document.body.classList.contains("voxcel-athletic-playing"),
      }))).toEqual({ active: false, locked: false, playingClass: false });
      await expect(hud).toBeHidden();
      await page.waitForTimeout(120);
      const after = await playerState(page);
      expect(planarDistance(before, after), `${transition} transition`).toBeLessThan(0.25);

      await page.evaluate(() => {
        const handle = window.__voxcelPlayer;
        handle.state.vehicle = null;
        handle.state.insideBld = null;
        handle.state.arrestPhase = null;
        handle.state.arrestTimer = 0;
        handle.playerRoot.rotation.x = 0;
        const saved = window.__athleticTransitionVehicle;
        if (saved) {
          saved.vehicle.m.position.set(saved.x, saved.y, saved.z);
          saved.vehicle.m.rotation.y = saved.rotationY;
          saved.vehicle.manual = saved.manual;
          saved.vehicle.driveSpeed = saved.driveSpeed;
          saved.vehicle.curSp = saved.currentSpeed;
          saved.vehicle.targetSp = saved.targetSpeed;
          delete window.__athleticTransitionVehicle;
        }
      });
    }
  });

  test("registers the expanded adventure field and selects it on the city map", async ({ page }) => {
    await startGame(page);
    const mapLocation = await page.evaluate((id) => (
      window.__voxcelMap.getState().locations.find((location) => location.id === id) || null
    ), FACILITY_ID);

    expect(mapLocation).toMatchObject({
      id: FACILITY_ID,
      name: "GREENIA VOXCEL ADVENTURE",
      category: "アウトドア・アスレチック",
      x: -254,
      z: 254,
      w: 412,
      d: 352,
      enterable: false,
    });

    await page.getByRole("button", { name: "街の地図を開く" }).click();
    await expect(page.getByRole("dialog", { name: "🗺️ 街の地図" })).toBeVisible();
    await expect(page.locator(`[data-map-location="${FACILITY_ID}"]`)).toHaveCount(2);

    const locationButton = page.locator(
      `.voxcel-map-location-button[data-map-location="${FACILITY_ID}"]`,
    );
    await expect(locationButton).toBeVisible();
    await expect(locationButton).toContainText("GREENIA VOXCEL ADVENTURE");
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
