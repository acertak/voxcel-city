(() => {
  "use strict";

  const PLAYER_RADIUS = 0.48;
  const PLAYER_HEIGHT = 2.05;
  const MAX_WALK_STEP = 1.8;
  const SWEEP_STEP = 0.12;
  const COLLIDER_REFRESH_MS = 750;

  const palettes = {
    food: { background: 0x17130f, wall: 0xe8d6bd, accent: 0x9e5f3f, floor: 0x6f4934 },
    cloth: { background: 0x11141b, wall: 0xe5e8ef, accent: 0x9b5177, floor: 0x494d59 },
    hair: { background: 0x17121b, wall: 0xe7dcef, accent: 0x79548d, floor: 0x51445a },
    furn: { background: 0x111813, wall: 0xd9e3d8, accent: 0x52745d, floor: 0x4a5949 },
    book: { background: 0x17130f, wall: 0xe6d8c4, accent: 0x76543e, floor: 0x59483b },
    heal: { background: 0x0e171c, wall: 0xe1edf0, accent: 0x4d8797, floor: 0x52656c },
    bank: { background: 0x10151d, wall: 0xdce3eb, accent: 0x46688f, floor: 0x465361 },
    home: { background: 0x17140f, wall: 0xeadfca, accent: 0x8b6b48, floor: 0x6b513b },
    police: { background: 0x0d1219, wall: 0xd5dde7, accent: 0x355b82, floor: 0x3f4a58 },
    default: { background: 0x11161b, wall: 0xdde2e5, accent: 0x537082, floor: 0x4b555c },
  };

  const interiorProfiles = {
    conv: { width: 18, depth: 18, height: 6.2, themeId: "convenience-store", preserveNative: false },
    cafe: { width: 18, depth: 20, height: 6.4, themeId: "cafe", preserveNative: false },
    bake: { width: 18, depth: 18, height: 6.4, themeId: "bakery", preserveNative: false },
    rest: { width: 22, depth: 20, height: 6.6, themeId: "restaurant", preserveNative: false },
    cloth: { width: 22, depth: 20, height: 6.8, themeId: "fashion-store", preserveNative: false },
    salon: { width: 18, depth: 19, height: 6.4, themeId: "hair-salon", preserveNative: false },
    furn: { width: 22, depth: 22, height: 6.8, themeId: "furniture-showroom", preserveNative: false },
    book: { width: 22, depth: 22, height: 7.2, themeId: "bookstore", preserveNative: false },
    hosp: { width: 24, depth: 22, height: 6.8, themeId: "hospital", preserveNative: false },
    bank: { width: 22, depth: 20, height: 7, themeId: "bank", preserveNative: false },
    home: { width: 24, depth: 24, height: 6.6, themeId: "home", preserveNative: true },
    police: { width: 24, depth: 22, height: 7, themeId: "police-station", preserveNative: true },
  };

  const runtime = {
    ready: false,
    cityScene: null,
    activeScene: null,
    activeBuilding: null,
    interiorScene: null,
    interiorOwnedRoot: null,
    interiorShell: null,
    shellSides: null,
    ceiling: null,
    movedObjects: new Set(),
    colliderNodes: new Set(),
    colliderNodesByScene: new Map(),
    colliderCount: 0,
    blockedMoves: 0,
    vehicleBlockedMoves: 0,
    lastCollisionObject: null,
    lastColliderRefresh: 0,
    lastPosition: null,
    lastSceneKey: "city",
    acceptNextMove: true,
    slideDirection: 1,
    lastVehicle: null,
    lastVehiclePosition: null,
    lastInteriorTransferScan: 0,
    lastCityChildCount: 0,
    cloudGroups: [],
    cloudMaterials: [],
    oldCloudGroups: [],
    cloudLastTime: 0,
    suppressedMessages: 0,
    sceneSwitches: 0,
    roomDimensions: null,
    themeId: null,
    themeFixtureCount: 0,
    fixtureRoles: new Set(),
    interiorMaterials: new Set(),
    legacySurfaceCount: 0,
    originalBuildingDimensions: null,
    originalInteractionPositions: [],
    adaptedNativeObjects: [],
    policeJailCellSnapshot: null,
    beforeRenderCallbacks: new Set(),
  };

  function installUi() {
    const style = document.createElement("style");
    style.textContent = `
      #lL { display: none !important; }
      #voxcelSceneFade {
        position: fixed;
        inset: 0;
        z-index: 290;
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(circle at 50% 46%, #17202b 0%, #080b10 72%);
      }
    `;
    document.head.append(style);

    const fade = document.createElement("div");
    fade.id = "voxcelSceneFade";
    fade.setAttribute("aria-hidden", "true");
    document.body.append(fade);

    const toast = document.getElementById("toast");
    if (toast) {
      const suppressTransitionMessage = () => {
        const text = toast.textContent.trim();
        if (text === "外に出た" || text.endsWith("に入った！")) {
          toast.classList.remove("show");
          toast.textContent = "";
          runtime.suppressedMessages += 1;
        }
      };
      new MutationObserver(suppressTransitionMessage).observe(toast, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return fade;
  }

  const fadeOverlay = installUi();

  function playSceneTransition() {
    if (typeof fadeOverlay.animate === "function") {
      fadeOverlay.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 1, offset: 0.32 },
          { opacity: 0, offset: 1 },
        ],
        { duration: 360, easing: "cubic-bezier(.22,.75,.24,1)" },
      );
      return;
    }
    fadeOverlay.style.opacity = "1";
    setTimeout(() => {
      fadeOverlay.style.transition = "opacity 220ms ease";
      fadeOverlay.style.opacity = "0";
    }, 100);
  }

  function waitForRuntime() {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const handle = window.__voxcelPlayer;
      if (handle?.scene && handle?.playerRoot) {
        window.clearInterval(timer);
        initialize(handle);
        return;
      }
      if (performance.now() - startedAt > 15000) {
        window.clearInterval(timer);
        console.error("World enhancements could not find the game runtime.");
      }
    }, 20);
  }

  function initialize(handle) {
    const cityScene = handle.scene;
    const playerRoot = handle.playerRoot;
    const playerShadow = handle.playerShadow;
    const camera = handle.camera;
    const renderer = handle.renderer;
    const appState = handle.state;
    const buildings = handle.buildings || [];

    runtime.cityScene = cityScene;
    runtime.activeScene = cityScene;
    runtime.lastPosition = playerRoot.position.clone();

    if (!camera || !renderer || !appState || !buildings.length) {
      console.error("World enhancements need the extended player bridge from the preview server.");
      window.__voxcelEnhancements = {
        ready: false,
        reason: "extended-runtime-bridge-missing",
      };
      return;
    }

    cityScene.updateMatrixWorld(true);

    let sampleMesh = null;
    let boxMesh = null;
    let planeMesh = null;
    let standardMaterial = null;
    let basicMaterial = null;
    let canvasTexture = null;
    let pointLight = null;

    cityScene.traverse((object) => {
      if (object.isMesh) {
        sampleMesh ||= object;
        if (object.geometry?.type === "BoxGeometry") boxMesh ||= object;
        if (object.geometry?.type === "PlaneGeometry") planeMesh ||= object;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material?.type === "MeshStandardMaterial") standardMaterial ||= material;
          if (material?.type === "MeshBasicMaterial") basicMaterial ||= material;
          if (material?.map?.image instanceof HTMLCanvasElement) canvasTexture ||= material.map;
        }
      }
      if (object.isPointLight) pointLight ||= object;
    });

    const constructors = {
      Scene: cityScene.constructor,
      Group: playerRoot.constructor,
      Mesh: sampleMesh?.constructor,
      BoxGeometry: boxMesh?.geometry?.constructor,
      PlaneGeometry: planeMesh?.geometry?.constructor,
      Material: standardMaterial?.constructor,
      CloudMaterial: basicMaterial?.constructor || standardMaterial?.constructor,
      CanvasTexture: canvasTexture?.constructor,
      PointLight: pointLight?.constructor,
    };

    if (!constructors.Mesh || !constructors.BoxGeometry || !constructors.Material) {
      console.error("World enhancements could not resolve Three.js constructors.");
      return;
    }

    function isPlayerObject(object) {
      let current = object;
      while (current) {
        if (current === playerRoot || current === playerShadow) return true;
        current = current.parent;
      }
      return false;
    }

    function isObjectWithin(object, root) {
      if (!root) return false;
      let current = object;
      while (current) {
        if (current === root) return true;
        current = current.parent;
      }
      return false;
    }

    function hasEnhancementFlag(object, flag) {
      let current = object;
      while (current) {
        if (current.userData?.[flag]) return true;
        current = current.parent;
      }
      return false;
    }

    function isVisibleInScene(object, scene) {
      let current = object;
      while (current) {
        if (!current.visible) return false;
        if (current === scene) return true;
        current = current.parent;
      }
      return false;
    }

    function expandBounds(target, source) {
      target.minX = Math.min(target.minX, source.minX);
      target.minY = Math.min(target.minY, source.minY);
      target.minZ = Math.min(target.minZ, source.minZ);
      target.maxX = Math.max(target.maxX, source.maxX);
      target.maxY = Math.max(target.maxY, source.maxY);
      target.maxZ = Math.max(target.maxZ, source.maxZ);
    }

    function meshBounds(mesh) {
      const geometry = mesh.geometry;
      if (!geometry) return null;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (!box) return null;

      const matrix = mesh.matrixWorld.elements;
      const xs = [box.min.x, box.max.x];
      const ys = [box.min.y, box.max.y];
      const zs = [box.min.z, box.max.z];
      const bounds = {
        minX: Infinity,
        minY: Infinity,
        minZ: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        maxZ: -Infinity,
      };

      for (const x of xs) {
        for (const y of ys) {
          for (const z of zs) {
            const worldX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
            const worldY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
            const worldZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
            bounds.minX = Math.min(bounds.minX, worldX);
            bounds.minY = Math.min(bounds.minY, worldY);
            bounds.minZ = Math.min(bounds.minZ, worldZ);
            bounds.maxX = Math.max(bounds.maxX, worldX);
            bounds.maxY = Math.max(bounds.maxY, worldY);
            bounds.maxZ = Math.max(bounds.maxZ, worldZ);
          }
        }
      }

      return Number.isFinite(bounds.minX) ? bounds : null;
    }

    function objectBounds(object, includeInvisible = false) {
      let aggregate = null;
      object.traverse((child) => {
        if (!child.isMesh || (!includeInvisible && !child.visible)) return;
        const bounds = meshBounds(child);
        if (!bounds) return;
        if (!aggregate) {
          aggregate = { ...bounds };
        } else {
          expandBounds(aggregate, bounds);
        }
      });
      return aggregate;
    }

    function seededRandom(seed) {
      let value = seed >>> 0;
      return () => {
        value += 0x6d2b79f5;
        let result = value;
        result = Math.imul(result ^ (result >>> 15), result | 1);
        result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
      };
    }

    function drawSoftEllipse(context, x, y, radiusX, radiusY, topColor, bottomColor, opacity) {
      context.save();
      context.translate(x, y);
      context.scale(radiusX, radiusY);
      const gradient = context.createRadialGradient(-0.18, -0.28, 0.04, 0, 0, 1);
      gradient.addColorStop(0, `rgba(${topColor},${opacity})`);
      gradient.addColorStop(0.58, `rgba(${bottomColor},${opacity * 0.82})`);
      gradient.addColorStop(0.82, `rgba(${bottomColor},${opacity * 0.35})`);
      gradient.addColorStop(1, `rgba(${bottomColor},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, 1, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function createCloudCanvas(seed) {
      const random = seededRandom(seed);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);

      drawSoftEllipse(context, 256, 155, 214, 56, "248,251,255", "151,168,188", 0.72);
      drawSoftEllipse(context, 256, 176, 188, 35, "228,237,245", "116,134,156", 0.58);

      const lobeCount = 20 + Math.floor(random() * 6);
      for (let index = 0; index < lobeCount; index += 1) {
        const normalized = index / Math.max(1, lobeCount - 1);
        const x = 70 + normalized * 372 + (random() - 0.5) * 44;
        const arch = Math.sin(normalized * Math.PI);
        const y = 145 - arch * (56 + random() * 35) + (random() - 0.5) * 18;
        const radiusX = 42 + random() * 56;
        const radiusY = 35 + random() * 47;
        const brightness = 235 + Math.floor(random() * 20);
        const shade = 150 + Math.floor(random() * 35);
        drawSoftEllipse(
          context,
          x,
          y,
          radiusX,
          radiusY,
          `${brightness},${Math.min(255, brightness + 3)},255`,
          `${shade},${shade + 14},${shade + 34}`,
          0.7 + random() * 0.2,
        );
      }

      for (let index = 0; index < 9; index += 1) {
        drawSoftEllipse(
          context,
          105 + random() * 305,
          78 + random() * 55,
          24 + random() * 48,
          18 + random() * 30,
          "255,255,255",
          "208,220,234",
          0.28 + random() * 0.22,
        );
      }

      return canvas;
    }

    function findOldClouds() {
      return cityScene.children.filter((object) => {
        if (!object.isGroup || object.position.y < 20 || object.children.length !== 3) return false;
        return object.children.every((child) => {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          return child.isMesh && child.geometry?.type === "SphereGeometry" && materials.some((material) => {
            return material?.transparent && material.opacity >= 0.7 && material.color?.getHex() === 0xffffff;
          });
        });
      });
    }

    function enhanceClouds() {
      runtime.oldCloudGroups = findOldClouds();
      for (const group of runtime.oldCloudGroups) {
        group.visible = false;
        group.userData.voxcelCloud = true;
      }

      if (!constructors.PlaneGeometry || !constructors.CanvasTexture) return;

      const textureReference = canvasTexture;
      const planeGeometry = new constructors.PlaneGeometry(1, 1);
      const textures = [31, 79, 137].map((seed) => {
        const texture = new constructors.CanvasTexture(createCloudCanvas(seed));
        if (textureReference?.colorSpace) texture.colorSpace = textureReference.colorSpace;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        if (renderer.capabilities?.getMaxAnisotropy) {
          texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        }
        return texture;
      });

      runtime.cloudMaterials = textures.map((texture, index) => {
        const material = new constructors.CloudMaterial({
          color: 0xffffff,
          map: texture,
          transparent: true,
          opacity: 0.88 - index * 0.025,
          alphaTest: 0.012,
          depthWrite: false,
          depthTest: true,
          side: 2,
        });
        material.userData.baseOpacity = material.opacity;
        return material;
      });

      const random = seededRandom(0x91c7a5);
      for (let index = 0; index < 12; index += 1) {
        const group = new constructors.Group();
        const width = 36 + random() * 29;
        const height = width * (0.32 + random() * 0.08);
        const front = new constructors.Mesh(
          planeGeometry,
          runtime.cloudMaterials[index % runtime.cloudMaterials.length],
        );
        front.scale.set(width, height, 1);
        front.renderOrder = -100;
        front.userData.voxcelCloud = true;
        group.add(front);

        const wisp = new constructors.Mesh(
          planeGeometry,
          runtime.cloudMaterials[(index + 1) % runtime.cloudMaterials.length],
        );
        wisp.position.set(width * 0.11, -height * 0.12, -1.4);
        wisp.scale.set(width * 0.76, height * 0.68, 1);
        wisp.renderOrder = -101;
        wisp.userData.voxcelCloud = true;
        group.add(wisp);

        const angle = (index / 12) * Math.PI * 2 + 0.12;
        const radius = 175 + random() * 42;
        group.position.set(
          Math.cos(angle) * radius,
          23 + random() * 13,
          Math.sin(angle) * radius,
        );
        group.userData.voxcelCloud = true;
        cityScene.add(group);
        runtime.cloudGroups.push({
          object: group,
          speed: 0.8 + random() * 0.8,
          baseY: group.position.y,
          phase: random() * Math.PI * 2,
        });
      }
    }

    function updateCloudAppearance() {
      const timeText = document.getElementById("tText")?.textContent || "12:00";
      const hour = Number.parseInt(timeText.split(":")[0], 10);
      const daytime = hour >= 7 && hour < 18;
      const twilight = (hour >= 5 && hour < 7) || (hour >= 18 && hour < 20);
      const color = daytime ? 0xffffff : twilight ? 0xd8d0cb : 0x7c879f;
      const opacityScale = daytime ? 1 : twilight ? 0.88 : 0.68;
      for (const material of runtime.cloudMaterials) {
        material.color.setHex(color);
        material.opacity = material.userData.baseOpacity * opacityScale;
      }
    }

    function updateClouds(now) {
      const previous = runtime.cloudLastTime || now;
      const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      runtime.cloudLastTime = now;
      for (const cloud of runtime.cloudGroups) {
        cloud.object.position.x += cloud.speed * delta;
        if (cloud.object.position.x > 230) cloud.object.position.x = -230;
        cloud.object.position.y = cloud.baseY + Math.sin(now * 0.00008 + cloud.phase) * 1.2;
        cloud.object.position.z += Math.sin(now * 0.00004 + cloud.phase) * delta * 0.25;
        cloud.object.lookAt(camera.position);
      }
      if (Math.floor(now / 1000) !== Math.floor(previous / 1000)) updateCloudAppearance();
    }

    function makeMaterial(color, options = {}) {
      const parameters = {
        color,
        roughness: options.roughness ?? 0.86,
        metalness: options.metalness ?? 0,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
      };
      if (options.emissive !== undefined) parameters.emissive = options.emissive;
      if (options.emissiveIntensity !== undefined) {
        parameters.emissiveIntensity = options.emissiveIntensity;
      }
      if (options.side !== undefined) parameters.side = options.side;
      const material = new constructors.Material(parameters);
      material.userData.voxcelInteriorMaterial = true;
      runtime.interiorMaterials.add(material);
      return material;
    }

    function makeBox(group, name, size, position, material) {
      const mesh = new constructors.Mesh(
        new constructors.BoxGeometry(size[0], size[1], size[2]),
        material,
      );
      mesh.name = name;
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.voxcelInteriorShell = true;
      group.add(mesh);
      return mesh;
    }

    function makeFixtureBox(group, building, name, size, offset, material, role, options = {}) {
      const mesh = new constructors.Mesh(
        new constructors.BoxGeometry(size[0], size[1], size[2]),
        material,
      );
      mesh.name = name;
      mesh.position.set(building.x + offset[0], offset[1], building.z + offset[2]);
      mesh.rotation.y = options.rotationY || 0;
      mesh.castShadow = options.castShadow ?? true;
      mesh.receiveShadow = options.receiveShadow ?? true;
      mesh.userData.voxcelInteriorFixture = true;
      mesh.userData.voxcelFixtureRole = role;
      if (options.solid === false) mesh.userData.collisionMode = "none";
      group.add(mesh);
      runtime.themeFixtureCount += 1;
      runtime.fixtureRoles.add(role);
      return mesh;
    }

    function makeFixtureGroup(group, name) {
      const fixtureGroup = new constructors.Group();
      fixtureGroup.name = name;
      fixtureGroup.userData.voxcelInteriorFixture = true;
      group.add(fixtureGroup);
      return fixtureGroup;
    }

    function createInteriorMaterials(palette) {
      return {
        accent: makeMaterial(palette.accent, { roughness: 0.72 }),
        paleAccent: makeMaterial(palette.wall, { roughness: 0.82 }),
        wood: makeMaterial(0x8a5d3b, { roughness: 0.78 }),
        darkWood: makeMaterial(0x3f2c22, { roughness: 0.76 }),
        lightWood: makeMaterial(0xc79a68, { roughness: 0.82 }),
        white: makeMaterial(0xf1eee8, { roughness: 0.8 }),
        cream: makeMaterial(0xf0ddba, { roughness: 0.9 }),
        black: makeMaterial(0x25272b, { roughness: 0.7 }),
        metal: makeMaterial(0x7d8990, { roughness: 0.38, metalness: 0.58 }),
        glass: makeMaterial(0x9edbe0, { roughness: 0.18, transparent: true, opacity: 0.3 }),
        green: makeMaterial(0x4f7d57, { roughness: 0.78 }),
        blue: makeMaterial(0x527fa2, { roughness: 0.76 }),
        red: makeMaterial(0xa94f47, { roughness: 0.78 }),
        rose: makeMaterial(0xba6f84, { roughness: 0.8 }),
        mustard: makeMaterial(0xc79b45, { roughness: 0.8 }),
        teal: makeMaterial(0x498687, { roughness: 0.78 }),
        lavender: makeMaterial(0x81709d, { roughness: 0.8 }),
        bookSpines: [
          makeMaterial(0x9f3f3a, { roughness: 0.82 }),
          makeMaterial(0x315e7b, { roughness: 0.82 }),
          makeMaterial(0xd49a37, { roughness: 0.82 }),
          makeMaterial(0x507454, { roughness: 0.82 }),
          makeMaterial(0x76518b, { roughness: 0.82 }),
          makeMaterial(0xd9c9aa, { roughness: 0.88 }),
        ],
      };
    }

    function addRug(group, building, name, size, offset, material, role = "rug") {
      return makeFixtureBox(
        group,
        building,
        name,
        [size[0], 0.035, size[1]],
        [offset[0], 0.055, offset[1]],
        material,
        role,
        { solid: false, castShadow: false },
      );
    }

    function addTable(group, building, name, offset, size, materials, role = "table") {
      makeFixtureBox(
        group,
        building,
        `${name}:top`,
        [size[0], 0.16, size[1]],
        [offset[0], 0.82, offset[1]],
        materials.lightWood,
        role,
      );
      for (const [index, x, z] of [
        [0, -size[0] * 0.36, -size[1] * 0.32],
        [1, size[0] * 0.36, -size[1] * 0.32],
        [2, -size[0] * 0.36, size[1] * 0.32],
        [3, size[0] * 0.36, size[1] * 0.32],
      ]) {
        makeFixtureBox(
          group,
          building,
          `${name}:leg:${index}`,
          [0.12, 0.75, 0.12],
          [offset[0] + x, 0.4, offset[1] + z],
          materials.darkWood,
          role,
          { solid: false },
        );
      }
    }

    function addSeat(group, building, name, offset, material, role = "seat", rotationY = 0) {
      const seat = makeFixtureGroup(group, name);
      makeFixtureBox(
        seat,
        building,
        `${name}:base`,
        [1.05, 0.34, 1.05],
        [offset[0], 0.48, offset[1]],
        material,
        role,
        { rotationY },
      );
      makeFixtureBox(
        seat,
        building,
        `${name}:back`,
        [1.05, 0.95, 0.22],
        [offset[0], 1.05, offset[1] + 0.43],
        material,
        role,
        { rotationY },
      );
      return seat;
    }

    function addDisplayShelf(group, building, options, materials) {
      const {
        name,
        x,
        z,
        width,
        depth,
        height = 2.25,
        role = "display-shelf",
        rotationY = 0,
        productMaterial = materials.accent,
      } = options;
      const shelf = makeFixtureGroup(group, name);
      makeFixtureBox(
        shelf,
        building,
        `${name}:back`,
        [width, height, 0.18],
        [x, height / 2, z + depth / 2 - 0.09],
        materials.darkWood,
        role,
        { rotationY },
      );
      for (let row = 0; row < 4; row += 1) {
        const y = 0.22 + row * ((height - 0.25) / 3);
        makeFixtureBox(
          shelf,
          building,
          `${name}:shelf:${row}`,
          [width, 0.12, depth],
          [x, y, z],
          materials.lightWood,
          role,
          { rotationY },
        );
        for (let item = 0; item < Math.max(3, Math.floor(width / 0.55)); item += 1) {
          const itemX = x - width / 2 + 0.35 + item * ((width - 0.7) / Math.max(1, Math.floor(width / 0.55) - 1));
          makeFixtureBox(
            shelf,
            building,
            `${name}:product:${row}:${item}`,
            [0.28, 0.42, Math.max(0.18, depth - 0.24)],
            [itemX, y + 0.27, z - 0.02],
            productMaterial,
            `${role}-product`,
            { rotationY, solid: false },
          );
        }
      }
      return shelf;
    }

    function addBookcase(group, building, options, materials) {
      const {
        name,
        x,
        z,
        length,
        depth = 0.68,
        height = 3.8,
        rows = 5,
        orientation = "x",
        doubleSided = false,
        role = "wall-bookcase",
      } = options;
      const bookcase = makeFixtureGroup(group, name);
      const alongX = orientation === "x";
      const shelfSize = alongX ? [length, 0.13, depth] : [depth, 0.13, length];
      const postSize = alongX ? [0.14, height, depth] : [depth, height, 0.14];
      const backingSize = alongX ? [length, height, 0.12] : [0.12, height, length];
      const backingOffset = doubleSided ? 0 : depth / 2 - 0.06;

      makeFixtureBox(
        bookcase,
        building,
        `${name}:back`,
        backingSize,
        [x + (alongX ? 0 : backingOffset), height / 2, z + (alongX ? backingOffset : 0)],
        materials.darkWood,
        role,
      );
      for (const side of [-1, 1]) {
        const main = side * (length / 2 - 0.07);
        makeFixtureBox(
          bookcase,
          building,
          `${name}:post:${side}`,
          postSize,
          [x + (alongX ? main : 0), height / 2, z + (alongX ? 0 : main)],
          materials.wood,
          role,
        );
      }

      const faces = doubleSided ? [-1, 1] : [-1];
      const columns = Math.max(5, Math.floor(length / 0.46));
      for (let row = 0; row < rows; row += 1) {
        const shelfY = 0.12 + row * ((height - 0.22) / Math.max(1, rows - 1));
        makeFixtureBox(
          bookcase,
          building,
          `${name}:shelf:${row}`,
          shelfSize,
          [x, shelfY, z],
          materials.wood,
          role,
        );
        if (row === rows - 1) continue;
        for (const face of faces) {
          for (let column = 0; column < columns; column += 1) {
            const main = -length / 2 + 0.24 + column * ((length - 0.48) / Math.max(1, columns - 1));
            const bookHeight = 0.46 + ((row + column) % 3) * 0.08;
            const cross = face * (depth / 2 + 0.015);
            makeFixtureBox(
              bookcase,
              building,
              `${name}:book:${row}:${face}:${column}`,
              alongX ? [0.22, bookHeight, 0.15] : [0.15, bookHeight, 0.22],
              [
                x + (alongX ? main : cross),
                shelfY + bookHeight / 2 + 0.08,
                z + (alongX ? cross : main),
              ],
              materials.bookSpines[(row * 3 + column) % materials.bookSpines.length],
              "book-spines",
              { solid: false },
            );
          }
        }
      }
      return bookcase;
    }

    function addCounter(group, building, options, materials) {
      const {
        name,
        x,
        z,
        width = 4,
        depth = 1.15,
        role = "counter",
        material = materials.lightWood,
      } = options;
      makeFixtureBox(
        group,
        building,
        `${name}:body`,
        [width, 1.02, depth],
        [x, 0.51, z],
        material,
        role,
      );
      makeFixtureBox(
        group,
        building,
        `${name}:top`,
        [width + 0.18, 0.12, depth + 0.16],
        [x, 1.08, z],
        materials.darkWood,
        role,
      );
    }

    function addPendantLights(group, building, profile, materials, positions) {
      for (const [index, x, z] of positions.entries()) {
        makeFixtureBox(
          group,
          building,
          `Pendant:${index}:cord`,
          [0.035, 0.72, 0.035],
          [x, profile.height - 0.55, z],
          materials.black,
          "lighting",
          { solid: false, castShadow: false },
        );
        makeFixtureBox(
          group,
          building,
          `Pendant:${index}:shade`,
          [0.58, 0.16, 0.58],
          [x, profile.height - 0.98, z],
          materials.mustard,
          "lighting",
          { solid: false, castShadow: false },
        );
      }
    }

    function buildBookstore(group, building, profile, materials) {
      addBookcase(group, building, {
        name: "Bookcase:wall:north:left",
        x: -5.3,
        z: 10.15,
        length: 5.4,
        height: 4.25,
        role: "wall-bookcase",
      }, materials);
      addBookcase(group, building, {
        name: "Bookcase:wall:north:right",
        x: 2.1,
        z: 10.15,
        length: 7.1,
        height: 4.25,
        role: "wall-bookcase",
      }, materials);
      addBookcase(group, building, {
        name: "Bookcase:wall:west",
        x: -10.15,
        z: 3.8,
        length: 7.7,
        height: 4.05,
        orientation: "z",
        role: "wall-bookcase",
      }, materials);
      addBookcase(group, building, {
        name: "Bookcase:wall:east",
        x: 10.15,
        z: 1.5,
        length: 6.3,
        height: 4.05,
        orientation: "z",
        role: "wall-bookcase",
      }, materials);
      for (const [index, x] of [-3.5, 3.5].entries()) {
        addBookcase(group, building, {
          name: `Bookcase:island:${index}`,
          x,
          z: 1.2,
          length: 6.2,
          depth: 0.82,
          height: 2.35,
          rows: 4,
          orientation: "z",
          doubleSided: true,
          role: "island-bookcase",
        }, materials);
      }

      addRug(group, building, "ReadingCorner:rug", [5.2, 4.5], [-7.1, -5.7], materials.green, "reading-area");
      addSeat(group, building, "ReadingSeat:left", [-8.1, -5.6], materials.green, "reading-seat", Math.PI / 5);
      addSeat(group, building, "ReadingSeat:right", [-6.2, -6.4], materials.cream, "reading-seat", -Math.PI / 4);
      addTable(group, building, "ReadingCorner:table", [-7.1, -4.6], [1.45, 1.1], materials, "reading-table");

      addTable(group, building, "NewReleases:table", [2.5, -3.5], [2.4, 1.65], materials, "new-releases");
      for (let index = 0; index < 8; index += 1) {
        makeFixtureBox(
          group,
          building,
          `NewReleases:book:${index}`,
          [0.52, 0.12 + (index % 2) * 0.04, 0.72],
          [1.72 + (index % 4) * 0.52, 0.98 + Math.floor(index / 4) * 0.14, -3.78 + Math.floor(index / 4) * 0.48],
          materials.bookSpines[index % materials.bookSpines.length],
          "new-releases",
          { solid: false },
        );
      }

      addCounter(group, building, {
        name: "Checkout",
        x: 6.8,
        z: 7.7,
        width: 4.5,
        depth: 1.35,
        role: "checkout",
      }, materials);
      makeFixtureBox(
        group,
        building,
        "Checkout:register",
        [0.52, 0.42, 0.42],
        [7.4, 1.34, 7.62],
        materials.black,
        "checkout",
        { solid: false },
      );
      makeFixtureBox(
        group,
        building,
        "Bookstore:genre-banner",
        [8.5, 0.72, 0.08],
        [0, 5.15, 10.02],
        materials.green,
        "genre-signage",
        { solid: false },
      );
      addPendantLights(group, building, profile, materials, [[-3.5, 1], [3.5, 1], [0, -4.4]]);
    }

    function addGondola(group, building, options, materials) {
      const {
        name,
        x,
        z,
        length = 5.8,
        width = 1.35,
        height = 1.8,
        role = "gondola",
        productMaterials = [materials.red, materials.mustard, materials.green, materials.blue],
      } = options;
      const gondola = makeFixtureGroup(group, name);
      makeFixtureBox(
        gondola,
        building,
        `${name}:divider`,
        [0.12, height, length],
        [x, height / 2, z],
        materials.metal,
        role,
      );
      for (let row = 0; row < 3; row += 1) {
        const y = 0.18 + row * 0.7;
        makeFixtureBox(
          gondola,
          building,
          `${name}:shelf:${row}`,
          [width, 0.12, length],
          [x, y, z],
          materials.white,
          role,
        );
        for (const side of [-1, 1]) {
          for (let item = 0; item < 7; item += 1) {
            makeFixtureBox(
              gondola,
              building,
              `${name}:item:${row}:${side}:${item}`,
              [0.34, 0.38, 0.4],
              [x + side * 0.38, y + 0.25, z - length / 2 + 0.48 + item * ((length - 0.96) / 6)],
              productMaterials[(row + item + (side > 0 ? 1 : 0)) % productMaterials.length],
              `${role}-product`,
              { solid: false },
            );
          }
        }
      }
    }

    function addDiningSet(group, building, name, offset, materials, role = "dining") {
      addTable(group, building, `${name}:table`, offset, [2.1, 1.45], materials, role);
      addSeat(group, building, `${name}:seat:north`, [offset[0], offset[1] + 1.22], materials.cream, `${role}-seat`, Math.PI);
      addSeat(group, building, `${name}:seat:south`, [offset[0], offset[1] - 1.22], materials.cream, `${role}-seat`, 0);
    }

    function buildConvenienceStore(group, building, profile, materials) {
      makeFixtureBox(
        group,
        building,
        "RefrigeratorWall:body",
        [13.5, 2.9, 1.05],
        [0, 1.45, 8.25],
        materials.white,
        "refrigerated-wall",
      );
      for (let door = 0; door < 7; door += 1) {
        makeFixtureBox(
          group,
          building,
          `RefrigeratorWall:door:${door}`,
          [1.62, 2.35, 0.08],
          [-5.55 + door * 1.85, 1.48, 7.69],
          materials.glass,
          "refrigerated-wall",
          { solid: false },
        );
        for (let row = 0; row < 3; row += 1) {
          makeFixtureBox(
            group,
            building,
            `RefrigeratorWall:drink:${door}:${row}`,
            [1.25, 0.24, 0.18],
            [-5.55 + door * 1.85, 0.62 + row * 0.68, 7.55],
            materials.bookSpines[(door + row) % materials.bookSpines.length],
            "cold-products",
            { solid: false },
          );
        }
      }
      addGondola(group, building, { name: "Gondola:left", x: -3.1, z: 0.8, role: "store-aisle" }, materials);
      addGondola(group, building, { name: "Gondola:right", x: 2.4, z: 0.8, role: "store-aisle" }, materials);
      addCounter(group, building, {
        name: "ConvenienceCheckout",
        x: 5.5,
        z: -5.8,
        width: 4.6,
        role: "checkout",
        material: materials.green,
      }, materials);
      makeFixtureBox(group, building, "ConvenienceCheckout:register", [0.5, 0.38, 0.45], [6.1, 1.34, -5.8], materials.black, "checkout", { solid: false });
      addPendantLights(group, building, profile, materials, [[-3.1, 0], [2.4, 0], [0, -5.4]]);
    }

    function buildCafe(group, building, profile, materials) {
      addCounter(group, building, {
        name: "CafeBar",
        x: 0,
        z: 8.35,
        width: 9.8,
        depth: 1.25,
        role: "coffee-bar",
        material: materials.green,
      }, materials);
      makeFixtureBox(group, building, "CafeBar:espresso", [1.5, 0.78, 0.72], [-2.1, 1.53, 8.18], materials.metal, "coffee-bar", { solid: false });
      makeFixtureBox(group, building, "CafeBar:menu", [5.3, 1.25, 0.08], [0.2, 4.1, 9.35], materials.darkWood, "menu-board", { solid: false });
      makeFixtureBox(group, building, "CakeCase:base", [3.3, 1.02, 1.3], [5.8, 0.51, 5.5], materials.cream, "cake-display");
      makeFixtureBox(group, building, "CakeCase:glass", [3.15, 0.82, 1.12], [5.8, 1.35, 5.5], materials.glass, "cake-display", { solid: false });
      for (let cake = 0; cake < 5; cake += 1) {
        makeFixtureBox(group, building, `CakeCase:cake:${cake}`, [0.44, 0.24, 0.44], [4.82 + cake * 0.5, 1.05, 5.45], cake % 2 ? materials.rose : materials.mustard, "cake-display", { solid: false });
      }
      addRug(group, building, "Cafe:rug", [13.5, 8.8], [-0.5, -2], materials.teal, "cafe-seating");
      for (const [index, offset] of [[-4.5, -3.8], [0, -3.8], [4.5, -3.8], [-2.3, 0.2], [2.3, 0.2]].entries()) {
        addDiningSet(group, building, `CafeTable:${index}`, offset, materials, "cafe-table");
      }
      makeFixtureBox(group, building, "WindowBench:base", [1.15, 0.5, 7.2], [-8.15, 0.36, -0.8], materials.green, "window-bench");
      makeFixtureBox(group, building, "WindowBench:back", [0.24, 1.35, 7.2], [-8.6, 0.92, -0.8], materials.green, "window-bench");
      addPendantLights(group, building, profile, materials, [[-4.5, -3.8], [0, -3.8], [4.5, -3.8], [0, 6.7]]);
    }

    function buildBakery(group, building, profile, materials) {
      makeFixtureBox(group, building, "BakeryOven:body", [5.8, 3.5, 1.1], [-4.4, 1.75, 8.15], materials.darkWood, "bakery-oven");
      for (let oven = 0; oven < 3; oven += 1) {
        makeFixtureBox(group, building, `BakeryOven:door:${oven}`, [1.45, 1.45, 0.08], [-6.25 + oven * 1.85, 1.75, 7.56], materials.black, "bakery-oven", { solid: false });
      }
      addCounter(group, building, {
        name: "BakeryCounter",
        x: 5.8,
        z: 5.6,
        width: 4.7,
        depth: 1.35,
        role: "bakery-counter",
        material: materials.cream,
      }, materials);
      makeFixtureBox(group, building, "BakeryCounter:glass", [4.45, 0.9, 1.12], [5.8, 1.48, 5.6], materials.glass, "bakery-counter", { solid: false });
      for (const [index, x, z] of [[0, -3.8, 0.4], [1, 0, 0.4], [2, 3.8, 0.4], [3, -1.9, -4.2], [4, 1.9, -4.2]]) {
        addTable(group, building, `BreadIsland:${index}`, [x, z], [2.7, 1.65], materials, "bread-island");
        for (let bread = 0; bread < 6; bread += 1) {
          makeFixtureBox(
            group,
            building,
            `BreadIsland:${index}:bread:${bread}`,
            [0.42, 0.18, 0.55],
            [x - 0.82 + (bread % 3) * 0.82, 1.02 + Math.floor(bread / 3) * 0.16, z - 0.38 + Math.floor(bread / 3) * 0.72],
            bread % 2 ? materials.mustard : materials.lightWood,
            "bread-display",
            { solid: false },
          );
        }
      }
      makeFixtureBox(group, building, "Bakery:wall-sign", [7.2, 0.82, 0.08], [2.6, 4.35, 8.48], materials.red, "bakery-signage", { solid: false });
      addPendantLights(group, building, profile, materials, [[-3.8, 0.4], [0, 0.4], [3.8, 0.4]]);
    }

    function buildRestaurant(group, building, profile, materials) {
      makeFixtureBox(group, building, "KitchenPass:wall", [12.5, 2.6, 0.85], [0, 1.3, 9.1], materials.darkWood, "kitchen-pass");
      makeFixtureBox(group, building, "KitchenPass:opening", [8.4, 1.35, 0.18], [0, 2.3, 8.6], materials.black, "kitchen-pass", { solid: false });
      addCounter(group, building, { name: "HostStand", x: 0, z: -7.7, width: 2.2, role: "host-stand", material: materials.red }, materials);
      addRug(group, building, "Restaurant:rug", [17.5, 12], [0, 0.5], materials.red, "dining-room");
      for (const [index, x, z] of [
        [0, -6.4, -3.7], [1, -2.1, -3.7], [2, 2.1, -3.7], [3, 6.4, -3.7],
        [4, -6.4, 1.5], [5, -2.1, 1.5], [6, 2.1, 1.5], [7, 6.4, 1.5],
        [8, -4.2, 5.7], [9, 4.2, 5.7],
      ]) {
        addDiningSet(group, building, `DiningSet:${index}`, [x, z], materials, "restaurant-table");
      }
      makeFixtureBox(group, building, "Banquette:base", [1.25, 0.5, 10.5], [-10.1, 0.36, 1], materials.red, "banquette");
      makeFixtureBox(group, building, "Banquette:back", [0.28, 1.45, 10.5], [-10.55, 0.95, 1], materials.red, "banquette");
      addPendantLights(group, building, profile, materials, [[-6.4, -2], [0, -2], [6.4, -2], [-4.2, 4.5], [4.2, 4.5]]);
    }

    function addClothingRack(group, building, name, offset, length, materials, role = "clothing-rack") {
      makeFixtureBox(group, building, `${name}:rail`, [length, 0.1, 0.1], [offset[0], 1.75, offset[1]], materials.metal, role);
      makeFixtureBox(group, building, `${name}:left-post`, [0.12, 1.75, 0.12], [offset[0] - length / 2, 0.88, offset[1]], materials.metal, role);
      makeFixtureBox(group, building, `${name}:right-post`, [0.12, 1.75, 0.12], [offset[0] + length / 2, 0.88, offset[1]], materials.metal, role);
      const garmentCount = Math.max(5, Math.floor(length / 0.48));
      for (let index = 0; index < garmentCount; index += 1) {
        makeFixtureBox(
          group,
          building,
          `${name}:garment:${index}`,
          [0.34, 0.92 + (index % 3) * 0.12, 0.52],
          [offset[0] - length / 2 + 0.3 + index * ((length - 0.6) / Math.max(1, garmentCount - 1)), 1.16, offset[1]],
          [materials.rose, materials.blue, materials.mustard, materials.green][index % 4],
          "garment-display",
          { solid: false },
        );
      }
    }

    function buildFashionStore(group, building, profile, materials) {
      addRug(group, building, "FashionRunway", [4.2, 15.5], [0, -0.3], materials.rose, "runway");
      addClothingRack(group, building, "Rack:west:north", [-7.6, 4.7], 5.2, materials);
      addClothingRack(group, building, "Rack:west:south", [-7.6, -2.4], 5.2, materials);
      addClothingRack(group, building, "Rack:east:north", [7.6, 4.7], 5.2, materials);
      addClothingRack(group, building, "Rack:east:south", [7.6, -2.4], 5.2, materials);
      for (const [index, x] of [-2.8, 0, 2.8].entries()) {
        makeFixtureBox(group, building, `Mannequin:${index}:plinth`, [1.25, 0.22, 1.25], [x, 0.14, 5.3], materials.white, "mannequin-display");
        makeFixtureBox(group, building, `Mannequin:${index}:legs`, [0.42, 1.25, 0.42], [x, 0.86, 5.3], materials.black, "mannequin-display", { solid: false });
        makeFixtureBox(group, building, `Mannequin:${index}:torso`, [0.92, 1.35, 0.52], [x, 2.14, 5.3], [materials.rose, materials.blue, materials.green][index], "mannequin-display", { solid: false });
      }
      for (let stall = 0; stall < 3; stall += 1) {
        const x = -6 + stall * 6;
        makeFixtureBox(group, building, `FittingRoom:${stall}:back`, [4.8, 2.8, 0.2], [x, 1.4, 9.25], materials.paleAccent, "fitting-room");
        makeFixtureBox(group, building, `FittingRoom:${stall}:curtain`, [3.5, 2.45, 0.12], [x, 1.3, 7.8], materials.lavender, "fitting-room", { solid: false });
      }
      addCounter(group, building, { name: "FashionCheckout", x: 7.2, z: -7.1, width: 4.4, role: "checkout", material: materials.rose }, materials);
      makeFixtureBox(group, building, "Fashion:brand-wall", [8.8, 1.1, 0.08], [0, 4.75, 9.78], materials.black, "brand-signage", { solid: false });
      addPendantLights(group, building, profile, materials, [[0, -5], [0, 0], [0, 5]]);
    }

    function buildHairSalon(group, building, profile, materials) {
      for (let station = 0; station < 4; station += 1) {
        const z = -4.8 + station * 3.2;
        makeFixtureBox(group, building, `StylingStation:${station}:mirror`, [0.12, 2.15, 2.15], [8.3, 2.25, z], materials.glass, "styling-station", { solid: false });
        addSeat(group, building, `StylingStation:${station}:chair`, [5.9, z], station % 2 ? materials.lavender : materials.rose, "salon-chair", Math.PI / 2);
        makeFixtureBox(group, building, `StylingStation:${station}:console`, [1.05, 0.82, 1.75], [7.65, 0.52, z], materials.darkWood, "styling-station");
      }
      for (const [index, x] of [-3.4, 0.4].entries()) {
        makeFixtureBox(group, building, `WashBay:${index}:base`, [2.6, 0.82, 1.35], [x, 0.48, 7.45], materials.black, "wash-bay");
        makeFixtureBox(group, building, `WashBay:${index}:basin`, [1.45, 0.42, 1.1], [x, 1.05, 8.05], materials.white, "wash-bay", { solid: false });
      }
      addRug(group, building, "SalonWaiting:rug", [5.8, 4.5], [-4.7, -5.5], materials.lavender, "waiting-area");
      makeFixtureBox(group, building, "SalonWaiting:sofa-base", [4.6, 0.52, 1.25], [-4.7, 0.38, -6.1], materials.lavender, "waiting-sofa");
      makeFixtureBox(group, building, "SalonWaiting:sofa-back", [4.6, 1.1, 0.26], [-4.7, 0.98, -6.58], materials.lavender, "waiting-sofa");
      addCounter(group, building, { name: "SalonReception", x: 4.8, z: -7.0, width: 4.1, role: "reception", material: materials.rose }, materials);
      makeFixtureBox(group, building, "Salon:logo-wall", [6.4, 0.88, 0.08], [-3.8, 4.45, 9.28], materials.rose, "salon-signage", { solid: false });
      addPendantLights(group, building, profile, materials, [[0, -2], [0, 3.5], [5.9, 0]]);
    }

    function addSofa(group, building, name, offset, width, material, role = "sofa") {
      makeFixtureBox(group, building, `${name}:base`, [width, 0.5, 1.45], [offset[0], 0.38, offset[1]], material, role);
      makeFixtureBox(group, building, `${name}:back`, [width, 1.2, 0.28], [offset[0], 0.98, offset[1] + 0.58], material, role);
      makeFixtureBox(group, building, `${name}:left-arm`, [0.3, 0.82, 1.45], [offset[0] - width / 2 + 0.15, 0.58, offset[1]], material, role);
      makeFixtureBox(group, building, `${name}:right-arm`, [0.3, 0.82, 1.45], [offset[0] + width / 2 - 0.15, 0.58, offset[1]], material, role);
    }

    function buildFurnitureShowroom(group, building, profile, materials) {
      addRug(group, building, "LivingZone:rug", [8.4, 7.2], [-5.7, -4.7], materials.teal, "living-zone");
      addSofa(group, building, "LivingZone:sofa", [-6, -5.1], 5.6, materials.teal, "living-sofa");
      addTable(group, building, "LivingZone:coffee-table", [-6, -2.6], [3.3, 1.55], materials, "coffee-table");
      addSeat(group, building, "LivingZone:chair", [-2.8, -3.8], materials.mustard, "accent-chair", -Math.PI / 3);

      addRug(group, building, "DiningZone:rug", [8.2, 7.2], [5.6, -4.5], materials.mustard, "dining-zone");
      addTable(group, building, "DiningZone:table", [5.6, -4.4], [5.2, 2.4], materials, "showroom-dining");
      for (const [index, x, z] of [[0, 3.1, -4.4], [1, 8.1, -4.4], [2, 5.6, -2.7], [3, 5.6, -6.1]]) {
        addSeat(group, building, `DiningZone:chair:${index}`, [x, z], materials.cream, "showroom-dining-chair", index < 2 ? Math.PI / 2 : 0);
      }

      addRug(group, building, "BedroomZone:rug", [10.5, 7.5], [0, 5.7], materials.lavender, "bedroom-zone");
      makeFixtureBox(group, building, "BedroomZone:bed-base", [5.3, 0.62, 6.1], [0, 0.36, 5.7], materials.darkWood, "showroom-bed");
      makeFixtureBox(group, building, "BedroomZone:mattress", [5.05, 0.52, 5.55], [0, 0.9, 5.45], materials.cream, "showroom-bed");
      makeFixtureBox(group, building, "BedroomZone:headboard", [5.3, 2.2, 0.28], [0, 1.45, 8.5], materials.lavender, "showroom-bed");
      for (const side of [-1, 1]) {
        makeFixtureBox(group, building, `BedroomZone:nightstand:${side}`, [1.45, 0.82, 1.35], [side * 3.55, 0.43, 7.6], materials.lightWood, "nightstand");
        makeFixtureBox(group, building, `BedroomZone:lamp:${side}`, [0.55, 1.25, 0.55], [side * 3.55, 1.47, 7.6], materials.mustard, "showroom-lighting", { solid: false });
      }
      addCounter(group, building, { name: "ShowroomDesk", x: 7.6, z: 7.6, width: 4.6, role: "design-desk", material: materials.green }, materials);
      addPendantLights(group, building, profile, materials, [[-5.7, -4], [5.7, -4], [0, 5.5]]);
    }

    function buildHospital(group, building, profile, materials) {
      addCounter(group, building, { name: "HospitalReception", x: 5.6, z: -7.7, width: 7.2, depth: 1.45, role: "reception", material: materials.teal }, materials);
      makeFixtureBox(group, building, "HospitalReception:cross", [1.1, 1.1, 0.1], [5.6, 2.2, -8.45], materials.red, "hospital-signage", { solid: false });
      addRug(group, building, "WaitingArea:rug", [8.8, 7.5], [-6, -5.1], materials.blue, "waiting-area");
      for (let row = 0; row < 2; row += 1) {
        for (let seat = 0; seat < 3; seat += 1) {
          addSeat(group, building, `WaitingSeat:${row}:${seat}`, [-8.2 + seat * 2.2, -6.5 + row * 3], materials.blue, "waiting-seat", row ? Math.PI : 0);
        }
      }
      for (let bay = 0; bay < 3; bay += 1) {
        const x = -6.8 + bay * 6.8;
        makeFixtureBox(group, building, `ExamBay:${bay}:bed`, [3.4, 0.72, 5.2], [x, 0.65, 5.2], materials.white, "exam-bed");
        makeFixtureBox(group, building, `ExamBay:${bay}:pillow`, [1.8, 0.3, 1.1], [x, 1.15, 7.0], materials.cream, "exam-bed", { solid: false });
        makeFixtureBox(group, building, `ExamBay:${bay}:screen-left`, [0.12, 2.65, 6.2], [x - 2.65, 1.4, 5.2], materials.glass, "privacy-screen", { solid: false });
        makeFixtureBox(group, building, `ExamBay:${bay}:screen-right`, [0.12, 2.65, 6.2], [x + 2.65, 1.4, 5.2], materials.glass, "privacy-screen", { solid: false });
      }
      addDisplayShelf(group, building, { name: "MedicineCabinet", x: 7.8, z: 9.1, width: 6.2, depth: 0.7, height: 2.9, role: "medicine-cabinet", productMaterial: materials.blue }, materials);
      makeFixtureBox(group, building, "Hospital:wayfinding", [10.5, 0.9, 0.08], [0, 4.8, 10.47], materials.teal, "hospital-signage", { solid: false });
      addPendantLights(group, building, profile, materials, [[-6.8, 5], [0, 5], [6.8, 5], [0, -5]]);
    }

    function buildBank(group, building, profile, materials) {
      makeFixtureBox(group, building, "TellerCounter:body", [13.2, 1.2, 1.4], [-1, 0.6, 8.1], materials.darkWood, "teller-counter");
      for (let teller = 0; teller < 3; teller += 1) {
        const x = -5.4 + teller * 4.4;
        makeFixtureBox(group, building, `Teller:${teller}:glass`, [3.4, 1.65, 0.1], [x, 2.05, 7.35], materials.glass, "teller-window", { solid: false });
        makeFixtureBox(group, building, `Teller:${teller}:marker`, [0.72, 0.72, 0.08], [x, 3.45, 7.32], materials.mustard, "teller-signage", { solid: false });
      }
      for (let atm = 0; atm < 4; atm += 1) {
        const z = 5.6 - atm * 3.1;
        makeFixtureBox(group, building, `ATM:${atm}:body`, [1.05, 2.25, 1.8], [-9.1, 1.13, z], materials.metal, "atm");
        makeFixtureBox(group, building, `ATM:${atm}:screen`, [0.08, 0.68, 0.78], [-8.55, 1.48, z], materials.blue, "atm", { solid: false });
      }
      addRug(group, building, "BankQueue:rug", [12.5, 8.5], [1.2, -1.4], materials.blue, "queue-area");
      for (let post = 0; post < 8; post += 1) {
        const x = -3.5 + (post % 4) * 2.8;
        const z = -4.5 + Math.floor(post / 4) * 5.4;
        makeFixtureBox(group, building, `QueuePost:${post}`, [0.18, 1.25, 0.18], [x, 0.64, z], materials.metal, "queue-post", { solid: false });
      }
      makeFixtureBox(group, building, "VaultDoor:frame", [4.6, 4.6, 0.48], [8.45, 2.3, 5.3], materials.metal, "vault");
      makeFixtureBox(group, building, "VaultDoor:center", [3.6, 3.6, 0.54], [8.18, 2.3, 5.3], materials.black, "vault", { solid: false });
      addCounter(group, building, { name: "BankHelpDesk", x: 6.2, z: -6.5, width: 4.2, role: "help-desk", material: materials.blue }, materials);
      makeFixtureBox(group, building, "Bank:crest", [7.4, 1.0, 0.08], [0, 4.9, 9.72], materials.mustard, "bank-signage", { solid: false });
      addPendantLights(group, building, profile, materials, [[-4, -1], [1, -1], [6, -1], [0, 6]]);
    }

    function buildHome(group, building, profile, materials) {
      addRug(group, building, "HomeLiving:rug", [8.2, 7], [5.8, -2.8], materials.green, "living-room");
      addSofa(group, building, "HomeLiving:sofa", [6.1, -3.2], 5.2, materials.green, "living-room-sofa");
      addTable(group, building, "HomeLiving:coffee-table", [6.1, -0.7], [3.0, 1.45], materials, "coffee-table");
      addRug(group, building, "HomeDining:rug", [7.2, 6.3], [-5.9, 3.2], materials.mustard, "dining-room");
      addTable(group, building, "HomeDining:table", [-5.8, 3.1], [4.6, 2.3], materials, "dining-table");
      for (const [index, x, z] of [[0, -8.3, 3.1], [1, -3.3, 3.1], [2, -5.8, 1.5], [3, -5.8, 4.7]]) {
        addSeat(group, building, `HomeDining:chair:${index}`, [x, z], materials.cream, "dining-chair", index < 2 ? Math.PI / 2 : 0);
      }
      makeFixtureBox(group, building, "KitchenIsland:body", [5.8, 1.05, 2.2], [-5.4, 0.55, -5.7], materials.white, "kitchen-island");
      makeFixtureBox(group, building, "KitchenIsland:top", [6.1, 0.15, 2.45], [-5.4, 1.13, -5.7], materials.darkWood, "kitchen-island");
      makeFixtureBox(group, building, "HomeDivider:east", [0.18, 2.2, 8], [1.2, 1.1, 5.8], materials.lightWood, "room-divider");
      makeFixtureBox(group, building, "HomeDivider:north", [9.2, 2.2, 0.18], [-6.8, 1.1, -0.1], materials.lightWood, "room-divider");
      addPendantLights(group, building, profile, materials, [[-5.5, -5.7], [-5.8, 3.1], [6.1, -2]]);
    }

    function buildPoliceStation(group, building, profile, materials) {
      addCounter(group, building, { name: "PoliceReception", x: 0, z: -7.7, width: 7.6, depth: 1.45, role: "reception", material: materials.blue }, materials);
      makeFixtureBox(group, building, "PoliceReception:badge", [1.2, 1.2, 0.08], [0, 2.35, -8.45], materials.mustard, "police-signage", { solid: false });
      addRug(group, building, "PoliceLobby:rug", [11.5, 5.8], [-4.8, -4.2], materials.blue, "lobby");
      addSofa(group, building, "PoliceLobby:bench", [-6.4, -4.3], 5.5, materials.blue, "lobby-bench");
      for (let desk = 0; desk < 4; desk += 1) {
        const x = -1 + (desk % 2) * 5.2;
        const z = 1.1 + Math.floor(desk / 2) * 4.2;
        addTable(group, building, `OfficerDesk:${desk}`, [x, z], [3.6, 1.7], materials, "officer-desk");
        makeFixtureBox(group, building, `OfficerDesk:${desk}:monitor`, [0.72, 0.58, 0.22], [x, 1.28, z], materials.black, "officer-desk", { solid: false });
      }
      addDisplayShelf(group, building, { name: "EvidenceCabinet", x: 7.4, z: 9.2, width: 7.3, depth: 0.72, height: 3.1, role: "evidence-cabinet", productMaterial: materials.mustard }, materials);
      makeFixtureBox(group, building, "PoliceNoticeBoard", [6.2, 2.6, 0.08], [7.6, 2.6, -10.45], materials.darkWood, "notice-board", { solid: false });
      for (let note = 0; note < 7; note += 1) {
        makeFixtureBox(group, building, `PoliceNoticeBoard:note:${note}`, [0.62, 0.72, 0.04], [5.25 + (note % 4) * 1.45, 2.05 + Math.floor(note / 4) * 1.05, -10.38], note % 2 ? materials.cream : materials.red, "notice-board", { solid: false });
      }
      addPendantLights(group, building, profile, materials, [[-4, 1], [3.5, 1], [0, -6]]);
    }

    const interiorBuilders = {
      conv: buildConvenienceStore,
      cafe: buildCafe,
      bake: buildBakery,
      rest: buildRestaurant,
      cloth: buildFashionStore,
      salon: buildHairSalon,
      furn: buildFurnitureShowroom,
      book: buildBookstore,
      hosp: buildHospital,
      bank: buildBank,
      home: buildHome,
      police: buildPoliceStation,
    };

    function createInteriorScene(building) {
      const profile = interiorProfiles[building.id] || {
        width: Math.max(18, building.w + 6),
        depth: Math.max(18, building.d + 6),
        height: 6.4,
        themeId: building.tp || "interior",
        preserveNative: false,
      };
      const palette = palettes[building.tp] || palettes.default;
      const interior = new constructors.Scene();
      interior.name = `Interior:${building.id}`;
      interior.userData.voxcelInteriorScene = true;

      if (cityScene.background?.clone) {
        interior.background = cityScene.background.clone();
        interior.background.setHex(palette.background);
      }
      if (cityScene.fog?.clone) {
        interior.fog = cityScene.fog.clone();
        interior.fog.color.setHex(palette.background);
        interior.fog.near = Math.max(28, profile.depth * 1.25);
        interior.fog.far = Math.max(64, profile.depth * 3.2);
      }

      for (const child of cityScene.children) {
        if (!child.isHemisphereLight && !child.isAmbientLight && !child.isDirectionalLight) continue;
        const light = child.clone();
        light.castShadow = false;
        if (light.isDirectionalLight) light.intensity = Math.min(light.intensity, 0.58);
        if (light.isHemisphereLight || light.isAmbientLight) {
          light.intensity = Math.max(0.45, Math.min(light.intensity, 0.8));
        }
        light.userData.voxcelInteriorOnly = true;
        interior.add(light);
      }

      if (constructors.PointLight) {
        for (const [index, offsetX, offsetZ] of [
          [0, -profile.width * 0.24, -profile.depth * 0.1],
          [1, profile.width * 0.24, -profile.depth * 0.1],
          [2, 0, profile.depth * 0.28],
        ]) {
          const roomLight = new constructors.PointLight(
            building.tp === "heal" || building.tp === "bank" ? 0xe3f3ff : 0xffe0b2,
            1.05,
            Math.max(profile.width, profile.depth) * 1.65,
          );
          roomLight.name = `InteriorLight:${index}`;
          roomLight.position.set(building.x + offsetX, profile.height - 1.05, building.z + offsetZ);
          roomLight.castShadow = false;
          roomLight.userData.voxcelInteriorOnly = true;
          interior.add(roomLight);
        }
      }

      const ownedRoot = new constructors.Group();
      ownedRoot.name = `InteriorOwned:${building.id}`;
      ownedRoot.userData.voxcelInteriorOwned = true;
      interior.add(ownedRoot);

      const shell = new constructors.Group();
      shell.name = `InteriorShell:${building.id}`;
      shell.userData.voxcelInteriorShell = true;
      ownedRoot.add(shell);

      const fixtureRoot = new constructors.Group();
      fixtureRoot.name = `InteriorFixtures:${building.id}`;
      fixtureRoot.userData.voxcelInteriorFixture = true;
      ownedRoot.add(fixtureRoot);

      const wallMaterial = makeMaterial(palette.wall);
      const accentMaterial = makeMaterial(palette.accent, { roughness: 0.72 });
      const floorColors = {
        cafe: 0x76563d,
        bake: 0x8a6544,
        rest: 0x5e4035,
        cloth: 0x56545f,
        salon: 0x5d5264,
        furn: 0x645745,
        book: 0x71533b,
        hosp: 0x849497,
        bank: 0x596676,
        home: 0x76583f,
        police: 0x4d5967,
      };
      const floorMaterial = makeMaterial(floorColors[building.id] || palette.floor, { roughness: 0.94 });
      const ceilingMaterial = makeMaterial(0xf3eee6, { roughness: 0.96 });
      const doorMaterial = makeMaterial(0x493326, { roughness: 0.66 });
      const wallHeight = profile.height;
      const wallThickness = 0.24;

      makeBox(
        shell,
        "InteriorFloor",
        [profile.width - 0.28, 0.16, profile.depth - 0.28],
        [building.x, -0.09, building.z],
        floorMaterial,
      );

      const ceiling = makeBox(
        shell,
        "InteriorCeiling",
        [profile.width - 0.2, 0.16, profile.depth - 0.2],
        [building.x, wallHeight + 0.02, building.z],
        ceilingMaterial,
      );

      const shellSides = {};
      const sideDefinitions = [
        ["north", [profile.width, wallHeight, wallThickness], [building.x, wallHeight / 2, building.z + profile.depth / 2]],
        ["south", [profile.width, wallHeight, wallThickness], [building.x, wallHeight / 2, building.z - profile.depth / 2]],
        ["west", [wallThickness, wallHeight, profile.depth], [building.x - profile.width / 2, wallHeight / 2, building.z]],
        ["east", [wallThickness, wallHeight, profile.depth], [building.x + profile.width / 2, wallHeight / 2, building.z]],
      ];

      for (const [side, size, position] of sideDefinitions) {
        const sideGroup = new constructors.Group();
        sideGroup.name = `InteriorWall:${side}`;
        sideGroup.userData.voxcelInteriorShell = true;
        shell.add(sideGroup);
        makeBox(sideGroup, `${side}:wall`, size, position, wallMaterial);
        shellSides[side] = sideGroup;
      }

      makeBox(
        shellSides.south,
        "InteriorDoor",
        [2.25, 2.85, 0.13],
        [building.x, 1.425, building.z - profile.depth / 2 + 0.13],
        doorMaterial,
      );
      makeBox(
        shellSides.north,
        "InteriorAccent",
        [profile.width * 0.56, 1.05, 0.08],
        [building.x, wallHeight * 0.72, building.z + profile.depth / 2 - 0.17],
        accentMaterial,
      );

      for (const [index, x, z] of [
        [0, -profile.width * 0.24, -profile.depth * 0.1],
        [1, profile.width * 0.24, -profile.depth * 0.1],
        [2, 0, profile.depth * 0.28],
      ]) {
        makeBox(
          shell,
          `CeilingLight:${index}`,
          [2.1, 0.08, 0.58],
          [building.x + x, profile.height - 0.12, building.z + z],
          makeMaterial(0xfff1c8, { emissive: 0xffd989, emissiveIntensity: 0.58, roughness: 0.5 }),
        );
      }

      const materials = createInteriorMaterials(palette);
      (interiorBuilders[building.id] || (() => {}))(fixtureRoot, building, profile, materials);

      return { interior, ownedRoot, shell, shellSides, ceiling, wallHeight, profile };
    }

    function isInteriorContent(object, building) {
      if (
        object === playerRoot ||
        object === playerShadow ||
        object.userData?.voxcelCloud ||
        object.userData?.voxcelInteriorShell ||
        object.userData?.voxcelInteriorFixture ||
        object.isHemisphereLight ||
        object.isAmbientLight ||
        object.isDirectionalLight ||
        object.isPointLight
      ) {
        return false;
      }

      const profile = interiorProfiles[building.id];
      if (!profile?.preserveNative) return false;

      if (!object.visible) return false;
      const bounds = objectBounds(object);
      if (!bounds) return false;
      const original = runtime.originalBuildingDimensions || building;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxZ - bounds.minZ;
      const height = bounds.maxY - bounds.minY;

      const isLegacyRoomSurface =
        width >= original.w * 0.72 &&
        depth >= original.d * 0.72 &&
        height < 0.25 &&
        (bounds.maxY < 0.2 || bounds.minY > original.h * 0.55);
      if (isLegacyRoomSurface) return false;

      if (building.id === "police") {
        const belongsToJailCell =
          centerX >= building.x - 5.7 &&
          centerX <= building.x - 0.7 &&
          centerZ >= building.z - 5.7 &&
          centerZ <= building.z - 1.3;
        if (!belongsToJailCell) return false;
      }

      return (
        Math.abs(centerX - building.x) <= original.w / 2 - 0.18 &&
        Math.abs(centerZ - building.z) <= original.d / 2 - 0.18 &&
        width <= original.w + 0.1 &&
        depth <= original.d + 0.1 &&
        bounds.maxY <= original.h + 0.45
      );
    }

    function transferNewInteriorContent(force = false) {
      if (!runtime.activeBuilding || !runtime.interiorScene) return;
      const now = performance.now();
      if (
        !force &&
        cityScene.children.length === runtime.lastCityChildCount &&
        now - runtime.lastInteriorTransferScan < 500
      ) {
        return;
      }
      runtime.lastInteriorTransferScan = now;
      runtime.lastCityChildCount = cityScene.children.length;
      cityScene.updateMatrixWorld(true);
      const candidates = cityScene.children.filter((object) => {
        return isInteriorContent(object, runtime.activeBuilding);
      });
      let transferred = false;
      for (const object of candidates) {
        runtime.interiorScene.add(object);
        runtime.movedObjects.add(object);
        transferred = true;
      }
      if (transferred && runtime.ready) refreshColliderRegistry(performance.now(), true);
    }

    function adaptNativeInteriorContent(building) {
      runtime.adaptedNativeObjects = [];
      runtime.policeJailCellSnapshot = null;
      if (building.id !== "police" || !runtime.movedObjects.size) return;

      const deltaX = -4.3;
      const deltaZ = 10.5;
      const heightScale = 0.6;
      const jailView = handle.buildingViews?.police;

      for (const object of runtime.movedObjects) {
        runtime.adaptedNativeObjects.push({
          object,
          position: { x: object.position.x, y: object.position.y, z: object.position.z },
          scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
          originalBarX: object.userData?.origX,
        });
        object.position.x += deltaX;
        object.position.y *= heightScale;
        object.position.z += deltaZ;
        object.scale.y *= heightScale;
        if (Number.isFinite(object.userData?.origX)) object.userData.origX += deltaX;
      }

      if (jailView?.jailCell) {
        runtime.policeJailCellSnapshot = { ...jailView.jailCell };
        const originalCell = runtime.policeJailCellSnapshot;
        jailView.jailCell.x += deltaX;
        jailView.jailCell.z += deltaZ;
        if (
          Math.abs(playerRoot.position.x - originalCell.x) <= originalCell.w / 2 + 0.8 &&
          Math.abs(playerRoot.position.z - originalCell.z) <= originalCell.d / 2 + 0.8
        ) {
          playerRoot.position.x += deltaX;
          playerRoot.position.z += deltaZ;
          playerShadow.position.x += deltaX;
          playerShadow.position.z += deltaZ;
          camera.position.x += deltaX;
          camera.position.z += deltaZ;
        }
      }
    }

    function restoreAdaptedNativeContent() {
      for (const saved of runtime.adaptedNativeObjects) {
        saved.object.position.set(saved.position.x, saved.position.y, saved.position.z);
        saved.object.scale.set(saved.scale.x, saved.scale.y, saved.scale.z);
        if (saved.originalBarX !== undefined) saved.object.userData.origX = saved.originalBarX;
      }
      const jailCell = handle.buildingViews?.police?.jailCell;
      if (jailCell && runtime.policeJailCellSnapshot) {
        Object.assign(jailCell, runtime.policeJailCellSnapshot);
      }
      runtime.adaptedNativeObjects = [];
      runtime.policeJailCellSnapshot = null;
    }

    function enterInterior(building) {
      runtime.originalBuildingDimensions = { w: building.w, d: building.d, h: building.h };
      runtime.originalInteractionPositions = [];
      runtime.themeFixtureCount = 0;
      runtime.fixtureRoles.clear();
      runtime.interiorMaterials.clear();
      runtime.legacySurfaceCount = 0;
      const created = createInteriorScene(building);
      runtime.activeBuilding = building;
      runtime.interiorScene = created.interior;
      runtime.interiorOwnedRoot = created.ownedRoot;
      runtime.interiorShell = created.shell;
      runtime.shellSides = created.shellSides;
      runtime.ceiling = created.ceiling;
      runtime.wallHeight = created.wallHeight;
      runtime.roomDimensions = {
        width: created.profile.width,
        depth: created.profile.depth,
        height: created.profile.height,
      };
      runtime.themeId = created.profile.themeId;
      runtime.activeScene = created.interior;
      const arrivedThroughEntrance =
        Math.abs(playerRoot.position.x - building.x) < 0.8 &&
        Math.abs(
          playerRoot.position.z -
          (building.z - runtime.originalBuildingDimensions.d / 2 + 2)
        ) < 1.1;

      transferNewInteriorContent(true);
      adaptNativeInteriorContent(building);
      created.interior.add(playerRoot);
      created.interior.add(playerShadow);

      const points = handle.buildingViews?.[building.id]?.interiorPts || [];
      for (const point of points) {
        runtime.originalInteractionPositions.push({
          point,
          x: point.pos.x,
          y: point.pos.y,
          z: point.pos.z,
        });
      }
      const entryShiftZ = -(created.profile.depth - building.d) / 2;
      const exitPoint = points.find((point) => point.action === "exit");
      if (exitPoint) exitPoint.pos.z += entryShiftZ;
      if (arrivedThroughEntrance) {
        playerRoot.position.z += entryShiftZ;
        playerShadow.position.z += entryShiftZ;
        camera.position.z += entryShiftZ;
      }

      building.w = created.profile.width;
      building.d = created.profile.depth;
      if (appState.insideBld && appState.insideBld !== building) {
        appState.insideBld.w = created.profile.width;
        appState.insideBld.d = created.profile.depth;
      }
      handle.scene = created.interior;
      runtime.lastSceneKey = `interior:${building.id}`;
      runtime.lastPosition.copy(playerRoot.position);
      runtime.acceptNextMove = true;
      runtime.sceneSwitches += 1;
      playSceneTransition();
      refreshColliderRegistry(performance.now(), true);
    }

    function disposeInteriorShell() {
      if (!runtime.interiorOwnedRoot) return;
      const geometries = new Set();
      const materials = new Set();
      runtime.interiorOwnedRoot.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) {
          if (material?.userData?.voxcelInteriorMaterial) materials.add(material);
        }
      });
      runtime.interiorMaterials.forEach((material) => materials.add(material));
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    }

    function exitInterior() {
      if (!runtime.interiorScene) return;
      const building = runtime.activeBuilding;
      const original = runtime.originalBuildingDimensions;
      if (building && original) {
        const expandedOutsideZ = building.z - building.d / 2 - 2;
        if (
          Math.abs(playerRoot.position.x - building.x) < 0.8 &&
          Math.abs(playerRoot.position.z - expandedOutsideZ) < 1.1
        ) {
          const targetZ = building.z - original.d / 2 - 2;
          const correctionZ = targetZ - playerRoot.position.z;
          playerRoot.position.z = targetZ;
          playerShadow.position.z += correctionZ;
          camera.position.z += correctionZ;
        }
        building.w = original.w;
        building.d = original.d;
        building.h = original.h;
      }
      for (const saved of runtime.originalInteractionPositions) {
        saved.point.pos.set(saved.x, saved.y, saved.z);
      }
      restoreAdaptedNativeContent();
      cityScene.add(playerRoot);
      cityScene.add(playerShadow);
      for (const object of [...runtime.movedObjects]) {
        if (object.parent === runtime.interiorScene) cityScene.add(object);
      }
      runtime.movedObjects.clear();
      disposeInteriorShell();
      runtime.interiorScene.clear();
      runtime.interiorScene = null;
      runtime.interiorOwnedRoot = null;
      runtime.interiorShell = null;
      runtime.shellSides = null;
      runtime.ceiling = null;
      runtime.wallHeight = 0;
      runtime.activeBuilding = null;
      runtime.roomDimensions = null;
      runtime.themeId = null;
      runtime.themeFixtureCount = 0;
      runtime.fixtureRoles.clear();
      runtime.interiorMaterials.clear();
      runtime.legacySurfaceCount = 0;
      runtime.originalBuildingDimensions = null;
      runtime.originalInteractionPositions = [];
      runtime.activeScene = cityScene;
      handle.scene = cityScene;
      runtime.lastSceneKey = "city";
      runtime.lastPosition.copy(playerRoot.position);
      runtime.acceptNextMove = true;
      runtime.sceneSwitches += 1;
      playSceneTransition();
      refreshColliderRegistry(performance.now(), true);
    }

    function syncInteriorScene() {
      const buildingState = appState.insideBld;
      const building = buildingState
        ? buildings.find((candidate) => candidate.id === buildingState.id) || buildingState
        : null;

      if (building && runtime.activeBuilding?.id !== building.id) {
        if (runtime.interiorScene) exitInterior();
        enterInterior(building);
      } else if (!building && runtime.interiorScene) {
        exitInterior();
      } else if (building) {
        transferNewInteriorContent();
      }
    }

    const nativeCityRemove = cityScene.remove;
    cityScene.remove = function enhancedRemove(...objects) {
      for (const object of objects) {
        if (runtime.movedObjects.has(object) && object.parent && object.parent !== cityScene) {
          runtime.movedObjects.delete(object);
          object.parent.remove(object);
        } else {
          nativeCityRemove.call(cityScene, object);
        }
      }
      return cityScene;
    };

    function updateInteriorShell() {
      if (!runtime.activeBuilding || !runtime.shellSides) return;
      for (const side of Object.values(runtime.shellSides)) side.visible = true;
      const building = runtime.activeBuilding;
      const room = runtime.roomDimensions || { width: building.w, depth: building.d };
      const distances = {
        north: camera.position.z - (building.z + room.depth / 2),
        south: building.z - room.depth / 2 - camera.position.z,
        east: camera.position.x - (building.x + room.width / 2),
        west: building.x - room.width / 2 - camera.position.x,
      };
      const [nearestSide, distance] = Object.entries(distances).sort((a, b) => b[1] - a[1])[0];
      if (distance > -2.8) runtime.shellSides[nearestSide].visible = false;
      if (runtime.ceiling) runtime.ceiling.visible = camera.position.y < runtime.wallHeight - 0.1;
    }

    function isInteractiveBuildingShell(bounds) {
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxZ - bounds.minZ;
      const height = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;

      return buildings.some((building) => {
        if (height < building.h * 0.48) return false;
        const frontOrBack =
          depth < 0.9 &&
          width > building.w * 0.72 &&
          Math.abs(centerX - building.x) < 0.5 &&
          Math.abs(Math.abs(centerZ - building.z) - building.d / 2) < 0.75;
        const side =
          width < 0.9 &&
          depth > building.d * 0.72 &&
          Math.abs(centerZ - building.z) < 0.5 &&
          Math.abs(Math.abs(centerX - building.x) - building.w / 2) < 0.75;
        return frontOrBack || side;
      });
    }

    function materialIsNonSolid(material) {
      const materials = Array.isArray(material) ? material : [material];
      return materials.length > 0 && materials.every((candidate) => {
        return candidate?.transparent && candidate.opacity < 0.45;
      });
    }

    function boundsAreSolid(node, bounds) {
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxZ - bounds.minZ;
      const height = bounds.maxY - bounds.minY;
      if (bounds.maxY < 0.16 || bounds.minY > PLAYER_HEIGHT) return false;
      if (width > 180 || depth > 180 || width < 0.015 || depth < 0.015) return false;
      if (height < 0.16 && bounds.maxY < 0.3) return false;
      if (width < 0.24 && depth < 0.24 && height < 0.65) return false;
      if (materialIsNonSolid(node.material)) return false;
      if (isInteractiveBuildingShell(bounds)) return false;
      return true;
    }

    function refreshColliderRegistry(now, force = false) {
      if (!force && now - runtime.lastColliderRefresh < COLLIDER_REFRESH_MS) return;
      runtime.lastColliderRefresh = now;
      runtime.colliderNodes.clear();
      runtime.colliderNodesByScene.clear();
      const scenes = runtime.interiorScene ? [cityScene, runtime.interiorScene] : [cityScene];
      for (const scene of scenes) {
        const sceneNodes = new Set();
        scene.traverse((object) => {
          if (
            !object.isMesh ||
            !object.geometry ||
            isPlayerObject(object) ||
            hasEnhancementFlag(object, "voxcelCloud") ||
            hasEnhancementFlag(object, "voxcelInteriorShell") ||
            object.userData?.collisionMode === "none"
          ) {
            return;
          }
          runtime.colliderNodes.add(object);
          sceneNodes.add(object);
        });
        runtime.colliderNodesByScene.set(scene, sceneNodes);
      }
    }

    function buildActiveColliders(radius = PLAYER_RADIUS, excludedRoot = null) {
      const activeScene = runtime.activeScene;
      activeScene.updateMatrixWorld(true);
      const colliders = [];
      const activeNodes = runtime.colliderNodesByScene.get(activeScene) || runtime.colliderNodes;
      for (const node of activeNodes) {
        if (isObjectWithin(node, excludedRoot)) continue;
        if (!isVisibleInScene(node, activeScene)) continue;
        const bounds = meshBounds(node);
        if (!bounds || !boundsAreSolid(node, bounds)) continue;
        colliders.push({
          minX: bounds.minX - radius,
          maxX: bounds.maxX + radius,
          minZ: bounds.minZ - radius,
          maxZ: bounds.maxZ + radius,
          object: node,
        });
      }
      runtime.colliderCount = colliders.length;
      return colliders;
    }

    function pointInside(collider, x, z) {
      return x > collider.minX && x < collider.maxX && z > collider.minZ && z < collider.maxZ;
    }

    function blockedAt(colliders, fromX, fromZ, x, z) {
      for (const collider of colliders) {
        if (!pointInside(collider, x, z)) continue;
        if (pointInside(collider, fromX, fromZ)) continue;
        runtime.lastCollisionObject = collider.object.name || collider.object.geometry?.type || "object";
        return true;
      }
      return false;
    }

    function sweepAxis(colliders, fromX, fromZ, target, axis) {
      const start = axis === "x" ? fromX : fromZ;
      const distance = target - start;
      const steps = Math.max(1, Math.ceil(Math.abs(distance) / SWEEP_STEP));
      let safe = start;
      let previousX = fromX;
      let previousZ = fromZ;

      for (let step = 1; step <= steps; step += 1) {
        const value = start + distance * (step / steps);
        const x = axis === "x" ? value : fromX;
        const z = axis === "z" ? value : fromZ;
        if (blockedAt(colliders, previousX, previousZ, x, z)) break;
        safe = value;
        previousX = x;
        previousZ = z;
      }
      return safe;
    }

    function sweptPathIsBlocked(colliders, fromX, fromZ, targetX, targetZ) {
      const distance = Math.hypot(targetX - fromX, targetZ - fromZ);
      const steps = Math.max(1, Math.ceil(distance / SWEEP_STEP));
      let previousX = fromX;
      let previousZ = fromZ;
      for (let step = 1; step <= steps; step += 1) {
        const amount = step / steps;
        const x = fromX + (targetX - fromX) * amount;
        const z = fromZ + (targetZ - fromZ) * amount;
        if (blockedAt(colliders, previousX, previousZ, x, z)) return true;
        previousX = x;
        previousZ = z;
      }
      return false;
    }

    function nearestInteriorInteraction() {
      const buildingId = runtime.activeBuilding?.id;
      const points = buildingId ? handle.buildingViews?.[buildingId]?.interiorPts : null;
      if (!points?.length) return null;
      return points
        .filter((point) => point.action !== "exit")
        .map((point) => ({
          point,
          distance: Math.hypot(
            point.pos.x - playerRoot.position.x,
            point.pos.z - playerRoot.position.z,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.point?.pos || null;
    }

    function enforcePlayerCollision(now) {
      refreshColliderRegistry(now);
      const position = playerRoot.position;
      const last = runtime.lastPosition;
      const sceneKey = runtime.activeBuilding ? `interior:${runtime.activeBuilding.id}` : "city";

      if (
        runtime.acceptNextMove ||
        runtime.lastSceneKey !== sceneKey ||
        !playerRoot.visible ||
        appState.vehicle ||
        appState.arrestPhase
      ) {
        last.copy(position);
        runtime.lastSceneKey = sceneKey;
        runtime.acceptNextMove = false;
        return;
      }

      const deltaX = position.x - last.x;
      const deltaZ = position.z - last.z;
      const distance = Math.hypot(deltaX, deltaZ);
      if (distance < 0.0001) return;
      if (distance > MAX_WALK_STEP) {
        last.copy(position);
        return;
      }

      const colliders = buildActiveColliders();
      let resolvedX = last.x;
      let resolvedZ = last.z;
      const xFirst = Math.abs(deltaX) >= Math.abs(deltaZ);

      if (xFirst) {
        resolvedX = sweepAxis(colliders, resolvedX, resolvedZ, position.x, "x");
        resolvedZ = sweepAxis(colliders, resolvedX, resolvedZ, position.z, "z");
      } else {
        resolvedZ = sweepAxis(colliders, resolvedX, resolvedZ, position.z, "z");
        resolvedX = sweepAxis(colliders, resolvedX, resolvedZ, position.x, "x");
      }

      const xBlocked = Math.abs(resolvedX - position.x) > 0.0001;
      const zBlocked = Math.abs(resolvedZ - position.z) > 0.0001;
      const interactionGuide = nearestInteriorInteraction();
      const guideCorridorX = interactionGuide ? interactionGuide.x + 1.5 : null;
      const guideCorridorZ = interactionGuide ? interactionGuide.z + 1.5 : null;
      if (zBlocked && Math.abs(deltaX) < 0.001 && Math.abs(deltaZ) > 0.001) {
        let best = { x: resolvedX, z: resolvedZ, score: Math.abs(resolvedZ - last.z) };
        for (const direction of [runtime.slideDirection, -runtime.slideDirection]) {
          const sideTarget = last.x + direction * Math.abs(deltaZ) * 0.92;
          const sideX = sweepAxis(colliders, last.x, last.z, sideTarget, "x");
          const forwardZ = sweepAxis(colliders, sideX, last.z, position.z, "z");
          const guideBias = guideCorridorX !== null
            ? (Math.abs(last.x - guideCorridorX) - Math.abs(sideX - guideCorridorX)) * 3
            : 0;
          const score = Math.abs(sideX - last.x) + Math.abs(forwardZ - last.z) * 1.2 + guideBias;
          if (score > best.score + 0.0001) {
            best = { x: sideX, z: forwardZ, score, direction };
          }
        }
        resolvedX = best.x;
        resolvedZ = best.z;
        if (best.direction) runtime.slideDirection = best.direction;
      } else if (xBlocked && Math.abs(deltaZ) < 0.001 && Math.abs(deltaX) > 0.001) {
        let best = { x: resolvedX, z: resolvedZ, score: Math.abs(resolvedX - last.x) };
        for (const direction of [runtime.slideDirection, -runtime.slideDirection]) {
          const sideTarget = last.z + direction * Math.abs(deltaX) * 0.92;
          const sideZ = sweepAxis(colliders, last.x, last.z, sideTarget, "z");
          const forwardX = sweepAxis(colliders, last.x, sideZ, position.x, "x");
          const guideBias = guideCorridorZ !== null
            ? (Math.abs(last.z - guideCorridorZ) - Math.abs(sideZ - guideCorridorZ)) * 3
            : 0;
          const score = Math.abs(sideZ - last.z) + Math.abs(forwardX - last.x) * 1.2 + guideBias;
          if (score > best.score + 0.0001) {
            best = { x: forwardX, z: sideZ, score, direction };
          }
        }
        resolvedX = best.x;
        resolvedZ = best.z;
        if (best.direction) runtime.slideDirection = best.direction;
      }

      if (Math.abs(resolvedX - position.x) > 0.0001 || Math.abs(resolvedZ - position.z) > 0.0001) {
        const correctionX = resolvedX - position.x;
        const correctionZ = resolvedZ - position.z;
        position.x = resolvedX;
        position.z = resolvedZ;
        playerShadow.position.x += correctionX;
        playerShadow.position.z += correctionZ;
        camera.position.x += correctionX;
        camera.position.z += correctionZ;
        runtime.blockedMoves += 1;
      }
      last.copy(position);
    }

    function enforceVehicleCollision(now) {
      const vehicle = appState.vehicle;
      if (!vehicle?.m) {
        runtime.lastVehicle = null;
        runtime.lastVehiclePosition = null;
        return;
      }

      const position = vehicle.m.position;
      if (runtime.lastVehicle !== vehicle || !runtime.lastVehiclePosition) {
        runtime.lastVehicle = vehicle;
        runtime.lastVehiclePosition = position.clone();
        return;
      }

      const last = runtime.lastVehiclePosition;
      const distance = Math.hypot(position.x - last.x, position.z - last.z);
      if (distance < 0.0001) return;
      if (distance > 3) {
        last.copy(position);
        return;
      }

      const radius = vehicle.type === "bus" ? 2 : 1.45;
      const colliders = buildActiveColliders(radius, vehicle.m);
      if (sweptPathIsBlocked(colliders, last.x, last.z, position.x, position.z)) {
        const correctionX = last.x - position.x;
        const correctionZ = last.z - position.z;
        position.x = last.x;
        position.z = last.z;
        vehicle.driveSpeed *= -0.16;
        playerRoot.position.x += correctionX;
        playerRoot.position.z += correctionZ;
        camera.position.x += correctionX;
        camera.position.z += correctionZ;
        runtime.vehicleBlockedMoves += 1;
      }
      last.copy(position);
    }

    enhanceClouds();
    updateCloudAppearance();
    refreshColliderRegistry(performance.now(), true);

    const nativeRender = renderer.render.bind(renderer);
    renderer.render = function enhancedRender(requestedScene, requestedCamera) {
      const now = performance.now();
      syncInteriorScene();
      updateClouds(now);
      enforceVehicleCollision(now);
      enforcePlayerCollision(now);
      updateInteriorShell();
      const activeScene = runtime.activeScene || requestedScene;
      for (const registration of runtime.beforeRenderCallbacks) {
        try {
          registration.callback(now, activeScene, requestedCamera, renderer);
        } catch (error) {
          registration.active = false;
          registration.error = error;
          runtime.beforeRenderCallbacks.delete(registration);
          console.error("Voxcel before-render callback failed and was removed.", error);
        }
      }
      return nativeRender(activeScene, requestedCamera);
    };

    function countLegacyRoomSurfaces() {
      if (!runtime.activeBuilding || !runtime.originalBuildingDimensions || !runtime.activeScene) return 0;
      const original = runtime.originalBuildingDimensions;
      let count = 0;
      runtime.activeScene.updateMatrixWorld(true);
      runtime.activeScene.traverse((object) => {
        if (
          !object.isMesh ||
          hasEnhancementFlag(object, "voxcelInteriorShell") ||
          hasEnhancementFlag(object, "voxcelInteriorFixture")
        ) {
          return;
        }
        const bounds = meshBounds(object);
        if (!bounds) return;
        const width = bounds.maxX - bounds.minX;
        const depth = bounds.maxZ - bounds.minZ;
        const height = bounds.maxY - bounds.minY;
        if (
          width >= original.w * 0.72 &&
          depth >= original.d * 0.72 &&
          height < 0.25 &&
          (bounds.maxY < 0.2 || bounds.minY > original.h * 0.55)
        ) {
          count += 1;
        }
      });
      return count;
    }

    function publicState() {
      const altitudes = runtime.cloudGroups.map((cloud) => cloud.object.position.y);
      runtime.legacySurfaceCount = countLegacyRoomSurfaces();
      return {
        ready: runtime.ready,
        activeScene: runtime.activeBuilding ? "interior" : "city",
        sceneName: runtime.activeScene?.name || "city",
        buildingId: runtime.activeBuilding?.id || null,
        usingDedicatedScene: runtime.activeScene !== cityScene,
        movedObjectCount: runtime.movedObjects.size,
        roomDimensions: runtime.roomDimensions ? { ...runtime.roomDimensions } : null,
        themeId: runtime.themeId,
        themeFixtureCount: runtime.themeFixtureCount,
        fixtureRoles: [...runtime.fixtureRoles].sort(),
        legacySurfaceCount: runtime.legacySurfaceCount,
        colliderCount: runtime.colliderCount,
        registeredColliderMeshes: runtime.colliderNodes.size,
        blockedMoves: runtime.blockedMoves,
        vehicleBlockedMoves: runtime.vehicleBlockedMoves,
        lastCollisionObject: runtime.lastCollisionObject,
        suppressedMessages: runtime.suppressedMessages,
        sceneSwitches: runtime.sceneSwitches,
        clouds: {
          count: runtime.cloudGroups.length,
          meshCount: runtime.cloudGroups.length * 2,
          oldSphereGroupsHidden: runtime.oldCloudGroups.filter((group) => !group.visible).length,
          minAltitude: altitudes.length ? Math.min(...altitudes) : 0,
          maxAltitude: altitudes.length ? Math.max(...altitudes) : 0,
        },
      };
    }

    function installTestBridge() {
      const testApi = window.__voxcelTest;
      if (!testApi || testApi.__enhancementsInstalled) return;
      const originalSample = testApi.sample;
      testApi.sample = function enhancedSample() {
        const sample = originalSample.call(this);
        if (sample.appearance?.outfit) {
          const wearingDress = appState.outfit === 5;
          sample.appearance.outfit.torsoVisible = !wearingDress;
          sample.appearance.outfit.dressVisible = wearingDress;
        }
        sample.enhancements = publicState();
        return sample;
      };

      for (const methodName of ["setPlayer", "resetPlayer", "attachPlayerVehicle"]) {
        const originalMethod = testApi[methodName];
        if (typeof originalMethod !== "function") continue;
        testApi[methodName] = function enhancedTestMethod(...args) {
          runtime.acceptNextMove = true;
          return originalMethod.apply(this, args);
        };
      }
      testApi.__enhancementsInstalled = true;
    }

    runtime.ready = true;
    installTestBridge();

    window.__voxcelEnhancements = {
      ready: true,
      cityScene,
      getActiveScene: () => runtime.activeScene,
      getState: publicState,
      registerBeforeRender(callback) {
        if (typeof callback !== "function") {
          throw new TypeError("before-render callback must be a function");
        }
        const registration = { callback, active: true, error: null };
        runtime.beforeRenderCallbacks.add(registration);
        const unregister = () => {
          registration.active = false;
          return runtime.beforeRenderCallbacks.delete(registration);
        };
        Object.defineProperties(unregister, {
          active: { get: () => registration.active },
          error: { get: () => registration.error },
        });
        return unregister;
      },
      refreshColliders: () => refreshColliderRegistry(performance.now(), true),
      acceptNextMove: () => {
        runtime.acceptNextMove = true;
      },
    };
  }

  waitForRuntime();
})();
