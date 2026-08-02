(() => {
  "use strict";

  if (window.__voxcelRingRoad?.ready) return;

  const SYSTEM_VERSION = 1;
  const RUNTIME_TIMEOUT_MS = 25_000;
  const VEHICLE_DETAIL_TIMEOUT_MS = 9_000;

  // The playable field is a 250x250 block grid inside a 400x400 ground plane, so the
  // loop line sits just outside the radial roads but well inside the walkable clamp.
  const RING_RADIUS = 129;
  const ROAD_HALF_WIDTH = 5;
  const LANE_OFFSET = 2.4;
  const SIDEWALK_HALF_WIDTH = 1.25;
  const SIDEWALK_RADIUS = RING_RADIUS + ROAD_HALF_WIDTH + SIDEWALK_HALF_WIDTH;
  const RAIL_RADIUS = SIDEWALK_RADIUS + SIDEWALK_HALF_WIDTH + 0.35;
  const CLEAR_MARGIN = 3;
  const CORNER_RADIUS = 12;
  // Traffic keeps right, so a counter-clockwise loop rides the outer lane the whole way.
  const LANE_RADIUS = RING_RADIUS + LANE_OFFSET;
  const DASH_SPACING = 7;
  const RAIL_POST_SPACING = 12;
  const LAMP_SPACING = 44;
  const JUNCTION_CLEARANCE = 8.5;
  const RADIAL_ROADS = Object.freeze({
    x: Object.freeze([0, 44]),
    z: Object.freeze([-70, 0, 70]),
  });

  const RING_CRUISE_SPEED = 11;
  const RING_ACCELERATION = 6;
  const RING_BRAKING = 10;
  const CITY_BUS_RIDE_SPEED = 8.4;
  const BUS_DWELL_MS = 4_500;
  const BUS_STOP_TOLERANCE = 2;
  const YIELD_DISTANCE = 11;
  const YIELD_HALF_WIDTH = 3.4;
  const CORRIDOR_SWEEP_INTERVAL_MS = 1_000;
  const CORRIDOR_SWEEP_WINDOW_MS = 30_000;

  const BUS_STOPS = Object.freeze([
    Object.freeze({ id: "east-bay", name: "東ベイ通り", anchor: Object.freeze({ x: LANE_RADIUS, z: 0 }) }),
    Object.freeze({ id: "north-44", name: "北44番街", anchor: Object.freeze({ x: 44, z: LANE_RADIUS }) }),
    Object.freeze({ id: "north-central", name: "北セントラル", anchor: Object.freeze({ x: 0, z: LANE_RADIUS }) }),
    Object.freeze({ id: "west-adventure", name: "西アドベンチャー口", anchor: Object.freeze({ x: -LANE_RADIUS, z: 70 }) }),
    Object.freeze({ id: "west-green", name: "西グリーンパーク", anchor: Object.freeze({ x: -LANE_RADIUS, z: 0 }) }),
    Object.freeze({ id: "west-south", name: "西サウスゲート", anchor: Object.freeze({ x: -LANE_RADIUS, z: -70 }) }),
    Object.freeze({ id: "south-central", name: "南セントラル", anchor: Object.freeze({ x: 0, z: -LANE_RADIUS }) }),
    Object.freeze({ id: "south-44", name: "南44番街", anchor: Object.freeze({ x: 44, z: -LANE_RADIUS }) }),
  ]);

  const runtime = {
    ready: false,
    status: "waiting",
    reason: "initializing",
    error: null,
    handle: null,
    constructors: null,
    root: null,
    path: null,
    stops: [],
    ringBus: null,
    ringBusState: null,
    clearedSceneryCount: 0,
    clearedTreeCount: 0,
    movedLandmarkCount: 0,
    movedLandmarkMeshCount: 0,
    meshCount: 0,
    registeredRoadRects: 0,
    ride: null,
    hud: null,
    hudMarkup: null,
    lastFrameAt: 0,
    lastSweepAt: 0,
    readyAt: 0,
    unregisterBeforeRender: null,
  };

  const api = {
    __voxcelRingRoadSystem: true,
    version: SYSTEM_VERSION,
    getState,
  };
  Object.defineProperty(api, "ready", { enumerable: true, get: () => runtime.ready });
  window.__voxcelRingRoad = api;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function approach(current, target, rate, dt) {
    const delta = target - current;
    const step = rate * dt;
    if (Math.abs(delta) <= step) return target;
    return current + Math.sign(delta) * step;
  }

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

  function buildBusStopShelter(constructors, stop, index) {
    const poleMaterial = new constructors.Material({ color: 0x3f4750, roughness: 0.7, metalness: 0.26 });
    const signMaterial = new constructors.Material({
      color: 0x4fbf8b,
      emissive: 0x1f6b4a,
      emissiveIntensity: 0.32,
      roughness: 0.48,
    });
    const roofMaterial = new constructors.Material({ color: 0xd7dee6, roughness: 0.6, metalness: 0.18 });
    const benchMaterial = new constructors.Material({ color: 0x8d6a45, roughness: 0.88 });
    const edge = stop.edge;
    // Centred on the pavement rather than spilling onto the grass behind it.
    const shelter = edgePoint(edge, stop.along, ROAD_HALF_WIDTH + SIDEWALK_HALF_WIDTH);
    const alongAxis = edge.axis === "ew" ? "x" : "z";
    const spread = (offset) => (alongAxis === "x"
      ? [shelter.x + offset, 0, shelter.z]
      : [shelter.x, 0, shelter.z + offset]);

    for (const offset of [-1.5, 1.5]) {
      const base = spread(offset);
      addCylinder(`ring-stop-post-${stop.id}-${offset}`, 0.08, 2.6, [base[0], 1.3, base[2]], poleMaterial);
    }
    addBox(
      `ring-stop-roof-${stop.id}`,
      alongAxis === "x" ? [3.6, 0.14, 1.5] : [1.5, 0.14, 3.6],
      [shelter.x, 2.62, shelter.z],
      roofMaterial,
      { receiveShadow: false },
    );
    addBox(
      `ring-stop-bench-${stop.id}`,
      alongAxis === "x" ? [2.6, 0.12, 0.5] : [0.5, 0.12, 2.6],
      [shelter.x, 0.55, shelter.z],
      benchMaterial,
    );
    const signBase = edgePoint(edge, stop.along - 2.6, ROAD_HALF_WIDTH + 1.4);
    addCylinder(`ring-stop-sign-pole-${stop.id}`, 0.06, 2.4, [signBase.x, 1.2, signBase.z], poleMaterial);
    addBox(
      `ring-stop-sign-${stop.id}`,
      alongAxis === "x" ? [0.95, 0.6, 0.1] : [0.1, 0.6, 0.95],
      [signBase.x, 2.35, signBase.z],
      signMaterial,
      { receiveShadow: false },
    );
    return index;
  }

  function buildLoopPath() {
    const lane = LANE_RADIUS;
    const corner = CORNER_RADIUS;
    const straight = lane - corner;
    const points = [];
    const push = (x, z) => {
      const previous = points[points.length - 1];
      if (previous && Math.hypot(previous.x - x, previous.z - z) < 0.0005) return;
      points.push({ x, z });
    };
    const arc = (centerX, centerZ, fromAngle, toAngle) => {
      const steps = 8;
      for (let step = 0; step <= steps; step += 1) {
        const angle = fromAngle + (toAngle - fromAngle) * (step / steps);
        push(centerX + Math.cos(angle) * corner, centerZ + Math.sin(angle) * corner);
      }
    };

    push(lane, -straight);
    push(lane, straight);
    arc(straight, straight, 0, Math.PI / 2);
    push(-straight, lane);
    arc(-straight, straight, Math.PI / 2, Math.PI);
    push(-lane, -straight);
    arc(-straight, -straight, Math.PI, Math.PI * 1.5);
    push(straight, -lane);
    arc(straight, -straight, Math.PI * 1.5, Math.PI * 2);

    const segments = [];
    let total = 0;
    for (let index = 0; index < points.length; index += 1) {
      const from = points[index];
      const to = points[(index + 1) % points.length];
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      if (length < 0.0005) continue;
      segments.push({ from, to, length, start: total });
      total += length;
    }
    return { points, segments, total };
  }

  function samplePath(path, distance) {
    const total = path.total;
    const target = ((distance % total) + total) % total;
    let low = 0;
    let high = path.segments.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (path.segments[middle].start <= target) low = middle;
      else high = middle - 1;
    }
    const segment = path.segments[low];
    const amount = clamp((target - segment.start) / segment.length, 0, 1);
    const dx = segment.to.x - segment.from.x;
    const dz = segment.to.z - segment.from.z;
    return {
      x: segment.from.x + dx * amount,
      z: segment.from.z + dz * amount,
      heading: Math.atan2(dx, dz),
    };
  }

  function pathDistanceOf(path, x, z) {
    let best = { distance: 0, error: Infinity };
    for (const segment of path.segments) {
      const dx = segment.to.x - segment.from.x;
      const dz = segment.to.z - segment.from.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared < 1e-6) continue;
      const amount = clamp(
        ((x - segment.from.x) * dx + (z - segment.from.z) * dz) / lengthSquared,
        0,
        1,
      );
      const px = segment.from.x + dx * amount;
      const pz = segment.from.z + dz * amount;
      const error = Math.hypot(px - x, pz - z);
      if (error < best.error) best = { distance: segment.start + segment.length * amount, error };
    }
    return best.distance;
  }

  function loopAhead(path, from, to) {
    const delta = to - from;
    return ((delta % path.total) + path.total) % path.total;
  }

  function resolveStops(path) {
    const resolved = BUS_STOPS.map((stop) => {
      const radius = chebyshev(stop.anchor.x, stop.anchor.z);
      const edge = EDGES.find((candidate) => (
        candidate.axis === "ew"
          ? Math.abs(stop.anchor.z) === radius && Math.sign(stop.anchor.z) === candidate.sign
          : Math.abs(stop.anchor.x) === radius && Math.sign(stop.anchor.x) === candidate.sign
      )) || EDGES[0];
      const along = edge.axis === "ew" ? stop.anchor.x : stop.anchor.z;
      return {
        ...stop,
        edge,
        along,
        distance: pathDistanceOf(path, stop.anchor.x, stop.anchor.z),
      };
    });
    resolved.sort((left, right) => left.distance - right.distance);
    return resolved;
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
    return !(
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

  function waitFor(predicate, timeoutMs) {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      if (predicate()) {
        resolve(true);
        return;
      }
      const timer = window.setInterval(() => {
        if (predicate()) {
          window.clearInterval(timer);
          resolve(true);
          return;
        }
        if (performance.now() - startedAt > timeoutMs) {
          window.clearInterval(timer);
          resolve(false);
        }
      }, 40);
    });
  }

  function retagClonedVehicle(mesh, id) {
    mesh.traverse((object) => {
      if (!object.userData) return;
      if (typeof object.userData.voxcelVehicleId === "string") object.userData.voxcelVehicleId = id;
    });
    mesh.userData ||= {};
    mesh.userData.voxcelVehicleId = id;
    mesh.userData.voxcelRingBus = true;
  }

  function createRingBus(handle) {
    const template = (handle.vehicles || []).find((vehicle) => vehicle.type === "bus");
    if (!template?.m?.clone) throw new Error("No bus available to clone for the loop line");
    const mesh = template.m.clone(true);
    retagClonedVehicle(mesh, "voxcel-loop-line-bus");

    const body = mesh.children.find((child) => (
      child.isMesh && child.geometry?.type === "BoxGeometry" && child.material?.color
    ));
    if (body) {
      body.material = body.material.clone();
      body.material.color.setHex(0x3fae7a);
    }

    const start = samplePath(runtime.path, 0);
    mesh.position.set(start.x, 0, start.z);
    mesh.rotation.y = start.heading;
    // Parented to the loop-line root so the adventure park's site clearing (which culls
    // scene children by position) can never hide the bus mid-route.
    runtime.root.add(mesh);

    const vehicle = {
      m: mesh,
      axis: "ns",
      road: RING_RADIUS,
      dir: 1,
      lanePos: LANE_RADIUS,
      sp: RING_CRUISE_SPEED,
      curSp: 0,
      targetSp: 0,
      len: 10.8,
      type: "bus",
      // Kept manual so the city's straight-line traffic loop never touches it; the
      // loop-line autopilot below owns its movement instead.
      manual: true,
      driveSpeed: 0,
      steerInput: 0,
      voxcelRingBus: true,
    };
    handle.vehicles.push(vehicle);
    runtime.ringBus = vehicle;
    runtime.ringBusState = {
      distance: 0,
      speed: 0,
      stopIndex: 0,
      dwellUntil: 0,
      lastAnnouncedStop: -1,
    };
    return vehicle;
  }

  function vehicleAhead(vehicle, reach) {
    const position = vehicle.m.position;
    const forwardX = Math.sin(vehicle.m.rotation.y);
    const forwardZ = Math.cos(vehicle.m.rotation.y);
    for (const other of runtime.handle.vehicles) {
      if (other === vehicle || !other.m) continue;
      const dx = other.m.position.x - position.x;
      const dz = other.m.position.z - position.z;
      const forward = dx * forwardX + dz * forwardZ;
      if (forward <= 0 || forward > reach) continue;
      const lateral = Math.abs(dx * forwardZ - dz * forwardX);
      if (lateral <= YIELD_HALF_WIDTH) return forward;
    }
    return null;
  }

  function axisIsGreen(axis) {
    const lights = runtime.handle.trafficLights;
    if (!Array.isArray(lights)) return true;
    for (const light of lights) {
      if (light?.kind !== "vehicle" || light.axis !== axis) continue;
      return (light.mats?.[2]?.emissiveIntensity ?? 0) > 1.5;
    }
    return true;
  }

  function redLightDistance(bus) {
    if (axisIsGreen(bus.axis)) return null;
    const lines = runtime.handle.stopLines;
    if (!Array.isArray(lines)) return null;
    const position = bus.m.position;
    let best = null;
    for (const line of lines) {
      if (line.axis !== bus.axis || line.dir !== bus.dir) continue;
      const lateral = bus.axis === "ns"
        ? Math.abs(position.x - line.x)
        : Math.abs(position.z - line.z);
      if (lateral > 2.8) continue;
      const ahead = bus.axis === "ns"
        ? (line.z - position.z) * bus.dir
        : (line.x - position.x) * bus.dir;
      // Already committed to the junction: finishing the crossing beats stopping inside it.
      if (ahead < 3.2 || ahead > 20) continue;
      if (best === null || ahead < best) best = ahead;
    }
    return best;
  }

  function driveRingBus(now, dt, ridden) {
    const bus = runtime.ringBus;
    const busState = runtime.ringBusState;
    if (!bus || !busState) return;

    const stops = runtime.stops;
    const nextStop = stops[busState.stopIndex % stops.length];
    // Signed distance to the next stop: negative once the bus has just rolled past it.
    const ahead = nextStop ? loopAhead(runtime.path, busState.distance, nextStop.distance) : Infinity;
    const toStop = nextStop && ahead > runtime.path.total / 2 ? ahead - runtime.path.total : ahead;

    let target = RING_CRUISE_SPEED;
    if (now < busState.dwellUntil) {
      target = 0;
    } else if (nextStop && toStop > 0 && toStop < 30) {
      target = Math.min(target, Math.max(0, (toStop - 0.4) * 0.9));
    }

    const gap = vehicleAhead(bus, YIELD_DISTANCE);
    if (gap !== null) target = Math.min(target, Math.max(0, (gap - 5.4) * 1.6));

    const rate = target < busState.speed ? RING_BRAKING : RING_ACCELERATION;
    busState.speed = approach(busState.speed, target, rate, dt);
    busState.distance += busState.speed * dt;

    if (
      nextStop &&
      now >= busState.dwellUntil &&
      busState.speed <= 1 &&
      Math.abs(toStop) <= BUS_STOP_TOLERANCE
    ) {
      busState.dwellUntil = now + BUS_DWELL_MS;
      busState.arrivedStopId = nextStop.id;
      if (ridden && busState.lastAnnouncedStop !== busState.stopIndex) {
        busState.lastAnnouncedStop = busState.stopIndex;
        runtime.handle.notify?.(`🚏 ${nextStop.name}`);
      }
      busState.stopIndex = (busState.stopIndex + 1) % stops.length;
    }

    const sample = samplePath(runtime.path, busState.distance);
    bus.m.position.set(sample.x, 0, sample.z);
    bus.m.rotation.y = sample.heading;
    bus.axis = Math.abs(Math.cos(sample.heading)) >= Math.abs(Math.sin(sample.heading)) ? "ns" : "ew";
    bus.dir = bus.axis === "ns"
      ? (Math.cos(sample.heading) >= 0 ? 1 : -1)
      : (Math.sin(sample.heading) >= 0 ? 1 : -1);
    bus.curSp = busState.speed;
    bus.targetSp = target;
    bus.driveSpeed = 0;
  }

  function driveCityBus(bus, dt) {
    const position = bus.m.position;
    const axis = bus.axis;
    const dir = bus.dir;
    let target = CITY_BUS_RIDE_SPEED;

    const stopDistance = redLightDistance(bus);
    if (stopDistance !== null) target = Math.min(target, Math.max(0, (stopDistance - 3.2) * 1.5));
    const gap = vehicleAhead(bus, YIELD_DISTANCE);
    if (gap !== null) target = Math.min(target, Math.max(0, (gap - 5.4) * 1.6));

    const rate = target < (bus.rideSpeed || 0) ? RING_BRAKING : RING_ACCELERATION;
    bus.rideSpeed = approach(bus.rideSpeed || 0, target, rate, dt);
    const step = bus.rideSpeed * dt * dir;

    if (axis === "ns") {
      position.x = bus.lanePos;
      position.z += step;
      if (position.z > 132) position.z = -132;
      if (position.z < -132) position.z = 132;
      bus.m.rotation.y = dir > 0 ? 0 : Math.PI;
    } else {
      position.z = bus.lanePos;
      position.x += step;
      if (position.x > 132) position.x = -132;
      if (position.x < -132) position.x = 132;
      bus.m.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    bus.curSp = bus.rideSpeed;
    bus.targetSp = target;
    bus.driveSpeed = 0;
  }

  function ensureHud() {
    if (runtime.hud) return runtime.hud;
    const element = document.createElement("div");
    element.id = "voxcelBusHud";
    element.className = "voxcel-bus-hud";
    element.setAttribute("aria-live", "polite");
    const style = document.createElement("style");
    style.textContent = `
.voxcel-bus-hud{position:fixed;top:104px;left:50%;transform:translateX(-50%);z-index:21;display:none;
gap:10px;align-items:center;padding:6px 16px;border-radius:12px;font-size:11px;font-weight:700;
letter-spacing:.04em;color:#eef4ff;background:rgba(10,16,30,.82);border:1px solid rgba(255,255,255,.14);
backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:none;text-align:center}
.voxcel-bus-hud.show{display:flex}
.voxcel-bus-hud .line{color:#5ddb6a}
.voxcel-bus-hud .next{color:#ffd666}
`;
    document.head.append(style);
    document.body.append(element);
    runtime.hud = element;
    return element;
  }

  function updateHud(vehicle) {
    const hud = ensureHud();
    if (!vehicle) {
      if (runtime.hudMarkup !== null) {
        runtime.hudMarkup = null;
        hud.classList.remove("show");
      }
      return;
    }
    const isRing = vehicle === runtime.ringBus;
    const busState = runtime.ringBusState;
    const nextStop = isRing && busState ? runtime.stops[busState.stopIndex % runtime.stops.length] : null;
    const markup = isRing
      ? `<span class="line">🚌 環状線</span><span>自動運転中</span><span class="next">次: ${nextStop ? nextStop.name : "—"}</span><span>Eで降車</span>`
      : '<span class="line">🚌 市内バス</span><span>自動運転中</span><span>Eで降車</span>';
    if (markup !== runtime.hudMarkup) {
      runtime.hudMarkup = markup;
      hud.innerHTML = markup;
    }
    hud.classList.add("show");
  }

  function relabelBoardingPrompt() {
    const button = document.getElementById("iBtn");
    if (!button || !button.classList.contains("show")) return;
    const text = button.textContent || "";
    if (text.includes("バス") && text.includes("運転")) {
      button.textContent = "E: 🚌 バスに乗る";
    }
  }

  function beginRide(vehicle) {
    runtime.ride = { vehicle, startedAt: performance.now() };
    runtime.handle.setMovementLocked?.(true);
    if (vehicle !== runtime.ringBus) vehicle.rideSpeed = Math.abs(vehicle.curSp || 0);
    runtime.handle.notify?.(vehicle === runtime.ringBus
      ? "🚌 環状線バスに乗車（自動運転）"
      : "🚌 バスに乗車（自動運転）");
  }

  function endRide() {
    const previous = runtime.ride?.vehicle;
    runtime.ride = null;
    runtime.handle.setMovementLocked?.(false);
    if (previous && previous !== runtime.ringBus) previous.rideSpeed = 0;
    updateHud(null);
  }

  function syncRider(vehicle) {
    const handle = runtime.handle;
    const root = handle.playerRoot;
    const position = vehicle.m.position;
    root.position.x = position.x;
    root.position.z = position.z;
    root.rotation.y = vehicle.m.rotation.y;
    handle.playerShadow.position.set(position.x, 0.02, position.z);

    const camera = handle.camera;
    const cameraState = handle.getCameraState?.();
    if (!camera || !cameraState) return;
    const targetY = position.y + (vehicle.type === "bus" ? 3.4 : 2.35);
    const horizontal = Math.cos(cameraState.pitch) * cameraState.distance;
    camera.position.set(
      position.x + Math.sin(cameraState.yaw) * horizontal,
      targetY + Math.sin(cameraState.pitch) * cameraState.distance,
      position.z + Math.cos(cameraState.yaw) * horizontal,
    );
    camera.lookAt(position.x, targetY, position.z);
  }

  function update(now) {
    const handle = runtime.handle;
    if (!handle) return;
    const dt = runtime.lastFrameAt
      ? clamp((now - runtime.lastFrameAt) / 1000, 0.001, 1 / 15)
      : 1 / 60;
    runtime.lastFrameAt = now;

    sweepRingCorridor(now);

    const boarded = handle.state?.vehicle || null;
    const busBoarded = boarded?.type === "bus" ? boarded : null;

    if (runtime.ride && runtime.ride.vehicle !== busBoarded) endRide();
    if (busBoarded && !runtime.ride) beginRide(busBoarded);

    // T4() (the built-in "get off" path) hands vehicles back to the city traffic loop;
    // the loop-line bus has to stay on its own autopilot instead.
    if (runtime.ringBus && !runtime.ringBus.manual) runtime.ringBus.manual = true;

    driveRingBus(now, dt, runtime.ride?.vehicle === runtime.ringBus);

    if (runtime.ride) {
      const vehicle = runtime.ride.vehicle;
      if (vehicle !== runtime.ringBus) driveCityBus(vehicle, dt);
      syncRider(vehicle);
      updateHud(vehicle);
    } else {
      updateHud(null);
      relabelBoardingPrompt();
    }
  }

  function getState() {
    const busState = runtime.ringBusState;
    return {
      ready: runtime.ready,
      version: SYSTEM_VERSION,
      status: runtime.status,
      reason: runtime.reason,
      error: runtime.error,
      radius: RING_RADIUS,
      roadWidth: 2 * ROAD_HALF_WIDTH,
      laneRadius: LANE_RADIUS,
      loopLength: runtime.path ? Math.round(runtime.path.total * 100) / 100 : 0,
      meshCount: runtime.meshCount,
      clearedSceneryCount: runtime.clearedSceneryCount,
      clearedTreeCount: runtime.clearedTreeCount,
      movedLandmarkCount: runtime.movedLandmarkCount,
      movedLandmarkMeshCount: runtime.movedLandmarkMeshCount,
      registeredRoadRects: runtime.registeredRoadRects,
      stops: runtime.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        x: Math.round(stop.anchor.x * 100) / 100,
        z: Math.round(stop.anchor.z * 100) / 100,
        distance: Math.round(stop.distance * 100) / 100,
      })),
      ringBus: runtime.ringBus
        ? {
          type: runtime.ringBus.type,
          manual: runtime.ringBus.manual,
          x: Math.round(runtime.ringBus.m.position.x * 100) / 100,
          z: Math.round(runtime.ringBus.m.position.z * 100) / 100,
          speed: Math.round((busState?.speed ?? 0) * 100) / 100,
          nextStopId: runtime.stops[(busState?.stopIndex ?? 0) % (runtime.stops.length || 1)]?.id ?? null,
          onRing: Math.abs(chebyshev(runtime.ringBus.m.position.x, runtime.ringBus.m.position.z) - LANE_RADIUS) < CORNER_RADIUS + 0.5,
        }
        : null,
      riding: runtime.ride
        ? {
          type: runtime.ride.vehicle.type,
          line: runtime.ride.vehicle === runtime.ringBus ? "loop" : "city",
          autopilot: true,
          movementLocked: Boolean(runtime.handle?.movementLocked),
        }
        : null,
    };
  }

  async function initialize(handle) {
    runtime.handle = handle;
    runtime.status = "initializing";
    runtime.constructors = resolveConstructors(handle);
    runtime.root = new runtime.constructors.Group();
    runtime.root.name = "VoxcelRingRoadRoot";
    runtime.root.userData.voxcelRingRoad = true;
    handle.scene.add(runtime.root);

    runtime.path = buildLoopPath();
    runtime.stops = resolveStops(runtime.path);

    clearRingCorridor(handle);
    const materials = collectRoadMaterials(handle, runtime.constructors);
    buildCarriageway(materials);
    buildLaneMarkings(materials);
    buildCrosswalks(materials);
    buildSidewalk(materials);
    buildGuardRail(runtime.constructors);
    buildStreetLamps(runtime.constructors);
    runtime.stops.forEach((stop, index) => buildBusStopShelter(runtime.constructors, stop, index));

    registerRoadRects(handle);
    registerMapRing(handle);

    await waitFor(() => window.__voxcelVehicles?.ready === true, VEHICLE_DETAIL_TIMEOUT_MS);
    createRingBus(handle);

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
    if (
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
