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

  const runtime = {
    ready: false,
    cityScene: null,
    activeScene: null,
    activeBuilding: null,
    interiorScene: null,
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
      const material = new constructors.Material({
        color,
        roughness: options.roughness ?? 0.86,
        metalness: options.metalness ?? 0,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
      });
      material.userData.voxcelInteriorMaterial = true;
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

    function createInteriorScene(building) {
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
        interior.fog.near = 18;
        interior.fog.far = 48;
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
        const roomLight = new constructors.PointLight(0xffe2bd, 1.45, Math.max(building.w, building.d) * 2.4);
        roomLight.position.set(building.x, 4.15, building.z - 0.25);
        roomLight.castShadow = false;
        roomLight.userData.voxcelInteriorOnly = true;
        interior.add(roomLight);
      }

      const shell = new constructors.Group();
      shell.name = `InteriorShell:${building.id}`;
      shell.userData.voxcelInteriorShell = true;
      interior.add(shell);

      const wallMaterial = makeMaterial(palette.wall);
      const accentMaterial = makeMaterial(palette.accent, { roughness: 0.72 });
      const floorMaterial = makeMaterial(palette.floor, { roughness: 0.94 });
      const ceilingMaterial = makeMaterial(0xf3eee6, { roughness: 0.96 });
      const doorMaterial = makeMaterial(0x493326, { roughness: 0.66 });
      const wallHeight = Math.min(5.2, Math.max(4.4, building.h * 0.58));
      const wallThickness = 0.24;

      makeBox(
        shell,
        "InteriorFloor",
        [building.w - 0.28, 0.16, building.d - 0.28],
        [building.x, -0.09, building.z],
        floorMaterial,
      );

      const ceiling = makeBox(
        shell,
        "InteriorCeiling",
        [building.w - 0.2, 0.16, building.d - 0.2],
        [building.x, wallHeight + 0.02, building.z],
        ceilingMaterial,
      );

      const shellSides = {};
      const sideDefinitions = [
        ["north", [building.w, wallHeight, wallThickness], [building.x, wallHeight / 2, building.z + building.d / 2]],
        ["south", [building.w, wallHeight, wallThickness], [building.x, wallHeight / 2, building.z - building.d / 2]],
        ["west", [wallThickness, wallHeight, building.d], [building.x - building.w / 2, wallHeight / 2, building.z]],
        ["east", [wallThickness, wallHeight, building.d], [building.x + building.w / 2, wallHeight / 2, building.z]],
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
        [1.85, 2.55, 0.13],
        [building.x, 1.275, building.z - building.d / 2 - 0.14],
        doorMaterial,
      );
      makeBox(
        shellSides.north,
        "InteriorAccent",
        [building.w * 0.62, 1.05, 0.08],
        [building.x, wallHeight * 0.67, building.z + building.d / 2 - 0.17],
        accentMaterial,
      );

      return { interior, shell, shellSides, ceiling, wallHeight };
    }

    function isInteriorContent(object, building) {
      if (
        object === playerRoot ||
        object === playerShadow ||
        object.userData?.voxcelCloud ||
        object.userData?.voxcelInteriorShell ||
        object.isHemisphereLight ||
        object.isAmbientLight ||
        object.isDirectionalLight
      ) {
        return false;
      }

      if (object.isPointLight) {
        return (
          Math.abs(object.position.x - building.x) < building.w / 2 &&
          Math.abs(object.position.z - building.z) < building.d / 2 &&
          object.position.y < building.h + 1
        );
      }

      if (!object.visible) return false;
      const bounds = objectBounds(object);
      if (!bounds) return false;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      const width = bounds.maxX - bounds.minX;
      const depth = bounds.maxZ - bounds.minZ;

      return (
        Math.abs(centerX - building.x) <= building.w / 2 - 0.18 &&
        Math.abs(centerZ - building.z) <= building.d / 2 - 0.18 &&
        width <= building.w + 0.1 &&
        depth <= building.d + 0.1 &&
        bounds.maxY <= building.h + 0.45
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

    function enterInterior(building) {
      const created = createInteriorScene(building);
      runtime.activeBuilding = building;
      runtime.interiorScene = created.interior;
      runtime.interiorShell = created.shell;
      runtime.shellSides = created.shellSides;
      runtime.ceiling = created.ceiling;
      runtime.wallHeight = created.wallHeight;
      runtime.activeScene = created.interior;

      transferNewInteriorContent(true);
      created.interior.add(playerRoot);
      created.interior.add(playerShadow);
      handle.scene = created.interior;
      runtime.lastSceneKey = `interior:${building.id}`;
      runtime.lastPosition.copy(playerRoot.position);
      runtime.acceptNextMove = true;
      runtime.sceneSwitches += 1;
      playSceneTransition();
      refreshColliderRegistry(performance.now(), true);
    }

    function disposeInteriorShell() {
      if (!runtime.interiorShell) return;
      const geometries = new Set();
      const materials = new Set();
      runtime.interiorShell.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) {
          if (material?.userData?.voxcelInteriorMaterial) materials.add(material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    }

    function exitInterior() {
      if (!runtime.interiorScene) return;
      cityScene.add(playerRoot);
      cityScene.add(playerShadow);
      for (const object of [...runtime.movedObjects]) {
        if (object.parent === runtime.interiorScene) cityScene.add(object);
      }
      runtime.movedObjects.clear();
      disposeInteriorShell();
      runtime.interiorScene.clear();
      runtime.interiorScene = null;
      runtime.interiorShell = null;
      runtime.shellSides = null;
      runtime.ceiling = null;
      runtime.wallHeight = 0;
      runtime.activeBuilding = null;
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
      const distances = {
        north: camera.position.z - (building.z + building.d / 2),
        south: building.z - building.d / 2 - camera.position.z,
        east: camera.position.x - (building.x + building.w / 2),
        west: building.x - building.w / 2 - camera.position.x,
      };
      const [nearestSide, distance] = Object.entries(distances).sort((a, b) => b[1] - a[1])[0];
      if (distance > -0.15) runtime.shellSides[nearestSide].visible = false;
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
      return nativeRender(runtime.activeScene || requestedScene, requestedCamera);
    };

    function publicState() {
      const altitudes = runtime.cloudGroups.map((cloud) => cloud.object.position.y);
      return {
        ready: runtime.ready,
        activeScene: runtime.activeBuilding ? "interior" : "city",
        sceneName: runtime.activeScene?.name || "city",
        buildingId: runtime.activeBuilding?.id || null,
        usingDedicatedScene: runtime.activeScene !== cityScene,
        movedObjectCount: runtime.movedObjects.size,
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
      refreshColliders: () => refreshColliderRegistry(performance.now(), true),
      acceptNextMove: () => {
        runtime.acceptNextMove = true;
      },
    };
  }

  waitForRuntime();
})();
