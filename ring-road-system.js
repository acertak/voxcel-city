(() => {
  "use strict";

  if (window.__voxcelRingRoad?.ready) return;

  const SYSTEM_VERSION = 2;
  const RUNTIME_TIMEOUT_MS = 40_000;
  const ATHLETICS_WAIT_MS = 15_000;

  // The playable field is a 250x250 block grid inside a 400x400 ground plane, so the
  // loop line sits just outside the radial roads but well inside the walkable clamp.
  const RING_RADIUS = 129;
  const ROAD_HALF_WIDTH = 5;
  const LANE_OFFSET = 2.4;
  const SIDEWALK_HALF_WIDTH = 1.25;
  const SIDEWALK_RADIUS = RING_RADIUS + ROAD_HALF_WIDTH + SIDEWALK_HALF_WIDTH;
  const RAIL_RADIUS = SIDEWALK_RADIUS + SIDEWALK_HALF_WIDTH + 0.35;
  const CLEAR_MARGIN = 3;
  const LANE_RADIUS = RING_RADIUS + LANE_OFFSET;
  const DASH_SPACING = 7;
  const RAIL_POST_SPACING = 12;
  const LAMP_SPACING = 44;
  const JUNCTION_CLEARANCE = 8.5;
  // The city's own grid, whose junctions the loop line ties into.
  const RADIAL_ROADS = Object.freeze({
    x: Object.freeze([0, 44]),
    z: Object.freeze([-70, 0, 70]),
  });
  const RADIAL_HALF_WIDTH = 4;
  const RADIAL_LANE_OFFSET = 2;
  const RADIAL_SIDEWALK_OFFSET = 5.25;
  const CORRIDOR_SWEEP_INTERVAL_MS = 1_000;
  const CORRIDOR_SWEEP_WINDOW_MS = 30_000;

  const runtime = {
    ready: false,
    status: "waiting",
    reason: "initializing",
    error: null,
    handle: null,
    constructors: null,
    root: null,
    clearedSceneryCount: 0,
    clearedTreeCount: 0,
    movedLandmarkCount: 0,
    movedLandmarkMeshCount: 0,
    meshCount: 0,
    registeredRoadRects: 0,
    lastSweepAt: 0,
    readyAt: 0,
    unregisterBeforeRender: null,
  };

  const api = {
    __voxcelRingRoadSystem: true,
    version: SYSTEM_VERSION,
    getState,
    geometry,
  };
  Object.defineProperty(api, "ready", { enumerable: true, get: () => runtime.ready });
  window.__voxcelRingRoad = api;

  function chebyshev(x, z) {
    return Math.max(Math.abs(x), Math.abs(z));
  }

  function insideRingCorridor(x, z) {
    const radius = chebyshev(x, z);
    return (
      radius >= RING_RADIUS - ROAD_HALF_WIDTH - CLEAR_MARGIN &&
      radius <= RAIL_RADIUS + CLEAR_MARGIN
    );
  }

  function findPrototypeConstructor(object, methodName) {
    let prototype = Object.getPrototypeOf(object);
    while (prototype) {
      if (Object.prototype.hasOwnProperty.call(prototype, methodName)) return prototype.constructor;
      prototype = Object.getPrototypeOf(prototype);
    }
    return null;
  }

  function resolveConstructors(handle) {
    const found = {
      Group: handle.playerRoot?.constructor || null,
      Mesh: null,
      BoxGeometry: null,
      PlaneGeometry: null,
      CylinderGeometry: null,
      Material: null,
    };
    handle.scene.traverse((object) => {
      if (!found.Mesh && object.isMesh) found.Mesh = object.constructor;
      const type = object.geometry?.type;
      if (type === "BoxGeometry" && !found.BoxGeometry) found.BoxGeometry = object.geometry.constructor;
      if (type === "PlaneGeometry" && !found.PlaneGeometry) found.PlaneGeometry = object.geometry.constructor;
      if (type === "CylinderGeometry" && !found.CylinderGeometry) found.CylinderGeometry = object.geometry.constructor;
      if (found.Material) return;
      const candidates = Array.isArray(object.material) ? object.material : [object.material];
      for (const candidate of candidates) {
        if (candidate?.type === "MeshStandardMaterial") {
          found.Material = candidate.constructor;
          break;
        }
      }
    });
    if (!found.Group && found.Mesh) {
      found.Group = findPrototypeConstructor(handle.playerRoot, "traverse");
    }
    const missing = Object.entries(found)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length) {
      throw new Error(`Could not resolve the ring road Three.js constructors: ${missing.join(", ")}`);
    }
    return found;
  }

  // Reuses the materials the city already built for its radial roads so the loop line
  // matches the existing asphalt, lane paint and pavement instead of inventing new looks.
  function collectRoadMaterials(handle, constructors) {
    const found = { asphalt: null, dash: null, edge: null, sidewalk: null };
    handle.scene.traverse((object) => {
      if (!object.isMesh || object.geometry?.type !== "PlaneGeometry") return;
      const parameters = object.geometry.parameters || {};
      const width = parameters.width || 0;
      const height = parameters.height || 0;
      const long = Math.max(width, height);
      const short = Math.min(width, height);
      const y = object.position.y;
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      if (!material) return;
      if (!found.asphalt && Math.abs(y - 0.02) < 0.003 && long > 200 && short > 5) found.asphalt = material;
      if (!found.sidewalk && Math.abs(y - 0.018) < 0.003 && long > 200 && Math.abs(short - 2.5) < 0.3) found.sidewalk = material;
      if (!found.edge && Math.abs(y - 0.024) < 0.003 && long > 200 && Math.abs(short - 0.18) < 0.06) found.edge = material;
      if (!found.dash && Math.abs(y - 0.026) < 0.003 && Math.abs(long - 1.8) < 0.25 && Math.abs(short - 0.18) < 0.06) found.dash = material;
    });
    const fallback = (color, roughness) => new constructors.Material({ color, roughness });
    return {
      asphalt: found.asphalt || fallback(0x3d4046, 0.93),
      dash: found.dash || fallback(0xf1f1e6, 0.7),
      edge: found.edge || fallback(0xf1f1e6, 0.65),
      sidewalk: found.sidewalk || fallback(0xb9b6ad, 0.92),
    };
  }

  function decorate(mesh, name) {
    mesh.name = name;
    mesh.userData ||= {};
    mesh.userData.voxcelRingRoad = true;
    // Every loop-line prop is scenery: the carriageway must stay clear for the bus.
    mesh.userData.collisionMode = "none";
    runtime.meshCount += 1;
    return mesh;
  }

  function addPlane(name, width, depth, x, y, z, material) {
    const { Mesh, PlaneGeometry } = runtime.constructors;
    const mesh = new Mesh(new PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    runtime.root.add(mesh);
    return decorate(mesh, name);
  }

  function addBox(name, size, position, material, options = {}) {
    const { Mesh, BoxGeometry } = runtime.constructors;
    const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.y = options.rotationY || 0;
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    runtime.root.add(mesh);
    return decorate(mesh, name);
  }

  function addCylinder(name, radius, height, position, material) {
    const { Mesh, CylinderGeometry } = runtime.constructors;
    const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 8), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    runtime.root.add(mesh);
    return decorate(mesh, name);
  }

  function nearJunction(edge, along) {
    const junctions = edge === "north" || edge === "south" ? RADIAL_ROADS.x : RADIAL_ROADS.z;
    return junctions.some((junction) => Math.abs(along - junction) < JUNCTION_CLEARANCE);
  }

  // The four straights are laid out as a Chebyshev annulus: north/south span the full
  // width (they own the corners) and east/west fill the gap between them.
  const EDGES = Object.freeze([
    Object.freeze({ id: "north", axis: "ew", sign: 1 }),
    Object.freeze({ id: "south", axis: "ew", sign: -1 }),
    Object.freeze({ id: "east", axis: "ns", sign: 1 }),
    Object.freeze({ id: "west", axis: "ns", sign: -1 }),
  ]);

  // `lateral` is signed outward from the city centre, so the same offset means "kerb side"
  // on every edge of the loop.
  function edgePoint(edge, along, lateral) {
    const offset = edge.sign * (RING_RADIUS + lateral);
    if (edge.axis === "ew") return { x: along, z: offset };
    return { x: offset, z: along };
  }

  function buildCarriageway(materials) {
    const outerSpan = 2 * (RING_RADIUS + ROAD_HALF_WIDTH);
    const innerSpan = 2 * (RING_RADIUS - ROAD_HALF_WIDTH);
    for (const edge of EDGES) {
      const center = edge.axis === "ew"
        ? { x: 0, z: edge.sign * RING_RADIUS }
        : { x: edge.sign * RING_RADIUS, z: 0 };
      const size = edge.axis === "ew"
        ? { width: outerSpan, depth: 2 * ROAD_HALF_WIDTH }
        : { width: 2 * ROAD_HALF_WIDTH, depth: innerSpan };
      addPlane(
        `ring-asphalt-${edge.id}`,
        size.width,
        size.depth,
        center.x,
        // A hair above the radial roads so the shared junction squares never z-fight.
        0.021,
        center.z,
        materials.asphalt,
      );
    }
  }

  function buildLaneMarkings(materials) {
    const limit = RING_RADIUS - ROAD_HALF_WIDTH;
    for (const edge of EDGES) {
      for (let along = -limit + DASH_SPACING / 2; along < limit; along += DASH_SPACING) {
        if (nearJunction(edge.id, along)) continue;
        const point = edgePoint(edge, along, 0);
        const width = edge.axis === "ew" ? 1.8 : 0.18;
        const depth = edge.axis === "ew" ? 0.18 : 1.8;
        addPlane(
          `ring-lane-dash-${edge.id}-${Math.round(along)}`,
          width,
          depth,
          point.x,
          0.026,
          point.z,
          materials.dash,
        );
      }
      for (const lateral of [-(ROAD_HALF_WIDTH - 0.7), ROAD_HALF_WIDTH - 0.7]) {
        const point = edgePoint(edge, 0, lateral);
        const width = edge.axis === "ew" ? 2 * limit : 0.18;
        const depth = edge.axis === "ew" ? 0.18 : 2 * limit;
        addPlane(
          `ring-lane-edge-${edge.id}-${lateral > 0 ? "outer" : "inner"}`,
          width,
          depth,
          point.x,
          0.024,
          point.z,
          materials.edge,
        );
      }
    }
  }

  function buildCrosswalks(materials) {
    for (const edge of EDGES) {
      const junctions = edge.axis === "ew" ? RADIAL_ROADS.x : RADIAL_ROADS.z;
      for (const junction of junctions) {
        for (const side of [-1, 1]) {
          const along = junction + side * 6.4;
          for (let bar = 0; bar < 6; bar += 1) {
            const lateral = -ROAD_HALF_WIDTH + 0.9 + bar * 1.65;
            const point = edgePoint(edge, along, lateral);
            // Zebra bars run with the traffic and repeat across the carriageway.
            const width = edge.axis === "ew" ? 5.2 : 0.75;
            const depth = edge.axis === "ew" ? 0.75 : 5.2;
            addPlane(
              `ring-crosswalk-${edge.id}-${junction}-${side}-${bar}`,
              width,
              depth,
              point.x,
              0.027,
              point.z,
              materials.edge,
            );
          }
        }
      }
    }
  }

  function buildSidewalk(materials) {
    const outerSpan = 2 * (SIDEWALK_RADIUS + SIDEWALK_HALF_WIDTH);
    const innerSpan = 2 * (SIDEWALK_RADIUS - SIDEWALK_HALF_WIDTH);
    for (const edge of EDGES) {
      const center = edge.axis === "ew"
        ? { x: 0, z: edge.sign * SIDEWALK_RADIUS }
        : { x: edge.sign * SIDEWALK_RADIUS, z: 0 };
      const size = edge.axis === "ew"
        ? { width: outerSpan, depth: 2 * SIDEWALK_HALF_WIDTH }
        : { width: 2 * SIDEWALK_HALF_WIDTH, depth: innerSpan };
      addPlane(
        `ring-sidewalk-${edge.id}`,
        size.width,
        size.depth,
        center.x,
        0.018,
        center.z,
        materials.sidewalk,
      );
    }
  }

  function buildGuardRail(constructors) {
    const railMaterial = new constructors.Material({ color: 0xc9cfd6, roughness: 0.52, metalness: 0.34 });
    const postMaterial = new constructors.Material({ color: 0x7f858d, roughness: 0.66, metalness: 0.22 });
    const limit = RAIL_RADIUS;
    for (const edge of EDGES) {
      const center = edge.axis === "ew"
        ? { x: 0, z: edge.sign * RAIL_RADIUS }
        : { x: edge.sign * RAIL_RADIUS, z: 0 };
      const size = edge.axis === "ew" ? [2 * limit, 0.22, 0.16] : [0.16, 0.22, 2 * limit];
      addBox(`ring-rail-${edge.id}`, size, [center.x, 0.86, center.z], railMaterial, {
        receiveShadow: false,
      });
      for (let along = -limit + RAIL_POST_SPACING / 2; along < limit; along += RAIL_POST_SPACING) {
        if (nearJunction(edge.id, along)) continue;
        const point = edge.axis === "ew"
          ? { x: along, z: edge.sign * RAIL_RADIUS }
          : { x: edge.sign * RAIL_RADIUS, z: along };
        addBox(
          `ring-rail-post-${edge.id}-${Math.round(along)}`,
          [0.16, 0.9, 0.16],
          [point.x, 0.45, point.z],
          postMaterial,
          { receiveShadow: false },
        );
      }
    }
  }

  function buildStreetLamps(constructors) {
    const poleMaterial = new constructors.Material({ color: 0x4b5259, roughness: 0.72, metalness: 0.24 });
    const lampMaterial = new constructors.Material({
      color: 0xfff0c2,
      emissive: 0xffe08a,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    });
    const limit = RING_RADIUS - ROAD_HALF_WIDTH;
    for (const edge of EDGES) {
      for (let along = -limit + LAMP_SPACING / 2; along < limit; along += LAMP_SPACING) {
        if (nearJunction(edge.id, along)) continue;
        const point = edgePoint(edge, along, ROAD_HALF_WIDTH + 1.1);
        addCylinder(`ring-lamp-pole-${edge.id}-${Math.round(along)}`, 0.09, 4.6, [point.x, 2.3, point.z], poleMaterial);
        const inward = edgePoint(edge, along, ROAD_HALF_WIDTH - 0.6);
        addBox(
          `ring-lamp-arm-${edge.id}-${Math.round(along)}`,
          edge.axis === "ew" ? [0.1, 0.1, 1.9] : [1.9, 0.1, 0.1],
          [(point.x + inward.x) / 2, 4.5, (point.z + inward.z) / 2],
          poleMaterial,
          { receiveShadow: false },
        );
        addBox(
          `ring-lamp-head-${edge.id}-${Math.round(along)}`,
          [0.5, 0.16, 0.5],
          [inward.x, 4.38, inward.z],
          lampMaterial,
          { receiveShadow: false },
        );
      }
    }
  }

  function isProceduralTree(object) {
    if (!object?.isGroup || object.children.length < 5) return false;
    let spheres = 0;
    let trunk = false;
    for (const child of object.children) {
      const geometry = child.geometry;
      if (geometry?.type === "SphereGeometry") spheres += 1;
      if (geometry?.type === "CylinderGeometry" && (geometry.parameters?.height ?? 0) > 1.5) {
        trunk = true;
      }
    }
    return trunk && spheres >= 4;
  }

  // Scattered trees are single scene groups, so they can simply be taken down. The scene is
  // the source of truth for where they actually stand — the city world system relocates some
  // of them with its residence lots, which leaves their registry entry behind.
  function clearBlockingTrees(handle) {
    for (const object of handle.scene.children) {
      if (object === runtime.root || !isProceduralTree(object)) continue;
      if (!insideRingCorridor(object.position.x, object.position.z)) continue;
      object.userData ||= {};
      object.userData.voxcelRingRoadCleared = true;
      object.userData.collisionMode = "none";
      if (!object.visible) continue;
      object.visible = false;
      runtime.clearedSceneryCount += 1;
    }

    const trees = handle.sceneryTrees;
    if (!Array.isArray(trees)) return;
    for (let index = trees.length - 1; index >= 0; index -= 1) {
      if (!insideRingCorridor(trees[index].x, trees[index].z)) continue;
      trees.splice(index, 1);
      runtime.clearedTreeCount += 1;
    }
  }

  function isRelocatable(object) {
    return object.visible && !(
      object === runtime.root ||
      object === runtime.handle.playerRoot ||
      object === runtime.handle.playerShadow ||
      object.userData?.voxcelRingRoad ||
      object.userData?.voxcelCloud ||
      object.userData?.voxcelAthletic ||
      object.userData?.voxcelVehicleRoot
    );
  }

  // Only solid boxes and roof cones decide whether a landmark blocks traffic; the flat
  // garden and driveway decals that come with it just end up under the asphalt.
  function solidReach(object) {
    const type = object.geometry?.type;
    if (type !== "BoxGeometry" && type !== "ConeGeometry") return null;
    const parameters = object.geometry.parameters || {};
    const halfWidth = (parameters.width ?? parameters.radius * 2 ?? 0) / 2;
    const halfDepth = (parameters.depth ?? parameters.radius * 2 ?? 0) / 2;
    return {
      x: Math.abs(object.position.x) + halfWidth,
      z: Math.abs(object.position.z) + halfDepth,
    };
  }

  // Landmarks around the rim are loose scene meshes (a tower shell plus every window, a
  // residence plus its fence posts), so hiding by position would leave pieces floating.
  // Anything that would stand in the new carriageway is shifted inward as a whole instead.
  function collectLandmarkClusters(handle) {
    const clusters = new Map();
    const claim = (key, object) => {
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key).push(object);
    };

    const towers = [];
    for (const object of handle.scene.children) {
      if (!object.isMesh || object.geometry?.type !== "BoxGeometry") continue;
      // Landmarks the adventure park has already demolished are left exactly where they
      // are: it identifies them by position when it takes over its own site.
      if (!object.visible) continue;
      const parameters = object.geometry.parameters || {};
      if (!(parameters.height >= 18)) continue;
      towers.push({
        id: `tower:${towers.length}`,
        x: object.position.x,
        z: object.position.z,
        halfWidth: parameters.width / 2,
        halfDepth: parameters.depth / 2,
      });
    }

    for (const object of handle.scene.children) {
      if (!isRelocatable(object)) continue;
      const residenceIndex = object.userData?.voxcelDecorativeResidence;
      if (Number.isInteger(residenceIndex)) {
        claim(`residence:${residenceIndex}`, object);
        continue;
      }
      const tower = towers.find((candidate) => (
        Math.abs(object.position.x - candidate.x) <= candidate.halfWidth + 1.4 &&
        Math.abs(object.position.z - candidate.z) <= candidate.halfDepth + 1.4
      ));
      if (tower) claim(tower.id, object);
    }
    return clusters;
  }

  function relocateBlockingLandmarks(handle) {
    const innerLimit = RING_RADIUS - ROAD_HALF_WIDTH - 0.5;
    for (const members of collectLandmarkClusters(handle).values()) {
      let reachX = 0;
      let reachZ = 0;
      let anchorX = 0;
      let anchorZ = 0;
      for (const object of members) {
        const reach = solidReach(object);
        if (!reach) continue;
        if (reach.x > reachX) {
          reachX = reach.x;
          anchorX = object.position.x;
        }
        if (reach.z > reachZ) {
          reachZ = reach.z;
          anchorZ = object.position.z;
        }
      }
      const shiftX = reachX > innerLimit ? (innerLimit - reachX) * Math.sign(anchorX || 1) : 0;
      const shiftZ = reachZ > innerLimit ? (innerLimit - reachZ) * Math.sign(anchorZ || 1) : 0;
      if (!shiftX && !shiftZ) continue;
      for (const object of members) {
        object.position.x += shiftX;
        object.position.z += shiftZ;
        object.userData ||= {};
        object.userData.voxcelRingRoadMoved = true;
        runtime.movedLandmarkMeshCount += 1;
      }
      runtime.movedLandmarkCount += 1;
    }
  }

  // Both passes are idempotent, which matters: the other city systems keep rearranging
  // scenery (residence lots drag nearby trees along) for several seconds after the runtime
  // bridge goes live, so the corridor is swept again while the world settles.
  function clearRingCorridor(handle) {
    clearBlockingTrees(handle);
    relocateBlockingLandmarks(handle);
    runtime.lastSweepAt = performance.now();
  }

  function sweepRingCorridor(now) {
    if (now - runtime.lastSweepAt < CORRIDOR_SWEEP_INTERVAL_MS) return;
    if (now - runtime.readyAt > CORRIDOR_SWEEP_WINDOW_MS) return;
    clearRingCorridor(runtime.handle);
  }

  function registerRoadRects(handle) {
    const rects = handle.roadRects;
    if (!Array.isArray(rects)) return;
    const outerSpan = 2 * (RING_RADIUS + ROAD_HALF_WIDTH);
    const innerSpan = 2 * (RING_RADIUS - ROAD_HALF_WIDTH);
    const additions = [
      { x: 0, z: RING_RADIUS, w: outerSpan, d: 2 * ROAD_HALF_WIDTH },
      { x: 0, z: -RING_RADIUS, w: outerSpan, d: 2 * ROAD_HALF_WIDTH },
      { x: RING_RADIUS, z: 0, w: 2 * ROAD_HALF_WIDTH, d: innerSpan },
      { x: -RING_RADIUS, z: 0, w: 2 * ROAD_HALF_WIDTH, d: innerSpan },
    ];
    rects.push(...additions);
    runtime.registeredRoadRects = additions.length;
  }

  function registerMapRing(handle) {
    const existing = handle.roads && typeof handle.roads === "object" ? handle.roads : null;
    handle.roads = {
      x: existing?.x ? [...existing.x] : [...RADIAL_ROADS.x],
      z: existing?.z ? [...existing.z] : [...RADIAL_ROADS.z],
      width: existing?.width ?? 10,
      rings: [
        ...(Array.isArray(existing?.rings) ? existing.rings : []),
        { radius: RING_RADIUS, width: 2 * ROAD_HALF_WIDTH, id: "loop-line" },
      ],
    };
    window.__voxcelMap?.refresh?.();
  }

  function update(now) {
    if (!runtime.handle) return;
    sweepRingCorridor(now);
  }

  function getState() {
    return {
      ready: runtime.ready,
      version: SYSTEM_VERSION,
      status: runtime.status,
      reason: runtime.reason,
      error: runtime.error,
      radius: RING_RADIUS,
      roadWidth: 2 * ROAD_HALF_WIDTH,
      laneOffset: LANE_OFFSET,
      laneRadius: LANE_RADIUS,
      sidewalkRadius: SIDEWALK_RADIUS,
      meshCount: runtime.meshCount,
      clearedSceneryCount: runtime.clearedSceneryCount,
      clearedTreeCount: runtime.clearedTreeCount,
      movedLandmarkCount: runtime.movedLandmarkCount,
      movedLandmarkMeshCount: runtime.movedLandmarkMeshCount,
      registeredRoadRects: runtime.registeredRoadRects,
    };
  }

  // The road network the traffic system routes over: the loop line plus the radial grid
  // it already shares junctions with.
  function geometry() {
    return {
      ring: {
        radius: RING_RADIUS,
        halfWidth: ROAD_HALF_WIDTH,
        laneOffset: LANE_OFFSET,
        sidewalkRadius: SIDEWALK_RADIUS,
      },
      radial: {
        x: [...RADIAL_ROADS.x],
        z: [...RADIAL_ROADS.z],
        halfWidth: RADIAL_HALF_WIDTH,
        laneOffset: RADIAL_LANE_OFFSET,
        sidewalkOffset: RADIAL_SIDEWALK_OFFSET,
      },
    };
  }

  function initialize(handle) {
    runtime.handle = handle;
    runtime.status = "initializing";
    runtime.constructors = resolveConstructors(handle);
    runtime.root = new runtime.constructors.Group();
    runtime.root.name = "VoxcelRingRoadRoot";
    runtime.root.userData.voxcelRingRoad = true;
    handle.scene.add(runtime.root);

    clearRingCorridor(handle);
    const materials = collectRoadMaterials(handle, runtime.constructors);
    buildCarriageway(materials);
    buildLaneMarkings(materials);
    buildCrosswalks(materials);
    buildSidewalk(materials);
    buildGuardRail(runtime.constructors);
    buildStreetLamps(runtime.constructors);

    registerRoadRects(handle);
    registerMapRing(handle);

    handle.scene.updateMatrixWorld(true);
    window.__voxcelEnhancements?.refreshColliders?.();
    runtime.unregisterBeforeRender = window.__voxcelEnhancements.registerBeforeRender(update);

    runtime.ready = true;
    runtime.readyAt = performance.now();
    runtime.status = "ready";
    runtime.reason = "ready";
    window.dispatchEvent(new CustomEvent("voxcel:ring-road-ready", { detail: getState() }));
  }

  function fail(error) {
    runtime.ready = false;
    runtime.status = "error";
    runtime.reason = error instanceof Error ? error.message : String(error);
    runtime.error = runtime.reason;
    console.error("Voxcel ring road system failed to initialize.", error);
  }

  const startedAt = performance.now();
  const timer = window.setInterval(() => {
    const handle = window.__voxcelPlayer;
    // The adventure park identifies the landmarks it demolishes by position, so it has to
    // claim its site before anything here starts shifting scenery around.
    const parkSettled = window.__voxcelAthletics?.ready === true ||
      performance.now() - startedAt > ATHLETICS_WAIT_MS;
    if (
      parkSettled &&
      handle?.scene?.traverse &&
      handle?.playerRoot?.position &&
      handle?.playerShadow?.position &&
      handle?.camera?.position &&
      handle?.state &&
      Array.isArray(handle?.vehicles) &&
      handle.vehicles.length > 0 &&
      typeof handle.setMovementLocked === "function" &&
      window.__voxcelEnhancements?.ready
    ) {
      window.clearInterval(timer);
      Promise.resolve()
        .then(() => initialize(handle))
        .catch(fail);
      return;
    }
    if (performance.now() - startedAt > RUNTIME_TIMEOUT_MS) {
      window.clearInterval(timer);
      runtime.status = "error";
      runtime.reason = "runtime-bridge-timeout";
    }
  }, 30);
})();
