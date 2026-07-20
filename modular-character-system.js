const MODEL_URL = new URL("./models/modular-character-parts.glb", import.meta.url).href;
const CHARACTER_SCALE = 1.2;
const CHARACTER_Y_OFFSET = -1.122;
const EXPECTED_GEOMETRY_COUNT = 44;
const INSTANCE_CAPACITY = 36;
const DYNAMIC_DRAW_USAGE = 35048;

let THREE_CORE = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

const HAIR_COLORS = [
  0x18131a,
  0x5a2d14,
  0xe7c66d,
  0xa83a1d,
  0xec5b99,
  0x3274d8,
  0xe8e9ef,
  0x3a9b58,
  0x7440a8,
];

const SKIN_COLORS = [0xf1bd92, 0xd58a5d, 0xa85d39, 0x60321f];

const OUTFITS = [
  { top: 0x2c8bd5, detail: 0xf4d35e, bottom: 0x24304a, hips: 0, longSleeves: false },
  { top: 0xdd3437, detail: 0xf7ead7, bottom: 0x22252d, hips: 0, longSleeves: true },
  { top: 0x33a255, detail: 0xd5f2dc, bottom: 0x303a55, hips: 0, longSleeves: true },
  { top: 0xf2f1e9, detail: 0x3e78bc, bottom: 0x253a67, hips: 2, longSleeves: false, bareLegs: true },
  { top: 0x1e232c, detail: 0xb43c4e, bottom: 0x11151d, hips: 0, longSleeves: true },
  { top: 0xed6fa5, detail: 0xf9df8f, bottom: 0xed6fa5, hips: 3, longSleeves: false, bareLegs: true },
  { top: 0xf0bd31, detail: 0x2e69b1, bottom: 0x365c91, hips: 1, longSleeves: false, bareLegs: true },
  { top: 0x7143b8, detail: 0xf0c862, bottom: 0x27253e, hips: 0, longSleeves: true },
  { top: 0x3979ae, detail: 0xd8e7f2, bottom: 0x243b60, hips: 0, longSleeves: true },
  { top: 0xe8e5d8, detail: 0x315a9a, bottom: 0x283046, hips: 0, longSleeves: false },
];

const SHOES = [
  { name: "ベーシック", emoji: "👟", price: 0, color: 0x343943 },
  { name: "ランナー", emoji: "🏃", price: 500, color: 0xf1f3f6 },
  { name: "ハイカット", emoji: "👟", price: 800, color: 0xd82f3c },
  { name: "ブーツ", emoji: "🥾", price: 1200, color: 0x8b4b25 },
  { name: "ローファー", emoji: "👞", price: 1000, color: 0x3b2118 },
];

const runtime = {
  ready: false,
  error: null,
  handle: null,
  geometries: new Map(),
  catalogInfo: null,
  atlasTexture: null,
  atlasError: null,
  playerRoot: null,
  playerParts: null,
  playerMaterials: null,
  playerAnimation: "idle",
  playerSpeed: 0,
  appearanceSignature: "",
  legacyPlayerChildren: [],
  legacyPlayerVisibility: new Map(),
  legacyNpcVisibility: new Map(),
  crowdRoot: null,
  npcMaterial: null,
  npcBuckets: new Map(),
  npcAppearances: [],
  npcColorsInitialized: false,
  visibleNpcCount: 0,
  renderedNpcSlots: 0,
  activeNpcBuckets: 0,
  unregisterBeforeRender: null,
  modalObserver: null,
  previousShoeActions: null,
  toastTimer: 0,
  lastFrameTime: 0,
  playerWorldPosition: null,
  lastPlayerPosition: null,
  walkPhase: 0,
};

window.__voxcelCharacters = {
  ready: false,
  getState: () => publicState(),
};

function waitForRuntime() {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const handle = window.__voxcelPlayer;
      const enhancements = window.__voxcelEnhancements;
      if (
        handle?.scene &&
        handle?.playerRoot &&
        handle?.camera &&
        handle?.renderer &&
        handle?.state &&
        Array.isArray(handle?.pedestrians) &&
        typeof enhancements?.registerBeforeRender === "function"
      ) {
        window.clearInterval(timer);
        resolve({ handle, enhancements });
        return;
      }
      if (performance.now() - startedAt > 20000) {
        window.clearInterval(timer);
        reject(new Error("Timed out waiting for the Voxcel City character runtime"));
      }
    }, 40);
  });
}

function findPrototypeConstructor(object, methodName) {
  let prototype = Object.getPrototypeOf(object);
  while (prototype) {
    if (Object.prototype.hasOwnProperty.call(prototype, methodName)) return prototype.constructor;
    prototype = Object.getPrototypeOf(prototype);
  }
  return null;
}

function resolveCoreThree(handle) {
  let sampleMesh = null;
  let standardMaterial = null;
  let textureReference = null;
  handle.scene.traverse((object) => {
    if (!sampleMesh && object.isMesh && object.geometry?.getAttribute?.("position")) {
      sampleMesh = object;
    }
    const materials = object.isMesh
      ? (Array.isArray(object.material) ? object.material : [object.material])
      : [];
    for (const material of materials) {
      if (!standardMaterial && material?.type === "MeshStandardMaterial" && material.color) {
        standardMaterial = material;
      }
      if (!textureReference && material?.map?.transformUv) textureReference = material.map;
    }
  });

  const position = sampleMesh?.geometry?.getAttribute?.("position");
  const BufferGeometry = sampleMesh
    ? findPrototypeConstructor(sampleMesh.geometry, "setAttribute")
    : null;
  const BufferAttribute = position ? findPrototypeConstructor(position, "setUsage") : null;
  const Texture = textureReference
    ? findPrototypeConstructor(textureReference, "transformUv")
    : null;
  if (!sampleMesh || !standardMaterial || !BufferGeometry || !BufferAttribute || !Texture) {
    throw new Error("Could not resolve the game's Three.js constructors");
  }

  function markInstancedAttribute(attribute) {
    attribute.isInstancedBufferAttribute = true;
    attribute.meshPerAttribute = 1;
    return attribute;
  }

  class VoxcelInstancedMesh extends sampleMesh.constructor {
    constructor(geometry, material, capacity) {
      super(geometry, material);
      this.type = "InstancedMesh";
      this.isInstancedMesh = true;
      this.instanceMatrix = markInstancedAttribute(
        new BufferAttribute(new Float32Array(capacity * 16), 16),
      );
      this.instanceColor = null;
      this.count = capacity;
      this.boundingBox = null;
      this.boundingSphere = null;
      this.voxcelInstanceCapacity = capacity;
    }

    setMatrixAt(index, matrix) {
      matrix.toArray(this.instanceMatrix.array, index * 16);
    }

    getMatrixAt(index, matrix) {
      matrix.fromArray(this.instanceMatrix.array, index * 16);
    }

    setColorAt(index, color) {
      if (!this.instanceColor) {
        this.instanceColor = markInstancedAttribute(
          new BufferAttribute(new Float32Array(this.voxcelInstanceCapacity * 3), 3),
        );
      }
      color.toArray(this.instanceColor.array, index * 3);
    }

    getColorAt(index, color) {
      if (this.instanceColor) color.fromArray(this.instanceColor.array, index * 3);
    }

    computeBoundingBox() {
      this.boundingBox = this.geometry.boundingBox?.clone() || null;
    }

    computeBoundingSphere() {
      this.boundingSphere = this.geometry.boundingSphere?.clone() || null;
    }

    dispose() {
      this.dispatchEvent({ type: "dispose" });
    }
  }

  return {
    Group: handle.playerRoot.constructor,
    Mesh: sampleMesh.constructor,
    InstancedMesh: VoxcelInstancedMesh,
    MeshStandardMaterial: standardMaterial.constructor,
    BufferGeometry,
    BufferAttribute,
    Matrix4: handle.playerRoot.matrix.constructor,
    Vector3: handle.playerRoot.position.constructor,
    Color: standardMaterial.color.constructor,
    Texture,
    textureReference,
  };
}

function parseGlb(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) {
    throw new Error("Invalid modular character GLB header");
  }
  if (view.getUint32(4, true) !== 2) {
    throw new Error("Modular character GLB must use glTF 2.0");
  }
  if (view.getUint32(8, true) !== arrayBuffer.byteLength) {
    throw new Error("Modular character GLB length does not match its header");
  }

  let json = null;
  let binaryChunk = null;
  let offset = 12;
  while (offset + 8 <= arrayBuffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    if (dataEnd > arrayBuffer.byteLength) throw new Error("Invalid modular character GLB chunk");
    if (chunkType === 0x4e4f534a) {
      const text = new TextDecoder().decode(new Uint8Array(arrayBuffer, dataOffset, chunkLength));
      json = JSON.parse(text.replace(/\0+$/u, ""));
    } else if (chunkType === 0x004e4942) {
      binaryChunk = new Uint8Array(arrayBuffer, dataOffset, chunkLength);
    }
    offset = dataEnd;
  }
  if (!json || !binaryChunk) throw new Error("Modular character GLB is missing JSON or BIN data");
  return { json, binaryChunk };
}

const ACCESSOR_COMPONENTS = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};
const ACCESSOR_ITEM_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(json, binaryChunk, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  const bufferView = accessor && json.bufferViews?.[accessor.bufferView];
  const TypedArray = accessor && ACCESSOR_COMPONENTS[accessor.componentType];
  const itemSize = accessor && ACCESSOR_ITEM_SIZES[accessor.type];
  if (!accessor || !bufferView || !TypedArray || !itemSize || accessor.sparse) {
    throw new Error(`Unsupported modular character accessor: ${accessorIndex}`);
  }
  if (bufferView.byteStride) {
    throw new Error(`Interleaved modular character data is unsupported: ${accessorIndex}`);
  }

  const byteOffset = binaryChunk.byteOffset
    + (bufferView.byteOffset || 0)
    + (accessor.byteOffset || 0);
  const elementCount = accessor.count * itemSize;
  const byteLength = elementCount * TypedArray.BYTES_PER_ELEMENT;
  const binaryEnd = binaryChunk.byteOffset + binaryChunk.byteLength;
  if (byteOffset % TypedArray.BYTES_PER_ELEMENT !== 0 || byteOffset + byteLength > binaryEnd) {
    throw new Error(`Invalid modular character accessor range: ${accessorIndex}`);
  }
  return {
    array: new TypedArray(binaryChunk.buffer, byteOffset, elementCount),
    itemSize,
    normalized: Boolean(accessor.normalized),
  };
}

async function loadGeometryCatalog() {
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Could not load modular character GLB: ${response.status}`);
  const { json, binaryChunk } = parseGlb(await response.arrayBuffer());
  const geometries = new Map();
  const variantSets = new Map();
  let schema = 0;
  let triangleCount = 0;
  let texturedGeometryCount = 0;
  const atlasIds = new Set();

  for (const node of json.nodes || []) {
    if (!node.name?.startsWith("GEO_") || !Number.isInteger(node.mesh)) continue;
    const primitive = json.meshes?.[node.mesh]?.primitives?.[0];
    if (!primitive || (primitive.mode !== undefined && primitive.mode !== 4)) {
      throw new Error(`Unsupported modular character mesh: ${node.name}`);
    }
    const position = readAccessor(json, binaryChunk, primitive.attributes?.POSITION);
    const normal = readAccessor(json, binaryChunk, primitive.attributes?.NORMAL);
    const uv = readAccessor(json, binaryChunk, primitive.attributes?.TEXCOORD_0);
    const index = readAccessor(json, binaryChunk, primitive.indices);
    if (uv.itemSize !== 2 || uv.array.length / uv.itemSize !== position.array.length / position.itemSize) {
      throw new Error(`Invalid modular character UV data: ${node.name}`);
    }
    const geometry = new THREE_CORE.BufferGeometry();
    geometry.name = `${node.name}_geometry`;
    geometry.setAttribute(
      "position",
      new THREE_CORE.BufferAttribute(position.array, position.itemSize, position.normalized),
    );
    geometry.setAttribute(
      "normal",
      new THREE_CORE.BufferAttribute(normal.array, normal.itemSize, normal.normalized),
    );
    geometry.setAttribute(
      "uv",
      new THREE_CORE.BufferAttribute(uv.array, uv.itemSize, uv.normalized),
    );
    geometry.setIndex(new THREE_CORE.BufferAttribute(index.array, 1, index.normalized));
    geometry.userData.voxcelAtlas = node.extras?.voxcel_atlas || null;
    geometry.userData.voxcelAtlasTile = Number(node.extras?.voxcel_atlas_tile);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometries.set(node.name, geometry);

    const semantic = node.extras?.voxcel_semantic;
    const variant = Number(node.extras?.voxcel_variant);
    schema = Math.max(schema, Number(node.extras?.voxcel_schema) || 0);
    if (geometry.userData.voxcelAtlas) atlasIds.add(geometry.userData.voxcelAtlas);
    texturedGeometryCount += 1;
    if (semantic && Number.isInteger(variant) && variant >= 0) {
      if (!variantSets.has(semantic)) variantSets.set(semantic, new Set());
      variantSets.get(semantic).add(variant);
    }
    triangleCount += index.array.length / 3;
  }

  if (geometries.size !== EXPECTED_GEOMETRY_COUNT) {
    throw new Error(
      `Unexpected modular character catalog size: ${geometries.size}/${EXPECTED_GEOMETRY_COUNT}`,
    );
  }

  const requiredNames = [
    "GEO_head",
    "GEO_face_0",
    "GEO_hair_0",
    "GEO_hair_4",
    "GEO_top_0",
    "GEO_top_9",
    "GEO_shoe_0",
    "GEO_shoe_4",
  ];
  for (const name of requiredNames) {
    if (!geometries.has(name)) throw new Error(`Missing modular character part: ${name}`);
  }

  const variantCounts = {};
  for (const [semantic, variants] of variantSets) variantCounts[semantic] = variants.size;

  return {
    geometries,
    info: {
      schema,
      geometryCount: geometries.size,
      triangleCount: Math.round(triangleCount),
      texturedGeometryCount,
      atlas: atlasIds.size === 1 ? [...atlasIds][0] : null,
      variantCounts,
    },
  };
}

function makeMaterial(color) {
  return new THREE_CORE.MeshStandardMaterial({
    color,
    map: runtime.atlasTexture,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
  });
}

function createPlayerMesh(partName, material, label = partName) {
  const geometry = runtime.geometries.get(partName);
  if (!geometry) throw new Error(`Player part geometry not found: ${partName}`);
  const mesh = new THREE_CORE.Mesh(geometry, material);
  mesh.name = `VoxcelPlayer_${label}`;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.voxcelCharacterPart = true;
  mesh.userData.geometryName = partName;
  mesh.userData.semantic = partName.split("_")[1] || partName;
  return mesh;
}

function createJoint(name, position, parent) {
  const joint = new THREE_CORE.Group();
  joint.name = name;
  joint.position.copy(position);
  parent.add(joint);
  return joint;
}

function addVariants(parent, prefix, count, material, semantic) {
  const variants = [];
  for (let index = 0; index < count; index += 1) {
    const mesh = createPlayerMesh(`${prefix}${index}`, material, `${semantic}_${index}`);
    mesh.userData.semantic = semantic;
    mesh.userData.variant = index;
    mesh.visible = false;
    parent.add(mesh);
    variants.push(mesh);
  }
  return variants;
}

function buildPlayer() {
  const handle = runtime.handle;
  const materials = {
    skin: makeMaterial(SKIN_COLORS[0]),
    face: makeMaterial(0x1c2230),
    hair: makeMaterial(HAIR_COLORS[0]),
    top: makeMaterial(OUTFITS[0].top),
    detail: makeMaterial(OUTFITS[0].detail),
    bottom: makeMaterial(OUTFITS[0].bottom),
    shoes: makeMaterial(SHOES[0].color),
  };

  const avatar = new THREE_CORE.Group();
  avatar.name = "VoxcelModularPlayer";
  avatar.position.y = CHARACTER_Y_OFFSET;
  avatar.scale.setScalar(CHARACTER_SCALE);
  avatar.userData.voxcelReplacement = true;
  avatar.userData.voxcelCharacterRoot = true;
  avatar.userData.collisionMode = "none";

  const parts = {
    meshes: [],
    tops: addVariants(avatar, "GEO_top_", 10, materials.top, "top"),
    details: addVariants(avatar, "GEO_detail_", 10, materials.detail, "top_detail"),
    hips: addVariants(avatar, "GEO_hips_", 4, materials.bottom, "hips"),
    faces: [],
    hairs: [],
    shoes: [[], []],
    shoulders: [],
    elbows: [],
    hipsJoints: [],
    knees: [],
    upperArms: [],
    forearms: [],
    hands: [],
    thighs: [],
    shins: [],
  };

  const neck = createPlayerMesh("GEO_neck", materials.skin, "neck");
  neck.userData.semantic = "neck";
  neck.position.y = 1.54;
  avatar.add(neck);

  const headJoint = createJoint(
    "VoxcelPlayer_HeadJoint",
    new THREE_CORE.Vector3(0, 1.62, 0),
    avatar,
  );
  const head = createPlayerMesh("GEO_head", materials.skin, "head");
  head.userData.semantic = "head";
  headJoint.add(head);
  parts.faces = addVariants(headJoint, "GEO_face_", 3, materials.face, "face");
  parts.hairs = addVariants(headJoint, "GEO_hair_", 5, materials.hair, "hair");

  for (const [sideIndex, side] of ["left", "right"].entries()) {
    const direction = sideIndex === 0 ? -1 : 1;
    const shoulder = createJoint(
      `VoxcelPlayer_${side}_shoulder`,
      new THREE_CORE.Vector3(direction * 0.48, 1.48, 0),
      avatar,
    );
    const upperArm = createPlayerMesh("GEO_upper_arm", materials.top, `${side}_upper_arm`);
    upperArm.userData.semantic = "upper_arm";
    shoulder.add(upperArm);
    const elbow = createJoint(
      `VoxcelPlayer_${side}_elbow`,
      new THREE_CORE.Vector3(0, -0.48, 0),
      shoulder,
    );
    const forearm = createPlayerMesh("GEO_forearm", materials.skin, `${side}_forearm`);
    forearm.userData.semantic = "forearm";
    elbow.add(forearm);
    const wrist = createJoint(
      `VoxcelPlayer_${side}_wrist`,
      new THREE_CORE.Vector3(0, -0.4, 0),
      elbow,
    );
    const hand = createPlayerMesh("GEO_hand", materials.skin, `${side}_hand`);
    hand.userData.semantic = "hand";
    wrist.add(hand);

    parts.shoulders.push(shoulder);
    parts.elbows.push(elbow);
    parts.upperArms.push(upperArm);
    parts.forearms.push(forearm);
    parts.hands.push(hand);
  }

  for (const [sideIndex, side] of ["left", "right"].entries()) {
    const direction = sideIndex === 0 ? -1 : 1;
    const hip = createJoint(
      `VoxcelPlayer_${side}_hip`,
      new THREE_CORE.Vector3(direction * 0.2, 1.02, 0),
      avatar,
    );
    const thigh = createPlayerMesh("GEO_thigh", materials.bottom, `${side}_thigh`);
    thigh.userData.semantic = "thigh";
    hip.add(thigh);
    const knee = createJoint(
      `VoxcelPlayer_${side}_knee`,
      new THREE_CORE.Vector3(0, -0.43, 0),
      hip,
    );
    const shin = createPlayerMesh("GEO_shin", materials.bottom, `${side}_shin`);
    shin.userData.semantic = "shin";
    knee.add(shin);
    const ankle = createJoint(
      `VoxcelPlayer_${side}_ankle`,
      new THREE_CORE.Vector3(0, -0.41, 0),
      knee,
    );
    parts.shoes[sideIndex] = addVariants(
      ankle,
      "GEO_shoe_",
      5,
      materials.shoes,
      `shoe_${side}`,
    );
    for (const shoe of parts.shoes[sideIndex]) shoe.userData.semantic = "shoe";

    parts.hipsJoints.push(hip);
    parts.knees.push(knee);
    parts.thighs.push(thigh);
    parts.shins.push(shin);
  }

  avatar.traverse((object) => {
    if (object.isMesh) parts.meshes.push(object);
  });

  runtime.legacyPlayerChildren = [...handle.playerRoot.children];
  runtime.legacyPlayerVisibility.clear();
  for (const child of runtime.legacyPlayerChildren) {
    runtime.legacyPlayerVisibility.set(child, child.visible);
  }
  handle.playerRoot.add(avatar);
  runtime.playerRoot = avatar;
  runtime.playerParts = parts;
  runtime.playerMaterials = materials;

  handle.playerRoot.updateWorldMatrix(true, false);
  runtime.lastPlayerPosition.copy(handle.playerRoot.getWorldPosition(runtime.playerWorldPosition));
  hideLegacyPlayer();
  applyPlayerAppearance(true);
}

function normalizeAppearanceState() {
  const state = runtime.handle.state;
  if (!Number.isInteger(state.shoe) || state.shoe < 0 || state.shoe >= SHOES.length) state.shoe = 0;
  const owned = Array.isArray(state.ownShoes) ? state.ownShoes : [];
  state.ownShoes = [...new Set([0, ...owned])].filter(
    (id) => Number.isInteger(id) && id >= 0 && id < SHOES.length,
  );
  if (!state.ownShoes.includes(state.shoe)) state.shoe = 0;
}

function hideLegacyPlayer() {
  for (const child of runtime.legacyPlayerChildren) child.visible = false;
}

function setOnlyVariant(variants, activeIndex) {
  for (let index = 0; index < variants.length; index += 1) {
    variants[index].visible = index === activeIndex;
  }
}

function applyPlayerAppearance(force = false) {
  if (!runtime.playerRoot) return;
  normalizeAppearanceState();
  const state = runtime.handle.state;
  const hairId = clamp(Number(state.hair) || 0, 0, 4);
  const hairColorId = clamp(Number(state.hairC) || 0, 0, HAIR_COLORS.length - 1);
  const outfitId = clamp(Number(state.outfit) || 0, 0, OUTFITS.length - 1);
  const shoeId = clamp(Number(state.shoe) || 0, 0, SHOES.length - 1);
  const signature = `${hairId}:${hairColorId}:${outfitId}:${shoeId}`;
  if (!force && signature === runtime.appearanceSignature) return;

  const outfit = OUTFITS[outfitId];
  const parts = runtime.playerParts;
  const materials = runtime.playerMaterials;
  materials.hair.color.setHex(HAIR_COLORS[hairColorId]);
  materials.top.color.setHex(outfit.top);
  materials.detail.color.setHex(outfit.detail);
  materials.bottom.color.setHex(outfit.bottom);
  materials.shoes.color.setHex(SHOES[shoeId].color);

  setOnlyVariant(parts.tops, outfitId);
  setOnlyVariant(parts.details, outfitId);
  setOnlyVariant(parts.hips, outfit.hips);
  setOnlyVariant(parts.faces, 0);
  setOnlyVariant(parts.hairs, hairId);
  setOnlyVariant(parts.shoes[0], shoeId);
  setOnlyVariant(parts.shoes[1], shoeId);

  for (const upperArm of parts.upperArms) upperArm.material = materials.top;
  for (const forearm of parts.forearms) {
    forearm.material = outfit.longSleeves ? materials.top : materials.skin;
  }
  for (const thigh of parts.thighs) {
    thigh.material = outfit.bareLegs ? materials.skin : materials.bottom;
  }
  for (const shin of parts.shins) {
    shin.material = outfit.bareLegs ? materials.skin : materials.bottom;
  }

  parts.hips[outfit.hips].material = outfit.hips >= 2 ? materials.top : materials.bottom;
  runtime.appearanceSignature = signature;
}

function animatePlayer(now) {
  const root = runtime.handle.playerRoot;
  const parts = runtime.playerParts;
  if (!root || !parts) return;

  const currentPosition = root.getWorldPosition(runtime.playerWorldPosition);
  const dt = runtime.lastFrameTime
    ? clamp((now - runtime.lastFrameTime) / 1000, 0.001, 0.05)
    : 1 / 60;
  const speed = currentPosition.distanceTo(runtime.lastPlayerPosition) / dt;
  runtime.lastFrameTime = now;
  runtime.lastPlayerPosition.copy(currentPosition);
  runtime.playerSpeed = Number.isFinite(speed) ? speed : 0;

  const moving = speed > 0.18 && speed < 45;
  const running = moving && speed > 12;
  runtime.playerAnimation = running ? "run" : moving ? "walk" : "idle";
  const targetAmplitude = running ? 0.82 : moving ? 0.52 : 0;
  runtime.walkPhase += dt * (running ? 11 : moving ? 7.5 : 3.5);
  const swing = Math.sin(runtime.walkPhase) * targetAmplitude;
  const bob = moving ? Math.abs(Math.sin(runtime.walkPhase * 2)) * 0.025 : 0;

  parts.shoulders[0].rotation.x = lerp(parts.shoulders[0].rotation.x, -swing, 0.42);
  parts.shoulders[1].rotation.x = lerp(parts.shoulders[1].rotation.x, swing, 0.42);
  parts.hipsJoints[0].rotation.x = lerp(parts.hipsJoints[0].rotation.x, swing, 0.48);
  parts.hipsJoints[1].rotation.x = lerp(parts.hipsJoints[1].rotation.x, -swing, 0.48);
  parts.elbows[0].rotation.x = Math.max(0, swing) * 0.18;
  parts.elbows[1].rotation.x = Math.max(0, -swing) * 0.18;
  parts.knees[0].rotation.x = Math.max(0, -swing) * 0.5;
  parts.knees[1].rotation.x = Math.max(0, swing) * 0.5;
  runtime.playerRoot.position.y = CHARACTER_Y_OFFSET + bob;
}

function makeNpcAppearance(index) {
  const hair = (index * 3 + 1) % 5;
  const outfit = (index * 7 + 3) % 10;
  const shoe = (index * 2 + 1) % 5;
  const face = index % 3;
  const skin = (index * 3 + 1) % SKIN_COLORS.length;
  const hairColor = (index * 5 + 2) % HAIR_COLORS.length;
  return {
    id: index,
    hair,
    outfit,
    shoe,
    face,
    skin,
    hairColor,
    signature: `${hair}:${outfit}:${shoe}:${face}:${skin}:${hairColor}`,
  };
}

function hideLegacyNpcVisuals(pedestrian, index) {
  pedestrian.g.userData.voxcelPedestrian = true;
  pedestrian.g.userData.voxcelPedestrianId = index;
  pedestrian.g.traverse((object) => {
    if (!object.isMesh) return;
    if (!runtime.legacyNpcVisibility.has(object)) {
      runtime.legacyNpcVisibility.set(object, object.visible);
    }
    object.visible = false;
  });
}

function buildCrowd() {
  const crowdRoot = new THREE_CORE.Group();
  crowdRoot.name = "VoxcelModularCrowd";
  crowdRoot.userData.voxcelCrowdRoot = true;
  crowdRoot.userData.collisionMode = "none";
  const material = makeMaterial(0xffffff);

  for (const [name, geometry] of runtime.geometries) {
    const mesh = new THREE_CORE.InstancedMesh(geometry, material, INSTANCE_CAPACITY);
    mesh.name = `VoxcelNPC_${name}`;
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(DYNAMIC_DRAW_USAGE);
    mesh.userData.voxcelNpcPart = name;
    mesh.userData.collisionMode = "none";
    crowdRoot.add(mesh);
    runtime.npcBuckets.set(name, { mesh, cursor: 0, previousCount: 0 });
  }

  runtime.handle.scene.add(crowdRoot);
  runtime.crowdRoot = crowdRoot;
  runtime.npcMaterial = material;
  runtime.npcColorsInitialized = false;
  runtime.npcAppearances = runtime.handle.pedestrians.map((_, index) => makeNpcAppearance(index));
  runtime.handle.pedestrians.forEach(hideLegacyNpcVisuals);
}

let npcBaseOffset = null;
let npcColor = null;
let npcBaseWorld = null;
let npcLocal = null;
let npcJointA = null;
let npcJointB = null;
let npcJointC = null;
let npcOutput = null;

function initializeScratchObjects() {
  runtime.playerWorldPosition = new THREE_CORE.Vector3();
  runtime.lastPlayerPosition = new THREE_CORE.Vector3();
  npcBaseOffset = new THREE_CORE.Matrix4()
    .makeTranslation(0, CHARACTER_Y_OFFSET, 0)
    .scale(new THREE_CORE.Vector3(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE));
  npcColor = new THREE_CORE.Color();
  npcBaseWorld = new THREE_CORE.Matrix4();
  npcLocal = new THREE_CORE.Matrix4();
  npcJointA = new THREE_CORE.Matrix4();
  npcJointB = new THREE_CORE.Matrix4();
  npcJointC = new THREE_CORE.Matrix4();
  npcOutput = new THREE_CORE.Matrix4();
}

function makeLocalTransform(target, x, y, z, rotationX = 0) {
  target.makeRotationX(rotationX);
  target.setPosition(x, y, z);
  return target;
}

function addNpcInstance(name, matrix, color, writeColor) {
  const bucket = runtime.npcBuckets.get(name);
  if (!bucket || bucket.cursor >= INSTANCE_CAPACITY) return;
  bucket.mesh.setMatrixAt(bucket.cursor, matrix);
  if (writeColor) bucket.mesh.setColorAt(bucket.cursor, npcColor.setHex(color));
  bucket.cursor += 1;
}

function addNpcJointChain(pedestrian, appearance, outfit, sideIndex, baseWorld, writeColors) {
  const side = sideIndex === 0 ? -1 : 1;
  const armSource = sideIndex === 0 ? pedestrian.al : pedestrian.ar;
  const legSource = sideIndex === 0 ? pedestrian.ll : pedestrian.rl;
  const armAngle = Number(armSource?.rotation?.x) || 0;
  const legAngle = Number(legSource?.rotation?.x) || 0;
  const skinColor = SKIN_COLORS[appearance.skin];

  makeLocalTransform(npcLocal, side * 0.48, 1.48, 0, armAngle);
  npcJointA.multiplyMatrices(baseWorld, npcLocal);
  addNpcInstance("GEO_upper_arm", npcJointA, outfit.top, writeColors);
  makeLocalTransform(npcLocal, 0, -0.48, 0, Math.max(0, -armAngle) * 0.16);
  npcJointB.multiplyMatrices(npcJointA, npcLocal);
  addNpcInstance(
    "GEO_forearm",
    npcJointB,
    outfit.longSleeves ? outfit.top : skinColor,
    writeColors,
  );
  makeLocalTransform(npcLocal, 0, -0.4, 0);
  npcJointC.multiplyMatrices(npcJointB, npcLocal);
  addNpcInstance("GEO_hand", npcJointC, skinColor, writeColors);

  makeLocalTransform(npcLocal, side * 0.2, 1.02, 0, legAngle);
  npcJointA.multiplyMatrices(baseWorld, npcLocal);
  addNpcInstance(
    "GEO_thigh",
    npcJointA,
    outfit.bareLegs ? skinColor : outfit.bottom,
    writeColors,
  );
  makeLocalTransform(npcLocal, 0, -0.43, 0, Math.max(0, -legAngle) * 0.5);
  npcJointB.multiplyMatrices(npcJointA, npcLocal);
  addNpcInstance(
    "GEO_shin",
    npcJointB,
    outfit.bareLegs ? skinColor : outfit.bottom,
    writeColors,
  );
  makeLocalTransform(npcLocal, 0, -0.41, 0);
  npcJointC.multiplyMatrices(npcJointB, npcLocal);
  addNpcInstance(
    `GEO_shoe_${appearance.shoe}`,
    npcJointC,
    SHOES[appearance.shoe].color,
    writeColors,
  );
}

function updateCrowd() {
  for (const bucket of runtime.npcBuckets.values()) bucket.cursor = 0;

  const pedestrians = runtime.handle.pedestrians;
  if (runtime.npcAppearances.length !== pedestrians.length) {
    runtime.npcAppearances = pedestrians.map((_, index) => makeNpcAppearance(index));
    pedestrians.forEach(hideLegacyNpcVisuals);
    runtime.npcColorsInitialized = false;
  }
  const writeColors = !runtime.npcColorsInitialized;
  runtime.visibleNpcCount = pedestrians.length;
  for (let index = 0; index < pedestrians.length; index += 1) {
    const pedestrian = pedestrians[index];
    const appearance = runtime.npcAppearances[index];
    const outfit = OUTFITS[appearance.outfit];
    const skinColor = SKIN_COLORS[appearance.skin];
    pedestrian.g.updateWorldMatrix(true, false);
    npcBaseWorld.multiplyMatrices(pedestrian.g.matrixWorld, npcBaseOffset);

    addNpcInstance(`GEO_top_${appearance.outfit}`, npcBaseWorld, outfit.top, writeColors);
    addNpcInstance(`GEO_detail_${appearance.outfit}`, npcBaseWorld, outfit.detail, writeColors);
    addNpcInstance(
      `GEO_hips_${outfit.hips}`,
      npcBaseWorld,
      outfit.hips >= 2 ? outfit.top : outfit.bottom,
      writeColors,
    );

    makeLocalTransform(npcLocal, 0, 1.54, 0);
    npcOutput.multiplyMatrices(npcBaseWorld, npcLocal);
    addNpcInstance("GEO_neck", npcOutput, skinColor, writeColors);
    makeLocalTransform(npcLocal, 0, 1.62, 0);
    npcOutput.multiplyMatrices(npcBaseWorld, npcLocal);
    addNpcInstance("GEO_head", npcOutput, skinColor, writeColors);
    addNpcInstance(`GEO_face_${appearance.face}`, npcOutput, 0x1b2230, writeColors);
    addNpcInstance(
      `GEO_hair_${appearance.hair}`,
      npcOutput,
      HAIR_COLORS[appearance.hairColor],
      writeColors,
    );

    addNpcJointChain(pedestrian, appearance, outfit, 0, npcBaseWorld, writeColors);
    addNpcJointChain(pedestrian, appearance, outfit, 1, npcBaseWorld, writeColors);
  }

  let renderedSlots = 0;
  let activeBuckets = 0;
  for (const bucket of runtime.npcBuckets.values()) {
    bucket.mesh.count = bucket.cursor;
    if (bucket.cursor > 0 || bucket.previousCount > 0) {
      bucket.mesh.instanceMatrix.needsUpdate = true;
      if (writeColors && bucket.mesh.instanceColor) bucket.mesh.instanceColor.needsUpdate = true;
    }
    if (bucket.cursor > 0) activeBuckets += 1;
    renderedSlots += bucket.cursor;
    bucket.previousCount = bucket.cursor;
  }
  runtime.renderedNpcSlots = renderedSlots;
  runtime.activeNpcBuckets = activeBuckets;
  runtime.npcColorsInitialized = true;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(runtime.toastTimer);
  runtime.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2000);
}

function updateMoneyHud() {
  const money = document.getElementById("hM");
  if (money) money.textContent = `${runtime.handle.state.money.toLocaleString()}円`;
}

function buyOrWearShoe(id) {
  const state = runtime.handle.state;
  normalizeAppearanceState();
  const shoe = SHOES[id];
  if (!shoe) return false;
  if (!state.ownShoes.includes(id)) {
    if (state.money < shoe.price) {
      showToast("💸 お金が足りません");
      return false;
    }
    state.money -= shoe.price;
    state.ownShoes.push(id);
    updateMoneyHud();
    showToast(`${shoe.emoji} ${shoe.name}を購入！`);
  } else {
    showToast(`${shoe.emoji} ${shoe.name}に履き替え！`);
  }
  state.shoe = id;
  applyPlayerAppearance(true);
  refreshShoeGrid();
  return true;
}

function wearOwnedShoe(id) {
  const state = runtime.handle.state;
  normalizeAppearanceState();
  if (!state.ownShoes.includes(id)) return false;
  state.shoe = id;
  showToast(`${SHOES[id].emoji} ${SHOES[id].name}に履き替え！`);
  applyPlayerAppearance(true);
  refreshShoeGrid();
  return true;
}

function renderShoeCards(grid, shopMode) {
  const state = runtime.handle.state;
  const focusedShoeId = grid.contains(document.activeElement)
    ? document.activeElement?.dataset?.optionId
    : null;
  grid.replaceChildren();
  const ids = shopMode ? SHOES.map((_, index) => index) : state.ownShoes;
  for (const id of ids) {
    const shoe = SHOES[id];
    const owned = state.ownShoes.includes(id);
    const selected = state.shoe === id;
    const card = document.createElement("div");
    card.className = `ic${selected ? " sel" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", String(selected));
    card.dataset.optionKind = "shoe";
    card.dataset.optionId = String(id);
    card.innerHTML = [
      `<div class="ii">${shoe.emoji}</div>`,
      `<div class="nm">${shoe.name}</div>`,
      owned
        ? `<div class="ow">${selected ? "👟着用" : "所持"}</div>`
        : `<div class="pr">${shoe.price}円</div>`,
    ].join("");
    const activate = () => (shopMode ? buyOrWearShoe(id) : wearOwnedShoe(id));
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
    grid.append(card);
  }
  if (focusedShoeId !== null) {
    grid.querySelector(`[data-option-id="${focusedShoeId}"]`)?.focus({ preventScroll: true });
  }
}

function enhanceModalAccessibility(modal) {
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  const heading = modal.querySelector(":scope > h2");
  if (heading) {
    heading.id ||= "voxcelModalTitle";
    modal.setAttribute("aria-labelledby", heading.id);
  }

  for (const card of modal.querySelectorAll(".ic[onclick]")) {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", String(card.classList.contains("sel")));
    if (card.dataset.voxcelKeyboard === "true") continue;
    card.dataset.voxcelKeyboard = "true";
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      card.click();
    });
  }

  window.requestAnimationFrame(() => {
    if (!modal.closest(".mo.show") || modal.contains(document.activeElement)) return;
    const focusTarget = modal.querySelector('.ic.sel[role="button"], .ic[role="button"], button');
    focusTarget?.focus({ preventScroll: true });
  });
}

function augmentClothingModal() {
  const modal = document.getElementById("mC");
  if (!modal) return;
  enhanceModalAccessibility(modal);
  if (modal.querySelector("[data-voxcel-shoes]")) return;
  const directChildren = [...modal.children];
  const clothingGrid = directChildren.find(
    (element) => element.matches?.(".ig") && element.querySelector('.ic[onclick^="W._cloth("]'),
  );
  const closetGrid = directChildren.find(
    (element) => element.matches?.(".ig") && element.querySelector('.ic[onclick^="W._wearC("]'),
  );
  if (!clothingGrid && !closetGrid) return;

  const section = document.createElement("section");
  section.dataset.voxcelShoes = "true";
  section.innerHTML = '<h3>👟 靴</h3><div class="ig" data-voxcel-shoe-grid></div>';
  const closeRow = directChildren.find((element) => element.matches?.(".br"));
  if (closeRow) closeRow.before(section);
  else modal.append(section);
  const grid = section.querySelector("[data-voxcel-shoe-grid]");
  grid.dataset.shopMode = clothingGrid ? "true" : "false";
  renderShoeCards(grid, Boolean(clothingGrid));
}

function refreshShoeGrid() {
  const grid = document.querySelector("#mC [data-voxcel-shoe-grid]");
  if (!grid) return;
  renderShoeCards(grid, grid.dataset.shopMode === "true");
}

function installShoeUi() {
  normalizeAppearanceState();
  runtime.previousShoeActions = {
    shoe: window.W._shoe,
    wearShoe: window.W._wearShoe,
  };
  window.W._shoe = buyOrWearShoe;
  window.W._wearShoe = wearOwnedShoe;
  const modal = document.getElementById("mC");
  if (!modal) return;
  runtime.modalObserver = new MutationObserver(augmentClothingModal);
  runtime.modalObserver.observe(modal, { childList: true, subtree: false });
  augmentClothingModal();
}

function updateFrame(now) {
  if (!runtime.ready) return;
  hideLegacyPlayer();
  applyPlayerAppearance();
  animatePlayer(now);
  updateCrowd();
}

function legacyNpcVisualsHidden() {
  const pedestrians = runtime.handle?.pedestrians || [];
  if (!pedestrians.length) return false;
  for (const pedestrian of pedestrians) {
    let hidden = true;
    pedestrian.g.traverse((object) => {
      if (object.isMesh && object.visible) hidden = false;
    });
    if (!hidden) return false;
  }
  return true;
}

function countVisiblePlayerParts() {
  const partCounts = {};
  const visibleNames = [];
  let visibleMeshCount = 0;
  for (const mesh of runtime.playerParts?.meshes || []) {
    if (!mesh.visible) continue;
    visibleMeshCount += 1;
    const semantic = mesh.userData.semantic || "unknown";
    partCounts[semantic] = (partCounts[semantic] || 0) + 1;
    visibleNames.push(mesh.userData.geometryName);
  }
  return { partCounts, visibleNames, visibleMeshCount };
}

function uniqueCount(values) {
  return new Set(values).size;
}

function publicState() {
  const state = runtime.handle?.state;
  const hookError = runtime.unregisterBeforeRender?.error;
  const playerVisible = countVisiblePlayerParts();
  const playerGeometryIds = new Set(
    (runtime.playerParts?.meshes || []).map((mesh) => mesh.geometry.uuid),
  );
  const npcGeometryIds = new Set(
    [...runtime.npcBuckets.values()].map((bucket) => bucket.mesh.geometry.uuid),
  );
  const sharedGeometryCount = [...playerGeometryIds].filter((id) => npcGeometryIds.has(id)).length;
  const rootCount = runtime.handle?.playerRoot
    ? runtime.handle.playerRoot.children.filter((child) => child.userData?.voxcelCharacterRoot).length
    : 0;

  return {
    ready: runtime.ready,
    error: runtime.error || (hookError instanceof Error ? hookError.message : hookError || null),
    hookRegistered: Boolean(runtime.unregisterBeforeRender?.active),
    catalog: runtime.catalogInfo,
    atlas: {
      ready: Boolean(runtime.atlasTexture),
      error: runtime.atlasError,
      textureUuid: runtime.atlasTexture?.uuid || null,
    },
    player: {
      mounted: Boolean(runtime.playerRoot),
      attached: Boolean(
        runtime.playerRoot && runtime.handle && runtime.playerRoot.parent === runtime.handle.playerRoot,
      ),
      rootCount,
      visibleMeshCount: playerVisible.visibleMeshCount,
      visibleParts: playerVisible.visibleNames,
      partCounts: playerVisible.partCounts,
      appearance: {
        hairId: Number(state?.hair) || 0,
        hairColorId: Number(state?.hairC) || 0,
        outfitId: Number(state?.outfit) || 0,
        shoeId: Number(state?.shoe) || 0,
        ownedShoes: [...(state?.ownShoes || [0])],
      },
      animation: runtime.playerAnimation,
      speed: Math.round(runtime.playerSpeed * 100) / 100,
      scale: CHARACTER_SCALE,
    },
    npcs: {
      count: runtime.npcAppearances.length,
      scale: CHARACTER_SCALE,
      visibleCount: runtime.visibleNpcCount,
      legacyVisualsHidden: legacyNpcVisualsHidden(),
      appearances: runtime.npcAppearances.map((appearance) => ({ ...appearance })),
      appearanceSignatures: runtime.npcAppearances.map((appearance) => appearance.signature),
      distinctSignatures: uniqueCount(runtime.npcAppearances.map((appearance) => appearance.signature)),
      variantCounts: {
        hair: uniqueCount(runtime.npcAppearances.map((appearance) => appearance.hair)),
        face: uniqueCount(runtime.npcAppearances.map((appearance) => appearance.face)),
        outfit: uniqueCount(runtime.npcAppearances.map((appearance) => appearance.outfit)),
        shoe: uniqueCount(runtime.npcAppearances.map((appearance) => appearance.shoe)),
      },
      instancedBucketCount: runtime.activeNpcBuckets,
      renderedSlots: runtime.renderedNpcSlots,
    },
    resources: {
      catalogGeometries: runtime.geometries.size,
      playerGeometries: playerGeometryIds.size,
      npcGeometries: npcGeometryIds.size,
      sharedGeometryCount,
      npcMaterials: runtime.npcMaterial ? 1 : 0,
      npcTextures: runtime.npcMaterial?.map ? 1 : 0,
      sharedAtlasTexture: runtime.atlasTexture?.uuid || null,
      npcMeshSlots: runtime.renderedNpcSlots,
      drawCallUpperBound: runtime.activeNpcBuckets,
    },
  };
}

function dispose() {
  runtime.unregisterBeforeRender?.();
  runtime.unregisterBeforeRender = null;
  runtime.modalObserver?.disconnect();
  runtime.modalObserver = null;
  window.clearTimeout(runtime.toastTimer);
  runtime.toastTimer = 0;

  document.querySelector("#mC [data-voxcel-shoes]")?.remove();
  if (runtime.previousShoeActions && window.W) {
    if (window.W._shoe === buyOrWearShoe) {
      if (runtime.previousShoeActions.shoe === undefined) delete window.W._shoe;
      else window.W._shoe = runtime.previousShoeActions.shoe;
    }
    if (window.W._wearShoe === wearOwnedShoe) {
      if (runtime.previousShoeActions.wearShoe === undefined) delete window.W._wearShoe;
      else window.W._wearShoe = runtime.previousShoeActions.wearShoe;
    }
  }
  runtime.previousShoeActions = null;

  runtime.playerRoot?.removeFromParent();
  runtime.crowdRoot?.removeFromParent();
  for (const [child, visible] of runtime.legacyPlayerVisibility) child.visible = visible;
  for (const [mesh, visible] of runtime.legacyNpcVisibility) mesh.visible = visible;

  for (const bucket of runtime.npcBuckets.values()) {
    bucket.mesh.dispose();
  }
  for (const material of new Set(Object.values(runtime.playerMaterials || {}))) material.dispose();
  runtime.npcMaterial?.dispose();
  for (const geometry of new Set(runtime.geometries.values())) geometry.dispose();

  runtime.geometries.clear();
  runtime.npcBuckets.clear();
  runtime.legacyPlayerVisibility.clear();
  runtime.legacyNpcVisibility.clear();
  runtime.legacyPlayerChildren = [];
  runtime.playerRoot = null;
  runtime.playerParts = null;
  runtime.playerMaterials = null;
  runtime.crowdRoot = null;
  runtime.npcMaterial = null;
  runtime.npcAppearances = [];
  runtime.npcColorsInitialized = false;
  runtime.visibleNpcCount = 0;
  runtime.renderedNpcSlots = 0;
  runtime.activeNpcBuckets = 0;
  runtime.catalogInfo = null;
  runtime.atlasTexture = null;
  runtime.atlasError = null;
  runtime.appearanceSignature = "";
  runtime.lastFrameTime = 0;
  runtime.playerWorldPosition = null;
  runtime.lastPlayerPosition = null;
  runtime.handle = null;
  npcBaseOffset = null;
  npcColor = null;
  npcBaseWorld = null;
  npcLocal = null;
  npcJointA = null;
  npcJointB = null;
  npcJointC = null;
  npcOutput = null;
  THREE_CORE = null;
  runtime.ready = false;
  window.__voxcelCharacters = {
    ready: false,
    error: runtime.error,
    getState: publicState,
  };
}

async function initialize() {
  const { handle, enhancements } = await waitForRuntime();
  runtime.handle = handle;
  THREE_CORE = resolveCoreThree(handle);
  const atlasApi = window.__voxcelTextureAtlas;
  if (atlasApi?.getTexture) {
    try {
      runtime.atlasTexture = await atlasApi.getTexture({
        TextureConstructor: THREE_CORE.Texture,
        referenceTexture: THREE_CORE.textureReference,
        renderer: handle.renderer,
      });
    } catch (error) {
      runtime.atlasError = error instanceof Error ? error.message : String(error);
      console.warn("Voxcel character atlas could not be loaded; using solid colors.", error);
    }
  } else {
    runtime.atlasError = "texture-atlas-runtime-unavailable";
    console.warn("Voxcel character atlas runtime is unavailable; using solid colors.");
  }
  initializeScratchObjects();
  const catalog = await loadGeometryCatalog();
  runtime.geometries = catalog.geometries;
  runtime.catalogInfo = catalog.info;
  normalizeAppearanceState();
  buildPlayer();
  buildCrowd();
  installShoeUi();
  runtime.ready = true;
  runtime.unregisterBeforeRender = enhancements.registerBeforeRender(updateFrame);
  updateFrame(performance.now());

  window.__voxcelCharacters = {
    ready: true,
    playerRoot: runtime.playerRoot,
    crowdRoot: runtime.crowdRoot,
    getState: publicState,
    selectShoe: buyOrWearShoe,
    refresh: () => {
      applyPlayerAppearance(true);
      updateCrowd();
      return publicState();
    },
    dispose,
  };
}

initialize().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  try {
    dispose();
  } catch (cleanupError) {
    console.error("Failed to clean up modular Voxcel characters", cleanupError);
  }
  runtime.error = message;
  console.error("Failed to initialize modular Voxcel characters", error);
  window.__voxcelCharacters = {
    ready: false,
    error: runtime.error,
    getState: publicState,
  };
});
