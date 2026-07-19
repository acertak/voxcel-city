(() => {
  "use strict";

  if (window.__voxcelBuildingFrontages?.ready) return;

  const SYSTEM_VERSION = 1;
  const ROAD_CENTERLINES = Object.freeze({
    x: Object.freeze([0, 44]),
    z: Object.freeze([-70, 0, 70]),
  });
  const FRONT_OVERRIDES = Object.freeze({
    conv: Object.freeze({ axis: "z", direction: -1, road: -70 }),
  });
  const SIGN_REGIONS = Object.freeze({
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

  const state = {
    ready: false,
    reason: "initializing",
    buildingCount: 0,
    orientedCount: 0,
    rooftopSignCount: 0,
    atlasRooftopSignCount: 0,
    exitRelocations: 0,
    frontages: [],
  };

  let handle = null;
  let previousBuildingId = null;
  let unregisterBeforeRender = null;
  const clearanceWindows = new Set();

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function resolveFront(building) {
    const override = FRONT_OVERRIDES[building.id];
    if (override) {
      const halfExtent = override.axis === "x" ? building.w / 2 : building.d / 2;
      const distance = Math.max(0, Math.abs(override.road - building[override.axis]) - halfExtent);
      return { ...override, distance, rotationY: rotationForFront(override) };
    }

    const candidates = [];
    for (const road of ROAD_CENTERLINES.x) {
      const delta = road - building.x;
      candidates.push({
        axis: "x",
        direction: delta < 0 ? -1 : 1,
        road,
        distance: Math.max(0, Math.abs(delta) - building.w / 2),
      });
    }
    for (const road of ROAD_CENTERLINES.z) {
      const delta = road - building.z;
      candidates.push({
        axis: "z",
        direction: delta < 0 ? -1 : 1,
        road,
        distance: Math.max(0, Math.abs(delta) - building.d / 2),
      });
    }
    candidates.sort((left, right) => left.distance - right.distance);
    const front = candidates[0];
    return { ...front, rotationY: rotationForFront(front) };
  }

  function rotationForFront(front) {
    if (front.axis === "x") return front.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
    return front.direction > 0 ? Math.PI : 0;
  }

  function pointOnFront(building, front, offset = 0, lateral = 0) {
    if (front.axis === "x") {
      return {
        x: building.x + front.direction * (building.w / 2 + offset),
        z: building.z + lateral,
      };
    }
    return {
      x: building.x + lateral,
      z: building.z + front.direction * (building.d / 2 + offset),
    };
  }

  function worldPosition(object) {
    const result = handle.playerRoot.position.clone();
    object.getWorldPosition(result);
    return result;
  }

  function setWorldPosition(object, x, y, z) {
    const target = handle.playerRoot.position.clone().set(x, y, z);
    if (object.parent && object.parent !== handle.scene) {
      object.parent.updateMatrixWorld(true);
      object.parent.worldToLocal(target);
    }
    object.position.copy(target);
  }

  function applyUvRect(geometry, rect) {
    const uv = geometry.getAttribute?.("uv");
    if (!uv) return false;
    for (let index = 0; index < uv.count; index += 1) {
      const localU = uv.getX(index);
      const localV = uv.getY(index);
      uv.setXY(
        index,
        rect.u0 + localU * (rect.u1 - rect.u0),
        rect.v1 - localV * (rect.v1 - rect.v0),
      );
    }
    uv.needsUpdate = true;
    return true;
  }

  function createOfficeTexture(referenceTexture) {
    const TextureConstructor = referenceTexture?.constructor;
    if (typeof TextureConstructor !== "function") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#183a52");
    gradient.addColorStop(0.5, "#4ca1c9");
    gradient.addColorStop(1, "#183a52");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#c7efff";
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = "#f1fbff";
    context.font = "900 47px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("🏢  CITY OFFICE", canvas.width / 2, canvas.height / 2 + 2);
    const texture = new TextureConstructor(canvas);
    texture.name = "CityOfficeRooftopSign";
    texture.flipY = false;
    texture.wrapS = 1001;
    texture.wrapT = 1001;
    texture.magFilter = 1006;
    texture.minFilter = 1008;
    texture.generateMipmaps = true;
    texture.colorSpace = referenceTexture.colorSpace || "srgb";
    texture.needsUpdate = true;
    return texture;
  }

  function cloneMaterial(source, name) {
    const material = source?.clone?.() || source;
    if (!material) return null;
    material.name = name;
    material.color?.setHex(0xffffff);
    material.roughness = 0.62;
    material.metalness = Math.max(0.05, finite(material.metalness));
    material.needsUpdate = true;
    return material;
  }

  function createRooftopSign(building, view) {
    if (!view?.sign?.isMesh || !view.roof?.isMesh) return null;
    if (view.roofSign?.userData?.voxcelRooftopSign) return view.roofSign;

    const BoxGeometry = view.sign.geometry?.constructor;
    const Mesh = view.sign.constructor;
    if (typeof BoxGeometry !== "function" || typeof Mesh !== "function") return null;

    const isOffice = building.id === "office";
    const span = isOffice
      ? clamp(Math.min(building.w, building.d) * 0.42, 7.5, 8)
      : clamp(Math.min(building.w, building.d) * 0.36, 3.6, 5.4);
    const height = isOffice ? 2.8 : clamp(span * 0.3, 1.15, 1.55);
    const geometry = new BoxGeometry(span, height, span);
    const regionName = SIGN_REGIONS[building.id] || null;
    const signAtlas = window.__voxcelSignAtlas;
    const usesAtlas = Boolean(
      regionName &&
      signAtlas?.getUvRect &&
      view.sign.material?.map?.userData?.voxcelSignAtlas
    );

    if (usesAtlas) {
      const rect = signAtlas.getUvRect(regionName, 4);
      applyUvRect(geometry, rect);
      geometry.userData.voxcelSignAtlasRegion = regionName;
      geometry.userData.voxcelSignAtlasRect = rect;
    } else {
      applyUvRect(geometry, { u0: 0, u1: 1, v0: 0, v1: 1 });
    }

    const material = cloneMaterial(
      view.sign.material,
      `RooftopSignMaterial:${building.id}`,
    );
    if (!material) return null;

    if (building.id === "office" && !material.map) {
      const referenceTexture = handle.buildingViews?.conv?.sign?.material?.map;
      material.map = createOfficeTexture(referenceTexture);
      material.emissive?.setHex?.(0x173f59);
      material.emissiveIntensity = 0.34;
      material.needsUpdate = true;
    }

    const sign = new Mesh(geometry, material);
    sign.name = `RooftopSign:${building.id}`;
    const roofPosition = worldPosition(view.roof);
    const roofHeight = finite(view.roof.geometry?.parameters?.height, 0.4);
    const officeOffsetX = isOffice
      ? Math.min(building.w / 2 - span / 2 - 0.6, span / 2 + 0.55)
      : 0;
    const officeOffsetZ = isOffice
      ? -(building.d / 2 - span / 2 - 1.65)
      : 0;
    sign.position.set(
      building.x + officeOffsetX,
      roofPosition.y + roofHeight / 2 + height / 2 + 0.28,
      building.z + officeOffsetZ,
    );
    sign.castShadow = true;
    sign.receiveShadow = true;
    sign.userData.voxcelRooftopSign = true;
    sign.userData.voxcelBuildingId = building.id;
    sign.userData.voxcelFourSided = true;
    sign.userData.voxcelSignAtlasRegion = usesAtlas ? regionName : null;
    sign.userData.voxcelSignAtlasTexture = usesAtlas ? material.map.uuid : null;
    sign.userData.voxcelRoofOffset = { x: officeOffsetX, z: officeOffsetZ };
    sign.userData.collisionMode = "none";
    handle.scene.add(sign);
    view.roofSign = sign;
    view.rooftopSign = sign;
    state.rooftopSignCount += 1;
    if (usesAtlas) state.atlasRooftopSignCount += 1;
    return sign;
  }

  function createFrontageDetail(building, view, front, role, size, y, offset, color) {
    const BoxGeometry = view.door.geometry?.constructor;
    const Mesh = view.door.constructor;
    const sourceMaterial = view.roof?.material || view.door.material;
    if (typeof BoxGeometry !== "function" || typeof Mesh !== "function") return null;
    const material = cloneMaterial(sourceMaterial, `FrontageMaterial:${building.id}:${role}`);
    if (!material) return null;
    material.map = null;
    material.color?.setHex(color);
    material.roughness = 0.82;
    material.metalness = 0.04;
    material.needsUpdate = true;
    const geometry = new BoxGeometry(size[0], size[1], size[2]);
    const mesh = new Mesh(geometry, material);
    mesh.name = `BuildingFrontage:${building.id}:${role}`;
    const point = pointOnFront(building, front, offset);
    mesh.position.set(point.x, y, point.z);
    mesh.rotation.y = front.rotationY;
    mesh.castShadow = role !== "step";
    mesh.receiveShadow = true;
    mesh.userData.voxcelBuildingFrontage = true;
    mesh.userData.voxcelBuildingId = building.id;
    mesh.userData.voxcelFrontageRole = role;
    mesh.userData.collisionMode = "none";
    handle.scene.add(mesh);
    return mesh;
  }

  function createFrontWindow(building, view, front, part, lateral, width) {
    const BoxGeometry = view.door.geometry?.constructor;
    const Mesh = view.door.constructor;
    const sourceMaterial = view.windows?.find((candidate) => candidate?.material)?.material
      || view.sign.material;
    if (typeof BoxGeometry !== "function" || typeof Mesh !== "function") return null;
    const material = sourceMaterial?.clone?.() || sourceMaterial;
    if (!material) return null;
    material.name = `FrontWindowMaterial:${building.id}:${part}`;
    material.map = null;
    material.color?.setHex(0xb8dded);
    material.emissive?.setHex?.(0x183c52);
    material.emissiveIntensity = 0.28;
    material.roughness = 0.16;
    material.metalness = 0.28;
    material.needsUpdate = true;

    const geometry = new BoxGeometry(width, 2.05, 0.1);
    const mesh = new Mesh(geometry, material);
    mesh.name = `BuildingFrontage:${building.id}:display-window:${part}`;
    const point = pointOnFront(building, front, 0.16, lateral);
    mesh.position.set(point.x, 1.92, point.z);
    mesh.rotation.y = front.rotationY;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.voxcelBuildingFrontage = true;
    mesh.userData.voxcelBuildingId = building.id;
    mesh.userData.voxcelFrontageRole = "display-window";
    mesh.userData.voxcelFrontagePart = part;
    mesh.userData.collisionMode = "none";
    handle.scene.add(mesh);
    return mesh;
  }

  function clearDoorWindowOverlap(building, view, front) {
    if (!Array.isArray(view.windows)) return;
    for (const windowMesh of view.windows) {
      if (!windowMesh?.isMesh) continue;
      const position = worldPosition(windowMesh);
      const onFront = front.axis === "x"
        ? Math.abs(position.x - (building.x + front.direction * building.w / 2)) < 0.42
        : Math.abs(position.z - (building.z + front.direction * building.d / 2)) < 0.42;
      const horizontal = front.axis === "x"
        ? Math.abs(position.z - building.z)
        : Math.abs(position.x - building.x);
      if (onFront && horizontal < 0.92 && position.y < 3.45) {
        windowMesh.visible = false;
        windowMesh.userData.voxcelDoorClearance = true;
        clearanceWindows.add(windowMesh);
      }
    }
  }

  function orientBuilding(building) {
    const view = handle.buildingViews?.[building.id];
    const entrance = handle.entrances?.find((candidate) => candidate.b?.id === building.id);
    if (!view?.door?.isMesh || !view?.sign?.isMesh || !entrance?.pos) return false;

    const front = resolveFront(building);
    front.rotationY = rotationForFront(front);
    const frozenFront = Object.freeze({
      axis: front.axis,
      direction: front.direction,
      road: front.road,
      distance: Number(front.distance.toFixed(3)),
      rotationY: front.rotationY,
    });
    building.front = frozenFront;
    view.front = frozenFront;

    const doorPosition = worldPosition(view.door);
    const doorPoint = pointOnFront(building, frozenFront, 0.08);
    setWorldPosition(view.door, doorPoint.x, doorPosition.y, doorPoint.z);
    view.door.rotation.y = frozenFront.rotationY;
    view.door.name = `BuildingDoor:${building.id}`;
    view.door.userData.voxcelBuildingFront = frozenFront;

    const signPosition = worldPosition(view.sign);
    const signPoint = pointOnFront(building, frozenFront, 0.1);
    setWorldPosition(view.sign, signPoint.x, signPosition.y, signPoint.z);
    view.sign.rotation.y = frozenFront.rotationY;
    view.sign.userData.voxcelBuildingFront = frozenFront;

    const outside = pointOnFront(building, frozenFront, 1.8);
    entrance.pos.set(outside.x, 0, outside.z);
    entrance.front = frozenFront;
    building.exteriorEntrance = Object.freeze({ x: outside.x, y: 0, z: outside.z });

    clearDoorWindowOverlap(building, view, frozenFront);
    view.frontCanopy = createFrontageDetail(
      building,
      view,
      frozenFront,
      "canopy",
      [4.3, 0.28, 1.55],
      3.25,
      0.72,
      building.c,
    );
    view.frontStep = createFrontageDetail(
      building,
      view,
      frozenFront,
      "step",
      [3.1, 0.14, 1.25],
      0.08,
      1.18,
      0x6b7780,
    );
    const hasOriginalSouthFront = frozenFront.axis === "z" && frozenFront.direction === -1;
    const frontageSpan = frozenFront.axis === "x" ? building.d : building.w;
    if (!hasOriginalSouthFront) {
      const lateral = clamp(frontageSpan * 0.27, 2.45, 3.55);
      const windowWidth = clamp(frontageSpan * 0.18, 1.45, 2.2);
      view.frontWindows = [
        createFrontWindow(building, view, frozenFront, "left", -lateral, windowWidth),
        createFrontWindow(building, view, frozenFront, "right", lateral, windowWidth),
      ].filter(Boolean);
    } else {
      view.frontWindows = [];
    }
    createRooftopSign(building, view);

    state.frontages.push({
      id: building.id,
      ...frozenFront,
      entrance: { x: outside.x, z: outside.z },
    });
    state.orientedCount += 1;
    return true;
  }

  function relocateAfterExit(buildingId) {
    const entrance = handle.entrances?.find((candidate) => candidate.b?.id === buildingId);
    if (!entrance?.pos) return;
    const player = handle.playerRoot.position;
    const correctionX = entrance.pos.x - player.x;
    const correctionZ = entrance.pos.z - player.z;
    player.x = entrance.pos.x;
    player.z = entrance.pos.z;
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.x += correctionX;
      handle.playerShadow.position.z += correctionZ;
    }
    if (handle.camera?.position) {
      handle.camera.position.x += correctionX;
      handle.camera.position.z += correctionZ;
    }
    window.__voxcelEnhancements?.acceptNextMove?.();
    state.exitRelocations += 1;
  }

  function update() {
    const currentBuildingId = handle.state?.insideBld?.id || null;
    if (previousBuildingId && !currentBuildingId) relocateAfterExit(previousBuildingId);
    previousBuildingId = currentBuildingId;
    for (const windowMesh of clearanceWindows) windowMesh.visible = false;
  }

  function snapshot() {
    return {
      ready: state.ready,
      reason: state.reason,
      version: SYSTEM_VERSION,
      buildingCount: state.buildingCount,
      orientedCount: state.orientedCount,
      rooftopSignCount: state.rooftopSignCount,
      atlasRooftopSignCount: state.atlasRooftopSignCount,
      exitRelocations: state.exitRelocations,
      frontages: state.frontages.map((frontage) => ({
        ...frontage,
        entrance: { ...frontage.entrance },
      })),
    };
  }

  function initialize(runtimeHandle) {
    handle = runtimeHandle;
    handle.scene.updateMatrixWorld(true);
    state.buildingCount = handle.buildings.length;
    for (const building of handle.buildings) orientBuilding(building);
    handle.scene.updateMatrixWorld(true);
    previousBuildingId = handle.state?.insideBld?.id || null;
    unregisterBeforeRender = window.__voxcelEnhancements?.registerBeforeRender?.(update) || null;
    if (!unregisterBeforeRender) {
      const tick = () => {
        update();
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    }
    state.ready = true;
    state.reason = "ready";
    window.__voxcelBuildingFrontages = {
      ready: true,
      version: SYSTEM_VERSION,
      getState: snapshot,
      resolveFront(buildingOrId) {
        const building = typeof buildingOrId === "string"
          ? handle.buildings.find((candidate) => candidate.id === buildingOrId)
          : buildingOrId;
        return building ? { ...resolveFront(building) } : null;
      },
    };
    window.dispatchEvent(new CustomEvent("voxcel:building-frontages-ready", {
      detail: snapshot(),
    }));
  }

  window.__voxcelBuildingFrontages = {
    ready: false,
    version: SYSTEM_VERSION,
    getState: snapshot,
  };

  const startedAt = performance.now();
  const timer = window.setInterval(() => {
    const runtimeHandle = window.__voxcelPlayer;
    const enhancements = window.__voxcelEnhancements;
    const office = window.__voxcelOffice;
    if (
      runtimeHandle?.scene &&
      runtimeHandle?.playerRoot &&
      runtimeHandle?.state &&
      Array.isArray(runtimeHandle?.buildings) &&
      runtimeHandle?.buildingViews &&
      Array.isArray(runtimeHandle?.entrances) &&
      enhancements?.ready &&
      office?.ready
    ) {
      window.clearInterval(timer);
      try {
        initialize(runtimeHandle);
      } catch (error) {
        state.reason = error instanceof Error ? error.message : String(error);
        console.error("Building frontage system failed to initialize.", error);
      }
      return;
    }
    if (performance.now() - startedAt > 15000) {
      window.clearInterval(timer);
      state.reason = "runtime-bridge-timeout";
      console.error("Building frontage system could not find the extended runtime bridge.");
    }
  }, 20);
})();
