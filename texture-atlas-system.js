(() => {
  "use strict";

  const ATLAS_URL = new URL("./images/voxcel-detail-atlas.jpg", document.baseURI).href;
  const ATLAS_SIZE = 512;
  const GRID_SIZE = 8;
  const CELL_SIZE = ATLAS_SIZE / GRID_SIZE;
  const DEFAULT_INSET = 3;
  const IMAGE_LOAD_TIMEOUT_MS = 12000;

  const SIGN_ATLAS_URL = new URL("./images/voxcel-sign-atlas.png", document.baseURI).href;
  const SIGN_ATLAS_WIDTH = 1024;
  const SIGN_ATLAS_HEIGHT = 512;
  const SIGN_ATLAS_COLUMNS = 2;
  const SIGN_ATLAS_ROWS = 8;
  const SIGN_CELL_WIDTH = SIGN_ATLAS_WIDTH / SIGN_ATLAS_COLUMNS;
  const SIGN_CELL_HEIGHT = SIGN_ATLAS_HEIGHT / SIGN_ATLAS_ROWS;
  const SIGN_DEFAULT_INSET = 4;

  const VEHICLE_ATLAS_URL = new URL("./images/voxcel-vehicle-atlas.png", document.baseURI).href;
  const VEHICLE_ATLAS_SIZE = 1024;
  const VEHICLE_GRID_SIZE = 4;
  const VEHICLE_CELL_SIZE = VEHICLE_ATLAS_SIZE / VEHICLE_GRID_SIZE;
  const VEHICLE_DEFAULT_INSET = 5;

  const tileNames = [
    "fabric_plain", "fabric_pinstripe", "fabric_gingham", "fabric_herringbone",
    "fabric_dots", "fabric_floral", "fabric_varsity", "fabric_dark_denim",
    "fabric_rib", "fabric_argyle", "fabric_plaid", "fabric_canvas",
    "fabric_quilt", "fabric_silk", "fabric_stars", "fabric_leather",
    "hair_straight", "hair_wavy", "hair_curly", "hair_braid",
    "hair_spiky", "hair_layered", "hair_cropped", "hair_highlight",
    "shoe_laces", "shoe_stitched", "shoe_hightop", "shoe_boot",
    "shoe_loafer", "shoe_tread", "shoe_canvas", "shoe_polished",
    "book_flower", "book_cloud", "book_tree", "book_moon",
    "book_diamond", "book_sailboat", "book_sun", "book_stars",
    "product_drink", "product_snack", "product_bakery", "product_coffee",
    "product_clothing", "product_salon", "product_furniture", "product_medicine",
    "sign_book", "sign_cafe", "sign_bakery", "sign_restaurant",
    "sign_clothing", "sign_salon", "sign_furniture", "sign_hospital",
    "sign_bank", "sign_home", "sign_police", "sign_convenience",
    "sign_atm", "sign_menu", "sign_notice", "sign_shop",
  ];

  const tiles = Object.freeze(Object.fromEntries(tileNames.map((name, index) => [
    name,
    Object.freeze({ name, index, column: index % GRID_SIZE, row: Math.floor(index / GRID_SIZE) }),
  ])));

  const regions = Object.freeze({
    fabrics_row: Object.freeze({ name: "fabrics_row", column: 0, row: 0, columns: 8, rows: 1 }),
    books_row: Object.freeze({ name: "books_row", column: 0, row: 4, columns: 8, rows: 1 }),
    products_row: Object.freeze({ name: "products_row", column: 0, row: 5, columns: 8, rows: 1 }),
  });

  const signRegionNames = [
    "exterior_convenience", "exterior_cafe",
    "exterior_bakery", "exterior_restaurant",
    "exterior_clothing", "exterior_salon",
    "exterior_furniture", "exterior_book",
    "exterior_hospital", "exterior_bank",
    "exterior_home", "exterior_police",
  ];

  const signRegions = Object.freeze(Object.fromEntries(signRegionNames.map((name, index) => [
    name,
    Object.freeze({
      name,
      index,
      column: index % SIGN_ATLAS_COLUMNS,
      row: Math.floor(index / SIGN_ATLAS_COLUMNS),
    }),
  ])));

  const vehicleTileNames = [
    "windshield", "side_window", "grille", "rear_light",
    "headlight", "tire_tread", "wheel_face", "interior",
    "car_door", "hood", "trunk", "bumper",
    "bus_windows", "bus_door", "taxi_livery", "service_livery",
  ];

  const vehicleTiles = Object.freeze(Object.fromEntries(vehicleTileNames.map((name, index) => [
    name,
    Object.freeze({
      name,
      index,
      column: index % VEHICLE_GRID_SIZE,
      row: Math.floor(index / VEHICLE_GRID_SIZE),
    }),
  ])));

  let imagePromise = null;
  let texturePromise = null;
  let texture = null;
  let error = null;
  let signImagePromise = null;
  let signTexturePromise = null;
  let signTexture = null;
  let signError = null;
  let vehicleImagePromise = null;
  let vehicleTexturePromise = null;
  let vehicleTexture = null;
  let vehicleError = null;

  function resolveRegion(tileOrRegion) {
    if (typeof tileOrRegion === "number") {
      const name = tileNames[tileOrRegion];
      if (!name) throw new Error(`Unknown Voxcel atlas tile index: ${tileOrRegion}`);
      return { ...tiles[name], columns: 1, rows: 1 };
    }
    const entry = tiles[tileOrRegion] || regions[tileOrRegion];
    if (!entry) throw new Error(`Unknown Voxcel atlas region: ${tileOrRegion}`);
    return {
      ...entry,
      columns: entry.columns || 1,
      rows: entry.rows || 1,
    };
  }

  function getUvRect(tileOrRegion, inset = DEFAULT_INSET) {
    const entry = resolveRegion(tileOrRegion);
    const left = entry.column * CELL_SIZE + inset;
    const right = (entry.column + entry.columns) * CELL_SIZE - inset;
    const top = entry.row * CELL_SIZE + inset;
    const bottom = (entry.row + entry.rows) * CELL_SIZE - inset;
    return Object.freeze({
      name: entry.name,
      index: entry.index ?? null,
      u0: left / ATLAS_SIZE,
      u1: right / ATLAS_SIZE,
      v0: top / ATLAS_SIZE,
      v1: bottom / ATLAS_SIZE,
    });
  }

  function loadImage() {
    if (imagePromise) return imagePromise;
    imagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
        callback(value);
      };
      const fail = (reason) => {
        imagePromise = null;
        finish(reject, reason);
      };
      const handleLoad = () => {
        if (image.naturalWidth !== ATLAS_SIZE || image.naturalHeight !== ATLAS_SIZE) {
          fail(new Error(
            `Unexpected Voxcel atlas dimensions: ${image.naturalWidth}x${image.naturalHeight}`,
          ));
          return;
        }
        finish(resolve, image);
      };
      const handleError = () => {
        fail(new Error(`Could not load Voxcel detail atlas: ${ATLAS_URL}`));
      };
      const timeoutId = window.setTimeout(() => {
        fail(new Error(`Timed out loading Voxcel detail atlas: ${ATLAS_URL}`));
      }, IMAGE_LOAD_TIMEOUT_MS);
      image.decoding = "async";
      image.addEventListener("load", handleLoad);
      image.addEventListener("error", handleError);
      image.src = ATLAS_URL;
    });
    return imagePromise;
  }

  async function getTexture({ TextureConstructor, referenceTexture, renderer } = {}) {
    if (texture) return texture;
    if (texturePromise) return texturePromise;
    if (typeof TextureConstructor !== "function") {
      throw new Error("A Three.js Texture constructor is required for the Voxcel atlas");
    }

    texturePromise = (async () => {
      const image = await loadImage();
      const nextTexture = new TextureConstructor(image);
      nextTexture.name = "VoxcelDetailAtlas";
      // Blender/glTF UVs address the source image from its top edge.
      nextTexture.flipY = false;
      nextTexture.wrapS = 1001;
      nextTexture.wrapT = 1001;
      nextTexture.magFilter = 1003;
      nextTexture.minFilter = 1008;
      nextTexture.generateMipmaps = true;
      nextTexture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
      nextTexture.colorSpace = referenceTexture?.colorSpace || "srgb";
      nextTexture.userData.voxcelTextureAtlas = true;
      nextTexture.userData.voxcelAtlasSize = ATLAS_SIZE;
      nextTexture.userData.voxcelAtlasCellSize = CELL_SIZE;
      nextTexture.needsUpdate = true;
      texture = nextTexture;
      error = null;
      return texture;
    })().catch((reason) => {
      error = reason instanceof Error ? reason : new Error(String(reason));
      texturePromise = null;
      throw error;
    });

    return texturePromise;
  }

  function getState() {
    return {
      ready: Boolean(texture),
      loading: Boolean(texturePromise && !texture),
      error: error?.message || null,
      url: ATLAS_URL,
      width: ATLAS_SIZE,
      height: ATLAS_SIZE,
      tileCount: tileNames.length,
      textureUuid: texture?.uuid || null,
    };
  }

  function getSignUvRect(regionName, inset = SIGN_DEFAULT_INSET) {
    const region = signRegions[regionName];
    if (!region) throw new Error(`Unknown Voxcel sign atlas region: ${regionName}`);
    const left = region.column * SIGN_CELL_WIDTH + inset;
    const right = (region.column + 1) * SIGN_CELL_WIDTH - inset;
    const top = region.row * SIGN_CELL_HEIGHT + inset;
    const bottom = (region.row + 1) * SIGN_CELL_HEIGHT - inset;
    return Object.freeze({
      name: region.name,
      index: region.index,
      u0: left / SIGN_ATLAS_WIDTH,
      u1: right / SIGN_ATLAS_WIDTH,
      v0: top / SIGN_ATLAS_HEIGHT,
      v1: bottom / SIGN_ATLAS_HEIGHT,
    });
  }

  function loadSignImage() {
    if (signImagePromise) return signImagePromise;
    signImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
        callback(value);
      };
      const fail = (reason) => {
        signImagePromise = null;
        finish(reject, reason);
      };
      const handleLoad = () => {
        if (
          image.naturalWidth !== SIGN_ATLAS_WIDTH ||
          image.naturalHeight !== SIGN_ATLAS_HEIGHT
        ) {
          fail(new Error(
            `Unexpected Voxcel sign atlas dimensions: ${image.naturalWidth}x${image.naturalHeight}`,
          ));
          return;
        }
        finish(resolve, image);
      };
      const handleError = () => {
        fail(new Error(`Could not load Voxcel sign atlas: ${SIGN_ATLAS_URL}`));
      };
      const timeoutId = window.setTimeout(() => {
        fail(new Error(`Timed out loading Voxcel sign atlas: ${SIGN_ATLAS_URL}`));
      }, IMAGE_LOAD_TIMEOUT_MS);
      image.decoding = "async";
      image.addEventListener("load", handleLoad);
      image.addEventListener("error", handleError);
      image.src = SIGN_ATLAS_URL;
    });
    return signImagePromise;
  }

  async function getSignTexture({ TextureConstructor, referenceTexture, renderer } = {}) {
    if (signTexture) return signTexture;
    if (signTexturePromise) return signTexturePromise;
    if (typeof TextureConstructor !== "function") {
      throw new Error("A Three.js Texture constructor is required for the Voxcel sign atlas");
    }

    signTexturePromise = (async () => {
      const image = await loadSignImage();
      const nextTexture = new TextureConstructor(image);
      nextTexture.name = "VoxcelSignAtlas";
      nextTexture.flipY = false;
      nextTexture.wrapS = 1001;
      nextTexture.wrapT = 1001;
      nextTexture.magFilter = 1006;
      nextTexture.minFilter = 1008;
      nextTexture.generateMipmaps = true;
      nextTexture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
      nextTexture.colorSpace = referenceTexture?.colorSpace || "srgb";
      nextTexture.userData.voxcelSignAtlas = true;
      nextTexture.userData.voxcelAtlasWidth = SIGN_ATLAS_WIDTH;
      nextTexture.userData.voxcelAtlasHeight = SIGN_ATLAS_HEIGHT;
      nextTexture.userData.voxcelAtlasCellWidth = SIGN_CELL_WIDTH;
      nextTexture.userData.voxcelAtlasCellHeight = SIGN_CELL_HEIGHT;
      nextTexture.needsUpdate = true;
      signTexture = nextTexture;
      signError = null;
      return signTexture;
    })().catch((reason) => {
      signError = reason instanceof Error ? reason : new Error(String(reason));
      signTexturePromise = null;
      throw signError;
    });

    return signTexturePromise;
  }

  function getSignState() {
    return {
      ready: Boolean(signTexture),
      loading: Boolean(signTexturePromise && !signTexture),
      error: signError?.message || null,
      url: SIGN_ATLAS_URL,
      width: SIGN_ATLAS_WIDTH,
      height: SIGN_ATLAS_HEIGHT,
      regionCount: signRegionNames.length,
      textureUuid: signTexture?.uuid || null,
    };
  }

  function resolveVehicleTile(tileOrIndex) {
    if (typeof tileOrIndex === "number") {
      const name = vehicleTileNames[tileOrIndex];
      if (!name) throw new Error(`Unknown Voxcel vehicle atlas tile index: ${tileOrIndex}`);
      return vehicleTiles[name];
    }
    const tile = vehicleTiles[tileOrIndex];
    if (!tile) throw new Error(`Unknown Voxcel vehicle atlas tile: ${tileOrIndex}`);
    return tile;
  }

  function getVehicleUvRect(tileOrIndex, inset = VEHICLE_DEFAULT_INSET) {
    const tile = resolveVehicleTile(tileOrIndex);
    const left = tile.column * VEHICLE_CELL_SIZE + inset;
    const right = (tile.column + 1) * VEHICLE_CELL_SIZE - inset;
    const top = tile.row * VEHICLE_CELL_SIZE + inset;
    const bottom = (tile.row + 1) * VEHICLE_CELL_SIZE - inset;
    return Object.freeze({
      name: tile.name,
      index: tile.index,
      u0: left / VEHICLE_ATLAS_SIZE,
      u1: right / VEHICLE_ATLAS_SIZE,
      v0: top / VEHICLE_ATLAS_SIZE,
      v1: bottom / VEHICLE_ATLAS_SIZE,
    });
  }

  function loadVehicleImage() {
    if (vehicleImagePromise) return vehicleImagePromise;
    vehicleImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
        callback(value);
      };
      const fail = (reason) => {
        vehicleImagePromise = null;
        finish(reject, reason);
      };
      const handleLoad = () => {
        if (
          image.naturalWidth !== VEHICLE_ATLAS_SIZE ||
          image.naturalHeight !== VEHICLE_ATLAS_SIZE
        ) {
          fail(new Error(
            `Unexpected Voxcel vehicle atlas dimensions: ${image.naturalWidth}x${image.naturalHeight}`,
          ));
          return;
        }
        finish(resolve, image);
      };
      const handleError = () => {
        fail(new Error(`Could not load Voxcel vehicle atlas: ${VEHICLE_ATLAS_URL}`));
      };
      const timeoutId = window.setTimeout(() => {
        fail(new Error(`Timed out loading Voxcel vehicle atlas: ${VEHICLE_ATLAS_URL}`));
      }, IMAGE_LOAD_TIMEOUT_MS);
      image.decoding = "async";
      image.addEventListener("load", handleLoad);
      image.addEventListener("error", handleError);
      image.src = VEHICLE_ATLAS_URL;
    });
    return vehicleImagePromise;
  }

  async function getVehicleTexture({ TextureConstructor, referenceTexture, renderer } = {}) {
    if (vehicleTexture) return vehicleTexture;
    if (vehicleTexturePromise) return vehicleTexturePromise;
    if (typeof TextureConstructor !== "function") {
      throw new Error("A Three.js Texture constructor is required for the Voxcel vehicle atlas");
    }

    vehicleTexturePromise = (async () => {
      const image = await loadVehicleImage();
      const nextTexture = new TextureConstructor(image);
      nextTexture.name = "VoxcelVehicleAtlas";
      nextTexture.flipY = false;
      nextTexture.wrapS = 1001;
      nextTexture.wrapT = 1001;
      nextTexture.magFilter = 1006;
      nextTexture.minFilter = 1008;
      nextTexture.generateMipmaps = true;
      nextTexture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
      nextTexture.colorSpace = referenceTexture?.colorSpace || "srgb";
      nextTexture.userData.voxcelVehicleAtlas = true;
      nextTexture.userData.voxcelAtlasSize = VEHICLE_ATLAS_SIZE;
      nextTexture.userData.voxcelAtlasCellSize = VEHICLE_CELL_SIZE;
      nextTexture.needsUpdate = true;
      vehicleTexture = nextTexture;
      vehicleError = null;
      return vehicleTexture;
    })().catch((reason) => {
      vehicleError = reason instanceof Error ? reason : new Error(String(reason));
      vehicleTexturePromise = null;
      throw vehicleError;
    });

    return vehicleTexturePromise;
  }

  function getVehicleState() {
    return {
      ready: Boolean(vehicleTexture),
      loading: Boolean(vehicleTexturePromise && !vehicleTexture),
      error: vehicleError?.message || null,
      url: VEHICLE_ATLAS_URL,
      width: VEHICLE_ATLAS_SIZE,
      height: VEHICLE_ATLAS_SIZE,
      tileCount: vehicleTileNames.length,
      textureUuid: vehicleTexture?.uuid || null,
    };
  }

  window.__voxcelTextureAtlas = Object.freeze({
    url: ATLAS_URL,
    size: ATLAS_SIZE,
    gridSize: GRID_SIZE,
    cellSize: CELL_SIZE,
    tiles,
    regions,
    getUvRect,
    getTexture,
    getState,
  });

  window.__voxcelSignAtlas = Object.freeze({
    url: SIGN_ATLAS_URL,
    width: SIGN_ATLAS_WIDTH,
    height: SIGN_ATLAS_HEIGHT,
    columns: SIGN_ATLAS_COLUMNS,
    rows: SIGN_ATLAS_ROWS,
    cellWidth: SIGN_CELL_WIDTH,
    cellHeight: SIGN_CELL_HEIGHT,
    regions: signRegions,
    getUvRect: getSignUvRect,
    getTexture: getSignTexture,
    getState: getSignState,
  });

  window.__voxcelVehicleAtlas = Object.freeze({
    url: VEHICLE_ATLAS_URL,
    size: VEHICLE_ATLAS_SIZE,
    width: VEHICLE_ATLAS_SIZE,
    height: VEHICLE_ATLAS_SIZE,
    gridSize: VEHICLE_GRID_SIZE,
    columns: VEHICLE_GRID_SIZE,
    rows: VEHICLE_GRID_SIZE,
    cellSize: VEHICLE_CELL_SIZE,
    tiles: vehicleTiles,
    getUvRect: getVehicleUvRect,
    getTexture: getVehicleTexture,
    getState: getVehicleState,
  });
})();
