(() => {
  "use strict";

  const SYSTEM_VERSION = 1;
  const RUNTIME_TIMEOUT_MS = 20000;
  const runtime = {
    ready: false,
    status: "waiting",
    error: null,
    atlasStatus: "idle",
    atlasError: null,
    atlasTexture: null,
    handle: null,
    constructors: null,
    detailMaterial: null,
    records: [],
    nextVehicleIndex: 0,
    dynamicScanTimer: null,
    materials: new Set(),
    geometries: new Set(),
    geometryCache: new Map(),
    roleCounts: new Map(),
  };

  const api = {
    ready: false,
    version: SYSTEM_VERSION,
    getState: () => snapshot(),
  };
  window.__voxcelVehicles = api;

  function findPrototypeConstructor(object, methodName) {
    let prototype = Object.getPrototypeOf(object);
    while (prototype) {
      if (Object.prototype.hasOwnProperty.call(prototype, methodName)) {
        return prototype.constructor;
      }
      prototype = Object.getPrototypeOf(prototype);
    }
    return null;
  }

  function resolveConstructors(handle) {
    let sampleMesh = null;
    let boxGeometry = null;
    let cylinderGeometry = null;
    let material = null;
    let referenceTexture = null;

    for (const vehicle of handle.vehicles) {
      vehicle.m?.traverse?.((object) => {
        if (!sampleMesh && object.isMesh) sampleMesh = object;
        if (!boxGeometry && object.geometry?.type === "BoxGeometry") {
          boxGeometry = object.geometry;
        }
        if (!cylinderGeometry && object.geometry?.type === "CylinderGeometry") {
          cylinderGeometry = object.geometry;
        }
        const materials = object.isMesh
          ? (Array.isArray(object.material) ? object.material : [object.material])
          : [];
        for (const candidate of materials) {
          if (!material && candidate?.type === "MeshStandardMaterial") material = candidate;
          if (!referenceTexture && candidate?.map?.transformUv) referenceTexture = candidate.map;
        }
      });
    }

    if (!referenceTexture) {
      handle.scene.traverse((object) => {
        if (referenceTexture || !object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        referenceTexture = materials.find((candidate) => candidate?.map?.transformUv)?.map || null;
      });
    }

    const Texture = referenceTexture
      ? findPrototypeConstructor(referenceTexture, "transformUv")
      : null;
    const constructors = {
      Group: handle.vehicles[0]?.m?.constructor,
      Mesh: sampleMesh?.constructor,
      BoxGeometry: boxGeometry?.constructor,
      CylinderGeometry: cylinderGeometry?.constructor,
      Material: material?.constructor,
      Texture,
      referenceTexture,
    };

    if (
      !constructors.Group ||
      !constructors.Mesh ||
      !constructors.BoxGeometry ||
      !constructors.CylinderGeometry ||
      !constructors.Material ||
      !constructors.Texture
    ) {
      throw new Error("Could not resolve the game's Three.js vehicle constructors");
    }
    return constructors;
  }

  function markDetailObject(object, record, partId, role, atlasTile) {
    object.userData ||= {};
    object.userData.collisionMode = "none";
    object.userData.voxcelVehicleDetail = true;
    object.userData.voxcelVehicleId = record.id;
    object.userData.voxcelVehicleType = record.type;
    object.userData.voxcelVehiclePartId = partId;
    object.userData.voxcelVehicleRole = role;
    if (atlasTile) object.userData.voxcelVehicleAtlasTile = atlasTile;
  }

  function applyAtlasUv(geometry, tile) {
    const atlas = window.__voxcelVehicleAtlas;
    const uv = geometry.getAttribute?.("uv");
    if (!uv || !atlas?.getUvRect) return false;
    const rect = atlas.getUvRect(tile, 5);
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
    geometry.userData ||= {};
    geometry.userData.voxcelVehicleAtlasTile = tile;
    geometry.userData.voxcelVehicleAtlasRect = rect;
    return true;
  }

  function materialFactory(constructors, atlasTexture) {
    const cache = new Map();
    const styles = {
      glass: { color: 0xffffff, roughness: 0.16, metalness: 0.18 },
      grille: { color: 0xffffff, roughness: 0.5, metalness: 0.58 },
      headlight: {
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0xffe8b0,
        emissiveIntensity: 0.34,
      },
      rearLight: {
        color: 0xffffff,
        roughness: 0.22,
        metalness: 0.08,
        emissive: 0x8b120b,
        emissiveIntensity: 0.38,
      },
      panel: { color: 0xffffff, roughness: 0.4, metalness: 0.3 },
      bumper: { color: 0xffffff, roughness: 0.5, metalness: 0.5 },
      rubber: { color: 0xffffff, roughness: 0.76, metalness: 0.02 },
      wheel: { color: 0xffffff, roughness: 0.24, metalness: 0.76 },
      livery: { color: 0xffffff, roughness: 0.46, metalness: 0.14 },
    };

    return (styleName, tint = null) => {
      const cacheKey = `${styleName}:${tint ?? "neutral"}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey);
      const parameters = { ...(styles[styleName] || styles.panel) };
      if (tint !== null) parameters.color = tint;
      if (atlasTexture) parameters.map = atlasTexture;
      const material = new constructors.Material(parameters);
      material.name = `VoxcelVehicle:${styleName}${tint === null ? "" : `:${tint.toString(16)}`}`;
      material.userData ||= {};
      material.userData.voxcelVehicleMaterial = true;
      material.userData.voxcelVehicleMaterialStyle = styleName;
      material.userData.voxcelVehicleBodyTint = tint;
      material.userData.voxcelVehicleAtlasTexture = atlasTexture?.uuid || null;
      material.needsUpdate = true;
      runtime.materials.add(material);
      cache.set(cacheKey, material);
      return material;
    };
  }

  function incrementRole(role) {
    runtime.roleCounts.set(role, (runtime.roleCounts.get(role) || 0) + 1);
  }

  function createBox(record, parent, options) {
    const geometryKey = `box:${options.size.join("x")}:${options.tile}`;
    let geometry = runtime.geometryCache.get(geometryKey);
    if (!geometry) {
      geometry = new runtime.constructors.BoxGeometry(...options.size);
      applyAtlasUv(geometry, options.tile);
      runtime.geometryCache.set(geometryKey, geometry);
      runtime.geometries.add(geometry);
    }
    const mesh = new runtime.constructors.Mesh(geometry, options.material);
    mesh.name = `VoxcelVehicle:${record.id}:${options.partId}`;
    mesh.position.set(...options.position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.castShadow = options.castShadow ?? false;
    mesh.receiveShadow = options.receiveShadow ?? false;
    markDetailObject(mesh, record, options.partId, options.role, options.tile);
    incrementRole(options.role);
    record.detailMeshes.push(mesh);
    parent.add(mesh);
    return mesh;
  }

  function createWheelLayer(record, parent, options) {
    const geometryKey = `wheel:${options.radius}:${options.width}:${options.tile}`;
    let geometry = runtime.geometryCache.get(geometryKey);
    if (!geometry) {
      geometry = new runtime.constructors.CylinderGeometry(
        options.radius,
        options.radius,
        options.width,
        16,
      );
      applyAtlasUv(geometry, options.tile);
      runtime.geometryCache.set(geometryKey, geometry);
      runtime.geometries.add(geometry);
    }
    const mesh = new runtime.constructors.Mesh(geometry, options.material);
    mesh.name = `VoxcelVehicle:${record.id}:${options.partId}`;
    mesh.position.set(...options.position);
    mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = options.castShadow ?? false;
    mesh.receiveShadow = options.receiveShadow ?? false;
    markDetailObject(mesh, record, options.partId, options.role, options.tile);
    incrementRole(options.role);
    record.detailMeshes.push(mesh);
    parent.add(mesh);
    return mesh;
  }

  function addCarDetails(record, root, material) {
    const box = (partId, role, size, position, tile, style) => createBox(record, root, {
      partId,
      role,
      size,
      position,
      tile,
      material: material(style, style === "panel" ? record.originalBodyColor : null),
    });

    box("windshield:front", "windshield", [1.52, 0.58, 0.035], [0, 1.64, 1.043], "windshield", "glass");
    box("window:rear", "rear-window", [1.5, 0.53, 0.035], [0, 1.63, -1.243], "windshield", "glass");
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      box(`window:${label}:front`, "side-window", [0.035, 0.52, 0.8], [side * 0.868, 1.64, 0.56], "side_window", "glass");
      box(`window:${label}:rear`, "side-window", [0.035, 0.52, 0.8], [side * 0.868, 1.64, -0.52], "side_window", "glass");
      box(`mirror:${label}`, "mirror", [0.2, 0.2, 0.34], [side * 1.01, 1.52, 0.76], "side_window", "glass");
      box(`door:${label}:front`, "door", [0.03, 0.7, 1.36], [side * 1.113, 0.91, 0.42], "car_door", "panel");
      box(`door:${label}:rear`, "door", [0.03, 0.7, 1.28], [side * 1.113, 0.91, -1.0], "car_door", "panel");
    }

    box("grille:front", "grille", [1.12, 0.31, 0.035], [0, 0.66, 2.318], "grille", "grille");
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      box(`headlight:${label}`, "headlight", [0.43, 0.27, 0.04], [side * 0.73, 0.92, 2.322], "headlight", "headlight");
      box(`rear-light:${label}`, "rear-light", [0.42, 0.28, 0.04], [side * 0.75, 0.9, -2.322], "rear_light", "rearLight");
    }
    box("bumper:front", "bumper", [2.08, 0.18, 0.18], [0, 0.35, 2.36], "bumper", "bumper");
    box("bumper:rear", "bumper", [2.08, 0.18, 0.18], [0, 0.35, -2.36], "bumper", "bumper");
    box("hood", "hood", [1.84, 0.035, 1.12], [0, 1.352, 1.67], "hood", "panel");
    box("trunk", "trunk", [1.84, 0.035, 0.78], [0, 1.352, -1.88], "trunk", "panel");

    for (const side of [-1, 1]) {
      for (const z of [1.45, -1.45]) {
        const sideLabel = side < 0 ? "left" : "right";
        const axleLabel = z > 0 ? "front" : "rear";
        createWheelLayer(record, root, {
          partId: `wheel-tread:${sideLabel}:${axleLabel}`,
          role: "wheel-tread",
          radius: 0.365,
          width: 0.255,
          position: [side * 0.98, 0.34, z],
          tile: "tire_tread",
          material: material("rubber"),
          castShadow: true,
        });
        createWheelLayer(record, root, {
          partId: `wheel-face:${sideLabel}:${axleLabel}`,
          role: "wheel-face",
          radius: 0.3,
          width: 0.028,
          position: [side * 1.116, 0.34, z],
          tile: "wheel_face",
          material: material("wheel"),
        });
      }
    }
  }

  function addBusDetails(record, root, material) {
    const box = (partId, role, size, position, tile, style) => createBox(record, root, {
      partId,
      role,
      size,
      position,
      tile,
      material: material(style),
    });

    box("windshield:front", "windshield", [2.16, 0.92, 0.04], [0, 2.03, 5.132], "windshield", "glass");
    box("window:rear", "rear-window", [2.14, 0.82, 0.04], [0, 2.02, -5.132], "windshield", "glass");

    const leftWindows = [-3.8, -2.3, -0.8, 0.7, 2.2, 3.7];
    const rightWindows = [-3.8, -2.3, -0.8, 0.7, 2.05];
    for (const z of leftWindows) {
      box(`bus-window:left:${z}`, "bus-window", [0.04, 0.86, 1.3], [-1.323, 2.08, z], "bus_windows", "glass");
    }
    for (const z of rightWindows) {
      box(`bus-window:right:${z}`, "bus-window", [0.04, 0.86, 1.3], [1.323, 2.08, z], "bus_windows", "glass");
    }
    box("bus-door:right", "bus-door", [0.045, 1.94, 1.3], [1.327, 1.48, 3.75], "bus_door", "glass");
    box("livery:left", "livery", [0.04, 0.32, 8.45], [-1.326, 1.23, -0.08], "service_livery", "livery");
    box("livery:right", "livery", [0.04, 0.32, 6.95], [1.326, 1.23, -0.75], "service_livery", "livery");

    box("grille:front", "grille", [1.5, 0.38, 0.04], [0, 0.92, 5.137], "grille", "grille");
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      box(`headlight:${label}`, "headlight", [0.47, 0.3, 0.04], [side * 0.82, 1.2, 5.14], "headlight", "headlight");
      box(`rear-light:${label}`, "rear-light", [0.3, 0.62, 0.04], [side * 1.02, 1.35, -5.14], "rear_light", "rearLight");
      box(`mirror:${label}`, "mirror", [0.24, 0.32, 0.24], [side * 1.49, 2.2, 4.5], "side_window", "glass");
    }
    box("bumper:front", "bumper", [2.5, 0.24, 0.2], [0, 0.45, 5.19], "bumper", "bumper");
    box("bumper:rear", "bumper", [2.5, 0.24, 0.2], [0, 0.45, -5.19], "bumper", "bumper");

    for (const side of [-1, 1]) {
      for (const z of [3.2, 1, -1.2, -3.4]) {
        const sideLabel = side < 0 ? "left" : "right";
        const axleLabel = String(z).replace("-", "m").replace(".", "p");
        createWheelLayer(record, root, {
          partId: `wheel-tread:${sideLabel}:${axleLabel}`,
          role: "wheel-tread",
          radius: 0.47,
          width: 0.295,
          position: [side * 1.1, 0.5, z],
          tile: "tire_tread",
          material: material("rubber"),
          castShadow: true,
        });
        createWheelLayer(record, root, {
          partId: `wheel-face:${sideLabel}:${axleLabel}`,
          role: "wheel-face",
          radius: 0.39,
          width: 0.03,
          position: [side * 1.255, 0.5, z],
          tile: "wheel_face",
          material: material("wheel"),
        });
      }
    }
  }

  function findBodyMesh(vehicle) {
    return vehicle.m?.children?.find((child) => (
      child.isMesh && child.geometry?.type === "BoxGeometry" && child.material?.color
    )) || null;
  }

  function detailVehicle(vehicle, index, material) {
    const type = vehicle.type === "bus" ? "bus" : "car";
    const id = `${type}-${String(index).padStart(2, "0")}`;
    const body = findBodyMesh(vehicle);
    const record = {
      id,
      type,
      vehicle,
      body,
      originalBodyGeometry: body?.geometry || null,
      originalBodyMaterial: body?.material || null,
      originalBodyColor: body?.material?.color?.getHex?.() ?? null,
      dynamic: Boolean(vehicle.dynamic),
      detailRoot: null,
      detailMeshes: [],
    };

    vehicle.m.userData ||= {};
    vehicle.m.userData.voxcelVehicleRoot = true;
    vehicle.m.userData.voxcelVehicleId = id;
    vehicle.m.userData.voxcelVehicleType = type;

    const existing = vehicle.m.children.find((child) => child.userData?.voxcelVehicleDetailRoot);
    if (existing) {
      record.detailRoot = existing;
      existing.traverse((object) => {
        if (object.isMesh && object.userData?.voxcelVehicleDetail) record.detailMeshes.push(object);
      });
      return record;
    }

    const detailRoot = new runtime.constructors.Group();
    detailRoot.name = `VoxcelVehicleDetails:${id}`;
    detailRoot.userData ||= {};
    detailRoot.userData.collisionMode = "none";
    detailRoot.userData.voxcelVehicleDetailRoot = true;
    detailRoot.userData.voxcelVehicleId = id;
    detailRoot.userData.voxcelVehicleType = type;
    detailRoot.userData.voxcelVehicleRole = "detail-root";
    record.detailRoot = detailRoot;

    if (type === "bus") addBusDetails(record, detailRoot, material);
    else addCarDetails(record, detailRoot, material);

    vehicle.m.add(detailRoot);
    return record;
  }

  async function loadAtlas(handle, constructors) {
    const atlas = window.__voxcelVehicleAtlas;
    if (!atlas?.getTexture) {
      runtime.atlasStatus = "fallback";
      runtime.atlasError = "vehicle-atlas-runtime-unavailable";
      return null;
    }
    runtime.atlasStatus = "loading";
    try {
      const texture = await atlas.getTexture({
        TextureConstructor: constructors.Texture,
        referenceTexture: constructors.referenceTexture,
        renderer: handle.renderer,
      });
      runtime.atlasStatus = "ready";
      runtime.atlasError = null;
      return texture;
    } catch (error) {
      runtime.atlasStatus = "fallback";
      runtime.atlasError = error instanceof Error ? error.message : String(error);
      console.warn("Voxcel vehicle atlas could not be loaded; using solid vehicle details.", error);
      return null;
    }
  }

  function scanDynamicVehicles() {
    if (!runtime.handle?.scene || !runtime.detailMaterial) return;
    runtime.records = runtime.records.filter((record) => (
      !record.dynamic || Boolean(record.vehicle.m?.parent)
    ));
    runtime.handle.scene.traverse((object) => {
      if (
        !Array.isArray(object.userData?.sirenMats) ||
        object.userData.voxcelVehicleRoot ||
        !object.parent
      ) return;
      const vehicle = { m: object, type: "car", dynamic: true };
      const record = detailVehicle(
        vehicle,
        runtime.nextVehicleIndex,
        runtime.detailMaterial,
      );
      runtime.nextVehicleIndex += 1;
      runtime.records.push(record);
    });
  }

  async function initialize(handle) {
    runtime.status = "initializing";
    runtime.handle = handle;
    runtime.constructors = resolveConstructors(handle);
    runtime.atlasTexture = await loadAtlas(handle, runtime.constructors);
    runtime.detailMaterial = materialFactory(runtime.constructors, runtime.atlasTexture);
    runtime.records = handle.vehicles.map((vehicle) => {
      const record = detailVehicle(vehicle, runtime.nextVehicleIndex, runtime.detailMaterial);
      runtime.nextVehicleIndex += 1;
      return record;
    });
    scanDynamicVehicles();
    runtime.dynamicScanTimer = window.setInterval(scanDynamicVehicles, 200);
    handle.scene.updateMatrixWorld(true);
    runtime.ready = true;
    runtime.status = "ready";
    runtime.error = null;
    api.ready = true;
  }

  function mappedTextureUuids() {
    const uuids = new Set();
    for (const record of runtime.records) {
      for (const mesh of record.detailMeshes) {
        if (mesh.material?.map?.uuid) uuids.add(mesh.material.map.uuid);
      }
    }
    return uuids;
  }

  function snapshot() {
    const atlasState = window.__voxcelVehicleAtlas?.getState?.() || {};
    const vehicleCount = runtime.records.length;
    const carCount = runtime.records.filter((record) => record.type === "car").length;
    const busCount = runtime.records.filter((record) => record.type === "bus").length;
    const dynamicVehicleCount = runtime.records.filter((record) => record.dynamic).length;
    const detailMeshCount = runtime.records.reduce(
      (sum, record) => sum + record.detailMeshes.length,
      0,
    );
    const mappedDetailMeshCount = runtime.records.reduce((sum, record) => (
      sum + record.detailMeshes.filter((mesh) => Boolean(mesh.material?.map)).length
    ), 0);
    const collisionlessDetailCount = runtime.records.reduce((sum, record) => (
      sum + record.detailMeshes.filter((mesh) => mesh.userData?.collisionMode === "none").length
    ), 0);
    const textureUuids = mappedTextureUuids();
    const originalBodiesPreserved = runtime.records.every((record) => (
      !record.body || (
        record.body.geometry === record.originalBodyGeometry &&
        record.body.material === record.originalBodyMaterial &&
        record.body.material?.color?.getHex?.() === record.originalBodyColor
      )
    ));

    return {
      ready: runtime.ready,
      version: SYSTEM_VERSION,
      status: runtime.status,
      error: runtime.error,
      vehicleCount,
      totalVehicles: vehicleCount,
      carCount,
      busCount,
      cars: carCount,
      buses: busCount,
      dynamicVehicleCount,
      detailedVehicleCount: runtime.records.length,
      detailRootCount: runtime.records.filter((record) => (
        record.detailRoot?.userData?.voxcelVehicleDetailRoot
      )).length,
      taggedRootCount: runtime.records.filter((record) => (
        record.vehicle.m?.userData?.voxcelVehicleRoot
      )).length,
      detailMeshCount,
      sharedGeometryCount: runtime.geometries.size,
      geometryReuse: detailMeshCount > runtime.geometries.size,
      mappedDetailMeshCount,
      collisionlessDetailCount,
      allDetailsCollisionless: detailMeshCount > 0 && collisionlessDetailCount === detailMeshCount,
      roles: [...runtime.roleCounts.keys()].sort(),
      roleCounts: Object.fromEntries([...runtime.roleCounts.entries()].sort()),
      originalBodiesPreserved,
      atlas: {
        status: runtime.atlasStatus,
        ready: runtime.atlasStatus === "ready",
        error: runtime.atlasError || atlasState.error || null,
        url: atlasState.url || window.__voxcelVehicleAtlas?.url || null,
        width: atlasState.width || window.__voxcelVehicleAtlas?.width || 0,
        height: atlasState.height || window.__voxcelVehicleAtlas?.height || 0,
        gridSize: window.__voxcelVehicleAtlas?.gridSize || 0,
        tileCount: atlasState.tileCount || Object.keys(window.__voxcelVehicleAtlas?.tiles || {}).length,
        textureUuid: runtime.atlasTexture?.uuid || atlasState.textureUuid || null,
        detailTextureCount: textureUuids.size,
        sharedTexture: Boolean(
          runtime.atlasTexture &&
          detailMeshCount > 0 &&
          mappedDetailMeshCount === detailMeshCount &&
          textureUuids.size === 1 &&
          textureUuids.has(runtime.atlasTexture.uuid)
        ),
      },
    };
  }

  function fail(error) {
    runtime.ready = false;
    runtime.status = "error";
    runtime.error = error instanceof Error ? error.message : String(error);
    api.ready = false;
    console.error("Voxcel vehicle details failed to initialize.", error);
  }

  function waitForRuntime() {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const handle = window.__voxcelPlayer;
      if (
        handle?.scene?.traverse &&
        handle?.renderer &&
        Array.isArray(handle?.vehicles) &&
        handle.vehicles.length > 0 &&
        handle.vehicles.every((vehicle) => vehicle?.m?.traverse)
      ) {
        window.clearInterval(timer);
        Promise.resolve(initialize(handle)).catch(fail);
        return;
      }
      if (performance.now() - startedAt > RUNTIME_TIMEOUT_MS) {
        window.clearInterval(timer);
        fail(new Error("Timed out waiting for the Voxcel vehicle runtime bridge"));
      }
    }, 30);
  }

  waitForRuntime();
})();
