(() => {
  "use strict";

  if (window.__voxcelMap?.__cityMapSystem) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SYSTEM_VERSION = 1;
  const STATIC_SYNC_INTERVAL = 750;
  const DYNAMIC_SYNC_INTERVAL = 100;
  const DEFAULT_ROADS = Object.freeze({
    x: Object.freeze([0, 44]),
    z: Object.freeze([-70, 0, 70]),
    width: 10,
  });
  const CATEGORY_LABELS = Object.freeze({
    food: "飲食・食品",
    cloth: "服屋",
    hair: "美容院",
    furn: "家具屋",
    book: "本屋",
    heal: "病院",
    bank: "銀行",
    home: "自宅",
    police: "警察署",
    office: "オフィス",
    park: "公園",
    building: "施設",
  });
  const SVG_SHORT_LABELS = Object.freeze({
    conv: "コンビニ",
    cafe: "カフェ",
    bake: "パン屋",
    rest: "レストラン",
    cloth: "服屋",
    salon: "美容院",
    furn: "家具屋",
    book: "本屋",
    hosp: "病院",
    bank: "銀行",
    home: "自宅",
    police: "警察",
    office: "オフィス",
    park: "公園",
  });
  const BLOCKED_GAME_KEYS = new Set([
    "w",
    "a",
    "s",
    "d",
    "e",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
  ]);

  const registeredLocations = new Map();
  const exteriorFootprints = new Map();
  const activeControlPointers = new Map();

  const runtime = {
    ready: false,
    reason: "initializing",
    mounted: false,
    open: false,
    selectedId: null,
    previousFocus: null,
    locations: [],
    locationById: new Map(),
    locationSignature: "",
    bounds: { x: -150, z: -150, width: 300, height: 300 },
    current: null,
    enhancementState: null,
    lastStaticSync: 0,
    lastDynamicSync: 0,
    readyEventSent: false,
    ui: null,
    timer: null,
  };

  function finiteNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function colorToCss(value, fallback = "#78909c") {
    if (typeof value === "string" && value.trim()) return value;
    const number = finiteNumber(value);
    if (number === null) return fallback;
    return `#${(number & 0xffffff).toString(16).padStart(6, "0")}`;
  }

  function cloneLocation(location) {
    return {
      id: location.id,
      name: location.name,
      emoji: location.emoji,
      type: location.type,
      category: location.category,
      x: location.x,
      z: location.z,
      w: location.w,
      d: location.d,
      color: location.color,
      floors: location.floors,
      enterable: location.enterable,
    };
  }

  function normalizeRegisteredLocation(input, previous = null) {
    if (!input || typeof input !== "object") {
      throw new TypeError("map location must be an object");
    }
    const id = String(input.id ?? previous?.id ?? "").trim();
    if (!id) throw new TypeError("map location id is required");

    const x = finiteNumber(input.x, previous?.x ?? null);
    const z = finiteNumber(input.z, previous?.z ?? null);
    if (x === null || z === null) {
      throw new TypeError(`map location ${id} requires finite x and z coordinates`);
    }

    const type = String(input.type ?? input.tp ?? previous?.type ?? "building");
    const floors = finiteNumber(input.floors, previous?.floors ?? null);
    return {
      id,
      name: String(input.name ?? input.nm ?? previous?.name ?? id),
      emoji: String(input.emoji ?? input.em ?? previous?.emoji ?? "📍"),
      type,
      category: String(
        input.category ?? previous?.category ?? CATEGORY_LABELS[type] ?? CATEGORY_LABELS.building,
      ),
      x,
      z,
      w: Math.max(1, finiteNumber(input.w ?? input.mapW, previous?.w ?? 8)),
      d: Math.max(1, finiteNumber(input.d ?? input.mapD, previous?.d ?? 8)),
      color: colorToCss(input.color ?? input.c, previous?.color ?? "#78909c"),
      floors: floors === null ? null : Math.max(1, Math.round(floors)),
      enterable: input.enterable ?? previous?.enterable ?? false,
      registered: true,
    };
  }

  function registerLocation(input) {
    const id = String(input?.id ?? "").trim();
    const previous = registeredLocations.get(id) || null;
    const location = normalizeRegisteredLocation(input, previous);
    registeredLocations.set(location.id, location);
    syncLocations(true);
    return cloneLocation(location);
  }

  function unregisterLocation(id) {
    const removed = registeredLocations.delete(String(id));
    if (removed) syncLocations(true);
    return removed;
  }

  registeredLocations.set("park", normalizeRegisteredLocation({
    id: "park",
    name: "セントラルパーク",
    emoji: "🌳",
    type: "park",
    x: -90,
    z: 26,
    w: 30,
    d: 30,
    color: "#3a8a52",
    enterable: false,
  }));

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== null && value !== undefined) element.setAttribute(key, String(value));
    }
    return element;
  }

  function injectStyles() {
    if (document.getElementById("voxcel-city-map-styles")) return;
    const style = document.createElement("style");
    style.id = "voxcel-city-map-styles";
    style.textContent = `
#mmC{pointer-events:auto!important}
.voxcel-map-trigger{position:relative;display:block;width:130px;height:130px;padding:0;border:0;border-radius:12px;background:transparent;color:#fff;cursor:pointer;overflow:hidden;pointer-events:auto;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.voxcel-map-trigger>canvas{display:block;width:100%!important;height:100%!important;border:2px solid rgba(255,255,255,.16)!important;border-radius:12px!important;box-shadow:none!important;pointer-events:none}
.voxcel-map-trigger:focus-visible{outline:3px solid var(--accent,#6fd4ff);outline-offset:3px}
.voxcel-map-trigger-label{position:absolute;right:6px;bottom:5px;padding:2px 7px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(8,15,27,.84);font-size:9px;font-weight:800;line-height:1.45;letter-spacing:.06em;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.voxcel-map-overlay{position:fixed;inset:0;z-index:190;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(3,8,17,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:auto}
.voxcel-map-overlay[hidden]{display:none!important}
.voxcel-map-dialog{display:grid;grid-template-rows:auto minmax(0,1fr);width:min(1040px,96vw);height:min(820px,92dvh);max-height:calc(100dvh - max(24px,env(safe-area-inset-top) + env(safe-area-inset-bottom)));overflow:hidden;border:1px solid rgba(255,255,255,.17);border-radius:22px;background:rgba(9,16,30,.97);box-shadow:0 28px 80px rgba(0,0,0,.62);color:var(--text,#eef4ff)}
.voxcel-map-header{display:flex;align-items:center;gap:12px;min-height:62px;padding:11px 14px 11px 18px;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(110deg,rgba(111,212,255,.12),rgba(255,214,102,.07))}
.voxcel-map-title-wrap{min-width:0;flex:1}.voxcel-map-title{font-size:19px;font-weight:900;line-height:1.2}.voxcel-map-current{margin-top:4px;overflow:hidden;color:rgba(238,244,255,.72);font-size:11px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
.voxcel-map-key{flex:0 0 auto;padding:3px 7px;border:1px solid rgba(255,255,255,.14);border-radius:7px;color:rgba(238,244,255,.55);font-size:9px;font-weight:800}
.voxcel-map-close{display:grid;place-items:center;flex:0 0 auto;width:42px;height:42px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.07);color:#fff;font:800 22px/1 system-ui;cursor:pointer}
.voxcel-map-close:hover{background:rgba(111,212,255,.15)}.voxcel-map-close:focus-visible{outline:3px solid var(--accent,#6fd4ff);outline-offset:2px}
.voxcel-map-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,285px);min-height:0}
.voxcel-map-stage{position:relative;display:grid;place-items:center;min-width:0;min-height:0;padding:14px;background:radial-gradient(circle at center,rgba(60,94,75,.2),rgba(4,10,19,.64));overflow:hidden}
.voxcel-map-svg{display:block;width:100%;height:100%;max-width:100%;max-height:100%;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:#23352e;touch-action:manipulation}
.voxcel-map-compass{position:absolute;top:23px;right:23px;display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(7,14,25,.84);font-size:11px;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.35);pointer-events:none}.voxcel-map-compass::after{content:"";position:absolute;top:5px;border-right:4px solid transparent;border-bottom:8px solid #ff7373;border-left:4px solid transparent}
.voxcel-map-selection{position:absolute;left:23px;bottom:23px;max-width:calc(100% - 46px);padding:6px 10px;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:rgba(7,14,25,.86);font-size:10px;font-weight:750;line-height:1.4;box-shadow:0 5px 18px rgba(0,0,0,.32);pointer-events:none}
.voxcel-map-sidebar{display:flex;min-height:0;flex-direction:column;border-left:1px solid rgba(255,255,255,.1);background:rgba(8,14,26,.75)}
.voxcel-map-sidebar h3{padding:13px 14px 8px;color:var(--accent,#6fd4ff);font-size:12px;letter-spacing:.06em}.voxcel-map-list{display:flex;min-height:0;flex:1;flex-direction:column;gap:5px;padding:0 10px 12px;overflow:auto;overscroll-behavior:contain}.voxcel-map-list::-webkit-scrollbar{width:4px}.voxcel-map-list::-webkit-scrollbar-thumb{border-radius:5px;background:rgba(255,255,255,.18)}
.voxcel-map-location-button{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:7px;width:100%;padding:7px 8px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.045);color:#eef4ff;text-align:left;cursor:pointer}.voxcel-map-location-button:hover,.voxcel-map-location-button.is-selected{border-color:rgba(111,212,255,.7);background:rgba(111,212,255,.12)}.voxcel-map-location-button.is-current{box-shadow:inset 3px 0 0 #ff7676}.voxcel-map-location-button:focus-visible{outline:3px solid var(--accent,#6fd4ff);outline-offset:1px}
.voxcel-map-location-emoji{font-size:18px;text-align:center}.voxcel-map-location-copy{min-width:0}.voxcel-map-location-name{display:block;overflow:hidden;font-size:11px;font-weight:850;text-overflow:ellipsis;white-space:nowrap}.voxcel-map-location-type{display:block;margin-top:1px;color:rgba(238,244,255,.5);font-size:8px;font-weight:700}.voxcel-map-location-distance{color:var(--accent2,#ffd666);font-size:9px;font-weight:850;white-space:nowrap}
.voxcel-map-location-shape{cursor:pointer;outline:none}.voxcel-map-location-shape .voxcel-map-building{transition:stroke-width .12s,filter .12s}.voxcel-map-location-shape:hover .voxcel-map-building,.voxcel-map-location-shape.is-selected .voxcel-map-building{stroke:#fff4ad;stroke-width:2.2;filter:brightness(1.16)}.voxcel-map-location-shape:focus .voxcel-map-building{stroke:#6fd4ff;stroke-width:2.4}
.voxcel-map-label{paint-order:stroke;stroke:rgba(7,13,20,.94);stroke-width:2.6px;stroke-linejoin:round;fill:#fff;font-family:'Segoe UI',system-ui,sans-serif;font-size:6.3px;font-weight:850;pointer-events:none}.voxcel-map-icon{font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif;font-size:7px;text-anchor:middle;dominant-baseline:central;pointer-events:none}.voxcel-map-floor-badge{paint-order:stroke;stroke:rgba(7,13,20,.9);stroke-width:1.7px;fill:#fff4ad;font-family:system-ui,sans-serif;font-size:4.2px;font-weight:900;text-anchor:middle;pointer-events:none}.voxcel-map-current-label{paint-order:stroke;stroke:rgba(7,13,20,.95);stroke-width:2.8px;fill:#fff;font-family:system-ui,sans-serif;font-size:6.2px;font-weight:900;pointer-events:none}
body.voxcel-map-open #touchLayer,body.voxcel-map-open #movePad,body.voxcel-map-open #lookPad,body.voxcel-map-open #iBtn{pointer-events:none!important}
@media(max-width:700px){#mmC{top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right))}.voxcel-map-trigger{width:96px;height:96px}.voxcel-map-overlay{padding:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))}.voxcel-map-dialog{width:100%;height:100%;max-height:none;border-radius:16px}.voxcel-map-header{min-height:56px;padding:8px 8px 8px 13px}.voxcel-map-title{font-size:16px}.voxcel-map-key{display:none}.voxcel-map-body{grid-template-columns:1fr;grid-template-rows:minmax(280px,1fr) minmax(125px,32%)}.voxcel-map-stage{padding:8px}.voxcel-map-sidebar{border-top:1px solid rgba(255,255,255,.1);border-left:0}.voxcel-map-sidebar h3{padding:8px 10px 5px}.voxcel-map-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;padding:0 7px 8px}.voxcel-map-location-button{grid-template-columns:24px minmax(0,1fr);padding:6px}.voxcel-map-location-distance{display:none}.voxcel-map-location-emoji{font-size:16px}.voxcel-map-compass{top:16px;right:16px}.voxcel-map-selection{left:16px;bottom:16px;max-width:calc(100% - 32px)}}
@media(max-height:500px) and (orientation:landscape){.voxcel-map-dialog{height:100%;max-height:none}.voxcel-map-header{min-height:48px;padding-block:5px}.voxcel-map-body{grid-template-columns:minmax(0,1fr) 220px;grid-template-rows:1fr}.voxcel-map-sidebar{border-top:0;border-left:1px solid rgba(255,255,255,.1)}.voxcel-map-list{display:flex}.voxcel-map-stage{padding:6px}.voxcel-map-compass{top:14px;right:14px}.voxcel-map-selection{left:14px;bottom:14px}}
@media(prefers-reduced-motion:reduce){.voxcel-map-location-shape .voxcel-map-building{transition:none}}
`;
    document.head.append(style);
  }

  function getHandle() {
    return window.__voxcelPlayer || null;
  }

  function normalizeBuilding(building) {
    const id = String(building?.id ?? "").trim();
    const x = finiteNumber(building?.x);
    const z = finiteNumber(building?.z);
    if (!id || x === null || z === null) return null;

    const explicitWidth = finiteNumber(building.mapW);
    const explicitDepth = finiteNumber(building.mapD);
    let footprint = exteriorFootprints.get(id);
    if (!footprint) {
      footprint = {
        w: Math.max(1, explicitWidth ?? finiteNumber(building.w, 8)),
        d: Math.max(1, explicitDepth ?? finiteNumber(building.d, 8)),
      };
      exteriorFootprints.set(id, footprint);
    } else if (explicitWidth !== null || explicitDepth !== null) {
      footprint = {
        w: Math.max(1, explicitWidth ?? footprint.w),
        d: Math.max(1, explicitDepth ?? footprint.d),
      };
      exteriorFootprints.set(id, footprint);
    }

    const type = String(building.mapType ?? building.tp ?? building.type ?? "building");
    const floors = finiteNumber(building.floors);
    return {
      id,
      name: String(building.mapName ?? building.nm ?? building.name ?? id),
      emoji: String(building.mapEmoji ?? building.em ?? building.emoji ?? "🏢"),
      type,
      category: String(building.category ?? CATEGORY_LABELS[type] ?? CATEGORY_LABELS.building),
      x,
      z,
      w: footprint.w,
      d: footprint.d,
      color: colorToCss(building.mapColor ?? building.c ?? building.color),
      floors: floors === null ? null : Math.max(1, Math.round(floors)),
      enterable: building.enterable ?? true,
      registered: false,
    };
  }

  function mergedLocations() {
    const result = [];
    const indexes = new Map();
    const buildings = getHandle()?.buildings;
    if (Array.isArray(buildings)) {
      for (const building of buildings) {
        const location = normalizeBuilding(building);
        if (!location) continue;
        indexes.set(location.id, result.length);
        result.push(location);
      }
    }

    for (const registered of registeredLocations.values()) {
      const existingIndex = indexes.get(registered.id);
      if (existingIndex === undefined) {
        indexes.set(registered.id, result.length);
        result.push({ ...registered });
      } else {
        const existing = result[existingIndex];
        result[existingIndex] = {
          ...existing,
          ...registered,
          x: finiteNumber(registered.x, existing.x),
          z: finiteNumber(registered.z, existing.z),
          w: finiteNumber(registered.w, existing.w),
          d: finiteNumber(registered.d, existing.d),
        };
      }
    }
    return result;
  }

  function getRoads() {
    const handle = getHandle();
    const source = handle?.mapLayout?.roads ?? handle?.roads ?? null;
    const x = source?.x ?? source?.vertical ?? handle?.mapLayout?.roadX;
    const z = source?.z ?? source?.horizontal ?? handle?.mapLayout?.roadZ;
    const rings = Array.isArray(source?.rings) ? source.rings : [];
    return {
      x: Array.isArray(x) ? x.filter(Number.isFinite) : [...DEFAULT_ROADS.x],
      z: Array.isArray(z) ? z.filter(Number.isFinite) : [...DEFAULT_ROADS.z],
      width: Math.max(5, finiteNumber(source?.width, DEFAULT_ROADS.width)),
      rings: rings
        .filter((ring) => Number.isFinite(ring?.radius) && ring.radius > 0)
        .map((ring) => ({
          id: typeof ring.id === "string" ? ring.id : "ring",
          radius: ring.radius,
          width: Math.max(4, finiteNumber(ring.width, DEFAULT_ROADS.width)),
        })),
    };
  }

  function calculateBounds(locations) {
    let minX = -150;
    let maxX = 150;
    let minZ = -150;
    let maxZ = 150;
    for (const location of locations) {
      minX = Math.min(minX, location.x - location.w / 2 - 12);
      maxX = Math.max(maxX, location.x + location.w / 2 + 12);
      minZ = Math.min(minZ, location.z - location.d / 2 - 12);
      maxZ = Math.max(maxZ, location.z + location.d / 2 + 12);
    }
    const width = maxX - minX;
    const height = maxZ - minZ;
    const size = Math.max(width, height);
    return {
      x: minX - (size - width) / 2,
      z: minZ - (size - height) / 2,
      width: size,
      height: size,
    };
  }

  function locationSignature(locations, roads) {
    return JSON.stringify({
      locations: locations.map((location) => [
        location.id,
        location.name,
        location.emoji,
        location.type,
        location.x,
        location.z,
        location.w,
        location.d,
        location.color,
        location.floors,
      ]),
      roads,
    });
  }

  function syncLocations(force = false) {
    const locations = mergedLocations();
    const roads = getRoads();
    const signature = locationSignature(locations, roads);
    if (!force && signature === runtime.locationSignature) return false;

    runtime.locationSignature = signature;
    runtime.locations = locations;
    runtime.locationById = new Map(locations.map((location) => [location.id, location]));
    runtime.bounds = calculateBounds(locations);
    if (runtime.selectedId && !runtime.locationById.has(runtime.selectedId)) {
      runtime.selectedId = null;
    }
    if (runtime.ui) rebuildExpandedMap(roads);
    return true;
  }

  function createMiniMapTrigger(container, canvas) {
    let trigger = document.getElementById("voxcelMapTrigger");
    if (trigger) return trigger;

    trigger = document.createElement("button");
    trigger.id = "voxcelMapTrigger";
    trigger.type = "button";
    trigger.className = "voxcel-map-trigger";
    trigger.dataset.voxcelMapTrigger = "";
    trigger.setAttribute("aria-label", "街の地図を開く");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "voxcelCityMapOverlay");

    container.insertBefore(trigger, canvas);
    trigger.append(canvas);
    const label = document.createElement("span");
    label.className = "voxcel-map-trigger-label";
    label.textContent = "地図 M";
    trigger.append(label);
    return trigger;
  }

  function createExpandedMap() {
    const overlay = document.createElement("div");
    overlay.id = "voxcelCityMapOverlay";
    overlay.className = "voxcel-map-overlay";
    overlay.dataset.voxcelMapDialog = "";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");

    const dialog = document.createElement("section");
    dialog.className = "voxcel-map-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "voxcelMapTitle");

    const header = document.createElement("header");
    header.className = "voxcel-map-header";
    const titleWrap = document.createElement("div");
    titleWrap.className = "voxcel-map-title-wrap";
    const title = document.createElement("h2");
    title.id = "voxcelMapTitle";
    title.className = "voxcel-map-title";
    title.textContent = "🗺️ 街の地図";
    const currentText = document.createElement("div");
    currentText.className = "voxcel-map-current";
    currentText.dataset.mapCurrentLocation = "";
    currentText.setAttribute("aria-live", "polite");
    currentText.textContent = "現在地を確認中…";
    titleWrap.append(title, currentText);

    const keyHint = document.createElement("span");
    keyHint.className = "voxcel-map-key";
    keyHint.textContent = "M / ESC";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "voxcel-map-close";
    closeButton.setAttribute("aria-label", "地図を閉じる");
    closeButton.textContent = "×";
    header.append(titleWrap, keyHint, closeButton);

    const body = document.createElement("div");
    body.className = "voxcel-map-body";
    const stage = document.createElement("div");
    stage.className = "voxcel-map-stage";
    const svg = svgElement("svg", {
      class: "voxcel-map-svg",
      role: "img",
      "aria-labelledby": "voxcelMapSvgTitle voxcelMapSvgDescription",
      preserveAspectRatio: "xMidYMid meet",
    });
    const svgTitle = svgElement("title", { id: "voxcelMapSvgTitle" });
    svgTitle.textContent = "街の施設と現在地";
    const svgDescription = svgElement("desc", { id: "voxcelMapSvgDescription" });
    svgDescription.textContent = "北を上にして、道路、店舗、施設、公園、現在地と向きを表示します。";
    const backgroundGroup = svgElement("g");
    const roadGroup = svgElement("g", { "aria-hidden": "true" });
    const locationGroup = svgElement("g");
    const dynamicGroup = svgElement("g", { "aria-hidden": "true" });
    const playerMarker = svgElement("g");
    const playerHalo = svgElement("circle", {
      cx: 0,
      cy: 0,
      r: 5.5,
      fill: "rgba(255,255,255,.9)",
      stroke: "rgba(9,16,30,.8)",
      "stroke-width": 1.2,
    });
    const playerArrow = svgElement("path", {
      d: "M 0 5 L -3.5 -3.8 L 0 -1.8 L 3.5 -3.8 Z",
      fill: "#ff5f68",
      stroke: "#781e2a",
      "stroke-width": 0.9,
      "stroke-linejoin": "round",
    });
    playerMarker.append(playerHalo, playerArrow);
    const currentSvgLabel = svgElement("text", { class: "voxcel-map-current-label" });
    currentSvgLabel.textContent = "現在地";
    dynamicGroup.append(playerMarker, currentSvgLabel);
    svg.append(svgTitle, svgDescription, backgroundGroup, roadGroup, locationGroup, dynamicGroup);

    const compass = document.createElement("div");
    compass.className = "voxcel-map-compass";
    compass.textContent = "N";
    compass.setAttribute("aria-hidden", "true");
    const selection = document.createElement("div");
    selection.className = "voxcel-map-selection";
    selection.textContent = "施設を選ぶと距離を表示します";
    stage.append(svg, compass, selection);

    const sidebar = document.createElement("aside");
    sidebar.className = "voxcel-map-sidebar";
    const sidebarTitle = document.createElement("h3");
    sidebarTitle.textContent = "店舗・施設一覧";
    const list = document.createElement("div");
    list.className = "voxcel-map-list";
    list.setAttribute("aria-label", "店舗・施設一覧");
    sidebar.append(sidebarTitle, list);
    body.append(stage, sidebar);
    dialog.append(header, body);
    overlay.append(dialog);
    document.body.append(overlay);

    return {
      overlay,
      dialog,
      closeButton,
      currentText,
      svg,
      backgroundGroup,
      roadGroup,
      locationGroup,
      dynamicGroup,
      playerMarker,
      currentSvgLabel,
      selection,
      list,
      shapeById: new Map(),
      listButtonById: new Map(),
      distanceById: new Map(),
    };
  }

  function addRoadRect(group, attributes) {
    group.append(svgElement("rect", {
      ...attributes,
      fill: "#4a5660",
      stroke: "#7c858c",
      "stroke-width": 1.2,
    }));
  }

  function rebuildExpandedMap(roads = getRoads()) {
    const ui = runtime.ui;
    if (!ui) return;
    const bounds = runtime.bounds;
    ui.svg.setAttribute("viewBox", `${bounds.x} ${bounds.z} ${bounds.width} ${bounds.height}`);
    ui.backgroundGroup.replaceChildren();
    ui.roadGroup.replaceChildren();
    ui.locationGroup.replaceChildren();
    ui.list.replaceChildren();
    ui.shapeById.clear();
    ui.listButtonById.clear();
    ui.distanceById.clear();

    ui.backgroundGroup.append(svgElement("rect", {
      x: bounds.x,
      y: bounds.z,
      width: bounds.width,
      height: bounds.height,
      fill: "#294439",
    }));

    const roadWidth = roads.width;
    // Radial roads stop at the outermost loop line instead of running off the map edge.
    const outerRing = roads.rings.reduce(
      (limit, ring) => Math.max(limit, ring.radius + ring.width / 2),
      0,
    );
    const spanZ = outerRing ? -outerRing : bounds.z;
    const spanHeight = outerRing ? outerRing * 2 : bounds.height;
    const spanX = outerRing ? -outerRing : bounds.x;
    const spanWidth = outerRing ? outerRing * 2 : bounds.width;
    for (const x of roads.x) {
      addRoadRect(ui.roadGroup, {
        x: x - roadWidth / 2,
        y: spanZ,
        width: roadWidth,
        height: spanHeight,
      });
    }
    for (const z of roads.z) {
      addRoadRect(ui.roadGroup, {
        x: spanX,
        y: z - roadWidth / 2,
        width: spanWidth,
        height: roadWidth,
      });
    }
    for (const ring of roads.rings) {
      ui.roadGroup.append(svgElement("rect", {
        x: -ring.radius,
        y: -ring.radius,
        width: ring.radius * 2,
        height: ring.radius * 2,
        rx: ring.width,
        fill: "none",
        stroke: "#4a5660",
        "stroke-width": ring.width,
      }));
      ui.roadGroup.append(svgElement("rect", {
        x: -ring.radius,
        y: -ring.radius,
        width: ring.radius * 2,
        height: ring.radius * 2,
        rx: ring.width,
        fill: "none",
        stroke: "#7c858c",
        "stroke-width": 1.2,
        "stroke-dasharray": "6 5",
      }));
    }
    for (const x of roads.x) {
      for (const z of roads.z) {
        ui.roadGroup.append(svgElement("rect", {
          x: x - roadWidth / 2 + 1.1,
          y: z - roadWidth / 2 + 1.1,
          width: roadWidth - 2.2,
          height: roadWidth - 2.2,
          rx: 1,
          fill: "#56636d",
        }));
      }
    }

    const centerX = bounds.x + bounds.width / 2;
    const drawOrder = [...runtime.locations].sort((a, b) => {
      if (a.type === "park" && b.type !== "park") return -1;
      if (b.type === "park" && a.type !== "park") return 1;
      return 0;
    });

    for (const location of drawOrder) {
      const group = svgElement("g", {
        class: "voxcel-map-location-shape",
        tabindex: 0,
        role: "button",
        "aria-label": `${location.emoji} ${location.name}、${location.category}`,
        "data-map-location": location.id,
      });
      const shape = svgElement("rect", {
        class: "voxcel-map-building",
        x: location.x - location.w / 2,
        y: location.z - location.d / 2,
        width: location.w,
        height: location.d,
        rx: location.type === "park" ? 3.2 : 1.5,
        fill: location.color,
        stroke: location.type === "park" ? "#84c78d" : "rgba(255,255,255,.62)",
        "stroke-width": 1.1,
      });
      const icon = svgElement("text", {
        class: "voxcel-map-icon",
        x: location.x,
        y: location.z,
      });
      icon.textContent = location.emoji;

      const placeLabelAbove = location.type === "park";
      // The two dense shop/service columns sit immediately west of the office
      // tower. Put their labels on the west side while the tower label extends
      // eastward; this keeps neighboring labels from meeting in the middle.
      const denseEasternColumn = location.x >= 20 && location.x < 90;
      const farEasternColumn = location.x >= 90;
      const labelOnLeft = denseEasternColumn || (!farEasternColumn && location.x < centerX);
      const labelX = placeLabelAbove
        ? location.x
        : labelOnLeft
          ? location.x - location.w / 2 - 2.5
          : location.x + location.w / 2 + 2.5;
      const labelZ = placeLabelAbove ? location.z - location.d / 2 - 4 : location.z;
      const label = svgElement("text", {
        class: "voxcel-map-label",
        x: labelX,
        y: labelZ,
        "text-anchor": placeLabelAbove ? "middle" : labelOnLeft ? "end" : "start",
        "dominant-baseline": "central",
      });
      label.textContent = SVG_SHORT_LABELS[location.id] || location.name;
      group.append(shape, icon, label);

      if (location.floors && location.floors > 1) {
        const floorBadge = svgElement("text", {
          class: "voxcel-map-floor-badge",
          x: location.x,
          y: location.z + Math.min(location.d / 2 - 1.4, 5.5),
        });
        floorBadge.textContent = `${location.floors}F`;
        group.append(floorBadge);
      }

      group.addEventListener("click", () => selectLocation(location.id));
      group.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectLocation(location.id);
      });
      ui.locationGroup.append(group);
      ui.shapeById.set(location.id, group);
    }

    for (const location of runtime.locations) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "voxcel-map-location-button";
      button.dataset.mapLocation = location.id;
      button.setAttribute("aria-label", `${location.emoji} ${location.name}を地図で確認`);
      const emoji = document.createElement("span");
      emoji.className = "voxcel-map-location-emoji";
      emoji.textContent = location.emoji;
      const copy = document.createElement("span");
      copy.className = "voxcel-map-location-copy";
      const name = document.createElement("span");
      name.className = "voxcel-map-location-name";
      name.textContent = location.name;
      const type = document.createElement("span");
      type.className = "voxcel-map-location-type";
      type.textContent = location.floors
        ? `${location.category}・${location.floors}階建て`
        : location.category;
      copy.append(name, type);
      const distance = document.createElement("span");
      distance.className = "voxcel-map-location-distance";
      distance.textContent = "--m";
      button.append(emoji, copy, distance);
      button.addEventListener("click", () => selectLocation(location.id));
      ui.list.append(button);
      ui.listButtonById.set(location.id, button);
      ui.distanceById.set(location.id, distance);
    }

    updateSelectionStyles();
    updateCurrentLocation();
  }

  function safeOfficeState() {
    for (const candidate of [window.__voxcelOffice, window.__voxcelOfficeBuilding]) {
      if (!candidate) continue;
      try {
        return typeof candidate.getState === "function" ? candidate.getState() : candidate.state ?? candidate;
      } catch {
        // An office system may still be initializing. The next dynamic sync retries it.
      }
    }
    return null;
  }

  function officeFloor(officeState) {
    if (!officeState) return null;
    for (const value of [
      officeState.currentFloor,
      officeState.activeFloor,
      officeState.floor,
      officeState.level,
      officeState.elevator?.currentFloor,
    ]) {
      const floor = finiteNumber(value);
      if (floor !== null) return Math.max(1, Math.round(floor));
    }
    return null;
  }

  function computeCurrentLocation() {
    const handle = getHandle();
    const playerRoot = handle?.playerRoot;
    if (!playerRoot?.position) {
      return {
        x: 0,
        z: 0,
        heading: 0,
        inside: false,
        insideBuildingId: null,
        id: null,
        floor: null,
        label: "現在地を確認中…",
      };
    }

    const appState = handle.state || {};
    const officeState = safeOfficeState();
    let insideBuildingId = appState.insideBld?.id ?? runtime.enhancementState?.buildingId ?? null;
    if (!insideBuildingId && typeof appState.loc === "string" && runtime.locationById.has(appState.loc)) {
      insideBuildingId = appState.loc;
    }
    if (
      !insideBuildingId &&
      officeState &&
      (
        officeState.insideOffice === true ||
        officeState.inside === true ||
        officeState.active === true ||
        officeState.buildingId === "office"
      )
    ) {
      insideBuildingId = "office";
    }

    const insideLocation = insideBuildingId
      ? runtime.locationById.get(String(insideBuildingId)) || null
      : null;
    const floor = insideBuildingId === "office" ? officeFloor(officeState) : null;
    const heading = finiteNumber(playerRoot.rotation?.y, 0);
    const x = insideLocation ? insideLocation.x : finiteNumber(playerRoot.position.x, 0);
    const z = insideLocation ? insideLocation.z : finiteNumber(playerRoot.position.z, 0);
    let label = "現在地";
    if (insideLocation) {
      label = `${insideLocation.emoji} ${insideLocation.name}（${floor ? `${floor}階` : "建物内"}）`;
    }

    return {
      x,
      z,
      heading,
      inside: Boolean(insideLocation),
      insideBuildingId: insideLocation?.id ?? null,
      id: insideLocation?.id ?? null,
      floor,
      label,
    };
  }

  function formatDistance(distance) {
    if (!Number.isFinite(distance)) return "--m";
    if (distance < 1) return "<1m";
    return `${Math.round(distance)}m`;
  }

  function updateCurrentLocation() {
    const ui = runtime.ui;
    const current = computeCurrentLocation();
    runtime.current = current;
    if (!ui) return current;

    const headingDegrees = current.heading * (180 / Math.PI);
    ui.playerMarker.setAttribute(
      "transform",
      `translate(${current.x} ${current.z}) rotate(${headingDegrees})`,
    );
    ui.currentSvgLabel.setAttribute("x", current.x + 6.5);
    ui.currentSvgLabel.setAttribute("y", current.z - 6.5);
    ui.currentText.textContent = `📍 ${current.label}`;

    for (const location of runtime.locations) {
      const distance = Math.hypot(location.x - current.x, location.z - current.z);
      const distanceElement = ui.distanceById.get(location.id);
      if (distanceElement) distanceElement.textContent = formatDistance(distance);
      const button = ui.listButtonById.get(location.id);
      button?.classList.toggle("is-current", current.insideBuildingId === location.id);
      if (button) {
        if (current.insideBuildingId === location.id) button.setAttribute("aria-current", "location");
        else button.removeAttribute("aria-current");
      }
    }

    updateSelectionStyles();
    return current;
  }

  function updateSelectionStyles() {
    const ui = runtime.ui;
    if (!ui) return;
    for (const [id, shape] of ui.shapeById) {
      shape.classList.toggle("is-selected", id === runtime.selectedId);
    }
    for (const [id, button] of ui.listButtonById) {
      button.classList.toggle("is-selected", id === runtime.selectedId);
      button.setAttribute("aria-pressed", String(id === runtime.selectedId));
    }

    const selected = runtime.selectedId ? runtime.locationById.get(runtime.selectedId) : null;
    const current = runtime.current || computeCurrentLocation();
    if (!selected) {
      ui.selection.textContent = "施設を選ぶと距離を表示します";
      return;
    }
    const distance = Math.hypot(selected.x - current.x, selected.z - current.z);
    const floors = selected.floors ? `・${selected.floors}階建て` : "";
    ui.selection.textContent = `${selected.emoji} ${selected.name}・${selected.category}${floors}・現在地から${formatDistance(distance)}`;
  }

  function selectLocation(id) {
    const normalizedId = String(id);
    if (!runtime.locationById.has(normalizedId)) return false;
    runtime.selectedId = normalizedId;
    updateSelectionStyles();
    runtime.ui?.listButtonById.get(normalizedId)?.scrollIntoView({ block: "nearest" });
    return true;
  }

  function started() {
    try {
      const sample = window.__voxcelTest?.sample?.();
      if (typeof sample?.started === "boolean") return sample.started;
    } catch {
      // Fall back to title-screen visibility.
    }
    const title = document.getElementById("tS");
    return !title || getComputedStyle(title).display === "none";
  }

  function canOpenMap() {
    if (!runtime.mounted || !started()) return false;
    if (document.getElementById("mO")?.classList.contains("show")) return false;
    if (document.getElementById("arrestOv")?.classList.contains("show")) return false;
    return true;
  }

  function releaseMovementKeys() {
    for (const key of ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] ) {
      window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
    }
  }

  function releaseControlPointers() {
    for (const pointer of [...activeControlPointers.values()]) {
      let event;
      if (typeof PointerEvent === "function") {
        event = new PointerEvent("pointercancel", {
          bubbles: true,
          pointerId: pointer.pointerId,
          pointerType: pointer.pointerType,
          clientX: pointer.clientX,
          clientY: pointer.clientY,
        });
      } else {
        event = new Event("pointercancel", { bubbles: true });
        Object.defineProperty(event, "pointerId", { value: pointer.pointerId });
      }
      (pointer.target?.isConnected ? pointer.target : window).dispatchEvent(event);
    }
    activeControlPointers.clear();
  }

  function openMap() {
    if (runtime.open) return true;
    if (!canOpenMap()) return false;
    syncLocations(true);
    updateCurrentLocation();
    releaseMovementKeys();
    releaseControlPointers();
    document.exitPointerLock?.();

    runtime.previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    runtime.open = true;
    runtime.ui.overlay.hidden = false;
    runtime.ui.overlay.setAttribute("aria-hidden", "false");
    runtime.ui.trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("voxcel-map-open");
    requestAnimationFrame(() => runtime.ui?.closeButton.focus({ preventScroll: true }));
    return true;
  }

  function closeMap() {
    if (!runtime.open) return false;
    const focusTarget = runtime.previousFocus?.isConnected
      ? runtime.previousFocus
      : runtime.ui.trigger;
    runtime.previousFocus = null;
    focusTarget?.focus?.({ preventScroll: true });
    if (runtime.ui.overlay.contains(document.activeElement)) {
      runtime.ui.trigger.focus({ preventScroll: true });
    }
    runtime.open = false;
    runtime.ui.overlay.hidden = true;
    runtime.ui.overlay.setAttribute("aria-hidden", "true");
    runtime.ui.trigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("voxcel-map-open");
    return true;
  }

  function toggleMap() {
    return runtime.open ? closeMap() : openMap();
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || !runtime.open) return false;
    const focusable = [...runtime.ui.dialog.querySelectorAll(
      'button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.hidden && element.getClientRects().length > 0);
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function handleGlobalKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const isMapKey = key === "m" || event.code === "KeyM";

    if (!runtime.open) {
      if (!isMapKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) openMap();
      return;
    }

    if (trapFocus(event)) {
      event.stopImmediatePropagation();
      return;
    }
    if (key === "escape" || isMapKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) closeMap();
      return;
    }
    if (BLOCKED_GAME_KEYS.has(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function trackControlPointer(event) {
    const target = event.target instanceof Element
      ? event.target.closest("#movePad,#lookPad")
      : null;
    if (!target) return;
    activeControlPointers.set(event.pointerId, {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY,
      target,
    });
  }

  function clearControlPointer(event) {
    activeControlPointers.delete(event.pointerId);
  }

  function refreshEnhancementState() {
    try {
      runtime.enhancementState = window.__voxcelEnhancements?.getState?.() ?? null;
    } catch {
      runtime.enhancementState = null;
    }
  }

  function dispatchReadyEvent() {
    if (runtime.readyEventSent) return;
    runtime.readyEventSent = true;
    window.dispatchEvent(new CustomEvent("voxcel:mapready", {
      detail: { version: SYSTEM_VERSION },
    }));
  }

  function maintenanceTick() {
    const now = performance.now();
    const handle = getHandle();
    if (!runtime.ready && handle?.playerRoot && Array.isArray(handle.buildings)) {
      runtime.ready = true;
      runtime.reason = null;
      syncLocations(true);
      dispatchReadyEvent();
    }
    if (now - runtime.lastStaticSync >= STATIC_SYNC_INTERVAL) {
      runtime.lastStaticSync = now;
      refreshEnhancementState();
      syncLocations();
    }
    if (runtime.open && now - runtime.lastDynamicSync >= DYNAMIC_SYNC_INTERVAL) {
      runtime.lastDynamicSync = now;
      updateCurrentLocation();
    }
  }

  function mount() {
    if (runtime.mounted) return;
    const container = document.getElementById("mmC");
    const canvas = document.getElementById("mmV");
    if (!container || !canvas) {
      runtime.reason = "mini-map-dom-missing";
      window.setTimeout(mount, 50);
      return;
    }

    injectStyles();
    const trigger = createMiniMapTrigger(container, canvas);
    const expanded = createExpandedMap();
    runtime.ui = { ...expanded, trigger };
    runtime.mounted = true;
    runtime.reason = "runtime-bridge-pending";

    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openMap();
    });
    expanded.closeButton.addEventListener("click", closeMap);
    expanded.overlay.addEventListener("click", (event) => {
      if (event.target === expanded.overlay) closeMap();
    });
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    window.addEventListener("pointerdown", trackControlPointer, true);
    window.addEventListener("pointerup", clearControlPointer, true);
    window.addEventListener("pointercancel", clearControlPointer, true);

    syncLocations(true);
    updateCurrentLocation();
    maintenanceTick();
    runtime.timer = window.setInterval(maintenanceTick, 50);
  }

  function getState() {
    syncLocations();
    const current = computeCurrentLocation();
    runtime.current = current;
    return {
      ready: runtime.ready,
      reason: runtime.reason,
      version: SYSTEM_VERSION,
      open: runtime.open,
      selectedId: runtime.selectedId,
      locationCount: runtime.locations.length,
      locations: runtime.locations.map(cloneLocation),
      current: { ...current },
      bounds: { ...runtime.bounds },
      mounted: runtime.mounted,
    };
  }

  const api = {
    __cityMapSystem: true,
    version: SYSTEM_VERSION,
    open: openMap,
    close: closeMap,
    toggle: toggleMap,
    select: selectLocation,
    registerLocation,
    unregisterLocation,
    refresh() {
      refreshEnhancementState();
      syncLocations(true);
      updateCurrentLocation();
      return getState();
    },
    getState,
  };
  Object.defineProperties(api, {
    ready: { enumerable: true, get: () => runtime.ready },
    isOpen: { enumerable: true, get: () => runtime.open },
  });
  window.__voxcelMap = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
