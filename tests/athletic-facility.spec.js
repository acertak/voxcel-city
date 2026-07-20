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
      version: 4,
      id: FACILITY_ID,
      canonicalId: CANONICAL_ID,
      controlMode: "manual-physics-v4",
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
    expect(state.officialAttractions.filter(({ detailProfile }) => !detailProfile)).toEqual([]);
    expect(state.officialAttractions.filter(({ detailProfile }) => (
      /fallback|generic/i.test(detailProfile)
    ))).toEqual([]);
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
    const mtKingdomDedicatedTemplates = {
      ki06: "castle-escape-slide",
      ki12: "suspended-zigzag-road",
      ki13: "swinging-ring-road",
      ki14: "suspended-iron-bar",
      ki15: "triangular-net-dungeon",
      ki16: "transparent-floating-walls",
      ki21: "multi-height-chimney-wall",
      ki23: "healing-timber-swing",
      ki24: "twin-net-tunnels",
      ki25: "low-hero-zigzag-path",
      ki26: "double-trapeze-jump",
      ki28: "rocking-balance-road",
      ki29: "sideways-rope-traverse",
    };
    for (const [id, template] of Object.entries(mtKingdomDedicatedTemplates)) {
      expect(officialById[id], `${id} dedicated official geometry`).toMatchObject({
        template,
        detailProfile: expect.stringMatching(/matched/),
        playable: true,
      });
      expect(officialById[id].meshCount, `${id} component detail`).toBeGreaterThan(45);
    }
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
    const wonderPhotoMatchedTemplates = {
      wa01: "transparent-spider-corridor",
      wa02: "single-balance-log",
      wa03: "infinite-hanging-rings",
      wa04: "long-water-monkey-bars",
      wa05: "triple-hammock-gates",
      wa07: "twin-ninja-pull-boards",
      wa11: "three-choice-parallel-logs",
      wa13: "eight-padded-floating-islands",
      wa15: "double-pulley-ball-slider",
      wa18: "one-point-two-sumo-stage",
      wa20: "dual-difficulty-jump-islands",
      wa21: "direct-hang-sloth-log",
      wa24: "dual-height-water-tightropes",
      wa29: "basket-net-swings",
      wa30: "exact-76x52-timber-frames",
      wa33: "rope-to-catch-net",
    };
    const freePhysicsWonderIds = new Set(["wa11", "wa13", "wa20"]);
    for (const [id, template] of Object.entries(wonderPhotoMatchedTemplates)) {
      expect(officialById[id], `${id} photo-matched water geometry`).toMatchObject({
        template,
        detailProfile: expect.stringMatching(/matched/),
        playable: true,
        interactive: !freePhysicsWonderIds.has(id),
      });
      expect(officialById[id].meshCount, `${id} component detail`).toBeGreaterThan(60);
    }
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
    expect(state.officialAttractionMeshCount).toBeGreaterThan(13_400);
    expect(state.animationCount).toBeGreaterThan(600);
    expect(state.staticBatching).toMatchObject({
      enabled: true,
      instanceCount: 6_424,
      drawObjectSavings: 6_363,
      componentCounts: {
        "checkpoint-deck-plank": 1_670,
        "checkpoint-deck-joist": 489,
        "checkpoint-deck-bracket": 1_304,
        "checkpoint-deck-washer": 652,
        "checkpoint-deck-bolt": 652,
        "official-number-backing": 163,
        "official-number-segment": 1_494,
      },
    });
    expect(state.collisionModel).toEqual({
      shape: "capsule",
      radius: 0.42,
      height: 2.18,
      maxStepHeight: 0.56,
      jumpBufferMs: 190,
      coyoteTimeMs: 135,
    });
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
    expect(state.meshCount).toBeGreaterThan(15_300);
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

    const beforeWalkJumpPlayer = await playerState(page);
    const beforeWalkJumpState = await athleticsState(page);
    await page.keyboard.down("w");
    try {
      await page.waitForTimeout(180);
      const movingPlayer = await playerState(page);
      expect(planarDistance(beforeWalkJumpPlayer, movingPlayer)).toBeGreaterThan(0.25);
      await page.keyboard.press("Space");
      await expect.poll(async () => (await athleticsState(page)).jumpCount).toBe(
        beforeWalkJumpState.jumpCount + 1,
      );
      await expect.poll(async () => (await playerState(page)).y).toBeGreaterThan(
        movingPlayer.y + 0.35,
      );
      await page.waitForTimeout(300);
    } finally {
      await page.keyboard.up("w");
    }
    const afterWalkJumpPlayer = await playerState(page);
    const afterWalkJumpState = await athleticsState(page);
    expect(planarDistance(beforeWalkJumpPlayer, afterWalkJumpPlayer)).toBeGreaterThan(1.2);
    expect(afterWalkJumpPlayer.z).toBeGreaterThan(beforeWalkJumpPlayer.z + 0.8);
    expect(afterWalkJumpState.distanceTravelled).toBeGreaterThan(
      beforeWalkJumpState.distanceTravelled + 1,
    );
    await expect.poll(async () => (await athleticsState(page)).grounded, {
      timeout: 2_500,
    }).toBe(true);
    const landedPlayer = await playerState(page);
    expect(landedPlayer.y).toBeCloseTo(beforeWalkJumpPlayer.y, 1);

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
    await page.evaluate(() => window.__voxcelPlayer.setCameraYaw(Math.PI / 2));
    await page.keyboard.down("w");
    try {
      await page.waitForTimeout(180);
      await page.keyboard.press("Space");
      await expect.poll(async () => (
        (await athleticsState(page)).fallCount > beforeFall.fallCount
      ), { timeout: 5_000, intervals: [50, 75, 100] }).toBe(true);
    } finally {
      await page.keyboard.up("w");
    }
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
        rideKind: "manual-path",
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

  test("advances a manual obstacle only while W is held and hops without releasing W", async ({ page }) => {
    await startGame(page);

    const activated = await page.evaluate(() => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("yahhoy");
      return window.__voxcelAthletics.activateInteraction("official-ya10-spiral-ascent");
    });
    expect(activated).toBe(true);
    await expect.poll(async () => {
      const state = await athleticsState(page);
      return {
        rideId: state.activeRideId,
        rideKind: state.activeRideKind,
        progress: state.ziplineProgress,
      };
    }).toEqual({
      rideId: "official-ya10-spiral-ascent",
      rideKind: "manual-path",
      progress: 0,
    });

    const traversalStart = await playerState(page);
    const beforeHop = await athleticsState(page);
    await page.keyboard.down("w");
    try {
      await expect.poll(async () => (await athleticsState(page)).ziplineProgress, {
        timeout: 2_000,
      }).toBeGreaterThan(0.035);
      const movingPlayer = await playerState(page);
      expect(planarDistance(traversalStart, movingPlayer)).toBeGreaterThan(0.35);

      await page.keyboard.press("Space");
      await expect.poll(async () => (await athleticsState(page)).jumpCount).toBe(
        beforeHop.jumpCount + 1,
      );
      await expect.poll(async () => (await athleticsState(page)).grounded).toBe(false);
    } finally {
      await page.keyboard.up("w");
    }

    const stoppedProgress = (await athleticsState(page)).ziplineProgress;
    await page.waitForTimeout(320);
    const afterStop = await athleticsState(page);
    expect(afterStop.activeRideKind).toBe("manual-path");
    expect(afterStop.ziplineProgress).toBeCloseTo(stoppedProgress, 3);
  });

  test("does not replay a buffered jump after a locomotion-locked ride", async ({ page }) => {
    await startGame(page);

    const beforeRide = await page.evaluate(() => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("yahhoy");
      const activated = window.__voxcelAthletics.activateInteraction(
        "official-ya18-ball-slider",
      );
      const state = window.__voxcelAthletics.getState();
      return {
        activated,
        jumpCount: state.jumpCount,
        rideId: state.activeRideId,
        rideKind: state.activeRideKind,
      };
    });
    expect(beforeRide).toEqual({
      activated: true,
      jumpCount: 0,
      rideId: "official-ya18-ball-slider",
      rideKind: "course",
    });

    await page.keyboard.press("Space");
    await expect.poll(async () => (await athleticsState(page)).activeRideId, {
      timeout: 5_000,
    }).toBeNull();
    await page.waitForTimeout(360);
    const afterRide = await athleticsState(page);
    expect(afterRide.jumpCount).toBe(beforeRide.jumpCount);
    expect(afterRide.verticalVelocity).toBeLessThanOrEqual(0);
  });

  test("blocks the player capsule at the first ya05 wall", async ({ page }) => {
    await startGame(page);

    const setup = await page.evaluate(() => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("yahhoy");
      const wall = window.__voxcelAthletics.root.getObjectByName(
        "Greenia:ya05-three-wall-panel-0",
      );
      if (!wall) return null;
      const parameters = wall.geometry.parameters;
      const normalX = Math.cos(wall.rotation.y);
      const normalZ = -Math.sin(wall.rotation.y);
      const startDistance = parameters.width / 2 + 1.25;
      const start = {
        x: wall.position.x - normalX * startDistance,
        y: wall.position.y - parameters.height / 2 + 1.2,
        z: wall.position.z - normalZ * startDistance,
      };
      window.__voxcelPlayer.playerRoot.position.set(start.x, start.y, start.z);
      window.__voxcelPlayer.setCameraYaw(Math.atan2(-normalX, -normalZ));
      window.__voxcelEnhancements?.acceptNextMove?.();
      return {
        start,
        center: { x: wall.position.x, z: wall.position.z },
        normal: { x: normalX, z: normalZ },
        halfWidth: parameters.width / 2,
      };
    });
    expect(setup).not.toBeNull();
    await page.waitForTimeout(120);
    const settledStart = await playerState(page);
    const beforeCollision = await athleticsState(page);

    await holdKey(page, "w", 900);
    const stopped = await playerState(page);
    const afterCollision = await athleticsState(page);
    const forwardTravel = (
      (stopped.x - settledStart.x) * setup.normal.x
      + (stopped.z - settledStart.z) * setup.normal.z
    );
    const centerSide = (
      (stopped.x - setup.center.x) * setup.normal.x
      + (stopped.z - setup.center.z) * setup.normal.z
    );
    expect(afterCollision.collisionCount).toBeGreaterThan(beforeCollision.collisionCount);
    expect(afterCollision.lastCollisionId).toContain("ya05-three-wall-panel-0");
    expect(forwardTravel).toBeLessThan(1.2);
    expect(centerSide).toBeLessThan(-setup.halfWidth);
  });

  test("lands on the ch05 balance beam and follows both visible wa17 tilted edges", async ({ page }) => {
    test.setTimeout(35_000);
    await startGame(page);

    const balanceSetup = await page.evaluate(() => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("chibidoland");
      const start = { x: -94, z: 102.5 };
      const end = { x: -90, z: 104.4 };
      const length = Math.hypot(end.x - start.x, end.z - start.z);
      const axis = { x: (end.x - start.x) / length, z: (end.z - start.z) / length };
      const target = {
        x: start.x - axis.x * 0.8,
        y: 1.2,
        z: start.z - axis.z * 0.8,
      };
      const player = window.__voxcelPlayer;
      const previous = player.playerRoot.position.clone();
      player.playerRoot.position.set(target.x, target.y, target.z);
      player.camera.position.x += target.x - previous.x;
      player.camera.position.y += target.y - previous.y;
      player.camera.position.z += target.z - previous.z;
      player.setCameraYaw(Math.atan2(-axis.x, -axis.z));
      window.__voxcelEnhancements?.acceptNextMove?.();
      return window.__voxcelAthletics.getState();
    });
    await expect.poll(async () => (await athleticsState(page)).grounded).toBe(true);

    await page.keyboard.down("w");
    try {
      await page.keyboard.press("Space");
      await page.waitForTimeout(320);
    } finally {
      await page.keyboard.up("w");
    }
    await expect.poll(async () => {
      const state = await athleticsState(page);
      return state.grounded && state.currentSurfaceId === "beam-surface-chibido-wave-balance-0";
    }, { timeout: 3_000, intervals: [16, 25, 40] }).toBe(true);
    const onBalanceBeam = await athleticsState(page);
    const balancePlayer = await playerState(page);
    expect(onBalanceBeam.jumpCount).toBe(balanceSetup.jumpCount + 1);
    expect(onBalanceBeam.currentSurfaceId).toBe("beam-surface-chibido-wave-balance-0");
    expect(balancePlayer.y).toBeCloseTo(2.01, 2);

    const placeOnSinkingIsland = async (localX) => page.evaluate((targetLocalX) => {
      window.__voxcelAthletics.startChallenge("wonder-amembo");
      const group = window.__voxcelAthletics.root.getObjectByName(
        "Greenia:wa17-sinking-island-0",
      );
      if (!group) return false;
      group.updateWorldMatrix(true, true);
      const top = group.localToWorld(group.position.clone().set(targetLocalX, 0.4, 0));
      const target = { x: top.x, y: top.y + 1.45, z: top.z };
      const player = window.__voxcelPlayer;
      const previous = player.playerRoot.position.clone();
      player.playerRoot.position.set(target.x, target.y, target.z);
      player.camera.position.x += target.x - previous.x;
      player.camera.position.y += target.y - previous.y;
      player.camera.position.z += target.z - previous.z;
      window.__voxcelEnhancements?.acceptNextMove?.();
      return true;
    }, localX);

    const sampleSinkingIsland = async () => page.evaluate(() => {
      const group = window.__voxcelAthletics.root.getObjectByName(
        "Greenia:wa17-sinking-island-0",
      );
      const player = window.__voxcelPlayer.playerRoot.position;
      group.updateWorldMatrix(true, true);
      const plane = group.localToWorld(group.position.clone().set(0, 0.4, 0));
      const normalPoint = group.localToWorld(group.position.clone().set(0, 1.4, 0));
      const normalX = normalPoint.x - plane.x;
      const normalY = normalPoint.y - plane.y;
      const normalZ = normalPoint.z - plane.z;
      const visibleFootY = plane.y - (
        normalX * (player.x - plane.x) + normalZ * (player.z - plane.z)
      ) / normalY;
      const state = window.__voxcelAthletics.getState();
      return {
        grounded: state.grounded,
        currentSurfaceId: state.currentSurfaceId,
        footError: player.y - 1.2 - visibleFootY,
        rotationZ: group.rotation.z,
      };
    });

    for (const localX of [-1.25, 1.25]) {
      expect(await placeOnSinkingIsland(localX)).toBe(true);
      await expect.poll(async () => {
        const sample = await sampleSinkingIsland();
        return sample.grounded
          && sample.currentSurfaceId === "wa17-sinking-island-surface-0"
          && Math.abs(sample.rotationZ) > 0.1
          && Math.abs(sample.footError) < 0.04;
      }, { timeout: 2_500, intervals: [16, 25, 40] }).toBe(true);
      const edge = await sampleSinkingIsland();
      expect(edge.currentSurfaceId).toBe("wa17-sinking-island-surface-0");
      expect(Math.abs(edge.rotationZ)).toBeGreaterThan(0.1);
      expect(Math.abs(edge.footError)).toBeLessThan(0.04);
    }
  });

  test("carries the player once per frame on de08 and follows both visible tilted edges", async ({ page }) => {
    test.setTimeout(35_000);
    await startGame(page);

    const boardName = "Greenia:de08-hanging-rectangle-0";
    await page.evaluate(() => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("de-kairiki");
    });

    const placeOnVisibleBoard = async (worldX) => page.evaluate(({ name, worldX }) => {
      const object = window.__voxcelAthletics.root.getObjectByName(name);
      if (!object) return false;
      const target = { x: worldX, y: 2.05, z: 370.7 };
      const player = window.__voxcelPlayer;
      const previous = player.playerRoot.position.clone();
      player.playerRoot.position.set(target.x, target.y, target.z);
      player.camera.position.x += target.x - previous.x;
      player.camera.position.y += target.y - previous.y;
      player.camera.position.z += target.z - previous.z;
      player.playerShadow?.position?.set(target.x, target.y - 1.2, target.z);
      window.__voxcelEnhancements?.acceptNextMove?.();
      return true;
    }, { name: boardName, worldX });

    const sampleVisibleBoard = async () => page.evaluate((name) => {
      const object = window.__voxcelAthletics.root.getObjectByName(name);
      const player = window.__voxcelPlayer.playerRoot.position;
      const objectPosition = object.getWorldPosition(object.position.clone());
      const topCenter = object.localToWorld(object.position.clone().set(0, 0.5, 0));
      const normalPoint = object.localToWorld(object.position.clone().set(0, 1.5, 0));
      const nx = normalPoint.x - topCenter.x;
      const ny = normalPoint.y - topCenter.y;
      const nz = normalPoint.z - topCenter.z;
      const visibleFootY = topCenter.y
        - (nx * (player.x - topCenter.x) + nz * (player.z - topCenter.z)) / ny;
      const state = window.__voxcelAthletics.getState();
      return {
        player: { x: player.x, y: player.y, z: player.z },
        object: { x: objectPosition.x, y: objectPosition.y, z: objectPosition.z },
        visibleFootY,
        footError: player.y - 1.2 - visibleFootY,
        grounded: state.grounded,
      };
    }, boardName);

    expect(await placeOnVisibleBoard(-197.5)).toBe(true);
    await expect.poll(async () => {
      const sample = await sampleVisibleBoard();
      return sample.grounded && Math.abs(sample.footError) < 0.04;
    }, { timeout: 2_000, intervals: [16, 25, 40] }).toBe(true);

    const beforeStall = await sampleVisibleBoard();
    await page.evaluate(() => {
      const until = performance.now() + 220;
      while (performance.now() < until) {
        // Reproduce a single long main-thread frame.
      }
    });
    let afterStall;
    await expect.poll(async () => {
      afterStall = await sampleVisibleBoard();
      const carryError = {
        x: (afterStall.player.x - beforeStall.player.x)
          - (afterStall.object.x - beforeStall.object.x),
        y: (afterStall.player.y - beforeStall.player.y)
          - (afterStall.object.y - beforeStall.object.y),
        z: (afterStall.player.z - beforeStall.player.z)
          - (afterStall.object.z - beforeStall.object.z),
      };
      return afterStall.grounded && Math.hypot(carryError.x, carryError.y, carryError.z) < 0.05;
    }, { timeout: 1_500, intervals: [16, 25, 40] }).toBe(true);

    const boardTravel = Math.hypot(
      afterStall.object.x - beforeStall.object.x,
      afterStall.object.y - beforeStall.object.y,
      afterStall.object.z - beforeStall.object.z,
    );
    const carryResidual = Math.hypot(
      (afterStall.player.x - beforeStall.player.x)
        - (afterStall.object.x - beforeStall.object.x),
      (afterStall.player.y - beforeStall.player.y)
        - (afterStall.object.y - beforeStall.object.y),
      (afterStall.player.z - beforeStall.player.z)
        - (afterStall.object.z - beforeStall.object.z),
    );
    expect(boardTravel).toBeGreaterThan(0.005);
    expect(carryResidual).toBeLessThan(0.05);

    for (const worldX of [-198.45, -196.55]) {
      expect(await placeOnVisibleBoard(worldX)).toBe(true);
      await expect.poll(async () => {
        const sample = await sampleVisibleBoard();
        return sample.grounded && Math.abs(sample.footError) < 0.04;
      }, { timeout: 2_000, intervals: [16, 25, 40] }).toBe(true);
      const edge = await sampleVisibleBoard();
      expect(edge.grounded).toBe(true);
      expect(Math.abs(edge.footError)).toBeLessThan(0.04);
    }
  });

  test("keeps wa23 on its visible raft and stops a real Space jump below ya03", async ({ page }) => {
    test.setTimeout(40_000);
    await startGame(page);

    const raftName = "Greenia:wa23-raft-platform";
    const reachedRaft = await page.evaluate((name) => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("wonder-amembo");
      const raft = window.__voxcelAthletics.root.getObjectByName(name);
      if (!raft) return false;
      const visibleTop = raft.localToWorld(raft.position.clone().set(0, 0.5, 0));
      const player = window.__voxcelPlayer;
      const previous = player.playerRoot.position.clone();
      player.playerRoot.position.set(visibleTop.x, visibleTop.y + 1.2, visibleTop.z);
      player.camera.position.x += visibleTop.x - previous.x;
      player.camera.position.y += visibleTop.y + 1.2 - previous.y;
      player.camera.position.z += visibleTop.z - previous.z;
      player.playerShadow?.position?.set(visibleTop.x, visibleTop.y, visibleTop.z);
      window.__voxcelEnhancements?.acceptNextMove?.();
      return true;
    }, raftName);
    expect(reachedRaft).toBe(true);
    await expect.poll(async () => (await athleticsState(page)).nearestInteraction, {
      timeout: 2_000,
      intervals: [25, 40, 60],
    }).toBe("official-wa23-pull");

    await page.keyboard.press("e");
    await expect.poll(async () => (await athleticsState(page)).activeRideId).toBe(
      "official-wa23-pull",
    );

    const sampleVisibleRaft = async () => page.evaluate((name) => {
      const object = window.__voxcelAthletics.root.getObjectByName(name);
      const player = window.__voxcelPlayer.playerRoot.position;
      const objectPosition = object.getWorldPosition(object.position.clone());
      const topCenter = object.localToWorld(object.position.clone().set(0, 0.5, 0));
      const normalPoint = object.localToWorld(object.position.clone().set(0, 1.5, 0));
      const nx = normalPoint.x - topCenter.x;
      const ny = normalPoint.y - topCenter.y;
      const nz = normalPoint.z - topCenter.z;
      const visibleFootY = topCenter.y
        - (nx * (player.x - topCenter.x) + nz * (player.z - topCenter.z)) / ny;
      const state = window.__voxcelAthletics.getState();
      return {
        player: { x: player.x, y: player.y, z: player.z },
        object: { x: objectPosition.x, y: objectPosition.y, z: objectPosition.z },
        footError: player.y - 1.2 - visibleFootY,
        grounded: state.grounded,
        rideId: state.activeRideId,
        progress: state.ziplineProgress,
      };
    }, raftName);

    await expect.poll(async () => {
      const sample = await sampleVisibleRaft();
      return sample.rideId === "official-wa23-pull" && sample.progress > 0.25;
    }, { timeout: 3_000, intervals: [25, 40, 60] }).toBe(true);
    const duringRide = await sampleVisibleRaft();
    expect(duringRide.grounded).toBe(true);
    expect(planarDistance(duringRide.player, duringRide.object)).toBeLessThan(0.05);
    expect(Math.abs(duringRide.footError)).toBeLessThan(0.05);

    await expect.poll(async () => (await athleticsState(page)).activeRideId, {
      timeout: 6_000,
      intervals: [40, 60, 100],
    }).toBeNull();
    await expect.poll(async () => {
      const sample = await sampleVisibleRaft();
      return sample.grounded
        && planarDistance(sample.player, sample.object) < 0.05
        && Math.abs(sample.footError) < 0.04;
    }, { timeout: 2_000, intervals: [16, 25, 40] }).toBe(true);
    const afterRide = await sampleVisibleRaft();
    expect(afterRide.grounded).toBe(true);
    expect(planarDistance(afterRide.player, afterRide.object)).toBeLessThan(0.05);
    expect(Math.abs(afterRide.footError)).toBeLessThan(0.04);

    const ceilingName = "Greenia:ya03-hanging-grip-board";
    const beforeHeadJump = await page.evaluate((name) => {
      window.__voxcelAthletics.startChallenge("yahhoy");
      const object = window.__voxcelAthletics.root.getObjectByName(name);
      if (!object) return null;
      const center = object.getWorldPosition(object.position.clone());
      const player = window.__voxcelPlayer;
      const previous = player.playerRoot.position.clone();
      player.playerRoot.position.set(center.x, 1.2, center.z);
      player.camera.position.x += center.x - previous.x;
      player.camera.position.y += 1.2 - previous.y;
      player.camera.position.z += center.z - previous.z;
      player.playerShadow?.position?.set(center.x, 0, center.z);
      window.__voxcelEnhancements?.acceptNextMove?.();
      return window.__voxcelAthletics.getState();
    }, ceilingName);
    expect(beforeHeadJump).not.toBeNull();
    await expect.poll(async () => (await athleticsState(page)).grounded).toBe(true);

    await page.evaluate((name) => {
      const samples = [];
      const startedAt = performance.now();
      window.__greeniaHeadCollisionProbe = { done: false, samples };
      const record = () => {
        const object = window.__voxcelAthletics.root.getObjectByName(name);
        const underside = object.localToWorld(object.position.clone().set(0, -0.5, 0));
        const rootY = window.__voxcelPlayer.playerRoot.position.y;
        samples.push({
          rootY,
          headY: rootY - 1.2 + 2.18,
          undersideY: underside.y,
        });
        if (performance.now() - startedAt < 1_200) {
          requestAnimationFrame(record);
        } else {
          window.__greeniaHeadCollisionProbe.done = true;
        }
      };
      requestAnimationFrame(record);
    }, ceilingName);

    await page.keyboard.press("Space");
    await expect.poll(async () => (await athleticsState(page)).jumpCount).toBe(
      beforeHeadJump.jumpCount + 1,
    );
    await expect.poll(async () => (await athleticsState(page)).grounded).toBe(false);
    await expect.poll(async () => (await athleticsState(page)).grounded, {
      timeout: 2_000,
      intervals: [16, 25, 40],
    }).toBe(true);
    await expect.poll(async () => page.evaluate(() => (
      window.__greeniaHeadCollisionProbe.done
    )), { timeout: 2_000, intervals: [25, 40, 60] }).toBe(true);

    const headResult = await page.evaluate(() => {
      const samples = window.__greeniaHeadCollisionProbe.samples;
      return {
        maxRootY: Math.max(...samples.map(({ rootY }) => rootY)),
        maxPenetration: Math.max(...samples.map(({ headY, undersideY }) => (
          headY - undersideY
        ))),
      };
    });
    const afterHeadJump = await athleticsState(page);
    expect(headResult.maxRootY).toBeGreaterThan(1.8);
    expect(headResult.maxPenetration).toBeLessThanOrEqual(0.01);
    expect(afterHeadJump.collisionCount).toBeGreaterThan(beforeHeadJump.collisionCount);
    expect(afterHeadJump.lastCollisionId).toContain("ya03-hanging-grip-board");
  });

  test("restores the last checkpoint after walking off a high platform", async ({ page }) => {
    await startGame(page);

    const beforeFall = await page.evaluate(() => {
      window.__voxcelAthletics.enterPlayMode();
      window.__voxcelAthletics.startChallenge("zip-slide");
      window.__voxcelPlayer.setCameraYaw(Math.PI);
      return window.__voxcelAthletics.getState();
    });
    await expect.poll(async () => (await athleticsState(page)).grounded).toBe(true);

    await holdKeyUntil(
      page,
      "w",
      athleticsState,
      (state) => state.fallCount > beforeFall.fallCount,
      5_000,
    );
    const falling = await athleticsState(page);
    expect(falling.lastRespawnReason).toBe("fall");
    expect(falling.lastCheckpoint).toMatchObject({
      id: "zip-start",
      areaId: "zip-slide",
      index: 0,
    });

    await expect.poll(async () => (await athleticsState(page)).respawnCount, {
      timeout: 3_000,
    }).toBe(beforeFall.respawnCount + 1);
    await expect.poll(async () => (await athleticsState(page)).gameplayMode).toBe("running");
    const restoredState = await athleticsState(page);
    const restoredPlayer = await playerState(page);
    expect(restoredState.grounded).toBe(true);
    expect(planarDistance(restoredPlayer, restoredState.lastCheckpoint)).toBeLessThan(0.25);
    expect(Math.abs(restoredPlayer.y - restoredState.lastCheckpoint.y)).toBeLessThan(0.2);
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
        window.__voxcelEnhancements?.acceptNextMove?.();
        return window.__voxcelAthletics.enterPlayMode();
      });
      expect(entered, `${transition} setup`).toBe(true);
      await expect.poll(async () => page.evaluate(() => ({
        active: window.__voxcelAthletics.getState().playModeActive,
        locked: window.__voxcelPlayer.movementLocked,
        playingClass: document.body.classList.contains("voxcel-athletic-playing"),
      }))).toEqual({ active: true, locked: true, playingClass: true });
      await expect(hud).toBeVisible();

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
      const releasedAt = await playerState(page);
      await page.waitForTimeout(120);
      const after = await playerState(page);
      expect(planarDistance(releasedAt, after), `${transition} transition`).toBeLessThan(0.25);

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
