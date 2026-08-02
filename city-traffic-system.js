(() => {
  "use strict";

  if (window.__voxcelTraffic?.__voxcelTrafficSystem) return;

  const SYSTEM_VERSION = 1;
  const RUNTIME_TIMEOUT_MS = 35_000;
  const VEHICLE_DETAIL_TIMEOUT_MS = 12_000;

  // Matches the offset streetscape-detail-system paints the stop lines at.
  const STOP_LINE_OFFSET = 10.2;
  const GIVE_WAY_OFFSET = 8;
  const TURN_LEAD = 6;
  const JUNCTION_YIELD_DISTANCE = 20;
  const ONCOMING_YIELD_DISTANCE = 16;
  const GAP_REACH = 15;
  const GAP_HALF_WIDTH = 2.6;
  const GAP_KEEP = 3;
  const ACCELERATION = 5.5;
  const COMFORT_DECELERATION = 4;
  const BRAKE_RATE = 12;
  const BUS_CRUISE_SPEED = 6.8;
  const RIDDEN_BUS_CRUISE_SPEED = 8.4;
  const CAR_SPEED_SCALE = 1.7;
  const CAR_MIN_SPEED = 5.5;
  const CAR_MAX_SPEED = 8.5;
  const BUS_STOP_DWELL_MS = 2_600;
  const LOOP_BUS_DWELL_MS = 4_000;
  const BUS_STOP_ARRIVAL = 0.9;
  const KERB_SIDEWALK_HALF_WIDTH = 1.25;

  // Anchors sit on a lane, never in a junction, so a halted bus never blocks a crossing.
  const BUS_STOPS = Object.freeze([
    Object.freeze({ id: "east-bay", name: "東ベイ通り", x: 131.4, z: 35 }),
    Object.freeze({ id: "east-wharf", name: "東ふ頭", x: 131.4, z: -35 }),
    Object.freeze({ id: "north-central", name: "北セントラル", x: 22, z: 131.4 }),
    Object.freeze({ id: "north-44", name: "北44番街", x: 85, z: 131.4 }),
    Object.freeze({ id: "west-adventure", name: "西アドベンチャー口", x: -131.4, z: 35 }),
    Object.freeze({ id: "west-green", name: "西グリーンパーク", x: -131.4, z: -35 }),
    Object.freeze({ id: "south-gate", name: "南サウスゲート", x: -60, z: -131.4 }),
    Object.freeze({ id: "south-central", name: "南セントラル", x: 22, z: -131.4 }),
    Object.freeze({ id: "centre-south", name: "中央通り南", x: 2, z: -30 }),
    Object.freeze({ id: "centre-north", name: "中央通り北", x: -2, z: 30 }),
    Object.freeze({ id: "street44-south", name: "44番街南", x: 46, z: -20 }),
    Object.freeze({ id: "street44-north", name: "44番街北", x: 42, z: 20 }),
    Object.freeze({ id: "west-avenue", name: "西大通り", x: -60, z: 2 }),
    Object.freeze({ id: "east-avenue", name: "東大通り", x: 60, z: -2 }),
    Object.freeze({ id: "north-street-west", name: "北通り西", x: -20, z: 72 }),
    Object.freeze({ id: "north-street-east", name: "北通り東", x: 20, z: 68 }),
    Object.freeze({ id: "south-street-east", name: "南通り東", x: 20, z: -68 }),
    Object.freeze({ id: "south-street-west", name: "南通り西", x: -20, z: -72 }),
  ]);

  const runtime = {
    ready: false,
    status: "waiting",
    reason: "initializing",
    error: null,
    handle: null,
    constructors: null,
    root: null,
    network: null,
    stops: [],
    routes: new Map(),
    loopBus: null,
    ride: null,
    playerVehicle: null,
    hud: null,
    hudMarkup: null,
    shelterMeshCount: 0,
    clock: 0,
    lastFrameAt: 0,
    unregisterBeforeRender: null,
  };

  const api = {
    __voxcelTrafficSystem: true,
    version: SYSTEM_VERSION,
    getState,
    // Advances traffic without waiting for rendered frames, for tests and diagnostics.
    simulate,
  };
  Object.defineProperty(api, "ready", { enumerable: true, get: () => runtime.ready });
  window.__voxcelTraffic = api;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function approach(current, target, rate, dt) {
    const delta = target - current;
    const step = rate * dt;
    if (Math.abs(delta) <= step) return target;
    return current + Math.sign(delta) * step;
  }

  function roundKey(value) {
    return Math.round(value * 100) / 100;
  }

  // ---------------------------------------------------------------- road network

  function buildRoads(geometry) {
    const roads = [];
    for (const x of geometry.radial.x) {
      roads.push({
        id: `radial-ns-${x}`,
        kind: "radial",
        axis: "ns",
        coord: x,
        laneOffset: geometry.radial.laneOffset,
        // The city paints both grid axes with the lane on the `+dir` side of the centre line.
        laneSign: 1,
        kerbOffset: geometry.radial.halfWidth + KERB_SIDEWALK_HALF_WIDTH,
      });
    }
    for (const z of geometry.radial.z) {
      roads.push({
        id: `radial-ew-${z}`,
        kind: "radial",
        axis: "ew",
        coord: z,
        laneOffset: geometry.radial.laneOffset,
        laneSign: 1,
        kerbOffset: geometry.radial.halfWidth + KERB_SIDEWALK_HALF_WIDTH,
      });
    }
    const radius = geometry.ring.radius;
    for (const sign of [-1, 1]) {
      roads.push({
        id: `ring-ns-${sign > 0 ? "east" : "west"}`,
        kind: "ring",
        axis: "ns",
        coord: sign * radius,
        laneOffset: geometry.ring.laneOffset,
        laneSign: 1,
        kerbOffset: geometry.ring.halfWidth + KERB_SIDEWALK_HALF_WIDTH,
      });
      roads.push({
        id: `ring-ew-${sign > 0 ? "north" : "south"}`,
        kind: "ring",
        axis: "ew",
        coord: sign * radius,
        laneOffset: geometry.ring.laneOffset,
        // Flipped so one way round the loop keeps to the same side at every corner.
        laneSign: -1,
        kerbOffset: geometry.ring.halfWidth + KERB_SIDEWALK_HALF_WIDTH,
      });
    }
    return roads;
  }

  function laneCoordinate(road, dir) {
    return road.coord + road.laneOffset * road.laneSign * dir;
  }

  function buildNetwork(geometry) {
    const roads = buildRoads(geometry);
    const nsRoads = roads.filter((road) => road.axis === "ns");
    const ewRoads = roads.filter((road) => road.axis === "ew");
    const nodes = new Map();
    const edges = [];

    const nodeAt = (x, z) => {
      const id = `${roundKey(x)}|${roundKey(z)}`;
      if (!nodes.has(id)) nodes.set(id, { id, x, z, roads: new Set(), outgoing: [], signalled: false });
      return nodes.get(id);
    };

    for (const ns of nsRoads) {
      for (const ew of ewRoads) {
        const node = nodeAt(ns.coord, ew.coord);
        node.roads.add(ns);
        node.roads.add(ew);
        // Only the original grid crossings carry signals; the loop line ties in as give-way.
        if (ns.kind === "radial" && ew.kind === "radial") node.signalled = true;
      }
    }

    for (const road of roads) {
      const crossings = [...nodes.values()]
        .filter((node) => node.roads.has(road))
        .sort((left, right) => (
          road.axis === "ns" ? left.z - right.z : left.x - right.x
        ));
      for (let index = 0; index < crossings.length - 1; index += 1) {
        const low = crossings[index];
        const high = crossings[index + 1];
        for (const dir of [1, -1]) {
          const from = dir > 0 ? low : high;
          const to = dir > 0 ? high : low;
          const fromAlong = road.axis === "ns" ? from.z : from.x;
          const toAlong = road.axis === "ns" ? to.z : to.x;
          const edge = {
            id: `${road.id}:${roundKey(fromAlong)}>${roundKey(toAlong)}`,
            road,
            dir,
            laneCoord: laneCoordinate(road, dir),
            from,
            to,
            fromAlong,
            toAlong,
            length: Math.abs(toAlong - fromAlong),
            heading: road.axis === "ns"
              ? (dir > 0 ? 0 : Math.PI)
              : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
            stops: [],
          };
          edges.push(edge);
          from.outgoing.push(edge);
        }
      }
    }

    return { roads, nodes, edges };
  }

  function edgePoint(edge, progress) {
    const along = edge.fromAlong + edge.dir * progress;
    return edge.road.axis === "ns"
      ? { x: edge.laneCoord, z: along }
      : { x: along, z: edge.laneCoord };
  }

  function reverseOf(edge) {
    return edge.to.outgoing.find((candidate) => candidate.road === edge.road && candidate.to === edge.from) || null;
  }

  // ------------------------------------------------------------------ bus stops

  function attachBusStops(network) {
    const resolved = [];
    for (const definition of BUS_STOPS) {
      let best = null;
      for (const edge of network.edges) {
        const lateral = edge.road.axis === "ns"
          ? Math.abs(definition.x - edge.laneCoord)
          : Math.abs(definition.z - edge.laneCoord);
        if (lateral > 0.35) continue;
        const along = edge.road.axis === "ns" ? definition.z : definition.x;
        const progress = (along - edge.fromAlong) * edge.dir;
        if (progress < TURN_LEAD || progress > edge.length - TURN_LEAD) continue;
        if (!best || progress < best.progress) best = { edge, progress };
      }
      if (!best) continue;
      const stop = {
        ...definition,
        edgeId: best.edge.id,
        progress: best.progress,
        road: best.edge.road,
        dir: best.edge.dir,
      };
      best.edge.stops.push(stop);
      resolved.push(stop);
    }
    for (const edge of network.edges) edge.stops.sort((left, right) => left.progress - right.progress);
    return resolved;
  }

  // -------------------------------------------------------------- scene helpers

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
      CylinderGeometry: null,
      Material: null,
    };
    handle.scene.traverse((object) => {
      if (!found.Mesh && object.isMesh) found.Mesh = object.constructor;
      const type = object.geometry?.type;
      if (type === "BoxGeometry" && !found.BoxGeometry) found.BoxGeometry = object.geometry.constructor;
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
    if (!found.Group && found.Mesh) found.Group = findPrototypeConstructor(handle.playerRoot, "traverse");
    const missing = Object.entries(found).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) {
      throw new Error(`Could not resolve the traffic system's Three.js constructors: ${missing.join(", ")}`);
    }
    return found;
  }

  function addMesh(mesh, name) {
    mesh.name = name;
    mesh.userData ||= {};
    mesh.userData.voxcelBusStop = true;
    // Shelters are scenery: nothing at a stop may block the bus that serves it.
    mesh.userData.collisionMode = "none";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    runtime.root.add(mesh);
    runtime.shelterMeshCount += 1;
    return mesh;
  }

  function addBox(name, size, position, material) {
    const { Mesh, BoxGeometry } = runtime.constructors;
    const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    return addMesh(mesh, name);
  }

  function addCylinder(name, radius, height, position, material) {
    const { Mesh, CylinderGeometry } = runtime.constructors;
    const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 8), material);
    mesh.position.set(position[0], position[1], position[2]);
    return addMesh(mesh, name);
  }

  function buildShelters() {
    const { Material } = runtime.constructors;
    const post = new Material({ color: 0x3f4750, roughness: 0.7, metalness: 0.26 });
    const roof = new Material({ color: 0xd7dee6, roughness: 0.6, metalness: 0.18 });
    const bench = new Material({ color: 0x8d6a45, roughness: 0.88 });
    const sign = new Material({
      color: 0x4fbf8b,
      emissive: 0x1f6b4a,
      emissiveIntensity: 0.32,
      roughness: 0.48,
    });

    for (const stop of runtime.stops) {
      const road = stop.road;
      const laneSide = Math.sign((road.axis === "ns" ? stop.x : stop.z) - road.coord) || 1;
      const kerb = road.coord + laneSide * road.kerbOffset;
      const along = road.axis === "ns" ? stop.z : stop.x;
      const at = (alongOffset, lateral = kerb) => (road.axis === "ns"
        ? [lateral, 0, along + alongOffset]
        : [along + alongOffset, 0, lateral]);
      const span = (length, height, thickness) => (road.axis === "ns"
        ? [thickness, height, length]
        : [length, height, thickness]);

      for (const offset of [-1.5, 1.5]) {
        const base = at(offset);
        addCylinder(`bus-stop-post-${stop.id}-${offset}`, 0.08, 2.6, [base[0], 1.3, base[2]], post);
      }
      const roofAt = at(0);
      addBox(`bus-stop-roof-${stop.id}`, span(3.6, 0.14, 1.5), [roofAt[0], 2.62, roofAt[2]], roof);
      addBox(`bus-stop-bench-${stop.id}`, span(2.6, 0.12, 0.5), [roofAt[0], 0.55, roofAt[2]], bench);

      const signAt = at(-2.8, road.coord + laneSide * (road.kerbOffset - 0.9));
      addCylinder(`bus-stop-sign-pole-${stop.id}`, 0.06, 2.4, [signAt[0], 1.2, signAt[2]], post);
      addBox(`bus-stop-sign-${stop.id}`, span(0.95, 0.6, 0.1), [signAt[0], 2.35, signAt[2]], sign);
    }
  }

  // ------------------------------------------------------------------- routing

  function nearestEdge(x, z, heading) {
    let best = null;
    for (const edge of runtime.network.edges) {
      const lateral = edge.road.axis === "ns" ? Math.abs(x - edge.laneCoord) : Math.abs(z - edge.laneCoord);
      const along = edge.road.axis === "ns" ? z : x;
      const progress = (along - edge.fromAlong) * edge.dir;
      if (progress < 0 || progress > edge.length) continue;
      const facing = Number.isFinite(heading)
        ? Math.abs(Math.atan2(
          Math.sin(heading - edge.heading),
          Math.cos(heading - edge.heading),
        ))
        : 0;
      const score = lateral + facing * 12;
      if (!best || score < best.score) best = { edge, progress, score };
    }
    return best;
  }

  function chooseNextEdge(route, edge, vehicle) {
    const all = edge.to.outgoing.filter((candidate) => candidate.to !== edge.from);
    const free = all.filter((candidate) => !entryBlocked(candidate, vehicle));
    const options = free.length ? free : all;
    if (!options.length) return reverseOf(edge);
    if (route.preferRing) {
      const ringOptions = options.filter((candidate) => candidate.road.kind === "ring");
      if (ringOptions.length) {
        // Stay on the loop: of the ring continuations, keep going straight ahead.
        const straight = ringOptions.find((candidate) => candidate.road === edge.road);
        return straight || ringOptions[0];
      }
    }
    let total = 0;
    const weighted = options.map((candidate) => {
      // Carrying straight on reads as flowing down a street, but the loop line is longer
      // than the whole grid put together, so traffic is nudged off it at every tie-in.
      const straight = candidate.road === edge.road;
      const weight = straight
        ? (edge.road.kind === "ring" ? 1 : 3)
        : (candidate.road.kind === edge.road.kind ? 1 : 2);
      total += weight;
      return { candidate, weight };
    });
    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.candidate;
    }
    return options[options.length - 1];
  }

  // A turn drops the vehicle into the middle of another lane, so it may only commit once
  // the stretch of that lane it lands on is free. Checked against route state rather than
  // raw distance, so oncoming traffic in the neighbouring lane never blocks a turn.
  function entryBlocked(edge, self) {
    for (const [vehicle, route] of runtime.routes) {
      if (vehicle === self) continue;
      const clearance = ((self.len || 4.8) + (vehicle.len || 4.8)) / 2 + GAP_KEEP;
      if (route.turn) {
        if (route.turn.next === edge) return true;
        continue;
      }
      if (route.edge === edge && route.progress < TURN_LEAD + clearance) return true;
    }
    return false;
  }

  // Two vehicles cutting across the same junction at once would clip; going straight on is
  // unrestricted, but only one of them may be turning through it at a time.
  function junctionTurnBusy(node, self) {
    for (const [vehicle, route] of runtime.routes) {
      if (vehicle === self || !route.turn) continue;
      if (route.turn.node === node && route.turn.next.road !== route.turn.fromRoad) return true;
    }
    return false;
  }

  // Turning onto the far side of the road you are leaving cuts across the oncoming lane,
  // so it waits for a gap the way a real driver would.
  function crossesOncoming(edge, next) {
    if (next.road === edge.road) return false;
    const exit = edgePoint(next, Math.min(next.length, TURN_LEAD));
    const lateral = edge.road.axis === "ns" ? exit.x : exit.z;
    return Math.sign(lateral - edge.road.coord) !== Math.sign(edge.laneCoord - edge.road.coord);
  }

  function oncomingBlocked(edge, self) {
    for (const [vehicle, route] of runtime.routes) {
      if (vehicle === self || route.turn) continue;
      if (route.edge.road !== edge.road || route.edge.dir === edge.dir) continue;
      if (route.edge.to !== edge.to) continue;
      if (distanceToNode(route) < ONCOMING_YIELD_DISTANCE) return true;
    }
    return false;
  }

  function beginTurn(route, edge, vehicle) {
    const next = chooseNextEdge(route, edge, vehicle);
    if (!next || entryBlocked(next, vehicle)) return false;
    if (next.road !== edge.road && junctionTurnBusy(edge.to, vehicle)) return false;
    if (crossesOncoming(edge, next) && oncomingBlocked(edge, vehicle)) return false;
    const from = edgePoint(edge, Math.max(0, edge.length - TURN_LEAD));
    const to = edgePoint(next, Math.min(next.length, TURN_LEAD));
    const control = edge.road.axis === next.road.axis
      ? { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 }
      : {
        x: edge.road.axis === "ns" ? edge.laneCoord : next.laneCoord,
        z: edge.road.axis === "ns" ? next.laneCoord : edge.laneCoord,
      };
    let length = 0;
    let previous = from;
    for (let step = 1; step <= 8; step += 1) {
      const point = quadratic(from, control, to, step / 8);
      length += Math.hypot(point.x - previous.x, point.z - previous.z);
      previous = point;
    }
    route.turn = {
      from,
      control,
      to,
      next,
      fromRoad: edge.road,
      length: Math.max(length, 0.001),
      progress: 0,
      node: edge.to,
    };
    return true;
  }

  function quadratic(from, control, to, t) {
    const inverse = 1 - t;
    return {
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      z: inverse * inverse * from.z + 2 * inverse * t * control.z + t * t * to.z,
    };
  }

  function quadraticHeading(turn, t) {
    const { from, control, to } = turn;
    const dx = 2 * (1 - t) * (control.x - from.x) + 2 * t * (to.x - control.x);
    const dz = 2 * (1 - t) * (control.z - from.z) + 2 * t * (to.z - control.z);
    return Math.atan2(dx, dz);
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

  function distanceToNode(route) {
    if (route.turn) return 0;
    return route.edge.length - route.progress;
  }

  function priorityTrafficNear(node, self) {
    for (const [vehicle, route] of runtime.routes) {
      if (vehicle === self || route.edge?.road.kind !== "ring") continue;
      if (route.turn) {
        if (route.turn.node === node) return true;
        continue;
      }
      if (route.edge.to !== node) continue;
      if (distanceToNode(route) < JUNCTION_YIELD_DISTANCE) return true;
    }
    return false;
  }

  // Free space between bumpers, so a car queues behind a 10m bus at a sane distance.
  function gapAhead(vehicle) {
    const position = vehicle.m.position;
    const forwardX = Math.sin(vehicle.m.rotation.y);
    const forwardZ = Math.cos(vehicle.m.rotation.y);
    let nearest = null;
    for (const other of runtime.handle.vehicles) {
      if (other === vehicle || !other.m) continue;
      const dx = other.m.position.x - position.x;
      const dz = other.m.position.z - position.z;
      const forward = dx * forwardX + dz * forwardZ;
      if (forward <= 0 || forward > GAP_REACH) continue;
      const lateral = Math.abs(dx * forwardZ - dz * forwardX);
      if (lateral > GAP_HALF_WIDTH) continue;
      const free = forward - ((vehicle.len || 4.8) + (other.len || 4.8)) / 2 - GAP_KEEP;
      if (nearest === null || free < nearest) nearest = free;
    }
    return nearest;
  }

  function stoppingDistance(vehicle, route, clock) {
    let limit = Infinity;
    const consider = (distance) => {
      if (distance < limit) limit = distance;
    };

    const gap = gapAhead(vehicle);
    if (gap !== null) consider(gap);

    if (route.dwellUntil > clock) consider(0);
    else if (!route.turn && route.type === "bus") {
      for (const stop of route.edge.stops) {
        if (stop === route.lastStop) continue;
        const ahead = stop.progress - route.progress;
        if (ahead < -BUS_STOP_ARRIVAL) continue;
        consider(ahead);
        break;
      }
    }

    if (!route.turn) {
      const node = route.edge.to;
      const toNode = distanceToNode(route);
      if (node.signalled && !axisIsGreen(route.edge.road.axis)) {
        consider(toNode - STOP_LINE_OFFSET);
      } else if (
        !node.signalled &&
        route.edge.road.kind === "radial" &&
        [...node.roads].some((road) => road.kind === "ring") &&
        priorityTrafficNear(node, vehicle)
      ) {
        consider(toNode - GIVE_WAY_OFFSET);
      }
    }
    return limit;
  }

  function cruiseSpeed(vehicle, route) {
    if (route.type === "bus") {
      return runtime.ride?.vehicle === vehicle ? RIDDEN_BUS_CRUISE_SPEED : BUS_CRUISE_SPEED;
    }
    return clamp((vehicle.sp || 4) * CAR_SPEED_SCALE, CAR_MIN_SPEED, CAR_MAX_SPEED);
  }

  function driveVehicle(vehicle, route, clock, dt) {
    const limit = stoppingDistance(vehicle, route, clock);
    let target = cruiseSpeed(vehicle, route);
    if (limit < Infinity) {
      target = Math.min(target, limit <= 0 ? 0 : Math.sqrt(2 * COMFORT_DECELERATION * limit));
    }
    const rate = target < route.speed ? BRAKE_RATE : ACCELERATION;
    route.speed = approach(route.speed, Math.max(0, target), rate, dt);

    if (route.type === "bus" && !route.turn && route.dwellUntil <= clock) {
      for (const stop of route.edge.stops) {
        if (stop === route.lastStop) continue;
        if (Math.abs(stop.progress - route.progress) > BUS_STOP_ARRIVAL || route.speed > 0.6) continue;
        route.speed = 0;
        route.lastStop = stop;
        route.currentStop = stop;
        route.stopCount += 1;
        route.dwellUntil = clock + (route.preferRing ? LOOP_BUS_DWELL_MS : BUS_STOP_DWELL_MS);
        if (runtime.ride?.vehicle === vehicle) runtime.handle.notify?.(`🚏 ${stop.name}`);
        break;
      }
    }
    if (route.dwellUntil <= clock) route.currentStop = null;

    let travel = route.speed * dt;
    let guard = 0;
    while (travel > 0 && guard < 6) {
      guard += 1;
      if (route.turn) {
        const step = travel / route.turn.length;
        route.turn.progress += step;
        if (route.turn.progress < 1) {
          travel = 0;
          break;
        }
        travel = (route.turn.progress - 1) * route.turn.length;
        route.edge = route.turn.next;
        route.progress = Math.min(route.edge.length, TURN_LEAD);
        route.lastStop = null;
        route.turn = null;
        continue;
      }
      const remaining = Math.max(0, route.edge.length - TURN_LEAD) - route.progress;
      if (travel < remaining) {
        route.progress += travel;
        travel = 0;
        break;
      }
      route.progress += Math.max(0, remaining);
      travel -= Math.max(0, remaining);
      if (!beginTurn(route, route.edge, vehicle)) {
        travel = 0;
        break;
      }
    }

    if (route.turn) {
      const t = clamp(route.turn.progress, 0, 1);
      const point = quadratic(route.turn.from, route.turn.control, route.turn.to, t);
      vehicle.m.position.set(point.x, 0, point.z);
      vehicle.m.rotation.y = quadraticHeading(route.turn, t);
    } else {
      const point = edgePoint(route.edge, route.progress);
      vehicle.m.position.set(point.x, 0, point.z);
      vehicle.m.rotation.y = route.edge.heading;
    }

    const heading = vehicle.m.rotation.y;
    vehicle.axis = Math.abs(Math.cos(heading)) >= Math.abs(Math.sin(heading)) ? "ns" : "ew";
    vehicle.dir = vehicle.axis === "ns"
      ? (Math.cos(heading) >= 0 ? 1 : -1)
      : (Math.sin(heading) >= 0 ? 1 : -1);
    vehicle.curSp = route.speed;
    vehicle.targetSp = target;
    vehicle.driveSpeed = 0;
  }

  // ------------------------------------------------------------------ adoption

  function adopt(vehicle) {
    const placement = nearestEdge(vehicle.m.position.x, vehicle.m.position.z, vehicle.m.rotation.y);
    if (!placement) return null;
    const route = {
      edge: placement.edge,
      progress: clamp(placement.progress, TURN_LEAD, Math.max(TURN_LEAD, placement.edge.length - TURN_LEAD)),
      turn: null,
      speed: Math.max(0, vehicle.curSp || 0),
      dwellUntil: 0,
      lastStop: null,
      currentStop: null,
      stopCount: 0,
      type: vehicle.type,
      preferRing: Boolean(vehicle.voxcelLoopBus),
      onRingSince: null,
      visitedRing: placement.edge.road.kind === "ring",
    };
    // Flagged manual so the built-in straight-line traffic loop leaves it alone; this
    // system owns its movement from here.
    vehicle.manual = true;
    runtime.routes.set(vehicle, route);
    return route;
  }

  function release(vehicle) {
    runtime.routes.delete(vehicle);
  }

  function retagClonedVehicle(mesh, id) {
    mesh.traverse((object) => {
      if (typeof object.userData?.voxcelVehicleId === "string") object.userData.voxcelVehicleId = id;
    });
    mesh.userData ||= {};
    mesh.userData.voxcelVehicleId = id;
    mesh.userData.voxcelLoopBus = true;
  }

  function createLoopBus(handle) {
    const template = handle.vehicles.find((vehicle) => vehicle.type === "bus");
    if (!template?.m?.clone) return null;
    const mesh = template.m.clone(true);
    retagClonedVehicle(mesh, "voxcel-loop-line-bus");
    const body = mesh.children.find((child) => (
      child.isMesh && child.geometry?.type === "BoxGeometry" && child.material?.color
    ));
    if (body) {
      body.material = body.material.clone();
      body.material.color.setHex(0x3fae7a);
    }
    const start = runtime.network.edges.find((edge) => (
      edge.road.id === "ring-ns-east" && edge.dir > 0
    )) || runtime.network.edges[0];
    const point = edgePoint(start, Math.min(start.length / 2, 20));
    mesh.position.set(point.x, 0, point.z);
    mesh.rotation.y = start.heading;
    // Parented to this system's root so the adventure park's site clearing, which culls
    // scene children by position, can never hide the bus mid-route.
    runtime.root.add(mesh);

    const vehicle = {
      m: mesh,
      axis: start.road.axis,
      road: start.road.coord,
      dir: start.dir,
      lanePos: start.laneCoord,
      sp: BUS_CRUISE_SPEED,
      curSp: 0,
      targetSp: 0,
      len: 10.8,
      type: "bus",
      manual: true,
      driveSpeed: 0,
      steerInput: 0,
      voxcelLoopBus: true,
    };
    handle.vehicles.push(vehicle);
    runtime.loopBus = vehicle;
    return vehicle;
  }

  // The built-in test bridge hands the player a car by looking for a non-manual one, so
  // routed traffic has to be released for the duration of that call.
  function installTestBridge(handle) {
    const testApi = window.__voxcelTest;
    if (!testApi || typeof testApi.attachPlayerVehicle !== "function" || testApi.__voxcelTrafficInstalled) {
      return;
    }
    const original = testApi.attachPlayerVehicle;
    testApi.attachPlayerVehicle = function attachRoutedVehicle(...args) {
      const released = [...runtime.routes.keys()].filter((vehicle) => vehicle.manual);
      for (const vehicle of released) vehicle.manual = false;
      let result = null;
      try {
        result = original.apply(this, args);
      } finally {
        for (const vehicle of released) {
          if (vehicle !== handle.state.vehicle) vehicle.manual = true;
        }
      }
      return result;
    };
    testApi.__voxcelTrafficInstalled = true;
  }

  // ---------------------------------------------------------------------- ride

  function ensureHud() {
    if (runtime.hud) return runtime.hud;
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
    const element = document.createElement("div");
    element.id = "voxcelBusHud";
    element.className = "voxcel-bus-hud";
    element.setAttribute("aria-live", "polite");
    document.body.append(element);
    runtime.hud = element;
    return element;
  }

  function nextStopName(route) {
    if (!route) return null;
    if (route.currentStop) return route.currentStop.name;
    let edge = route.turn ? route.turn.next : route.edge;
    let progress = route.turn ? 0 : route.progress;
    for (let hop = 0; hop < 4; hop += 1) {
      const upcoming = edge.stops.find((stop) => stop.progress > progress + 0.2);
      if (upcoming) return upcoming.name;
      const straight = edge.to.outgoing.find((candidate) => (
        candidate.road === edge.road && candidate.to !== edge.from
      )) || edge.to.outgoing.find((candidate) => candidate.to !== edge.from);
      if (!straight) break;
      edge = straight;
      progress = 0;
    }
    return null;
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
    const route = runtime.routes.get(vehicle);
    const isLoop = vehicle === runtime.loopBus;
    const stopName = nextStopName(route);
    const stopped = route && route.currentStop;
    const markup = `<span class="line">🚌 ${isLoop ? "環状線" : "市内バス"}</span>`
      + `<span>${stopped ? "停車中" : "自動運転中"}</span>`
      + `<span class="next">${stopped ? "" : "次: "}${stopName || "—"}</span>`
      + "<span>Eで降車</span>";
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
    if (text.includes("バス") && text.includes("運転")) button.textContent = "E: 🚌 バスに乗る";
  }

  function beginRide(vehicle) {
    runtime.ride = { vehicle };
    runtime.handle.setMovementLocked?.(true);
    runtime.handle.notify?.(vehicle === runtime.loopBus
      ? "🚌 環状線バスに乗車（自動運転）"
      : "🚌 バスに乗車（自動運転）");
  }

  function endRide() {
    runtime.ride = null;
    runtime.handle.setMovementLocked?.(false);
    updateHud(null);
  }

  function syncRider(vehicle) {
    const handle = runtime.handle;
    const position = vehicle.m.position;
    handle.playerRoot.position.x = position.x;
    handle.playerRoot.position.z = position.z;
    handle.playerRoot.rotation.y = vehicle.m.rotation.y;
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

  // --------------------------------------------------------------------- frame

  // Traffic runs on its own clock so a step can be replayed without a rendered frame.
  function stepTraffic(dt) {
    runtime.clock += dt * 1000;
    const boarded = runtime.handle.state?.vehicle || null;
    const busBoarded = boarded?.type === "bus" ? boarded : null;
    for (const [vehicle, route] of runtime.routes) {
      if (vehicle === boarded && !busBoarded) continue;
      if (!vehicle.manual) {
        // Something else took the wheel (the signal QA hook stages traffic this way).
        release(vehicle);
        continue;
      }
      driveVehicle(vehicle, route, runtime.clock, dt);
      if (route.edge.road.kind === "ring") route.visitedRing = true;
    }
  }

  function simulate(seconds, step = 1 / 60) {
    if (!runtime.ready) return getState();
    const total = clamp(Number(seconds) || 0, 0, 900);
    const increment = clamp(Number(step) || 1 / 60, 1 / 240, 1 / 15);
    for (let elapsed = 0; elapsed < total; elapsed += increment) {
      stepTraffic(Math.min(increment, total - elapsed));
    }
    return getState();
  }

  function update(now) {
    const handle = runtime.handle;
    if (!handle) return;
    const dt = runtime.lastFrameAt
      ? clamp((now - runtime.lastFrameAt) / 1000, 0.001, 1 / 15)
      : 1 / 60;
    runtime.lastFrameAt = now;

    const boarded = handle.state?.vehicle || null;
    if (runtime.playerVehicle && runtime.playerVehicle !== boarded) {
      // Stepping out hands the vehicle back to this system rather than to the built-in
      // straight-line loop it can no longer follow.
      adopt(runtime.playerVehicle);
    }
    runtime.playerVehicle = boarded;

    const busBoarded = boarded?.type === "bus" ? boarded : null;
    if (runtime.ride && runtime.ride.vehicle !== busBoarded) endRide();
    if (busBoarded && !runtime.ride) beginRide(busBoarded);

    stepTraffic(dt);

    if (runtime.ride) {
      syncRider(runtime.ride.vehicle);
      updateHud(runtime.ride.vehicle);
    } else {
      updateHud(null);
      relabelBoardingPrompt();
    }
  }

  function getState() {
    const network = runtime.network;
    const routes = [...runtime.routes.entries()];
    return {
      ready: runtime.ready,
      version: SYSTEM_VERSION,
      status: runtime.status,
      reason: runtime.reason,
      error: runtime.error,
      nodeCount: network ? network.nodes.size : 0,
      edgeCount: network ? network.edges.length : 0,
      signalledNodeCount: network
        ? [...network.nodes.values()].filter((node) => node.signalled).length
        : 0,
      ringEdgeCount: network
        ? network.edges.filter((edge) => edge.road.kind === "ring").length
        : 0,
      routedVehicleCount: routes.length,
      routedBusCount: routes.filter(([, route]) => route.type === "bus").length,
      onRingCount: routes.filter(([, route]) => route.edge.road.kind === "ring").length,
      visitedRingCount: routes.filter(([, route]) => route.visitedRing).length,
      turningCount: routes.filter(([, route]) => Boolean(route.turn)).length,
      haltedAtStopCount: routes.filter(([, route]) => Boolean(route.currentStop)).length,
      busStopVisits: routes.reduce((sum, [, route]) => sum + route.stopCount, 0),
      shelterMeshCount: runtime.shelterMeshCount,
      stops: runtime.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        x: stop.x,
        z: stop.z,
        kind: stop.road.kind,
      })),
      loopBus: runtime.loopBus
        ? {
          type: runtime.loopBus.type,
          manual: runtime.loopBus.manual,
          x: Math.round(runtime.loopBus.m.position.x * 100) / 100,
          z: Math.round(runtime.loopBus.m.position.z * 100) / 100,
          onRing: runtime.routes.get(runtime.loopBus)?.edge.road.kind === "ring",
          stopCount: runtime.routes.get(runtime.loopBus)?.stopCount ?? 0,
        }
        : null,
      riding: runtime.ride
        ? {
          type: runtime.ride.vehicle.type,
          line: runtime.ride.vehicle === runtime.loopBus ? "loop" : "city",
          autopilot: true,
          movementLocked: Boolean(runtime.handle?.movementLocked),
          halted: Boolean(runtime.routes.get(runtime.ride.vehicle)?.currentStop),
        }
        : null,
    };
  }

  function waitFor(predicate, timeoutMs) {
    return new Promise((resolve) => {
      if (predicate()) {
        resolve(true);
        return;
      }
      const startedAt = performance.now();
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

  async function initialize(handle) {
    runtime.handle = handle;
    runtime.status = "initializing";
    runtime.constructors = resolveConstructors(handle);
    runtime.root = new runtime.constructors.Group();
    runtime.root.name = "VoxcelTrafficRoot";
    runtime.root.userData.voxcelTraffic = true;
    handle.scene.add(runtime.root);

    runtime.network = buildNetwork(window.__voxcelRingRoad.geometry());
    runtime.stops = attachBusStops(runtime.network);
    buildShelters();

    await waitFor(() => window.__voxcelVehicles?.ready === true, VEHICLE_DETAIL_TIMEOUT_MS);
    createLoopBus(handle);
    for (const vehicle of handle.vehicles) {
      if (vehicle === handle.state.vehicle) continue;
      adopt(vehicle);
    }
    installTestBridge(handle);

    handle.scene.updateMatrixWorld(true);
    window.__voxcelEnhancements?.refreshColliders?.();
    runtime.unregisterBeforeRender = window.__voxcelEnhancements.registerBeforeRender(update);

    runtime.ready = true;
    runtime.status = "ready";
    runtime.reason = "ready";
    window.dispatchEvent(new CustomEvent("voxcel:traffic-ready", { detail: getState() }));
  }

  function fail(error) {
    runtime.ready = false;
    runtime.status = "error";
    runtime.reason = error instanceof Error ? error.message : String(error);
    runtime.error = runtime.reason;
    console.error("Voxcel city traffic system failed to initialize.", error);
  }

  const startedAt = performance.now();
  const timer = window.setInterval(() => {
    const handle = window.__voxcelPlayer;
    if (
      handle?.scene?.traverse &&
      handle?.playerRoot?.position &&
      handle?.camera?.position &&
      handle?.state &&
      Array.isArray(handle?.vehicles) &&
      handle.vehicles.length > 0 &&
      typeof handle.setMovementLocked === "function" &&
      window.__voxcelEnhancements?.ready &&
      window.__voxcelRingRoad?.ready
    ) {
      window.clearInterval(timer);
      Promise.resolve().then(() => initialize(handle)).catch(fail);
      return;
    }
    if (performance.now() - startedAt > RUNTIME_TIMEOUT_MS) {
      window.clearInterval(timer);
      runtime.status = "error";
      runtime.reason = "runtime-bridge-timeout";
    }
  }, 30);
})();
