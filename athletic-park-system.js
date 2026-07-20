(() => {
  "use strict";

  if (window.__voxcelAthletics?.ready) return;

  const SYSTEM_VERSION = 1;
  const FACILITY = Object.freeze({
    id: "sky-water-athletic",
    name: "スカイ＆ウォーター・アスレチック",
    x: -92,
    z: 106,
    w: 88,
    d: 52,
    bounds: Object.freeze({ minX: -136, maxX: -48, minZ: 80, maxZ: 132 }),
    entrance: Object.freeze({ x: -92, y: 0.01, z: 79.5 }),
  });
  const REMOVED_LANDMARKS = Object.freeze([
    Object.freeze({ id: "southwest-tower-west", x: -110, z: 112, w: 14, d: 12, h: 30 }),
    Object.freeze({ id: "southwest-tower-east", x: -84, z: 118, w: 20, d: 16, h: 42 }),
  ]);
  const PLAYER_GROUND_Y = 0.01;
  const ACTION_DISTANCE = 3.35;

  const state = {
    ready: false,
    reason: "initializing",
    removedBuildingCount: 0,
    removedObjectCount: 0,
    clearedSceneryCount: 0,
    meshCount: 0,
    solidMeshCount: 0,
    decorativeMeshCount: 0,
    roles: new Set(),
    roleCounts: new Map(),
    mapRegistered: false,
    activeChallenge: null,
    completedChallenges: new Set(),
    challengesStarted: 0,
    challengesCompleted: 0,
    nearestChallenge: null,
    initializedAt: 0,
  };

  let handle = null;
  let root = null;
  let actionButton = null;
  let unregisterBeforeRender = null;
  let animatedTrolley = null;
  let animatedFlags = [];
  let constructors = null;
  const removedObjects = [];
  const ownedTextures = new Set();
  const materials = {};

  const challengeDefinitions = [
    {
      id: "water",
      label: "水上コースに挑戦",
      announcement: "💦 水上バランスコース、スタート！",
      completion: "🏁 水上バランスコースをクリア！",
      start: { x: -129, y: PLAYER_GROUND_Y, z: 96 },
      finish: { x: -102, y: PLAYER_GROUND_Y, z: 119 },
      durationMs: 5_200,
      path: [
        [-129, PLAYER_GROUND_Y, 96],
        [-125.5, 0.22, 99],
        [-121.5, 0.26, 102.5],
        [-124, 0.26, 106.5],
        [-118.5, 0.26, 109],
        [-114, 0.26, 106],
        [-110.5, 0.26, 111],
        [-106.5, 0.26, 115],
        [-102, PLAYER_GROUND_Y, 119],
      ],
    },
    {
      id: "wall",
      label: "巨大ウォールに挑戦",
      announcement: "🧗 反り立つウォール、スタート！",
      completion: "🔔 巨大ウォールのベルにタッチ！",
      start: { x: -101, y: PLAYER_GROUND_Y, z: 120 },
      finish: { x: -101, y: PLAYER_GROUND_Y, z: 130 },
      durationMs: 4_300,
      path: [
        [-101, PLAYER_GROUND_Y, 120],
        [-101, 1.1, 123.5],
        [-101, 3.8, 126.2],
        [-101, 7.8, 128.2],
        [-101, 8.4, 129],
        [-101, PLAYER_GROUND_Y, 130],
      ],
    },
    {
      id: "zipline",
      label: "ジップラインで滑る",
      announcement: "🪂 ロングジップライン、出発！",
      completion: "✨ ロングジップラインをクリア！",
      start: { x: -62, y: PLAYER_GROUND_Y, z: 124.5 },
      finish: { x: -108, y: PLAYER_GROUND_Y, z: 84.5 },
      durationMs: 6_200,
      path: [
        [-62, PLAYER_GROUND_Y, 124.5],
        [-64, 9.2, 124],
        [-70, 8.35, 118.5],
        [-80, 6.9, 110],
        [-91, 5.3, 100.5],
        [-101, 3.7, 91.5],
        [-108, 2.6, 85],
        [-108, PLAYER_GROUND_Y, 84.5],
      ],
    },
  ];

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function closeTo(value, expected, epsilon = 0.04) {
    return Math.abs(finite(value) - expected) <= epsilon;
  }

  function pointInsideSite(position, inset = 0) {
    return Boolean(
      position &&
      position.x >= FACILITY.bounds.minX + inset &&
      position.x <= FACILITY.bounds.maxX - inset &&
      position.z >= FACILITY.bounds.minZ + inset &&
      position.z <= FACILITY.bounds.maxZ - inset
    );
  }

  function isWithinObject(object, ancestor) {
    let current = object;
    while (current) {
      if (current === ancestor) return true;
      current = current.parent;
    }
    return false;
  }

  function resolveConstructors() {
    const found = {
      Group: handle.playerRoot?.constructor,
      Vector3: handle.playerRoot?.position?.constructor,
      Mesh: null,
      BoxGeometry: null,
      PlaneGeometry: null,
      CylinderGeometry: null,
      ConeGeometry: null,
      Material: null,
      Texture: null,
      referenceTexture: null,
    };

    handle.scene.traverse((object) => {
      if (!found.Mesh && object.isMesh) found.Mesh = object.constructor;
      const geometry = object.geometry;
      if (geometry?.type === "BoxGeometry" && !found.BoxGeometry) {
        found.BoxGeometry = geometry.constructor;
      }
      if (geometry?.type === "PlaneGeometry" && !found.PlaneGeometry) {
        found.PlaneGeometry = geometry.constructor;
      }
      if (geometry?.type === "CylinderGeometry" && !found.CylinderGeometry) {
        found.CylinderGeometry = geometry.constructor;
      }
      if (geometry?.type === "ConeGeometry" && !found.ConeGeometry) {
        found.ConeGeometry = geometry.constructor;
      }
      const candidates = Array.isArray(object.material) ? object.material : [object.material];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (!found.Material && candidate.type === "MeshStandardMaterial") {
          found.Material = candidate.constructor;
        }
        if (!found.referenceTexture && candidate.map) {
          found.referenceTexture = candidate.map;
          found.Texture = candidate.map.constructor;
        }
      }
    });
    return found;
  }

  function createMaterial(name, color, options = {}) {
    const parameters = {
      color,
      roughness: options.roughness ?? 0.82,
      metalness: options.metalness ?? 0.02,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    };
    if (options.side !== undefined) parameters.side = options.side;
    if (options.map) parameters.map = options.map;
    const material = new constructors.Material(parameters);
    material.name = `AthleticMaterial:${name}`;
    material.userData.voxcelAthleticMaterial = true;
    return material;
  }

  function buildPalette() {
    materials.grass = createMaterial("grass", 0x4f9a58, { roughness: 0.95 });
    materials.path = createMaterial("path", 0xe3c98e, { roughness: 0.94 });
    materials.darkWood = createMaterial("dark-wood", 0x5a3522, { roughness: 0.88 });
    materials.wood = createMaterial("wood", 0x9b6238, { roughness: 0.84 });
    materials.lightWood = createMaterial("light-wood", 0xd49a57, { roughness: 0.82 });
    materials.rope = createMaterial("rope", 0xd3b16b, { roughness: 0.92 });
    materials.steel = createMaterial("steel", 0x344454, { roughness: 0.38, metalness: 0.58 });
    materials.water = createMaterial("water", 0x35bddd, {
      roughness: 0.16,
      metalness: 0.06,
      transparent: true,
      opacity: 0.76,
      emissive: 0x0b6078,
      emissiveIntensity: 0.18,
    });
    materials.waterEdge = createMaterial("water-edge", 0x74c7a1, { roughness: 0.92 });
    materials.lime = createMaterial("lime", 0x8bd448, { roughness: 0.72 });
    materials.yellow = createMaterial("yellow", 0xffcf43, { roughness: 0.68 });
    materials.orange = createMaterial("orange", 0xf2763b, { roughness: 0.7 });
    materials.coral = createMaterial("coral", 0xed5564, { roughness: 0.72 });
    materials.purple = createMaterial("purple", 0x8658c7, { roughness: 0.72 });
    materials.teal = createMaterial("teal", 0x1c9c88, { roughness: 0.72 });
    materials.navy = createMaterial("navy", 0x16384c, { roughness: 0.62 });
    materials.white = createMaterial("white", 0xf4f3dd, { roughness: 0.74 });
  }

  function recordRole(role, solid) {
    state.roles.add(role);
    state.roleCounts.set(role, (state.roleCounts.get(role) || 0) + 1);
    state.meshCount += 1;
    if (solid) state.solidMeshCount += 1;
    else state.decorativeMeshCount += 1;
  }

  function decorateMesh(mesh, name, role, solid) {
    mesh.name = `Athletic:${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.voxcelAthletic = true;
    mesh.userData.voxcelAthleticRole = role;
    mesh.userData.voxcelAthleticSolid = Boolean(solid);
    if (!solid) mesh.userData.collisionMode = "none";
    recordRole(role, solid);
    return mesh;
  }

  function addBox(name, role, size, position, material, options = {}) {
    const geometry = new constructors.BoxGeometry(size[0], size[1], size[2]);
    const mesh = decorateMesh(
      new constructors.Mesh(geometry, material),
      name,
      role,
      options.solid ?? false,
    );
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationX) mesh.rotation.x = options.rotationX;
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    if (options.rotationZ) mesh.rotation.z = options.rotationZ;
    if (options.castShadow === false) mesh.castShadow = false;
    root.add(mesh);
    return mesh;
  }

  function addPlane(name, role, size, position, material, options = {}) {
    if (!constructors.PlaneGeometry) return null;
    const geometry = new constructors.PlaneGeometry(size[0], size[1]);
    const mesh = decorateMesh(
      new constructors.Mesh(geometry, material),
      name,
      role,
      false,
    );
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationX) mesh.rotation.x = options.rotationX;
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    if (options.rotationZ) mesh.rotation.z = options.rotationZ;
    mesh.castShadow = false;
    root.add(mesh);
    return mesh;
  }

  function addCone(name, role, radius, height, position, material, options = {}) {
    if (!constructors.ConeGeometry) {
      return addCylinder(name, role, radius * 0.72, height, position, material, options);
    }
    const geometry = new constructors.ConeGeometry(radius, height, options.segments ?? 7);
    const mesh = decorateMesh(
      new constructors.Mesh(geometry, material),
      name,
      role,
      options.solid ?? false,
    );
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    root.add(mesh);
    return mesh;
  }

  function addCylinder(name, role, radius, height, position, material, options = {}) {
    if (!constructors.CylinderGeometry) {
      return addBox(
        name,
        role,
        [radius * 1.7, height, radius * 1.7],
        position,
        material,
        options,
      );
    }
    const geometry = new constructors.CylinderGeometry(
      radius,
      options.topRadius ?? radius,
      height,
      options.segments ?? 8,
    );
    const mesh = decorateMesh(
      new constructors.Mesh(geometry, material),
      name,
      role,
      options.solid ?? false,
    );
    mesh.position.set(position[0], position[1], position[2]);
    root.add(mesh);
    return mesh;
  }

  function addBeamBetween(name, role, from, to, radius, material, options = {}) {
    const start = new constructors.Vector3(from[0], from[1], from[2]);
    const end = new constructors.Vector3(to[0], to[1], to[2]);
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (constructors.CylinderGeometry) {
      const geometry = new constructors.CylinderGeometry(radius, radius, length, options.segments ?? 6);
      const mesh = decorateMesh(
        new constructors.Mesh(geometry, material),
        name,
        role,
        options.solid ?? false,
      );
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(
        new constructors.Vector3(0, 1, 0),
        direction.normalize(),
      );
      root.add(mesh);
      return mesh;
    }
    const mesh = addBox(
      name,
      role,
      [radius * 2, radius * 2, length],
      [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
      material,
      options,
    );
    mesh.lookAt(end);
    return mesh;
  }

  function createSignTexture() {
    if (!constructors.Texture) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#114b3b");
    gradient.addColorStop(0.5, "#1b8167");
    gradient.addColorStop(1, "#114b3b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#f4d35e";
    context.lineWidth = 18;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.fillStyle = "#f9f4dc";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 80px system-ui, sans-serif";
    context.fillText("SKY & WATER ATHLETIC", canvas.width / 2, 96);
    context.fillStyle = "#ffe078";
    context.font = "800 48px system-ui, sans-serif";
    context.fillText("森・空・水のアドベンチャー", canvas.width / 2, 182);
    const texture = new constructors.Texture(canvas);
    texture.name = "AthleticEntranceSignTexture";
    texture.flipY = true;
    texture.wrapS = 1001;
    texture.wrapT = 1001;
    texture.magFilter = 1006;
    texture.minFilter = 1008;
    texture.generateMipmaps = true;
    texture.colorSpace = constructors.referenceTexture?.colorSpace || "srgb";
    texture.needsUpdate = true;
    ownedTextures.add(texture);
    return texture;
  }

  function clearSite() {
    handle.scene.updateMatrixWorld(true);
    const candidates = [...handle.scene.children];
    const matchedLandmarks = new Set();

    for (const object of candidates) {
      if (
        object === root ||
        object === handle.playerRoot ||
        object === handle.playerShadow ||
        isWithinObject(handle.playerRoot, object) ||
        object.userData?.voxcelCloud ||
        object.userData?.voxcelAthletic ||
        !pointInsideSite(object.position)
      ) {
        continue;
      }

      for (const landmark of REMOVED_LANDMARKS) {
        const parameters = object.geometry?.parameters;
        if (
          object.isMesh &&
          object.geometry?.type === "BoxGeometry" &&
          closeTo(object.position.x, landmark.x) &&
          closeTo(object.position.y, landmark.h / 2) &&
          closeTo(object.position.z, landmark.z) &&
          closeTo(parameters?.width, landmark.w) &&
          closeTo(parameters?.height, landmark.h) &&
          closeTo(parameters?.depth, landmark.d)
        ) {
          matchedLandmarks.add(landmark.id);
        }
      }

      object.visible = false;
      object.userData ||= {};
      object.userData.voxcelAthleticSiteRemoved = true;
      object.userData.voxcelAthleticSite = FACILITY.id;
      if (object.isGroup) state.clearedSceneryCount += 1;
      object.removeFromParent();
      removedObjects.push(object);
    }

    state.removedBuildingCount = matchedLandmarks.size;
    state.removedObjectCount = removedObjects.length;
    if (state.removedBuildingCount !== REMOVED_LANDMARKS.length) {
      throw new Error(`expected ${REMOVED_LANDMARKS.length} decorative towers, found ${state.removedBuildingCount}`);
    }
  }

  function buildEntranceAndGround() {
    addBox("site-ground", "landscape", [87, 0.05, 51], [-92, 0.025, 106], materials.grass, {
      solid: false,
      castShadow: false,
    });
    addBox("entrance-path", "entrance", [9.5, 0.07, 15], [-92, 0.065, 83.5], materials.path, {
      solid: false,
      castShadow: false,
    });
    addBox("main-loop-west", "landscape", [4.4, 0.06, 36], [-96, 0.06, 106], materials.path, {
      solid: false,
      rotationY: -0.27,
      castShadow: false,
    });
    addBox("main-loop-east", "landscape", [4.2, 0.06, 34], [-78, 0.06, 106], materials.path, {
      solid: false,
      rotationY: 0.28,
      castShadow: false,
    });

    for (const x of [-98.2, -85.8]) {
      addBox(`gate-post-${x}`, "entrance", [0.9, 8.4, 0.9], [x, 4.2, 81.5], materials.darkWood, {
        solid: true,
      });
      addBox(`gate-cap-${x}`, "entrance", [1.5, 0.42, 1.5], [x, 8.55, 81.5], materials.yellow, {
        solid: false,
      });
    }
    addBox("gate-beam", "entrance", [13.3, 0.72, 0.9], [-92, 8.02, 81.5], materials.wood, {
      solid: false,
    });

    const signTexture = createSignTexture();
    const signMaterial = signTexture
      ? createMaterial("entrance-sign", 0xffffff, {
        map: signTexture,
        roughness: 0.56,
        emissive: 0x12382c,
        emissiveIntensity: 0.22,
        side: 2,
      })
      : materials.teal;
    addBox("entrance-sign-back", "entrance", [11.2, 2.15, 0.34], [-92, 6.68, 81.5], materials.navy, {
      solid: false,
    });
    addPlane("entrance-sign", "entrance", [10.75, 1.75], [-92, 6.68, 81.3], signMaterial, {
      rotationY: Math.PI,
    });

    const fenceXPositions = [];
    for (let x = FACILITY.bounds.minX + 2; x <= FACILITY.bounds.maxX - 2; x += 4) {
      if (Math.abs(x - FACILITY.entrance.x) > 8) fenceXPositions.push(x);
    }
    for (const x of fenceXPositions) {
      addBox(`south-fence-post-${x}`, "fence", [0.24, 1.55, 0.24], [x, 0.78, 80.5], materials.darkWood, {
        solid: false,
      });
      addBox(`north-fence-post-${x}`, "fence", [0.24, 1.55, 0.24], [x, 0.78, 131.5], materials.darkWood, {
        solid: false,
      });
    }
    for (const x of [-127, -116, -105, -79, -68, -57]) {
      addBox(`south-fence-rail-${x}`, "fence", [10.8, 0.18, 0.18], [x, 0.88, 80.5], materials.wood, {
        solid: false,
      });
    }
    addBox("north-fence-rail", "fence", [84, 0.18, 0.18], [-92, 0.88, 131.5], materials.wood, {
      solid: false,
    });
    for (const x of [FACILITY.bounds.minX + 0.5, FACILITY.bounds.maxX - 0.5]) {
      for (let z = 83; z <= 129; z += 4) {
        addBox(`side-fence-post-${x}-${z}`, "fence", [0.24, 1.55, 0.24], [x, 0.78, z], materials.darkWood, {
          solid: false,
        });
      }
      addBox(`side-fence-rail-${x}`, "fence", [0.18, 0.18, 47], [x, 0.88, 106], materials.wood, {
        solid: false,
      });
    }

    for (const [x, color] of [[-99.2, materials.coral], [-84.8, materials.yellow]]) {
      const pole = addBox(`gate-flag-pole-${x}`, "entrance", [0.12, 3.2, 0.12], [x, 10.15, 81.5], materials.steel, {
        solid: false,
      });
      const flag = addBox(`gate-flag-${x}`, "entrance", [2.25, 1.18, 0.08], [x + 1.08, 10.9, 81.5], color, {
        solid: false,
      });
      flag.userData.voxcelAthleticFlagPole = pole.name;
      flag.userData.baseRotationZ = 0;
      animatedFlags.push(flag);
    }
  }

  function buildForestLandscape() {
    const treePositions = [
      [-132, 86, 1.05], [-124, 86.5, 0.86], [-114.5, 87, 1.02],
      [-80, 86, 0.9], [-67, 86.5, 1.08], [-55, 87.5, 0.88],
      [-133, 126.5, 0.9], [-123.5, 128, 1.05], [-114, 128.5, 0.82],
      [-88, 127.5, 0.94], [-57, 128, 1.08], [-55, 111, 0.86],
      [-93, 91.5, 0.78], [-82, 92.5, 0.86], [-128, 123, 0.74],
    ];
    treePositions.forEach(([x, z, scale], index) => {
      addCylinder(
        `forest-tree-${index}-trunk`,
        "landscape",
        0.34 * scale,
        3.15 * scale,
        [x, 1.58 * scale, z],
        materials.darkWood,
        { solid: true, segments: 7 },
      );
      addCone(
        `forest-tree-${index}-crown-lower`,
        "landscape",
        2.25 * scale,
        3.45 * scale,
        [x, 4.05 * scale, z],
        index % 3 === 0 ? materials.teal : materials.grass,
        { solid: false, segments: 7, rotationY: index * 0.63 },
      );
      addCone(
        `forest-tree-${index}-crown-upper`,
        "landscape",
        1.55 * scale,
        2.75 * scale,
        [x, 5.55 * scale, z],
        index % 4 === 0 ? materials.lime : materials.grass,
        { solid: false, segments: 7, rotationY: index * 0.41 },
      );
    });

    const rocks = [
      [-129, 90, 1.2], [-119, 90, 0.75], [-86, 88, 0.9], [-75, 90, 1.1],
      [-61, 93, 0.8], [-131, 129, 1.0], [-110, 129, 0.7], [-64, 130, 1.2],
    ];
    rocks.forEach(([x, z, scale], index) => {
      addCylinder(
        `forest-rock-${index}`,
        "landscape",
        0.9 * scale,
        0.7 * scale,
        [x, 0.34 * scale, z],
        index % 2 ? materials.steel : materials.navy,
        { solid: true, segments: 6, topRadius: 0.62 * scale },
      );
    });
  }

  function buildWaterCourse() {
    addBox("water-basin", "water-course", [30, 0.12, 25], [-117, 0.04, 107], materials.water, {
      solid: false,
      castShadow: false,
    });
    addBox("water-bank-north", "water-course", [31, 0.24, 1.2], [-117, 0.12, 119.8], materials.waterEdge, {
      solid: false,
    });
    addBox("water-bank-south", "water-course", [31, 0.24, 1.2], [-117, 0.12, 94.2], materials.waterEdge, {
      solid: false,
    });
    addBox("water-bank-west", "water-course", [1.2, 0.24, 24], [-132.4, 0.12, 107], materials.waterEdge, {
      solid: false,
    });
    addBox("water-bank-east-upper", "water-course", [1.2, 0.24, 9], [-101.6, 0.12, 115], materials.waterEdge, {
      solid: false,
    });
    addBox("water-bank-east-lower", "water-course", [1.2, 0.24, 8], [-101.6, 0.12, 99], materials.waterEdge, {
      solid: false,
    });

    const stones = [
      [-128.2, 99], [-124, 102.4], [-125.5, 106.6], [-119.2, 109.2],
      [-114.2, 106.2], [-110.4, 111], [-106.4, 115], [-102.8, 118.2],
    ];
    stones.forEach(([x, z], index) => {
      addCylinder(
        `water-step-${index + 1}`,
        "water-course",
        index % 3 === 0 ? 1.18 : 0.92,
        0.34,
        [x, 0.19, z],
        [materials.yellow, materials.orange, materials.lime, materials.purple][index % 4],
        { solid: false, segments: 8 },
      );
    });

    for (let index = 0; index < 7; index += 1) {
      addBox(
        `water-dash-plank-${index}`,
        "water-course",
        [2.7, 0.24, 0.78],
        [-130 + index * 3.8, 0.22, 115.7 + Math.sin(index * 1.7) * 0.55],
        index % 2 ? materials.teal : materials.lightWood,
        { solid: false, rotationY: index % 2 ? 0.12 : -0.12 },
      );
    }

    for (const x of [-129.5, -104.5]) {
      addBox(`water-rope-post-${x}-a`, "water-course", [0.42, 4.6, 0.42], [x, 2.3, 98], materials.darkWood, {
        solid: true,
      });
      addBox(`water-rope-post-${x}-b`, "water-course", [0.42, 4.6, 0.42], [x, 2.3, 112], materials.darkWood, {
        solid: true,
      });
    }
    addBeamBetween("water-overhead-rope-west", "water-course", [-129.5, 4.3, 98], [-129.5, 4.3, 112], 0.09, materials.rope);
    addBeamBetween("water-overhead-rope-east", "water-course", [-104.5, 4.3, 98], [-104.5, 4.3, 112], 0.09, materials.rope);
    for (let index = 0; index < 7; index += 1) {
      const z = 99 + index * 2;
      addBeamBetween(`water-hanging-rope-${index}`, "water-course", [-129.5, 4.3, z], [-104.5, 4.3, z], 0.055, materials.rope);
      addCylinder(`water-hanging-ball-${index}`, "water-course", 0.42, 0.58, [-117 + Math.sin(index * 1.2) * 4, 2.2, z], index % 2 ? materials.yellow : materials.coral, {
        solid: false,
        segments: 8,
      });
    }
  }

  function buildFortressAndBridge() {
    const towers = [
      { id: "south", x: -72, z: 96, platformY: 4.6, roof: materials.orange },
      { id: "north", x: -72, z: 119, platformY: 6.2, roof: materials.purple },
    ];
    for (const tower of towers) {
      for (const [offsetX, offsetZ] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) {
        addBox(
          `fort-${tower.id}-post-${offsetX}-${offsetZ}`,
          "fortress",
          [0.62, tower.platformY + 1.3, 0.62],
          [tower.x + offsetX, (tower.platformY + 1.3) / 2, tower.z + offsetZ],
          materials.darkWood,
          { solid: true },
        );
      }
      addBox(
        `fort-${tower.id}-platform`,
        "fortress",
        [6.6, 0.48, 6.6],
        [tower.x, tower.platformY, tower.z],
        materials.lightWood,
        { solid: false },
      );
      addBox(
        `fort-${tower.id}-parapet-north`,
        "fortress",
        [6.8, 1.15, 0.28],
        [tower.x, tower.platformY + 0.8, tower.z + 3.25],
        tower.roof,
        { solid: false },
      );
      addBox(
        `fort-${tower.id}-parapet-south`,
        "fortress",
        [6.8, 1.15, 0.28],
        [tower.x, tower.platformY + 0.8, tower.z - 3.25],
        tower.roof,
        { solid: false },
      );
      addBox(
        `fort-${tower.id}-parapet-west`,
        "fortress",
        [0.28, 1.15, 6.2],
        [tower.x - 3.25, tower.platformY + 0.8, tower.z],
        tower.roof,
        { solid: false },
      );
      addBox(
        `fort-${tower.id}-parapet-east`,
        "fortress",
        [0.28, 1.15, 6.2],
        [tower.x + 3.25, tower.platformY + 0.8, tower.z],
        tower.roof,
        { solid: false },
      );
      for (let rung = 0; rung < 7; rung += 1) {
        addBox(
          `fort-${tower.id}-ladder-rung-${rung}`,
          "fortress",
          [2.2, 0.18, 0.18],
          [tower.x, 0.7 + rung * 0.68, tower.z - 3.45],
          materials.rope,
          { solid: false },
        );
      }
      addBox(
        `fort-${tower.id}-ladder-left`,
        "fortress",
        [0.18, tower.platformY, 0.18],
        [tower.x - 1.2, tower.platformY / 2, tower.z - 3.45],
        materials.rope,
        { solid: false },
      );
      addBox(
        `fort-${tower.id}-ladder-right`,
        "fortress",
        [0.18, tower.platformY, 0.18],
        [tower.x + 1.2, tower.platformY / 2, tower.z - 3.45],
        materials.rope,
        { solid: false },
      );
    }

    const bridgeLength = 16.2;
    for (let index = 0; index < 12; index += 1) {
      const amount = index / 11;
      const z = 102.2 + bridgeLength * amount;
      const y = 5.25 + amount * 1.32 - Math.sin(amount * Math.PI) * 0.58;
      addBox(
        `bridge-plank-${index}`,
        "suspension-bridge",
        [4.2, 0.2, 1.02],
        [-72, y, z],
        index % 2 ? materials.lightWood : materials.wood,
        { solid: false, rotationZ: Math.sin(amount * Math.PI * 2) * 0.035 },
      );
      for (const x of [-74.35, -69.65]) {
        addBeamBetween(
          `bridge-hanger-${index}-${x}`,
          "suspension-bridge",
          [x, y + 0.18, z],
          [x, y + 2.05 + Math.sin(amount * Math.PI) * 0.55, z],
          0.045,
          materials.rope,
        );
      }
    }
    for (const x of [-74.35, -69.65]) {
      addBeamBetween(`bridge-hand-rope-${x}`, "suspension-bridge", [x, 6.8, 101.7], [x, 8.35, 119.4], 0.075, materials.rope);
    }

    for (let row = 0; row < 5; row += 1) {
      addBeamBetween(
        `climbing-net-horizontal-${row}`,
        "fortress",
        [-77, 1 + row * 0.88, 121.5],
        [-67, 1 + row * 0.88, 121.5],
        0.045,
        materials.rope,
      );
    }
    for (let column = 0; column < 7; column += 1) {
      addBeamBetween(
        `climbing-net-vertical-${column}`,
        "fortress",
        [-77 + column * 1.67, 0.7, 121.5],
        [-77 + column * 1.67, 4.8, 121.5],
        0.045,
        materials.rope,
      );
    }
  }

  function buildWarpedWall() {
    addBox("warped-wall-main", "warped-wall", [15.5, 8.6, 0.78], [-101, 4.3, 128.4], materials.navy, {
      solid: true,
      rotationX: -0.13,
    });
    addBox("warped-wall-foot", "warped-wall", [16.3, 1.25, 3.5], [-101, 0.6, 126.8], materials.navy, {
      solid: true,
      rotationX: -0.25,
    });
    addBox("warped-wall-top", "warped-wall", [16.6, 0.52, 2.3], [-101, 8.72, 129], materials.yellow, {
      solid: false,
    });
    const laneMaterials = [materials.coral, materials.yellow, materials.teal];
    for (let lane = 0; lane < 3; lane += 1) {
      const x = -106.2 + lane * 5.2;
      addBox(`warped-wall-lane-${lane}`, "warped-wall", [1.15, 7.6, 0.12], [x, 4.2, 127.95], laneMaterials[lane], {
        solid: false,
        rotationX: -0.13,
      });
      addBeamBetween(`warped-wall-rope-${lane}`, "warped-wall", [x, 7.9, 127.3], [x, 0.65, 123], 0.07, materials.rope);
    }
    addCylinder("warped-wall-bell", "warped-wall", 0.55, 0.62, [-101, 9.45, 128.5], materials.yellow, {
      solid: false,
      segments: 10,
      topRadius: 0.34,
    });
  }

  function buildDragonTrail() {
    const body = [
      [-92, 96.5], [-88, 99], [-85, 103], [-88, 107], [-92, 109.5],
      [-88.5, 113], [-84, 115.5], [-80, 113.5],
    ];
    body.forEach(([x, z], index) => {
      addCylinder(
        `dragon-body-${index}`,
        "dragon-trail",
        index === body.length - 1 ? 1.55 : 1.05,
        1.7 + Math.sin(index * 1.2) * 0.35,
        [x, 0.9, z],
        index % 2 ? materials.lime : materials.teal,
        { solid: false, segments: 8 },
      );
      if (index < body.length - 1) {
        addBeamBetween(
          `dragon-spine-${index}`,
          "dragon-trail",
          [x, 1.7, z],
          [body[index + 1][0], 1.7, body[index + 1][1]],
          0.34,
          materials.lime,
        );
      }
    });
    addBox("dragon-head", "dragon-trail", [3.8, 2.8, 4.2], [-79.4, 2.25, 113.3], materials.teal, {
      solid: false,
      rotationY: 0.7,
    });
    addBox("dragon-mouth", "dragon-trail", [2.5, 0.8, 1.8], [-77.8, 1.7, 111.8], materials.coral, {
      solid: false,
      rotationY: 0.7,
    });
    for (const side of [-1, 1]) {
      addCylinder(`dragon-eye-${side}`, "dragon-trail", 0.28, 0.3, [-80 + side * 1.05, 3.55, 112], materials.yellow, {
        solid: false,
        segments: 8,
      });
    }
  }

  function buildZipline() {
    const cableStart = [-64, 9.65, 124];
    const cableEnd = [-108, 2.95, 84.5];
    addBeamBetween("zipline-cable", "zipline", cableStart, cableEnd, 0.095, materials.steel, {
      segments: 8,
    });
    addBeamBetween("zipline-return-cable", "zipline", [-63.4, 9.35, 123.3], [-107.4, 2.65, 83.8], 0.045, materials.rope);

    for (const [id, x, z, height] of [["launch", -64, 124, 10], ["landing", -108, 84.5, 4.4]]) {
      for (const offset of [-1.8, 1.8]) {
        addBox(`zipline-${id}-post-${offset}`, "zipline", [0.5, height, 0.5], [x + offset, height / 2, z], materials.darkWood, {
          solid: true,
        });
      }
      addBox(`zipline-${id}-beam`, "zipline", [4.4, 0.48, 0.58], [x, height - 0.25, z], materials.wood, {
        solid: false,
      });
      addBox(`zipline-${id}-platform`, "zipline", [5.2, 0.42, 4.3], [x, height - 1.1, z], materials.lightWood, {
        solid: false,
      });
    }

    animatedTrolley = addBox("zipline-trolley", "zipline", [1.1, 0.42, 0.72], cableStart, materials.yellow, {
      solid: false,
    });
    animatedTrolley.userData.cableStart = cableStart;
    animatedTrolley.userData.cableEnd = cableEnd;
    addBeamBetween("zipline-launch-handle", "zipline", [-64, 9.4, 124], [-64, 7.7, 124], 0.08, materials.rope);
  }

  function addChallengeMarkers() {
    const markerMaterials = {
      water: materials.water,
      wall: materials.orange,
      zipline: materials.yellow,
    };
    for (const challenge of challengeDefinitions) {
      addCylinder(
        `challenge-marker-${challenge.id}`,
        "challenge-marker",
        1.45,
        0.08,
        [challenge.start.x, 0.06, challenge.start.z],
        markerMaterials[challenge.id],
        { solid: false, segments: 16 },
      );
      addBox(
        `challenge-marker-pole-${challenge.id}`,
        "challenge-marker",
        [0.14, 2.4, 0.14],
        [challenge.start.x - 1.45, 1.2, challenge.start.z],
        materials.steel,
        { solid: false },
      );
      addBox(
        `challenge-marker-flag-${challenge.id}`,
        "challenge-marker",
        [1.8, 0.82, 0.08],
        [challenge.start.x - 0.62, 1.92, challenge.start.z],
        markerMaterials[challenge.id],
        { solid: false },
      );
    }
  }

  function installActionUi() {
    if (!document.getElementById("voxcel-athletic-styles")) {
      const style = document.createElement("style");
      style.id = "voxcel-athletic-styles";
      style.textContent = `
.voxcel-athletic-action{position:fixed;left:50%;bottom:76px;z-index:32;transform:translateX(-50%);min-width:220px;padding:12px 18px;border:1px solid rgba(255,255,255,.28);border-radius:14px;background:linear-gradient(135deg,rgba(17,86,68,.94),rgba(32,151,126,.92));box-shadow:0 10px 28px rgba(0,0,0,.35);color:#fff;font:800 13px/1.2 system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.voxcel-athletic-action:hover{filter:brightness(1.12)}.voxcel-athletic-action:active{transform:translateX(-50%) scale(.97)}.voxcel-athletic-action:focus-visible{outline:3px solid #ffe078;outline-offset:3px}.voxcel-athletic-action[hidden]{display:none!important}.voxcel-athletic-action:disabled{cursor:default;filter:saturate(.7);opacity:.84}
@media(max-width:600px){.voxcel-athletic-action{bottom:max(70px,env(safe-area-inset-bottom) + 62px);width:min(270px,74vw);min-width:0;padding:11px 13px;font-size:12px}}
@media(prefers-reduced-motion:reduce){.voxcel-athletic-action{transition:none}}
`;
      document.head.append(style);
    }
    actionButton = document.createElement("button");
    actionButton.id = "voxcelAthleticAction";
    actionButton.type = "button";
    actionButton.className = "voxcel-athletic-action";
    actionButton.hidden = true;
    actionButton.setAttribute("aria-live", "polite");
    actionButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.nearestChallenge) startChallenge(state.nearestChallenge);
    });
    document.body.append(actionButton);
  }

  function challengeById(id) {
    return challengeDefinitions.find((challenge) => challenge.id === id) || null;
  }

  function nearestAvailableChallenge() {
    if (
      !handle?.playerRoot?.visible ||
      handle.state?.vehicle ||
      handle.state?.insideBld ||
      handle.state?.arrestPhase ||
      window.__voxcelMap?.isOpen
    ) {
      return null;
    }
    const player = handle.playerRoot.position;
    return challengeDefinitions
      .map((challenge) => ({
        challenge,
        distance: Math.hypot(player.x - challenge.start.x, player.z - challenge.start.z),
      }))
      .filter(({ distance }) => distance <= ACTION_DISTANCE)
      .sort((left, right) => left.distance - right.distance)[0]?.challenge || null;
  }

  function releaseMovementKeys() {
    for (const key of ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
    }
  }

  function startChallenge(id) {
    const challenge = challengeById(id);
    if (!challenge || state.activeChallenge || handle.state?.vehicle || handle.state?.insideBld) {
      return false;
    }
    releaseMovementKeys();
    document.exitPointerLock?.();
    const start = challenge.path[0];
    const player = handle.playerRoot.position;
    const correctionX = start[0] - player.x;
    const correctionY = start[1] - player.y;
    const correctionZ = start[2] - player.z;
    player.set(start[0], start[1], start[2]);
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.x += correctionX;
      handle.playerShadow.position.z += correctionZ;
    }
    if (handle.camera?.position) {
      handle.camera.position.x += correctionX;
      handle.camera.position.y += correctionY;
      handle.camera.position.z += correctionZ;
    }
    state.activeChallenge = {
      id: challenge.id,
      startedAt: performance.now(),
      progress: 0,
    };
    state.challengesStarted += 1;
    state.nearestChallenge = challenge.id;
    window.__voxcelEnhancements?.acceptNextMove?.();
    handle.notify?.(challenge.announcement);
    updateActionButton();
    return true;
  }

  function samplePath(challenge, progress) {
    const points = challenge.path;
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      lengths.push(length);
      total += length;
    }
    let remaining = Math.max(0, Math.min(1, progress)) * total;
    for (let index = 0; index < lengths.length; index += 1) {
      if (remaining <= lengths[index] || index === lengths.length - 1) {
        const amount = lengths[index] > 0 ? Math.min(1, remaining / lengths[index]) : 1;
        const eased = amount * amount * (3 - 2 * amount);
        const from = points[index];
        const to = points[index + 1];
        return {
          x: from[0] + (to[0] - from[0]) * eased,
          y: from[1] + (to[1] - from[1]) * eased,
          z: from[2] + (to[2] - from[2]) * eased,
          nextX: to[0],
          nextZ: to[2],
        };
      }
      remaining -= lengths[index];
    }
    const last = points.at(-1);
    return { x: last[0], y: last[1], z: last[2], nextX: last[0], nextZ: last[2] };
  }

  function finishChallenge(challenge) {
    const player = handle.playerRoot.position;
    const previousY = player.y;
    player.set(challenge.finish.x, PLAYER_GROUND_Y, challenge.finish.z);
    if (handle.camera?.position) handle.camera.position.y += PLAYER_GROUND_Y - previousY;
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.x = challenge.finish.x;
      handle.playerShadow.position.z = challenge.finish.z;
    }
    state.completedChallenges.add(challenge.id);
    state.challengesCompleted += 1;
    state.activeChallenge = null;
    state.nearestChallenge = null;
    handle.state.joy = Math.min(100, finite(handle.state.joy, 0) + 14);
    window.__voxcelEnhancements?.acceptNextMove?.();
    handle.notify?.(challenge.completion);
    updateActionButton();
  }

  function updateChallenge(now) {
    if (!state.activeChallenge) return;
    const challenge = challengeById(state.activeChallenge.id);
    if (!challenge) {
      state.activeChallenge = null;
      return;
    }
    const progress = Math.min(1, (now - state.activeChallenge.startedAt) / challenge.durationMs);
    const sampled = samplePath(challenge, progress);
    const player = handle.playerRoot.position;
    const previous = { x: player.x, y: player.y, z: player.z };
    player.set(sampled.x, sampled.y, sampled.z);
    handle.playerRoot.rotation.y = Math.atan2(
      sampled.nextX - sampled.x,
      sampled.nextZ - sampled.z,
    );
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.x = sampled.x;
      handle.playerShadow.position.z = sampled.z;
    }
    if (handle.camera?.position) {
      handle.camera.position.x += sampled.x - previous.x;
      handle.camera.position.y += sampled.y - previous.y;
      handle.camera.position.z += sampled.z - previous.z;
    }
    state.activeChallenge.progress = progress;
    window.__voxcelEnhancements?.acceptNextMove?.();
    if (progress >= 1) finishChallenge(challenge);
  }

  function updateActionButton() {
    if (!actionButton) return;
    if (state.activeChallenge) {
      const challenge = challengeById(state.activeChallenge.id);
      actionButton.hidden = false;
      actionButton.disabled = true;
      actionButton.textContent = `🏃 ${challenge?.label || "チャレンジ"}中…`;
      actionButton.setAttribute("aria-label", `${challenge?.label || "チャレンジ"}中`);
      return;
    }
    const nearest = nearestAvailableChallenge();
    state.nearestChallenge = nearest?.id || null;
    if (!nearest) {
      actionButton.hidden = true;
      actionButton.disabled = false;
      return;
    }
    actionButton.hidden = false;
    actionButton.disabled = false;
    actionButton.textContent = `E　${nearest.label}`;
    actionButton.setAttribute("aria-label", nearest.label);
  }

  function updateAmbientAnimation(now) {
    if (animatedTrolley) {
      const start = animatedTrolley.userData.cableStart;
      const end = animatedTrolley.userData.cableEnd;
      const raw = (Math.sin(now * 0.00042) + 1) / 2;
      const amount = raw * raw * (3 - 2 * raw);
      animatedTrolley.position.set(
        start[0] + (end[0] - start[0]) * amount,
        start[1] + (end[1] - start[1]) * amount - 0.4,
        start[2] + (end[2] - start[2]) * amount,
      );
      animatedTrolley.rotation.y = Math.atan2(end[0] - start[0], end[2] - start[2]);
    }
    animatedFlags.forEach((flag, index) => {
      flag.rotation.z = flag.userData.baseRotationZ + Math.sin(now * 0.003 + index * 1.4) * 0.045;
      flag.scale.x = 0.95 + Math.sin(now * 0.004 + index) * 0.05;
    });
  }

  function update(now) {
    updateAmbientAnimation(now);
    updateChallenge(now);
    updateActionButton();
  }

  function handleKeyDown(event) {
    const key = String(event.key || "").toLowerCase();
    if (state.activeChallenge && new Set([
      "w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "e",
    ]).has(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (key !== "e" || event.repeat || !state.nearestChallenge) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startChallenge(state.nearestChallenge);
  }

  function registerMapLocation() {
    const map = window.__voxcelMap;
    if (!map?.registerLocation) return false;
    map.registerLocation({
      id: FACILITY.id,
      name: FACILITY.name,
      emoji: "🧗",
      type: "park",
      category: "アウトドア・アスレチック",
      x: FACILITY.x,
      z: FACILITY.z,
      w: FACILITY.w,
      d: FACILITY.d,
      color: "#239b73",
      enterable: false,
    });
    state.mapRegistered = true;
    return true;
  }

  function snapshot() {
    return {
      ready: state.ready,
      reason: state.reason,
      version: SYSTEM_VERSION,
      id: FACILITY.id,
      name: FACILITY.name,
      facility: {
        id: FACILITY.id,
        name: FACILITY.name,
        x: FACILITY.x,
        z: FACILITY.z,
        w: FACILITY.w,
        d: FACILITY.d,
        bounds: { ...FACILITY.bounds },
        entrance: { ...FACILITY.entrance },
      },
      bounds: { ...FACILITY.bounds },
      entrance: { ...FACILITY.entrance },
      removedBuildingCount: state.removedBuildingCount,
      removedObjectCount: state.removedObjectCount,
      clearedSceneryCount: state.clearedSceneryCount,
      removedLandmarks: REMOVED_LANDMARKS.map((landmark) => ({
        ...landmark,
        detached: removedObjects.some((object) => {
          const parameters = object.geometry?.parameters;
          return Boolean(
            object.geometry?.type === "BoxGeometry" &&
            closeTo(object.position.x, landmark.x) &&
            closeTo(object.position.y, landmark.h / 2) &&
            closeTo(object.position.z, landmark.z) &&
            closeTo(parameters?.width, landmark.w) &&
            !object.parent
          );
        }),
      })),
      meshCount: state.meshCount,
      solidMeshCount: state.solidMeshCount,
      decorativeMeshCount: state.decorativeMeshCount,
      roles: [...state.roles].sort(),
      roleCounts: Object.fromEntries([...state.roleCounts.entries()].sort()),
      rootAttached: root?.parent === handle?.scene,
      mapRegistered: state.mapRegistered,
      activeChallenge: state.activeChallenge?.id || null,
      challengeProgress: state.activeChallenge?.progress ?? null,
      completedChallenges: [...state.completedChallenges].sort(),
      challengesStarted: state.challengesStarted,
      challengesCompleted: state.challengesCompleted,
      nearestChallenge: state.nearestChallenge,
      challenges: challengeDefinitions.map((challenge) => ({
        id: challenge.id,
        label: challenge.label,
        start: { ...challenge.start },
        finish: { ...challenge.finish },
        durationMs: challenge.durationMs,
        active: state.activeChallenge?.id === challenge.id,
        completed: state.completedChallenges.has(challenge.id),
        status: state.activeChallenge?.id === challenge.id
          ? "active"
          : state.completedChallenges.has(challenge.id) ? "completed" : "ready",
      })),
      initializedAt: state.initializedAt,
    };
  }

  function initialize(runtimeHandle) {
    handle = runtimeHandle;
    constructors = resolveConstructors();
    if (
      !constructors.Group ||
      !constructors.Vector3 ||
      !constructors.Mesh ||
      !constructors.BoxGeometry ||
      !constructors.Material
    ) {
      throw new Error("required Three.js constructors are unavailable");
    }

    root = new constructors.Group();
    root.name = "SkyWaterAthleticRoot";
    root.userData.voxcelAthletic = true;
    root.userData.voxcelAthleticFacility = FACILITY.id;
    handle.scene.add(root);

    clearSite();
    buildPalette();
    buildEntranceAndGround();
    buildForestLandscape();
    buildWaterCourse();
    buildFortressAndBridge();
    buildWarpedWall();
    buildDragonTrail();
    buildZipline();
    addChallengeMarkers();
    installActionUi();
    registerMapLocation();
    handle.scene.updateMatrixWorld(true);
    window.__voxcelEnhancements.refreshColliders();

    unregisterBeforeRender = window.__voxcelEnhancements.registerBeforeRender(update);
    window.addEventListener("keydown", handleKeyDown, true);
    state.ready = true;
    state.reason = "ready";
    state.initializedAt = Date.now();

    window.__voxcelAthletics = {
      ready: true,
      version: SYSTEM_VERSION,
      root,
      facility: { ...FACILITY, bounds: { ...FACILITY.bounds }, entrance: { ...FACILITY.entrance } },
      getState: snapshot,
      startChallenge,
      refreshColliders: () => window.__voxcelEnhancements.refreshColliders(),
      unregisterBeforeRender: () => unregisterBeforeRender?.(),
    };
    window.dispatchEvent(new CustomEvent("voxcel:athletics-ready", { detail: snapshot() }));
  }

  window.__voxcelAthletics = {
    ready: false,
    version: SYSTEM_VERSION,
    getState: snapshot,
  };

  const startedAt = performance.now();
  const timer = window.setInterval(() => {
    const runtimeHandle = window.__voxcelPlayer;
    if (
      runtimeHandle?.scene?.traverse &&
      runtimeHandle?.playerRoot?.position &&
      runtimeHandle?.playerShadow?.position &&
      runtimeHandle?.camera?.position &&
      runtimeHandle?.state &&
      window.__voxcelEnhancements?.ready &&
      window.__voxcelMap?.ready
    ) {
      window.clearInterval(timer);
      try {
        initialize(runtimeHandle);
      } catch (error) {
        state.reason = error instanceof Error ? error.message : String(error);
        console.error("Athletic park system failed to initialize.", error);
        window.__voxcelAthletics = {
          ready: false,
          version: SYSTEM_VERSION,
          reason: state.reason,
          getState: snapshot,
        };
      }
      return;
    }
    if (performance.now() - startedAt > 15_000) {
      window.clearInterval(timer);
      state.reason = "runtime-bridge-timeout";
      window.__voxcelAthletics = {
        ready: false,
        version: SYSTEM_VERSION,
        reason: state.reason,
        getState: snapshot,
      };
    }
  }, 20);
})();
