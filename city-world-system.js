(function initializeCityWorldSystem() {
  "use strict";

  if (window.__voxcelOffice?.ready && window.__voxcelOffice?.version === 1) return;

  const SYSTEM_VERSION = 1;
  const OFFICE_ID = "office";
  const OFFICE_FLOORS = 50;
  const OFFICE_FLOOR_HEIGHT = 2.5;
  const OFFICE_POSITION = Object.freeze({ x: 101, z: 15 });
  const OFFICE_SIZE = Object.freeze({ width: 22, depth: 18 });
  const OFFICE_HEIGHT = 4.8 + OFFICE_FLOORS * OFFICE_FLOOR_HEIGHT;
  const INTERACTION_DISTANCE = 3.15;

  const RESIDENCE_PLANS = Object.freeze([
    { from: [-60, -50], to: [-60, -50] },
    { from: [-44, -50], to: [-48, -28] },
    { from: [-92, -50], to: [-92, -50] },
    { from: [88, 50], to: [98, 50] },
    { from: [-24, 50], to: [-52, 30] },
    { from: [120, 50], to: [120, 50] },
  ]);

  const state = {
    ready: false,
    reason: "initializing",
    currentFloor: 1,
    floorChangePending: false,
    modalOpen: false,
    movedResidenceCount: 0,
    movedResidenceObjectCount: 0,
    clearedTreeCount: 0,
    towerMeshCount: 0,
    towerTextureSize: null,
    initializedAt: 0,
  };

  let runtime = null;
  let officeBuilding = null;
  let officeView = null;
  let officeEntrance = null;
  let officeGroup = null;
  let officeFacadeTexture = null;
  let elevatorPoint = null;
  let modalOverlay = null;
  let modalContent = null;
  let interactionButton = null;
  let lastModalOpenAt = 0;
  let pollingTimer = null;
  const movedResidenceObjects = new Set();
  const ownedGeometries = new Set();
  const ownedMaterials = new Set();

  const pendingApi = {
    ready: false,
    version: SYSTEM_VERSION,
    reason: "initializing",
    getState: () => snapshot(),
  };
  window.__voxcelOffice = pendingApi;

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function closeTo(value, expected, epsilon = 0.035) {
    return Math.abs(finite(value) - expected) <= epsilon;
  }

  function dimensionsMatch(parameters, expected, epsilon = 0.035) {
    if (!parameters) return false;
    return Object.entries(expected).every(([key, value]) => closeTo(parameters[key], value, epsilon));
  }

  function findRuntimeConstructors(handle) {
    let mesh = null;
    let boxGeometry = null;
    let material = null;
    let texture = null;
    let referenceTexture = null;

    handle.scene.traverse((object) => {
      if (!mesh && object.isMesh) mesh = object;
      if (!boxGeometry && object.geometry?.type === "BoxGeometry") boxGeometry = object.geometry;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const candidate of materials) {
        if (!candidate) continue;
        if (!material && candidate.type === "MeshStandardMaterial") material = candidate;
        if (!referenceTexture && candidate.map?.image) referenceTexture = candidate.map;
      }
    });

    if (referenceTexture) texture = referenceTexture.constructor;

    return {
      Group: handle.playerRoot?.constructor,
      Mesh: mesh?.constructor,
      BoxGeometry: boxGeometry?.constructor,
      Material: material?.constructor,
      Texture: texture,
      Vector3: handle.playerRoot?.position?.constructor,
      referenceTexture,
    };
  }

  function isReadyHandle(handle) {
    return Boolean(
      handle?.scene?.traverse &&
      handle?.playerRoot?.position &&
      Array.isArray(handle?.buildings) &&
      handle?.buildingViews &&
      Array.isArray(handle?.entrances) &&
      Array.isArray(handle?.decorativeBuildings),
    );
  }

  function rootObjectsAt(scene, x, y, z, matcher) {
    return scene.children.filter((object) => {
      if (!closeTo(object.position?.x, x) || !closeTo(object.position?.y, y) || !closeTo(object.position?.z, z)) {
        return false;
      }
      return matcher(object);
    });
  }

  function collectResidenceObjects(scene, residence, index) {
    const objects = new Set();
    const x = residence.x;
    const z = residence.z;
    const w = residence.w;
    const d = residence.d;
    const h = residence.h;

    const add = (matches, part) => {
      for (const object of matches) {
        objects.add(object);
        if (!object.name) object.name = `DecorativeResidence:${index}:${part}`;
        object.userData ||= {};
        object.userData.voxcelDecorativeResidence = index;
        object.userData.voxcelDecorativePart = part;
      }
    };

    add(rootObjectsAt(scene, x, h / 2, z, (object) => (
      object.isMesh &&
      object.geometry?.type === "BoxGeometry" &&
      dimensionsMatch(object.geometry.parameters, { width: w, height: h, depth: d })
    )), "building");

    add(rootObjectsAt(scene, x, h + 1, z, (object) => (
      object.isMesh &&
      object.geometry?.type === "ConeGeometry" &&
      dimensionsMatch(object.geometry.parameters, {
        radius: Math.max(w, d) * 0.7,
        height: 2,
        radialSegments: 4,
      })
    )), "roof");

    add(rootObjectsAt(scene, x, 0.015, z, (object) => (
      object.isMesh &&
      object.geometry?.type === "PlaneGeometry" &&
      dimensionsMatch(object.geometry.parameters, { width: w + 5, height: d + 6 })
    )), "garden");

    add(rootObjectsAt(scene, x, 0.018, z - d / 2 - 1.2, (object) => (
      object.isMesh &&
      object.geometry?.type === "PlaneGeometry" &&
      dimensionsMatch(object.geometry.parameters, { width: 1.4, height: 5 })
    )), "walkway");

    add(rootObjectsAt(scene, x + 2.7, 0.017, z - d / 2 - 1.55, (object) => (
      object.isMesh &&
      object.geometry?.type === "PlaneGeometry" &&
      dimensionsMatch(object.geometry.parameters, { width: 2.2, height: 5.8 })
    )), "driveway");

    const fenceXs = [x - w / 2 - 1.8, x + w / 2 + 1.8];
    for (const fenceX of fenceXs) {
      for (let fenceZ = z - d / 2 - 2; fenceZ <= z + d / 2 + 2.01; fenceZ += 1.5) {
        add(rootObjectsAt(scene, fenceX, 0.38, fenceZ, (object) => (
          object.isMesh &&
          object.geometry?.type === "BoxGeometry" &&
          dimensionsMatch(object.geometry.parameters, { width: 0.12, height: 0.76, depth: 0.12 })
        )), "fence");
      }
    }

    for (const offset of [-2.4, 0, 2.4]) {
      const shrubX = x - 2.6 + offset * 0.18;
      const shrubZ = z + d / 2 + 1.8;
      add(rootObjectsAt(scene, shrubX, 0, shrubZ, (object) => (
        object.isGroup && object.children.length >= 4
      )), "shrub");
    }

    add(rootObjectsAt(scene, x - 2.8, 0.9, z - d / 2 - 1.4, (object) => (
      object.isMesh &&
      object.geometry?.type === "BoxGeometry" &&
      dimensionsMatch(object.geometry.parameters, { width: 0.18, height: 1.8, depth: 0.18 })
    )), "mailbox-post");

    add(rootObjectsAt(scene, x - 2.45, 1.1, z - d / 2 - 1.4, (object) => (
      object.isMesh &&
      object.geometry?.type === "BoxGeometry" &&
      dimensionsMatch(object.geometry.parameters, { width: 0.55, height: 0.72, depth: 0.36 })
    )), "mailbox");

    return [...objects];
  }

  function findResidenceDescriptor(handle, plan, used) {
    const candidates = handle.decorativeBuildings.filter((candidate) => (
      !used.has(candidate) &&
      closeTo(candidate.w, 7, 0.08) &&
      closeTo(candidate.d, 7, 0.08) &&
      closeTo(candidate.h, 5.8, 0.08)
    ));
    candidates.sort((left, right) => {
      const leftDistance = Math.hypot(left.x - plan.from[0], left.z - plan.from[1]);
      const rightDistance = Math.hypot(right.x - plan.from[0], right.z - plan.from[1]);
      return leftDistance - rightDistance;
    });
    const match = candidates[0];
    if (!match || Math.hypot(match.x - plan.from[0], match.z - plan.from[1]) > 1) return null;
    return match;
  }

  function moveDecorativeResidences(handle) {
    const used = new Set();
    const records = [];

    RESIDENCE_PLANS.forEach((plan, index) => {
      const residence = findResidenceDescriptor(handle, plan, used);
      if (!residence) return;
      used.add(residence);

      const sceneObjects = collectResidenceObjects(handle.scene, residence, index);
      const from = { x: residence.x, z: residence.z };
      const targetX = plan.to[0];
      const targetZ = plan.to[1];
      const deltaX = targetX - from.x;
      const deltaZ = targetZ - from.z;

      for (const object of sceneObjects) {
        object.position.x += deltaX;
        object.position.z += deltaZ;
        object.userData.voxcelResidenceOriginalPosition ||= { x: from.x, z: from.z };
        movedResidenceObjects.add(object);
      }

      residence.x = targetX;
      residence.z = targetZ;
      residence.mapW = residence.w;
      residence.mapD = residence.d;
      residence.sceneObjects = sceneObjects;
      residence.layoutId = `residence-${index + 1}`;
      records.push({ residence, from, to: { x: targetX, z: targetZ }, sceneObjects });
    });

    handle.scene.updateMatrixWorld(true);
    handle.decorativeBuildingObjects = records;
    state.movedResidenceCount = records.filter((record) => (
      record.from.x !== record.to.x || record.from.z !== record.to.z
    )).length;
    state.movedResidenceObjectCount = records.reduce((sum, record) => (
      sum + record.sceneObjects.length
    ), 0);
    return records;
  }

  function isProceduralTree(object) {
    if (!object?.isGroup || object.children.length < 6) return false;
    let sphereCount = 0;
    let coneCount = 0;
    for (const child of object.children) {
      if (child.geometry?.type === "SphereGeometry") sphereCount += 1;
      if (child.geometry?.type === "ConeGeometry") coneCount += 1;
    }
    return sphereCount >= 4 && coneCount >= 1;
  }

  function pointInLot(position, lot, padding) {
    return (
      Math.abs(position.x - lot.x) <= lot.w / 2 + padding &&
      Math.abs(position.z - lot.z) <= lot.d / 2 + padding
    );
  }

  function clearProceduralTreesFromNewLots(handle, residenceRecords) {
    const lots = [
      ...residenceRecords.map(({ residence }) => residence),
      { x: OFFICE_POSITION.x, z: OFFICE_POSITION.z, w: OFFICE_SIZE.width, d: OFFICE_SIZE.depth },
    ];
    const cleared = [];
    for (const object of handle.scene.children) {
      if (
        movedResidenceObjects.has(object) ||
        !object.visible ||
        !isProceduralTree(object) ||
        !lots.some((lot) => pointInLot(object.position, lot, 2.6))
      ) {
        continue;
      }
      object.visible = false;
      object.userData ||= {};
      object.userData.voxcelClearedForCityLot = true;
      object.userData.collisionMode = "none";
      cleared.push(object);
    }
    state.clearedTreeCount = cleared.length;
    return cleared;
  }

  function createFacadeCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1024;
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#172532";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const rowHeight = canvas.height / OFFICE_FLOORS;
    const columns = 8;
    const columnWidth = canvas.width / columns;
    for (let floor = 0; floor < OFFICE_FLOORS; floor += 1) {
      const y = canvas.height - (floor + 1) * rowHeight;
      context.fillStyle = floor % 5 === 4 ? "#314a5d" : "#273d4e";
      context.fillRect(0, y, canvas.width, Math.max(2, rowHeight * 0.15));
      context.fillStyle = floor % 2 === 0 ? "#101b25" : "#14222d";
      context.fillRect(0, y + rowHeight * 0.17, canvas.width, rowHeight * 0.8);

      for (let column = 0; column < columns; column += 1) {
        const lit = ((floor * 11 + column * 7) % 17) < 7;
        context.fillStyle = lit
          ? (floor % 3 === 0 ? "#ffd88a" : "#c9e7f5")
          : "#31566e";
        context.fillRect(
          column * columnWidth + 3,
          y + rowHeight * 0.27,
          columnWidth - 6,
          Math.max(4, rowHeight * 0.54),
        );
        context.fillStyle = "rgba(255,255,255,0.10)";
        context.fillRect(
          column * columnWidth + 4,
          y + rowHeight * 0.3,
          Math.max(2, (columnWidth - 8) * 0.22),
          Math.max(3, rowHeight * 0.46),
        );
      }
    }
    return canvas;
  }

  function makeTexture(constructors, canvas, name) {
    if (!constructors.Texture) return null;
    const texture = new constructors.Texture(canvas);
    texture.name = name;
    texture.needsUpdate = true;
    texture.generateMipmaps = true;
    if (constructors.referenceTexture?.colorSpace) {
      texture.colorSpace = constructors.referenceTexture.colorSpace;
    }
    if (runtime.renderer?.capabilities?.getMaxAnisotropy) {
      texture.anisotropy = Math.min(4, runtime.renderer.capabilities.getMaxAnisotropy());
    }
    return texture;
  }

  function makeMaterial(constructors, options) {
    const material = new constructors.Material(options);
    material.userData ||= {};
    material.userData.voxcelOfficeMaterial = true;
    ownedMaterials.add(material);
    return material;
  }

  function createBox(constructors, parent, name, size, position, material, options = {}) {
    const geometry = new constructors.BoxGeometry(size[0], size[1], size[2]);
    const mesh = new constructors.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    mesh.userData ||= {};
    mesh.userData.voxcelOfficeExterior = true;
    if (options.collisionMode) mesh.userData.collisionMode = options.collisionMode;
    ownedGeometries.add(geometry);
    parent.add(mesh);
    return mesh;
  }

  function createOfficeExterior(handle, constructors) {
    const group = new constructors.Group();
    group.name = "CityOfficeTower";
    group.position.set(OFFICE_POSITION.x, 0, OFFICE_POSITION.z);
    group.userData ||= {};
    group.userData.voxcelOfficeExterior = true;

    const facadeCanvas = createFacadeCanvas();
    const facadeTexture = makeTexture(constructors, facadeCanvas, "CityOfficeFacade50F");
    officeFacadeTexture = facadeTexture;
    state.towerTextureSize = { width: facadeCanvas.width, height: facadeCanvas.height };

    const facadeMaterial = makeMaterial(constructors, {
      color: 0xffffff,
      map: facadeTexture,
      roughness: 0.46,
      metalness: 0.28,
      emissive: 0x101820,
      emissiveIntensity: 0.24,
    });
    const stoneMaterial = makeMaterial(constructors, {
      color: 0x5b6972,
      roughness: 0.72,
      metalness: 0.08,
    });
    const frameMaterial = makeMaterial(constructors, {
      color: 0x253743,
      roughness: 0.4,
      metalness: 0.55,
    });
    const glassMaterial = makeMaterial(constructors, {
      color: 0x8fc4dc,
      roughness: 0.15,
      metalness: 0.34,
      transparent: true,
      opacity: 0.76,
    });
    const lightMaterial = makeMaterial(constructors, {
      color: 0xaedff2,
      emissive: 0x6fcff5,
      emissiveIntensity: 0.72,
      roughness: 0.34,
      metalness: 0.16,
    });
    const plazaMaterial = makeMaterial(constructors, {
      color: 0xb7b2a8,
      roughness: 0.94,
      metalness: 0,
    });

    const plaza = createBox(
      constructors,
      group,
      "CityOffice:plaza",
      [OFFICE_SIZE.width + 6, 0.12, OFFICE_SIZE.depth + 5],
      [0, 0.04, -0.4],
      plazaMaterial,
      { castShadow: false, collisionMode: "none" },
    );
    const podium = createBox(
      constructors,
      group,
      "CityOffice:podium",
      [OFFICE_SIZE.width, 4.8, OFFICE_SIZE.depth],
      [0, 2.4, 0],
      stoneMaterial,
    );
    const bodyHeight = OFFICE_FLOORS * OFFICE_FLOOR_HEIGHT;
    const towerBody = createBox(
      constructors,
      group,
      "CityOffice:50-floor-facade",
      [19.2, bodyHeight, 15.4],
      [0, 4.8 + bodyHeight / 2, 0.55],
      facadeMaterial,
    );

    const cornerColumns = [];
    for (const [columnX, columnZ] of [
      [-9.75, -7.45],
      [9.75, -7.45],
      [-9.75, 8.55],
      [9.75, 8.55],
    ]) {
      cornerColumns.push(createBox(
        constructors,
        group,
        `CityOffice:corner:${columnX}:${columnZ}`,
        [0.52, bodyHeight + 1.1, 0.52],
        [columnX, 4.8 + bodyHeight / 2, columnZ],
        frameMaterial,
      ));
    }

    const roof = createBox(
      constructors,
      group,
      "CityOffice:roof-crown",
      [20.2, 1.2, 16.4],
      [0, OFFICE_HEIGHT + 0.6, 0.55],
      frameMaterial,
    );
    const antenna = createBox(
      constructors,
      group,
      "CityOffice:antenna",
      [0.28, 7.5, 0.28],
      [0, OFFICE_HEIGHT + 4.95, 0.55],
      frameMaterial,
      { receiveShadow: false },
    );
    createBox(
      constructors,
      group,
      "CityOffice:aviation-light",
      [0.58, 0.58, 0.58],
      [0, OFFICE_HEIGHT + 8.95, 0.55],
      lightMaterial,
      { receiveShadow: false, collisionMode: "none" },
    );

    const lobbyGlass = createBox(
      constructors,
      group,
      "CityOffice:lobby-glass",
      [12.8, 3.45, 0.16],
      [0, 1.78, -OFFICE_SIZE.depth / 2 - 0.09],
      glassMaterial,
      { collisionMode: "none" },
    );
    const door = createBox(
      constructors,
      group,
      "CityOffice:entrance-door",
      [3.6, 3.1, 0.2],
      [0, 1.56, -OFFICE_SIZE.depth / 2 - 0.2],
      glassMaterial,
      { collisionMode: "none" },
    );
    const canopy = createBox(
      constructors,
      group,
      "CityOffice:entrance-canopy",
      [8.4, 0.28, 3.1],
      [0, 3.62, -OFFICE_SIZE.depth / 2 - 1.3],
      frameMaterial,
      { collisionMode: "none" },
    );
    const sign = createBox(
      constructors,
      group,
      "CityOffice:identity-band",
      [9.2, 0.72, 0.18],
      [0, 4.22, -OFFICE_SIZE.depth / 2 - 0.22],
      lightMaterial,
      { collisionMode: "none" },
    );

    handle.scene.add(group);
    handle.scene.updateMatrixWorld(true);
    state.towerMeshCount = group.children.filter((child) => child.isMesh).length;

    return {
      group,
      plaza,
      podium,
      towerBody,
      cornerColumns,
      roof,
      antenna,
      lobbyGlass,
      door,
      canopy,
      sign,
    };
  }

  function registerOffice(handle, constructors, exterior) {
    const existing = handle.buildings.find((building) => building.id === OFFICE_ID);
    if (existing) return existing;

    const building = {
      id: OFFICE_ID,
      nm: "シティオフィスタワー",
      em: "🏢",
      x: OFFICE_POSITION.x,
      z: OFFICE_POSITION.z,
      w: OFFICE_SIZE.width,
      d: OFFICE_SIZE.depth,
      h: OFFICE_HEIGHT,
      c: 0x42677e,
      ic: 0x9bc8dc,
      tp: "office",
      floors: OFFICE_FLOORS,
      floorHeight: OFFICE_FLOOR_HEIGHT,
      currentFloor: 1,
      mapW: OFFICE_SIZE.width,
      mapD: OFFICE_SIZE.depth,
      mapLabel: "オフィス",
      mapIcon: "🏢",
      mapColor: "#5ca4c7",
    };

    const exitPoint = {
      pos: new constructors.Vector3(
        building.x,
        0,
        building.z - building.d / 2 + 1,
      ),
      label: "🚪 外に出る",
      action: "exit",
    };
    elevatorPoint = {
      pos: new constructors.Vector3(
        building.x + 9.4,
        0,
        building.z + 10.1,
      ),
      label: "🛗 エレベーター（1F）",
      action: "office-elevator",
      officeFloor: 1,
    };

    const view = {
      walls: [exterior.podium, exterior.towerBody, ...exterior.cornerColumns, exterior.antenna, exterior.canopy],
      roof: exterior.roof,
      sign: exterior.sign,
      door: exterior.door,
      windows: [exterior.lobbyGlass],
      interiorPts: [exitPoint, elevatorPoint],
      elevatorPoint,
      exteriorRoot: exterior.group,
    };
    const entrance = {
      b: building,
      pos: new constructors.Vector3(
        building.x,
        0,
        building.z - building.d / 2 - 1.8,
      ),
    };

    handle.buildings.push(building);
    handle.buildingViews[OFFICE_ID] = view;
    handle.entrances.push(entrance);
    handle.officeBuilding = building;
    handle.officeExterior = exterior.group;
    handle.officeElevator = elevatorPoint;

    officeBuilding = building;
    officeView = view;
    officeEntrance = entrance;
    officeGroup = exterior.group;
    return building;
  }

  function ensureOfficeStyles() {
    if (document.getElementById("voxcel-office-styles")) return;
    const style = document.createElement("style");
    style.id = "voxcel-office-styles";
    style.textContent = `
      .office-elevator-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
      .office-elevator-current{font-size:12px;color:var(--accent2);font-weight:800;white-space:nowrap}
      .office-floor-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:10px 0 12px}
      .office-floor-button{min-height:40px;border:1px solid rgba(255,255,255,.11);border-radius:9px;background:rgba(255,255,255,.055);color:var(--text);font:800 11px/1 system-ui;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}
      .office-floor-button:hover,.office-floor-button:focus-visible{background:rgba(111,212,255,.16);border-color:var(--accent);outline:none}
      .office-floor-button:active{transform:scale(.95)}
      .office-floor-button.current{background:rgba(255,214,102,.2);border-color:var(--accent2);color:#fff0b6}
      .office-floor-button:disabled{opacity:.46;cursor:wait}
      .office-elevator-note{font-size:10px;line-height:1.6;opacity:.62}
      @media(max-width:420px){.office-floor-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.office-floor-button{min-height:38px;font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  function isInsideOffice() {
    return runtime?.state?.insideBld?.id === OFFICE_ID;
  }

  function isNearElevator(distance = INTERACTION_DISTANCE) {
    if (!isInsideOffice() || !elevatorPoint?.pos || !runtime?.playerRoot?.position) return false;
    const player = runtime.playerRoot.position;
    return Math.hypot(player.x - elevatorPoint.pos.x, player.z - elevatorPoint.pos.z) <= distance;
  }

  function isNearOfficeEntrance(distance = INTERACTION_DISTANCE) {
    if (
      isInsideOffice() ||
      !officeEntrance?.pos ||
      !runtime?.playerRoot?.position ||
      runtime?.state?.vehicle
    ) {
      return false;
    }
    const player = runtime.playerRoot.position;
    return Math.hypot(
      player.x - officeEntrance.pos.x,
      player.z - officeEntrance.pos.z,
    ) <= distance;
  }

  function syncCurrentFloorFromEnhancements() {
    const enhancementState = window.__voxcelEnhancements?.getState?.();
    const candidate = (
      enhancementState?.office?.currentFloor ??
      enhancementState?.officeFloor ??
      enhancementState?.currentOfficeFloor
    );
    if (Number.isInteger(candidate) && candidate >= 1 && candidate <= OFFICE_FLOORS) {
      state.currentFloor = candidate;
      if (officeBuilding) officeBuilding.currentFloor = candidate;
      if (elevatorPoint) {
        elevatorPoint.officeFloor = candidate;
        elevatorPoint.label = `🛗 エレベーター（${candidate}F）`;
      }
    }
  }

  function renderElevatorModal() {
    if (!modalContent) return;
    syncCurrentFloorFromEnhancements();
    modalContent.replaceChildren();
    modalContent.dataset.officeElevator = "true";

    const headingRow = document.createElement("div");
    headingRow.className = "office-elevator-head";
    const heading = document.createElement("h2");
    heading.textContent = "🛗 オフィス・エレベーター";
    const current = document.createElement("div");
    current.className = "office-elevator-current";
    current.textContent = `現在 ${state.currentFloor}F`;
    headingRow.append(heading, current);

    const note = document.createElement("p");
    note.className = "office-elevator-note";
    note.textContent = "行き先を選択してください。1Fは受付、2〜49Fは一般オフィス、50Fは役員フロアです。";

    const grid = document.createElement("div");
    grid.className = "office-floor-grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "行き先の階");
    for (let floor = 1; floor <= OFFICE_FLOORS; floor += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `office-floor-button${floor === state.currentFloor ? " current" : ""}`;
      button.textContent = floor === 1 ? "1F\n受付" : `${floor}F`;
      button.style.whiteSpace = "pre-line";
      button.disabled = state.floorChangePending;
      button.setAttribute("aria-label", floor === 1 ? "1階 受付ロビー" : `${floor}階`);
      if (floor === state.currentFloor) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => {
        void goToFloor(floor);
      });
      grid.appendChild(button);
    }

    const actions = document.createElement("div");
    actions.className = "br";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "bt bs";
    closeButton.textContent = "閉じる";
    closeButton.addEventListener("click", closeElevator);
    actions.appendChild(closeButton);

    modalContent.append(headingRow, note, grid, actions);
  }

  function openElevator(options = {}) {
    if (!options.force && !isNearElevator()) return false;
    if (!modalOverlay || !modalContent) return false;
    const now = performance.now();
    if (state.modalOpen && now - lastModalOpenAt < 250) return true;
    lastModalOpenAt = now;
    state.modalOpen = true;
    renderElevatorModal();
    modalOverlay.classList.add("show");
    modalOverlay.setAttribute("aria-label", "オフィス・エレベーター");
    return true;
  }

  function closeElevator() {
    state.modalOpen = false;
    if (modalContent?.dataset.officeElevator === "true") {
      if (modalContent.contains(document.activeElement)) interactionButton?.focus?.();
      modalOverlay?.classList.remove("show");
      delete modalContent.dataset.officeElevator;
    }
  }

  async function goToFloor(requestedFloor) {
    const floor = Number(requestedFloor);
    if (!Number.isInteger(floor) || floor < 1 || floor > OFFICE_FLOORS) return false;
    if (!isInsideOffice()) {
      runtime?.notify?.("オフィス内のエレベーターから階を選んでください");
      return false;
    }
    if (state.floorChangePending) return false;

    const enhancements = window.__voxcelEnhancements;
    if (typeof enhancements?.setOfficeFloor !== "function") {
      runtime?.notify?.("エレベーターを準備しています…");
      return false;
    }

    state.floorChangePending = true;
    renderElevatorModal();
    try {
      const result = await enhancements.setOfficeFloor(floor, officeBuilding);
      if (result === false) return false;
      state.currentFloor = floor;
      officeBuilding.currentFloor = floor;
      elevatorPoint.officeFloor = floor;
      elevatorPoint.label = `🛗 エレベーター（${floor}F）`;
      closeElevator();
      runtime?.notify?.(floor === 1 ? "🏢 1F 受付ロビー" : `🏢 ${floor}F オフィスフロア`);
      return true;
    } catch (error) {
      console.error("Office floor change failed.", error);
      runtime?.notify?.("エレベーターを利用できませんでした");
      return false;
    } finally {
      state.floorChangePending = false;
      if (state.modalOpen) renderElevatorModal();
    }
  }

  function interactionWantsElevator() {
    if (!isNearElevator()) return false;
    if (runtime?.state?.arrestPhase) return false;
    if (modalOverlay?.classList.contains("show") && modalContent?.dataset.officeElevator !== "true") {
      return false;
    }
    return true;
  }

  function interactionWantsOfficeEntrance() {
    return Boolean(
      isNearOfficeEntrance() &&
      !runtime?.state?.arrestPhase &&
      !modalOverlay?.classList.contains("show")
    );
  }

  function enterOfficeFromEntrance() {
    if (!interactionWantsOfficeEntrance()) return false;
    if (typeof runtime?.enterBuilding !== "function") return false;
    runtime.enterBuilding(officeBuilding);
    return true;
  }

  function onKeyDown(event) {
    if (event.key?.toLowerCase() === "e" && !event.repeat && interactionWantsElevator()) {
      openElevator();
    } else if (event.key?.toLowerCase() === "e" && !event.repeat && interactionWantsOfficeEntrance()) {
      enterOfficeFromEntrance();
    } else if (event.key === "Escape" && state.modalOpen) {
      closeElevator();
    }
  }

  function onInteractionButton() {
    if (interactionWantsElevator()) {
      openElevator();
    } else if (interactionWantsOfficeEntrance()) {
      enterOfficeFromEntrance();
    }
  }

  function onModalBackdrop(event) {
    if (event.target === modalOverlay && modalContent?.dataset.officeElevator === "true") {
      state.modalOpen = false;
      delete modalContent.dataset.officeElevator;
    }
  }

  function installElevatorUi() {
    ensureOfficeStyles();
    modalOverlay = document.getElementById("mO");
    modalContent = document.getElementById("mC");
    interactionButton = document.getElementById("iBtn");
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("voxcel:office-floor-changed", syncCurrentFloorFromEnhancements);
    interactionButton?.addEventListener("click", onInteractionButton);
    interactionButton?.addEventListener("touchend", onInteractionButton);
    modalOverlay?.addEventListener("click", onModalBackdrop);
  }

  function snapshot() {
    syncCurrentFloorFromEnhancements();
    return {
      ready: state.ready,
      reason: state.reason,
      version: SYSTEM_VERSION,
      currentFloor: state.currentFloor,
      floorCount: OFFICE_FLOORS,
      floorChangePending: state.floorChangePending,
      modalOpen: Boolean(
        state.modalOpen &&
        modalOverlay?.classList.contains("show") &&
        modalContent?.dataset.officeElevator === "true"
      ),
      insideOffice: isInsideOffice(),
      nearElevator: isNearElevator(),
      office: officeBuilding ? {
        id: officeBuilding.id,
        name: officeBuilding.nm,
        x: officeBuilding.x,
        z: officeBuilding.z,
        width: officeBuilding.mapW,
        depth: officeBuilding.mapD,
        height: officeBuilding.h,
        mapW: officeBuilding.mapW,
        mapD: officeBuilding.mapD,
        floors: officeBuilding.floors,
      } : null,
      elevator: elevatorPoint?.pos ? {
        x: elevatorPoint.pos.x,
        y: elevatorPoint.pos.y,
        z: elevatorPoint.pos.z,
      } : null,
      entrance: officeEntrance?.pos ? {
        x: officeEntrance.pos.x,
        y: officeEntrance.pos.y,
        z: officeEntrance.pos.z,
      } : null,
      layout: {
        residences: runtime?.decorativeBuildingObjects?.map(({ residence, from, to, sceneObjects }) => ({
          id: residence.layoutId,
          from: { ...from },
          to: { ...to },
          width: residence.w,
          depth: residence.d,
          sceneObjectCount: sceneObjects.length,
        })) || [],
        movedResidenceCount: state.movedResidenceCount,
        movedResidenceObjectCount: state.movedResidenceObjectCount,
        clearedTreeCount: state.clearedTreeCount,
      },
      rendering: {
        meshCount: state.towerMeshCount,
        facadeTexture: state.towerTextureSize ? { ...state.towerTextureSize } : null,
      },
      initializedAt: state.initializedAt,
    };
  }

  function destroy() {
    closeElevator();
    if (isInsideOffice()) runtime?.exitBuilding?.();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("voxcel:office-floor-changed", syncCurrentFloorFromEnhancements);
    interactionButton?.removeEventListener("click", onInteractionButton);
    interactionButton?.removeEventListener("touchend", onInteractionButton);
    modalOverlay?.removeEventListener("click", onModalBackdrop);
    const buildingIndex = runtime?.buildings?.indexOf(officeBuilding) ?? -1;
    if (buildingIndex >= 0) runtime.buildings.splice(buildingIndex, 1);
    const entranceIndex = runtime?.entrances?.indexOf(officeEntrance) ?? -1;
    if (entranceIndex >= 0) runtime.entrances.splice(entranceIndex, 1);
    if (runtime?.buildingViews?.office === officeView) delete runtime.buildingViews.office;
    if (runtime?.officeBuilding === officeBuilding) delete runtime.officeBuilding;
    if (runtime?.officeExterior === officeGroup) delete runtime.officeExterior;
    if (runtime?.officeElevator === elevatorPoint) delete runtime.officeElevator;
    officeGroup?.removeFromParent();
    officeFacadeTexture?.dispose?.();
    for (const geometry of ownedGeometries) geometry.dispose?.();
    for (const material of ownedMaterials) material.dispose?.();
    ownedGeometries.clear();
    ownedMaterials.clear();
    state.ready = false;
    state.reason = "destroyed";
    window.__voxcelOffice = {
      ready: false,
      version: SYSTEM_VERSION,
      reason: state.reason,
      getState: snapshot,
    };
  }

  function publishApi() {
    window.__voxcelOffice = {
      ready: true,
      version: SYSTEM_VERSION,
      building: officeBuilding,
      exterior: officeGroup,
      elevatorPoint,
      openElevator,
      closeElevator,
      goToFloor,
      setFloor: goToFloor,
      isNearElevator,
      isNearEntrance: isNearOfficeEntrance,
      getState: snapshot,
      destroy,
    };
    window.dispatchEvent(new CustomEvent("voxcel:office-ready", {
      detail: { building: officeBuilding, api: window.__voxcelOffice },
    }));
  }

  function initialize(handle) {
    if (state.ready) return;
    runtime = handle;
    const constructors = findRuntimeConstructors(handle);
    if (
      !constructors.Group ||
      !constructors.Mesh ||
      !constructors.BoxGeometry ||
      !constructors.Material ||
      !constructors.Vector3
    ) {
      state.reason = "three-runtime-constructors-unavailable";
      window.__voxcelOffice = { ...pendingApi, reason: state.reason };
      return;
    }

    const residenceRecords = moveDecorativeResidences(handle);
    runtime.decorativeBuildingObjects = residenceRecords;
    clearProceduralTreesFromNewLots(handle, residenceRecords);
    const exterior = createOfficeExterior(handle, constructors);
    registerOffice(handle, constructors, exterior);
    installElevatorUi();

    state.ready = true;
    state.reason = null;
    state.initializedAt = Date.now();
    publishApi();
  }

  function start() {
    if (isReadyHandle(window.__voxcelPlayer)) {
      initialize(window.__voxcelPlayer);
      return;
    }
    const startedAt = performance.now();
    pollingTimer = window.setInterval(() => {
      if (isReadyHandle(window.__voxcelPlayer)) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
        initialize(window.__voxcelPlayer);
      } else if (performance.now() - startedAt > 15000) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
        state.reason = "extended-runtime-bridge-missing";
        window.__voxcelOffice = { ...pendingApi, reason: state.reason };
        console.error("City world system could not find the extended game runtime.");
      }
    }, 20);
  }

  start();
})();
