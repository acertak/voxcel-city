(() => {
  "use strict";

  if (window.__voxcelAthletics?.ready) return;

  const SYSTEM_VERSION = 3;
  const GROUND_SURFACE_Y = 0.01;
  const PLAYER_FOOT_OFFSET = 1.19;
  const PLAYER_GROUND_Y = GROUND_SURFACE_Y + PLAYER_FOOT_OFFSET;
  const PLAYER_RADIUS = 0.42;
  const GRAVITY = 19.5;
  const JUMP_VELOCITY = 8.7;
  const WALK_SPEED = 7.4;
  const SPRINT_SPEED = 11.2;
  const ACTION_DISTANCE = 4.1;
  const CLEAR_BOUNDS = Object.freeze({ minX: -136, maxX: -48, minZ: 80, maxZ: 132 });
  const FACILITY = Object.freeze({
    id: "greenia-voxcel-adventure",
    legacyId: "sky-water-athletic",
    name: "GREENIA VOXCEL ADVENTURE",
    x: -254,
    z: 254,
    w: 412,
    d: 352,
    bounds: Object.freeze({ minX: -460, maxX: -48, minZ: 78, maxZ: 430 }),
    entrance: Object.freeze({ x: -92, y: PLAYER_GROUND_Y, z: 83.5 }),
  });
  const REMOVED_LANDMARKS = Object.freeze([
    Object.freeze({ id: "southwest-tower-west", x: -110, z: 112, w: 14, d: 12, h: 30 }),
    Object.freeze({ id: "southwest-tower-east", x: -84, z: 118, w: 20, d: 16, h: 42 }),
  ]);

  const AREA_DEFINITIONS = Object.freeze([
    Object.freeze({
      id: "mt-kingdom",
      short: "KINGDOM",
      name: "Mt.Kingdom",
      japanese: "ロールプレイング王国",
      color: "#7857c7",
      icon: "🏰",
      officialPoints: 31,
      yaw: Math.PI,
      start: Object.freeze({ x: -92, y: PLAYER_GROUND_Y, z: 134 }),
      samples: Object.freeze(["キングダムの城門", "城壁ボルダリング", "ジグザグロード", "GREENIA Dragon"]),
    }),
    Object.freeze({
      id: "chibidoland",
      short: "CHIBIDO",
      name: "Chibidoland",
      japanese: "ちびっこ冒険広場",
      color: "#ff7d9a",
      icon: "🌈",
      officialPoints: 12,
      yaw: -Math.PI / 2,
      start: Object.freeze({ x: -131, y: PLAYER_GROUND_Y, z: 101 }),
      samples: Object.freeze([
        "ミニうんてい",
        "パワーショベルでの挑戦！",
        "三角ネットトンネル",
        "壁越えミニボルダリング",
        "ウェーブな平均台",
        "ハシゴときづちでカンカンカン",
        "わなげチャレンジ",
        "ボール投げチャレンジ",
        "小さな小屋",
        "〇×わたり",
        "〇▢△ステップ",
        "ミニスライダー",
      ]),
    }),
    Object.freeze({
      id: "wonder-amembo",
      short: "AMEMBO",
      name: "wonder amembo",
      japanese: "水上アスレチック",
      color: "#27bfe2",
      icon: "💦",
      officialPoints: 34,
      yaw: Math.PI / 2,
      start: Object.freeze({ x: -170, y: 0.48 + PLAYER_FOOT_OFFSET, z: 112 }),
      samples: Object.freeze(["透明！スーパースパイダーウォーク", "ぷかぷかアイランド", "3秒の壁", "白熱！水面ダッシュ"]),
    }),
    Object.freeze({
      id: "yahhoy",
      short: "YAHHOY",
      name: "yahhoy",
      japanese: "バラエティアスレチック",
      color: "#f3ca43",
      icon: "🎯",
      officialPoints: 29,
      yaw: -Math.PI / 2,
      start: Object.freeze({ x: -298, y: PLAYER_GROUND_Y, z: 181 }),
      samples: Object.freeze(["シーソーを渡り歩いて", "ゴロゴロドラム缶渡り", "ポールラビリンス", "そりたつカベのてっぺんで"]),
    }),
    Object.freeze({
      id: "de-kairiki",
      short: "KAIRIKI",
      name: "de kairiki",
      japanese: "マッスルアスレチック",
      color: "#ef6848",
      icon: "💪",
      officialPoints: 20,
      yaw: Math.PI,
      start: Object.freeze({ x: -104, y: PLAYER_GROUND_Y, z: 208 }),
      samples: Object.freeze(["スーパー階段アスレチック", "ロープの森", "大きな砦のてっぺんで", "あの鐘を鳴らすのは"]),
    }),
    Object.freeze({
      id: "mecya-forest",
      short: "FOREST",
      name: "mecya forest",
      japanese: "森の空中アスレチック",
      color: "#3ca86f",
      icon: "🌲",
      officialPoints: 37,
      yaw: Math.PI / 2,
      start: Object.freeze({ x: -171, y: PLAYER_GROUND_Y, z: 250 }),
      samples: Object.freeze(["ジグザグクロッシング", "スパイダーズウェブ", "ネットトンネル", "ログスイング"]),
    }),
    Object.freeze({
      id: "mt-king",
      short: "MT.KING",
      name: "mt. king",
      japanese: "アクティビティスポーツ",
      color: "#76c94c",
      icon: "⛰️",
      officialPoints: 3,
      yaw: -2.35,
      cameraPitch: 0.82,
      cameraDistance: 28,
      start: Object.freeze({ x: -106, y: PLAYER_GROUND_Y, z: 288 }),
      samples: Object.freeze(["トランポリン", "芝すべり", "ペダルボート"]),
    }),
    Object.freeze({
      id: "zip-slide",
      short: "ZIP",
      name: "zip slide",
      japanese: "ロングジップスライド",
      color: "#ff9f32",
      icon: "🪂",
      officialPoints: 2,
      yaw: Math.PI / 2,
      start: Object.freeze({ x: -448, y: 12.4 + PLAYER_FOOT_OFFSET, z: 225 }),
      samples: Object.freeze(["ロングジップスライド（行き）", "ロングジップスライド（帰り）"]),
    }),
  ]);

  const OFFICIAL_SOURCE_SLUGS = Object.freeze({
    chibidoland: Object.freeze([
      "ch01", "パワーショベルでの挑戦！", "三角ネットトンネル", "壁越えミニボルダリン-グ", "ウェーブな平均台",
      "ハシゴときづちでカンカ-ンカン", "わなげチャレンジ", "ボール投げチャレンジ", "小さな小屋", "〇xわたり",
      "〇x△ステップ", "ミニスライダー",
    ]),
    yahhoy: Object.freeze([
      "ya01", "ya02", "ya03", "ya04", "ya05", "ya06", "ya07", "ya08", "3787-2", "ya10",
      "ya11", "ya12", "ya13", "ya14", "ya15", "ya16", "ya17", "ya18", "ya19", "白熱！フリスビーシュー-ター",
      "ya20", "ya21", "木壁横断チャレンジ", "カップインの試練", "でこぼこブリッジ", "ya25", "ya28", "ya29", "ya30",
    ]),
    "wonder-amembo": Object.freeze([
      "wa01", "wa02", "wa03", "wa04", "wa05", "wa06", "wa07", "wa08", "wa09", "wa10", "wa11", "wa12", "wa13", "wa14", "wa15",
      "3秒の壁", "wa16", "手押しどすこいバトル", "wa17", "wa18", "wa19", "絶壁ボルダリング", "wa20", "wa21", "wa22", "wa23", "wa24", "wa25", "wa26", "wa27", "wa28", "白熱！水面ダッシュ", "wa29", "wa30",
    ]),
    "mt-king": Object.freeze(["mt01", "mt03", "mt04"]),
  });

  function officialAttractions(areaId, prefix, names) {
    return Object.freeze(names.map((name, index) => Object.freeze({
      areaId,
      number: index + 1,
      officialId: `${prefix}${String(index + 1).padStart(2, "0")}`,
      name,
      sourceUrl: `https://www.rokkosan.com/greenia/athletic/${areaId.replaceAll("-", "_")}/${encodeURIComponent(OFFICIAL_SOURCE_SLUGS[areaId]?.[index] || `${prefix}${String(index + 1).padStart(2, "0")}`)}/`,
    })));
  }

  const OFFICIAL_ATTRACTIONS = Object.freeze({
    "mt-kingdom": officialAttractions("mt-kingdom", "ki", [
      "キングダムの城門", "小さな砦の頂へ", "お城の傾斜", "城壁ボルダリング", "冒険者の城壁渡り", "秘密の脱出路",
      "秘密のツリーハウス", "天空への螺旋階段", "引き抜け！王国の剣", "引き寄せろ！怪力の試練", "魅せろ！運命の一打",
      "渡り切れ！ジグザグロード", "揺れるリングロード", "魔境の鉄棒", "ネットダンジョン", "魔王の浮遊壁",
      "英雄の鍛錬場～高みへ届く者～", "飛ばせ！冒険者の一撃", "幻影のロープ迷宮", "雷神の試練",
      "乗り越えろ！立ちはだかる壁", "解き放て！運命の一本", "癒しのブランコ", "試練のトンネル",
      "渡り切れ！勇者への道", "魅せろ！異次元のジャンプ", "疾風の道～斜面を蹴り進め～", "進め！バランスロード",
      "冒険者のロープ渡り", "GREENIA Dragon", "魂の一撃",
    ]),
    chibidoland: officialAttractions("chibidoland", "ch", [
      "ミニうんてい", "パワーショベルでの挑戦！", "三角ネットトンネル", "壁越えミニボルダリング", "ウェーブな平均台",
      "ハシゴときづちでカンカンカン", "わなげチャレンジ", "ボール投げチャレンジ", "小さな小屋", "〇×わたり",
      "〇▢△ステップ", "ミニスライダー",
    ]),
    yahhoy: officialAttractions("yahhoy", "ya", [
      "長い長いうんてい", "シーソーを渡り歩いて", "スーパーぶらさがりボード", "ナマケモノの気分", "3つのカベを乗り越えて",
      "スーパー吊り輪祭り", "ゴロゴロドラム缶渡り", "スーパーパイプスライダー", "ネットに向かって", "グルグル巨大ありじごく",
      "無数のポールラビリンス", "ゲームの中に飛び込んで", "2人プレイで帆を上げろ！", "スーパー壁キック", "遊べ！巨大滑り台",
      "山あり谷あり", "そりたつカベのてっぺんで", "ダブルボールスライダー", "白熱！パチンコシューター",
      "白熱！フリスビーシューター", "白熱！坂道シュート", "白熱！坂道ピッチング", "木壁横断チャレンジ",
      "カップインの試練", "でこぼこブリッジ", "つりあげろ！オオモノのよかん", "モグラのきぶん",
      "あっちこっちボール迷路", "白熱！バンクボウリング",
    ]),
    "wonder-amembo": officialAttractions("wonder-amembo", "wa", [
      "透明！スーパースパイダーウォーク", "駆け抜けて一本橋", "ゆらゆら揺れる無限の輪", "長い長い水上うんてい",
      "ハンモックにストーン", "上がって下がって丸太橋", "忍者の気分", "ジグザグ丸太でカニ歩き", "巨大ネットの壁",
      "イカダが沈む前に", "選べ！運命の分かれ道", "丸太ブランコを渡って", "ぷかぷかアイランド", "ぐらぐら吊り橋を渡って",
      "ダブルボールスライダー2", "3秒の壁", "ぐらぐらアイランド", "手押しどすこいバトル", "クモの巣を登って下って",
      "跳べ！ぷかぷかアイランド", "ナマケモノの気分2", "絶壁ボルダリング", "イカダが沈む前に2", "水上綱渡り",
      "遊べ！水上滑り台", "吊られた丸太を渡って", "進め！ロープジャングル", "しがみつけ！立ちはだかる壁",
      "ネットブランコで空中散歩", "かくかくシカク 四角い木枠", "一寸法師の気分", "白熱！水面ダッシュ",
      "冷たい池を飛び越えて", "駆けろ！スーパージャンプ",
    ]),
    "de-kairiki": officialAttractions("de-kairiki", "de", [
      "坂道を駆けあがって", "らせん階段を上って", "握力の限界を超えて", "くるくるボールを渡って", "ロープの森",
      "宙に浮く竹馬", "スーパー階段アスレチック", "グラグラ足場を渡って", "立ち乗りスライダー", "ゴツゴツ山を越えて",
      "大きな砦のてっぺんで", "スーパーぐるぐるハンドル", "グラグラ丸太橋", "スーパー救助訓練", "スーパー崖つかまり",
      "大きな丸太を持ち上げて", "スーパーリングアクション", "空飛ぶ丸太ブランコ", "斜めパイプをつたって", "あの鐘を鳴らすのは",
    ]),
    "mecya-forest": officialAttractions("mecya-forest", "me", [
      "ミラーズステアケース", "ハイチベタン", "ジグザグクロッシング", "グランパブリッジ", "ジップスライド",
      "ミラーズステアケース", "レールトラック", "ジップスライド", "ミラーズステアケース", "シャッフル",
      "ハーフトラペッツェ", "イングリッシュクロッシング", "ハイフェアリーブリッジ", "ジップスライド", "ミラーズステアケース",
      "フジクロッシング", "ヴィクトリアブリッジ", "スパイダーズウェブ", "ジップスライド", "ミラーズステアケース",
      "アイランドホッピング", "ハーフシャモニークロッシング", "モンタリベールクロッシング", "チベタンブリッジ", "ネットトンネル",
      "べドックブリッジ", "スモールステッピングストーン", "ジップスライド", "ミラーズステアケース", "ログスイング",
      "ゴートクロッシング", "ネットキャニオン", "タロワール", "ネットブリッジ", "ハーフウォーターリリー", "ハイチベタン", "ジップスライド",
    ]),
    "mt-king": officialAttractions("mt-king", "mt", ["トランポリン", "芝すべり", "ペダルボート"]),
    "zip-slide": officialAttractions("zip-slide", "zi", ["ロングジップスライド（行き）", "ロングジップスライド（帰り）"]),
  });

  const ALL_OFFICIAL_ATTRACTIONS = Object.freeze(Object.values(OFFICIAL_ATTRACTIONS).flat());

  const RESEARCH_SUMMARY = Object.freeze({
    season: 2026,
    officialAreaCount: 8,
    officialTotalPoints: 168,
    representedAreaCount: AREA_DEFINITIONS.length,
    representedAttractions: ALL_OFFICIAL_ATTRACTIONS.length,
    areas: AREA_DEFINITIONS.map((area) => Object.freeze({
      id: area.id,
      name: area.name,
      officialPoints: area.officialPoints,
      samples: [...area.samples],
      representedPoints: OFFICIAL_ATTRACTIONS[area.id].length,
    })),
  });

  const state = {
    ready: false,
    reason: "initializing",
    initializedAt: 0,
    removedBuildingCount: 0,
    removedObjectCount: 0,
    clearedSceneryCount: 0,
    meshCount: 0,
    solidMeshCount: 0,
    decorativeMeshCount: 0,
    materialCount: 0,
    textureCount: 0,
    animationCount: 0,
    dynamicPlatformCount: 0,
    hazardCount: 0,
    surfaceCount: 0,
    blockerCount: 0,
    officialAttractionCount: 0,
    officialAttractionMeshCount: 0,
    mapRegistered: false,
    roles: new Set(),
    roleCounts: new Map(),
  };

  const gameplay = {
    active: false,
    mode: "idle",
    keys: new Set(),
    jumpQueued: false,
    velocityX: 0,
    velocityZ: 0,
    velocityY: 0,
    grounded: true,
    currentSurfaceId: "ground",
    checkpoint: { ...FACILITY.entrance, id: "entrance", areaId: null, index: 0 },
    activeAreaId: null,
    nearestInteractionId: null,
    lastUpdateAt: 0,
    distanceTravelled: 0,
    jumpCount: 0,
    fallCount: 0,
    respawnCount: 0,
    lastRespawnReason: null,
    respawnAt: 0,
    completedAreas: new Set(),
    areaRuns: new Map(),
    ride: null,
    ziplineProgress: null,
    audioContext: null,
  };

  let handle = null;
  let constructors = null;
  let root = null;
  let actionButton = null;
  let hud = null;
  let mobileControls = null;
  let unregisterBeforeRender = null;
  let lastNearestActionSignature = "";
  const materials = {};
  const ownedTextures = new Set();
  const removedObjects = [];
  const surfaces = [];
  const hazards = [];
  const blockers = [];
  const interactions = [];
  const animations = [];
  const geometryCache = new Map();
  const routeDefinitions = new Map();
  const checkpointVisualsByArea = new Map();
  const officialRepresentations = [];
  const waterTextures = [];
  const animatedFlags = [];
  const dynamicSurfaces = [];
  const sparkleParticles = [];
  const managedClouds = [];

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeInOut(amount) {
    const value = clamp(amount, 0, 1);
    return value * value * (3 - 2 * value);
  }

  function distance3d(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
  }

  function closeTo(value, expected, epsilon = 0.04) {
    return Math.abs(finite(value) - expected) <= epsilon;
  }

  function pointInsideBounds(position, bounds, inset = 0) {
    return Boolean(
      position &&
      position.x >= bounds.minX + inset &&
      position.x <= bounds.maxX - inset &&
      position.z >= bounds.minZ + inset &&
      position.z <= bounds.maxZ - inset
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

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
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
      SphereGeometry: null,
      TorusGeometry: null,
      Material: null,
      Texture: null,
      referenceTexture: null,
    };
    handle.scene.traverse((object) => {
      if (!found.Mesh && object.isMesh) found.Mesh = object.constructor;
      const geometry = object.geometry;
      if (geometry?.type === "BoxGeometry" && !found.BoxGeometry) found.BoxGeometry = geometry.constructor;
      if (geometry?.type === "PlaneGeometry" && !found.PlaneGeometry) found.PlaneGeometry = geometry.constructor;
      if (geometry?.type === "CylinderGeometry" && !found.CylinderGeometry) found.CylinderGeometry = geometry.constructor;
      if (geometry?.type === "ConeGeometry" && !found.ConeGeometry) found.ConeGeometry = geometry.constructor;
      if (geometry?.type === "SphereGeometry" && !found.SphereGeometry) found.SphereGeometry = geometry.constructor;
      if (geometry?.type === "TorusGeometry" && !found.TorusGeometry) found.TorusGeometry = geometry.constructor;
      const candidates = Array.isArray(object.material) ? object.material : [object.material];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (!found.Material && candidate.type === "MeshStandardMaterial") found.Material = candidate.constructor;
        if (!found.referenceTexture && candidate.map) {
          found.referenceTexture = candidate.map;
          found.Texture = candidate.map.constructor;
        }
      }
    });
    return found;
  }

  function geometry(type, segments = 8) {
    const key = `${type}:${segments}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    let created = null;
    if (type === "box") created = new constructors.BoxGeometry(1, 1, 1);
    if (type === "plane" && constructors.PlaneGeometry) created = new constructors.PlaneGeometry(1, 1);
    if (type === "cylinder" && constructors.CylinderGeometry) {
      created = new constructors.CylinderGeometry(1, 1, 1, segments);
    }
    if (type === "cone" && constructors.ConeGeometry) created = new constructors.ConeGeometry(1, 1, segments);
    if (type === "sphere" && constructors.SphereGeometry) created = new constructors.SphereGeometry(1, segments, Math.max(5, Math.floor(segments * 0.65)));
    if (type === "torus" && constructors.TorusGeometry) created = new constructors.TorusGeometry(1, 0.18, 6, Math.max(10, segments));
    if (!created) created = new constructors.BoxGeometry(1, 1, 1);
    geometryCache.set(key, created);
    return created;
  }

  function createCanvasTexture(name, width, height, paint, options = {}) {
    if (!constructors.Texture) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    paint(context, canvas);
    const texture = new constructors.Texture(canvas);
    texture.name = `GreeniaTexture:${name}`;
    texture.flipY = options.flipY ?? true;
    texture.wrapS = options.repeat ? 1000 : 1001;
    texture.wrapT = options.repeat ? 1000 : 1001;
    if (options.repeat && texture.repeat?.set) texture.repeat.set(options.repeat[0], options.repeat[1]);
    texture.magFilter = 1006;
    texture.minFilter = 1008;
    texture.generateMipmaps = true;
    texture.colorSpace = constructors.referenceTexture?.colorSpace || "srgb";
    texture.anisotropy = Math.min(8, handle.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    texture.needsUpdate = true;
    ownedTextures.add(texture);
    state.textureCount = ownedTextures.size;
    return texture;
  }

  function patternTexture(name, palette, mode, seed = 1) {
    return createCanvasTexture(name, 512, 512, (context, canvas) => {
      const random = seededRandom(seed);
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, palette[0]);
      gradient.addColorStop(1, palette[1] || palette[0]);
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (mode === "grass") {
        for (let index = 0; index < 1800; index += 1) {
          const x = random() * canvas.width;
          const y = random() * canvas.height;
          context.strokeStyle = palette[2 + (index % Math.max(1, palette.length - 2))] || "rgba(255,255,255,.08)";
          context.globalAlpha = 0.16 + random() * 0.2;
          context.lineWidth = 1 + random() * 2;
          context.beginPath();
          context.moveTo(x, y + 4);
          context.lineTo(x + (random() - 0.5) * 4, y - 4 - random() * 5);
          context.stroke();
        }
      } else if (mode === "wood") {
        for (let y = 0; y < 512; y += 64) {
          context.fillStyle = y % 128 ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.06)";
          context.fillRect(0, y, 512, 64);
          context.strokeStyle = "rgba(46,21,8,.32)";
          context.lineWidth = 4;
          context.beginPath();
          context.moveTo(0, y + 2);
          context.lineTo(512, y + 2);
          context.stroke();
          for (let index = 0; index < 8; index += 1) {
            const offset = y + 10 + random() * 42;
            context.strokeStyle = "rgba(255,235,180,.11)";
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(0, offset);
            context.bezierCurveTo(150, offset + random() * 10, 320, offset - random() * 10, 512, offset + random() * 6);
            context.stroke();
          }
        }
      } else if (mode === "water") {
        for (let y = 18; y < 512; y += 30) {
          context.strokeStyle = y % 60 ? "rgba(255,255,255,.24)" : "rgba(8,95,150,.25)";
          context.lineWidth = 4;
          context.beginPath();
          for (let x = -30; x <= 540; x += 18) {
            const waveY = y + Math.sin((x + y) * 0.045) * 6;
            if (x === -30) context.moveTo(x, waveY);
            else context.lineTo(x, waveY);
          }
          context.stroke();
        }
      } else if (mode === "camo") {
        for (let index = 0; index < 90; index += 1) {
          context.fillStyle = palette[2 + (index % Math.max(1, palette.length - 2))] || palette[0];
          context.globalAlpha = 0.72;
          context.beginPath();
          context.ellipse(random() * 512, random() * 512, 18 + random() * 56, 12 + random() * 38, random() * Math.PI, 0, Math.PI * 2);
          context.fill();
        }
      } else if (mode === "rubber") {
        for (let y = -512; y < 1024; y += 48) {
          context.strokeStyle = palette[2] || "rgba(255,255,255,.18)";
          context.lineWidth = 20;
          context.beginPath();
          context.moveTo(-80, y);
          context.lineTo(592, y + 672);
          context.stroke();
        }
      } else if (mode === "stone") {
        for (let index = 0; index < 340; index += 1) {
          const shade = Math.floor(90 + random() * 95);
          context.fillStyle = `rgba(${shade},${shade + 8},${shade + 5},${0.08 + random() * 0.18})`;
          context.beginPath();
          context.arc(random() * 512, random() * 512, 2 + random() * 9, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
    }, { repeat: [4, 4] });
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
    material.name = `GreeniaMaterial:${name}`;
    material.userData.voxcelAthleticMaterial = true;
    state.materialCount += 1;
    return material;
  }

  function buildPalette() {
    const grassMap = patternTexture("mountain-grass", ["#28613d", "#5aa84f", "#b6d96c", "#183f2c"], "grass", 11);
    const dirtMap = patternTexture("trail-earth", ["#a77645", "#e0bc75", "#6c492e"], "stone", 22);
    const woodMap = patternTexture("cedar-wood", ["#6d391f", "#c68443", "#f5cf83"], "wood", 33);
    const darkWoodMap = patternTexture("dark-wood", ["#321b18", "#724128", "#bd7a45"], "wood", 34);
    const waterMap = patternTexture("rokko-water", ["#087faf", "#45d2e7", "#c7fbff"], "water", 44);
    const camoMap = patternTexture("warped-wall-camo", ["#314536", "#79904a", "#1e3027", "#a49e58", "#526a3e"], "camo", 55);
    const rubberMap = patternTexture("safety-rubber", ["#e04f5f", "#ffcf45", "rgba(255,255,255,.32)"], "rubber", 66);
    const stoneMap = patternTexture("mountain-stone", ["#5f6868", "#a6aca4", "#d6d5c8"], "stone", 77);
    waterTextures.push(waterMap);

    materials.grass = createMaterial("grass", 0xffffff, { map: grassMap, roughness: 0.98 });
    materials.grassDark = createMaterial("grass-dark", 0x34724a, { roughness: 0.98 });
    materials.path = createMaterial("path", 0xffffff, { map: dirtMap, roughness: 0.96 });
    materials.wood = createMaterial("wood", 0xffffff, { map: woodMap, roughness: 0.86 });
    materials.darkWood = createMaterial("dark-wood", 0xffffff, { map: darkWoodMap, roughness: 0.9 });
    materials.lightWood = createMaterial("light-wood", 0xdba55a, { roughness: 0.83 });
    materials.rope = createMaterial("rope", 0xd8b96e, { roughness: 0.94 });
    materials.steel = createMaterial("steel", 0x334a59, { roughness: 0.34, metalness: 0.62 });
    materials.water = createMaterial("water", 0xffffff, {
      map: waterMap,
      roughness: 0.12,
      metalness: 0.06,
      transparent: true,
      opacity: 0.94,
      emissive: 0x075a7a,
      emissiveIntensity: 0.3,
    });
    materials.foam = createMaterial("water-foam", 0xcaf9ff, { transparent: true, opacity: 0.66, emissive: 0x5bcbe0, emissiveIntensity: 0.16 });
    materials.camo = createMaterial("camo", 0xffffff, { map: camoMap, roughness: 0.9 });
    materials.rubber = createMaterial("rubber", 0xffffff, { map: rubberMap, roughness: 0.78 });
    materials.stone = createMaterial("stone", 0xffffff, { map: stoneMap, roughness: 0.96 });
    materials.lime = createMaterial("lime", 0x8ed63f, { roughness: 0.72 });
    materials.yellow = createMaterial("yellow", 0xffd33e, { roughness: 0.68, emissive: 0x6a4400, emissiveIntensity: 0.06 });
    materials.orange = createMaterial("orange", 0xf2763b, { roughness: 0.7 });
    materials.coral = createMaterial("coral", 0xec5367, { roughness: 0.72 });
    materials.purple = createMaterial("purple", 0x815bc9, { roughness: 0.72 });
    materials.teal = createMaterial("teal", 0x1a9f83, { roughness: 0.72 });
    materials.blue = createMaterial("blue", 0x277dc3, { roughness: 0.7 });
    materials.navy = createMaterial("navy", 0x17394b, { roughness: 0.68 });
    materials.red = createMaterial("red", 0xd93f49, { roughness: 0.7 });
    materials.pink = createMaterial("pink", 0xff7d9a, { roughness: 0.7 });
    materials.white = createMaterial("white", 0xf5f1da, { roughness: 0.76 });
    materials.black = createMaterial("black", 0x131a20, { roughness: 0.64 });
    materials.glow = createMaterial("checkpoint-glow", 0xffe86e, { transparent: true, opacity: 0.72, emissive: 0xffb400, emissiveIntensity: 0.65 });
  }

  function recordRole(role, solid) {
    state.roles.add(role);
    state.roleCounts.set(role, (state.roleCounts.get(role) || 0) + 1);
    state.meshCount += 1;
    if (solid) state.solidMeshCount += 1;
    else state.decorativeMeshCount += 1;
  }

  function decorateMesh(mesh, name, role, options = {}) {
    mesh.name = `Greenia:${name}`;
    mesh.castShadow = options.castShadow ?? Boolean(options.solid);
    mesh.receiveShadow = options.receiveShadow ?? true;
    mesh.userData.voxcelAthletic = true;
    mesh.userData.voxcelAthleticRole = role;
    mesh.userData.voxcelAthleticSolid = Boolean(options.solid);
    mesh.userData.collisionMode = "none";
    recordRole(role, Boolean(options.solid));
    return mesh;
  }

  function addBox(name, role, size, position, material, options = {}) {
    const mesh = decorateMesh(new constructors.Mesh(geometry("box"), material), name, role, options);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationX) mesh.rotation.x = options.rotationX;
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    if (options.rotationZ) mesh.rotation.z = options.rotationZ;
    (options.parent || root).add(mesh);
    if (options.solid && options.blocker !== false) {
      addBlocker(
        `mesh-${name}`,
        position[0],
        position[2],
        size[0],
        size[2],
        position[1] - size[1] / 2,
        position[1] + size[1] / 2,
        { rotationY: options.rotationY ?? 0 },
      );
    }
    return mesh;
  }

  function addCylinder(name, role, radius, height, position, material, options = {}) {
    const mesh = decorateMesh(new constructors.Mesh(geometry("cylinder", options.segments ?? 8), material), name, role, options);
    mesh.scale.set(radius, height, radius);
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationX) mesh.rotation.x = options.rotationX;
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    if (options.rotationZ) mesh.rotation.z = options.rotationZ;
    (options.parent || root).add(mesh);
    if (options.solid && options.blocker !== false) {
      addBlocker(
        `mesh-${name}`,
        position[0],
        position[2],
        radius * 2,
        radius * 2,
        position[1] - height / 2,
        position[1] + height / 2,
      );
    }
    return mesh;
  }

  function addCone(name, role, radius, height, position, material, options = {}) {
    const mesh = decorateMesh(new constructors.Mesh(geometry("cone", options.segments ?? 7), material), name, role, options);
    mesh.scale.set(radius, height, radius);
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    (options.parent || root).add(mesh);
    return mesh;
  }

  function addSphere(name, role, radius, position, material, options = {}) {
    const mesh = decorateMesh(new constructors.Mesh(geometry("sphere", options.segments ?? 8), material), name, role, options);
    mesh.scale.set(radius * (options.scaleX ?? 1), radius * (options.scaleY ?? 1), radius * (options.scaleZ ?? 1));
    mesh.position.set(position[0], position[1], position[2]);
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    (options.parent || root).add(mesh);
    return mesh;
  }

  function addTorus(name, role, radius, tube, position, material, options = {}) {
    if (!constructors.TorusGeometry) {
      return addCylinder(name, role, radius, tube * 1.8, position, material, options);
    }
    const mesh = decorateMesh(new constructors.Mesh(geometry("torus", options.segments ?? 16), material), name, role, options);
    mesh.scale.set(radius, radius, tube / 0.18);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.x = options.rotationX ?? 0;
    mesh.rotation.y = options.rotationY ?? 0;
    mesh.rotation.z = options.rotationZ ?? 0;
    (options.parent || root).add(mesh);
    return mesh;
  }

  function addPlane(name, role, size, position, material, options = {}) {
    if (!constructors.PlaneGeometry) return null;
    const mesh = decorateMesh(new constructors.Mesh(geometry("plane"), material), name, role, { ...options, castShadow: false });
    mesh.scale.set(size[0], size[1], 1);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.x = options.rotationX ?? 0;
    mesh.rotation.y = options.rotationY ?? 0;
    mesh.rotation.z = options.rotationZ ?? 0;
    (options.parent || root).add(mesh);
    return mesh;
  }

  function addBeamBetween(name, role, from, to, radius, material, options = {}) {
    const start = new constructors.Vector3(from[0], from[1], from[2]);
    const end = new constructors.Vector3(to[0], to[1], to[2]);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const mesh = decorateMesh(new constructors.Mesh(geometry("cylinder", options.segments ?? 7), material), name, role, options);
    mesh.scale.set(radius, length, radius);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new constructors.Vector3(0, 1, 0), direction.normalize());
    (options.parent || root).add(mesh);
    return mesh;
  }

  function addSurface(id, x, z, width, depth, y, options = {}) {
    const surface = {
      id,
      x,
      z,
      width,
      depth,
      y,
      baseX: x,
      baseZ: z,
      baseY: y,
      areaId: options.areaId || null,
      dynamic: Boolean(options.dynamic),
      heightAt: options.heightAt || null,
      contains: options.contains || null,
      object: options.object || null,
      previousX: x,
      previousZ: z,
      previousY: y,
    };
    surfaces.push(surface);
    if (surface.dynamic) {
      dynamicSurfaces.push(surface);
      state.dynamicPlatformCount += 1;
    }
    state.surfaceCount = surfaces.length;
    return surface;
  }

  function addPlayableBox(name, role, size, position, material, options = {}) {
    const castsUsefulShadow = size[1] >= 0.55 && size[0] * size[2] >= 40;
    const mesh = addBox(name, role, size, position, material, {
      ...options,
      solid: true,
      blocker: false,
      castShadow: options.castShadow ?? castsUsefulShadow,
    });
    const rotationY = options.rotationY ?? 0;
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const boundingWidth = Math.abs(cos) * size[0] + Math.abs(sin) * size[2];
    const boundingDepth = Math.abs(sin) * size[0] + Math.abs(cos) * size[2];
    const surface = addSurface(
      options.surfaceId || name,
      position[0],
      position[2],
      boundingWidth,
      boundingDepth,
      position[1] + size[1] / 2,
      { areaId: options.areaId, object: mesh, dynamic: options.dynamic },
    );
    const padding = Math.min(PLAYER_RADIUS * 0.18, size[0] * 0.08, size[2] * 0.08);
    surface.contains = (x, z) => {
      const dx = x - surface.x;
      const dz = z - surface.z;
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      return Math.abs(localX) <= Math.max(0.04, size[0] / 2 - padding)
        && Math.abs(localZ) <= Math.max(0.04, size[2] / 2 - padding);
    };
    return { mesh, surface };
  }

  function addRamp(name, role, start, end, width, material, options = {}) {
    const deltaX = end[0] - start[0];
    const deltaZ = end[2] - start[2];
    const deltaY = end[1] - start[1];
    const horizontalLength = Math.hypot(deltaX, deltaZ);
    const length = Math.hypot(horizontalLength, deltaY);
    const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - 0.2, (start[2] + end[2]) / 2];
    const mesh = addBox(name, role, [width, 0.42, length], center, material, {
      solid: true,
      blocker: false,
      rotationX: -Math.atan2(deltaY, horizontalLength),
      rotationY: Math.atan2(deltaX, deltaZ),
    });
    const minX = Math.min(start[0], end[0]) - width / 2;
    const maxX = Math.max(start[0], end[0]) + width / 2;
    const minZ = Math.min(start[2], end[2]) - width / 2;
    const maxZ = Math.max(start[2], end[2]) + width / 2;
    addSurface(name, (minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, maxZ - minZ, Math.max(start[1], end[1]), {
      areaId: options.areaId,
      object: mesh,
      contains(x, z) {
        if (horizontalLength <= 0.001) return false;
        const along = ((x - start[0]) * deltaX + (z - start[2]) * deltaZ) / (horizontalLength * horizontalLength);
        const lateral = Math.abs(deltaZ * (x - start[0]) - deltaX * (z - start[2])) / horizontalLength;
        return along >= 0 && along <= 1 && lateral <= Math.max(0.12, width / 2 - PLAYER_RADIUS * 0.18);
      },
      heightAt(x, z) {
        const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;
        const amount = lengthSquared > 0
          ? clamp(((x - start[0]) * deltaX + (z - start[2]) * deltaZ) / lengthSquared, 0, 1)
          : 0;
        return lerp(start[1], end[1], amount);
      },
    });
    return mesh;
  }

  function addHazard(id, x, z, width, depth, type = "water") {
    hazards.push({ id, x, z, width, depth, type });
    state.hazardCount = hazards.length;
  }

  function addBlocker(id, x, z, width, depth, minY, maxY, options = {}) {
    blockers.push({ id, x, z, width, depth, minY, maxY, rotationY: options.rotationY ?? 0 });
    state.blockerCount = blockers.length;
  }

  function blockerContains(x, z, blocker, padding = 0) {
    const dx = x - blocker.x;
    const dz = z - blocker.z;
    const cos = Math.cos(blocker.rotationY || 0);
    const sin = Math.sin(blocker.rotationY || 0);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) <= blocker.width / 2 + padding
      && Math.abs(localZ) <= blocker.depth / 2 + padding;
  }

  function addAnimation(callback) {
    animations.push(callback);
    state.animationCount = animations.length;
    return callback;
  }

  function createSignTexture(title, subtitle, color, icon = "") {
    return createCanvasTexture(`sign-${title}-${subtitle}`, 1024, 384, (context, canvas) => {
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#0d2e2a");
      gradient.addColorStop(0.52, color);
      gradient.addColorStop(1, "#10263a");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#ffe47a";
      context.lineWidth = 18;
      context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
      context.fillStyle = "rgba(255,255,255,.11)";
      for (let x = -100; x < 1200; x += 80) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 200, 384);
        context.lineWidth = 22;
        context.strokeStyle = "rgba(255,255,255,.035)";
        context.stroke();
      }
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#fffdf0";
      context.font = "900 104px system-ui, sans-serif";
      context.fillText(`${icon ? `${icon} ` : ""}${title}`, canvas.width / 2, 145);
      context.fillStyle = "#ffe47a";
      context.font = "800 54px system-ui, sans-serif";
      context.fillText(subtitle, canvas.width / 2, 278);
    });
  }

  function addSign(name, title, subtitle, color, position, size = [11, 4], options = {}) {
    const texture = createSignTexture(title, subtitle, color, options.icon || "");
    const material = texture
      ? createMaterial(`sign-${name}`, 0xffffff, { map: texture, roughness: 0.55, emissive: 0x142b25, emissiveIntensity: 0.2, side: 2 })
      : materials.teal;
    addBox(`${name}-back`, "signage", [size[0] + 0.5, size[1] + 0.5, 0.32], [position[0], position[1], position[2] + 0.16], materials.navy);
    return addPlane(name, "signage", size, position, material, { rotationY: options.rotationY ?? Math.PI });
  }

  function addTree(x, z, scale = 1, variant = 0, role = "landscape") {
    const castsCanopyShadow = variant % 6 === 0;
    addCylinder(`tree-${x}-${z}-trunk`, role, 0.42 * scale, 4.2 * scale, [x, 2.1 * scale, z], materials.darkWood, { segments: 7, solid: true, castShadow: variant % 4 === 0 });
    const lower = addCone(`tree-${x}-${z}-lower`, role, 2.55 * scale, 4.2 * scale, [x, 5.1 * scale, z], variant % 3 === 0 ? materials.teal : materials.grassDark, { segments: 7, castShadow: castsCanopyShadow });
    const upper = addCone(`tree-${x}-${z}-upper`, role, 1.85 * scale, 3.6 * scale, [x, 7.35 * scale, z], variant % 4 === 0 ? materials.lime : materials.grassDark, { segments: 7, castShadow: castsCanopyShadow });
    lower.rotation.y = variant * 0.63;
    upper.rotation.y = variant * 0.41;
    if (variant % 7 === 0) {
      addAnimation((seconds) => {
        lower.rotation.z = Math.sin(seconds * 0.72 + variant) * 0.018;
        upper.rotation.z = Math.sin(seconds * 0.86 + variant * 1.3) * 0.026;
      });
    }
  }

  function addRock(x, z, scale = 1, variant = 0) {
    const rock = addSphere(`rock-${x}-${z}`, "landscape", scale, [x, scale * 0.6, z], materials.stone, {
      scaleX: 1.2,
      scaleY: 0.62,
      scaleZ: 0.9,
      rotationY: variant * 0.73,
      segments: 7,
    });
    rock.rotation.z = (variant % 3 - 1) * 0.16;
    addBlocker(`rock-${x}-${z}`, x, z, scale * 1.9, scale * 1.45, 0, scale * 1.4);
  }

  function clearOriginalSite() {
    handle.scene.updateMatrixWorld(true);
    const matchedLandmarks = new Set();
    for (const object of [...handle.scene.children]) {
      if (
        object === root ||
        object === handle.playerRoot ||
        object === handle.playerShadow ||
        isWithinObject(handle.playerRoot, object) ||
        object.userData?.voxcelCloud ||
        object.userData?.voxcelAthletic ||
        !pointInsideBounds(object.position, CLEAR_BOUNDS)
      ) continue;

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
        ) matchedLandmarks.add(landmark.id);
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

  function buildTerrainAndEntrance() {
    // A slightly lowered mountain skirt hides the finite city plane beyond the expanded attraction field.
    addPlane("mountain-backdrop-skirt", "landscape", [640, 640], [FACILITY.x, -0.055, FACILITY.z], materials.grassDark, { rotationX: -Math.PI / 2, castShadow: false, receiveShadow: true });
    addBox("expanded-mountain-field", "landscape", [FACILITY.w, 0.2, FACILITY.d], [FACILITY.x, -0.1, FACILITY.z], materials.grass, { castShadow: false, receiveShadow: true });
    addBox("entry-apron", "entrance", [88, 0.08, 56], [-92, 0.01, 106], materials.grassDark, { castShadow: false });
    addBox("entry-main-path", "entrance", [10, 0.08, 54], [-92, 0.055, 107], materials.path, { castShadow: false });
    addBox("grand-loop-west", "landscape", [7, 0.07, 204], [-162, 0.05, 205], materials.path, { castShadow: false, rotationY: -0.06 });
    addBox("grand-loop-south", "landscape", [238, 0.07, 7], [-179, 0.05, 282], materials.path, { castShadow: false });
    addBox("grand-loop-east", "landscape", [7, 0.07, 190], [-57, 0.05, 204], materials.path, { castShadow: false });
    addBox("grand-loop-north", "landscape", [128, 0.07, 7], [-233, 0.05, 158], materials.path, { castShadow: false });

    for (const x of [-100.5, -83.5]) {
      addBox(`grand-gate-post-${x}`, "entrance", [1.4, 9.4, 1.4], [x, 4.7, 84], materials.darkWood, { solid: true });
      addBox(`grand-gate-cap-${x}`, "entrance", [2.1, 0.5, 2.1], [x, 9.65, 84], materials.yellow);
    }
    addBox("grand-gate-beam", "entrance", [19, 1.05, 1.25], [-92, 8.85, 84], materials.wood);
    addSign("grand-gate-sign", "GREENIA VOXCEL", "山・空・水辺。すべてが冒険の舞台", "#188365", [-92, 7.1, 83.33], [16.5, 3.2], { icon: "🌲" });
    for (const [index, x, color] of [[0, -102.2, materials.coral], [1, -81.8, materials.yellow]]) {
      addBox(`gate-flag-pole-${index}`, "entrance", [0.15, 4.4, 0.15], [x, 11.3, 84], materials.steel);
      const flag = addBox(`gate-flag-${index}`, "entrance", [3.1, 1.5, 0.1], [x + 1.45, 12.8, 84], color);
      flag.userData.baseScaleX = flag.scale.x;
      animatedFlags.push(flag);
    }

    const mapTexture = createCanvasTexture("adventure-map", 768, 768, (context, canvas) => {
      context.fillStyle = "#eef1d4";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#183b35";
      context.font = "900 54px system-ui";
      context.textAlign = "center";
      context.fillText("GREENIA VOXCEL MAP", 384, 72);
      AREA_DEFINITIONS.forEach((area, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 45 + column * 365;
        const y = 118 + row * 142;
        context.fillStyle = area.color;
        context.fillRect(x, y, 310, 105);
        context.fillStyle = "#fff";
        context.textAlign = "left";
        context.font = "900 31px system-ui";
        context.fillText(`${area.icon} ${area.short}`, x + 18, y + 39);
        context.font = "700 22px system-ui";
        context.fillText(area.japanese, x + 18, y + 76);
      });
      context.fillStyle = "#183b35";
      context.textAlign = "center";
      context.font = "800 27px system-ui";
      context.fillText("WASD / 矢印: 移動　SPACE: ジャンプ　E: 操作", 384, 708);
    });
    const mapMaterial = createMaterial("adventure-map", 0xffffff, { map: mapTexture, roughness: 0.62, side: 2 });
    addBox("map-board-frame", "entrance", [11.2, 8, 0.5], [-125, 4.05, 91], materials.darkWood);
    addPlane("map-board", "entrance", [10.5, 7.3], [-125, 4.1, 90.72], mapMaterial, { rotationY: Math.PI });
    addBox("gear-hut", "entrance", [12, 4.8, 8], [-63, 2.4, 99], materials.wood, { solid: true });
    addCone("gear-hut-roof", "entrance", 8, 4.2, [-63, 6.65, 99], materials.coral, { segments: 4, rotationY: Math.PI / 4 });
    addSign("gear-hut-sign", "GEAR STATION", "ヘルメット・グローブ", "#c84e5f", [-63, 4.2, 94.85], [9.5, 2.5], { icon: "⛑️" });
    for (let index = 0; index < 8; index += 1) {
      addSphere(`helmet-${index}`, "entrance", 0.52, [-67 + (index % 4) * 2.5, 1.35 + Math.floor(index / 4) * 1.25, 94.5], [materials.yellow, materials.coral, materials.blue, materials.lime][index % 4], { scaleY: 0.72 });
    }

    const perimeterRandom = seededRandom(2026);
    let treeIndex = 0;
    for (let x = FACILITY.bounds.minX + 7; x <= FACILITY.bounds.maxX - 8; x += 13) {
      addTree(x + (perimeterRandom() - 0.5) * 3, FACILITY.bounds.maxZ - 7 + (perimeterRandom() - 0.5) * 4, 0.85 + perimeterRandom() * 0.45, treeIndex++);
    }
    for (let z = FACILITY.bounds.minZ + 13; z <= FACILITY.bounds.maxZ - 16; z += 14) {
      addTree(FACILITY.bounds.minX + 7 + (perimeterRandom() - 0.5) * 4, z, 0.82 + perimeterRandom() * 0.5, treeIndex++);
      addTree(FACILITY.bounds.maxX - 7 + (perimeterRandom() - 0.5) * 3, z + 5, 0.82 + perimeterRandom() * 0.45, treeIndex++);
    }
    for (let index = 0; index < 26; index += 1) {
      const x = -145 - perimeterRandom() * 152;
      const z = 164 + perimeterRandom() * 155;
      if (Math.abs(x + 235) < 42 && Math.abs(z - 181) < 30) continue;
      addRock(x, z, 0.6 + perimeterRandom() * 1.2, index);
    }
  }

  function addZonePortal(area, x, z, rotationY = Math.PI) {
    for (const offset of [-4.8, 4.8]) {
      const postX = x + Math.cos(rotationY) * offset;
      const postZ = z - Math.sin(rotationY) * offset;
      addBox(`portal-${area.id}-${offset}`, "area-portal", [0.65, 5.8, 0.65], [postX, 2.9, postZ], materials.darkWood);
    }
    addBox(`portal-${area.id}-beam`, "area-portal", [10.2, 0.65, 0.7], [x, 5.35, z], materials.wood, { rotationY });
    addSign(`portal-${area.id}-sign`, area.short, area.japanese, area.color, [x, 4.05, z - 0.39], [8.8, 2.4], { icon: area.icon, rotationY });
  }

  const COMPLETE_AREA_LAYOUTS = Object.freeze({
    "mt-kingdom": Object.freeze({ startX: -448, startZ: 94, columns: 8, stepX: 18, stepZ: 17, baseY: 0.14, material: "stone" }),
    yahhoy: Object.freeze({ startX: -448, startZ: 168, columns: 8, stepX: 18, stepZ: 17, baseY: 0.14, material: "grassDark" }),
    "mecya-forest": Object.freeze({ startX: -448, startZ: 242, columns: 8, stepX: 18, stepZ: 18, baseY: 6.1, material: "grassDark" }),
    "wonder-amembo": Object.freeze({ startX: -448, startZ: 350, columns: 9, stepX: 18.5, stepZ: 19.5, baseY: 0.62, material: "water" }),
    "de-kairiki": Object.freeze({ startX: -270, startZ: 350, columns: 5, stepX: 25, stepZ: 20, baseY: 0.14, material: "grassDark" }),
    chibidoland: Object.freeze({ startX: -148, startZ: 350, columns: 6, stepX: 16, stepZ: 25, baseY: 0.14, material: "rubber" }),
  });

  const FOREST_COURSE_RANGES = Object.freeze([
    Object.freeze({ courseNumber: 1, start: 0, end: 4 }),
    Object.freeze({ courseNumber: 2, start: 5, end: 7 }),
    Object.freeze({ courseNumber: 3, start: 8, end: 13 }),
    Object.freeze({ courseNumber: 4, start: 14, end: 18 }),
    Object.freeze({ courseNumber: 5, start: 19, end: 27 }),
    Object.freeze({ courseNumber: 6, start: 28, end: 36 }),
  ]);

  const FOREST_OFFICIAL_TOPOLOGY = Object.freeze([
    [-448, 242, 3], [-420, 242, 5], [-392, 242, 7.2], [-364, 242, 10], [-336, 242, 3.2],
    [-448, 260, 5.2], [-444, 260, 9], [-224, 260, 3],
    [-224, 278, 4.4], [-252, 278, 6.1], [-280, 278, 7.8], [-308, 278, 9.4], [-336, 278, 11], [-364, 278, 4],
    [-224, 298, 5.8], [-232, 298, 8.5], [-240, 298, 12], [-250, 298, 15], [-290, 314, 2.2],
    [-448, 316, 4], [-430, 316, 5.1], [-412, 316, 6.5], [-394, 316, 8], [-376, 316, 9.7], [-358, 316, 9], [-340, 316, 7], [-322, 316, 5], [-304, 316, 3],
    [-448, 336, 4], [-430, 336, 5.7], [-412, 336, 7.5], [-394, 332, 9.5], [-376, 332, 11.5], [-394, 340, 9], [-358, 336, 7], [-330, 336, 5.5], [-304, 336, 3],
  ]);

  function officialLayoutPoints(layout, count) {
    return Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / layout.columns);
      const columnInRow = index % layout.columns;
      const column = row % 2 === 0 ? columnInRow : layout.columns - 1 - columnInRow;
      return {
        x: layout.startX + column * layout.stepX,
        z: layout.startZ + row * layout.stepZ,
        surfaceY: layout.baseY,
        y: layout.baseY + PLAYER_FOOT_OFFSET,
        row,
        column,
      };
    });
  }

  function forestOfficialLayoutPoints() {
    return FOREST_OFFICIAL_TOPOLOGY.map(([x, z, surfaceY], index) => {
      const course = FOREST_COURSE_RANGES.find((candidate) => index >= candidate.start && index <= candidate.end);
      return {
        x,
        z,
        surfaceY,
        y: surfaceY + PLAYER_FOOT_OFFSET,
        row: course.courseNumber - 1,
        column: index - course.start,
        courseNumber: course.courseNumber,
        coursePosition: index - course.start + 1,
        courseLength: course.end - course.start + 1,
      };
    });
  }

  function inferOfficialTemplate(attraction) {
    const explicitTemplate = {
      ki01: "castle-net-gate", ki02: "small-flag-fort", ki03: "castle-slope", ki04: "dual-bouldering-wall",
      ki05: "traverse-castle-wall", ki07: "two-storey-treehouse", ki08: "sky-spiral-stairs", ki09: "three-swords",
      ki10: "progressive-rope-weights", ki11: "magic-ball-maze", ki17: "jump-touch-panels",
      ki18: "punch-sandbag", ki31: "gong-log-finale",
      ki19: "rope-labyrinth", ki20: "thunder-wire", ki22: "fortune-basketball", ki27: "wall-kick-corridor", ki29: "tightrope",
      ch02: "mini-hydraulic-excavator", ch03: "triangle-net-tunnel", ch04: "mini-bouldering-wall", ch05: "wave-balance", ch06: "ladder-hammer",
      ch07: "ring-toss", ch10: "suspended-ox-crossing", ch11: "static-shape-steps",
      ya01: "long-monkey-bars", ya02: "multiple-seesaws", ya03: "hanging-board",
      ya05: "three-walls", ya07: "rotating-barrels", ya09: "jump-net", ya10: "polygon-antlion-bowl",
      ya11: "dense-pole-climb", ya12: "brick-heist-wall", ya13: "cooperative-sail-hoist", ya20: "frisbee-shooter",
      ya23: "log-wall-traverse", ya24: "cup-drop-tower", ya25: "parallel-wall-bridge", ya26: "fishing-lift",
      ya28: "ball-maze", ya29: "bank-bowling",
      wa06: "hill-logs", wa08: "zigzag-logs", wa09: "net-wall", wa10: "pull-raft", wa12: "log-swings",
      wa14: "suspension-bridge", wa16: "three-second-wall", wa17: "sinking-raft", wa19: "web-hill",
      wa22: "overhang-wall", wa23: "long-log-raft", wa25: "water-slide", wa26: "suspended-log-disks",
      wa27: "rope-jungle", wa28: "cling-log-wall", wa31: "barrel-boat", wa32: "water-dash", wa34: "super-jump-lanes",
      de01: "steep-rope-ramp", de02: "spiral-stairs", de04: "rotating-balls", de05: "rope-forest",
      de06: "hanging-stilts", de07: "hanging-stairs", de08: "hanging-platforms", de11: "climbing-fort",
      de12: "rotating-handles", de13: "swinging-log-bridge", de15: "finger-ledge", de16: "lift-logs",
      de17: "irregular-rings", de18: "flying-log", de20: "resistance-bell",
    }[attraction.officialId];
    if (explicitTemplate) return explicitTemplate;
    const name = attraction.name;
    if (attraction.areaId === "mecya-forest") {
      if (name === "ミラーズステアケース") return "forest-mirrors";
      if (name === "ハイチベタン") return "forest-high-tibetan";
      if (name === "ジグザグクロッシング") return "forest-zigzag";
      if (name === "グランパブリッジ") return "forest-grandpa";
      if (name === "レールトラック") return "forest-rail-track";
      if (name === "シャッフル") return "forest-shuffle";
      if (name === "ハーフトラペッツェ") return "forest-trapeze";
      if (name === "イングリッシュクロッシング") return "forest-english";
      if (name === "ハイフェアリーブリッジ") return "forest-fairy";
      if (name === "フジクロッシング") return "forest-fuji";
      if (name === "ヴィクトリアブリッジ") return "forest-victoria";
      if (name === "スパイダーズウェブ") return "forest-web";
      if (name === "アイランドホッピング") return "forest-islands";
      if (name === "ハーフシャモニークロッシング") return "forest-chamonix";
      if (name === "モンタリベールクロッシング") return "forest-montalibert";
      if (name === "チベタンブリッジ") return "forest-tibetan";
      if (name === "ネットトンネル") return "forest-net-tunnel";
      if (name === "べドックブリッジ") return "forest-bedok";
      if (name === "スモールステッピングストーン") return "forest-stones";
      if (name === "ログスイング") return "forest-log-swing";
      if (name === "ゴートクロッシング") return "forest-goat";
      if (name === "ネットキャニオン") return "forest-canyon";
      if (name === "タロワール") return "forest-tarroir";
      if (name === "ネットブリッジ") return "forest-net-bridge";
      if (name === "ハーフウォーターリリー") return "forest-water-lily";
    }
    if (name.includes("透明！スーパースパイダーウォーク")) return "spider-walk";
    if (name.includes("駆け抜けて一本橋")) return "single-log";
    if (name.includes("ハンモックにストーン")) return "hammock-wall";
    if (name === "忍者の気分") return "ninja-platforms";
    if (name.includes("運命の分かれ道")) return "forked-logs";
    if (name.includes("ぷかぷかアイランド") || name.includes("ぐらぐらアイランド")) return "floating-islands";
    if (name.includes("ダブルボールスライダー")) return "ball-slider";
    if (name.includes("手押しどすこい")) return "sumo-island";
    if (name.includes("ナマケモノの気分")) return "sloth-log";
    if (name.includes("水上綱渡り")) return "tightrope";
    if (name.includes("ネットブランコ")) return "net-swings";
    if (name.includes("かくかくシカク")) return "square-frames";
    if (name.includes("冷たい池を飛び越えて")) return "tarzan-rope";
    if (name.includes("握力の限界")) return "grip-balls";
    if (name.includes("ゴツゴツ山")) return "rugged-wall";
    if (name.includes("スーパー救助訓練")) return "rescue-ropes";
    if (name.includes("斜めパイプ")) return "angled-pipe";
    if (name.includes("GREENIA Dragon")) return "dragon";
    if (name.includes("パワーショベル")) return "excavator";
    if (name.includes("ありじごく")) return "antlion";
    if (name.includes("ゲームの中")) return "pixel-game";
    if (name.includes("帆を上げ")) return "sail";
    if (name.includes("トランポリン")) return "trampoline";
    if (name.includes("ペダルボート") || name.includes("イカダ") || name.includes("一寸法師")) return "boat";
    if (name.includes("ジップスライド") || name.includes("パイプスライダー") || name.includes("立ち乗りスライダー")) return "zip";
    if (name.includes("ボウリング") || name.includes("シューター") || name.includes("ピッチング") || name.includes("シュート") || name.includes("カップイン") || name.includes("運命の一打") || name.includes("冒険者の一撃") || name.includes("魂の一撃") || name.includes("ボール投げ")) return "target";
    if (name.includes("うんてい") || name.includes("鉄棒") || name.includes("ぶらさがり")) return "monkey-bars";
    if (name.includes("シーソー")) return "seesaw";
    if (name.includes("リング") || name.includes("吊り輪") || name.includes("無限の輪") || name.includes("わなげ")) return "rings";
    if (name.includes("スパイダー") || name.includes("クモ") || name.includes("ネット") || name.includes("ロープ") || name.includes("タロワール")) return "net";
    if (name.includes("トンネル") || name.includes("モグラ")) return "tunnel";
    if (name.includes("階段") || name.includes("ステアケース") || name.includes("ハシゴ")) return "stairs";
    if (name.includes("砦") || name.includes("城門") || name.includes("ツリーハウス") || name.includes("小屋")) return "fort";
    if (name.includes("ボルダリング") || name.includes("カベ") || name.includes("壁") || name.includes("崖")) return "wall";
    if (name.includes("スライダー") || name.includes("滑り台") || name.includes("芝すべり") || name.includes("脱出路")) return "slide";
    if (name.includes("ブランコ") || name.includes("ハンモック") || name.includes("トラペッツェ") || name.includes("ログスイング")) return "swing";
    if (name.includes("迷宮") || name.includes("ラビリンス") || name.includes("迷路") || name.includes("ポール")) return "labyrinth";
    if (name.includes("剣") || name.includes("怪力") || name.includes("握力") || name.includes("鍛錬") || name.includes("持ち上げ") || name.includes("ハンドル") || name.includes("救助訓練")) return "strength";
    if (name.includes("鐘")) return "bell";
    if (name.includes("竹馬")) return "stilts";
    if (name.includes("ジャンプ")) return "jump";
    if (name.includes("ドラム缶") || name.includes("丸太") || name.includes("パイプ")) return "logs";
    if (name.includes("ボール")) return "balls";
    if (name.includes("〇▢△")) return "shape-steps";
    if (name.includes("〇×")) return "ox-steps";
    if (name.includes("道") || name.includes("ロード") || name.includes("橋") || name.includes("ブリッジ") || name.includes("クロッシング") || name.includes("アイランド") || name.includes("足場") || name.includes("ステッピング")) return "bridge";
    if (name.includes("坂") || name.includes("傾斜") || name.includes("山") || name.includes("谷") || name.includes("ダッシュ") || name.includes("駆け")) return "slope";
    return "balance";
  }

  function officialPalette(areaId, index) {
    const palettes = {
      "mt-kingdom": [materials.purple, materials.yellow, materials.teal, materials.stone],
      chibidoland: [materials.pink, materials.yellow, materials.lime, materials.blue],
      yahhoy: [materials.yellow, materials.coral, materials.blue, materials.teal],
      "wonder-amembo": [materials.yellow, materials.coral, materials.lime, materials.blue, materials.white],
      "de-kairiki": [materials.orange, materials.coral, materials.yellow, materials.darkWood],
      "mecya-forest": [materials.wood, materials.lightWood, materials.rope, materials.teal],
    };
    const palette = palettes[areaId] || [materials.yellow, materials.coral, materials.teal, materials.purple];
    return { primary: palette[index % palette.length], secondary: palette[(index + 1) % palette.length], palette };
  }

  function tagOfficialMesh(target, representation) {
    const mesh = target?.mesh || target;
    if (!mesh?.userData) return target;
    mesh.userData.officialAttractionId = representation.officialId;
    mesh.userData.officialAttractionName = representation.name;
    mesh.userData.officialAttractionAreaId = representation.areaId;
    representation.meshCount += 1;
    state.officialAttractionMeshCount += 1;
    return target;
  }

  function addOfficialNumberMarker(representation, point, material) {
    const patterns = {
      0: [0, 1, 2, 3, 4, 5], 1: [1, 2], 2: [0, 1, 6, 4, 3], 3: [0, 1, 6, 2, 3], 4: [5, 6, 1, 2],
      5: [0, 5, 6, 2, 3], 6: [0, 5, 6, 4, 2, 3], 7: [0, 1, 2], 8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 2, 3, 5, 6],
    };
    const segments = [
      [0, 0.68, 0.5, 0.11], [0.42, 0.34, 0.11, 0.4], [0.42, -0.34, 0.11, 0.4], [0, -0.68, 0.5, 0.11],
      [-0.42, -0.34, 0.11, 0.4], [-0.42, 0.34, 0.11, 0.4], [0, 0, 0.5, 0.11],
    ];
    const markerZ = point.z - 4.25;
    tagOfficialMesh(addBox(`${representation.officialId}-number-back`, "official-marker", [2.8, 2.1, 0.2], [point.x, point.surfaceY + 1.45, markerZ], materials.navy), representation);
    const digits = String(representation.number).padStart(2, "0");
    digits.split("").forEach((digit, digitIndex) => {
      for (const segmentIndex of patterns[digit]) {
        const [offsetX, offsetY, width, height] = segments[segmentIndex];
        tagOfficialMesh(addBox(
          `${representation.officialId}-digit-${digitIndex}-${segmentIndex}`,
          "official-marker",
          [width, height, 0.09],
          [point.x - 0.62 + digitIndex * 1.24 + offsetX, point.surfaceY + 1.45 + offsetY, markerZ - 0.13],
          material,
        ), representation);
      }
    });
  }

  function addOfficialDirectory(area, attractions, position, columns = 2) {
    const texture = createCanvasTexture(`official-directory-${area.id}`, 1024, 1024, (context, canvas) => {
      context.fillStyle = "#0d2e2a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = area.color;
      context.fillRect(0, 0, canvas.width, 122);
      context.fillStyle = "#fff";
      context.textAlign = "center";
      context.font = "900 48px system-ui, sans-serif";
      context.fillText(`${area.icon} ${area.name} — ${attractions.length} POINTS`, canvas.width / 2, 72);
      const rows = Math.ceil(attractions.length / columns);
      const columnWidth = canvas.width / columns;
      const rowHeight = Math.min(46, 820 / rows);
      context.textAlign = "left";
      context.font = `${rows > 20 ? 22 : 26}px system-ui, sans-serif`;
      attractions.forEach((attraction, index) => {
        const column = Math.floor(index / rows);
        const row = index % rows;
        const x = 36 + column * columnWidth;
        const y = 166 + row * rowHeight;
        context.fillStyle = row % 2 ? "rgba(255,255,255,.72)" : "#fffde9";
        context.fillText(`${String(attraction.number).padStart(2, "0")}  ${attraction.name}`, x, y);
      });
      context.fillStyle = "#ffe47a";
      context.textAlign = "center";
      context.font = "800 25px system-ui, sans-serif";
      context.fillText("公式2026アスレチック図鑑の順番で完全収録", canvas.width / 2, 980);
    });
    const boardMaterial = createMaterial(`official-directory-${area.id}`, 0xffffff, { map: texture, roughness: 0.58, emissive: 0x10251f, emissiveIntensity: 0.16, side: 2 });
    addBox(`official-directory-${area.id}-back`, "official-directory", [15.8, 13.8, 0.4], [position[0], 7, position[1] + 0.18], materials.darkWood);
    addPlane(`official-directory-${area.id}`, "official-directory", [15.2, 13.2], [position[0], 7, position[1] - 0.05], boardMaterial, { rotationY: Math.PI });
    for (const offset of [-6.8, 6.8]) addBox(`official-directory-${area.id}-post-${offset}`, "official-directory", [0.45, 8, 0.45], [position[0] + offset, 4, position[1] + 0.45], materials.darkWood, { solid: true });
  }

  function buildForestOfficialDetail(context) {
    const {
      attraction, template, representation, index, at, point, baseY, yaw, px, pz, ux, uz,
      primary, secondary, palette, box, playable, beam, cylinder, sphere, torus,
    } = context;
    const rope = materials.white;
    const wood = materials.lightWood;
    const createFlexibleNetRig = (suffix, options = {}) => {
      const origin = options.origin || at(0.52, 0, 0);
      const group = new constructors.Group();
      group.name = `Greenia:${attraction.officialId}-${suffix}-flex-rig`;
      group.position.set(origin.x, origin.y, origin.z);
      root.add(group);
      const parts = [];
      const trackedSurfaces = [];
      const local = (world) => ({ x: world.x - origin.x, y: world.y - origin.y, z: world.z - origin.z });
      const rigBeam = (name, from, to, radius = 0.04, material = rope, flex = 1) => {
        const mesh = beam(`${suffix}-${name}`, local(from), local(to), radius, material, { parent: group });
        parts.push({ mesh, baseY: mesh.position.y, flex });
        return mesh;
      };
      const rigSurface = (name, center, width, depth, y = center.y) => {
        const surface = addSurface(`${attraction.officialId}-${suffix}-${name}`, center.x, center.z, width, depth, y, { areaId: attraction.areaId, dynamic: true, object: group });
        trackedSurfaces.push({ surface, baseX: center.x, baseZ: center.z, baseY: y });
        return surface;
      };
      const animate = ({ phase = index * 0.63, sway = 0.045, sink = 0.18 } = {}) => {
        let load = 0;
        addAnimation((seconds) => {
          const player = handle?.playerRoot?.position;
          const feetY = (player?.y ?? -999) - PLAYER_FOOT_OFFSET;
          const occupied = gameplay.active && gameplay.activeAreaId === attraction.areaId && trackedSurfaces.some(({ surface }) => (
            (gameplay.currentSurfaceId === surface.id || (player && insideRect(player.x, player.z, surface, 0.03))) && Math.abs(feetY - surface.y) < 1.8
          ));
          load = lerp(load, occupied ? 1 : 0, occupied ? 0.18 : 0.075);
          const lateralShift = Math.sin(seconds * 0.72 + phase) * sway;
          const verticalShift = Math.sin(seconds * 1.04 + phase) * sway * 0.55 - load * sink * 0.55;
          group.position.x = origin.x + px * lateralShift;
          group.position.z = origin.z + pz * lateralShift;
          group.position.y = origin.y + verticalShift;
          parts.forEach(({ mesh, baseY: partY, flex }, partIndex) => {
            mesh.position.y = partY - load * sink * flex * 0.45 + Math.sin(seconds * 0.84 + phase + partIndex * 0.07) * sway * 0.12;
          });
          trackedSurfaces.forEach(({ surface, baseX: surfaceX, baseZ: surfaceZ, baseY: surfaceY }) => {
            surface.previousX = surface.x;
            surface.previousY = surface.y;
            surface.previousZ = surface.z;
            surface.x = surfaceX + px * lateralShift;
            surface.z = surfaceZ + pz * lateralShift;
            surface.y = surfaceY + verticalShift - load * sink * 0.45;
          });
        });
      };
      return { group, beam: rigBeam, surface: rigSurface, animate };
    };
    const dynamicBoard = (suffix, size, location, material, phase, swing = 0.08) => {
      const board = playable(suffix, size, { x: location.x, y: location.y - size[1] / 2, z: location.z }, material, { dynamic: true, rotationY: yaw });
      const originY = board.mesh.position.y;
      addAnimation((seconds) => {
        board.surface.previousY = board.surface.y;
        board.mesh.position.y = originY + Math.sin(seconds * 1.05 + phase) * 0.09;
        board.mesh.rotation.z = Math.sin(seconds * 0.83 + phase) * swing;
        board.surface.y = board.mesh.position.y + size[1] / 2;
      });
      return board;
    };
    const hangingRopes = (suffix, location, halfSpan = 1.15, top = 4.8, material = rope) => {
      for (const side of [-1, 1]) {
        const foot = { x: location.x + px * halfSpan * side, y: location.y, z: location.z + pz * halfSpan * side };
        beam(`${suffix}-hanger-${side}`, foot, { ...foot, y: foot.y + top }, 0.055, material);
      }
    };
    const fineNetWall = (suffix, lateral, bottom, top, from = 0.14, to = 0.92, material = rope, rig = null) => {
      const netBeam = (name, fromPoint, toPoint, radius, beamMaterial) => rig ? rig.beam(`${suffix}-${name}`, fromPoint, toPoint, radius, beamMaterial) : beam(`${suffix}-${name}`, fromPoint, toPoint, radius, beamMaterial);
      for (let row = 0; row <= 5; row += 1) {
        const height = bottom + (top - bottom) * row / 5;
        netBeam(`row-${row}`, at(from, lateral, height), at(to, lateral, height), 0.038, material);
      }
      for (let column = 0; column <= 10; column += 1) {
        const amount = from + (to - from) * column / 10;
        netBeam(`column-${column}`, at(amount, lateral, bottom), at(amount, lateral, top), 0.038, material);
      }
      for (let diagonal = 0; diagonal < 5; diagonal += 1) {
        const fromAmount = from + (to - from) * diagonal / 5;
        const toAmount = from + (to - from) * (diagonal + 1) / 5;
        netBeam(`diag-a-${diagonal}`, at(fromAmount, lateral, bottom), at(toAmount, lateral, top), 0.032, material);
        netBeam(`diag-b-${diagonal}`, at(fromAmount, lateral, top), at(toAmount, lateral, bottom), 0.032, material);
      }
    };
    const fineNetFloor = (suffix, width = 2.6, from = 0.14, to = 0.92, extraY = 0.12, material = rope, rig = null) => {
      const netBeam = (name, fromPoint, toPoint, radius, beamMaterial) => rig ? rig.beam(`${suffix}-${name}`, fromPoint, toPoint, radius, beamMaterial) : beam(`${suffix}-${name}`, fromPoint, toPoint, radius, beamMaterial);
      for (let lateralIndex = 0; lateralIndex <= 6; lateralIndex += 1) {
        const lateral = -width / 2 + width * lateralIndex / 6;
        netBeam(`long-${lateralIndex}`, at(from, lateral, extraY), at(to, lateral, extraY), 0.038, material);
      }
      for (let rung = 0; rung <= 12; rung += 1) {
        const amount = from + (to - from) * rung / 12;
        netBeam(`cross-${rung}`, at(amount, -width / 2, extraY), at(amount, width / 2, extraY), 0.038, material);
      }
      for (let support = 0; support <= 16; support += 1) {
        const location = at(from + (to - from) * support / 16, 0, extraY);
        if (rig) rig.surface(`${suffix}-net-support-${support}`, location, Math.max(1.2, width - 0.35), 1.3, location.y);
        else addSurface(`${attraction.officialId}-${suffix}-net-support-${support}`, location.x, location.z, Math.max(1.2, width - 0.35), 1.3, location.y, { areaId: attraction.areaId });
      }
    };

    if (template === "forest-mirrors") {
      const mirrorProfiles = {
        me01: { width: 3.8, deck: [4.8, 3.8], segments: [[10, 0.04, 0, 0.96, 0, "both"]] },
        me06: { width: 3.55, deck: [5.2, 3.8], segments: [[7, 0.04, -1.25, 0.54, -1.25, "left"], [7, 0.54, -1.25, 0.96, 0, "right"]] },
        me09: { width: 3.7, deck: [4.6, 4], segments: [[6, 0.04, 0, 0.53, 1.35, "right"], [6, 0.53, 1.35, 0.96, 0, "both"]] },
        me15: { width: 3.45, deck: [5.4, 4.2], segments: [[5, 0.04, -1.35, 0.5, -1.35, "both"], [5, 0.5, -1.35, 0.18, 1.35, "left"], [6, 0.18, 1.35, 0.96, 0, "right"]] },
        me20: { width: 3.9, deck: [4.7, 4.4], segments: [[7, 0.04, 0, 0.6, 1.2, "left"], [6, 0.6, 1.2, 0.96, 0, "right"]] },
        me29: { width: 3.6, deck: [5.1, 3.7], segments: [[5, 0.04, 1.45, 0.48, 1.45, "right"], [5, 0.48, 1.45, 0.16, -1.45, "left"], [5, 0.16, -1.45, 0.96, 0, "both"]] },
      };
      const profile = mirrorProfiles[attraction.officialId] || mirrorProfiles.me01;
      const totalSteps = profile.segments.reduce((sum, segment) => sum + segment[0], 0);
      let completedSteps = 0;
      profile.segments.forEach(([count, fromAmount, fromLateral, toAmount, toLateral, railMode], segmentIndex) => {
        const fromPlan = at(fromAmount, fromLateral, -baseY);
        const toPlan = at(toAmount, toLateral, 0);
        const segmentDX = toPlan.x - fromPlan.x;
        const segmentDZ = toPlan.z - fromPlan.z;
        const segmentLength = Math.max(0.8, Math.hypot(segmentDX, segmentDZ));
        const segmentUX = segmentDX / segmentLength;
        const segmentUZ = segmentDZ / segmentLength;
        const segmentPX = -segmentUZ;
        const segmentPZ = segmentUX;
        const segmentYaw = Math.atan2(segmentDX, segmentDZ);
        const railSides = railMode === "both" ? [-1, 1] : railMode === "left" ? [-1] : [1];
        for (let step = 0; step < count; step += 1) {
          const localProgress = (step + 0.5) / count;
          const globalStep = completedSteps + step + 1;
          const amount = lerp(fromAmount, toAmount, localProgress);
          const lateral = lerp(fromLateral, toLateral, localProgress);
          const stepTop = baseY * globalStep / totalSteps;
          const location = at(amount, lateral, stepTop - baseY);
          const depth = Math.max(0.72, segmentLength / count + 0.18);
          playable(`mirror-${attraction.officialId}-segment-${segmentIndex}-step-${step}`, [profile.width, 0.34, depth], { x: location.x, y: location.y - 0.17, z: location.z }, (globalStep + segmentIndex) % 2 ? wood : materials.wood, { rotationY: segmentYaw });
          if (step % 2 === 0 || step === count - 1) {
            for (const side of railSides) box(`mirror-${attraction.officialId}-baluster-${segmentIndex}-${step}-${side}`, [0.13, 1.9, 0.13], { x: location.x + segmentPX * profile.width * 0.45 * side, y: location.y + 0.95, z: location.z + segmentPZ * profile.width * 0.45 * side }, materials.darkWood);
          }
        }
        const startHeight = baseY * completedSteps / totalSteps + 1.85;
        const endHeight = baseY * (completedSteps + count) / totalSteps + 1.85;
        for (const side of railSides) {
          beam(`mirror-${attraction.officialId}-handrail-${segmentIndex}-${side}`,
            { x: fromPlan.x + segmentPX * profile.width * 0.45 * side, y: startHeight, z: fromPlan.z + segmentPZ * profile.width * 0.45 * side },
            { x: toPlan.x + segmentPX * profile.width * 0.45 * side, y: endHeight, z: toPlan.z + segmentPZ * profile.width * 0.45 * side },
            0.1, materials.wood);
        }
        completedSteps += count;
        if (segmentIndex < profile.segments.length - 1) {
          const landing = at(toAmount, toLateral, baseY * completedSteps / totalSteps - baseY);
          playable(`mirror-${attraction.officialId}-turn-deck-${segmentIndex}`, [profile.width + 0.45, 0.34, 1.75], { x: landing.x, y: landing.y - 0.17, z: landing.z }, materials.lightWood, { rotationY: segmentYaw });
        }
      });
      playable(`mirror-${attraction.officialId}-top-deck`, [profile.deck[0], 0.38, profile.deck[1]], { x: point.x, y: baseY - 0.19, z: point.z }, materials.lightWood, { rotationY: yaw });
      representation.stairStepCount = totalSteps;
      representation.stairTurnCount = profile.segments.length - 1;
      representation.deckHeightMeters = baseY;
      representation.detailProfile = `${attraction.officialId}-individual-mirrors-${totalSteps}-steps-${profile.segments.length - 1}-turns-${profile.segments.map((segment) => segment[5]).join("-")}-rails`;
      return;
    }
    if (template === "forest-high-tibetan") {
      const rig = createFlexibleNetRig("high-tibetan", { origin: at(0.52, 0, 0.18) });
      fineNetFloor("floor", 2.8, 0.1, 0.96, 0.18, rope, rig);
      fineNetWall("left", -1.45, 0.18, 2.75, 0.1, 0.96, rope, rig);
      fineNetWall("right", 1.45, 0.18, 2.75, 0.1, 0.96, rope, rig);
      for (let hoop = 0; hoop <= 8; hoop += 1) {
        const amount = 0.1 + hoop * 0.1075;
        rig.beam(`overhead-${hoop}`, at(amount, -1.45, 2.75), at(amount, 1.45, 2.75), 0.045, rope, 0.45);
      }
      rig.animate({ phase: attraction.officialId === "me36" ? 2.4 : 0.35, sway: attraction.officialId === "me36" ? 0.06 : 0.045, sink: attraction.officialId === "me36" ? 0.24 : 0.18 });
      representation.detailProfile = "fully-enclosed-fine-rope-tunnel-flex-rig-ambient-sway-and-player-load-sink";
      return;
    }
    if (template === "forest-zigzag") {
      for (let plank = 0; plank < 9; plank += 1) {
        const lateral = (plank % 2 ? 1 : -1) * (1.05 + (plank % 3) * 0.22);
        const location = at(0.11 + plank * 0.105, lateral, 0.22);
        dynamicBoard(`zigzag-plank-${plank}`, [2.8, 0.3, 1.25], location, plank % 2 ? materials.wood : wood, plank + index, 0.1);
        hangingRopes(`zigzag-plank-${plank}`, location, 1.1, 4.8);
      }
      representation.detailProfile = "zigzag-suspended-natural-planks";
      return;
    }
    if (template === "forest-grandpa") {
      for (let plank = 0; plank < 11; plank += 1) {
        const location = at(0.08 + plank * 0.088, 0, 0.2 + Math.sin(plank * 0.8) * 0.12);
        dynamicBoard(`grandpa-plank-${plank}`, [4.2, 0.34, 1.15], location, plank % 2 ? wood : materials.wood, plank + index, 0.045);
        hangingRopes(`grandpa-plank-${plank}`, location, 1.85, 4.2);
      }
      for (const lateral of [-2.2, 2.2]) beam(`grandpa-heavy-rail-${lateral}`, at(0.05, lateral, 2.1), at(0.98, lateral, 2.1), 0.12, rope);
      representation.detailProfile = "wide-heavy-suspension-bridge";
      return;
    }
    if (template === "forest-rail-track") {
      for (let rung = 0; rung < 13; rung += 1) {
        const location = at(0.08 + rung * 0.075, 0, 0.22 + Math.sin(rung * 0.7) * 0.12);
        const log = cylinder(`rail-log-${rung}`, 0.31, 4.6, location, rung % 2 ? materials.wood : wood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 10 });
        hangingRopes(`rail-log-${rung}`, location, 1.95, 4.8);
        addAnimation((seconds) => { log.rotation.x = Math.sin(seconds * 0.72 + rung + index) * 0.06; });
      }
      representation.detailProfile = "crosswise-hanging-log-rail-track";
      return;
    }
    if (template === "forest-shuffle") {
      for (const lateral of [-0.42, 0.42]) beam(`shuffle-foot-rope-${lateral}`, at(0.04, lateral, 0.28), at(0.98, lateral, 0.28), 0.1, rope);
      beam("shuffle-hand-rope", at(0.04, 0, 2.2), at(0.98, 0, 2.2), 0.11, rope);
      for (let stay = 0; stay <= 12; stay += 1) {
        const amount = 0.04 + stay * 0.078;
        beam(`shuffle-triangle-left-${stay}`, at(amount, -0.42, 0.28), at(amount, 0, 2.2), 0.038, rope);
        beam(`shuffle-triangle-right-${stay}`, at(amount, 0.42, 0.28), at(amount, 0, 2.2), 0.038, rope);
      }
      representation.detailProfile = "two-foot-ropes-and-single-upper-rope";
      return;
    }
    if (template === "forest-trapeze") {
      for (let trapeze = 0; trapeze < 8; trapeze += 1) {
        const location = at(0.13 + trapeze * 0.11, 0, 1.25 + Math.sin(trapeze) * 0.22);
        const bar = beam(`trapeze-bar-${trapeze}`, { x: location.x - px * 1.35, y: location.y, z: location.z - pz * 1.35 }, { x: location.x + px * 1.35, y: location.y, z: location.z + pz * 1.35 }, 0.16, wood);
        for (const side of [-1, 1]) {
          const end = { x: location.x + px * 1.35 * side, y: location.y, z: location.z + pz * 1.35 * side };
          beam(`trapeze-rope-${trapeze}-${side}`, end, { ...end, y: end.y + 4.4 }, 0.06, rope);
        }
        addAnimation((seconds) => { bar.rotation.z = Math.sin(seconds * 0.9 + trapeze + index) * 0.12; });
      }
      representation.detailProfile = "half-trapeze-bars";
      return;
    }
    if (template === "forest-english") {
      for (let frameIndex = 0; frameIndex < 9; frameIndex += 1) {
        const amount = 0.08 + frameIndex * 0.11;
        const center = at(amount, 0, 0.3);
        for (const lateral of [-1.25, 1.25]) playable(`english-frame-side-${frameIndex}-${lateral}`, [0.3, 0.3, 2.5], { x: center.x + px * lateral, y: center.y - 0.15, z: center.z + pz * lateral }, wood, { rotationY: yaw });
        for (const along of [-1, 1]) playable(`english-frame-end-${frameIndex}-${along}`, [2.8, 0.3, 0.34], { x: center.x + ux * along, y: center.y - 0.15, z: center.z + uz * along }, wood, { rotationY: yaw });
        hangingRopes(`english-frame-${frameIndex}`, center, 1.25, 4.6);
      }
      representation.detailProfile = "continuous-suspended-square-wood-frames";
      return;
    }
    if (template === "forest-fairy") {
      for (let rung = 0; rung < 15; rung += 1) {
        const location = at(0.07 + rung * 0.062, 0, 0.16);
        playable(`fairy-rung-${rung}`, [2.25, 0.22, 0.55], { x: location.x, y: location.y - 0.11, z: location.z }, rung % 2 ? wood : materials.wood, { rotationY: yaw });
        hangingRopes(`fairy-rung-${rung}`, location, 0.95, 4.6);
      }
      fineNetWall("fairy-net-left", -1.55, 0.1, 3.15, 0.06, 0.98);
      fineNetWall("fairy-net-right", 1.55, 0.1, 3.15, 0.06, 0.98);
      representation.detailProfile = "thin-spaced-rungs-with-tall-net-walls";
      return;
    }
    if (template === "forest-fuji") {
      for (let cross = 0; cross < 9; cross += 1) {
        const amount = 0.08 + cross * 0.11;
        const left = at(amount - 0.035, -1.3, 0.25);
        const right = at(amount + 0.035, 1.3, 0.25);
        const leftBar = playable(`fuji-x-a-${cross}`, [0.42, 0.3, 3], { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 - 0.15, z: (left.z + right.z) / 2 }, cross % 2 ? wood : materials.wood, { rotationY: yaw + Math.PI / 4, dynamic: true });
        playable(`fuji-x-b-${cross}`, [0.42, 0.3, 3], { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 - 0.15, z: (left.z + right.z) / 2 }, cross % 2 ? materials.wood : wood, { rotationY: yaw - Math.PI / 4, dynamic: true });
        hangingRopes(`fuji-x-${cross}`, at(amount, 0, 0.3), 1.35, 4.7);
        addAnimation((seconds) => { leftBar.mesh.rotation.z = Math.sin(seconds * 0.7 + cross) * 0.05; });
      }
      representation.detailProfile = "suspended-x-shaped-wood-footholds";
      return;
    }
    if (template === "forest-victoria") {
      beam("victoria-foot-rope", at(0.04, 0, 0.24), at(0.98, 0, 0.24), 0.11, rope);
      for (const lateral of [-1.45, 1.45]) beam(`victoria-hand-rope-${lateral}`, at(0.04, lateral, 2.15), at(0.98, lateral, 2.15), 0.11, materials.teal);
      for (let stay = 0; stay <= 13; stay += 1) {
        const amount = 0.04 + stay * 0.072;
        beam(`victoria-v-stay-left-${stay}`, at(amount, 0, 0.24), at(amount, -1.45, 2.15), 0.04, rope);
        beam(`victoria-v-stay-right-${stay}`, at(amount, 0, 0.24), at(amount, 1.45, 2.15), 0.04, rope);
      }
      representation.detailProfile = "single-foot-rope-two-green-handlines-v-stays";
      return;
    }
    if (template === "forest-web") {
      const center = at(0.56, 0, 2.25);
      const rig = createFlexibleNetRig("spiders-web", { origin: center });
      for (let spoke = 0; spoke < 16; spoke += 1) {
        const angle = spoke / 16 * Math.PI * 2;
        rig.beam(`spoke-${spoke}`, center, { x: center.x + px * Math.cos(angle) * 3.5, y: center.y + Math.sin(angle) * 3, z: center.z + pz * Math.cos(angle) * 3.5 }, 0.05, rope, 0.8);
      }
      for (let ring = 1; ring <= 4; ring += 1) {
        for (let segment = 0; segment < 16; segment += 1) {
          const a = segment / 16 * Math.PI * 2;
          const b = (segment + 1) / 16 * Math.PI * 2;
          const radius = ring * 0.78;
          rig.beam(`ring-${ring}-${segment}`, { x: center.x + px * Math.cos(a) * radius, y: center.y + Math.sin(a) * radius * 0.85, z: center.z + pz * Math.cos(a) * radius }, { x: center.x + px * Math.cos(b) * radius, y: center.y + Math.sin(b) * radius * 0.85, z: center.z + pz * Math.cos(b) * radius }, 0.042, rope, 1);
        }
      }
      for (let support = 0; support < 5; support += 1) {
        const location = at(0.4 + support * 0.08, 0, 0.28);
        rig.surface(`climb-support-${support}`, location, 2.25, 1.05, location.y);
      }
      rig.animate({ phase: 1.35, sway: 0.065, sink: 0.2 });
      representation.detailProfile = "radial-spiders-web-flex-rig-ambient-sway-and-player-load-deflection";
      return;
    }
    if (template === "forest-islands") {
      for (let island = 0; island < 10; island += 1) {
        const location = at(0.07 + island * 0.1, island % 2 ? 0.85 : -0.85, 0.24 + (island % 3) * 0.16);
        cylinder(`island-round-disk-${island}`, 0.92 + island % 3 * 0.12, 0.32, location, island % 2 ? wood : materials.wood, { segments: 14 });
        addSurface(`${attraction.officialId}-island-disk-surface-${island}`, location.x, location.z, 1.65, 1.65, location.y + 0.16, { areaId: attraction.areaId });
        beam(`island-center-rope-${island}`, location, { ...location, y: location.y + 4.8 }, 0.055, rope);
      }
      representation.detailProfile = "round-natural-wood-hopping-disks";
      return;
    }
    if (template === "forest-chamonix") {
      for (let shape = 0; shape < 9; shape += 1) {
        const location = at(0.08 + shape * 0.11, shape % 2 ? 0.62 : -0.62, 0.32);
        if (shape % 2 === 0) {
          const ring = torus(`chamonix-o-${shape}`, 1.05, 0.17, location, wood, { rotationX: Math.PI / 2, segments: 16 });
          addSurface(`${attraction.officialId}-chamonix-o-surface-${shape}`, location.x, location.z, 1.65, 1.65, location.y + 0.14, { areaId: attraction.areaId });
          addAnimation((seconds) => { ring.rotation.z = Math.sin(seconds * 0.65 + shape) * 0.05; });
        } else {
          playable(`chamonix-x-a-${shape}`, [0.34, 0.28, 2.5], { x: location.x, y: location.y - 0.14, z: location.z }, wood, { rotationY: yaw + Math.PI / 4, dynamic: true });
          playable(`chamonix-x-b-${shape}`, [0.34, 0.28, 2.5], { x: location.x, y: location.y - 0.14, z: location.z }, materials.wood, { rotationY: yaw - Math.PI / 4, dynamic: true });
        }
        beam(`chamonix-center-rope-${shape}`, location, { ...location, y: location.y + 4.6 }, 0.05, rope);
      }
      representation.detailProfile = "alternating-o-and-x-footholds";
      return;
    }
    if (template === "forest-montalibert") {
      const boardSpecs = [
        [0.07, -0.7, 0.2, 3.7, 0.86, -0.34], [0.17, 0.35, 0.42, 2.15, 1.05, 0.28],
        [0.27, 1.02, 0.31, 4.35, 0.78, 0.52], [0.38, 0.18, 0.58, 2.7, 1.2, -0.18],
        [0.48, -1.08, 0.38, 3.25, 0.9, -0.58], [0.59, -0.25, 0.7, 4.55, 0.72, 0.2],
        [0.69, 0.92, 0.46, 2.35, 1.1, 0.62], [0.79, 0.3, 0.82, 3.9, 0.8, -0.4],
        [0.89, -0.75, 0.55, 2.55, 1.16, -0.68], [0.97, 0, 0.3, 3.45, 0.9, 0.12],
      ];
      boardSpecs.forEach(([amount, lateral, height, boardLength, boardDepth, angle], boardIndex) => {
        const location = at(amount, lateral, height);
        const board = playable(`montalibert-angular-board-${boardIndex}`, [boardLength, 0.32, boardDepth], { x: location.x, y: location.y - 0.16, z: location.z }, boardIndex % 2 ? wood : materials.wood, { dynamic: true, rotationY: yaw + angle });
        const origin = { x: location.x, y: location.y - 0.16, z: location.z };
        addAnimation((seconds) => {
          board.surface.previousX = board.surface.x;
          board.surface.previousY = board.surface.y;
          board.surface.previousZ = board.surface.z;
          const lateralSway = Math.sin(seconds * 0.64 + boardIndex * 0.83) * 0.075;
          board.mesh.position.x = origin.x + px * lateralSway;
          board.mesh.position.z = origin.z + pz * lateralSway;
          board.mesh.position.y = origin.y + Math.sin(seconds * 0.92 + boardIndex) * 0.07;
          board.mesh.rotation.z = Math.sin(seconds * 0.72 + boardIndex) * (0.055 + boardIndex % 3 * 0.018);
          board.surface.x = board.mesh.position.x;
          board.surface.z = board.mesh.position.z;
          board.surface.y = board.mesh.position.y + 0.16;
        });
        hangingRopes(`montalibert-angular-board-${boardIndex}`, location, Math.max(0.72, boardLength / 2 - 0.25), 4.7);
      });
      representation.detailProfile = "ten-connected-irregular-long-short-angular-height-varied-rectangular-suspended-platforms";
      return;
    }
    if (template === "forest-tibetan") {
      const rig = createFlexibleNetRig("tibetan-v", { origin: at(0.52, 0, -1.55) });
      for (let strand = 0; strand <= 8; strand += 1) {
        const lateral = -2.4 + strand * 0.6;
        const floorHeight = Math.abs(lateral) * 0.72 - 1.55;
        rig.beam(`long-${strand}`, at(0.04, lateral, floorHeight), at(0.98, lateral, floorHeight), 0.052, rope, 1 - Math.abs(lateral) / 3.2);
      }
      for (let cross = 0; cross <= 15; cross += 1) {
        const amount = 0.04 + cross * 0.063;
        for (let segment = 0; segment < 8; segment += 1) {
          const lateralA = -2.4 + segment * 0.6;
          const lateralB = lateralA + 0.6;
          rig.beam(`cross-${cross}-${segment}`, at(amount, lateralA, Math.abs(lateralA) * 0.72 - 1.55), at(amount, lateralB, Math.abs(lateralB) * 0.72 - 1.55), 0.046, rope, 0.9);
        }
        const centerFloor = at(amount, 0, -1.55);
        rig.surface(`v-floor-support-${cross}`, centerFloor, 1.25, 1.05, centerFloor.y);
      }
      for (const lateral of [-2.65, 2.65]) {
        fineNetWall(`side-${lateral}`, lateral, 0.2, 2.25, 0.04, 0.98, rope, rig);
        beam(`tibetan-v-green-edge-${lateral}`, at(0.04, lateral, 2.25), at(0.98, lateral, 2.25), 0.09, materials.teal);
        beam(`tibetan-v-safety-${lateral}`, at(0.04, lateral * 1.03, 2.4), at(0.98, lateral * 1.03, 2.4), 0.055, materials.steel);
      }
      rig.animate({ phase: 2.1, sway: 0.055, sink: 0.28 });
      representation.detailProfile = "deep-v-shaped-rope-net-floor-flex-rig-with-load-deepening-and-surface-follow";
      return;
    }
    if (template === "forest-net-tunnel") {
      const rig = createFlexibleNetRig("net-tunnel", { origin: at(0.53, 0, 0.1) });
      fineNetFloor("floor", 3, 0.08, 0.98, 0.1, rope, rig);
      fineNetWall("left", -1.5, 0.1, 2.9, 0.08, 0.98, rope, rig);
      fineNetWall("right", 1.5, 0.1, 2.9, 0.08, 0.98, rope, rig);
      for (let line = 0; line <= 6; line += 1) {
        const lateral = -1.5 + line * 0.5;
        rig.beam(`ceiling-long-${line}`, at(0.08, lateral, 2.9), at(0.98, lateral, 2.9), 0.038, rope, 0.45);
      }
      for (let cross = 0; cross <= 12; cross += 1) {
        const amount = 0.08 + cross * 0.075;
        rig.beam(`ceiling-cross-${cross}`, at(amount, -1.5, 2.9), at(amount, 1.5, 2.9), 0.038, rope, 0.45);
      }
      rig.animate({ phase: 2.85, sway: 0.045, sink: 0.2 });
      representation.detailProfile = "rectangular-six-sided-net-tunnel-flex-rig-ambient-sway-and-load-sink";
      return;
    }
    if (template === "forest-bedok") {
      for (let boardIndex = 0; boardIndex < 13; boardIndex += 1) {
        const lateral = Math.sin(boardIndex * 0.78) * 1.3;
        const location = at(0.04 + boardIndex * 0.078, lateral, 0.22 + (boardIndex % 3) * 0.1);
        dynamicBoard(`bedok-winding-board-${boardIndex}`, [2.65, 0.28, 0.72], location, boardIndex % 2 ? wood : materials.wood, boardIndex + index, 0.09);
        hangingRopes(`bedok-board-${boardIndex}`, location, 1.1, 4.4);
      }
      representation.detailProfile = "winding-small-transverse-board-chain";
      return;
    }
    if (template === "forest-stones") {
      for (let stone = 0; stone < 12; stone += 1) {
        const location = at(0.04 + stone * 0.083, stone % 2 ? 0.68 : -0.68, 0.22 + (stone % 3) * 0.12);
        dynamicBoard(`stone-small-board-${stone}`, [1.85, 0.28, 0.75], location, stone % 2 ? wood : materials.wood, stone + index, 0.08);
        beam(`stone-rope-${stone}`, location, { ...location, y: location.y + 4.5 }, 0.055, rope);
      }
      representation.detailProfile = "small-rectangular-suspended-step-boards";
      return;
    }
    if (template === "forest-log-swing") {
      const location = at(0.56, 0, 1.05);
      const log = cylinder("log-swing", 0.58, 7.2, location, materials.wood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 12 });
      for (const side of [-1, 1]) {
        const end = { x: location.x + px * 3.1 * side, y: location.y, z: location.z + pz * 3.1 * side };
        beam(`log-swing-rope-${side}`, end, { ...end, y: end.y + 5.1 }, 0.075, rope);
      }
      addAnimation((seconds) => { log.rotation.x = Math.sin(seconds * 0.82 + index) * 0.27; });
      representation.detailProfile = "large-two-rope-log-swing";
      return;
    }
    if (template === "forest-goat") {
      for (let boardIndex = 0; boardIndex < 11; boardIndex += 1) {
        const location = at(0.05 + boardIndex * 0.092, boardIndex % 2 ? 1.15 : -1.15, 0.25);
        dynamicBoard(`goat-alternating-board-${boardIndex}`, [2.55, 0.3, 0.82], location, boardIndex % 2 ? wood : materials.wood, boardIndex + index, 0.11);
        hangingRopes(`goat-board-${boardIndex}`, location, 1.05, 4.6);
      }
      representation.detailProfile = "left-right-alternating-board-footholds";
      return;
    }
    if (template === "forest-canyon") {
      const rig = createFlexibleNetRig("net-canyon", { origin: at(0.52, 0, -0.1) });
      for (let row = 0; row <= 7; row += 1) {
        const lateral = -2.7 + row * 0.77;
        const sag = 2.65 - Math.abs(lateral) * 0.55;
        rig.beam(`long-${row}-a`, at(0.05, lateral, 2.6), at(0.5, lateral * 0.58, 0.2 - sag), 0.055, rope, 0.8);
        rig.beam(`long-${row}-b`, at(0.5, lateral * 0.58, 0.2 - sag), at(0.98, lateral, 2.6), 0.055, rope, 0.8);
      }
      for (let cross = 0; cross <= 16; cross += 1) {
        const amount = 0.05 + cross * 0.058;
        const sag = Math.sin((amount - 0.05) / 0.93 * Math.PI) * 2.7;
        rig.beam(`cross-${cross}`, at(amount, -2.7, 2.6 - sag), at(amount, 2.7, 2.6 - sag), 0.055, rope, 1);
        const floor = at(amount, 0, 2.6 - sag);
        rig.surface(`floor-support-${cross}`, floor, 3.6, 1.05, floor.y);
      }
      for (const lateral of [-3, 3]) fineNetWall(`side-${lateral}`, lateral, 0.25, 3.2, 0.05, 0.98, rope, rig);
      rig.animate({ phase: 3.45, sway: 0.065, sink: 0.32 });
      representation.detailProfile = "deep-u-v-sagging-net-canyon-flex-rig-with-load-deepening-and-surface-follow";
      return;
    }
    if (template === "forest-tarroir") {
      for (let plank = 0; plank < 10; plank += 1) {
        const location = at(0.08 + plank * 0.095, plank % 2 ? 0.4 : -0.4, 0.26);
        dynamicBoard(`tarroir-board-${plank}`, [3.35, 0.34, 1.15], location, plank % 2 ? wood : materials.wood, plank + index, 0.18);
        for (const along of [-0.42, 0.42]) for (const lateral of [-1.3, 1.3]) {
          const corner = at(0.08 + plank * 0.095 + along * 0.018, lateral + (plank % 2 ? 0.4 : -0.4), 0.34);
          beam(`tarroir-rope-${plank}-${along}-${lateral}`, corner, { ...corner, y: corner.y + 4.9 }, 0.055, rope);
        }
      }
      representation.detailProfile = "four-rope-all-axis-swaying-tarroir-boards";
      return;
    }
    if (template === "forest-net-bridge") {
      const rig = createFlexibleNetRig("net-bridge", { origin: at(0.52, 0, 0.12) });
      fineNetFloor("floor", 3.8, 0.05, 0.99, 0.12, rope, rig);
      for (const lateral of [-2, 2]) {
        beam(`net-bridge-green-edge-${lateral}`, at(0.05, lateral, 0.16), at(0.99, lateral, 0.16), 0.095, materials.teal);
        beam(`net-bridge-safety-${lateral}`, at(0.05, lateral, 2.1), at(0.99, lateral, 2.1), 0.065, materials.steel);
        for (let stay = 0; stay <= 12; stay += 1) {
          const amount = 0.05 + stay * 0.078;
          rig.beam(`side-${lateral}-${stay}`, at(amount, lateral, 0.15), at(amount, lateral, 2.1), 0.038, rope, 0.65);
        }
      }
      rig.animate({ phase: 4.1, sway: 0.05, sink: 0.22 });
      representation.detailProfile = "easy-horizontal-fine-net-bridge-flex-rig-ambient-sway-and-player-load-sink";
      return;
    }
    if (template === "forest-water-lily") {
      for (let pad = 0; pad < 11; pad += 1) {
        const location = at(0.07 + pad * 0.09, pad % 2 ? 0.72 : -0.72, 0.18 + (pad % 4) * 0.12);
        if (pad % 3 === 1) {
          dynamicBoard(`water-lily-bar-${pad}`, [2.5, 0.3, 0.82], location, wood, pad + index, 0.09);
        } else {
          cylinder(`water-lily-disk-${pad}`, 0.78 + (pad % 3) * 0.14, 0.28, location, pad % 2 ? wood : materials.wood, { segments: 14 });
          addSurface(`${attraction.officialId}-water-lily-surface-${pad}`, location.x, location.z, 1.45, 1.45, location.y + 0.14, { areaId: attraction.areaId });
        }
        beam(`water-lily-rope-${pad}`, location, { ...location, y: location.y + 4.5 }, 0.05, rope);
      }
      representation.detailProfile = "round-disks-and-rectangular-water-lily-bars";
      return;
    }

    representation.detailProfile = "forest-generic-fallback";
    box("forest-fallback-label", [2.2, 0.25, 2.2], { x: point.x, y: baseY + 0.15, z: point.z }, palette[index % palette.length]);
    sphere("forest-fallback-knot", 0.25, { x: point.x, y: baseY + 2.5, z: point.z }, primary);
  }

  function buildMatchedOfficialDetail(context) {
    const {
      attraction, template, representation, index, previous, at, point, baseY, yaw, px, pz, ux, uz, length,
      primary, secondary, palette, box, playable, beam, cylinder, sphere, torus,
    } = context;
    const whiteRope = materials.white;
    const rideInteraction = (suffix, label, start, end, durationMs, movingObject = null, trolleyOffsetY = 1.2, sagAmount = 0.12) => {
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-${suffix}`,
        label,
        point: { ...start },
        radius: 4.2,
        areaId: attraction.areaId,
        activate: () => beginLocalRide(
          `official-${attraction.officialId}-${suffix}`,
          attraction.areaId,
          start,
          end,
          durationMs,
          movingObject,
          attraction.name,
          attraction.number - 1,
          trolleyOffsetY,
          sagAmount,
        ),
      });
    };
    const animatePlatform = (platform, origin, phase, options = {}) => {
      addAnimation((seconds) => {
        platform.surface.previousX = platform.surface.x;
        platform.surface.previousY = platform.surface.y;
        platform.surface.previousZ = platform.surface.z;
        platform.mesh.position.x = origin.x + Math.sin(seconds * (options.speedX ?? 0.67) + phase) * (options.moveX ?? 0.08);
        platform.mesh.position.y = origin.y + Math.sin(seconds * (options.speedY ?? 1.08) + phase) * (options.moveY ?? 0.12);
        platform.mesh.position.z = origin.z + Math.cos(seconds * (options.speedZ ?? 0.74) + phase) * (options.moveZ ?? 0.08);
        platform.mesh.rotation.z = Math.sin(seconds * 0.88 + phase) * (options.tilt ?? 0.08);
        platform.surface.x = platform.mesh.position.x;
        platform.surface.y = platform.mesh.position.y + (options.halfHeight ?? 0.15);
        platform.surface.z = platform.mesh.position.z;
      });
    };
    const orientedSurface = (id, center, width, depth, y, angle = yaw, options = {}) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let surface = null;
      surface = addSurface(
        id,
        center.x,
        center.z,
        Math.abs(cos) * width + Math.abs(sin) * depth,
        Math.abs(sin) * width + Math.abs(cos) * depth,
        y,
        {
          areaId: attraction.areaId,
          dynamic: options.dynamic,
          object: options.object,
          contains(x, z) {
            const dx = x - surface.x;
            const dz = z - surface.z;
            const localX = dx * cos - dz * sin;
            const localZ = dx * sin + dz * cos;
            const padding = Math.min(PLAYER_RADIUS * 0.16, width * 0.06, depth * 0.06);
            return Math.abs(localX) <= width / 2 - padding && Math.abs(localZ) <= depth / 2 - padding;
          },
        },
      );
      return surface;
    };

    if (template === "progressive-rope-weights") {
      for (let section = 0; section < 6; section += 1) {
        const amount = 0.18 + section * 0.125;
        const height = 5.4 - section * 0.72;
        for (const lateral of [-2.1, 2.1]) box(`weight-wedge-wall-${section}-${lateral}`, [0.42, height, 2.4], at(amount, lateral, height / 2), materials.darkWood, { rotationY: yaw, solid: true });
      }
      const slopeTop = at(0.12, 0, 4.85);
      const slopeBottom = at(0.9, 0, 0.3);
      tagOfficialMesh(addRamp(`${attraction.officialId}-weight-wedge-floor`, "official-attraction", [slopeTop.x, slopeTop.y, slopeTop.z], [slopeBottom.x, slopeBottom.y, slopeBottom.z], 3.8, materials.darkWood, { areaId: attraction.areaId }), representation);
      const pullPoint = at(0.08, -2.75, 1.2);
      beam("weight-pull-rope", pullPoint, at(0.08, -2.75, 5.55), 0.1, whiteRope);
      beam("weight-pulley-rope", at(0.08, -2.75, 5.55), at(0.88, 0, 2.2), 0.1, whiteRope);
      torus("weight-pull-handle", 0.5, 0.1, pullPoint, materials.white, { rotationY: yaw, segments: 16 });
      const weights = Array.from({ length: 5 }, (_entry, weightIndex) => {
        const home = at(0.64 + weightIndex * 0.055, 0, 0.72 + weightIndex * 0.42);
        const mesh = box(`progressive-weight-${weightIndex}`, [3.1, 0.82, 0.95], home, weightIndex === 0 ? materials.wood : materials.darkWood, { rotationY: yaw });
        return { mesh, home };
      });
      representation.weightPullStep = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-progressive-pull`, label: "Eでロープを引き重りを1つずつ増やす", point: pullPoint, radius: 4.4, areaId: attraction.areaId,
        activate() {
          representation.weightPullStep = representation.weightPullStep >= weights.length ? 1 : representation.weightPullStep + 1;
          representation.weightPullAt = performance.now();
          handle.notify?.(representation.weightPullStep === weights.length ? "💪 5つすべての重りを引き寄せた！" : `🪢 重り ${representation.weightPullStep}/${weights.length}　次はさらに重い！`);
          playTone(250 + representation.weightPullStep * 70, 0.12, "triangle");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const pulse = representation.weightPullAt ? Math.sin(clamp((now - representation.weightPullAt) / 650, 0, 1) * Math.PI) : 0;
        weights.forEach(({ mesh, home }, weightIndex) => {
          const engaged = weightIndex < representation.weightPullStep;
          mesh.position.y = home.y + (engaged ? 0.16 : 0) + (weightIndex === representation.weightPullStep - 1 ? pulse * 0.48 : 0);
          mesh.position.x = home.x - ux * (engaged ? 0.24 : 0);
          mesh.position.z = home.z - uz * (engaged ? 0.24 : 0);
        });
      });
      representation.publishedWeightCount = 5;
      representation.detailProfile = "photo-matched-dark-brown-wedge-five-progressive-weights-pulley-and-white-pull-rope";
      return true;
    }
    if (template === "magic-ball-maze") {
      const tableHeight = 1.05;
      playable("maze-start-table", [4.4, 0.28, 4], at(0.2, -2.05, tableHeight), materials.lime, { rotationY: yaw });
      playable("maze-bottom-lane", [5.8, 0.28, 1.75], at(0.35, 0, tableHeight), materials.lime, { rotationY: yaw });
      playable("maze-right-lane", [1.75, 0.28, 5], at(0.53, 2.05, tableHeight), materials.lime, { rotationY: yaw });
      playable("maze-top-lane", [5.8, 0.28, 1.75], at(0.69, 0, tableHeight), materials.lime, { rotationY: yaw });
      playable("maze-goal-table", [4.1, 0.28, 3.7], at(0.84, -2.05, tableHeight), materials.lime, { rotationY: yaw });
      for (const lateral of [-3.75, 3.75]) beam(`maze-wood-rail-${lateral}`, at(0.13, lateral, tableHeight + 0.3), at(0.9, lateral, tableHeight + 0.3), 0.13, materials.wood);
      for (const amount of [0.13, 0.9]) beam(`maze-end-rail-${amount}`, at(amount, -3.75, tableHeight + 0.3), at(amount, 3.75, tableHeight + 0.3), 0.13, materials.wood);
      const ballPath = [
        at(0.17, -2.15, tableHeight + 0.42), at(0.31, -2.15, tableHeight + 0.42), at(0.36, 0, tableHeight + 0.42),
        at(0.48, 2.05, tableHeight + 0.42), at(0.57, 2.05, tableHeight + 0.42), at(0.67, 0, tableHeight + 0.42),
        at(0.76, -2.05, tableHeight + 0.42), at(0.86, -2.05, tableHeight + 0.42),
      ];
      const magicBall = sphere("magic-maze-ball", 0.43, ballPath[0], materials.purple, { segments: 14 });
      const goal = ballPath[ballPath.length - 1];
      cylinder("maze-goal-cup", 0.48, 0.12, { ...goal, y: goal.y - 0.33 }, materials.black, { segments: 16 });
      beam("maze-white-flag-pole", { ...goal, y: goal.y - 0.2 }, { ...goal, y: goal.y + 2.2 }, 0.07, materials.white);
      box("maze-white-flag", [1.25, 0.72, 0.12], { x: goal.x + px * 0.55, y: goal.y + 1.85, z: goal.z + pz * 0.55 }, materials.white, { rotationY: yaw });
      representation.mazeStep = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-maze-ball`, label: "Eで魔法の球を狭い迷路へ一打ずつ進める", point: ballPath[0], radius: 4.4, areaId: attraction.areaId,
        activate() {
          representation.mazeStep = representation.mazeStep >= ballPath.length - 1 ? 1 : representation.mazeStep + 1;
          representation.mazeMoveAt = performance.now();
          handle.notify?.(representation.mazeStep === ballPath.length - 1 ? "✨ 魔法の球がゴールへ到達！" : `🟣 迷路 ${representation.mazeStep}/${ballPath.length - 1}`);
          playTone(360 + representation.mazeStep * 55, 0.1, "sine");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const toIndex = representation.mazeStep;
        const from = ballPath[Math.max(0, toIndex - 1)];
        const to = ballPath[toIndex];
        const progress = representation.mazeMoveAt ? clamp((now - representation.mazeMoveAt) / 460, 0, 1) : 1;
        magicBall.position.set(lerp(from.x, to.x, progress), lerp(from.y, to.y, progress) + Math.sin(progress * Math.PI) * 0.18, lerp(from.z, to.z, progress));
        magicBall.rotation.x += 0.035;
      });
      representation.detailProfile = "photo-matched-low-green-turf-u-maze-wood-rails-single-purple-ball-white-flag-cup-step-control";
      return true;
    }
    if (template === "jump-touch-panels") {
      beam("jump-target-crossbar", at(0.08, 0, 6.25), at(0.95, 0, 6.25), 0.34, materials.wood);
      for (const amount of [0.08, 0.95]) {
        for (const lateral of [-2.6, 2.6]) beam(`jump-target-a-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, 0, 6.25), 0.31, materials.wood);
      }
      const targets = Array.from({ length: 13 }, (_entry, targetIndex) => {
        const amount = 0.1 + targetIndex * 0.068;
        const height = 1.15 + targetIndex * 0.3;
        const location = at(amount, 0, height);
        beam(`jump-target-rope-${targetIndex}`, location, at(amount, 0, 6.08), 0.055, whiteRope);
        const mesh = sphere(`jump-rock-panel-${targetIndex}`, 0.42, location, materials.stone, { scaleX: 0.82, scaleY: 1.12, scaleZ: 0.72, segments: 6 });
        return { mesh, location };
      });
      representation.jumpTargetStep = 0;
      representation.interactive = true;
      const touchPoint = (targetIndex) => ({
        x: targets[targetIndex].location.x,
        y: baseY + PLAYER_FOOT_OFFSET,
        z: targets[targetIndex].location.z,
      });
      let jumpTouchInteraction = null;
      jumpTouchInteraction = registerInteraction({
        id: `official-${attraction.officialId}-jump-touch`, label: "Eで目の前の岩へジャンプタッチ", point: touchPoint(0), radius: 1.05, areaId: attraction.areaId,
        activate() {
          representation.jumpTargetStep = representation.jumpTargetStep >= targets.length ? 1 : representation.jumpTargetStep + 1;
          representation.jumpTouchAt = performance.now();
          jumpTouchInteraction.point = touchPoint(representation.jumpTargetStep % targets.length);
          handle.notify?.(representation.jumpTargetStep === targets.length ? "🪨 最高到達点をタッチ！" : `⬆ 岩ターゲット ${representation.jumpTargetStep}/${targets.length}`);
          playTone(300 + representation.jumpTargetStep * 38, 0.09, "triangle");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const activeIndex = representation.jumpTargetStep - 1;
        const pulse = representation.jumpTouchAt ? Math.sin(clamp((now - representation.jumpTouchAt) / 520, 0, 1) * Math.PI) : 0;
        targets.forEach(({ mesh, location }, targetIndex) => {
          mesh.position.y = location.y + (targetIndex === activeIndex ? pulse * 0.42 : 0);
          mesh.scale.set(targetIndex === activeIndex ? 0.82 + pulse * 0.24 : 0.82, targetIndex === activeIndex ? 1.12 + pulse * 0.24 : 1.12, 0.72);
        });
      });
      representation.publishedTargetCount = 13;
      representation.targetInteractionRadius = 1.05;
      representation.detailProfile = "photo-matched-natural-a-frame-thirteen-white-rope-grey-rock-panels-rising-spatially-advancing-jump-touch-sequence";
      return true;
    }
    if (template === "punch-sandbag") {
      const railStart = at(0.16, 0, 6.1);
      const railEnd = at(0.94, 0, 5.65);
      for (const lateral of [-0.28, 0.28]) beam(`sandbag-steel-rail-${lateral}`, { x: railStart.x + px * lateral, y: railStart.y, z: railStart.z + pz * lateral }, { x: railEnd.x + px * lateral, y: railEnd.y, z: railEnd.z + pz * lateral }, 0.17, materials.steel);
      for (const amount of [0.14, 0.96]) for (const lateral of [-2.45, 2.45]) beam(`sandbag-a-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, 0, 6.2), 0.3, materials.wood);
      const bagHome = at(0.2, 0, 2.15);
      const bagGroup = new constructors.Group();
      bagGroup.name = `Greenia:${attraction.officialId}-sliding-sandbag-group`;
      bagGroup.position.set(bagHome.x, bagHome.y, bagHome.z);
      bagGroup.rotation.y = yaw;
      root.add(bagGroup);
      cylinder("black-punch-bag", 0.72, 2.7, { x: 0, y: 0, z: 0 }, materials.black, { segments: 16, parent: bagGroup });
      box("red-sandbag-trolley", [1.25, 0.42, 0.82], { x: 0, y: 3.72, z: 0 }, materials.red, { parent: bagGroup });
      for (const lateral of [-0.34, 0.34]) {
        for (const along of [-0.18, 0.18]) {
          beam(`sandbag-chain-${lateral}-${along}`, { x: lateral, y: 1.35, z: along }, { x: lateral * 0.75, y: 3.55, z: along * 0.5 }, 0.045, materials.steel, { parent: bagGroup });
        }
      }
      for (let marker = 1; marker <= 5; marker += 1) {
        const location = at(0.2 + marker * 0.13, 2.25, 0.75);
        box(`sandbag-distance-marker-${marker}`, [0.55, 1.5, 0.2], location, marker < 4 ? materials.yellow : materials.coral, { rotationY: yaw });
      }
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-punch`, label: "Eでサンドバッグを打ち飛ばす", point: at(0.16, -1.6, 1), radius: 4.4, areaId: attraction.areaId,
        activate() {
          representation.sandbagPunchAt = performance.now();
          representation.sandbagPower = 0.62 + ((representation.sandbagPunchCount || 0) % 4) * 0.1;
          representation.sandbagPunchCount = (representation.sandbagPunchCount || 0) + 1;
          handle.notify?.(`🥊 ${(representation.sandbagPower * 10).toFixed(1)}m！サンドバッグがレールを滑走`);
          playTone(190, 0.2, "sawtooth");
          return true;
        },
      });
      addAnimation((seconds, now) => {
        const elapsed = representation.sandbagPunchAt ? now - representation.sandbagPunchAt : 9_999;
        const progress = clamp(elapsed / 2_000, 0, 1);
        const travel = Math.sin(progress * Math.PI) * Math.min(0.74, representation.sandbagPower || 0);
        const target = at(0.2 + travel, 0, 2.15);
        bagGroup.position.set(target.x, target.y, target.z);
        bagGroup.rotation.y = yaw;
        bagGroup.rotation.z = Math.sin(progress * Math.PI * 7) * (1 - progress) * 0.16 + Math.sin(seconds * 0.7) * 0.02;
      });
      representation.railTravelLimit = 0.74;
      representation.detailProfile = "photo-matched-wood-a-frame-double-steel-rail-red-trolley-four-chains-black-punch-bag-clamped-to-rail-distance-run";
      return true;
    }
    if (template === "gong-log-finale") {
      for (const amount of [0.14, 0.72]) for (const lateral of [-2.6, 2.6]) beam(`gong-log-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, lateral, 6), 0.33, materials.wood);
      for (const lateral of [-2.6, 2.6]) beam(`gong-log-top-${lateral}`, at(0.1, lateral, 6), at(0.76, lateral, 6), 0.3, materials.wood);
      const logHome = at(0.42, 0, 1.05);
      const logGroup = new constructors.Group();
      logGroup.name = `Greenia:${attraction.officialId}-gong-log-group`;
      logGroup.position.set(logHome.x, logHome.y, logHome.z);
      logGroup.rotation.y = yaw;
      root.add(logGroup);
      cylinder("gong-striking-log", 0.5, 6.6, { x: 0, y: 0, z: 0 }, materials.wood, { rotationX: Math.PI / 2, segments: 12, parent: logGroup });
      for (const along of [-2.35, 2.35]) beam(`gong-log-suspension-${along}`, { x: 0, y: 0, z: along }, { x: 0, y: 4.95, z: along }, 0.07, whiteRope, { parent: logGroup });
      for (let grip = 0; grip < 4; grip += 1) beam(`gong-hand-rope-${grip}`, at(0.2 + grip * 0.11, -1.55 + grip * 1.03, 1.2), at(0.2 + grip * 0.11, -1.55 + grip * 1.03, 5.8), 0.075, whiteRope);
      const gongPoint = at(0.86, 0, 2.35);
      const gongGroup = new constructors.Group();
      gongGroup.name = `Greenia:${attraction.officialId}-bronze-gong-group`;
      gongGroup.position.set(gongPoint.x, gongPoint.y, gongPoint.z);
      gongGroup.rotation.y = yaw;
      root.add(gongGroup);
      cylinder("bronze-gong-disc", 1.25, 0.22, { x: 0, y: 0, z: 0 }, materials.yellow, { rotationX: Math.PI / 2, segments: 20, parent: gongGroup });
      cylinder("gong-dark-center", 0.45, 0.26, { x: 0, y: 0, z: -0.16 }, materials.darkWood, { rotationX: Math.PI / 2, segments: 16, parent: gongGroup });
      for (const lateral of [-0.82, 0.82]) beam(`gong-hanger-${lateral}`, { x: lateral, y: 0.8, z: 0 }, { x: lateral * 1.3, y: 3.25, z: 0 }, 0.055, whiteRope, { parent: gongGroup });
      box("quest-complete-monument", [4.4, 4.8, 0.7], at(0.96, 0, 2.4), materials.stone, { rotationY: yaw });
      torus("monument-dragon-crest", 0.85, 0.15, at(0.955, 0, 3.05), materials.teal, { rotationY: yaw, segments: 10 });
      const logHalfLength = 3.3;
      const gongTravel = (gongPoint.x - logHome.x) * ux + (gongPoint.z - logHome.z) * uz;
      const strikeTravel = Math.max(0.2, gongTravel - logHalfLength);
      representation.gongKickStep = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-gong-kick`, label: "Eでロープを握り丸太を足で揺らす", point: at(0.13, 0, 1.1), radius: 4.5, areaId: attraction.areaId,
        activate() {
          representation.gongKickStep = representation.gongKickStep >= 3 ? 1 : representation.gongKickStep + 1;
          representation.gongKickAt = performance.now();
          representation.gongContactAt = null;
          representation.gongKickPreviousProgress = 0;
          handle.notify?.(representation.gongKickStep === 3 ? "🦶 魂の一撃！丸太がドラへ向かう" : `🦶 丸太スイング ${representation.gongKickStep}/3`);
          playTone(260 + representation.gongKickStep * 90, 0.16, "triangle");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const progress = representation.gongKickAt ? clamp((now - representation.gongKickAt) / 900, 0, 1) : 1;
        const reachRatio = representation.gongKickStep === 3 ? 1.02 : 0.2 + representation.gongKickStep * 0.2;
        const swing = Math.sin(progress * Math.PI) * strikeTravel * reachRatio;
        logGroup.position.x = logHome.x + ux * swing;
        logGroup.position.z = logHome.z + uz * swing;
        logGroup.rotation.y = yaw;
        logGroup.rotation.x = Math.sin(progress * Math.PI * 2) * 0.12;
        const logTipX = logGroup.position.x + ux * logHalfLength;
        const logTipZ = logGroup.position.z + uz * logHalfLength;
        const planarContactDistance = Math.hypot(logTipX - gongPoint.x, logTipZ - gongPoint.z);
        const crossedContactPeak = representation.gongKickPreviousProgress < 0.5 && progress >= 0.5;
        if (representation.gongKickStep === 3 && !representation.gongContactAt && (planarContactDistance <= 0.42 || crossedContactPeak)) {
          representation.gongContactAt = now;
          handle.notify?.("🔔 丸太の先端がドラへ命中—QUEST COMPLETE！");
          playTone(820, 0.34, "sine");
        }
        representation.gongKickPreviousProgress = progress;
        const contactProgress = representation.gongContactAt ? clamp((now - representation.gongContactAt) / 850, 0, 1) : 1;
        const gongPulse = representation.gongContactAt ? Math.sin(contactProgress * Math.PI * 8) * (1 - contactProgress) : 0;
        gongGroup.rotation.z = gongPulse * 0.12;
      });
      representation.publishedSuspensionRopeCount = 2;
      representation.publishedHandRopeCount = 4;
      representation.detailProfile = "photo-matched-two-suspension-and-four-hand-rope-long-log-physical-tip-contact-bronze-gong-dark-center-stone-quest-monument-three-kick-finale";
      return true;
    }
    if (template === "mini-hydraulic-excavator") {
      playable("excavator-wood-sandbox", [7.6, 0.28, 6.2], at(0.78, 0, 0.14), materials.path, { rotationY: yaw });
      for (const lateral of [-3.25, 3.25]) beam(`excavator-sandbox-side-${lateral}`, at(0.58, lateral, 0.42), at(0.98, lateral, 0.42), 0.22, materials.wood);
      for (const amount of [0.58, 0.98]) beam(`excavator-sandbox-end-${amount}`, at(amount, -3.25, 0.42), at(amount, 3.25, 0.42), 0.22, materials.wood);

      for (const lateral of [-1.18, 1.18]) {
        box(`excavator-wide-rubber-track-${lateral}`, [0.82, 0.78, 4.15], at(0.3, lateral, 0.56), materials.black, { rotationY: yaw });
        for (let tread = 0; tread < 12; tread += 1) {
          const amount = 0.198 + tread * 0.0185;
          box(`excavator-track-top-tread-${lateral}-${tread}`, [0.96, 0.11, 0.24], at(amount, lateral, 0.98), materials.steel, { rotationY: yaw });
          box(`excavator-track-bottom-tread-${lateral}-${tread}`, [0.96, 0.11, 0.24], at(amount, lateral, 0.14), materials.steel, { rotationY: yaw });
        }
        for (let roller = 0; roller < 3; roller += 1) {
          torus(`excavator-track-roller-${lateral}-${roller}`, 0.31, 0.1, at(0.235 + roller * 0.065, lateral + Math.sign(lateral) * 0.44, 0.56), materials.steel, { rotationY: yaw + Math.PI / 2, segments: 14 });
        }
      }
      cylinder("excavator-turntable", 1.52, 0.48, at(0.3, 0, 1.02), materials.black, { segments: 16 });
      const machineOrigin = at(0.3, 0, 1.18);
      const turretGroup = new constructors.Group();
      turretGroup.name = `Greenia:${attraction.officialId}-yellow-rotating-upper`;
      turretGroup.position.set(machineOrigin.x, machineOrigin.y, machineOrigin.z);
      turretGroup.rotation.y = yaw;
      root.add(turretGroup);
      box("excavator-yellow-upper", [2.8, 1.05, 2.7], { x: 0, y: 0.5, z: 0 }, materials.yellow, { parent: turretGroup });
      box("excavator-yellow-cab", [2.35, 2.4, 2.15], { x: -0.35, y: 2.0, z: -0.25 }, materials.yellow, { parent: turretGroup });
      box("excavator-dark-front-window", [1.55, 1.25, 0.12], { x: -0.35, y: 2.2, z: 0.86 }, materials.navy, { parent: turretGroup });
      box("excavator-dark-side-window", [0.12, 1.2, 1.2], { x: -1.2, y: 2.2, z: -0.18 }, materials.navy, { parent: turretGroup });
      box("excavator-dark-control-side-panel", [0.12, 1.15, 1.42], { x: 1.42, y: 1.55, z: -0.08 }, materials.black, { parent: turretGroup });
      box("excavator-dark-lower-belt", [2.9, 0.24, 2.78], { x: 0, y: 0.48, z: 0 }, materials.black, { parent: turretGroup });
      for (const lateral of [-0.72, 0.72]) {
        beam(`excavator-joystick-${lateral}`, { x: lateral, y: 1.7, z: 0.25 }, { x: lateral, y: 2.35, z: 0.42 }, 0.07, materials.black, { parent: turretGroup });
        sphere(`excavator-joystick-knob-${lateral}`, 0.14, { x: lateral, y: 2.4, z: 0.44 }, materials.black, { segments: 10, parent: turretGroup });
      }
      sphere("excavator-red-emergency-stop", 0.18, { x: 0.9, y: 1.72, z: 0.34 }, materials.red, { segments: 12, parent: turretGroup });

      const armGroup = new constructors.Group();
      armGroup.name = `Greenia:${attraction.officialId}-two-section-black-boom`;
      armGroup.position.set(0, 1.45, 0.85);
      turretGroup.add(armGroup);
      beam("excavator-black-boom", { x: 0, y: 0, z: 0 }, { x: 0, y: 2.15, z: 3.3 }, 0.34, materials.black, { parent: armGroup });
      beam("excavator-black-arm", { x: 0, y: 2.15, z: 3.3 }, { x: 0, y: -0.28, z: 5.65 }, 0.29, materials.black, { parent: armGroup });
      beam("excavator-main-hydraulic", { x: 0.46, y: 0.18, z: 0.15 }, { x: 0.46, y: 1.7, z: 2.82 }, 0.09, materials.steel, { parent: armGroup });
      beam("excavator-arm-hydraulic", { x: -0.44, y: 1.72, z: 2.82 }, { x: -0.44, y: 0.55, z: 4.82 }, 0.08, materials.steel, { parent: armGroup });
      beam("excavator-bucket-hydraulic", { x: 0.34, y: 0.38, z: 4.62 }, { x: 0.34, y: -0.32, z: 5.68 }, 0.07, materials.steel, { parent: armGroup });
      const bucketGroup = new constructors.Group();
      bucketGroup.name = `Greenia:${attraction.officialId}-angular-silver-bucket`;
      bucketGroup.position.set(0, -0.35, 5.95);
      armGroup.add(bucketGroup);
      box("excavator-silver-bucket", [2.05, 1.0, 1.42], { x: 0, y: 0, z: 0.35 }, materials.steel, { rotationX: -0.24, parent: bucketGroup });
      for (const lateral of [-0.72, 0, 0.72]) box(`excavator-bucket-tooth-${lateral}`, [0.26, 0.26, 0.76], { x: lateral, y: -0.42, z: 1.0 }, materials.steel, { rotationX: -0.35, parent: bucketGroup });
      const sandLoad = sphere("excavator-bucket-sand-load", 0.62, { x: 0, y: 0.2, z: 0.45 }, materials.path, { scaleX: 1.25, scaleY: 0.55, scaleZ: 0.82, segments: 10, parent: bucketGroup });
      sandLoad.visible = false;

      const poseTargets = [
        { yaw: 0, lift: 0, dump: 0 },
        { yaw: 0, lift: 0.18, dump: 0.3 },
        { yaw: -1.18, lift: 0.12, dump: 0.12 },
        { yaw: -1.18, lift: -0.2, dump: 0.05 },
        { yaw: -1.18, lift: -0.12, dump: -1.05 },
      ];
      const stageMessages = ["", "砂をすくった", "上部を旋回した", "砂を運搬位置へ上げた", "砂場へ排出した"];
      representation.excavatorStage = 0;
      representation.excavatorPose = { ...poseTargets[0] };
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-four-stage-excavator`, label: "Eで掬う→旋回→運搬→排出", point: at(0.2, -2.4, 1.2), radius: 4.8, areaId: attraction.areaId,
        activate() {
          representation.excavatorStage = representation.excavatorStage >= 4 ? 1 : representation.excavatorStage + 1;
          representation.excavatorActivatedAt = performance.now();
          handle.notify?.(`🚜 ${representation.excavatorStage}/4 ${stageMessages[representation.excavatorStage]}`);
          playTone(170 + representation.excavatorStage * 75, 0.16, "sawtooth");
          return true;
        },
      });
      addAnimation((_seconds) => {
        const target = poseTargets[representation.excavatorStage];
        const pose = representation.excavatorPose;
        pose.yaw = lerp(pose.yaw, target.yaw, 0.085);
        pose.lift = lerp(pose.lift, target.lift, 0.085);
        pose.dump = lerp(pose.dump, target.dump, 0.1);
        turretGroup.rotation.y = yaw + pose.yaw;
        armGroup.rotation.x = pose.lift;
        bucketGroup.rotation.x = pose.dump;
        sandLoad.visible = representation.excavatorStage >= 1 && representation.excavatorStage < 4;
      });
      representation.publishedJoystickCount = 2;
      representation.publishedHydraulicCylinderCount = 3;
      representation.publishedOperationStageCount = 4;
      representation.publishedTrackTreadCount = 48;
      representation.publishedTrackRollerCount = 6;
      representation.detailProfile = "photo-matched-yellow-black-mini-hydraulic-excavator-wide-rubber-tracks-forty-eight-treads-six-side-rollers-black-control-panels-two-section-boom-three-cylinders-angular-silver-bucket-wood-sandbox-four-stage-cycle";
      return true;
    }
    if (template === "polygon-antlion-bowl") {
      const facetCount = 10;
      const bowlCenter = at(0.55, 0, 0);
      const bowlPoint = (radius, angle, height) => ({
        x: bowlCenter.x + ux * Math.cos(angle) * radius + px * Math.sin(angle) * radius,
        y: bowlCenter.y + height,
        z: bowlCenter.z + uz * Math.cos(angle) * radius + pz * Math.sin(angle) * radius,
      });
      cylinder("antlion-central-dirt", 1.25, 0.24, bowlPoint(0, 0, 0.12), materials.path, { segments: 20 });
      const bowlHeight = 3.08;
      const bowlMaterial = createMaterial(`antlion-inner-${attraction.officialId}`, 0xffffff, {
        map: materials.wood.map,
        roughness: 0.86,
        side: 2,
      });
      if (constructors.CylinderGeometry) {
        const bowlGeometry = new constructors.CylinderGeometry(5.05, 1.02, bowlHeight, facetCount, 1, true);
        const bowlMesh = decorateMesh(
          new constructors.Mesh(bowlGeometry, bowlMaterial),
          `${attraction.officialId}-ten-trapezoid-board-bowl`,
          "official-attraction",
          { castShadow: true, receiveShadow: true },
        );
        bowlMesh.position.set(bowlCenter.x, bowlCenter.y + 0.14 + bowlHeight / 2, bowlCenter.z);
        bowlMesh.rotation.y = yaw;
        root.add(bowlMesh);
        tagOfficialMesh(bowlMesh, representation);
      } else {
        // Some supported hosts only expose BoxGeometry. Preserve a playable,
        // open bowl there with stepped radial boards instead of aborting all 168 builds.
        const radialSteps = 5;
        for (let facet = 0; facet < facetCount; facet += 1) {
          const angle = facet / facetCount * Math.PI * 2;
          for (let step = 0; step < radialSteps; step += 1) {
            const innerRadius = 1.02 + (4.03 * step) / radialSteps;
            const outerRadius = 1.02 + (4.03 * (step + 1)) / radialSteps;
            const middleRadius = (innerRadius + outerRadius) / 2;
            const middleHeight = 0.14 + ((middleRadius - 1.02) / 4.03) * bowlHeight;
            box(
              `antlion-fallback-board-${facet}-${step}`,
              [Math.max(0.7, 2 * middleRadius * Math.sin(Math.PI / facetCount)), 0.12, 1.02],
              bowlPoint(middleRadius, angle, middleHeight),
              bowlMaterial,
              { rotationX: -Math.atan2(bowlHeight, 4.03), rotationY: yaw + angle },
            );
          }
        }
      }
      addSurface(
        `${attraction.officialId}-continuous-radial-bowl-surface`,
        bowlCenter.x,
        bowlCenter.z,
        10.1,
        10.1,
        bowlCenter.y + 0.14,
        {
          areaId: attraction.areaId,
          contains(x, z) {
            const radius = Math.hypot(x - bowlCenter.x, z - bowlCenter.z);
            return radius >= 1.02 && radius <= 5.05;
          },
          heightAt(x, z) {
            const radius = Math.hypot(x - bowlCenter.x, z - bowlCenter.z);
            return bowlCenter.y + 0.14 + clamp((radius - 1.02) / (5.05 - 1.02), 0, 1) * bowlHeight;
          },
        },
      );
      for (let facet = 0; facet < facetCount; facet += 1) {
        const angle = facet / facetCount * Math.PI * 2;
        beam(`antlion-panel-seam-${facet}`, bowlPoint(1.02, angle, 0.19), bowlPoint(5.05, angle, 3.27), 0.045, materials.darkWood);
        const nextAngle = (facet + 1) / facetCount * Math.PI * 2;
        beam(`antlion-rim-post-${facet}`, bowlPoint(5.28, angle, 0.05), bowlPoint(5.28, angle, 4.25), 0.24, materials.wood);
        for (const height of [3.48, 4.05]) beam(`antlion-white-rim-rope-${facet}-${height}`, bowlPoint(5.28, angle, height), bowlPoint(5.28, nextAngle, height), 0.06, whiteRope);
      }
      for (let step = 0; step < 8; step += 1) {
        const angle = Math.PI;
        const radius = 5.1 + step * 0.36;
        const height = 2.95 - step * 0.36;
        const center = bowlPoint(radius, angle, height);
        const tangentX = ux * -Math.sin(angle) + px * Math.cos(angle);
        const tangentZ = uz * -Math.sin(angle) + pz * Math.cos(angle);
        beam(`antlion-entry-stacked-log-${step}`, { x: center.x - tangentX * 1.45, y: center.y, z: center.z - tangentZ * 1.45 }, { x: center.x + tangentX * 1.45, y: center.y, z: center.z + tangentZ * 1.45 }, 0.23, materials.wood);
      }
      const spiralPath = Array.from({ length: 14 }, (_entry, pathIndex) => {
        const angle = Math.PI + pathIndex * 0.76;
        const radius = 1.08 + pathIndex * ((4.82 - 1.08) / 13);
        const surfaceHeight = 0.14 + clamp((radius - 1.02) / (5.05 - 1.02), 0, 1) * bowlHeight;
        return bowlPoint(radius, angle, surfaceHeight + PLAYER_FOOT_OFFSET);
      });
      const bowlRunner = sphere("antlion-run-guide", 0.3, { ...spiralPath[0], y: spiralPath[0].y - 0.7 }, materials.lime, { segments: 12 });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-spiral-ascent`, label: "Eですり鉢内壁を旋回して上昇", point: spiralPath[0], radius: 4.5, areaId: attraction.areaId,
        activate() {
          const started = beginPathRide(`official-${attraction.officialId}-spiral-ascent`, attraction.areaId, spiralPath, 6_500, null, attraction.name, attraction.number - 1, 1.2, { startMessage: "🌀 すり鉢の内壁を旋回しながら駆け上がる！" });
          if (started) representation.antlionRunAt = performance.now();
          return started;
        },
      });
      addAnimation((_seconds, now) => {
        const progress = representation.antlionRunAt ? clamp((now - representation.antlionRunAt) / 6_500, 0, 1) : 0;
        const scaled = progress * (spiralPath.length - 1);
        const segment = Math.min(spiralPath.length - 2, Math.floor(scaled));
        const amount = scaled - segment;
        bowlRunner.position.set(lerp(spiralPath[segment].x, spiralPath[segment + 1].x, amount), lerp(spiralPath[segment].y, spiralPath[segment + 1].y, amount) - 0.7, lerp(spiralPath[segment].z, spiralPath[segment + 1].z, amount));
      });
      representation.publishedFacetCount = facetCount;
      representation.publishedEntryStepCount = 8;
      representation.publishedRopeRailLevels = 2;
      representation.detailProfile = "photo-matched-continuous-ten-trapezoid-textured-natural-board-antlion-bowl-central-dirt-ten-log-posts-double-white-rope-rim-eight-stacked-log-entry-spiral-ascent-path";
      return true;
    }
    if (template === "dense-pole-climb") {
      for (const amount of [0.2, 0.84]) for (const lateral of [-2.55, 2.55]) beam(`pole-frame-post-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, lateral, 5.05), 0.3, materials.wood);
      for (const lateral of [-2.55, 0, 2.55]) beam(`pole-frame-top-long-${lateral}`, at(0.18, lateral, 5), at(0.86, lateral, 5), 0.24, materials.wood);
      for (const amount of [0.2, 0.41, 0.63, 0.84]) beam(`pole-frame-top-cross-${amount}`, at(amount, -2.55, 5), at(amount, 2.55, 5), 0.24, materials.wood);
      const verticalPoles = [];
      for (let row = 0; row < 6; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          const amount = 0.27 + row * 0.09;
          const lateral = -1.45 + column * 1.45 + (row % 2 ? 0.22 : -0.22);
          const pole = beam(`dense-silver-pole-${row}-${column}`, at(amount, lateral, 0.18), at(amount, lateral, 4.82), 0.105, materials.steel);
          verticalPoles.push(pole);
        }
      }
      for (let level = 0; level < 2; level += 1) {
        const deckHeight = 1.55 + level * 1.65;
        playable(`pole-right-deck-${level}`, [2.55, 0.28, 2.7], at(0.42 + level * 0.25, 2.05, deckHeight), materials.lightWood, { rotationY: yaw });
        for (let log = 0; log < 4; log += 1) beam(`pole-right-deck-log-${level}-${log}`, at(0.31 + level * 0.25 + log * 0.075, 1.0, deckHeight + 0.18), at(0.31 + level * 0.25 + log * 0.075, 3.05, deckHeight + 0.18), 0.18, materials.wood);
      }
      playable("pole-upper-transition-deck", [2.55, 0.28, 3.4], at(0.81, 2.05, 3.2), materials.lightWood, { rotationY: yaw });
      const polePath = [
        at(0.2, -2.25, PLAYER_FOOT_OFFSET), at(0.29, -0.7, PLAYER_FOOT_OFFSET), at(0.37, 0.72, PLAYER_FOOT_OFFSET),
        at(0.46, -0.7, PLAYER_FOOT_OFFSET), at(0.55, 0.72, PLAYER_FOOT_OFFSET + 0.25), at(0.63, 1.75, PLAYER_FOOT_OFFSET + 0.85),
        at(0.66, 2.05, 1.55 + PLAYER_FOOT_OFFSET), at(0.7, 1.25, 2.15 + PLAYER_FOOT_OFFSET),
        at(0.74, 2.05, 3.2 + PLAYER_FOOT_OFFSET), at(0.84, 2.05, 3.34 + PLAYER_FOOT_OFFSET),
      ];
      const poleGuide = sphere("dense-pole-path-guide", 0.27, { ...polePath[0], y: polePath[0].y - 0.68 }, materials.yellow, { segments: 10 });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-weave-and-climb`, label: "Eで18本のポールを縫って上層へ", point: polePath[0], radius: 4.3, areaId: attraction.areaId,
        activate() {
          const started = beginPathRide(`official-${attraction.officialId}-weave-and-climb`, attraction.areaId, polePath, 5_700, null, attraction.name, attraction.number - 1, 1.2, { startMessage: "🪜 銀ポールの隙間を縫い、右の二層デッキへ登る！" });
          if (started) representation.poleClimbAt = performance.now();
          return started;
        },
      });
      addAnimation((_seconds, now) => {
        const progress = representation.poleClimbAt ? clamp((now - representation.poleClimbAt) / 5_700, 0, 1) : 0;
        const scaled = progress * (polePath.length - 1);
        const segment = Math.min(polePath.length - 2, Math.floor(scaled));
        const amount = scaled - segment;
        poleGuide.position.set(lerp(polePath[segment].x, polePath[segment + 1].x, amount), lerp(polePath[segment].y, polePath[segment + 1].y, amount) - 0.68, lerp(polePath[segment].z, polePath[segment + 1].z, amount));
        verticalPoles.forEach((pole, poleIndex) => { pole.scale.x = pole.scale.z = poleIndex === Math.floor(progress * verticalPoles.length) ? 0.145 : 0.105; });
      });
      representation.publishedPoleCount = verticalPoles.length;
      representation.publishedDeckLevels = 2;
      representation.detailProfile = "photo-matched-four-meter-natural-log-cubic-frame-eighteen-dense-silver-vertical-poles-top-log-grid-right-two-level-log-decks-weaving-climb-path";
      return true;
    }
    if (template === "brick-heist-wall") {
      const wallAmount = 0.57;
      box("heist-red-brick-main-wall", [9.2, 6.7, 0.62], at(wallAmount, 0, 3.35), materials.red, { rotationY: yaw, solid: true });
      const muralTexture = createCanvasTexture(`heist-mural-${attraction.officialId}`, 1024, 768, (context, canvas) => {
        const brickGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        brickGradient.addColorStop(0, "#b93648");
        brickGradient.addColorStop(0.55, "#d44c4b");
        brickGradient.addColorStop(1, "#8f2938");
        context.fillStyle = brickGradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = "rgba(255,232,205,.76)";
        context.lineWidth = 5;
        const rowHeight = 64;
        const brickWidth = 128;
        for (let row = 0; row <= 12; row += 1) {
          const y = row * rowHeight;
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(canvas.width, y);
          context.stroke();
          const offset = row % 2 ? brickWidth / 2 : 0;
          for (let x = offset; x <= canvas.width; x += brickWidth) {
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x, y + rowHeight);
            context.stroke();
          }
        }
        context.save();
        context.translate(650, 118);
        context.rotate(-0.06);
        context.font = "900 104px system-ui";
        context.lineJoin = "round";
        context.lineWidth = 28;
        context.strokeStyle = "#32c7d5";
        context.strokeText("VOXCEL", 0, 0);
        context.lineWidth = 15;
        context.strokeStyle = "#f6d943";
        context.strokeText("VOXCEL", 0, 0);
        context.fillStyle = "#7650bd";
        context.fillText("VOXCEL", 0, 0);
        context.restore();
        for (let poster = 0; poster < 5; poster += 1) {
          const x = 360 + poster * 70;
          context.fillStyle = "#e7d5ae";
          context.fillRect(x, 260, 56, 78);
          context.fillStyle = "#26313e";
          context.fillRect(x + 9, 272, 38, 34);
          context.font = "800 12px system-ui";
          context.textAlign = "center";
          context.fillText("WANTED", x + 28, 326);
        }
        const paintColors = ["#ffcf3c", "#29c6c0", "#7554c4", "#f06a39", "#213e78"];
        for (let splash = 0; splash < 13; splash += 1) {
          const x = 70 + splash * 71;
          const y = 150 + (splash % 4) * 125;
          context.fillStyle = paintColors[splash % paintColors.length];
          context.beginPath();
          context.arc(x, y, 18 + splash % 3 * 8, 0, Math.PI * 2);
          context.fill();
          context.fillRect(x - 6, y, 12, 36 + splash % 4 * 12);
        }
      });
      const muralMaterial = createMaterial(`heist-mural-${attraction.officialId}`, 0xffffff, {
        map: muralTexture,
        roughness: 0.78,
        side: 2,
      });
      tagOfficialMesh(addPlane(
        `${attraction.officialId}-brick-heist-pixel-mural`,
        "official-attraction",
        [8.86, 6.28],
        [at(wallAmount - 0.04).x, baseY + 3.35, at(wallAmount - 0.04).z],
        muralMaterial,
        { rotationY: yaw + Math.PI },
      ), representation);
      for (let course = 1; course < 9; course += 1) beam(`heist-brick-horizontal-mortar-${course}`, at(wallAmount - 0.025, -4.45, course * 0.7), at(wallAmount - 0.025, 4.45, course * 0.7), 0.035, materials.white);
      for (let seam = 0; seam < 14; seam += 1) {
        const row = seam % 7;
        const lateral = -3.8 + Math.floor(seam / 7) * 3.9 + (row % 2 ? 0.55 : 0);
        box(`heist-brick-short-mortar-${seam}`, [0.05, 0.62, 0.1], at(wallAmount - 0.032, lateral, 0.35 + row * 0.84), materials.white, { rotationY: yaw });
      }
      box("heist-police-car-white-body", [2.65, 0.9, 0.2], at(wallAmount - 0.11, -3.15, 0.72), materials.white, { rotationY: yaw });
      box("heist-police-car-blue-cabin", [1.25, 0.75, 0.22], at(wallAmount - 0.12, -3.15, 1.4), materials.blue, { rotationY: yaw });
      for (const lateral of [-3.95, -2.35]) torus(`heist-police-car-wheel-${lateral}`, 0.35, 0.12, at(wallAmount - 0.14, lateral, 0.35), materials.black, { rotationY: yaw, segments: 14 });
      const beaconRed = sphere("heist-police-beacon-red", 0.18, at(wallAmount - 0.15, -3.38, 1.86), materials.red, { segments: 10 });
      const beaconBlue = sphere("heist-police-beacon-blue", 0.18, at(wallAmount - 0.15, -2.92, 1.86), materials.blue, { segments: 10 });

      for (const lateral of [-2.25, -1.25]) beam(`heist-red-ladder-side-${lateral}`, at(wallAmount - 0.16, lateral, 0.15), at(wallAmount - 0.16, lateral, 3.5), 0.095, materials.red);
      for (let rung = 0; rung < 8; rung += 1) beam(`heist-red-ladder-rung-${rung}`, at(wallAmount - 0.17, -2.25, 0.42 + rung * 0.41), at(wallAmount - 0.17, -1.25, 0.42 + rung * 0.41), 0.08, materials.red);
      beam("heist-green-crawl-tunnel", at(wallAmount - 0.22, -0.9, 1.25), at(wallAmount - 0.22, 0.75, 1.25), 0.52, materials.teal);
      for (const lateral of [-0.9, 0.75]) torus(`heist-green-tunnel-mouth-${lateral}`, 0.58, 0.14, at(wallAmount - 0.22, lateral, 1.25), materials.lime, { rotationY: yaw + Math.PI / 2, segments: 16 });
      box("heist-grey-trash-bin", [1.1, 1.3, 0.85], at(wallAmount - 0.25, 3.55, 0.65), materials.stone, { rotationY: yaw });
      box("heist-grey-trash-lid", [1.3, 0.16, 1.0], at(wallAmount - 0.25, 3.55, 1.36), materials.steel, { rotationY: yaw });
      const ledgeLaterals = [-1.0, 0.2, 1.25, 2.15, 3.0, 3.65];
      const ledgeHeights = [1.6, 2.05, 2.55, 3.15, 3.85, 4.65];
      for (let ledge = 0; ledge < ledgeLaterals.length; ledge += 1) playable(`heist-protruding-ledge-${ledge}`, [1.08, 0.24, 0.82], at(wallAmount - 0.28, ledgeLaterals[ledge], ledgeHeights[ledge]), [materials.purple, materials.red, materials.darkWood][ledge % 3], { rotationY: yaw });
      box("heist-upper-window", [1.45, 1.7, 0.12], at(wallAmount - 0.04, 3.25, 5.55), materials.black, { rotationY: yaw });
      sphere("heist-thief-head", 0.42, at(wallAmount - 0.08, -0.2, 4.9), materials.black, { segments: 12 });
      box("heist-thief-body", [1.0, 1.45, 0.14], at(wallAmount - 0.08, -0.2, 3.95), materials.black, { rotationY: yaw });
      sphere("heist-police-mural-head", 0.42, at(wallAmount - 0.08, 1.35, 5.15), materials.white, { segments: 12 });
      box("heist-police-mural-body", [1.05, 1.5, 0.14], at(wallAmount - 0.08, 1.35, 4.15), materials.blue, { rotationY: yaw });
      for (let graffiti = 0; graffiti < 6; graffiti += 1) box(`heist-graffiti-${graffiti}`, [0.72 + graffiti % 2 * 0.4, 0.45, 0.15], at(wallAmount - 0.1, -3.2 + graffiti * 1.15, 5.85 + graffiti % 2 * 0.35), [materials.orange, materials.blue, materials.purple][graffiti % 3], { rotationY: yaw, rotationZ: graffiti % 2 ? 0.32 : -0.24 });

      playable("heist-window-back-landing", [2.4, 0.36, 2.2], at(wallAmount + 0.08, 3.25, 5.22), materials.darkWood, { rotationY: yaw });
      const heistPath = [
        at(wallAmount - 0.33, -2.75, 0.45 + PLAYER_FOOT_OFFSET), at(wallAmount - 0.33, -1.75, 1.45 + PLAYER_FOOT_OFFSET),
        at(wallAmount - 0.34, -1.0, 1.62 + PLAYER_FOOT_OFFSET), at(wallAmount - 0.34, 0.2, 2.08 + PLAYER_FOOT_OFFSET),
        at(wallAmount - 0.34, 1.25, 2.58 + PLAYER_FOOT_OFFSET), at(wallAmount - 0.34, 2.15, 3.18 + PLAYER_FOOT_OFFSET),
        at(wallAmount - 0.34, 3.0, 3.88 + PLAYER_FOOT_OFFSET), at(wallAmount - 0.34, 3.65, 4.68 + PLAYER_FOOT_OFFSET),
        at(wallAmount + 0.08, 3.25, 5.4 + PLAYER_FOOT_OFFSET),
      ];
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-wall-heist-traverse`, label: "Eで梯子・トンネル・足場を横断", point: heistPath[0], radius: 4.5, areaId: attraction.areaId,
        activate() {
          const started = beginPathRide(`official-${attraction.officialId}-wall-heist-traverse`, attraction.areaId, heistPath, 6_200, null, attraction.name, attraction.number - 1, 1.2, { startMessage: "🚨 パトカー脇から赤レンガ壁を横断し、窓へ潜入！" });
          if (started) representation.heistTraverseAt = performance.now();
          return started;
        },
      });
      addAnimation((seconds) => {
        const flash = 0.72 + (Math.sin(seconds * 8) + 1) * 0.18;
        const redScale = 0.18 * flash;
        const blueScale = 0.18 * (1.08 - flash * 0.35);
        beaconRed.scale.set(redScale, redScale, redScale);
        beaconBlue.scale.set(blueScale, blueScale, blueScale);
      });
      representation.publishedLadderRungCount = 8;
      representation.publishedLedgeCount = ledgeLaterals.length;
      representation.detailProfile = "photo-matched-1024px-procedural-brick-graffiti-heist-mural-wall-white-blue-police-car-cutout-eight-rung-red-ladder-green-crawl-tunnel-grey-bin-six-purple-red-brown-ledges-window-entry-traverse";
      return true;
    }
    if (template === "cooperative-sail-hoist") {
      for (const amount of [0.25, 0.8]) for (const lateral of [-3.2, 3.2]) beam(`sail-a-frame-leg-${amount}-${lateral}`, at(amount, lateral, 0), at(0.52, lateral * 0.18, 6.65), 0.31, materials.wood);
      beam("sail-top-cross-log", at(0.52, -3.35, 6.55), at(0.52, 3.35, 6.55), 0.3, materials.wood);
      beam("sail-waist-log-roller", at(0.36, -2.75, 1.2), at(0.36, 2.75, 1.2), 0.34, materials.wood);
      for (const lateral of [-1.65, 1.65]) {
        beam(`sail-parallel-white-rope-${lateral}`, at(0.32, lateral, 0.72), at(0.5, lateral, 6.22), 0.085, whiteRope);
        torus(`sail-top-pulley-${lateral}`, 0.4, 0.1, at(0.51, lateral, 6.25), materials.steel, { rotationY: yaw + Math.PI / 2, segments: 16 });
      }
      const handleHomes = [at(0.32, -1.65, 0.82), at(0.32, 1.65, 0.82)];
      const pullHandles = handleHomes.map((home, handleIndex) => torus(`sail-pull-handle-${handleIndex}`, 0.42, 0.1, home, materials.white, { rotationY: yaw, segments: 16 }));
      const sailHome = at(0.55, 0, 2.25);
      const sailGroup = new constructors.Group();
      sailGroup.name = `Greenia:${attraction.officialId}-large-loop-fastened-white-sail`;
      sailGroup.position.set(sailHome.x, sailHome.y, sailHome.z);
      sailGroup.rotation.y = yaw;
      root.add(sailGroup);
      for (let strip = 0; strip < 5; strip += 1) box(`sail-white-cloth-strip-${strip}`, [5.5 - strip * 0.28, 0.72, 0.16], { x: 0, y: -1.35 + strip * 0.68, z: 0 }, materials.white, { parent: sailGroup });
      sphere("sail-black-fish-mark", 0.72, { x: -0.55, y: 0.05, z: -0.17 }, materials.black, { scaleX: 1.75, scaleY: 0.62, scaleZ: 0.18, segments: 12, parent: sailGroup });
      sphere("sail-purple-fish-mouth", 0.3, { x: 0.62, y: 0.02, z: -0.2 }, materials.purple, { scaleX: 0.72, scaleY: 0.9, scaleZ: 0.2, segments: 10, parent: sailGroup });
      torus("sail-yellow-logo", 0.48, 0.12, { x: 1.55, y: -0.62, z: -0.2 }, materials.yellow, { segments: 12, parent: sailGroup });
      for (let tie = 0; tie < 9; tie += 1) torus(`sail-top-loop-tie-${tie}`, 0.2, 0.065, { x: -2.3 + tie * 0.575, y: 1.72, z: 0 }, whiteRope, { rotationY: Math.PI / 2, segments: 10, parent: sailGroup });
      representation.sailPullCount = 0;
      representation.sailLift = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-two-rope-hoist`, label: "Eを2回：左ロープ→右ロープで協働", point: at(0.27, 0, 1.0), radius: 4.7, areaId: attraction.areaId,
        activate() {
          if (representation.sailRaised) {
            representation.sailRaised = false;
            representation.sailPullCount = 0;
            handle.notify?.("⛵ 帆を下ろした。左右のロープをもう一度合わせよう");
          } else {
            representation.sailPullCount += 1;
            representation.sailRaised = representation.sailPullCount >= 2;
            handle.notify?.(representation.sailRaised ? "⛵ 2/2 左右の力が揃い、大型帆が上がった！" : "🪢 1/2 左ロープを引いた。次は右ロープ！");
          }
          representation.sailPulledAt = performance.now();
          playTone(representation.sailRaised ? 720 : 360 + representation.sailPullCount * 80, 0.16, "triangle");
          return true;
        },
      });
      addAnimation((seconds) => {
        representation.sailLift = lerp(representation.sailLift, representation.sailRaised ? 1 : 0, 0.055);
        sailGroup.position.y = sailHome.y + representation.sailLift * 2.75;
        sailGroup.scale.y = 0.48 + representation.sailLift * 0.52;
        sailGroup.rotation.y = yaw;
        sailGroup.rotation.z = Math.sin(seconds * 1.35) * (0.025 + representation.sailLift * 0.035);
        pullHandles.forEach((handleMesh, handleIndex) => {
          const pulled = representation.sailPullCount > handleIndex || representation.sailRaised;
          handleMesh.position.y = handleHomes[handleIndex].y - (pulled ? 0.65 : 0);
        });
      });
      representation.publishedParallelRopeCount = 2;
      representation.publishedTopTieCount = 9;
      representation.publishedRequiredPullCount = 2;
      representation.detailProfile = "photo-matched-natural-wood-a-frame-waist-high-cross-log-roller-two-parallel-white-rope-pulleys-large-white-five-strip-fish-logo-sail-nine-top-loop-ties-two-pull-cooperative-hoist";
      return true;
    }

    if (template === "castle-net-gate") {
      const gateAmount = 0.58;
      for (const lateral of [-4.15, 4.15]) {
        box(`gate-tower-${lateral}`, [2.3, 6.6, 2.3], at(gateAmount, lateral, 3.3), materials.stone, { rotationY: yaw, solid: true });
        for (let crenel = -1; crenel <= 1; crenel += 1) box(`gate-crenel-${lateral}-${crenel}`, [0.65, 0.8, 0.65], at(gateAmount + crenel * 0.055, lateral, 7), materials.white, { rotationY: yaw });
      }
      for (let row = 0; row <= 10; row += 1) beam(`gate-net-row-${row}`, at(gateAmount, -3.15, 0.15 + row * 0.535), at(gateAmount, 3.15, 0.15 + row * 0.535), 0.048, whiteRope);
      for (let column = 0; column <= 12; column += 1) beam(`gate-net-column-${column}`, at(gateAmount, -3.15 + column * 0.525, 0.15), at(gateAmount, -3.15 + column * 0.525, 5.5), 0.048, whiteRope);
      tagOfficialMesh(addRamp(`${attraction.officialId}-gate-climb-surface`, "official-attraction", [at(0.45).x, baseY, at(0.45).z], [at(0.65).x, baseY + 5.5, at(0.65).z], 3.2, materials.stone, { areaId: attraction.areaId }), representation);
      rideInteraction("gate-net", "城門ネットを登る", at(0.45, 0, 0.8), at(0.65, 0, 5.5), 3_600, null, 1.2, 0.08);
      representation.publishedHeightMeters = 5.5;
      representation.detailProfile = "published-5.5m-castle-gate-fine-rope-net-and-twin-crenellated-towers";
      return true;
    }
    if (template === "small-flag-fort") {
      const center = at(0.62, 0, 0);
      const local = (along, lateral, height) => ({ x: center.x + ux * along + px * lateral, y: baseY + height, z: center.z + uz * along + pz * lateral });
      for (const along of [-2.1, 2.1]) for (const lateral of [-2.35, 2.35]) box(`small-fort-post-${along}-${lateral}`, [0.42, 3.2, 0.42], local(along, lateral, 1.6), materials.darkWood, { solid: true });
      playable("small-fort-deck", [5.3, 0.4, 4.8], local(0, 0, 2.5), materials.lightWood, { rotationY: yaw });
      beam("small-fort-climb-rope", local(-2.7, 0, 0.15), local(-2.7, 0, 2.85), 0.1, whiteRope);
      box("small-fort-boulder-face", [0.42, 2.5, 4.7], local(-2.3, 0, 1.25), materials.wood, { rotationY: yaw });
      for (let hold = 0; hold < 12; hold += 1) sphere(`small-fort-hold-${hold}`, 0.18 + hold % 3 * 0.04, local(-2.55, ((hold % 4) - 1.5) * 0.85, 0.45 + Math.floor(hold / 4) * 0.72), palette[hold % palette.length], { scaleZ: 0.45 });
      const poleBottom = local(0.8, 0, 2.65);
      const poleTop = local(0.8, 0, 5.7);
      beam("small-fort-flagpole", poleBottom, poleTop, 0.08, materials.steel);
      const flag = box("small-fort-top-flag", [2.2, 1.05, 0.1], local(0.8, 1.05, 5.15), materials.purple, { rotationY: yaw });
      addAnimation((seconds) => { flag.rotation.y = yaw + Math.sin(seconds * 2.6) * 0.08; });
      representation.publishedHeightMeters = 2.5;
      representation.detailProfile = "published-2.5m-small-fort-rope-and-bouldering-routes-top-flag";
      return true;
    }
    if (template === "castle-slope") {
      const bottom = at(0.08, 0, 0.08);
      const top = at(0.92, 0, 4.15);
      tagOfficialMesh(addRamp(`${attraction.officialId}-castle-slope`, "official-attraction", [bottom.x, bottom.y, bottom.z], [top.x, top.y, top.z], 5.8, materials.camo, { areaId: attraction.areaId }), representation);
      beam("castle-slope-center-rope", { ...bottom, y: bottom.y + 0.45 }, { ...top, y: top.y + 0.45 }, 0.1, whiteRope);
      for (let hold = 0; hold < 18; hold += 1) {
        const amount = 0.14 + Math.floor(hold / 3) * 0.13;
        const location = at(amount, (hold % 3 - 1) * 1.45, 0.28 + amount * 3.9);
        sphere(`castle-slope-hold-${hold}`, 0.2 + hold % 2 * 0.05, location, palette[hold % palette.length], { scaleY: 0.55, segments: 8 });
      }
      representation.detailProfile = "wide-castle-incline-selectable-center-rope-or-color-holds";
      return true;
    }
    if (template === "dual-bouldering-wall") {
      const lanes = [
        { lateral: -2.25, height: 4.5, tilt: 0, label: "vertical" },
        { lateral: 2.25, height: 4.8, tilt: -0.24, label: "overhang" },
      ];
      lanes.forEach((lane, laneIndex) => {
        const center = at(0.58, lane.lateral, lane.height / 2);
        box(`${lane.label}-panel`, [0.72, lane.height, 3.7], center, laneIndex ? materials.stone : materials.camo, { rotationY: yaw, rotationZ: lane.tilt });
        for (let hold = 0; hold < 15; hold += 1) {
          const amount = 0.48 + Math.floor(hold / 3) * 0.05;
          sphere(`${lane.label}-hold-${hold}`, 0.2 + hold % 3 * 0.035, at(amount, lane.lateral + (hold % 3 - 1) * 0.88, 0.55 + Math.floor(hold / 3) * 0.78), palette[(hold + laneIndex) % palette.length], { scaleZ: 0.42 });
        }
        tagOfficialMesh(addRamp(`${attraction.officialId}-${lane.label}-surface`, "official-attraction", [at(0.44, lane.lateral).x, baseY, at(0.44, lane.lateral).z], [at(0.69, lane.lateral).x, baseY + lane.height, at(0.69, lane.lateral).z], 1.55, materials.stone, { areaId: attraction.areaId }), representation);
      });
      representation.detailProfile = "two-route-castle-bouldering-vertical-and-overhang-panels";
      return true;
    }
    if (template === "traverse-castle-wall") {
      const wallLength = Math.max(8, length * 0.82);
      box("traverse-castle-wall", [0.72, 3, wallLength], at(0.54, 0, 1.5), materials.stone, { rotationY: yaw });
      for (let hold = 0; hold < 24; hold += 1) sphere(`traverse-wall-hold-${hold}`, 0.18 + hold % 3 * 0.04, at(0.12 + (hold % 8) * 0.105, -0.48, 0.45 + Math.floor(hold / 8) * 0.82), palette[hold % palette.length], { scaleZ: 0.42 });
      for (let merlon = 0; merlon < 8; merlon += 1) box(`traverse-wall-merlon-${merlon}`, [0.9, 0.75, 0.7], at(0.14 + merlon * 0.105, 0, 3.35), merlon % 2 ? materials.white : materials.stone, { rotationY: yaw });
      const flagBottom = at(0.9, 0, 3.2);
      beam("traverse-wall-flagpole", flagBottom, { ...flagBottom, y: flagBottom.y + 3.1 }, 0.07, materials.steel);
      box("traverse-wall-flag", [1.8, 0.9, 0.08], at(0.9, 0.9, 5.6), materials.purple, { rotationY: yaw });
      rideInteraction("wall-traverse", "城壁のホールドを横断", at(0.12, -0.65, 1.35), at(0.92, -0.65, 1.35), 4_200, null, 1.2, 0.05);
      representation.publishedHeightMeters = 3;
      representation.detailProfile = "published-3m-long-traverse-bouldering-wall-crenellations-roof-flag";
      return true;
    }
    if (template === "two-storey-treehouse") {
      const center = at(0.62, 0, 0);
      const local = (along, lateral, height) => ({ x: center.x + ux * along + px * lateral, y: baseY + height, z: center.z + uz * along + pz * lateral });
      for (const along of [-2.65, 2.65]) for (const lateral of [-2.65, 2.65]) box(`treehouse-post-${along}-${lateral}`, [0.55, 7.2, 0.55], local(along, lateral, 3.6), materials.darkWood, { solid: true });
      playable("treehouse-lower-deck", [6.2, 0.4, 6.2], local(0, 0, 3), materials.lightWood, { rotationY: yaw });
      playable("treehouse-upper-deck", [6.2, 0.4, 6.2], local(0, 0, 6), materials.lightWood, { rotationY: yaw });
      for (let rung = 0; rung < 10; rung += 1) beam(`treehouse-ladder-rung-${rung}`, local(-3, -0.7, 0.45 + rung * 0.58), local(-3, 0.7, 0.45 + rung * 0.58), 0.1, materials.yellow);
      beam("treehouse-ladder-left", local(-3, -0.85, 0.15), local(-3, -0.85, 6.15), 0.12, materials.wood);
      beam("treehouse-ladder-right", local(-3, 0.85, 0.15), local(-3, 0.85, 6.15), 0.12, materials.wood);
      tagOfficialMesh(addCone(`${attraction.officialId}-treehouse-roof`, "official-attraction", 4.8, 3.1, [center.x, baseY + 8.05, center.z], materials.purple, { segments: 4, rotationY: yaw + Math.PI / 4 }), representation);
      representation.publishedHeightMeters = 6;
      representation.detailProfile = "published-6m-two-storey-treehouse-two-decks-full-ladder-pyramid-roof";
      return true;
    }
    if (template === "sky-spiral-stairs") {
      cylinder("sky-spiral-center", 0.42, 6.8, { x: point.x, y: baseY + 3.4, z: point.z }, materials.steel, { segments: 12, solid: true, blocker: false });
      for (let step = 0; step < 20; step += 1) {
        const angle = step * Math.PI / 4.2;
        const radius = 2.6;
        const location = { x: point.x + Math.cos(angle) * radius, y: baseY + 0.16 + step * 0.3, z: point.z + Math.sin(angle) * radius };
        playable(`sky-spiral-step-${step}`, [2.5, 0.3, 0.95], { x: location.x, y: location.y - 0.15, z: location.z }, step % 2 ? materials.lightWood : materials.wood, { rotationY: -angle });
        beam(`sky-spiral-outer-rail-${step}`, { ...location, y: location.y + 0.1 }, { x: point.x + Math.cos(angle) * 3.15, y: location.y + 1.25, z: point.z + Math.sin(angle) * 3.15 }, 0.055, whiteRope);
      }
      representation.publishedHeightMeters = 6;
      representation.detailProfile = "published-6m-twenty-step-sky-spiral-with-outer-rope-rail";
      return true;
    }
    if (template === "three-swords") {
      const weights = [17, 37, 57];
      const swords = weights.map((weight, swordIndex) => {
        const lateral = (swordIndex - 1) * 2.7;
        const blade = box(`sword-${weight}kg-blade`, [0.4 + swordIndex * 0.08, 3.2 + swordIndex * 0.35, 0.34], at(0.62, lateral, 1.8 + swordIndex * 0.17), materials.steel, { rotationZ: -0.08 + swordIndex * 0.08 });
        const hilt = box(`sword-${weight}kg-hilt`, [1.8, 0.28, 0.48], at(0.62, lateral, 3.35 + swordIndex * 0.34), swordIndex === 2 ? materials.coral : materials.yellow, { rotationZ: -0.08 + swordIndex * 0.08 });
        box(`sword-${weight}kg-stone`, [2.1, 0.75, 1.7], at(0.62, lateral, 0.38), materials.stone, { rotationY: yaw });
        return { weight, blade, hilt, bladeY: blade.position.y, hiltY: hilt.position.y };
      });
      representation.interactive = true;
      swords.forEach((sword, swordIndex) => registerInteraction({
        id: `official-${attraction.officialId}-${sword.weight}kg`, label: `${sword.weight}kgの王国の剣を引き抜く`, point: at(0.62, (swordIndex - 1) * 2.7, 0.8), radius: 2.2, areaId: attraction.areaId,
        activate() { representation.activeSword = swordIndex; representation.swordLiftedAt = performance.now(); handle.notify?.(`⚔️ ${sword.weight}kgの剣を引き抜いた！`); playTone(320 + swordIndex * 130, 0.18, "triangle"); return true; },
      }));
      addAnimation((_seconds, now) => {
        swords.forEach((sword, swordIndex) => {
          const progress = representation.swordLiftedAt && representation.activeSword === swordIndex ? clamp((now - representation.swordLiftedAt) / 1_200, 0, 1) : 0;
          const lift = Math.sin(progress * Math.PI) * (1.1 - swordIndex * 0.18);
          sword.blade.position.y = sword.bladeY + lift;
          sword.hilt.position.y = sword.hiltY + lift;
        });
      });
      representation.publishedWeightsKg = weights;
      representation.detailProfile = "three-separate-pullable-royal-swords-published-17-37-57kg";
      return true;
    }
    if (template === "rope-labyrinth") {
      for (const amount of [0.08, 0.96]) for (const lateral of [-3.7, 3.7]) beam(`rope-maze-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, lateral, 5.6), 0.19, materials.darkWood);
      for (const lateral of [-3.7, 3.7]) beam(`rope-maze-top-${lateral}`, at(0.08, lateral, 5.6), at(0.96, lateral, 5.6), 0.2, materials.wood);
      const ropeSegments = [
        [0.08, -3.4, 0.5, 0.34, 3.4, 3.9], [0.12, 3.4, 1.2, 0.4, -3.4, 4.7],
        [0.25, -3.4, 4.8, 0.5, 3.4, 0.65], [0.36, 3.4, 3.6, 0.61, -3.4, 1.4],
        [0.5, -3.4, 2.2, 0.74, 3.4, 4.8], [0.63, 3.4, 0.55, 0.9, -3.4, 3.5],
        [0.18, -1.2, 0.3, 0.82, -1.2, 5.3], [0.22, 1.25, 5.2, 0.88, 1.25, 0.35],
      ];
      ropeSegments.forEach(([fromAmount, fromLateral, fromHeight, toAmount, toLateral, toHeight], ropeIndex) => {
        const from = at(fromAmount, fromLateral, fromHeight);
        const to = at(toAmount, toLateral, toHeight);
        const ropeMaterial = ropeIndex % 3 === 0 ? materials.pink : whiteRope;
        beam(`rope-maze-thread-${ropeIndex}`, from, to, 0.062, ropeMaterial);
        for (let marker = 1; marker < 5; marker += 1) {
          const fraction = marker / 5;
          sphere(`rope-maze-knot-${ropeIndex}-${marker}`, 0.105, { x: lerp(from.x, to.x, fraction), y: lerp(from.y, to.y, fraction), z: lerp(from.z, to.z, fraction) }, ropeMaterial, { segments: 7 });
        }
      });
      representation.interactive = true;
      registerInteraction({ id: `official-${attraction.officialId}-maze-start`, label: "ロープに触れず迷宮へ入る", point: at(0.07, 0, 1), radius: 4, areaId: attraction.areaId, activate() { representation.ropeMazeStartedAt = performance.now(); handle.notify?.("🪢 ロープに触れずに出口へ進め！"); playTone(460, 0.12, "sine"); return true; } });
      representation.detailProfile = "official-description-matched-dense-no-touch-three-dimensional-rope-maze-pink-warning-lines";
      return true;
    }
    if (template === "thunder-wire") {
      const boardCenter = at(0.59, 0, 3.15);
      box("thunder-dark-board", [8.8, 6.3, 0.5], boardCenter, materials.navy, { rotationY: yaw });
      for (const lateral of [-4.65, 4.65]) beam(`thunder-frame-${lateral}`, at(0.59, lateral, 0), at(0.59, lateral, 6.5), 0.2, materials.darkWood);
      const wireShape = [[-3.5, -1.9], [-2.6, 1.6], [-1.6, -1.25], [-0.5, 1.75], [0.45, -1.6], [1.45, 1.35], [2.45, -1.65], [3.5, 1.55]];
      const wirePoints = wireShape.map(([localX, localY]) => ({ x: boardCenter.x + px * localX - ux * 0.38, y: boardCenter.y + localY, z: boardCenter.z + pz * localX - uz * 0.38 }));
      for (let wireIndex = 0; wireIndex < wirePoints.length - 1; wireIndex += 1) beam(`thunder-zigzag-wire-${wireIndex}`, wirePoints[wireIndex], wirePoints[wireIndex + 1], 0.1, materials.white);
      const thunderLoop = torus("thunder-hand-loop", 0.5, 0.13, wirePoints[0], materials.yellow, { rotationY: yaw, segments: 18 });
      beam("thunder-handle", { ...wirePoints[0], y: wirePoints[0].y - 0.45 }, { ...wirePoints[0], y: wirePoints[0].y - 1.55 }, 0.11, materials.steel);
      representation.interactive = true;
      representation.thunderStep = 0;
      registerInteraction({ id: `official-${attraction.officialId}-wire`, label: "Eで雷の輪を慎重に進める", point: at(0.42, 0, 1.1), radius: 4.2, areaId: attraction.areaId, activate() {
        representation.thunderStep = Math.min(wirePoints.length - 1, representation.thunderStep + 1);
        const next = wirePoints[representation.thunderStep];
        thunderLoop.position.set(next.x, next.y, next.z);
        playTone(310 + representation.thunderStep * 55, 0.07, representation.thunderStep % 3 ? "square" : "sawtooth");
        if (representation.thunderStep >= wirePoints.length - 1) {
          handle.notify?.("⚡ 雷の罠をかわしてクリア！");
          window.setTimeout(() => { representation.thunderStep = 0; thunderLoop.position.set(wirePoints[0].x, wirePoints[0].y, wirePoints[0].z); }, 1_100);
        } else handle.notify?.(`⚡ 雷神の試練 ${representation.thunderStep}/${wirePoints.length - 1}`);
        return true;
      } });
      representation.detailProfile = "official-pdf-matched-dark-panel-white-zigzag-electric-wire-seven-step-metal-loop-game";
      return true;
    }
    if (template === "fortune-basketball") {
      const backboard = at(0.76, 0, 4.2);
      box("fortune-basket-backboard", [5.2, 3.1, 0.38], backboard, materials.white, { rotationY: yaw });
      box("fortune-basket-square", [2, 1.45, 0.1], { x: backboard.x - ux * 0.25, y: backboard.y, z: backboard.z - uz * 0.25 }, materials.coral, { rotationY: yaw });
      const hoopCenter = at(0.68, 0, 3.25);
      torus("fortune-basket-hoop", 0.92, 0.13, hoopCenter, materials.orange, { rotationX: Math.PI / 2, segments: 20 });
      for (let strand = 0; strand < 10; strand += 1) {
        const angle = strand / 10 * Math.PI * 2;
        beam(`fortune-basket-net-${strand}`, { x: hoopCenter.x + Math.cos(angle) * 0.82, y: hoopCenter.y, z: hoopCenter.z + Math.sin(angle) * 0.82 }, { x: hoopCenter.x + Math.cos(angle) * 0.42, y: hoopCenter.y - 1.05, z: hoopCenter.z + Math.sin(angle) * 0.42 }, 0.035, whiteRope);
      }
      beam("fortune-basket-post", at(0.81, 0, 0), at(0.81, 0, 5.7), 0.2, materials.steel);
      const questNames = ["勇者のポーズ", "仲間とハイタッチ", "勝利の雄叫び"];
      const questCells = questNames.map((_quest, cellIndex) => {
        const location = at(0.93, (cellIndex - 1) * 2.15, 0.2);
        playable(`fortune-cell-${cellIndex}`, [1.75, 0.35, 2], { x: location.x, y: location.y - 0.175, z: location.z }, palette[cellIndex], { rotationY: yaw });
        return location;
      });
      const ballStart = at(0.14, 0, 1.2);
      const ball = sphere("fortune-basketball", 0.62, ballStart, materials.orange, { segments: 14 });
      representation.interactive = true;
      representation.fortuneShots = 0;
      registerInteraction({ id: `official-${attraction.officialId}-basket`, label: "運命のバスケットシュート", point: ballStart, radius: 4.2, areaId: attraction.areaId, activate() { representation.fortuneShots += 1; representation.fortuneCell = representation.fortuneShots % questCells.length; representation.fortuneShotAt = performance.now(); handle.notify?.("🏀 運命の一本を放った！"); playTone(390, 0.1, "triangle"); return true; } });
      addAnimation((_seconds, now) => {
        if (!representation.fortuneShotAt) return;
        const elapsed = now - representation.fortuneShotAt;
        if (elapsed <= 900) {
          const progress = elapsed / 900;
          ball.position.set(lerp(ballStart.x, hoopCenter.x, progress), lerp(ballStart.y, hoopCenter.y, progress) + Math.sin(progress * Math.PI) * 2.2, lerp(ballStart.z, hoopCenter.z, progress));
        } else {
          const target = questCells[representation.fortuneCell];
          const progress = clamp((elapsed - 900) / 750, 0, 1);
          ball.position.set(lerp(hoopCenter.x, target.x, progress), lerp(hoopCenter.y, target.y + 0.65, progress), lerp(hoopCenter.z, target.z, progress));
        }
        if (elapsed > 1_750) { handle.notify?.(`🎲 運命のクエスト：${questNames[representation.fortuneCell]}`); playTone(780, 0.18, "sine"); representation.fortuneShotAt = null; ball.position.set(ballStart.x, ballStart.y, ballStart.z); }
      });
      representation.detailProfile = "official-description-matched-basketball-shot-three-destination-quest-roulette";
      return true;
    }
    if (template === "wall-kick-corridor") {
      const corridorLength = Math.max(9, length * 0.84);
      for (const lateral of [-2.45, 2.45]) box(`wall-kick-side-${lateral}`, [0.48, 5, corridorLength], at(0.52, lateral, 2.5), materials.wood, { rotationY: yaw });
      for (let foothold = 0; foothold < 12; foothold += 1) {
        const amount = 0.09 + foothold * 0.075;
        const side = foothold % 2 ? 1 : -1;
        const height = 0.65 + foothold % 3 * 0.28;
        const location = at(amount, side * 2.02, height);
        playable(`wall-kick-foot-${foothold}`, [1.25, 0.26, 0.72], { x: location.x, y: location.y - 0.13, z: location.z }, foothold % 2 ? materials.yellow : materials.coral, { rotationY: yaw });
        sphere(`wall-kick-opposite-hand-${foothold}`, 0.24, at(amount, -side * 2.14, 1.75 + foothold % 2 * 0.45), foothold % 2 ? materials.coral : materials.yellow, { scaleZ: 0.42 });
      }
      for (const lateral of [-2.1, 2.1]) beam(`wall-kick-top-rope-${lateral}`, at(0.06, lateral, 4.65), at(0.98, lateral, 4.65), 0.065, whiteRope);
      representation.detailProfile = "official-description-matched-two-wall-corridor-twelve-alternating-wall-kick-footholds-opposite-handholds";
      return true;
    }
    if (template === "triangle-net-tunnel") {
      for (let frame = 0; frame <= 12; frame += 1) {
        const amount = 0.05 + frame * 0.078;
        const left = at(amount, -1.65, 0.18);
        const right = at(amount, 1.65, 0.18);
        const peak = at(amount, 0, 2.75);
        beam(`triangle-frame-left-${frame}`, left, peak, 0.052, whiteRope);
        beam(`triangle-frame-right-${frame}`, peak, right, 0.052, whiteRope);
        beam(`triangle-frame-floor-${frame}`, left, right, 0.052, whiteRope);
      }
      for (let strand = 0; strand <= 8; strand += 1) {
        const t = strand / 8;
        const lateral = -1.65 + t * 3.3;
        const height = 0.18 + (1 - Math.abs(lateral) / 1.65) * 2.57;
        beam(`triangle-longitudinal-${strand}`, at(0.05, lateral, height), at(0.986, lateral, height), 0.045, whiteRope);
      }
      for (let surface = 0; surface < 12; surface += 1) {
        const location = at(0.09 + surface * 0.075, 0, 0.12);
        addSurface(`${attraction.officialId}-triangle-net-surface-${surface}`, location.x, location.z, 1.25, 1.25, location.y, { areaId: attraction.areaId });
      }
      representation.detailProfile = "fully-enclosed-fine-rope-triangular-prism-net-tunnel";
      return true;
    }
    if (template === "mini-bouldering-wall") {
      const height = 2.55;
      const climbAmount = 0.48;
      box("mini-boulder-wall", [0.55, height, 5.6], at(climbAmount, 0, height / 2), materials.wood, { rotationY: yaw });
      for (let hold = 0; hold < 18; hold += 1) {
        sphere(
          `mini-boulder-hold-${hold}`,
          0.16 + hold % 3 * 0.035,
          at(climbAmount - 0.035, (hold % 6 - 2.5) * 0.78, 0.42 + Math.floor(hold / 6) * 0.75),
          [materials.blue, materials.pink, materials.teal][hold % 3],
          { scaleZ: 0.42 },
        );
      }
      playable("mini-boulder-top", [3.5, 0.32, 5.8], at(0.57, 0, height), materials.lightWood, { rotationY: yaw });
      tagOfficialMesh(addRamp(`${attraction.officialId}-mini-boulder-surface`, "official-attraction", [at(0.36).x, baseY, at(0.36).z], [at(0.54).x, baseY + height, at(0.54).z], 2.2, materials.wood, { areaId: attraction.areaId }), representation);

      // The official route continues through a child-size opening, then down a white rope.
      const openingAmount = 0.68;
      for (const lateral of [-1.65, 1.65]) box(`crawl-opening-side-${lateral}`, [0.55, 2.35, 1.3], at(openingAmount, lateral, 1.18), materials.wood, { rotationY: yaw });
      box("crawl-opening-lintel", [0.55, 0.65, 2.1], at(openingAmount, 0, 2.33), materials.wood, { rotationY: yaw });
      box("crawl-opening-dark", [0.16, 1.45, 1.9], at(openingAmount - 0.025, 0, 1.22), materials.black, { rotationY: yaw });
      const descentTop = at(0.76, 0, 2.62);
      const descentBottom = at(0.82, 0, 0.25);
      beam("descent-white-rope", descentTop, descentBottom, 0.095, whiteRope);
      for (let knot = 1; knot <= 4; knot += 1) {
        const amount = knot / 5;
        sphere(`descent-rope-knot-${knot}`, 0.13, {
          x: lerp(descentTop.x, descentBottom.x, amount),
          y: lerp(descentTop.y, descentBottom.y, amount),
          z: lerp(descentTop.z, descentBottom.z, amount),
        }, whiteRope, { segments: 8 });
      }
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-climb-crawl-descend`,
        label: "登る→穴をくぐる→ロープで降りる",
        point: at(0.34, 0, 0.45),
        radius: 4.2,
        areaId: attraction.areaId,
        activate: () => beginPathRide(
          `official-${attraction.officialId}-climb-crawl-descend`,
          attraction.areaId,
          [at(0.34, 0, 0.45), at(0.48, 0, 2.5), at(0.6, 0, 2.7), at(0.68, 0, 1.25), at(0.76, 0, 2.25), at(0.84, 0, 0.45)],
          4_600,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          { startMessage: "🧗 ホールドを登って、穴をくぐり、白いロープで降りよう！" },
        ),
      });
      representation.detailProfile = "photo-matched-three-stage-color-hold-climb-crawl-opening-white-rope-descent";
      return true;
    }
    if (template === "wave-balance") {
      let prior = at(0.06, 0, 0.45);
      for (let segment = 0; segment < 14; segment += 1) {
        const amount = 0.13 + segment * 0.064;
        const next = at(amount, Math.sin(segment * 0.92) * 1.6, 0.45 + Math.sin(segment * 0.56) * 0.18);
        beam(`wave-balance-beam-${segment}`, prior, next, 0.24, palette[segment % palette.length], { segments: 10 });
        tagOfficialMesh(addRamp(`${attraction.officialId}-wave-balance-surface-${segment}`, "official-attraction", [prior.x, prior.y + 0.22, prior.z], [next.x, next.y + 0.22, next.z], 0.58, materials.lightWood, { areaId: attraction.areaId }), representation);
        prior = next;
      }
      representation.detailProfile = "fourteen-segment-horizontal-and-vertical-wave-balance-beam";
      return true;
    }
    if (template === "ladder-hammer") {
      const ladderAmount = 0.48;
      for (const lateral of [-1.8, 1.8]) beam(`gong-frame-post-${lateral}`, at(ladderAmount, lateral, 0.08), at(ladderAmount, lateral, 3.65), 0.18, materials.wood);
      beam("gong-frame-top", at(ladderAmount, -1.95, 3.65), at(ladderAmount, 1.95, 3.65), 0.2, materials.wood);
      for (const lateral of [-0.82, 0.82]) beam(`white-rope-ladder-side-${lateral}`, at(ladderAmount - 0.02, lateral, 0.18), at(ladderAmount - 0.02, lateral, 3.22), 0.075, whiteRope);
      for (let rung = 0; rung < 7; rung += 1) beam(`white-rope-ladder-rung-${rung}`, at(ladderAmount - 0.02, -0.82, 0.43 + rung * 0.43), at(ladderAmount - 0.02, 0.82, 0.43 + rung * 0.43), 0.075, whiteRope);

      const gongs = [];
      for (let gongIndex = 0; gongIndex < 4; gongIndex += 1) {
        const heightAtGong = 0.72 + gongIndex * 0.72;
        const gong = beam(`silver-gong-${gongIndex}`, at(0.61, 1.14, heightAtGong), at(0.623, 1.14, heightAtGong), 0.38 + gongIndex * 0.035, materials.steel, { segments: 18 });
        gongs.push({ mesh: gong, baseScale: gong.scale.clone(), height: heightAtGong });
        beam(`gong-hanger-${gongIndex}`, at(0.6165, 1.14, heightAtGong + 0.4), at(0.6165, 1.14, heightAtGong + 0.62), 0.035, materials.black);
      }

      const hammerRest = at(0.3, -1.15, 0.82);
      const hammerHead = box("wood-mallet-head", [0.72, 0.46, 0.46], hammerRest, materials.lightWood, { rotationY: yaw });
      const hammerHandle = beam("wood-mallet-handle", at(0.25, -1.15, 0.22), hammerRest, 0.085, materials.wood);
      representation.gongStep = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-ordered-gongs`,
        label: "木槌で下から順にゴングを鳴らす",
        point: at(0.4, 0, 1.05),
        radius: 4,
        areaId: attraction.areaId,
        activate() {
          const now = performance.now();
          if (representation.hammerAt && now - representation.hammerAt < 300) return false;
          if (representation.gongStep >= gongs.length) return false;
          const gongIndex = representation.gongStep;
          representation.activeGong = gongIndex;
          representation.hammerAt = now;
          representation.gongStep += 1;
          const complete = representation.gongStep >= gongs.length;
          handle.notify?.(complete ? "🔨 カン！最上段まで順番どおり成功！" : `🔨 カン！ 下から ${representation.gongStep}/${gongs.length}`);
          playTone(440 + gongIndex * 120, 0.18, "sine");
          if (complete) window.setTimeout(() => { representation.gongStep = 0; }, 1_600);
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const elapsed = representation.hammerAt ? now - representation.hammerAt : 10_000;
        const progress = clamp(elapsed / 620, 0, 1);
        const gongIndex = representation.activeGong ?? 0;
        const targetY = baseY + gongs[gongIndex].height;
        const lift = Math.sin(progress * Math.PI);
        hammerHead.position.y = lerp(hammerRest.y, targetY, lift);
        hammerHandle.position.y = lerp(hammerRest.y - 0.3, targetY - 0.3, lift);
        hammerHead.rotation.z = -Math.sin(progress * Math.PI * 2) * 0.45;
        hammerHandle.rotation.z = -Math.sin(progress * Math.PI * 2) * 0.28;
        gongs.forEach((gong, indexOfGong) => {
          const pulse = indexOfGong === gongIndex ? Math.sin(progress * Math.PI * 5) * (1 - progress) : 0;
          gong.mesh.scale.x = gong.baseScale.x * (1 + Math.abs(pulse) * 0.14);
          gong.mesh.scale.z = gong.baseScale.z * (1 + Math.abs(pulse) * 0.14);
        });
      });
      representation.detailProfile = "photo-matched-natural-log-frame-white-rope-ladder-four-silver-gongs-bottom-to-top-mallet-sequence";
      return true;
    }
    if (template === "ring-toss") {
      const poles = [];
      for (let poleIndex = 0; poleIndex < 3; poleIndex += 1) {
        const pole = at(0.78, (poleIndex - 1) * 1.9, 0);
        cylinder(`ring-toss-pole-${poleIndex}`, 0.11, 1.2 + poleIndex * 0.28, { ...pole, y: pole.y + 0.6 + poleIndex * 0.14 }, materials.steel, { segments: 8 });
        cylinder(`ring-toss-base-${poleIndex}`, 0.72, 0.18, { ...pole, y: pole.y + 0.09 }, palette[poleIndex], { segments: 14 });
        poles.push({ ...pole, y: pole.y + 0.85 + poleIndex * 0.2 });
      }
      const ringStart = at(0.18, 0, 1.1);
      const thrownRing = torus("ring-toss-projectile", 0.72, 0.15, ringStart, materials.pink, { rotationX: Math.PI / 2, segments: 18 });
      representation.interactive = true;
      registerInteraction({ id: `official-${attraction.officialId}-ring-toss`, label: "輪を投げる", point: ringStart, radius: 4, areaId: attraction.areaId, activate() { representation.ringThrowAt = performance.now(); handle.notify?.("⭕ わなげチャレンジ！"); playTone(440, 0.08, "sine"); return true; } });
      addAnimation((_seconds, now) => {
        if (!representation.ringThrowAt) return;
        const elapsed = now - representation.ringThrowAt;
        const progress = clamp(elapsed / 900, 0, 1);
        const target = poles[1];
        thrownRing.position.set(lerp(ringStart.x, target.x, progress), lerp(ringStart.y, target.y, progress) + Math.sin(progress * Math.PI) * 2.1, lerp(ringStart.z, target.z, progress));
        thrownRing.rotation.z = progress * Math.PI * 3;
        if (elapsed > 1_500) { thrownRing.position.set(ringStart.x, ringStart.y, ringStart.z); representation.ringThrowAt = null; }
      });
      representation.detailProfile = "three-height-poles-and-animated-physical-ring-toss";
      return true;
    }
    if (template === "suspended-ox-crossing") {
      for (const frameAmount of [0.08, 0.94]) {
        for (const lateral of [-2.25, 2.25]) beam(`ox-log-frame-post-${frameAmount}-${lateral}`, at(frameAmount, lateral, 0.05), at(frameAmount, lateral, 4.65), 0.22, materials.wood);
        beam(`ox-log-frame-top-${frameAmount}`, at(frameAmount, -2.45, 4.65), at(frameAmount, 2.45, 4.65), 0.24, materials.wood);
      }
      const suspendedShapes = [];
      for (let shapeIndex = 0; shapeIndex < 6; shapeIndex += 1) {
        const amount = 0.18 + shapeIndex * 0.13;
        const lateral = shapeIndex % 2 ? 0.16 : -0.16;
        const location = at(amount, lateral, 0.62);
        const meshes = [];
        if (shapeIndex % 2 === 0) {
          meshes.push(torus(`suspended-o-${shapeIndex}`, 1.02, 0.22, location, materials.lightWood, { rotationX: Math.PI / 2, segments: 20 }));
        } else {
          meshes.push(box(`suspended-x-a-${shapeIndex}`, [0.34, 0.3, 2.35], location, materials.lightWood, { rotationY: yaw + Math.PI / 4 }));
          meshes.push(box(`suspended-x-b-${shapeIndex}`, [0.34, 0.3, 2.35], location, materials.wood, { rotationY: yaw - Math.PI / 4 }));
        }
        const surface = addSurface(`${attraction.officialId}-suspended-shape-surface-${shapeIndex}`, location.x, location.z, 1.65, 1.65, location.y + 0.12, { areaId: attraction.areaId, dynamic: true });
        for (const ropeLateral of [-0.72, 0.72]) {
          beam(`suspended-shape-rope-${shapeIndex}-${ropeLateral}`, at(amount, lateral + ropeLateral, 0.68), at(amount, lateral + ropeLateral, 4.5), 0.06, whiteRope);
        }
        suspendedShapes.push({ meshes, surface, location });
      }
      suspendedShapes.forEach(({ meshes, surface, location }, shapeIndex) => {
        addAnimation((seconds) => {
          const swayY = Math.sin(seconds * 1.05 + shapeIndex * 0.72) * 0.08;
          const tilt = Math.sin(seconds * 0.78 + shapeIndex) * 0.045;
          surface.previousX = surface.x;
          surface.previousY = surface.y;
          surface.previousZ = surface.z;
          meshes.forEach((mesh) => {
            mesh.position.y = location.y + swayY;
            mesh.rotation.z = tilt;
          });
          surface.y = location.y + 0.12 + swayY;
        });
      });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-suspended-ox`,
        label: "吊られた木製〇×を渡る",
        point: at(0.12, 0, 1.05),
        radius: 4.2,
        areaId: attraction.areaId,
        activate: () => beginLocalRide(
          `official-${attraction.officialId}-suspended-ox`,
          attraction.areaId,
          at(0.12, 0, 1.05),
          at(0.9, 0, 1.05),
          3_500,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          0.06,
        ),
      });
      representation.detailProfile = "photo-matched-natural-wood-alternating-real-o-x-footholds-white-rope-suspension-gentle-sway";
      return true;
    }
    if (template === "static-shape-steps") {
      for (let shapeIndex = 0; shapeIndex < 9; shapeIndex += 1) {
        const amount = 0.1 + shapeIndex * 0.105;
        const location = at(amount, 0, 0.34);
        const shapeType = shapeIndex % 3;
        if (shapeType === 0) {
          cylinder(`static-circle-step-${shapeIndex}`, 0.92, 0.3, { ...location, y: location.y - 0.15 }, materials.lightWood, { segments: 18 });
        } else if (shapeType === 1) {
          box(`static-square-step-${shapeIndex}`, [1.75, 0.3, 1.75], { ...location, y: location.y - 0.15 }, materials.wood, { rotationY: yaw });
        } else {
          const around = (along, lateral) => ({ x: location.x + ux * along + px * lateral, y: location.y - 0.05, z: location.z + uz * along + pz * lateral });
          const front = around(0.9, 0);
          const backLeft = around(-0.72, -0.84);
          const backRight = around(-0.72, 0.84);
          beam(`static-triangle-a-${shapeIndex}`, front, backLeft, 0.17, materials.lightWood);
          beam(`static-triangle-b-${shapeIndex}`, backLeft, backRight, 0.17, materials.lightWood);
          beam(`static-triangle-c-${shapeIndex}`, backRight, front, 0.17, materials.lightWood);
        }
        addSurface(`${attraction.officialId}-static-shape-surface-${shapeIndex}`, location.x, location.z, 1.55, 1.55, location.y, { areaId: attraction.areaId });
      }
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-rhythm-steps`,
        label: "〇□△をリズムよく渡る",
        point: at(0.08, 0, 0.75),
        radius: 4,
        areaId: attraction.areaId,
        activate: () => beginLocalRide(
          `official-${attraction.officialId}-rhythm-steps`,
          attraction.areaId,
          at(0.08, 0, 0.75),
          at(0.94, 0, 0.75),
          3_100,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          0,
        ),
      });
      representation.detailProfile = "photo-matched-nine-evenly-spaced-low-natural-wood-circle-square-triangle-static-rhythm-steps";
      return true;
    }
    if (template === "long-monkey-bars") {
      const publishedLength = 7.6;
      const end = { x: point.x, y: baseY + 3.25, z: point.z };
      const start = { x: point.x - ux * publishedLength, y: end.y, z: point.z - uz * publishedLength };
      for (const lateral of [-1.15, 1.15]) {
        const offset = { x: px * lateral, z: pz * lateral };
        beam(`long-monkey-side-${lateral}`, { x: start.x + offset.x, y: start.y, z: start.z + offset.z }, { x: end.x + offset.x, y: end.y, z: end.z + offset.z }, 0.12, materials.wood);
        for (const endpoint of [start, end]) beam(`long-monkey-post-${lateral}-${endpoint === start ? "start" : "end"}`, { x: endpoint.x + offset.x, y: baseY, z: endpoint.z + offset.z }, { x: endpoint.x + offset.x, y: end.y + 0.2, z: endpoint.z + offset.z }, 0.16, materials.darkWood);
      }
      for (let rung = 0; rung <= 19; rung += 1) {
        const amount = rung / 19;
        const center = { x: lerp(start.x, end.x, amount), y: end.y, z: lerp(start.z, end.z, amount) };
        beam(`long-monkey-rung-${rung}`, { x: center.x - px * 1.15, y: center.y, z: center.z - pz * 1.15 }, { x: center.x + px * 1.15, y: center.y, z: center.z + pz * 1.15 }, 0.095, rung % 2 ? materials.yellow : materials.coral);
      }
      rideInteraction("monkey", "7.6mうんていにつかまる", { ...start, y: start.y - 0.9 }, { ...end, y: end.y - 0.9 }, 4_600, null, 1.2, 0.12);
      representation.publishedLengthMeters = publishedLength;
      representation.detailProfile = "published-7.6m-twenty-rung-long-monkey-bars-four-post-frame";
      return true;
    }
    if (template === "multiple-seesaws") {
      for (let seesawIndex = 0; seesawIndex < 5; seesawIndex += 1) {
        const location = at(0.12 + seesawIndex * 0.19, seesawIndex % 2 ? 0.55 : -0.55, 0.72);
        const board = playable(`multi-seesaw-board-${seesawIndex}`, [4.4, 0.3, 1.25], { x: location.x, y: location.y - 0.15, z: location.z }, seesawIndex % 2 ? materials.yellow : materials.coral, { rotationY: yaw, dynamic: true });
        cylinder(`multi-seesaw-pivot-${seesawIndex}`, 0.42, 2.2, { ...location, y: location.y - 0.42 }, materials.steel, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 10 });
        addAnimation((seconds) => { board.mesh.rotation.z = Math.sin(seconds * 1.15 + seesawIndex) * 0.19; });
      }
      representation.detailProfile = "five-consecutive-independently-animated-seesaws";
      return true;
    }
    if (template === "hanging-board") {
      const boardStart = at(0.14, 0, 3.3);
      const boardEnd = at(0.9, 0, 3.3);
      const boardCenter = at(0.52, 0, 3.3);
      const board = box("hanging-grip-board", [3.2, 0.52, Math.max(7.5, length * 0.76)], boardCenter, materials.wood, { rotationY: yaw });
      for (let hanger = 0; hanger <= 7; hanger += 1) {
        const location = at(0.14 + hanger * 0.108, hanger % 2 ? 1.25 : -1.25, 3.3);
        beam(`hanging-board-rope-${hanger}`, location, { ...location, y: location.y + 3.1 }, 0.065, whiteRope);
        sphere(`hanging-board-handhold-${hanger}`, 0.2, { ...location, y: location.y - 0.42 }, hanger % 2 ? materials.yellow : materials.coral, { scaleY: 0.55 });
      }
      rideInteraction("hanging-board", "ぶらさがりボードにつかまる", { ...boardStart, y: boardStart.y - 0.75 }, { ...boardEnd, y: boardEnd.y - 0.75 }, 4_300, board, 0.75, 0.16);
      representation.detailProfile = "single-long-suspended-grip-board-eight-hangers-underboard-handholds";
      return true;
    }
    if (template === "three-walls") {
      const heights = [2.5, 3.5, 4.5];
      heights.forEach((height, wallIndex) => {
        const amount = 0.22 + wallIndex * 0.3;
        box(`three-wall-panel-${wallIndex}`, [0.65, height, 5.8], at(amount, 0, height / 2), [materials.coral, materials.yellow, materials.teal][wallIndex], { rotationY: yaw });
        for (let hold = 0; hold < 8; hold += 1) sphere(`three-wall-hold-${wallIndex}-${hold}`, 0.18 + hold % 2 * 0.04, at(amount - 0.035, (hold % 4 - 1.5) * 0.95, 0.55 + Math.floor(hold / 4) * (height - 1.1)), palette[(hold + wallIndex) % palette.length], { scaleZ: 0.42 });
        tagOfficialMesh(addRamp(`${attraction.officialId}-three-wall-up-${wallIndex}`, "official-attraction", [at(amount - 0.1).x, baseY, at(amount - 0.1).z], [at(amount).x, baseY + height, at(amount).z], 2.5, materials.lightWood, { areaId: attraction.areaId }), representation);
        tagOfficialMesh(addRamp(`${attraction.officialId}-three-wall-down-${wallIndex}`, "official-attraction", [at(amount).x, baseY + height, at(amount).z], [at(amount + 0.1).x, baseY, at(amount + 0.1).z], 2.5, materials.lightWood, { areaId: attraction.areaId }), representation);
      });
      representation.detailProfile = "three-distinct-increasing-height-climb-over-walls-with-holds";
      return true;
    }
    if (template === "rotating-barrels") {
      for (let barrelIndex = 0; barrelIndex < 5; barrelIndex += 1) {
        const location = at(0.12 + barrelIndex * 0.19, barrelIndex % 2 ? 0.3 : -0.3, 1.15);
        const barrel = cylinder(`rotating-barrel-${barrelIndex}`, 1.05, 3.2, location, [materials.orange, materials.teal, materials.purple][barrelIndex % 3], { rotationZ: Math.PI / 2, rotationY: yaw, segments: 16 });
        for (const band of [-1.1, 0, 1.1]) torus(`rotating-barrel-band-${barrelIndex}-${band}`, 1.08, 0.1, { x: location.x + ux * band, y: location.y, z: location.z + uz * band }, materials.black, { rotationY: yaw + Math.PI / 2, segments: 16 });
        addSurface(`${attraction.officialId}-barrel-surface-${barrelIndex}`, location.x, location.z, 2.2, 1.55, location.y + 1, { areaId: attraction.areaId });
        addAnimation((seconds) => { barrel.rotation.x = seconds * (barrelIndex % 2 ? 0.78 : -0.68); });
      }
      representation.detailProfile = "five-crosswise-multicolor-rolling-barrels-black-hoop-bands";
      return true;
    }
    if (template === "jump-net") {
      const jumpStart = at(0.12, 0, 0.65);
      const netAmount = 0.84;
      playable("jump-launch", [4.2, 0.42, 3.4], { ...jumpStart, y: jumpStart.y - 0.21 }, materials.yellow, { rotationY: yaw });
      for (let row = 0; row <= 10; row += 1) beam(`jump-net-row-${row}`, at(netAmount, -3.2, 0.18 + row * 0.47), at(netAmount, 3.2, 0.18 + row * 0.47), 0.052, whiteRope);
      for (let column = 0; column <= 12; column += 1) beam(`jump-net-column-${column}`, at(netAmount, -3.2 + column * 0.533, 0.18), at(netAmount, -3.2 + column * 0.533, 4.88), 0.052, whiteRope);
      for (let mark = 0; mark < 4; mark += 1) box(`jump-launch-mark-${mark}`, [0.5, 0.08, 0.5], at(0.12 + mark * 0.07, mark % 2 ? 0.75 : -0.75, 0.89), mark % 2 ? materials.coral : materials.blue, { rotationY: yaw + Math.PI / 4 });
      rideInteraction("jump-net", "ネットへジャンプ", { ...jumpStart, y: jumpStart.y + 0.2 }, at(netAmount, 0, 2.15), 1_450, null, 1.2, 2.35);
      representation.detailProfile = "marked-launch-deck-into-large-fine-catch-net-interactive-jump-arc";
      return true;
    }
    if (template === "frisbee-shooter") {
      const cageStart = 0.08;
      const cageEnd = 0.88;
      const cageHalfWidth = 3.55;
      const cageHeight = 4.65;
      for (const lateral of [-cageHalfWidth, cageHalfWidth]) {
        for (let rail = 0; rail <= 5; rail += 1) beam(`frisbee-side-net-rail-${lateral}-${rail}`, at(cageStart, lateral, rail * cageHeight / 5), at(cageEnd, lateral, rail * cageHeight / 5), 0.035, materials.black);
        for (let post = 0; post <= 8; post += 1) {
          const amount = cageStart + post * (cageEnd - cageStart) / 8;
          beam(`frisbee-side-net-post-${lateral}-${post}`, at(amount, lateral, 0), at(amount, lateral, cageHeight), 0.035, materials.black);
        }
      }
      for (let ceilingLine = 0; ceilingLine <= 8; ceilingLine += 1) {
        const amount = cageStart + ceilingLine * (cageEnd - cageStart) / 8;
        beam(`frisbee-cage-ceiling-${ceilingLine}`, at(amount, -cageHalfWidth, cageHeight), at(amount, cageHalfWidth, cageHeight), 0.04, materials.black);
      }
      for (const lateral of [-cageHalfWidth, cageHalfWidth]) {
        beam(`frisbee-cage-frame-${lateral}-front`, at(cageStart, lateral, 0), at(cageStart, lateral, cageHeight), 0.16, materials.wood);
        beam(`frisbee-cage-frame-${lateral}-back`, at(cageEnd, lateral, 0), at(cageEnd, lateral, cageHeight), 0.16, materials.wood);
      }
      beam("frisbee-cage-front-top", at(cageStart, -cageHalfWidth, cageHeight), at(cageStart, cageHalfWidth, cageHeight), 0.16, materials.wood);
      beam("frisbee-cage-back-top", at(cageEnd, -cageHalfWidth, cageHeight), at(cageEnd, cageHalfWidth, cageHeight), 0.16, materials.wood);

      const targetAmount = 0.84;
      box("frisbee-dark-brown-target-wall", [0.58, 4.8, 7.2], at(targetAmount, 0, 2.4), materials.darkWood, { rotationY: yaw });
      const slots = [
        { label: "大", lateral: -2.15, height: 2.75, width: 1.05, centerY: 2.35 },
        { label: "中", lateral: 0, height: 2.05, width: 0.8, centerY: 2.35 },
        { label: "小", lateral: 2.15, height: 1.3, width: 0.6, centerY: 2.35 },
      ];
      slots.forEach((slot, slotIndex) => {
        const straightHeight = Math.max(0.25, slot.height - slot.width);
        box(`frisbee-slot-dark-${slotIndex}`, [0.16, straightHeight, slot.width], at(targetAmount - 0.02, slot.lateral, slot.centerY), materials.black, { rotationY: yaw });
        for (const cap of [-1, 1]) {
          const capY = slot.centerY + cap * straightHeight / 2;
          beam(`frisbee-slot-cap-${slotIndex}-${cap}`, at(targetAmount - 0.032, slot.lateral, capY), at(targetAmount - 0.006, slot.lateral, capY), slot.width / 2, materials.black, { segments: 18 });
        }
      });

      const frisbeeHome = at(0.14, 0, 0.78);
      box("frisbee-bin-bottom", [2.6, 0.22, 3.8], at(0.14, 0, 0.12), materials.wood, { rotationY: yaw });
      box("frisbee-bin-back", [0.28, 1.15, 3.8], at(0.1, 0, 0.58), materials.darkWood, { rotationY: yaw });
      for (const lateral of [-1.85, 1.85]) box(`frisbee-bin-side-${lateral}`, [2.4, 1.15, 0.24], at(0.14, lateral, 0.58), materials.darkWood, { rotationY: yaw });
      for (let stored = 0; stored < 5; stored += 1) cylinder(`stored-frisbee-${stored}`, 0.5, 0.08, at(0.13 + stored * 0.008, -1.1 + stored * 0.55, 0.62 + stored * 0.035), stored % 2 ? materials.blue : materials.yellow, { segments: 18 });
      const flyingFrisbee = cylinder("flying-frisbee", 0.56, 0.09, frisbeeHome, materials.yellow, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 20 });
      representation.frisbeeAttempt = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-frisbee`,
        label: "フリスビーを大・中・小の穴へ投げる",
        point: at(0.12, 0, 0.85),
        radius: 4.2,
        areaId: attraction.areaId,
        activate() {
          if (representation.frisbeeThrowAt) return false;
          representation.frisbeeTargetIndex = representation.frisbeeAttempt % slots.length;
          representation.frisbeeAttempt += 1;
          representation.frisbeeThrowAt = performance.now();
          representation.frisbeeHitNotified = false;
          handle.notify?.(`🥏 ${slots[representation.frisbeeTargetIndex].label}の穴を狙って投げた！`);
          playTone(390, 0.1, "sine");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        if (!representation.frisbeeThrowAt) return;
        const elapsed = now - representation.frisbeeThrowAt;
        const progress = clamp(elapsed / 1_050, 0, 1);
        const slot = slots[representation.frisbeeTargetIndex];
        const target = at(targetAmount - 0.055, slot.lateral, slot.centerY);
        flyingFrisbee.position.set(
          lerp(frisbeeHome.x, target.x, progress),
          lerp(frisbeeHome.y, target.y, progress) + Math.sin(progress * Math.PI) * 1.35,
          lerp(frisbeeHome.z, target.z, progress),
        );
        flyingFrisbee.rotation.y = yaw + progress * Math.PI * 9;
        if (progress >= 1 && !representation.frisbeeHitNotified) {
          representation.frisbeeHitNotified = true;
          handle.notify?.(`✨ ${slot.label}の縦長穴を通過！`);
          playTone(720 + representation.frisbeeTargetIndex * 80, 0.18, "triangle");
        }
        if (elapsed > 1_500) {
          flyingFrisbee.position.set(frisbeeHome.x, frisbeeHome.y, frisbeeHome.z);
          representation.frisbeeThrowAt = null;
        }
      });
      representation.detailProfile = "photo-matched-netted-throwing-cage-dark-brown-wall-three-rounded-large-medium-small-slots-frisbee-bin-and-throw-cycle";
      return true;
    }
    if (template === "log-wall-traverse") {
      const wallBottomLateral = 0.28;
      const wallTopLateral = 0.78;
      for (let row = 0; row < 9; row += 1) {
        const heightAtRow = 0.38 + row * 0.45;
        const lateral = lerp(wallBottomLateral, wallTopLateral, row / 8);
        beam(`sloped-log-wall-row-${row}`, at(0.1, lateral, heightAtRow), at(0.92, lateral, heightAtRow), 0.26, row % 2 ? materials.wood : materials.lightWood, { segments: 12 });
      }
      for (const endpoint of [0.08, 0.94]) beam(`sloped-log-wall-end-${endpoint}`, at(endpoint, wallBottomLateral, 0.05), at(endpoint, wallTopLateral, 4.25), 0.24, materials.darkWood);
      beam("sloped-log-wall-top", at(0.06, wallTopLateral, 4.38), at(0.96, wallTopLateral, 4.38), 0.24, materials.wood);
      for (let ropeIndex = 0; ropeIndex < 5; ropeIndex += 1) {
        const amount = 0.14 + ropeIndex * 0.19;
        beam(`wall-traverse-white-rope-${ropeIndex}`, at(amount, wallTopLateral - 0.08, 4.32), at(amount, wallBottomLateral - 0.18, 0.65), 0.07, whiteRope);
      }
      for (let foothold = 0; foothold < 8; foothold += 1) {
        const amount = 0.14 + foothold * 0.105;
        const location = at(amount, wallBottomLateral - 0.12, 0.62 + foothold % 2 * 0.24);
        box(`wall-traverse-small-foot-${foothold}`, [0.52, 0.2, 0.88], location, materials.lightWood, { rotationY: yaw });
        addSurface(`${attraction.officialId}-wall-foot-surface-${foothold}`, location.x, location.z, 0.8, 0.8, location.y + 0.12, { areaId: attraction.areaId });
      }
      const bellPoint = at(0.94, wallBottomLateral - 0.1, 3.25);
      beam("victory-bell-bracket", at(0.91, wallTopLateral, 4.25), at(0.94, wallBottomLateral - 0.1, 3.7), 0.1, materials.steel);
      const victoryBell = tagOfficialMesh(addCone(`${attraction.officialId}-victory-bell`, "official-attraction", 0.58, 0.75, [bellPoint.x, bellPoint.y, bellPoint.z], materials.yellow, { segments: 16, rotationY: yaw }), representation);
      sphere("victory-bell-clapper", 0.14, { ...bellPoint, y: bellPoint.y - 0.42 }, materials.steel, { segments: 10 });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-wall-traverse`,
        label: "ロープと小足場で木壁を横断",
        point: at(0.1, wallBottomLateral - 0.35, 1.35),
        radius: 4.2,
        areaId: attraction.areaId,
        activate() {
          const started = beginLocalRide(
            `official-${attraction.officialId}-wall-traverse`, attraction.areaId,
            at(0.1, wallBottomLateral - 0.35, 1.35), at(0.91, wallBottomLateral - 0.35, 1.35),
            4_300, null, attraction.name, attraction.number - 1, 1.2, 0.04,
          );
          if (started) representation.wallTraverseAt = performance.now();
          return started;
        },
      });
      registerInteraction({
        id: `official-${attraction.officialId}-victory-bell`,
        label: "横断の勝利の鐘を鳴らす",
        point: at(0.92, wallBottomLateral - 0.25, 1.35),
        radius: 3.4,
        areaId: attraction.areaId,
        activate() {
          representation.wallBellAt = performance.now();
          handle.notify?.("🔔 木壁横断クリア！勝利の鐘を鳴らした！");
          playTone(860, 0.34, "sine");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const progress = representation.wallBellAt ? clamp((now - representation.wallBellAt) / 950, 0, 1) : 1;
        victoryBell.rotation.z = progress < 1 ? Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.52 : 0;
      });
      representation.detailProfile = "photo-matched-sloped-natural-log-wall-five-white-ropes-small-foot-ledges-side-traverse-and-separate-finish-bell";
      return true;
    }
    if (template === "cup-drop-tower") {
      const publishedHeight = 2;
      const towerAmount = 0.36;
      const towerPoint = (along, lateral, height) => at(towerAmount + along / Math.max(length, 1), lateral, height);
      for (const along of [-1.55, 1.55]) for (const lateral of [-1.65, 1.65]) {
        beam(`cup-tower-post-${along}-${lateral}`, towerPoint(along, lateral, 0.05), towerPoint(along, lateral, 2.75), 0.18, materials.wood);
      }
      playable("cup-tower-two-meter-deck", [4.2, 0.34, 4.2], towerPoint(0, 0, publishedHeight), materials.lightWood, { rotationY: yaw });
      for (const lateral of [-1.7, 1.7]) beam(`cup-tower-side-rail-${lateral}`, towerPoint(-1.55, lateral, 2.85), towerPoint(1.55, lateral, 2.85), 0.1, materials.wood);
      for (const along of [-1.55, 1.55]) beam(`cup-tower-end-rail-${along}`, towerPoint(along, -1.7, 2.85), towerPoint(along, 1.7, 2.85), 0.1, materials.wood);
      for (let rung = 0; rung < 5; rung += 1) beam(`cup-tower-ladder-rung-${rung}`, towerPoint(-2.1, -0.72, 0.4 + rung * 0.4), towerPoint(-2.1, 0.72, 0.4 + rung * 0.4), 0.08, materials.wood);
      for (const lateral of [-0.82, 0.82]) beam(`cup-tower-ladder-side-${lateral}`, towerPoint(-2.1, lateral, 0.15), towerPoint(-2.1, lateral, 2.15), 0.1, materials.wood);

      const cupPoint = at(0.83, 0, 0.22);
      torus("ground-cup-rim", 0.76, 0.16, cupPoint, materials.lightWood, { rotationX: Math.PI / 2, segments: 20 });
      cylinder("ground-cup-dark-center", 0.6, 0.12, { ...cupPoint, y: cupPoint.y - 0.04 }, materials.black, { segments: 18 });
      const ballHome = towerPoint(0.7, 0, 2.62);
      const dropBall = sphere("cup-drop-ball", 0.42, ballHome, materials.coral, { segments: 14 });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-climb-two-meter-tower`,
        label: "約2mの塔へ登る",
        point: towerPoint(-2.25, 0, 0.45),
        radius: 3.8,
        areaId: attraction.areaId,
        activate: () => beginLocalRide(
          `official-${attraction.officialId}-climb-two-meter-tower`, attraction.areaId,
          towerPoint(-2.25, 0, 0.45), towerPoint(-0.6, 0, 2.52), 1_800,
          null, "約2mのカップイン塔", attraction.number - 1, 1.2, 0,
        ),
      });
      registerInteraction({
        id: `official-${attraction.officialId}-aim-and-drop`,
        label: "球を調整して地上のカップへ落とす",
        point: towerPoint(0.25, 0, 2.48),
        radius: 3.2,
        areaId: attraction.areaId,
        activate() {
          if (representation.cupDropAt) return false;
          const now = performance.now();
          if (!representation.cupAimAt) {
            representation.cupAimAt = now;
            handle.notify?.("⚪ 球を微調整中…狙いを見て、もう一度Eでリリース！");
            playTone(330, 0.1, "sine");
            return true;
          }
          const aimOffset = Math.sin((now - representation.cupAimAt) * 0.0062) * 0.68;
          representation.cupReleaseOffset = aimOffset;
          representation.cupReleaseStart = { x: ballHome.x + px * aimOffset, y: ballHome.y, z: ballHome.z + pz * aimOffset };
          representation.cupDropAt = now;
          representation.cupAimAt = null;
          representation.cupResultNotified = false;
          playTone(440, 0.08, "triangle");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        if (representation.cupAimAt && !representation.cupDropAt) {
          const aimOffset = Math.sin((now - representation.cupAimAt) * 0.0062) * 0.68;
          dropBall.position.set(ballHome.x + px * aimOffset, ballHome.y, ballHome.z + pz * aimOffset);
          return;
        }
        if (!representation.cupDropAt) return;
        const elapsed = now - representation.cupDropAt;
        const progress = clamp(elapsed / 900, 0, 1);
        const fall = progress * progress;
        const missOffset = representation.cupReleaseOffset * 0.72;
        const landing = { x: cupPoint.x + px * missOffset, y: cupPoint.y + 0.2, z: cupPoint.z + pz * missOffset };
        dropBall.position.set(
          lerp(representation.cupReleaseStart.x, landing.x, progress),
          lerp(representation.cupReleaseStart.y, landing.y, fall),
          lerp(representation.cupReleaseStart.z, landing.z, progress),
        );
        if (progress >= 1 && !representation.cupResultNotified) {
          representation.cupResultNotified = true;
          const success = Math.abs(representation.cupReleaseOffset) <= 0.28;
          handle.notify?.(success ? "⛳ カップイン！わずかな調整が成功！" : "惜しい！タイミングを変えてもう一度");
          playTone(success ? 820 : 240, 0.18, success ? "sine" : "square");
        }
        if (elapsed > 1_450) {
          dropBall.position.set(ballHome.x, ballHome.y, ballHome.z);
          representation.cupDropAt = null;
        }
      });
      representation.publishedHeightMeters = publishedHeight;
      representation.detailProfile = "published-about-2m-natural-log-tower-climb-timed-fine-aim-release-ground-cup-drop";
      return true;
    }
    if (template === "parallel-wall-bridge") {
      const wallLength = Math.max(10, length * 0.78);
      const wallCenterAmount = 0.54;
      const halfGap = 1.35;
      box("bridge-left-dark-wall", [0.55, 3.6, wallLength], at(wallCenterAmount, -halfGap, 1.8), materials.darkWood, { rotationY: yaw });
      box("bridge-right-dark-wall", [0.55, 3.6, wallLength], at(wallCenterAmount, halfGap, 1.8), materials.darkWood, { rotationY: yaw });
      playable("bridge-green-safety-mat", [2.45, 0.18, wallLength], at(wallCenterAmount, 0, 0.09), materials.teal, { rotationY: yaw });
      const handHolds = [];
      for (let holdIndex = 0; holdIndex < 8; holdIndex += 1) {
        const amount = 0.14 + holdIndex * 0.105;
        const location = at(amount, halfGap - 0.32, 1.7 + holdIndex % 2 * 0.48);
        const holdMaterial = [materials.steel, materials.teal, materials.lime][holdIndex % 3];
        const hold = sphere(`bridge-hand-hemisphere-${holdIndex}`, 0.42, location, holdMaterial, { scaleX: 0.72, scaleY: 0.9, scaleZ: 0.72, segments: 14 });
        handHolds.push({ mesh: hold, baseScale: hold.scale.clone() });
      }
      for (let footIndex = 0; footIndex < 8; footIndex += 1) {
        const amount = 0.14 + footIndex * 0.105;
        const location = at(amount, -halfGap + 0.3, 0.58 + footIndex % 2 * 0.12);
        box(`bridge-opposite-foot-ledge-${footIndex}`, [0.5, 0.22, 1.05], location, materials.lightWood, { rotationY: yaw });
      }
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-body-bridge`,
        label: "両壁に手足を置いて横断",
        point: at(0.1, 0, 1.35),
        radius: 4.2,
        areaId: attraction.areaId,
        activate() {
          const started = beginLocalRide(
            `official-${attraction.officialId}-body-bridge`, attraction.areaId,
            at(0.1, 0, 1.35), at(0.92, 0, 1.35), 4_100,
            null, attraction.name, attraction.number - 1, 1.2, 0.03,
          );
          if (started) representation.bodyBridgeAt = performance.now();
          return started;
        },
      });
      addAnimation((_seconds, now) => {
        const elapsed = representation.bodyBridgeAt ? now - representation.bodyBridgeAt : 10_000;
        const activeIndex = Math.floor(clamp(elapsed / 4_100, 0, 0.999) * handHolds.length);
        handHolds.forEach((hold, holdIndex) => {
          const pulse = holdIndex === activeIndex && elapsed < 4_100 ? 1.12 : 1;
          hold.mesh.scale.set(hold.baseScale.x * pulse, hold.baseScale.y * pulse, hold.baseScale.z * pulse);
        });
      });
      representation.detailProfile = "photo-matched-parallel-dark-brown-wall-corridor-green-mat-one-side-hemisphere-handholds-opposite-foot-ledges-body-bridge-traverse";
      return true;
    }
    if (template === "fishing-lift") {
      const frame = at(0.58, 0, 0);
      for (const lateral of [-3, 3]) beam(`fishing-frame-post-${lateral}`, at(0.58, lateral, 0), at(0.58, lateral, 6.1), 0.22, materials.darkWood);
      beam("fishing-frame-top", at(0.58, -3.2, 6), at(0.58, 3.2, 6), 0.24, materials.wood);
      const pulley = torus("fishing-pulley", 0.75, 0.14, at(0.58, 0, 5.6), materials.steel, { rotationY: yaw + Math.PI / 2, segments: 18 });
      beam("fishing-line", at(0.58, 0, 5.6), at(0.58, 0, 1.15), 0.065, whiteRope);
      const fish = sphere("fishing-catch-body", 0.85, at(0.58, 0, 1.05), materials.blue, { scaleX: 1.75, scaleY: 0.75, segments: 12 });
      tagOfficialMesh(addCone(`${attraction.officialId}-fishing-tail`, "official-attraction", 0.7, 1.2, [frame.x - ux * 1.4, baseY + 1.05, frame.z - uz * 1.4], materials.teal, { segments: 3, rotationY: yaw }), representation);
      box("fishing-crank", [2.2, 0.24, 0.24], at(0.58, -3.55, 2.1), materials.yellow, { rotationY: yaw });
      representation.interactive = true;
      representation.fishingPulls = 0;
      registerInteraction({ id: `official-${attraction.officialId}-fishing`, label: "E連打でオオモノを釣り上げる", point: at(0.58, -3.5, 1.2), radius: 4, areaId: attraction.areaId, activate() { representation.fishingPulls = Math.min(4, representation.fishingPulls + 1); representation.fishingAt = performance.now(); handle.notify?.(representation.fishingPulls >= 4 ? "🎣 オオモノを釣り上げた！" : `🎣 巻き上げ ${representation.fishingPulls}/4`); playTone(260 + representation.fishingPulls * 80, 0.1, "triangle"); if (representation.fishingPulls >= 4) window.setTimeout(() => { representation.fishingPulls = 0; }, 1_200); return true; } });
      addAnimation((seconds) => { fish.position.y = baseY + 1.05 + representation.fishingPulls * 0.82 + Math.sin(seconds * 1.4) * 0.08; pulley.rotation.z = seconds * (representation.fishingPulls ? 1.2 : 0.1); });
      representation.detailProfile = "four-pull-crank-timber-gantry-pulley-line-and-animated-large-fish";
      return true;
    }
    if (template === "ball-maze") {
      const boardCenter = at(0.63, 0, 3.05);
      const board = box("ball-maze-board", [8.2, 5.6, 0.48], boardCenter, materials.navy, { rotationY: yaw });
      const mazeSegments = [
        [-3.1, 1.8, 2.5, 0.16], [-1.4, 0.8, 0.16, 2], [0.2, 1.6, 3, 0.16], [2.1, 0.2, 0.16, 2.7],
        [-2.4, -0.8, 2.2, 0.16], [0.3, -1.4, 2.7, 0.16], [3, -1, 0.16, 2.2],
      ];
      mazeSegments.forEach(([localX, localY, width, height], segment) => box(`ball-maze-rail-${segment}`, [width, height, 0.24], { x: boardCenter.x + px * localX, y: boardCenter.y + localY, z: boardCenter.z + pz * localX - uz * 0.38 }, segment % 2 ? materials.yellow : materials.white, { rotationY: yaw }));
      const ballPath = [[-3.4, 2], [-1.8, 1.2], [-0.6, 2], [1.4, 1], [0.2, -0.2], [-2.4, -1.5], [1.2, -2], [3.2, -1.4]];
      const mazeBall = sphere("ball-maze-ball", 0.48, { x: boardCenter.x + px * ballPath[0][0] - ux * 0.48, y: boardCenter.y + ballPath[0][1], z: boardCenter.z + pz * ballPath[0][0] - uz * 0.48 }, materials.coral, { segments: 12 });
      representation.interactive = true;
      registerInteraction({ id: `official-${attraction.officialId}-maze`, label: "ボール迷路を傾ける", point: at(0.42, 0, 1), radius: 4.2, areaId: attraction.areaId, activate() { representation.mazeAt = performance.now(); handle.notify?.("🔴 ボール迷路 START！"); playTone(430, 0.1, "sine"); return true; } });
      addAnimation((_seconds, now) => {
        if (!representation.mazeAt) return;
        const progress = clamp((now - representation.mazeAt) / 4_200, 0, 0.999);
        const scaled = progress * (ballPath.length - 1);
        const pathIndex = Math.floor(scaled);
        const localAmount = scaled - pathIndex;
        const from = ballPath[pathIndex];
        const to = ballPath[pathIndex + 1];
        const localX = lerp(from[0], to[0], localAmount);
        const localY = lerp(from[1], to[1], localAmount);
        mazeBall.position.set(boardCenter.x + px * localX - ux * 0.48, boardCenter.y + localY, boardCenter.z + pz * localX - uz * 0.48);
        board.rotation.z = Math.sin(progress * Math.PI * 7) * 0.08;
        if (now - representation.mazeAt > 4_500) { representation.mazeAt = null; handle.notify?.("🏁 ボール迷路 GOAL！"); playTone(820, 0.2, "sine"); }
      });
      representation.detailProfile = "large-operated-navy-tilting-maze-seven-rails-eight-waypoint-rolling-ball";
      return true;
    }
    if (template === "bank-bowling") {
      const top = at(0.15, 0, 2.8);
      const bottom = at(0.88, 0, 0.15);
      tagOfficialMesh(addRamp(`${attraction.officialId}-bank-bowling-lane`, "official-attraction", [top.x, top.y, top.z], [bottom.x, bottom.y, bottom.z], 5.2, materials.camo, { areaId: attraction.areaId }), representation);
      for (const lateral of [-2.7, 2.7]) beam(`bank-bowling-gutter-${lateral}`, { ...top, x: top.x + px * lateral, z: top.z + pz * lateral }, { ...bottom, x: bottom.x + px * lateral, z: bottom.z + pz * lateral }, 0.16, materials.wood);
      const ball = sphere("bank-bowling-ball", 0.66, { ...top, y: top.y + 0.7 }, materials.coral, { segments: 14 });
      const pins = [];
      for (let row = 0; row < 3; row += 1) for (let column = 0; column <= row; column += 1) {
        const location = at(0.88 + row * 0.025, (column - row / 2) * 0.9, 0.78);
        const pin = cylinder(`bank-bowling-pin-${row}-${column}`, 0.25, 1.15, location, materials.white, { segments: 10 });
        sphere(`bank-bowling-pin-band-${row}-${column}`, 0.28, { ...location, y: location.y + 0.18 }, materials.red, { scaleY: 0.24, segments: 10 });
        pins.push(pin);
      }
      representation.interactive = true;
      registerInteraction({ id: `official-${attraction.officialId}-bowl`, label: "バンクへボールを転がす", point: top, radius: 4.2, areaId: attraction.areaId, activate() { representation.bowlingAt = performance.now(); handle.notify?.("🎳 バンクボウリング！"); playTone(280, 0.1, "square"); return true; } });
      addAnimation((_seconds, now) => {
        if (!representation.bowlingAt) return;
        const elapsed = now - representation.bowlingAt;
        const progress = clamp(elapsed / 1_250, 0, 1);
        ball.position.set(lerp(top.x, bottom.x, progress), lerp(top.y, bottom.y, progress) + 0.65, lerp(top.z, bottom.z, progress));
        ball.rotation.x = progress * Math.PI * 8;
        pins.forEach((pin, pinIndex) => { pin.rotation.z = elapsed > 1_000 ? (pinIndex % 2 ? 1 : -1) * Math.min(1.2, (elapsed - 1_000) / 350) : 0; });
        if (elapsed > 2_100) { representation.bowlingAt = null; ball.position.set(top.x, top.y + 0.7, top.z); pins.forEach((pin) => { pin.rotation.z = 0; }); handle.notify?.("💥 STRIKE!"); playTone(760, 0.2, "triangle"); }
      });
      representation.detailProfile = "steep-camouflage-bank-wood-gutters-physical-ball-tenpin-impact-animation";
      return true;
    }
    if (template === "hill-logs") {
      const heights = [0.2, 0.65, 1.2, 1.85, 2.45, 1.85, 1.2, 0.65, 0.2];
      heights.forEach((height, logIndex) => {
        const location = at(0.08 + logIndex * 0.11, 0, height);
        cylinder(`hill-log-${logIndex}`, 0.48, 4.2, location, logIndex % 2 ? materials.wood : materials.lightWood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 12 });
        addSurface(`${attraction.officialId}-hill-log-surface-${logIndex}`, location.x, location.z, 2.8, 1.2, location.y + 0.45, { areaId: attraction.areaId });
      });
      for (const lateral of [-2.4, 2.4]) beam(`hill-log-rope-${lateral}`, at(0.05, lateral, 1.9), at(0.99, lateral, 1.9), 0.075, whiteRope);
      representation.detailProfile = "mountain-profile-natural-log-bridge";
      return true;
    }
    if (template === "zigzag-logs") {
      let prior = at(0.04, -1.6, 0.42);
      for (let segment = 0; segment < 8; segment += 1) {
        const next = at(0.16 + segment * 0.115, segment % 2 ? 1.6 : -1.6, 0.42);
        beam(`zigzag-log-${segment}`, prior, next, 0.38, materials.wood, { segments: 12 });
        tagOfficialMesh(addRamp(`${attraction.officialId}-zigzag-log-surface-${segment}`, "official-attraction", [prior.x, prior.y + 0.42, prior.z], [next.x, next.y + 0.42, next.z], 0.72, materials.lightWood, { areaId: attraction.areaId }), representation);
        prior = next;
      }
      representation.detailProfile = "water-zigzag-natural-logs";
      return true;
    }
    if (template === "net-wall") {
      for (let row = 0; row <= 8; row += 1) beam(`net-wall-row-${row}`, at(0.12, 0, 0.3 + row * 0.55), at(0.94, 0, 0.3 + row * 0.55), 0.055, whiteRope);
      for (let column = 0; column <= 13; column += 1) beam(`net-wall-column-${column}`, at(0.12 + column * 0.063, 0, 0.25), at(0.12 + column * 0.063, 0, 4.75), 0.055, whiteRope);
      for (const amount of [0.08, 0.98]) for (const lateral of [-2.5, 2.5]) beam(`net-wall-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, lateral, 5.2), 0.22, materials.darkWood);
      representation.detailProfile = "full-frame-white-rope-net-wall";
      return true;
    }
    if (template === "sinking-raft") {
      const islandAmounts = [0.2, 0.5, 0.8];
      const islandLaterals = [-0.45, 0.5, -0.35];
      const islands = islandAmounts.map((amount, islandIndex) => {
        const origin = at(amount, islandLaterals[islandIndex], 0.18);
        const group = new constructors.Group();
        group.name = `Greenia:${attraction.officialId}-sinking-island-${islandIndex}`;
        group.position.set(origin.x, origin.y, origin.z);
        group.rotation.y = yaw;
        root.add(group);
        box(`sinking-island-float-${islandIndex}`, [3.65, 0.72, 4.15], { x: 0, y: -0.44, z: 0 }, materials.pink, { parent: group });
        box(`sinking-island-shadow-${islandIndex}`, [3.35, 0.18, 3.82], { x: 0, y: -0.05, z: 0 }, materials.darkWood, { parent: group });
        for (let logIndex = 0; logIndex < 7; logIndex += 1) {
          cylinder(
            `sinking-island-log-${islandIndex}-${logIndex}`,
            0.27,
            3.45,
            { x: 0, y: 0.14, z: (logIndex - 3) * 0.54 },
            logIndex % 2 ? materials.wood : materials.lightWood,
            { rotationZ: Math.PI / 2, segments: 10, parent: group },
          );
        }
        for (const side of [-1, 1]) {
          beam(
            `sinking-island-edge-rope-${islandIndex}-${side}`,
            { x: side * 1.7, y: 0.22, z: -1.85 },
            { x: side * 1.7, y: 0.22, z: 1.85 },
            0.055,
            whiteRope,
            { parent: group },
          );
        }
        const surface = orientedSurface(
          `${attraction.officialId}-sinking-island-surface-${islandIndex}`,
          origin,
          3.5,
          4,
          origin.y + 0.4,
          yaw,
          { dynamic: true, object: group },
        );
        return { group, origin, surface, islandIndex };
      });
      for (const lateral of [-2.45, 2.45]) {
        beam(`sinking-island-pull-line-${lateral}`, at(0.04, lateral, 1.75), at(0.98, lateral, 1.75), 0.075, whiteRope);
      }
      representation.islandPullStartedAt = 0;
      representation.islandPullUntil = 0;
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-pull-islands`,
        label: "Eで沈む浮島を引き寄せる",
        point: at(0.06, 0, 0.85),
        radius: 4.4,
        areaId: attraction.areaId,
        activate() {
          const now = performance.now();
          representation.islandPullStartedAt = now;
          representation.islandPullUntil = now + 1_650;
          handle.notify?.("🪢 3つの浮島を引き寄せた。沈む前に渡ろう！");
          playTone(310, 0.12, "triangle");
          return true;
        },
      });
      for (const island of islands) {
        addAnimation((seconds, now) => {
          const { group, origin, surface, islandIndex } = island;
          surface.previousX = surface.x;
          surface.previousY = surface.y;
          surface.previousZ = surface.z;
          const pullProgress = representation.islandPullUntil > now
            ? clamp((now - representation.islandPullStartedAt) / 1_650, 0, 1)
            : 0;
          const pullWave = pullProgress > 0 ? Math.sin(pullProgress * Math.PI) : 0;
          const occupied = gameplay.currentSurfaceId === surface.id;
          const alongPull = pullWave * (islandIndex === 0 ? -1.15 : islandIndex === 1 ? -0.45 : 0.35);
          const lateralSway = Math.sin(seconds * 0.8 + islandIndex * 1.7) * 0.1;
          group.position.x = origin.x + ux * alongPull + px * lateralSway;
          group.position.z = origin.z + uz * alongPull + pz * lateralSway;
          group.position.y = origin.y + Math.sin(seconds * 1.25 + islandIndex) * 0.09 - (occupied ? 0.46 : 0);
          group.rotation.x = Math.sin(seconds * 0.72 + islandIndex) * 0.055;
          group.rotation.z = Math.sin(seconds * 0.93 + islandIndex * 1.3) * (occupied ? 0.15 : 0.08);
          surface.x = group.position.x;
          surface.z = group.position.z;
          surface.y = group.position.y + 0.4;
        });
      }
      representation.detailProfile = "three-independent-pink-float-log-islands-load-sinking-and-e-pull";
      representation.publishedIslandCount = 3;
      return true;
    }
    if (template === "pull-raft" || template === "long-log-raft") {
      const start = at(0.14, 0, 0.06);
      const end = at(0.9, 0, 0.06);
      const isLong = template === "long-log-raft";
      const raft = playable("raft-platform", [isLong ? 6.8 : 4.4, 0.42, isLong ? 3.8 : 3.4], { x: start.x, y: start.y - 0.21, z: start.z }, materials.wood, { dynamic: true });
      const attachedParts = [];
      if (isLong) {
        for (let log = 0; log < 7; log += 1) {
          const logMesh = cylinder(`raft-bundle-log-${log}`, 0.34, 6.5, { x: start.x + px * (log - 3) * 0.5, y: start.y, z: start.z + pz * (log - 3) * 0.5 }, log % 2 ? materials.wood : materials.lightWood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 10 });
          attachedParts.push({ mesh: logMesh, dx: logMesh.position.x - raft.mesh.position.x, dy: logMesh.position.y - raft.mesh.position.y, dz: logMesh.position.z - raft.mesh.position.z });
        }
        beam("raft-overhead-pull", at(0.06, 0, 3), at(0.98, 0, 3), 0.09, whiteRope);
      } else {
        for (const lateral of [-2.1, 2.1]) beam(`raft-side-pull-${lateral}`, at(0.05, lateral, 1.5), at(0.98, lateral, 1.5), 0.085, whiteRope);
      }
      const origin = { x: raft.mesh.position.x, y: raft.mesh.position.y, z: raft.mesh.position.z };
      addAnimation((seconds) => {
        if (gameplay.ride?.id !== `official-${attraction.officialId}-pull`) {
          const occupied = gameplay.currentSurfaceId === raft.surface.id;
          raft.surface.previousY = raft.surface.y;
          raft.mesh.position.y = origin.y + Math.sin(seconds * 1.4 + index) * 0.08 - (occupied ? 0.16 : 0);
          raft.mesh.rotation.z = Math.sin(seconds * 0.9 + index) * 0.055;
        }
        for (const part of attachedParts) part.mesh.position.set(raft.mesh.position.x + part.dx, raft.mesh.position.y + part.dy, raft.mesh.position.z + part.dz);
        raft.surface.y = raft.mesh.position.y + 0.21;
      });
      rideInteraction("pull", `${attraction.name}：Eでロープを引く`, { ...start, y: start.y + PLAYER_FOOT_OFFSET }, { ...end, y: end.y + PLAYER_FOOT_OFFSET }, isLong ? 4_800 : 3_600, raft.mesh, -PLAYER_FOOT_OFFSET - 0.18);
      representation.detailProfile = template === "long-log-raft" ? "long-bundled-log-raft-with-overhead-pull-and-coupled-deck" : "small-square-pull-raft-with-side-ropes";
      return true;
    }
    if (template === "log-swings") {
      for (let swingIndex = 0; swingIndex < 7; swingIndex += 1) {
        const location = at(0.12 + swingIndex * 0.13, 0, 0.75 + Math.sin(swingIndex) * 0.18);
        const log = cylinder(`log-swing-${swingIndex}`, 0.42, 3.8, location, materials.wood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 12 });
        for (const lateral of [-1.65, 1.65]) beam(`log-swing-rope-${swingIndex}-${lateral}`, { x: location.x + px * lateral, y: location.y, z: location.z + pz * lateral }, { x: location.x + px * lateral, y: location.y + 4.2, z: location.z + pz * lateral }, 0.06, whiteRope);
        addSurface(`${attraction.officialId}-log-swing-surface-${swingIndex}`, location.x, location.z, 2.6, 1.05, location.y + 0.4, { areaId: attraction.areaId });
        addAnimation((seconds) => { log.rotation.x = Math.sin(seconds * 0.8 + swingIndex) * 0.16; });
      }
      representation.detailProfile = "multiple-white-rope-suspended-log-seats";
      return true;
    }
    if (template === "suspension-bridge") {
      for (let plank = 0; plank < 12; plank += 1) {
        const location = at(0.05 + plank * 0.085, 0, 0.16);
        const board = playable(`suspension-plank-${plank}`, [3.5, 0.28, 0.82], { x: location.x, y: location.y - 0.14, z: location.z }, materials.lightWood, { dynamic: true });
        animatePlatform(board, { x: board.mesh.position.x, y: board.mesh.position.y, z: board.mesh.position.z }, plank + index, { moveY: 0.08, tilt: 0.07, halfHeight: 0.14 });
        for (const lateral of [-1.55, 1.55]) beam(`suspension-vertical-${plank}-${lateral}`, { x: location.x + px * lateral, y: location.y, z: location.z + pz * lateral }, { x: location.x + px * lateral, y: location.y + 2.2, z: location.z + pz * lateral }, 0.055, whiteRope);
      }
      for (const lateral of [-1.7, 1.7]) beam(`suspension-handline-${lateral}`, at(0.03, lateral, 2.2), at(1, lateral, 2.2), 0.08, whiteRope);
      representation.detailProfile = "narrow-wood-suspension-bridge-white-vertical-ropes";
      return true;
    }
    if (template === "three-second-wall") {
      const wallCenter = at(0.58, 0, 2.25);
      const challengeGoal = at(0.88, 0, 0.7);
      box("three-second-camo-wall", [0.65, 4.5, 4], wallCenter, materials.camo, { rotationY: yaw });
      for (let ledge = 0; ledge < 7; ledge += 1) {
        const location = at(0.24 + ledge * 0.1, 0, 0.16);
        playable(`three-second-narrow-ledge-${ledge}`, [Math.max(0.42, 1.25 - ledge * 0.12), 0.2, 0.75], { x: location.x, y: location.y - 0.1, z: location.z }, materials.darkWood);
      }
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-timer`, label: "3秒タイマーを開始", point: at(0.12, 0, 0.8), radius: 4, areaId: attraction.areaId,
        activate() {
          representation.challengeStartedAt = performance.now();
          representation.challengeExpired = false;
          representation.challengeCompleted = false;
          handle.notify?.("⏱ 3秒の壁 START！狭まる足場を急げ");
          playTone(880, 0.08, "square");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        if (!representation.challengeStartedAt || representation.challengeExpired || representation.challengeCompleted) return;
        const playerPosition = handle.playerRoot?.position;
        if (
          playerPosition
          && now - representation.challengeStartedAt < 3_000
          && Math.hypot(playerPosition.x - challengeGoal.x, playerPosition.z - challengeGoal.z) < 2
        ) {
          representation.challengeCompleted = true;
          representation.challengeStartedAt = 0;
          handle.notify?.("⚡ 3秒の壁クリア！");
          playTone(980, 0.18, "triangle");
          return;
        }
        if (now - representation.challengeStartedAt >= 3_000) {
          representation.challengeExpired = true;
          handle.notify?.("⏱ 3秒経過！Eでもう一度挑戦");
          playTone(180, 0.2, "sawtooth");
        }
      });
      representation.detailProfile = "published-four-meter-camo-wall-narrowing-ledge-timer";
      representation.publishedWidthMeters = 4;
      return true;
    }
    if (template === "web-hill") {
      const peak = at(0.55, 0, 4.8);
      for (let lane = -4; lane <= 4; lane += 1) {
        beam(`web-hill-up-${lane}`, at(0.08, lane * 0.55, 0.2), { x: peak.x + px * lane * 0.4, y: peak.y, z: peak.z + pz * lane * 0.4 }, 0.055, whiteRope);
        beam(`web-hill-down-${lane}`, { x: peak.x + px * lane * 0.4, y: peak.y, z: peak.z + pz * lane * 0.4 }, at(0.98, lane * 0.55, 0.2), 0.055, whiteRope);
      }
      for (let cross = 0; cross <= 12; cross += 1) {
        const amount = 0.08 + cross * 0.075;
        const height = Math.sin((amount - 0.08) / 0.9 * Math.PI) * 4.6 + 0.2;
        beam(`web-hill-cross-${cross}`, at(amount, -2.3, height), at(amount, 2.3, height), 0.05, whiteRope);
      }
      representation.detailProfile = "triangular-up-and-down-white-rope-web";
      return true;
    }
    if (template === "overhang-wall") {
      const overhangLevels = [
        { amount: 0.22, height: 1.15, halfWidth: 3.15 },
        { amount: 0.31, height: 2.05, halfWidth: 3.35 },
        { amount: 0.42, height: 3.05, halfWidth: 3.55 },
        { amount: 0.54, height: 4.05, halfWidth: 3.7 },
        { amount: 0.67, height: 5.05, halfWidth: 3.85 },
        { amount: 0.8, height: 6.05, halfWidth: 4 },
      ];
      for (let levelIndex = 0; levelIndex < overhangLevels.length; levelIndex += 1) {
        const level = overhangLevels[levelIndex];
        beam(
          `overhang-dark-crossbeam-${levelIndex}`,
          at(level.amount, -level.halfWidth, level.height),
          at(level.amount, level.halfWidth, level.height),
          0.33,
          materials.darkWood,
          { segments: 10 },
        );
        if (levelIndex > 0) {
          const prior = overhangLevels[levelIndex - 1];
          for (const side of [-1, 1]) {
            beam(
              `overhang-dark-side-rib-${levelIndex}-${side}`,
              at(prior.amount, side * prior.halfWidth, prior.height),
              at(level.amount, side * level.halfWidth, level.height),
              0.26,
              materials.darkWood,
              { segments: 10 },
            );
          }
        }
        for (let holdIndex = 0; holdIndex < 5; holdIndex += 1) {
          const lateral = (holdIndex - 2) * (level.halfWidth * 0.42) + (levelIndex % 2 ? 0.22 : -0.22);
          sphere(
            `overhang-underside-hold-${levelIndex}-${holdIndex}`,
            0.2 + ((holdIndex + levelIndex) % 3) * 0.05,
            at(level.amount - 0.025, lateral, level.height - 0.38),
            palette[(levelIndex * 2 + holdIndex) % palette.length],
            { scaleY: 0.65, scaleZ: 0.5, segments: 9 },
          );
        }
      }
      for (const side of [-1, 1]) {
        const lateral = side * 4.15;
        beam(`overhang-net-frame-front-${side}`, at(0.12, lateral, 0.1), at(0.12, lateral, 6.45), 0.2, materials.darkWood);
        beam(`overhang-net-frame-back-${side}`, at(0.84, lateral, 0.1), at(0.84, lateral, 6.45), 0.2, materials.darkWood);
        for (let row = 0; row <= 8; row += 1) {
          const height = 0.3 + row * 0.72;
          beam(`overhang-side-net-row-${side}-${row}`, at(0.12, lateral, height), at(0.84, lateral, height), 0.045, whiteRope);
        }
        for (let column = 0; column <= 8; column += 1) {
          const amount = 0.12 + column * 0.09;
          beam(`overhang-side-net-column-${side}-${column}`, at(amount, lateral, 0.25), at(amount, lateral, 6.25), 0.045, whiteRope);
        }
      }
      rideInteraction(
        "overhang-climb",
        "Eで下面ホールドを伝ってオーバーハングを登る",
        at(0.14, 0, 1.15),
        at(0.86, 0, 5.75),
        5_200,
        null,
        1.2,
        0.22,
      );
      representation.detailProfile = "dark-multistage-timber-overhang-underside-holds-white-side-nets-assisted-climb";
      representation.publishedAngleDegrees = "135-180";
      return true;
    }
    if (template === "water-slide") {
      const top = at(0.22, 0, 4.6);
      const bottom = at(0.88, 0, 0.08);
      tagOfficialMesh(addRamp(`${attraction.officialId}-white-slide`, "official-attraction", [top.x, top.y, top.z], [bottom.x, bottom.y, bottom.z], 3.2, materials.white, { areaId: attraction.areaId }), representation);
      for (let row = 0; row <= 5; row += 1) beam(`catch-net-row-${row}`, at(0.84, -2.3, 0.2 + row * 0.42), at(0.99, 2.3, 0.2 + row * 0.42), 0.05, whiteRope);
      rideInteraction("slide", `${attraction.name}を滑る`, { ...top, y: top.y + PLAYER_FOOT_OFFSET }, { ...bottom, y: bottom.y + PLAYER_FOOT_OFFSET }, 2_000);
      representation.detailProfile = "white-water-slide-with-catch-net";
      return true;
    }
    if (template === "suspended-log-disks") {
      for (let disk = 0; disk < 12; disk += 1) {
        const origin = at(0.06 + disk * 0.08, disk % 2 ? 0.62 : -0.62, 0.22 + disk % 3 * 0.1);
        const group = new constructors.Group();
        group.name = `Greenia:${attraction.officialId}-hanging-log-disk-${disk}`;
        group.position.set(origin.x, origin.y, origin.z);
        group.rotation.y = yaw;
        root.add(group);
        cylinder(`hanging-log-disk-${disk}`, 0.7, 1.05, { x: 0, y: 0.53, z: 0 }, disk % 2 ? materials.wood : materials.lightWood, { segments: 12, parent: group });
        for (const side of [-1, 1]) {
          beam(`hanging-log-disk-rope-${disk}-${side}`, { x: side * 0.38, y: 1.02, z: 0 }, { x: side * 0.38, y: 4.35, z: 0 }, 0.048, whiteRope, { parent: group });
        }
        const surface = orientedSurface(`${attraction.officialId}-disk-surface-${disk}`, origin, 1.25, 1.25, origin.y + 1.06, yaw, { dynamic: true, object: group });
        addAnimation((seconds) => {
          surface.previousX = surface.x;
          surface.previousY = surface.y;
          surface.previousZ = surface.z;
          const sway = Math.sin(seconds * 0.68 + disk * 0.73) * 0.18;
          group.position.x = origin.x + px * sway;
          group.position.z = origin.z + pz * sway;
          group.position.y = origin.y + Math.sin(seconds * 0.94 + disk) * 0.06;
          group.rotation.y = yaw;
          group.rotation.z = Math.sin(seconds * 0.72 + disk) * 0.07;
          surface.x = group.position.x;
          surface.z = group.position.z;
          surface.y = group.position.y + 1.06;
        });
      }
      representation.detailProfile = "many-individually-two-rope-suspended-tall-log-slices-with-coupled-surfaces";
      return true;
    }
    if (template === "rope-jungle") {
      for (let ropeIndex = 0; ropeIndex < 18; ropeIndex += 1) {
        const amount = 0.07 + (ropeIndex % 9) * 0.11;
        const lateral = (Math.floor(ropeIndex / 9) - 0.5) * 3.4 + Math.sin(ropeIndex) * 0.45;
        beam(`jungle-rope-${ropeIndex}`, at(amount, lateral, 0.15), at(amount + Math.sin(ropeIndex) * 0.03, lateral * 0.7, 5.2), 0.07, whiteRope);
        for (let knot = 1; knot <= 3; knot += 1) sphere(`jungle-knot-${ropeIndex}-${knot}`, 0.16, at(amount, lateral, knot * 1.15), materials.white, { segments: 8 });
      }
      for (let log = 0; log < 5; log += 1) {
        const location = at(0.18 + log * 0.16, log % 2 ? 0.9 : -0.9, 0.65);
        cylinder(`jungle-log-${log}`, 0.38, 3.1, location, materials.wood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 10 });
        addSurface(`${attraction.officialId}-jungle-log-surface-${log}`, location.x, location.z, 2.3, 1, location.y + 0.36, { areaId: attraction.areaId });
      }
      for (let netRow = 0; netRow < 5; netRow += 1) beam(`jungle-hammock-${netRow}`, at(0.12, -2.4, 0.5 + netRow * 0.5), at(0.92, 2.4, 0.5 + netRow * 0.5), 0.045, whiteRope);
      const junglePath = Array.from({ length: 11 }, (_entry, pathIndex) => {
        const amount = 0.08 + pathIndex * 0.084;
        const lateral = Math.sin(pathIndex * 1.72) * 1.45 + (pathIndex % 3 === 0 ? -0.32 : 0.22);
        const location = at(amount, lateral, 0.68 + (pathIndex % 4) * 0.23);
        return { ...location, y: location.y + PLAYER_FOOT_OFFSET };
      });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-jungle-path`,
        label: "Eでロープと丸太の間を縫って進む",
        point: junglePath[0],
        radius: 4.4,
        areaId: attraction.areaId,
        activate: () => beginPathRide(
          `official-${attraction.officialId}-jungle-path`,
          attraction.areaId,
          junglePath,
          6_800,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          { startMessage: "🪢 ロープを押し分け、丸太へ足を移しながらジャングルを抜けよう！" },
        ),
      });
      representation.detailProfile = "official-description-matched-three-dimensional-rope-jungle-logs-hammock-and-eleven-point-weave";
      return true;
    }
    if (template === "cling-log-wall") {
      const clingPath = [];
      for (let log = 0; log < 10; log += 1) {
        const amount = 0.25 + log * 0.055;
        const lateral = (log - 4.5) * 0.72;
        const location = at(amount, lateral, 2.4);
        cylinder(`cling-wall-log-${log}`, 0.42, 5, location, log % 2 ? materials.wood : materials.lightWood, { segments: 12 });
        const holdHeight = 1.25 + (log % 3) * 0.38;
        const holdCenter = at(amount, lateral, holdHeight);
        const anchorLeft = { x: holdCenter.x - px * 0.27, y: holdCenter.y, z: holdCenter.z - pz * 0.27 };
        const anchorRight = { x: holdCenter.x + px * 0.27, y: holdCenter.y, z: holdCenter.z + pz * 0.27 };
        const outerLeft = { x: anchorLeft.x - ux * 0.5, y: anchorLeft.y - 0.1, z: anchorLeft.z - uz * 0.5 };
        const outerRight = { x: anchorRight.x - ux * 0.5, y: anchorRight.y - 0.1, z: anchorRight.z - uz * 0.5 };
        beam(`cling-white-u-leg-left-${log}`, anchorLeft, outerLeft, 0.065, whiteRope, { segments: 10 });
        beam(`cling-white-u-leg-right-${log}`, anchorRight, outerRight, 0.065, whiteRope, { segments: 10 });
        beam(`cling-white-u-grip-${log}`, outerLeft, outerRight, 0.07, whiteRope, { segments: 10 });
        const footHeight = 0.34 + (log % 2) * 0.22;
        const footLocation = at(amount, lateral, footHeight);
        playable(
          `cling-pink-tiny-foot-${log}`,
          [0.82, 0.16, 0.52],
          { x: footLocation.x - ux * 0.5, y: footLocation.y - 0.08, z: footLocation.z - uz * 0.5 },
          materials.pink,
          { rotationY: yaw },
        );
        clingPath.push({
          x: footLocation.x - ux * 0.7,
          y: footLocation.y + PLAYER_FOOT_OFFSET,
          z: footLocation.z - uz * 0.7,
        });
      }
      beam("cling-traverse-rope", at(0.16, -3.8, 1.8), at(0.92, 3.8, 1.8), 0.085, whiteRope);
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-cling-path`,
        label: "Eで白い把手とピンクの足場を横断",
        point: clingPath[0],
        radius: 4.4,
        areaId: attraction.areaId,
        activate: () => beginPathRide(
          `official-${attraction.officialId}-cling-path`,
          attraction.areaId,
          clingPath,
          6_200,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          { startMessage: "🧗 白いU字把手にしがみつき、ピンクの小さな足場へ順番に移ろう！" },
        ),
      });
      representation.detailProfile = "photo-matched-ten-natural-log-wall-white-u-handles-pink-tiny-feet-and-ten-point-cling-traverse";
      return true;
    }
    if (template === "barrel-boat") {
      const tubLaterals = [-2.15, 0, 2.15];
      const tubGroups = tubLaterals.map((lateral, tubIndex) => {
        const origin = at(0.17, lateral, 0.2);
        const group = new constructors.Group();
        group.name = `Greenia:${attraction.officialId}-open-tub-${tubIndex}`;
        group.position.set(origin.x, origin.y, origin.z);
        group.rotation.y = yaw;
        root.add(group);
        cylinder(`open-tub-hull-${tubIndex}`, 1.35, 1.8, { x: 0, y: 0.9, z: 0 }, tubIndex % 2 ? materials.darkWood : materials.wood, { segments: 20, parent: group });
        cylinder(`open-tub-dark-interior-${tubIndex}`, 1.08, 0.08, { x: 0, y: 1.83, z: 0 }, materials.black, { segments: 20, parent: group });
        torus(`open-tub-rim-${tubIndex}`, 1.37, 0.13, { x: 0, y: 1.86, z: 0 }, materials.black, { rotationX: Math.PI / 2, segments: 20, parent: group });
        for (const bandHeight of [0.45, 1.28]) {
          torus(`open-tub-band-${tubIndex}-${bandHeight}`, 1.39, 0.105, { x: 0, y: bandHeight, z: 0 }, materials.black, { rotationX: Math.PI / 2, segments: 20, parent: group });
        }
        for (const corner of [-1, 1]) {
          beam(`open-tub-suspension-front-${tubIndex}-${corner}`, { x: corner * 0.9, y: 1.72, z: -0.82 }, { x: corner * 0.34, y: 4.2, z: 0 }, 0.055, whiteRope, { parent: group });
          beam(`open-tub-suspension-back-${tubIndex}-${corner}`, { x: corner * 0.9, y: 1.72, z: 0.82 }, { x: corner * 0.34, y: 4.2, z: 0 }, 0.055, whiteRope, { parent: group });
        }
        beam(`open-tub-guide-rope-${tubIndex}`, at(0.05, lateral, 4.4), at(0.98, lateral, 4.4), 0.075, whiteRope);
        return { group, origin, tubIndex };
      });
      const start = at(0.17, 0, 0.2);
      const end = at(0.9, 0, 0.2);
      const rideId = `official-${attraction.officialId}-barrel`;
      for (const tub of tubGroups) {
        addAnimation((seconds) => {
          if (tub.tubIndex === 1 && gameplay.ride?.id === rideId) return;
          tub.group.position.x = tub.origin.x + px * Math.sin(seconds * 0.7 + tub.tubIndex) * 0.08;
          tub.group.position.y = tub.origin.y + Math.sin(seconds * 1.05 + tub.tubIndex * 1.4) * 0.1;
          tub.group.position.z = tub.origin.z + pz * Math.sin(seconds * 0.7 + tub.tubIndex) * 0.08;
          tub.group.rotation.y = yaw;
          tub.group.rotation.z = Math.sin(seconds * 0.82 + tub.tubIndex) * 0.055;
        });
      }
      rideInteraction("barrel", `${attraction.name}：開口した樽舟で進む`, { ...start, y: start.y + PLAYER_FOOT_OFFSET }, { ...end, y: end.y + PLAYER_FOOT_OFFSET }, 4_200, tubGroups[1].group, -PLAYER_FOOT_OFFSET);
      representation.detailProfile = "three-upright-open-tub-boats-black-rims-coupled-suspension-and-guide-ropes";
      representation.publishedTubCount = 3;
      return true;
    }
    if (template === "water-dash") {
      const start = at(0.05, 0, 0.08);
      const end = at(0.95, 0, 0.08);
      const matLength = Math.min(9, Math.max(8.6, Math.hypot(end.x - start.x, end.z - start.z)));
      const center = at(0.5, 0, 0.02);
      const mat = playable("nine-meter-green-mat", [2.6, 0.18, matLength], { x: center.x, y: center.y - 0.09, z: center.z }, materials.lime, { rotationY: yaw, dynamic: true });
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      mat.surface.width = Math.abs(cos) * 2.6 + Math.abs(sin) * matLength;
      mat.surface.depth = Math.abs(sin) * 2.6 + Math.abs(cos) * matLength;
      mat.surface.contains = (x, z) => {
        const dx = x - mat.surface.x;
        const dz = z - mat.surface.z;
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        return Math.abs(localX) <= 1.3 - PLAYER_RADIUS * 0.16 && Math.abs(localZ) <= matLength / 2 - PLAYER_RADIUS * 0.16;
      };
      const originY = mat.mesh.position.y;
      addAnimation((seconds) => {
        const occupied = gameplay.currentSurfaceId === mat.surface.id;
        mat.surface.previousY = mat.surface.y;
        mat.mesh.position.y = lerp(mat.mesh.position.y, originY - (occupied ? 0.58 : 0) + Math.sin(seconds * 1.7) * 0.04, 0.08);
        mat.surface.y = mat.mesh.position.y + 0.09;
      });
      representation.detailProfile = "published-nine-meter-flat-green-sinking-water-mat";
      representation.publishedLengthMeters = 9;
      return true;
    }
    if (template === "super-jump-lanes") {
      const valleys = [0.18, 0.4, 0.62, 0.84];
      for (let valleyIndex = 0; valleyIndex < valleys.length; valleyIndex += 1) {
        const amount = valleys[valleyIndex];
        const halfSpan = 0.095;
        const peakHeight = 2.45 + (valleyIndex % 2) * 0.45;
        const entryPeak = at(amount - halfSpan, 0, peakHeight);
        const valley = at(amount, 0, 0.16);
        const exitPeak = at(amount + halfSpan, 0, peakHeight);
        tagOfficialMesh(addRamp(
          `${attraction.officialId}-super-jump-v-${valleyIndex}-entry`,
          "official-attraction",
          [entryPeak.x, entryPeak.y, entryPeak.z],
          [valley.x, valley.y, valley.z],
          5.4,
          materials.lime,
          { areaId: attraction.areaId },
        ), representation);
        tagOfficialMesh(addRamp(
          `${attraction.officialId}-super-jump-v-${valleyIndex}-exit`,
          "official-attraction",
          [valley.x, valley.y, valley.z],
          [exitPeak.x, exitPeak.y, exitPeak.z],
          5.4,
          valleyIndex % 2 ? materials.teal : materials.lime,
          { areaId: attraction.areaId },
        ), representation);
        beam(`super-jump-peak-entry-${valleyIndex}`, at(amount - halfSpan, -2.75, peakHeight), at(amount - halfSpan, 2.75, peakHeight), 0.17, materials.darkWood);
        beam(`super-jump-valley-edge-${valleyIndex}`, at(amount, -2.75, 0.16), at(amount, 2.75, 0.16), 0.13, materials.pink);
        beam(`super-jump-peak-exit-${valleyIndex}`, at(amount + halfSpan, -2.75, peakHeight), at(amount + halfSpan, 2.75, peakHeight), 0.17, materials.darkWood);
      }
      for (const lateral of [-3, 3]) beam(`super-jump-side-rope-${lateral}`, at(0.06, lateral, 1.2), at(0.96, lateral, 1.2), 0.07, whiteRope);
      representation.detailProfile = "four-large-repeated-green-padded-v-valleys-with-playable-inclines";
      representation.publishedValleyCount = 4;
      return true;
    }
    if (template === "steep-rope-ramp") {
      const bottom = at(0.12, 0, 0.08);
      const top = at(0.9, 0, 6.2);
      tagOfficialMesh(addRamp(`${attraction.officialId}-steep-brown-ramp`, "official-attraction", [bottom.x, bottom.y, bottom.z], [top.x, top.y, top.z], 4.2, materials.wood, { areaId: attraction.areaId }), representation);
      for (const lateral of [-2.35, 2.35]) beam(`steep-ramp-rope-${lateral}`, { ...bottom, x: bottom.x + px * lateral, z: bottom.z + pz * lateral, y: bottom.y + 1 }, { ...top, x: top.x + px * lateral, z: top.z + pz * lateral, y: top.y + 1 }, 0.09, whiteRope);
      representation.detailProfile = "steep-brown-wood-ramp-with-two-side-ropes";
      return true;
    }
    if (template === "spiral-stairs") {
      cylinder("spiral-center-post", 0.52, 8.5, { x: point.x, y: baseY + 4.25, z: point.z }, materials.darkWood, { segments: 12, solid: true, blocker: false });
      for (let step = 0; step < 18; step += 1) {
        const angle = step * Math.PI / 4.4;
        const x = point.x + Math.cos(angle) * 3.1;
        const z = point.z + Math.sin(angle) * 3.1;
        playable(`spiral-natural-step-${step}`, [2.8, 0.3, 1], { x, y: baseY + 0.2 + step * 0.39, z }, step % 2 ? materials.wood : materials.lightWood, { rotationY: -angle });
      }
      representation.detailProfile = "natural-wood-stairs-around-central-post";
      return true;
    }
    if (template === "rotating-balls") {
      for (let ballIndex = 0; ballIndex < 7; ballIndex += 1) {
        const origin = at(0.1 + ballIndex * 0.13, ballIndex % 2 ? 0.45 : -0.45, 0.95);
        const group = new constructors.Group();
        group.name = `Greenia:${attraction.officialId}-rotating-ball-${ballIndex}`;
        group.position.set(origin.x, origin.y, origin.z);
        root.add(group);
        const ball = sphere(`rotating-orange-ball-${ballIndex}`, 1.15, { x: 0, y: 0, z: 0 }, materials.orange, { segments: 14, parent: group });
        beam(`rotating-ball-rope-${ballIndex}`, { x: 0, y: 1.02, z: 0 }, { x: 0, y: 4.7, z: 0 }, 0.075, whiteRope, { parent: group });
        const surface = orientedSurface(`${attraction.officialId}-rotating-ball-surface-${ballIndex}`, origin, 1.5, 1.5, origin.y + 1.02, yaw, { dynamic: true, object: group });
        addAnimation((seconds) => {
          surface.previousX = surface.x;
          surface.previousY = surface.y;
          surface.previousZ = surface.z;
          const sway = Math.sin(seconds * 0.82 + ballIndex) * 0.16;
          group.position.x = origin.x + px * sway;
          group.position.z = origin.z + pz * sway;
          group.position.y = origin.y + Math.sin(seconds * 1.06 + ballIndex) * 0.08;
          ball.rotation.y = seconds * (0.7 + ballIndex * 0.03);
          group.rotation.z = Math.sin(seconds + ballIndex) * 0.12;
          surface.x = group.position.x;
          surface.z = group.position.z;
          surface.y = group.position.y + 1.02;
        });
      }
      representation.detailProfile = "large-orange-rotating-suspended-ball-platforms-with-coupled-ropes-and-surfaces";
      return true;
    }
    if (template === "rope-forest") {
      for (let ropeIndex = 0; ropeIndex < 24; ropeIndex += 1) {
        const amount = 0.05 + (ropeIndex % 12) * 0.085;
        const lateral = (Math.floor(ropeIndex / 12) ? 1 : -1) * (0.7 + (ropeIndex % 4) * 0.45);
        beam(`rope-forest-line-${ropeIndex}`, at(amount, lateral, 0.1), at(amount + Math.sin(ropeIndex) * 0.035, lateral * 0.8, 5.5), 0.08, whiteRope);
        for (let knot = 1; knot <= 4; knot += 1) sphere(`rope-forest-knot-${ropeIndex}-${knot}`, 0.17, at(amount, lateral, knot * 1.05), materials.white, { segments: 8 });
      }
      const ropeForestPath = Array.from({ length: 13 }, (_entry, pathIndex) => {
        const amount = 0.06 + pathIndex * 0.076;
        const lateral = Math.sin(pathIndex * 1.46) * (1.25 + (pathIndex % 3) * 0.2);
        const location = at(amount, lateral, 0.62 + (pathIndex % 5) * 0.27);
        return { ...location, y: location.y + PLAYER_FOOT_OFFSET };
      });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-rope-forest`,
        label: "Eで結び目をつかみロープの森を抜ける",
        point: ropeForestPath[0],
        radius: 4.4,
        areaId: attraction.areaId,
        activate: () => beginPathRide(
          `official-${attraction.officialId}-rope-forest`,
          attraction.areaId,
          ropeForestPath,
          7_200,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          { startMessage: "💪 白い結び目を左右に持ち替え、身体を上下させてロープの森を突破！" },
        ),
      });
      representation.detailProfile = "dense-three-dimensional-white-knotted-rope-forest-with-thirteen-point-body-weave";
      return true;
    }
    if (template === "hanging-stilts") {
      beam("hanging-stilt-top-rail", at(0.1, 0, 6.35), at(0.9, 0, 6.35), 0.3, materials.darkWood, { segments: 10 });
      for (const amount of [0.08, 0.92]) {
        for (const lateral of [-2.6, 2.6]) beam(`hanging-stilt-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, lateral, 6.55), 0.24, materials.darkWood, { segments: 10 });
      }
      const stilts = [
        { amount: 0.4, lateral: -0.82 },
        { amount: 0.6, lateral: 0.82 },
      ].map((definition, stiltIndex) => {
        const origin = at(definition.amount, definition.lateral, 0.32);
        const group = new constructors.Group();
        group.name = `Greenia:${attraction.officialId}-steel-stilt-${stiltIndex}`;
        group.position.set(origin.x, origin.y, origin.z);
        group.rotation.y = yaw;
        root.add(group);
        cylinder(`steel-stilt-pole-${stiltIndex}`, 0.14, 5.15, { x: 0, y: 2.58, z: 0 }, materials.steel, { segments: 12, parent: group });
        beam(`steel-stilt-suspension-${stiltIndex}`, { x: 0, y: 5.05, z: 0 }, { x: 0, y: 6.1, z: 0 }, 0.065, whiteRope, { parent: group });
        beam(`steel-stilt-triangle-left-${stiltIndex}`, { x: -0.58, y: 0.62, z: 0 }, { x: 0, y: 0.12, z: 0 }, 0.075, materials.steel, { parent: group });
        beam(`steel-stilt-triangle-right-${stiltIndex}`, { x: 0.58, y: 0.62, z: 0 }, { x: 0, y: 0.12, z: 0 }, 0.075, materials.steel, { parent: group });
        beam(`steel-stilt-triangle-top-${stiltIndex}`, { x: -0.58, y: 0.62, z: 0 }, { x: 0.58, y: 0.62, z: 0 }, 0.075, materials.steel, { parent: group });
        box(`steel-stilt-footbar-${stiltIndex}`, [1.2, 0.16, 0.72], { x: 0, y: 0.14, z: 0 }, materials.steel, { parent: group });
        const surface = orientedSurface(
          `${attraction.officialId}-steel-stilt-surface-${stiltIndex}`,
          origin,
          1.18,
          0.7,
          origin.y + 0.23,
          yaw,
          { dynamic: true, object: group },
        );
        return { group, origin, surface, stiltIndex };
      });
      for (const stilt of stilts) {
        addAnimation((seconds) => {
          stilt.surface.previousX = stilt.surface.x;
          stilt.surface.previousY = stilt.surface.y;
          stilt.surface.previousZ = stilt.surface.z;
          const sway = Math.sin(seconds * 0.74 + stilt.stiltIndex * Math.PI) * 0.22;
          stilt.group.position.x = stilt.origin.x + px * sway;
          stilt.group.position.z = stilt.origin.z + pz * sway;
          stilt.group.position.y = stilt.origin.y + Math.sin(seconds * 1.05 + stilt.stiltIndex) * 0.055;
          stilt.group.rotation.y = yaw;
          stilt.group.rotation.z = Math.sin(seconds * 0.74 + stilt.stiltIndex * Math.PI) * 0.11;
          stilt.surface.x = stilt.group.position.x;
          stilt.surface.z = stilt.group.position.z;
          stilt.surface.y = stilt.group.position.y + 0.23;
        });
      }
      rideInteraction("stilt-walk", "Eで2本の吊り竹馬を操って渡る", at(0.12, 0, 0.72), at(0.88, 0, 0.72), 4_300, null, 1.2, 0.08);
      representation.detailProfile = "exactly-two-silver-suspended-stilts-coupled-triangular-foot-stirrups";
      representation.publishedStiltCount = 2;
      return true;
    }
    if (template === "hanging-stairs") {
      const heights = [0.25, 0.75, 1.6, 2.7, 3.5, 2.8, 1.85, 0.9, 0.3];
      const stairLocations = [];
      heights.forEach((height, step) => {
        const location = at(0.08 + step * 0.11, step % 2 ? 0.4 : -0.4, height);
        stairLocations.push(location);
        const board = playable(`hanging-steel-stair-${step}`, [3.45, 0.26, 1.08], { x: location.x, y: location.y - 0.13, z: location.z }, materials.steel, { dynamic: true, rotationY: yaw });
        const corners = {
          frontLeft: { x: location.x - px * 1.56 - ux * 0.48, y: location.y + 0.08, z: location.z - pz * 1.56 - uz * 0.48 },
          frontRight: { x: location.x + px * 1.56 - ux * 0.48, y: location.y + 0.08, z: location.z + pz * 1.56 - uz * 0.48 },
          backLeft: { x: location.x - px * 1.56 + ux * 0.48, y: location.y + 0.08, z: location.z - pz * 1.56 + uz * 0.48 },
          backRight: { x: location.x + px * 1.56 + ux * 0.48, y: location.y + 0.08, z: location.z + pz * 1.56 + uz * 0.48 },
        };
        beam(`hanging-stair-frame-front-${step}`, corners.frontLeft, corners.frontRight, 0.095, materials.steel, { segments: 10 });
        beam(`hanging-stair-frame-back-${step}`, corners.backLeft, corners.backRight, 0.095, materials.steel, { segments: 10 });
        beam(`hanging-stair-frame-left-${step}`, corners.frontLeft, corners.backLeft, 0.095, materials.steel, { segments: 10 });
        beam(`hanging-stair-frame-right-${step}`, corners.frontRight, corners.backRight, 0.095, materials.steel, { segments: 10 });
        for (const [cornerName, corner] of Object.entries(corners)) {
          beam(`hanging-stair-steel-hanger-${step}-${cornerName}`, corner, { ...corner, y: location.y + 5.2 }, 0.055, materials.steel, { segments: 10 });
        }
        animatePlatform(board, { x: board.mesh.position.x, y: board.mesh.position.y, z: board.mesh.position.z }, step + index, { moveY: 0.065, tilt: 0.045, halfHeight: 0.13 });
      });
      for (let step = 0; step < stairLocations.length - 1; step += 1) {
        for (const side of [-1, 1]) {
          const from = stairLocations[step];
          const to = stairLocations[step + 1];
          beam(
            `hanging-stair-zigzag-connector-${step}-${side}`,
            { x: from.x + px * side * 1.7, y: from.y + 0.45, z: from.z + pz * side * 1.7 },
            { x: to.x + px * side * 1.7, y: to.y + 0.45, z: to.z + pz * side * 1.7 },
            0.075,
            materials.steel,
            { segments: 10 },
          );
        }
      }
      const hangingStairPath = stairLocations.map((location) => ({ ...location, y: location.y + PLAYER_FOOT_OFFSET }));
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-metal-stairs`,
        label: "Eで連結された金属階段を上下する",
        point: hangingStairPath[0],
        radius: 4.4,
        areaId: attraction.areaId,
        activate: () => beginPathRide(
          `official-${attraction.officialId}-metal-stairs`,
          attraction.areaId,
          hangingStairPath,
          6_400,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          { startMessage: "🪜 連結された銀色フレーム階段を一段ずつ上り、頂点から下ろう！" },
        ),
      });
      representation.detailProfile = "photo-matched-nine-connected-silver-frame-zigzag-stairs-with-four-point-hangers";
      return true;
    }
    if (template === "hanging-platforms") {
      for (let platformIndex = 0; platformIndex < 8; platformIndex += 1) {
        const location = at(0.1 + platformIndex * 0.12, platformIndex % 2 ? 0.7 : -0.7, 0.3);
        const platform = playable(`hanging-rectangle-${platformIndex}`, [3.2, 0.34, 1.35], { x: location.x, y: location.y - 0.17, z: location.z }, materials.lightWood, { dynamic: true });
        for (const lateral of [-1.35, 1.35]) beam(`hanging-rectangle-rope-${platformIndex}-${lateral}`, { x: location.x + px * lateral, y: location.y, z: location.z + pz * lateral }, { x: location.x + px * lateral, y: location.y + 4.7, z: location.z + pz * lateral }, 0.06, whiteRope);
        animatePlatform(platform, { x: platform.mesh.position.x, y: platform.mesh.position.y, z: platform.mesh.position.z }, platformIndex, { moveY: 0.1, tilt: 0.14, halfHeight: 0.17 });
      }
      representation.detailProfile = "individually-four-rope-suspended-rectangular-platforms";
      return true;
    }
    if (template === "climbing-fort") {
      for (const lateral of [-3.6, 3.6]) for (const along of [-3.4, 3.4]) box(`fort-heavy-post-${lateral}-${along}`, [0.6, 7.5, 0.6], { x: point.x + lateral, y: baseY + 3.75, z: point.z + along }, materials.darkWood, { solid: true });
      playable("fort-top-deck", [8.2, 0.48, 7.8], { x: point.x, y: baseY + 5.4, z: point.z }, materials.lightWood);
      beam("fort-center-climb-rope", { x: point.x, y: baseY + 0.2, z: point.z - 3.8 }, { x: point.x, y: baseY + 5.8, z: point.z - 3.8 }, 0.12, whiteRope);
      for (let row = 0; row <= 6; row += 1) beam(`fort-side-net-row-${row}`, { x: point.x + 3.7, y: baseY + row * 0.8, z: point.z - 3.6 }, { x: point.x + 3.7, y: baseY + row * 0.8, z: point.z + 3.6 }, 0.05, whiteRope);
      for (let column = 0; column <= 8; column += 1) beam(`fort-side-net-column-${column}`, { x: point.x + 3.7, y: baseY, z: point.z - 3.6 + column * 0.9 }, { x: point.x + 3.7, y: baseY + 5.2, z: point.z - 3.6 + column * 0.9 }, 0.05, whiteRope);
      representation.detailProfile = "large-wood-fort-center-climb-rope-side-white-net";
      return true;
    }
    if (template === "rotating-handles") {
      const wheelRailStart = at(0.06, 0, 4.75);
      const wheelRailEnd = at(0.96, 0, 4.75);
      beam("fixed-wheel-dark-wood-rail", wheelRailStart, wheelRailEnd, 0.34, materials.darkWood, { segments: 10 });
      const wheelGroups = [];
      const wheelRideId = `official-${attraction.officialId}-wheel-traverse`;
      for (let wheelIndex = 0; wheelIndex < 5; wheelIndex += 1) {
        const location = at(0.18 + wheelIndex * 0.16, 0, 3.35);
        const group = new constructors.Group();
        group.name = `Greenia:${attraction.officialId}-spoked-wheel-${wheelIndex}`;
        group.position.set(location.x, location.y, location.z);
        group.rotation.y = yaw + Math.PI / 2;
        root.add(group);
        torus(`spoked-wheel-rim-${wheelIndex}`, 0.88, 0.12, { x: 0, y: 0, z: 0 }, materials.steel, { segments: 20, parent: group });
        cylinder(`spoked-wheel-hub-${wheelIndex}`, 0.2, 0.48, { x: 0, y: 0, z: 0 }, materials.steel, { rotationX: Math.PI / 2, segments: 12, parent: group });
        for (let spokeIndex = 0; spokeIndex < 8; spokeIndex += 1) {
          const angle = spokeIndex / 8 * Math.PI * 2;
          beam(
            `spoked-wheel-spoke-${wheelIndex}-${spokeIndex}`,
            { x: 0, y: 0, z: 0 },
            { x: Math.cos(angle) * 0.78, y: Math.sin(angle) * 0.78, z: 0 },
            0.045,
            materials.steel,
            { parent: group, segments: 8 },
          );
        }
        beam(`spoked-wheel-fixed-axle-${wheelIndex}`, { x: 0, y: 0, z: -0.42 }, { x: 0, y: 0, z: 0.42 }, 0.14, materials.steel, { parent: group, segments: 12 });
        beam(`spoked-wheel-hanger-${wheelIndex}`, location, { ...location, y: wheelRailStart.y }, 0.14, materials.steel, { segments: 10 });
        wheelGroups.push(group);
      }
      addAnimation((seconds) => {
        const active = gameplay.ride?.id === wheelRideId;
        for (let wheelIndex = 0; wheelIndex < wheelGroups.length; wheelIndex += 1) {
          wheelGroups[wheelIndex].rotation.z = seconds * (active ? 2.5 : 0.32) * (wheelIndex % 2 ? -1 : 1) + wheelIndex * 0.25;
        }
      });
      rideInteraction(
        "wheel-traverse",
        "Eでスポーク車輪を回してうんてい横断",
        at(0.1, 0, 2.55),
        at(0.9, 0, 2.55),
        4_600,
        null,
        1.2,
        0.06,
      );
      representation.detailProfile = "five-silver-spoked-wheels-fixed-to-dark-wood-axles-e-operated-brachiation";
      representation.publishedWheelCount = 5;
      return true;
    }
    if (template === "swinging-log-bridge") {
      for (let plank = 0; plank < 9; plank += 1) {
        const location = at(0.08 + plank * 0.11, 0, 0.35);
        const board = playable(`swinging-log-plank-${plank}`, [3.9, 0.38, 1.05], { x: location.x, y: location.y - 0.19, z: location.z }, plank % 2 ? materials.wood : materials.lightWood, { dynamic: true });
        for (const lateral of [-1.7, 1.7]) beam(`swinging-log-rope-${plank}-${lateral}`, { x: location.x + px * lateral, y: location.y, z: location.z + pz * lateral }, { x: location.x + px * lateral, y: location.y + 4.8, z: location.z + pz * lateral }, 0.07, whiteRope);
        animatePlatform(board, { x: board.mesh.position.x, y: board.mesh.position.y, z: board.mesh.position.z }, plank + index, { moveX: 0.16, moveZ: 0.13, moveY: 0.11, tilt: 0.2, halfHeight: 0.19 });
      }
      representation.detailProfile = "strong-all-direction-swinging-log-board-bridge";
      return true;
    }
    if (template === "finger-ledge") {
      box("finger-ledge-wall", [0.7, 3.8, 8.8], at(0.6, 0, 1.9), materials.wood, { rotationY: yaw });
      const ledgeStart = at(0.24, -3.7, 3.55);
      const ledgeEnd = at(0.92, 3.7, 3.55);
      beam("finger-tip-ledge", ledgeStart, ledgeEnd, 0.12, materials.lightWood);
      for (let finger = 0; finger < 14; finger += 1) sphere(`finger-notch-${finger}`, 0.11, at(0.25 + finger * 0.05, -3.5 + finger * 0.54, 3.48), primary, { segments: 7 });
      const fingerWaypoints = Array.from({ length: 9 }, (_entry, fingerStep) => {
        const amount = fingerStep / 8;
        return {
          x: lerp(ledgeStart.x, ledgeEnd.x, amount) - ux * 0.82,
          y: lerp(ledgeStart.y, ledgeEnd.y, amount) - 1.25,
          z: lerp(ledgeStart.z, ledgeEnd.z, amount) - uz * 0.82,
        };
      });
      representation.interactive = true;
      representation.fingerStep = -1;
      registerInteraction({
        id: `official-${attraction.officialId}-finger-steps`,
        label: "Eを一回ずつ押して指先を進める",
        point: fingerWaypoints[0],
        radius: 13,
        areaId: attraction.areaId,
        activate() {
          representation.fingerStep = Math.min(fingerWaypoints.length - 1, representation.fingerStep + 1);
          setPlayerPosition(fingerWaypoints[representation.fingerStep]);
          if (representation.fingerStep >= fingerWaypoints.length - 1) {
            handle.notify?.("💪 指先だけでスーパー崖つかまりを横断！");
            playTone(760, 0.24, "sine");
            representation.fingerStep = -1;
          } else {
            handle.notify?.(`🤏 指先 ${representation.fingerStep + 1}/${fingerWaypoints.length}　もう一度Eで次へ`);
            playTone(250 + representation.fingerStep * 34, 0.07, "triangle");
          }
          return true;
        },
      });
      representation.detailProfile = "official-description-matched-horizontal-wood-wall-extremely-thin-finger-ledge-nine-deliberate-inputs";
      return true;
    }
    if (template === "lift-logs") {
      const stand = box("lift-log-rail-frame", [8.5, 0.5, 5], { x: point.x, y: baseY + 0.25, z: point.z }, materials.wood);
      const logs = [-1.7, 1.7].map((lateral, logIndex) => cylinder(`heavy-lift-log-${logIndex}`, 0.62 + logIndex * 0.18, 5.6, { x: point.x + px * lateral, y: baseY + 1.05, z: point.z + pz * lateral }, materials.darkWood, { rotationZ: Math.PI / 2, rotationY: yaw, segments: 12 }));
      for (const lateral of [-3.8, 3.8]) box(`lift-log-frame-post-${lateral}`, [0.5, 4.2, 0.5], { x: point.x + px * lateral, y: baseY + 2.1, z: point.z + pz * lateral }, materials.darkWood);
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-lift`, label: "大きな丸太を持ち上げる", point: { ...point }, radius: 4, areaId: attraction.areaId,
        activate() {
          representation.liftedAt = performance.now();
          handle.notify?.("💪 丸太を持ち上げた！左右で重さが違う");
          playTone(240, 0.25, "triangle");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const progress = representation.liftedAt ? clamp((now - representation.liftedAt) / 1_200, 0, 1) : 0;
        logs.forEach((log, logIndex) => { log.position.y = baseY + 1.05 + Math.sin(progress * Math.PI) * (1.4 - logIndex * 0.25); });
      });
      stand.userData.officialInteractive = true;
      representation.detailProfile = "two-different-weight-heavy-logs-in-wood-rail-frame";
      return true;
    }
    if (template === "irregular-rings") {
      for (let ringIndex = 0; ringIndex < 8; ringIndex += 1) {
        const location = at(0.08 + ringIndex * 0.12, ringIndex % 2 ? 0.42 : -0.42, 3.4 + Math.sin(ringIndex) * 0.28);
        const ring = torus(`dark-irregular-ring-${ringIndex}`, 0.72 + ringIndex % 3 * 0.16, 0.16, location, materials.darkWood, { rotationY: yaw + Math.PI / 2, segments: 6 + ringIndex % 3 * 2 });
        beam(`irregular-ring-rope-${ringIndex}`, location, { ...location, y: location.y + 2.8 }, 0.06, materials.black);
        addAnimation((seconds) => { ring.rotation.z = Math.sin(seconds * (0.8 + ringIndex * 0.03) + ringIndex) * 0.28; });
      }
      representation.detailProfile = "dark-irregular-handle-rings";
      return true;
    }
    if (template === "flying-log") {
      const start = at(0.12, 0, 1.2);
      const end = at(0.92, 0, 1.2);
      const logGroup = new constructors.Group();
      logGroup.name = `Greenia:${attraction.officialId}-flying-log-group`;
      logGroup.position.set(start.x, start.y, start.z);
      logGroup.rotation.y = yaw;
      root.add(logGroup);
      cylinder("flying-horizontal-log", 0.58, 5.2, { x: 0, y: 0, z: 0 }, materials.wood, { rotationZ: Math.PI / 2, segments: 12, parent: logGroup });
      const cableFrom = { ...start, y: start.y + 4.7 };
      const cableTo = { ...end, y: end.y + 4.1 };
      beam("flying-log-overhead-line", cableFrom, cableTo, 0.1, materials.steel);
      for (const lateral of [-2.15, 2.15]) beam(`flying-log-hanger-${lateral}`, { x: lateral, y: 0, z: 0 }, { x: lateral * 0.18, y: 4.7, z: 0 }, 0.07, whiteRope, { parent: logGroup });
      rideInteraction("flying-log", "空飛ぶ丸太ブランコに乗る", { ...start, y: start.y + PLAYER_FOOT_OFFSET }, { ...end, y: end.y + PLAYER_FOOT_OFFSET }, 3_500, logGroup, -PLAYER_FOOT_OFFSET + 0.1);
      representation.detailProfile = "single-horizontal-log-slider-swing-with-coupled-hangers";
      return true;
    }
    if (template === "resistance-bell") {
      const beltStart = at(0.14, 0, 1.2);
      const beltEnd = at(0.88, 0, 1.2);
      const belt = beam("bell-resistance-belt", beltStart, beltEnd, 0.16, materials.black);
      const beltBaseScaleY = belt.scale.y;
      for (const lateral of [-2.6, 2.6]) beam(`bell-frame-${lateral}`, at(0.08, lateral, 0), at(0.08, lateral, 5.6), 0.24, materials.darkWood);
      const bell = cylinder("metal-bell", 0.95, 1.15, { ...beltEnd, y: beltEnd.y + 3.2 }, materials.yellow, { segments: 16 });
      box("bell-clapper", [0.28, 1.7, 0.28], { ...beltEnd, y: beltEnd.y + 2.25 }, materials.steel);
      representation.interactive = true;
      representation.bellPulls = 0;
      representation.beltStretch = 0;
      representation.beltPullAt = 0;
      representation.bellRingAt = 0;
      registerInteraction({
        id: `official-${attraction.officialId}-resist`, label: "E連打で抵抗ベルトを引く", point: beltStart, radius: 4.2, areaId: attraction.areaId,
        activate() {
          representation.bellPulls = Math.min(5, representation.bellPulls + 1);
          representation.beltStretch = representation.bellPulls;
          representation.beltPullAt = performance.now();
          if (representation.bellPulls >= 5) {
            representation.bellRingAt = performance.now();
            handle.notify?.("🔔 抵抗ベルトを突破！鐘が鳴った！");
            playTone(880, 0.45, "sine");
            representation.bellPulls = 0;
            beginLocalRide(
              `official-${attraction.officialId}-resistance-run`,
              attraction.areaId,
              { ...beltStart, y: beltStart.y + PLAYER_FOOT_OFFSET },
              { ...beltEnd, y: beltEnd.y + PLAYER_FOOT_OFFSET },
              1_800,
              null,
              attraction.name,
              attraction.number - 1,
              1.2,
              0.04,
            );
          } else {
            handle.notify?.(`💪 抵抗ベルト ${representation.bellPulls}/5`);
            playTone(210 + representation.bellPulls * 35, 0.08, "triangle");
          }
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        const pullElapsed = representation.beltPullAt ? now - representation.beltPullAt : Number.POSITIVE_INFINITY;
        const pullDecay = clamp(1 - pullElapsed / 950, 0, 1);
        const elasticPulse = pullDecay * Math.sin(clamp(pullElapsed / 950, 0, 1) * Math.PI * 5) * 0.018;
        belt.scale.y = beltBaseScaleY * (1 + representation.beltStretch * pullDecay * 0.036 + elasticPulse);
        const ringElapsed = representation.bellRingAt ? now - representation.bellRingAt : Number.POSITIVE_INFINITY;
        if (ringElapsed < 1_450) {
          const ringProgress = ringElapsed / 1_450;
          bell.rotation.z = Math.sin(ringProgress * Math.PI * 10) * (1 - ringProgress) * 0.48;
        } else if (pullElapsed < 320) {
          bell.rotation.z = Math.sin(pullElapsed / 320 * Math.PI) * (representation.beltStretch % 2 ? 0.13 : -0.13);
        } else {
          bell.rotation.z = lerp(bell.rotation.z, 0, 0.16);
        }
      });
      representation.detailProfile = "five-pull-visibly-deforming-black-resistance-belt-to-animated-metal-bell";
      return true;
    }
    return false;
  }

  function buildOfficialModule(attraction, previous, point, index) {
    const template = inferOfficialTemplate(attraction);
    const representation = {
      ...attraction,
      template,
      x: point.x,
      y: point.y,
      z: point.z,
      courseNumber: point.courseNumber ?? null,
      meshCount: 0,
      playable: true,
    };
    officialRepresentations.push(representation);
    const { primary, secondary, palette } = officialPalette(attraction.areaId, index);
    const dx = point.x - (previous?.x ?? point.x - 7);
    const dz = point.z - (previous?.z ?? point.z);
    const length = Math.max(1, Math.hypot(dx, dz));
    const ux = dx / length;
    const uz = dz / length;
    const px = -uz;
    const pz = ux;
    const yaw = Math.atan2(dx, dz);
    const baseY = point.surfaceY;
    const fromY = previous?.surfaceY ?? baseY;
    const at = (amount, lateral = 0, extraY = 0) => ({
      x: (previous?.x ?? point.x - ux * 7) + dx * amount + px * lateral,
      y: lerp(fromY, baseY, amount) + extraY,
      z: (previous?.z ?? point.z - uz * 7) + dz * amount + pz * lateral,
    });
    const box = (suffix, size, position, material = primary, options = {}) => tagOfficialMesh(addBox(`${attraction.officialId}-${suffix}`, "official-attraction", size, [position.x, position.y, position.z], material, options), representation);
    const playable = (suffix, size, position, material = primary, options = {}) => tagOfficialMesh(addPlayableBox(`${attraction.officialId}-${suffix}`, "official-attraction", size, [position.x, position.y, position.z], material, { areaId: attraction.areaId, ...options }), representation);
    const beam = (suffix, from, to, radius = 0.1, material = materials.rope, options = {}) => tagOfficialMesh(addBeamBetween(`${attraction.officialId}-${suffix}`, "official-attraction", [from.x, from.y, from.z], [to.x, to.y, to.z], radius, material, options), representation);
    const cylinder = (suffix, radius, height, position, material = primary, options = {}) => tagOfficialMesh(addCylinder(`${attraction.officialId}-${suffix}`, "official-attraction", radius, height, [position.x, position.y, position.z], material, options), representation);
    const sphere = (suffix, radius, position, material = primary, options = {}) => tagOfficialMesh(addSphere(`${attraction.officialId}-${suffix}`, "official-attraction", radius, [position.x, position.y, position.z], material, options), representation);
    const torus = (suffix, radius, tube, position, material = primary, options = {}) => tagOfficialMesh(addTorus(`${attraction.officialId}-${suffix}`, "official-attraction", radius, tube, [position.x, position.y, position.z], material, options), representation);
    const photoMatchedTemplates = [
      "castle-net-gate", "small-flag-fort", "castle-slope", "dual-bouldering-wall", "traverse-castle-wall",
      "progressive-rope-weights", "magic-ball-maze", "jump-touch-panels", "punch-sandbag", "gong-log-finale",
      "mini-hydraulic-excavator", "polygon-antlion-bowl", "dense-pole-climb", "brick-heist-wall", "cooperative-sail-hoist",
      "two-storey-treehouse", "sky-spiral-stairs", "three-swords", "rope-labyrinth", "thunder-wire", "fortune-basketball",
      "wall-kick-corridor", "triangle-net-tunnel", "mini-bouldering-wall", "tightrope",
      "wave-balance", "ladder-hammer", "ring-toss", "suspended-ox-crossing", "static-shape-steps",
      "long-monkey-bars", "multiple-seesaws", "hanging-board", "three-walls", "rotating-barrels", "jump-net",
      "frisbee-shooter", "log-wall-traverse", "cup-drop-tower", "parallel-wall-bridge",
      "fishing-lift", "ball-maze", "bank-bowling", "dragon",
      "hill-logs", "zigzag-logs", "net-wall", "pull-raft", "log-swings", "suspension-bridge", "three-second-wall",
      "sinking-raft", "web-hill", "overhang-wall", "long-log-raft", "water-slide", "suspended-log-disks", "rope-jungle",
      "cling-log-wall", "barrel-boat", "water-dash", "super-jump-lanes", "steep-rope-ramp", "spiral-stairs", "rotating-balls",
      "rope-forest", "hanging-stilts", "hanging-stairs", "hanging-platforms", "climbing-fort", "rotating-handles",
      "swinging-log-bridge", "finger-ledge", "lift-logs", "irregular-rings", "flying-log", "resistance-bell",
    ];
    const hasPhotoMatchedTraversal = photoMatchedTemplates.includes(template);

    const deckSize = attraction.areaId === "mecya-forest" ? 5.4 : attraction.areaId === "wonder-amembo" ? 4.2 : 4.8;
    playable("checkpoint-deck", [deckSize, 0.34, deckSize], { x: point.x, y: baseY - 0.17, z: point.z }, attraction.areaId === "mecya-forest" ? materials.wood : secondary);
    if (attraction.areaId === "mecya-forest") {
      cylinder("tree-support", 0.7, Math.max(1, baseY), { x: point.x, y: baseY / 2, z: point.z }, materials.darkWood, { segments: 9, solid: true, blocker: false });
    }

    if (previous && attraction.areaId === "mecya-forest" && template !== "zip") {
      for (let supportIndex = 0; supportIndex <= 16; supportIndex += 1) {
        const amount = 0.04 + supportIndex * 0.06;
        const location = at(amount, 0, 0.12);
        addSurface(
          `${attraction.officialId}-precision-traversal-${supportIndex}`,
          location.x,
          location.z,
          1.35,
          1.35,
          location.y,
          { areaId: attraction.areaId },
        );
      }
    } else if (previous && attraction.areaId !== "mecya-forest" && !hasPhotoMatchedTraversal) {
      const steps = attraction.areaId === "mecya-forest" ? 5 : 4;
      for (let step = 1; step <= steps; step += 1) {
        const amount = step / (steps + 1);
        const location = at(amount, Math.sin((step + index) * 1.7) * (template === "bridge" ? 0.8 : 0.35));
        const entry = playable(`path-${step}`, [attraction.areaId === "wonder-amembo" ? 2.3 : 2.8, 0.28, attraction.areaId === "mecya-forest" ? 2.1 : 2.6], { x: location.x, y: location.y - 0.14, z: location.z }, palette[(step + index) % palette.length], { dynamic: /揺|ぐらぐら|浮|吊/.test(attraction.name) });
        if (/揺|ぐらぐら|浮|吊/.test(attraction.name)) {
          const originY = entry.mesh.position.y;
          addAnimation((seconds) => {
            entry.surface.previousY = entry.surface.y;
            entry.mesh.position.y = originY + Math.sin(seconds * 1.25 + index + step) * 0.11;
            entry.mesh.rotation.z = Math.sin(seconds * 1.1 + index + step) * 0.055;
            entry.surface.y = entry.mesh.position.y + 0.14;
          });
        }
      }
      if (template === "bridge") {
        beam("handline-left", at(0.08, -1.7, 1.5), at(0.92, -1.7, 1.5), 0.07, materials.rope);
        beam("handline-right", at(0.08, 1.7, 1.5), at(0.92, 1.7, 1.5), 0.07, materials.rope);
      }
    }
    if (previous && attraction.areaId === "mecya-forest" && template !== "zip") {
      beam("forest-green-lifeline", at(0.03, -2.35, 2.35), at(0.99, -2.35, 2.35), 0.075, materials.teal);
      beam("forest-grey-belay-cable", at(0.03, 2.35, 2.55), at(0.99, 2.35, 2.55), 0.055, materials.steel);
      for (let safetyStay = 0; safetyStay <= 8; safetyStay += 1) {
        const amount = 0.03 + safetyStay * 0.12;
        beam(`forest-safety-stay-${safetyStay}`, at(amount, -1.75, 0.15), at(amount, -2.35, 2.35), 0.035, materials.white);
      }
    }

    const anchor = at(0.72, 0, 0);
    if (template.startsWith("forest-")) {
      buildForestOfficialDetail({
        attraction, template, representation, index, at, point, baseY, yaw, px, pz, ux, uz,
        primary, secondary, palette, box, playable, beam, cylinder, sphere, torus,
      });
    } else if (buildMatchedOfficialDetail({
      attraction, template, representation, index, previous, at, point, baseY, yaw, px, pz, ux, uz, length,
      primary, secondary, palette, box, playable, beam, cylinder, sphere, torus,
    })) {
      // Dedicated official-photo-matched module built above.
    } else if (template === "spider-walk") {
      const transparent = materials.foam;
      for (const lateral of [-1.55, 1.55]) {
        box(`transparent-wall-${lateral}`, [0.18, 4.2, Math.max(8, length * 0.74)], at(0.55, lateral, 2.1), transparent, { rotationY: yaw, castShadow: false });
        for (let brace = 0; brace < 5; brace += 1) beam(`wall-brace-${lateral}-${brace}`, at(0.22 + brace * 0.16, lateral, 0.15), at(0.22 + brace * 0.16, lateral, 4.1), 0.055, materials.steel);
      }
      tagOfficialMesh(addRamp(`${attraction.officialId}-wall-channel`, "official-attraction", [at(0.18).x, baseY + 0.08, at(0.18).z], [at(0.9).x, baseY + 0.08, at(0.9).z], 0.72, materials.white, { areaId: attraction.areaId }), representation);
    } else if (template === "single-log") {
      beam("single-suspended-log", at(0.14, 0, 0.62), at(0.91, 0, 0.62), 0.42, materials.wood, { segments: 12 });
      tagOfficialMesh(addRamp(`${attraction.officialId}-log-surface`, "official-attraction", [at(0.14).x, baseY + 0.84, at(0.14).z], [at(0.91).x, baseY + 0.84, at(0.91).z], 0.82, materials.lightWood, { areaId: attraction.areaId }), representation);
      for (let hanger = 0; hanger < 5; hanger += 1) {
        const location = at(0.18 + hanger * 0.17, 0, 0.9);
        beam(`single-log-hanger-${hanger}`, location, { ...location, y: location.y + 4.4 }, 0.065, materials.white);
      }
    } else if (template === "hammock-wall") {
      for (let row = 0; row < 6; row += 1) beam(`hammock-row-${row}`, at(0.18, 0, 0.6 + row * 0.62), at(0.9, 0, 0.6 + row * 0.62), 0.075, materials.white);
      for (let column = 0; column < 9; column += 1) {
        const lateralWave = Math.sin(column * 1.4) * 0.55;
        beam(`hammock-column-${column}`, at(0.2 + column * 0.085, lateralWave, 0.5), at(0.2 + column * 0.085, lateralWave, 4.2), 0.075, materials.white);
      }
      for (const hole of [0.38, 0.7]) torus(`hammock-hole-${hole}`, 1.05, 0.12, at(hole, -0.12, 2.25), secondary, { rotationY: yaw + Math.PI / 2, segments: 18 });
    } else if (template === "ninja-platforms") {
      beam("ninja-center-rope", at(0.12, 0, 1.2), at(0.92, 0, 1.2), 0.1, materials.white);
      for (let platformIndex = 0; platformIndex < 6; platformIndex += 1) {
        const location = at(0.18 + platformIndex * 0.13, platformIndex % 2 ? 0.8 : -0.8, 0.38);
        const platform = playable(`ninja-platform-${platformIndex}`, [2.1, 0.28, 2.1], { x: location.x, y: location.y - 0.14, z: location.z }, platformIndex % 2 ? primary : secondary, { dynamic: true });
        beam(`ninja-platform-rope-${platformIndex}`, location, { ...location, y: location.y + 4.2 }, 0.065, materials.white);
        const originY = platform.mesh.position.y;
        addAnimation((seconds) => {
          platform.surface.previousY = platform.surface.y;
          platform.mesh.position.y = originY + Math.sin(seconds * 1.3 + platformIndex) * 0.13;
          platform.mesh.rotation.z = Math.sin(seconds * 1.1 + platformIndex) * 0.08;
          platform.surface.y = platform.mesh.position.y + 0.14;
        });
      }
    } else if (template === "forked-logs") {
      for (const lane of [-2.2, 0, 2.2]) {
        beam(`fork-log-${lane}`, at(0.16, lane, 0.42), at(0.9, lane * 0.5, 0.42), 0.34, lane === 0 ? materials.lightWood : materials.wood, { segments: 12 });
        tagOfficialMesh(addRamp(`${attraction.officialId}-fork-surface-${lane}`, "official-attraction", [at(0.16, lane).x, baseY + 0.62, at(0.16, lane).z], [at(0.9, lane * 0.5).x, baseY + 0.62, at(0.9, lane * 0.5).z], 0.66, materials.lightWood, { areaId: attraction.areaId }), representation);
      }
    } else if (template === "floating-islands") {
      for (let islandIndex = 0; islandIndex < 6; islandIndex += 1) {
        const location = at(0.17 + islandIndex * 0.135, islandIndex % 2 ? 0.85 : -0.85, 0);
        const island = playable(`floating-island-${islandIndex}`, [2.8, 0.5, 2.8], { x: location.x, y: location.y - 0.25, z: location.z }, materials.lime, { dynamic: true });
        const originY = island.mesh.position.y;
        addAnimation((seconds) => {
          island.surface.previousX = island.surface.x;
          island.surface.previousY = island.surface.y;
          island.mesh.position.y = originY + Math.sin(seconds * 1.45 + islandIndex) * 0.18;
          island.mesh.position.x = location.x + Math.sin(seconds * 0.8 + islandIndex) * 0.2;
          island.mesh.rotation.z = Math.sin(seconds * 1.05 + islandIndex) * 0.08;
          island.surface.x = island.mesh.position.x;
          island.surface.y = island.mesh.position.y + 0.25;
        });
      }
      beam("island-pull-rope", at(0.15, 2.3, 1), at(0.92, 2.3, 1), 0.08, materials.white);
    } else if (template === "ball-slider") {
      let rideBall = null;
      let rideCableFrom = null;
      let rideCableTo = null;
      for (const lane of [-1.6, 1.6]) {
        const cableFrom = at(0.12, lane, 5.2);
        const cableTo = at(0.92, lane, 2.1);
        beam(`ball-slider-cable-${lane}`, cableFrom, cableTo, 0.1, materials.steel);
        const ball = sphere(`ball-slider-ball-${lane}`, 1.05, { ...cableFrom, y: cableFrom.y - 1.35 }, lane < 0 ? materials.yellow : materials.orange, { scaleY: 1.15, segments: 12 });
        if (lane < 0) {
          rideBall = ball;
          rideCableFrom = cableFrom;
          rideCableTo = cableTo;
        }
        beam(`ball-slider-hanger-${lane}`, cableFrom, { ...cableFrom, y: cableFrom.y - 1.35 }, 0.08, materials.white);
        addAnimation((seconds) => {
          if (lane < 0 && gameplay.ride?.id === `official-${attraction.officialId}-ball-slider`) return;
          const amount = (Math.sin(seconds * 0.65 + lane + index) + 1) / 2;
          ball.position.set(lerp(cableFrom.x, cableTo.x, amount), lerp(cableFrom.y, cableTo.y, amount) - 1.35, lerp(cableFrom.z, cableTo.z, amount));
        });
      }
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-ball-slider`, label: `${attraction.name}につかまる`, point: { ...rideCableFrom, y: rideCableFrom.y - 1.35 }, radius: 4.2, areaId: attraction.areaId,
        activate: () => beginLocalRide(`official-${attraction.officialId}-ball-slider`, attraction.areaId, { ...rideCableFrom, y: rideCableFrom.y - 1.35 }, { ...rideCableTo, y: rideCableTo.y - 1.35 }, 3_200, rideBall, attraction.name, attraction.number - 1, 0, 1.05),
      });
    } else if (template === "sumo-island") {
      cylinder("sumo-stage", 3, 0.45, { x: anchor.x, y: baseY + 0.22, z: anchor.z }, materials.orange, { segments: 28 });
      torus("sumo-ring", 2.65, 0.16, { x: anchor.x, y: baseY + 0.52, z: anchor.z }, materials.white, { rotationX: Math.PI / 2, segments: 28 });
      addSurface(`${attraction.officialId}-sumo-surface`, anchor.x, anchor.z, 5.7, 5.7, baseY + 0.48, { areaId: attraction.areaId });
      const sumoBodies = [];
      for (const side of [-1, 1]) {
        sphere(`sumo-player-${side}-head`, 0.38, { x: anchor.x + px * side, y: baseY + 2.25, z: anchor.z + pz * side }, side < 0 ? materials.coral : materials.teal, { segments: 9 });
        sumoBodies.push(box(`sumo-player-${side}-body`, [0.85, 1.2, 0.55], { x: anchor.x + px * side, y: baseY + 1.28, z: anchor.z + pz * side }, side < 0 ? materials.coral : materials.teal));
      }
      const opponentOrigin = { x: sumoBodies[1].position.x, y: sumoBodies[1].position.y, z: sumoBodies[1].position.z };
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-sumo`, label: "手押しどすこい：E連打で押す", point: { x: anchor.x, y: point.y, z: anchor.z }, radius: 4.2, areaId: attraction.areaId,
        activate() {
          representation.sumoPushes = (representation.sumoPushes || 0) + 1;
          sumoBodies[1].position.x += px * 0.28;
          sumoBodies[1].position.z += pz * 0.28;
          if (representation.sumoPushes >= 5) {
            handle.notify?.("💥 どすこい勝利！相手を浮島の外へ押し出した");
            playTone(700, 0.22, "triangle");
            representation.sumoPushes = 0;
            sumoBodies[1].position.set(opponentOrigin.x, opponentOrigin.y, opponentOrigin.z);
          } else {
            handle.notify?.(`どすこい！ ${representation.sumoPushes}/5`);
            playTone(240 + representation.sumoPushes * 45, 0.07, "square");
          }
          return true;
        },
      });
    } else if (template === "sloth-log") {
      beam("sloth-log", at(0.14, 0, 4.2), at(0.92, 0, 4.2), 0.52, materials.wood, { segments: 12 });
      for (let hold = 0; hold < 7; hold += 1) {
        const location = at(0.19 + hold * 0.11, 0, 3.2 + (hold % 2) * 0.3);
        sphere(`sloth-hold-${hold}`, 0.34, location, hold % 2 ? primary : secondary, { scaleY: 1.5, segments: 9 });
        beam(`sloth-hold-rope-${hold}`, location, { ...location, y: location.y + 1.05 }, 0.055, materials.white);
      }
    } else if (template === "tightrope") {
      beam("tightrope-foot", at(0.12, 0, 0.48), at(0.92, 0, 0.48), 0.11, materials.coral);
      for (const lateral of [-2.3, 2.3]) beam(`tightrope-hand-${lateral}`, at(0.12, lateral, 1.9), at(0.92, lateral * 0.55, 1.9), 0.08, materials.white);
      const balance = beam("tightrope-balance-bar", at(0.42, -2.8, 2.4), at(0.42, 2.8, 2.4), 0.09, materials.white);
      addAnimation((seconds) => { balance.rotation.z = Math.sin(seconds * 0.9 + index) * 0.16; });
    } else if (template === "net-swings") {
      for (let swingIndex = 0; swingIndex < 4; swingIndex += 1) {
        const location = at(0.24 + swingIndex * 0.19, 0, 1.8);
        const frame = torus(`net-swing-frame-${swingIndex}`, 1.45, 0.12, location, materials.white, { rotationY: yaw + Math.PI / 2, segments: 4 });
        frame.scale.y *= 0.9;
        for (const lateral of [-0.75, 0, 0.75]) beam(`net-swing-grid-${swingIndex}-${lateral}`, { x: location.x + px * lateral, y: location.y - 1.1, z: location.z + pz * lateral }, { x: location.x + px * lateral, y: location.y + 1.1, z: location.z + pz * lateral }, 0.045, materials.white);
        beam(`net-swing-hanger-${swingIndex}`, { ...location, y: location.y + 1.4 }, { ...location, y: location.y + 4.4 }, 0.07, materials.white);
        addAnimation((seconds) => { frame.rotation.z = Math.sin(seconds * 1.05 + swingIndex) * 0.15; });
      }
    } else if (template === "square-frames") {
      for (let frameIndex = 0; frameIndex < 7; frameIndex += 1) {
        const location = at(0.16 + frameIndex * 0.12, 0, 1.45);
        const frame = torus(`square-frame-${frameIndex}`, 1.25, 0.14, location, materials.wood, { rotationY: yaw + Math.PI / 2, segments: 4 });
        frame.scale.y *= 0.684;
        beam(`square-frame-rope-${frameIndex}`, { ...location, y: location.y - 0.8 }, { ...location, y: location.y + 3.8 }, 0.045, materials.white);
      }
    } else if (template === "tarzan-rope") {
      beam("tarzan-top", at(0.1, 0, 5.5), at(0.92, 0, 5.5), 0.2, materials.darkWood);
      const rope = beam("tarzan-rope", at(0.52, 0, 5.5), at(0.52, 0, 0.8), 0.1, materials.white);
      const seat = cylinder("tarzan-seat", 0.55, 1.6, at(0.52, 0, 0.65), primary, { rotationZ: Math.PI / 2, segments: 12 });
      addAnimation((seconds) => {
        if (gameplay.ride?.id === `official-${attraction.officialId}-tarzan`) return;
        const swing = Math.sin(seconds * 0.9 + index) * 2.2;
        rope.rotation.z = swing * 0.08;
        seat.position.x = at(0.52, swing).x;
        seat.position.z = at(0.52, swing).z;
      });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-tarzan`, label: `${attraction.name}：ロープをつかむ`, point: at(0.15, 0, 1.2), radius: 4.2, areaId: attraction.areaId,
        activate: () => beginLocalRide(`official-${attraction.officialId}-tarzan`, attraction.areaId, at(0.15, 0, 1.2), at(0.9, 0, 1.2), 2_900, seat, attraction.name, attraction.number - 1, -PLAYER_FOOT_OFFSET, 2.1),
      });
    } else if (template === "grip-balls") {
      for (let grip = 0; grip < 7; grip += 1) {
        const location = at(0.18 + grip * 0.115, 0, 3.6 + Math.sin(grip) * 0.28);
        sphere(`grip-ball-${grip}`, 0.48, location, grip % 2 ? materials.orange : materials.yellow, { segments: 12 });
        beam(`grip-rope-${grip}`, location, { ...location, y: location.y + 2.5 }, 0.06, materials.white);
      }
    } else if (template === "rugged-wall") {
      box("rugged-wall", [1.1, 6.2, 9], { x: anchor.x, y: baseY + 3.1, z: anchor.z }, materials.darkWood, { rotationY: yaw });
      for (let bump = 0; bump < 12; bump += 1) box(`rugged-bump-${bump}`, [0.65 + bump % 3 * 0.25, 0.65 + bump % 2 * 0.3, 1.2], { x: anchor.x - ux * 0.75 + px * ((bump % 4) - 1.5) * 1.5, y: baseY + 0.8 + Math.floor(bump / 4) * 1.55, z: anchor.z - uz * 0.75 + pz * ((bump % 4) - 1.5) * 1.5 }, bump % 2 ? materials.wood : materials.lightWood, { rotationY: yaw });
      tagOfficialMesh(addRamp(`${attraction.officialId}-rugged-ramp`, "official-attraction", [at(0.25).x, baseY, at(0.25).z], [anchor.x, baseY + 6.1, anchor.z], 3.4, materials.wood, { areaId: attraction.areaId }), representation);
    } else if (template === "rescue-ropes") {
      for (const height of [1.15, 2.55]) for (const lateral of [-0.7, 0.7]) beam(`rescue-rope-${height}-${lateral}`, at(0.12, lateral, height), at(0.92, lateral, height), 0.1, materials.white);
      for (const amount of [0.1, 0.94]) for (const lateral of [-2.2, 2.2]) beam(`rescue-frame-${amount}-${lateral}`, at(amount, lateral, 0), at(amount, lateral, 5), 0.22, materials.darkWood);
    } else if (template === "angled-pipe") {
      beam("angled-pipe", at(0.14, 0, 1.2), at(0.92, 0, 4.8), 0.24, materials.steel, { segments: 12 });
      for (let grip = 0; grip < 6; grip += 1) torus(`pipe-grip-${grip}`, 0.48, 0.1, at(0.18 + grip * 0.135, 0, 1.3 + grip * 0.55), primary, { rotationY: yaw + Math.PI / 2, segments: 14 });
    } else if (template === "monkey-bars") {
      for (const lateral of [-2.5, 2.5]) beam(`monkey-side-${lateral}`, at(0.2, lateral, 0.2), at(0.88, lateral, 4.2), 0.18, materials.darkWood);
      for (let rung = 0; rung < 7; rung += 1) beam(`monkey-rung-${rung}`, at(0.22 + rung * 0.1, -2.5, 4.2), at(0.22 + rung * 0.1, 2.5, 4.2), 0.12, secondary);
    } else if (template === "seesaw") {
      const plank = playable("seesaw-plank", [8.5, 0.34, 2.2], { x: anchor.x, y: baseY + 0.72, z: anchor.z }, primary, { dynamic: true });
      cylinder("seesaw-pivot", 0.55, 2.4, { x: anchor.x, y: baseY + 0.5, z: anchor.z }, materials.steel, { rotationZ: Math.PI / 2 });
      addAnimation((seconds) => { plank.mesh.rotation.z = Math.sin(seconds * 1.3 + index) * 0.21; });
    } else if (template === "rings") {
      for (let ringIndex = 0; ringIndex < 6; ringIndex += 1) {
        const location = at(0.2 + ringIndex * 0.13, 0, 3.2 + Math.sin(ringIndex) * 0.35);
        const ring = torus(`ring-${ringIndex}`, 0.78, 0.15, location, palette[(ringIndex + index) % palette.length], { rotationY: yaw + Math.PI / 2, segments: 16 });
        beam(`ring-rope-${ringIndex}`, location, { ...location, y: location.y + 3.1 }, 0.065, materials.rope);
        addAnimation((seconds) => { ring.rotation.z = Math.sin(seconds * 1.15 + ringIndex + index) * 0.22; });
      }
    } else if (template === "net") {
      for (let row = 0; row < 5; row += 1) beam(`net-row-${row}`, at(0.18, 0, 0.8 + row * 0.82), at(0.88, 0, 0.8 + row * 0.82), 0.055, materials.rope);
      for (let column = 0; column < 7; column += 1) beam(`net-column-${column}`, at(0.2 + column * 0.11, 0, 0.7), at(0.2 + column * 0.11, 0, 4.2), 0.055, materials.rope);
      if (attraction.name.includes("スパイダー") || attraction.name.includes("クモ")) {
        const center = at(0.55, 0, 2.45);
        for (let spoke = 0; spoke < 8; spoke += 1) {
          const angle = spoke / 8 * Math.PI * 2;
          beam(`web-spoke-${spoke}`, center, { x: center.x + Math.cos(angle) * 3, y: center.y + Math.sin(angle) * 2.2, z: center.z }, 0.05, materials.white);
        }
      }
    } else if (template === "tunnel") {
      for (let hoop = 0; hoop < 7; hoop += 1) torus(`tunnel-hoop-${hoop}`, 1.65, 0.11, at(0.18 + hoop * 0.115, 0, 1.65), secondary, { rotationY: yaw + Math.PI / 2, segments: attraction.name.includes("三角") ? 3 : 16 });
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) beam(`tunnel-line-${angle}`, at(0.15, Math.cos(angle) * 1.65, 1.65 + Math.sin(angle) * 1.65), at(0.9, Math.cos(angle) * 1.65, 1.65 + Math.sin(angle) * 1.65), 0.055, materials.rope);
    } else if (template === "stairs") {
      for (let step = 0; step < 7; step += 1) playable(`stair-${step}`, [3.2, 0.34, 1.6], { ...at(0.22 + step * 0.095, 0, step * 0.48), y: baseY + step * 0.48 - 0.17 }, step % 2 ? primary : secondary);
      if (attraction.name.includes("らせん")) for (let rail = 0; rail < 12; rail += 1) {
        const angle = rail * 0.72;
        playable(`spiral-${rail}`, [2.1, 0.24, 1.1], { x: point.x + Math.cos(angle) * 3, y: baseY + rail * 0.34, z: point.z + Math.sin(angle) * 3 }, rail % 2 ? primary : secondary);
      }
    } else if (template === "fort") {
      for (const lateral of [-3.4, 3.4]) for (const along of [-3.4, 3.4]) box(`fort-post-${lateral}-${along}`, [0.55, 6.8, 0.55], { x: point.x + lateral, y: baseY + 3.4, z: point.z + along }, materials.darkWood, { solid: true });
      playable("fort-deck", [8, 0.45, 8], { x: point.x, y: baseY + 4.1, z: point.z }, materials.lightWood);
      if (/城門|砦/.test(attraction.name)) {
        for (const lateral of [-3.2, 3.2]) box(`fort-tower-${lateral}`, [2.3, 4.2, 2.3], { x: point.x + lateral, y: baseY + 6.3, z: point.z }, materials.stone);
      } else {
        const roof = tagOfficialMesh(addCone(`${attraction.officialId}-roof`, "official-attraction", 5.2, 3.2, [point.x, baseY + 7.1, point.z], primary, { segments: 4, rotationY: Math.PI / 4 }), representation);
        roof.userData.officialAttractionId = attraction.officialId;
      }
    } else if (template === "wall") {
      const wallHeight = attraction.name.includes("そりたつ") ? 8.8 : attraction.name.includes("絶壁") ? 6.8 : 4.8;
      box("wall", [1, wallHeight, 8.5], { x: anchor.x, y: baseY + wallHeight / 2, z: anchor.z }, attraction.name.includes("透明") ? materials.foam : materials.camo, { rotationY: yaw });
      for (let hold = 0; hold < 12; hold += 1) sphere(`hold-${hold}`, 0.22 + hold % 3 * 0.05, { x: anchor.x + px * ((hold % 4) - 1.5) * 1.3 - ux * 0.58, y: baseY + 0.75 + Math.floor(hold / 4) * 1.15, z: anchor.z + pz * ((hold % 4) - 1.5) * 1.3 - uz * 0.58 }, palette[hold % palette.length], { scaleZ: 0.45 });
      tagOfficialMesh(addRamp(`${attraction.officialId}-wall-ramp`, "official-attraction", [anchor.x - ux * 5, baseY, anchor.z - uz * 5], [anchor.x, baseY + wallHeight, anchor.z], 3.2, primary, { areaId: attraction.areaId }), representation);
    } else if (template === "slide" || template === "slope" || template === "jump") {
      const top = at(0.36, 0, template === "jump" ? 3.2 : 4.4);
      const bottom = at(0.86, 0, 0.1);
      tagOfficialMesh(addRamp(`${attraction.officialId}-slope`, "official-attraction", [top.x, top.y, top.z], [bottom.x, bottom.y, bottom.z], template === "slide" ? 3.8 : 3, primary, { areaId: attraction.areaId }), representation);
      for (let edge = -1; edge <= 1; edge += 2) beam(`slope-rail-${edge}`, { ...top, x: top.x + px * edge * 2, z: top.z + pz * edge * 2, y: top.y + 0.5 }, { ...bottom, x: bottom.x + px * edge * 2, z: bottom.z + pz * edge * 2, y: bottom.y + 0.5 }, 0.08, materials.steel);
    } else if (template === "logs" || template === "swing") {
      for (let logIndex = 0; logIndex < 5; logIndex += 1) {
        const location = at(0.2 + logIndex * 0.15, 0, 0.8 + (template === "swing" ? Math.sin(logIndex) * 0.4 : 0));
        const log = cylinder(`log-${logIndex}`, 0.58, 4.8, location, logIndex % 2 ? materials.wood : materials.lightWood, { rotationZ: Math.PI / 2, rotationY: yaw });
        if (template === "swing") {
          beam(`log-hanger-a-${logIndex}`, { x: location.x + px * 2, y: location.y, z: location.z + pz * 2 }, { x: location.x + px * 2, y: location.y + 4.2, z: location.z + pz * 2 }, 0.06, materials.rope);
          beam(`log-hanger-b-${logIndex}`, { x: location.x - px * 2, y: location.y, z: location.z - pz * 2 }, { x: location.x - px * 2, y: location.y + 4.2, z: location.z - pz * 2 }, 0.06, materials.rope);
          addAnimation((seconds) => { log.rotation.x = Math.sin(seconds * 0.85 + logIndex + index) * 0.24; });
        }
      }
    } else if (template === "labyrinth") {
      for (let pole = 0; pole < 14; pole += 1) {
        const location = at(0.2 + (pole % 7) * 0.1, (Math.floor(pole / 7) - 0.5) * 4 + Math.sin(pole) * 0.5, 2.2);
        cylinder(`maze-pole-${pole}`, 0.16, 4.4 + pole % 3, location, palette[pole % palette.length], { segments: 8, solid: true, blocker: false });
      }
    } else if (template === "strength" || template === "bell") {
      const stand = box("strength-stand", [6.5, 0.6, 4.5], { x: anchor.x, y: baseY + 0.3, z: anchor.z }, materials.wood);
      const device = template === "bell"
        ? cylinder("bell", 0.9, 1.1, { x: anchor.x, y: baseY + 4.2, z: anchor.z }, materials.yellow, { segments: 12 })
        : cylinder("weight", 1.15, 4.8, { x: anchor.x, y: baseY + 1.4, z: anchor.z }, materials.steel, { rotationZ: Math.PI / 2, segments: 12 });
      for (const lateral of [-2.8, 2.8]) beam(`strength-frame-${lateral}`, { x: anchor.x + px * lateral, y: baseY, z: anchor.z + pz * lateral }, { x: anchor.x + px * lateral, y: baseY + 5.8, z: anchor.z + pz * lateral }, 0.25, materials.darkWood);
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}`,
        label: `${attraction.number}. ${attraction.name}を操作`,
        point: { x: point.x, y: point.y, z: point.z },
        radius: 4,
        areaId: attraction.areaId,
        activate() {
          device.userData.activatedAt = performance.now();
          handle.notify?.(`${attraction.number}. ${attraction.name} 成功！`);
          playTone(template === "bell" ? 760 : 360, 0.3, template === "bell" ? "sine" : "triangle");
          return true;
        },
      });
      addAnimation((seconds, now) => {
        const activatedAt = device.userData.activatedAt;
        if (!activatedAt) return;
        const progress = clamp((now - activatedAt) / 900, 0, 1);
        device.position.y = baseY + (template === "bell" ? 4.2 : 1.4) + Math.sin(progress * Math.PI) * 1.7;
        device.rotation.z = Math.sin(progress * Math.PI * 7) * (1 - progress) * 0.35;
      });
      stand.userData.officialInteractive = true;
    } else if (template === "balls" || template === "target") {
      box("target-board", [7, 4.8, 0.5], { x: point.x + ux * 2.3, y: baseY + 2.4, z: point.z + uz * 2.3 }, materials.white, { rotationY: yaw });
      const projectiles = [];
      for (let ballIndex = 0; ballIndex < 5; ballIndex += 1) {
        const location = at(0.3 + ballIndex * 0.11, (ballIndex % 2 - 0.5) * 2.8, 1.25 + (ballIndex % 3) * 0.55);
        const ball = sphere(`ball-${ballIndex}`, 0.62 + ballIndex % 2 * 0.18, location, palette[ballIndex % palette.length], { segments: 10 });
        projectiles.push({ ball, location });
        if (template === "balls") addAnimation((seconds) => {
          if (!representation.targetActivatedAt) ball.position.y = location.y + Math.sin(seconds * 1.2 + ballIndex + index) * 0.42;
        });
      }
      for (let target = 0; target < 3; target += 1) torus(`target-${target}`, 0.7, 0.15, { x: point.x + ux * 2.05 + px * (target - 1) * 1.8, y: baseY + 2.2, z: point.z + uz * 2.05 + pz * (target - 1) * 1.8 }, palette[target % palette.length], { rotationY: yaw, segments: 16 });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-target`, label: `${attraction.name}：投げる / 打つ`, point: { ...point }, radius: 4.2, areaId: attraction.areaId,
        activate() {
          representation.targetActivatedAt = performance.now();
          handle.notify?.(`🎯 ${attraction.name} ショット！`);
          playTone(420, 0.08, "square");
          return true;
        },
      });
      addAnimation((_seconds, now) => {
        if (!representation.targetActivatedAt) return;
        const progress = clamp((now - representation.targetActivatedAt) / 900, 0, 1);
        projectiles.forEach(({ ball, location }, ballIndex) => {
          const target = { x: point.x + ux * 2.05 + px * ((ballIndex % 3) - 1) * 1.8, y: baseY + 2.2, z: point.z + uz * 2.05 + pz * ((ballIndex % 3) - 1) * 1.8 };
          ball.position.set(lerp(location.x, target.x, progress), lerp(location.y, target.y, progress) + Math.sin(progress * Math.PI) * 2.2, lerp(location.z, target.z, progress));
        });
        if (progress >= 1) {
          handle.notify?.("✨ TARGET HIT!");
          playTone(760, 0.16, "sine");
          representation.targetActivatedAt = null;
          projectiles.forEach(({ ball, location }) => ball.position.set(location.x, location.y, location.z));
        }
      });
    } else if (template === "boat") {
      playable("raft", [6.5, 0.45, 4.2], { x: anchor.x, y: baseY - 0.22, z: anchor.z }, materials.wood, { dynamic: true });
      const hull = box("boat-hull", [5.5, 0.8, 3.2], { x: anchor.x, y: baseY + 0.2, z: anchor.z }, primary, { rotationY: yaw });
      box("boat-seat", [2.2, 1.1, 2], { x: 0, y: 0.85, z: 0 }, materials.white, { parent: hull });
      for (const lateral of [-2.1, 2.1]) torus(`paddle-wheel-${lateral}`, 0.85, 0.15, { x: lateral, y: 0.45, z: 0 }, secondary, { rotationY: Math.PI / 2, segments: 12, parent: hull });
      const boatStart = { x: anchor.x, y: baseY + PLAYER_FOOT_OFFSET, z: anchor.z };
      const boatEndPoint = at(0.94, 0, 0);
      const boatEnd = { ...boatEndPoint, y: boatEndPoint.y + PLAYER_FOOT_OFFSET };
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-boat`, label: `${attraction.name}：Eで漕ぐ`, point: boatStart, radius: 4.2, areaId: attraction.areaId,
        activate: () => beginLocalRide(`official-${attraction.officialId}-boat`, attraction.areaId, boatStart, boatEnd, 4_400, hull, attraction.name, attraction.number - 1, -PLAYER_FOOT_OFFSET + 0.2, 0.08),
      });
    } else if (template === "zip") {
      const isForestZip = attraction.areaId === "mecya-forest";
      const cableFrom = at(isForestZip ? 0 : 0.08, 0, 4.7);
      const cableTo = at(isForestZip ? 1 : 0.92, 0, 2.1);
      const cableLength = Math.hypot(cableTo.x - cableFrom.x, cableTo.y - cableFrom.y, cableTo.z - cableFrom.z);
      const durationMs = isForestZip ? clamp(cableLength / 18 * 1000, 2_400, 12_500) : 2_200;
      beam("zip-cable", cableFrom, cableTo, 0.11, materials.steel);
      beam("zip-safety-line", { ...cableFrom, y: cableFrom.y - 0.42 }, { ...cableTo, y: cableTo.y - 0.42 }, 0.055, materials.rope);
      const trolley = box("zip-trolley", [1.2, 0.45, 0.8], cableFrom, primary);
      box("zip-pulley-left", [0.22, 0.65, 0.18], { ...cableFrom, x: cableFrom.x + px * 0.32, z: cableFrom.z + pz * 0.32 }, materials.steel);
      box("zip-pulley-right", [0.22, 0.65, 0.18], { ...cableFrom, x: cableFrom.x - px * 0.32, z: cableFrom.z - pz * 0.32 }, materials.steel);
      beam("zip-harness", cableFrom, { ...cableFrom, y: cableFrom.y - 1.45 }, 0.075, materials.black);
      addAnimation((seconds) => {
        if (gameplay.ride?.id === `official-${attraction.officialId}`) return;
        const amount = (Math.sin(seconds * 0.72 + index) + 1) / 2;
        trolley.position.set(lerp(cableFrom.x, cableTo.x, amount), lerp(cableFrom.y, cableTo.y, amount), lerp(cableFrom.z, cableTo.z, amount));
      });
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}`,
        label: `${attraction.number}. ${attraction.name}に乗る`,
        point: { ...cableFrom, y: cableFrom.y - 1.3 },
        radius: 4,
        areaId: attraction.areaId,
        activate: () => beginLocalRide(
          `official-${attraction.officialId}`,
          attraction.areaId,
          { ...cableFrom, y: cableFrom.y - 1.35 },
          { ...cableTo, y: cableTo.y - 1.35 },
          durationMs,
          trolley,
          attraction.name,
          attraction.number - 1,
        ),
      });
      representation.publishedLengthMeters = attraction.officialId === "me08" ? 220 : null;
      representation.rideLength = Math.round(cableLength * 10) / 10;
      representation.rideDurationMs = Math.round(durationMs);
      representation.detailProfile = isForestZip ? "forest-course-terminal-zip" : "interactive-short-zip";
    } else if (template === "trampoline") {
      const trampoline = playable("trampoline", [7, 0.5, 7], { x: anchor.x, y: baseY + 0.25, z: anchor.z }, materials.black);
      trampoline.surface.trampoline = true;
      torus("trampoline-ring", 3.7, 0.18, { x: anchor.x, y: baseY + 0.55, z: anchor.z }, primary, { rotationX: Math.PI / 2, segments: 24 });
      addAnimation((seconds) => { trampoline.mesh.scale.y = 0.5 + Math.sin(seconds * 2.8 + index) * 0.055; });
    } else if (template === "excavator") {
      cylinder("excavator-track", 1.45, 3.8, { x: anchor.x, y: baseY + 0.6, z: anchor.z }, materials.black, { rotationZ: Math.PI / 2, segments: 12 });
      box("excavator-cab", [3.4, 2.7, 3], { x: anchor.x, y: baseY + 2.05, z: anchor.z }, materials.yellow);
      box("excavator-window", [2, 1.35, 0.12], { x: anchor.x, y: baseY + 2.3, z: anchor.z - 1.55 }, materials.blue);
      const boom = beam("excavator-boom", { x: anchor.x + ux, y: baseY + 2.6, z: anchor.z + uz }, { x: anchor.x + ux * 5, y: baseY + 4.3, z: anchor.z + uz * 5 }, 0.36, materials.orange);
      const arm = beam("excavator-arm", { x: anchor.x + ux * 5, y: baseY + 4.3, z: anchor.z + uz * 5 }, { x: anchor.x + ux * 7, y: baseY + 1.1, z: anchor.z + uz * 7 }, 0.3, materials.orange);
      representation.interactive = true;
      registerInteraction({ id: `official-${attraction.officialId}-excavator`, label: "パワーショベルを操作", point: { ...point }, radius: 4.2, areaId: attraction.areaId, activate() { representation.excavatorActivatedAt = performance.now(); handle.notify?.("🚜 レバー操作！アームを動かした"); playTone(180, 0.2, "sawtooth"); return true; } });
      addAnimation((_seconds, now) => {
        const progress = representation.excavatorActivatedAt ? clamp((now - representation.excavatorActivatedAt) / 1_500, 0, 1) : 0;
        boom.rotation.z = Math.sin(progress * Math.PI) * 0.22;
        arm.rotation.z = -Math.sin(progress * Math.PI) * 0.34;
      });
    } else if (template === "antlion") {
      for (let ring = 0; ring < 6; ring += 1) torus(`antlion-ring-${ring}`, 4.8 - ring * 0.65, 0.26, { x: anchor.x, y: baseY + 0.3 + ring * 0.45, z: anchor.z }, ring % 2 ? secondary : primary, { rotationX: Math.PI / 2, segments: 24 });
    } else if (template === "pixel-game") {
      box("pixel-screen", [9, 6.5, 0.6], { x: anchor.x, y: baseY + 3.25, z: anchor.z }, materials.navy, { rotationY: yaw });
      for (let pixel = 0; pixel < 24; pixel += 1) box(`pixel-${pixel}`, [0.72, 0.72, 0.18], { x: anchor.x + px * ((pixel % 6) - 2.5) * 0.95 - ux * 0.42, y: baseY + 1.15 + Math.floor(pixel / 6) * 1.1, z: anchor.z + pz * ((pixel % 6) - 2.5) * 0.95 - uz * 0.42 }, palette[pixel % palette.length]);
    } else if (template === "sail") {
      beam("mast", { x: anchor.x, y: baseY, z: anchor.z }, { x: anchor.x, y: baseY + 8.2, z: anchor.z }, 0.22, materials.darkWood);
      const sail = box("sail", [0.25, 5.2, 5.8], { x: anchor.x + px * 2.9, y: baseY + 5, z: anchor.z + pz * 2.9 }, materials.white, { rotationY: yaw });
      addAnimation((seconds) => {
        const raised = representation.sailRaised ? 1 : 0.45;
        sail.scale.x = raised + Math.sin(seconds * 1.1 + index) * 0.045;
      });
      representation.interactive = true;
      registerInteraction({ id: `official-${attraction.officialId}-sail`, label: "2人プレイで帆を上げる", point: { ...point }, radius: 4.2, areaId: attraction.areaId, activate() { representation.sailPulls = (representation.sailPulls || 0) + 1; representation.sailRaised = representation.sailPulls >= 2; handle.notify?.(representation.sailRaised ? "⛵ 2人分の力で帆が上がった！" : "⛵ 1/2　もう一度Eで力を合わせよう"); playTone(representation.sailRaised ? 680 : 360, 0.14, "triangle"); if (representation.sailRaised) representation.sailPulls = 0; return true; } });
    } else if (template === "stilts") {
      for (let stilt = 0; stilt < 6; stilt += 1) {
        const location = at(0.2 + stilt * 0.13, 0, 1.3 + Math.sin(stilt) * 0.35);
        cylinder(`stilt-${stilt}`, 0.16, 3.3, location, stilt % 2 ? primary : secondary, { segments: 8 });
        playable(`stilt-foot-${stilt}`, [1.5, 0.24, 1.5], { x: location.x, y: location.y - 0.12, z: location.z }, stilt % 2 ? primary : secondary);
      }
    } else if (template === "shape-steps" || template === "ox-steps") {
      for (let shape = 0; shape < 6; shape += 1) {
        const location = at(0.2 + shape * 0.13, 0, 0.25 + (shape % 2) * 0.18);
        if (template === "shape-steps" && shape % 3 === 0) torus(`shape-ring-${shape}`, 1.1, 0.22, location, palette[shape % palette.length], { rotationX: Math.PI / 2, segments: 18 });
        else playable(`shape-step-${shape}`, [2.3, 0.38, 2.3], { x: location.x, y: location.y - 0.19, z: location.z }, palette[shape % palette.length], { rotationY: shape % 2 ? Math.PI / 4 : 0 });
        if (template === "ox-steps" && shape % 2) {
          beam(`x-mark-a-${shape}`, { x: location.x - 0.75, y: location.y + 0.08, z: location.z - 0.75 }, { x: location.x + 0.75, y: location.y + 0.08, z: location.z + 0.75 }, 0.12, materials.white);
          beam(`x-mark-b-${shape}`, { x: location.x + 0.75, y: location.y + 0.08, z: location.z - 0.75 }, { x: location.x - 0.75, y: location.y + 0.08, z: location.z + 0.75 }, 0.12, materials.white);
        }
      }
    } else if (template === "dragon") {
      const dragonPath = [];
      for (let body = 0; body < 16; body += 1) {
        const amount = 0.05 + body * 0.059;
        // 2.058m of lateral amplitude makes this sixteen-hoop crawl body 25.0m long on the 18m grid span.
        const location = at(amount, Math.sin(body * 0.92) * 2.058, 1.55 + Math.sin(body * 0.74) * 0.48);
        dragonPath.push(location);
        const hoopRadius = 1.22 + Math.sin(body * 0.55) * 0.16;
        const hoop = torus(`dragon-net-hoop-${body}`, hoopRadius, 0.075, location, body % 3 === 0 ? materials.pink : body % 2 ? materials.black : materials.teal, { rotationY: yaw + Math.PI / 2, segments: 18 });
        hoop.scale.y *= 0.9;
        if (body % 2 === 0) tagOfficialMesh(addCone(`${attraction.officialId}-dragon-spine-${body}`, "official-attraction", 0.34 + body % 3 * 0.04, 0.95, [location.x, location.y + hoopRadius + 0.42, location.z], body % 4 ? materials.teal : materials.pink, { segments: 5 }), representation);
        addSurface(`${attraction.officialId}-dragon-crawl-surface-${body}`, location.x, location.z, 1.35, 1.35, location.y - 0.5, { areaId: attraction.areaId });
      }
      for (let strand = 0; strand < 8; strand += 1) {
        const angle = strand / 8 * Math.PI * 2;
        for (let segment = 0; segment < dragonPath.length - 1; segment += 1) {
          const from = dragonPath[segment];
          const to = dragonPath[segment + 1];
          beam(`dragon-net-longitudinal-${strand}-${segment}`, { x: from.x + px * Math.cos(angle) * 1.16, y: from.y + Math.sin(angle) * 1.04, z: from.z + pz * Math.cos(angle) * 1.16 }, { x: to.x + px * Math.cos(angle) * 1.16, y: to.y + Math.sin(angle) * 1.04, z: to.z + pz * Math.cos(angle) * 1.16 }, 0.052, strand % 3 === 0 ? materials.pink : strand % 2 ? materials.black : materials.teal);
        }
      }
      const headCenter = at(0.97, 0, 3);
      const headGroup = new constructors.Group();
      headGroup.name = `Greenia:${attraction.officialId}-dragon-head-group`;
      headGroup.position.set(headCenter.x, headCenter.y, headCenter.z);
      headGroup.rotation.y = yaw;
      root.add(headGroup);
      sphere("dragon-rounded-head-shell", 2.5, { x: 0, y: 0, z: 0 }, materials.teal, { scaleX: 1.06, scaleY: 0.86, scaleZ: 1.12, segments: 16, parent: headGroup });
      box("dragon-upper-snout", [3.5, 1.15, 2.25], { x: 0, y: -0.05, z: 2.15 }, materials.teal, { parent: headGroup });
      box("dragon-open-mouth", [2.95, 1.48, 0.62], { x: 0, y: -0.82, z: 3.22 }, materials.black, { parent: headGroup });
      box("dragon-lower-jaw", [3.25, 0.58, 1.82], { x: 0, y: -1.58, z: 2.58 }, materials.teal, { parent: headGroup });
      for (const lateral of [-1.12, 1.12]) {
        sphere(`dragon-eye-${lateral}`, 0.54, { x: lateral, y: 1.03, z: 1.75 }, materials.yellow, { segments: 14, parent: headGroup });
        sphere(`dragon-pupil-${lateral}`, 0.23, { x: lateral, y: 1.03, z: 2.23 }, materials.black, { scaleY: 1.25, segments: 12, parent: headGroup });
        sphere(`dragon-nostril-${lateral}`, 0.18, { x: lateral * 0.58, y: 0.16, z: 3.36 }, materials.black, { scaleY: 0.65, segments: 10, parent: headGroup });
        sphere(`dragon-pink-cheek-${lateral}`, 0.35, { x: lateral * 1.58, y: -0.15, z: 2.42 }, materials.pink, { scaleY: 0.62, segments: 10, parent: headGroup });
        tagOfficialMesh(addCone(`${attraction.officialId}-dragon-horn-${lateral}`, "official-attraction", 0.44, 1.72, [lateral * 1.18, 2.58, -0.25], materials.white, { segments: 7, parent: headGroup }), representation);
      }
      for (let tooth = 0; tooth < 4; tooth += 1) {
        const toothX = -1.02 + tooth * 0.68;
        const upperTooth = tagOfficialMesh(addCone(`${attraction.officialId}-dragon-upper-tooth-${tooth}`, "official-attraction", 0.16, 0.48, [toothX, -0.46, 3.58], materials.white, { segments: 6, parent: headGroup }), representation);
        upperTooth.rotation.z = Math.PI;
        tagOfficialMesh(addCone(`${attraction.officialId}-dragon-lower-tooth-${tooth}`, "official-attraction", 0.14, 0.4, [toothX, -1.18, 3.59], materials.white, { segments: 6, parent: headGroup }), representation);
      }
      const dragonMouth = { x: headCenter.x + ux * 3.35, y: baseY + 2.05, z: headCenter.z + uz * 3.35 };
      const dragonRidePath = [...dragonPath, dragonMouth];
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-dragon-crawl`,
        label: "Eで25mのDragonネットを尾から口まで潜る",
        point: dragonRidePath[0],
        radius: 4.4,
        areaId: attraction.areaId,
        activate: () => beginPathRide(
          `official-${attraction.officialId}-dragon-crawl`,
          attraction.areaId,
          dragonRidePath,
          10_500,
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          { startMessage: "🐉 黒・ピンク・緑のネットを尾から25m潜り、開いた口へ抜けよう！" },
        ),
      });
      representation.publishedLengthMeters = 25;
      representation.rideLength = Math.round(dragonPath.slice(1).reduce((total, location, pathIndex) => total + Math.hypot(location.x - dragonPath[pathIndex].x, location.y - dragonPath[pathIndex].y, location.z - dragonPath[pathIndex].z), 0) * 10) / 10;
      representation.detailProfile = "official-pdf-matched-exact-25m-pink-black-green-eight-strand-net-dragon-rounded-face-pupils-nostrils-teeth-horns-interactive-crawl";
    }

    const assistedTraversalHeights = {
      "hammock-wall": 2.1,
      "sloth-log": 3.1,
      tightrope: 0.72,
      "net-swings": 1.6,
      "square-frames": 1.2,
      "grip-balls": 2.7,
      "rescue-ropes": 1.4,
      "angled-pipe": 2.1,
      "monkey-bars": 3.2,
      rings: 2.7,
      net: 2,
      "net-wall": 2,
      "web-hill": 2.4,
      "rope-jungle": 2,
      "cling-log-wall": 1.4,
      "rope-forest": 2,
      "finger-ledge": 3.3,
      "irregular-rings": 2.7,
    };
    const assistedHeight = assistedTraversalHeights[template];
    if (!representation.interactive && Number.isFinite(assistedHeight)) {
      const assistedStart = at(0.1, 0, assistedHeight);
      const assistedEnd = at(0.92, 0, assistedHeight);
      representation.interactive = true;
      registerInteraction({
        id: `official-${attraction.officialId}-assisted-traverse`,
        label: `${attraction.name}：Eでつかむ`,
        point: assistedStart,
        radius: 4.2,
        areaId: attraction.areaId,
        activate: () => beginLocalRide(
          `official-${attraction.officialId}-assisted-traverse`,
          attraction.areaId,
          assistedStart,
          assistedEnd,
          clamp(length / 3.5 * 1_000, 2_400, 6_500),
          null,
          attraction.name,
          attraction.number - 1,
          1.2,
          template === "tightrope" ? 0.55 : 0.18,
        ),
      });
    }

    addOfficialNumberMarker(representation, point, primary);
    state.officialAttractionCount = officialRepresentations.length;
    return representation;
  }

  function buildCompleteOfficialCourses() {
    addBox("complete-west-extension", "official-field", [150, 0.16, 252], [-385, -0.06, 204], materials.grass, { castShadow: false, receiveShadow: true });
    addBox("complete-south-extension", "official-field", [412, 0.16, 100], [-254, -0.06, 380], materials.grass, { castShadow: false, receiveShadow: true });
    addBox("complete-west-promenade", "official-field", [142, 0.08, 7], [-382, 0.04, 332], materials.path, { castShadow: false });
    addBox("complete-south-promenade", "official-field", [7, 0.08, 96], [-310, 0.04, 380], materials.path, { castShadow: false });

    addBox("complete-kingdom-field", "official-field", [142, 0.08, 66], [-385, 0.03, 120], materials.stone, { castShadow: false });
    addBox("complete-yahhoy-field", "official-field", [142, 0.08, 66], [-385, 0.03, 194], materials.grassDark, { castShadow: false });
    addBox("complete-forest-field", "official-field", [242, 0.08, 116], [-339, 0.03, 282], materials.grassDark, { castShadow: false });
    addBox("complete-amembo-basin", "official-field", [170, 0.12, 76], [-374, 0.05, 379], materials.water, { castShadow: false });
    addHazard("complete-amembo-water", -374, 379, 170, 76, "water");
    addBox("complete-kairiki-field", "official-field", [118, 0.08, 78], [-220, 0.03, 380], materials.grassDark, { castShadow: false });
    addBox("complete-chibido-field", "official-field", [96, 0.1, 54], [-108, 0.04, 363], materials.rubber, { castShadow: false });

    for (let treeIndex = 0; treeIndex < 28; treeIndex += 1) {
      const row = Math.floor(treeIndex / 7);
      const column = treeIndex % 7;
      addTree(-454 + column * 21, 231 + row * 29, 0.72 + (treeIndex % 4) * 0.09, 300 + treeIndex, "official-forest");
    }

    for (const [areaId, layout] of Object.entries(COMPLETE_AREA_LAYOUTS)) {
      const area = AREA_DEFINITIONS.find((candidate) => candidate.id === areaId);
      const attractions = OFFICIAL_ATTRACTIONS[areaId];
      const points = areaId === "mecya-forest" ? forestOfficialLayoutPoints() : officialLayoutPoints(layout, attractions.length);
      const gatePoint = points[0];
      addBox(`complete-gate-${areaId}-left`, "official-gate", [0.55, 6.2, 0.55], [gatePoint.x - 5, 3.1, gatePoint.z - 8], materials.darkWood, { solid: true });
      addBox(`complete-gate-${areaId}-right`, "official-gate", [0.55, 6.2, 0.55], [gatePoint.x + 5, 3.1, gatePoint.z - 8], materials.darkWood, { solid: true });
      addBox(`complete-gate-${areaId}-beam`, "official-gate", [10.8, 0.6, 0.7], [gatePoint.x, 5.8, gatePoint.z - 8], materials.wood);
      addSign(`complete-gate-${areaId}-sign`, `${area.short} COMPLETE`, `${attractions.length} OFFICIAL POINTS`, area.color, [gatePoint.x, 4.45, gatePoint.z - 8.4], [9.5, 2.3], { icon: area.icon });
      addOfficialDirectory(area, attractions, [gatePoint.x + (areaId === "chibidoland" ? 10 : 9), gatePoint.z - 17], attractions.length > 24 ? 2 : 1);

      if (areaId === "mecya-forest") {
        for (const course of FOREST_COURSE_RANGES) {
          const start = points[course.start];
          const end = points[course.end];
          addBox(`forest-course-${course.courseNumber}-gate-left`, "official-forest-course-gate", [0.38, 4.8, 0.38], [start.x - 3.5, 2.4, start.z - 6], materials.darkWood, { solid: true });
          addBox(`forest-course-${course.courseNumber}-gate-right`, "official-forest-course-gate", [0.38, 4.8, 0.38], [start.x + 3.5, 2.4, start.z - 6], materials.darkWood, { solid: true });
          addBox(`forest-course-${course.courseNumber}-gate-beam`, "official-forest-course-gate", [7.4, 0.42, 0.45], [start.x, 4.55, start.z - 6], materials.wood);
          addSign(
            `forest-course-${course.courseNumber}-gate-sign`,
            `FOREST COURSE ${course.courseNumber}`,
            `No.${String(course.start + 1).padStart(2, "0")}–${String(course.end + 1).padStart(2, "0")} / ZIP GOAL`,
            area.color,
            [start.x, 3.45, start.z - 6.25],
            [6.8, 1.65],
            { icon: "🌲" },
          );
          addSign(
            `forest-course-${course.courseNumber}-zip-sign`,
            `COURSE ${course.courseNumber} ZIP`,
            course.courseNumber === 2 ? "約220m・森エリア第2位のロングライド" : course.courseNumber === 4 ? "森エリア最急・最速ライン" : "コース終端ジップスライド",
            "#ff9f32",
            [end.x, end.surfaceY + 3.3, end.z + 4.6],
            [7.2, 1.8],
            { icon: "🪂" },
          );
        }
        const hardRouteEnd = points[32];
        const routeMerge = points[34];
        for (let mergeStep = 1; mergeStep <= 5; mergeStep += 1) {
          const amount = mergeStep / 6;
          const x = lerp(hardRouteEnd.x, routeMerge.x, amount);
          const y = lerp(hardRouteEnd.surfaceY, routeMerge.surfaceY, amount);
          const z = lerp(hardRouteEnd.z, routeMerge.z, amount);
          addPlayableBox(`forest-course-6-hard-merge-${mergeStep}`, "official-forest-branch", [2.4, 0.28, 1.05], [x, y - 0.14, z], materials.lightWood, { areaId, dynamic: true });
          addBeamBetween(`forest-course-6-hard-merge-rope-${mergeStep}`, "official-forest-branch", [x, y, z], [x, y + 4.2, z], 0.05, materials.white);
        }
        addSign("forest-course-6-branch-sign", "COURSE 6 分岐", "難：No.32→33　／　易：No.34　→ No.35で合流", area.color, [points[30].x, points[30].surfaceY + 3.1, points[30].z + 4.8], [9.2, 2], { icon: "↗" });
      }

      const forestCourseStarts = new Set(FOREST_COURSE_RANGES.map((course) => course.start));
      points.forEach((point, index) => {
        let previousPoint = index > 0 && !(areaId === "mecya-forest" && forestCourseStarts.has(index)) ? points[index - 1] : null;
        if (areaId === "mecya-forest" && index === 33) previousPoint = points[30];
        buildOfficialModule(attractions[index], previousPoint, point, index);
      });
      const legacyStartIds = {
        "mt-kingdom": "kingdom-start", chibidoland: "chibido-start", "wonder-amembo": "amembo-start",
        yahhoy: "yahhoy-start", "de-kairiki": "kairiki-start", "mecya-forest": "forest-start",
      };
      defineRoute(areaId, points.map((point, index) => ({
        ...point,
        id: index === 0 ? legacyStartIds[areaId] : attractions[index].officialId,
        officialId: attractions[index].officialId,
        officialNumber: attractions[index].number,
        name: attractions[index].name,
        template: inferOfficialTemplate(attractions[index]),
        courseNumber: point.courseNumber ?? null,
        coursePosition: point.coursePosition ?? null,
        courseLength: point.courseLength ?? null,
        branchOption: areaId === "mecya-forest" && (index === 31 || index === 32)
          ? "hard"
          : areaId === "mecya-forest" && index === 33
            ? "easy"
            : areaId === "mecya-forest" && index === 34
              ? "merge"
              : null,
        radius: index === 0 ? 4.1 : 3.2,
      })));
    }

    const existingRoutes = {
      "mt-king": [
        { id: "mtking-start", officialId: "mt01", officialNumber: 1, name: "トランポリン", x: -145, y: 0.6 + PLAYER_FOOT_OFFSET, z: 296, radius: 4.5 },
        { id: "mt02", officialId: "mt02", officialNumber: 2, name: "芝すべり", x: -87, y: 10.5 + PLAYER_FOOT_OFFSET, z: 308, radius: 4.5 },
        { id: "mt03", officialId: "mt03", officialNumber: 3, name: "ペダルボート", x: -126, y: 0.52 + PLAYER_FOOT_OFFSET, z: 303, radius: 4.5 },
      ],
      "zip-slide": [
        { id: "zip-start", officialId: "zi01", officialNumber: 1, name: "ロングジップスライド（行き）", x: -448, y: 12.4 + PLAYER_FOOT_OFFSET, z: 225, radius: 4.5 },
        { id: "zi02", officialId: "zi02", officialNumber: 2, name: "ロングジップスライド（帰り）", x: -386, y: 3.295 + PLAYER_FOOT_OFFSET, z: 219, radius: 5 },
      ],
    };
    const matchers = {
      mt01: /mtking-trampoline/, mt02: /mtking-(grass-slide|slide-hill|slide-lane)/, mt03: /mtking-(pedal-boat|boat-dock|boat-pond)/,
      zi01: /zip-(go|cable|safety)/, zi02: /zip-return/,
    };
    for (const [areaId, route] of Object.entries(existingRoutes)) {
      const attractions = OFFICIAL_ATTRACTIONS[areaId];
      route.forEach((point, index) => {
        const attraction = attractions[index];
        const representation = {
          ...attraction,
          template: areaId === "zip-slide" ? "zip" : inferOfficialTemplate(attraction),
          x: point.x,
          y: point.y,
          z: point.z,
          meshCount: 0,
          playable: true,
          interactive: areaId === "zip-slide" || attraction.officialId === "mt02" || attraction.officialId === "mt03",
          detailProfile: areaId === "zip-slide"
            ? "long-zip-silver-trolley-red-edged-orientation-handle"
            : attraction.officialId === "mt01"
              ? "green-trampoline-blue-edge-perimeter-net"
              : attraction.officialId === "mt02"
                ? "green-grass-slope-orange-red-rideable-sleds"
                : "white-hull-red-cabin-blue-window-rideable-pedal-boat",
          publishedLengthMeters: attraction.officialId === "zi01" ? 256 : attraction.officialId === "zi02" ? 201 : null,
        };
        root.traverse((object) => {
          if (!object.isMesh || !matchers[attraction.officialId].test(object.name)) return;
          tagOfficialMesh(object, representation);
        });
        officialRepresentations.push(representation);
      });
      defineRoute(areaId, route);
    }
    state.officialAttractionCount = officialRepresentations.length;
  }

  function addCheckpointVisual(areaId, index, point) {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === areaId);
    const surfaceY = point.y - PLAYER_FOOT_OFFSET;
    const ring = addTorus(`checkpoint-${areaId}-${index}`, "checkpoint", 1.15, 0.18, [point.x, surfaceY + 0.12, point.z], materials.glow, { rotationX: Math.PI / 2, segments: 18 });
    ring.userData.checkpointAreaId = areaId;
    ring.userData.checkpointIndex = index;
    const pole = addBox(`checkpoint-${areaId}-${index}-pole`, "checkpoint", [0.12, 2.1, 0.12], [point.x + 1.35, surfaceY + 1.05, point.z], materials.steel);
    const flag = addBox(`checkpoint-${areaId}-${index}-flag`, "checkpoint", [1.55, 0.75, 0.08], [point.x + 2.05, surfaceY + 1.72, point.z], index === 0 ? materials.white : materials.yellow);
    pole.userData.checkpointAreaId = areaId;
    pole.userData.checkpointIndex = index;
    flag.userData.checkpointAreaId = areaId;
    flag.userData.checkpointIndex = index;
    if (!checkpointVisualsByArea.has(areaId)) checkpointVisualsByArea.set(areaId, []);
    checkpointVisualsByArea.get(areaId).push(ring, pole, flag);
    flag.userData.baseScaleX = flag.scale.x;
    animatedFlags.push(flag);
    addAnimation((seconds) => {
      const run = gameplay.areaRuns.get(areaId);
      const reached = run?.checkpointIndex >= index;
      ring.material = reached ? materials.glow : materials.white;
      ring.rotation.z = seconds * 0.8 + index;
      pole.visible = Boolean(area);
    });
  }

  function defineRoute(areaId, points) {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === areaId);
    const previousVisuals = checkpointVisualsByArea.get(areaId) || [];
    if (previousVisuals.length) {
      for (const object of previousVisuals) object.parent?.remove(object);
      state.meshCount = Math.max(0, state.meshCount - previousVisuals.length);
      state.decorativeMeshCount = Math.max(0, state.decorativeMeshCount - previousVisuals.length);
      state.roleCounts.set("checkpoint", Math.max(0, (state.roleCounts.get("checkpoint") || 0) - previousVisuals.length));
      checkpointVisualsByArea.set(areaId, []);
    }
    const normalized = points.map((point, index) => ({
      ...point,
      id: point.id || `${areaId}-${index}`,
      name: point.name || (index === 0 ? "START" : index === points.length - 1 ? "GOAL" : `CHECK ${index}`),
      x: point.x,
      y: point.y ?? PLAYER_GROUND_Y,
      z: point.z,
      radius: point.radius ?? 3.2,
      index,
    }));
    routeDefinitions.set(areaId, { area, points: normalized });
    normalized.forEach((point, index) => addCheckpointVisual(areaId, index, point));
  }

  function buildChibidoland() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "chibidoland");
    addZonePortal(area, -131, 96, Math.PI);
    addBox("chibido-safety-field", "chibidoland", [76, 0.12, 29], [-96, 0.06, 113], materials.rubber, { castShadow: false });

    // 2026 Chibidoland: the twelve official preschool challenges are arranged as one compact play garden.
    for (let index = 0; index < 10; index += 1) {
      const x = -126 + index * 6.5;
      const y = 0.4 + Math.sin(index * 1.4) * 0.18;
      const platform = addPlayableBox(`chibido-shape-step-${index}`, "chibidoland", [4.2, 0.65, 4.2], [x, y / 2, 108 + Math.sin(index * 0.9) * 2.3], [materials.pink, materials.yellow, materials.lime, materials.blue][index % 4], { areaId: area.id });
      addAnimation((seconds) => {
        platform.mesh.scale.y = 0.65 * (0.92 + Math.sin(seconds * 2.5 + index) * 0.08);
      });
    }

    // 01 ミニうんてい
    for (const x of [-126, -114]) addBox(`chibido-monkey-post-${x}`, "chibidoland", [0.45, 3.4, 0.45], [x, 1.7, 117], materials.darkWood);
    addBeamBetween("chibido-monkey-rail-left", "chibidoland", [-126, 3.3, 115.8], [-114, 3.3, 115.8], 0.13, materials.wood);
    addBeamBetween("chibido-monkey-rail-right", "chibidoland", [-126, 3.3, 118.2], [-114, 3.3, 118.2], 0.13, materials.wood);
    for (let index = 0; index < 7; index += 1) {
      addBeamBetween(`chibido-monkey-rung-${index}`, "chibidoland", [-125 + index * 1.75, 3.3, 115.8], [-125 + index * 1.75, 3.3, 118.2], 0.12, materials.yellow);
    }

    // 02 パワーショベルでの挑戦！
    addCylinder("chibido-excavator-turntable", "chibidoland", 1.5, 0.45, [-106, 0.45, 118], materials.darkWood, { segments: 12 });
    addBox("chibido-excavator-cab", "chibidoland", [3.4, 2.5, 2.8], [-106, 1.8, 118], materials.yellow, { solid: true });
    addBox("chibido-excavator-window", "chibidoland", [1.8, 1.35, 0.12], [-106, 2.1, 116.54], materials.blue);
    addBeamBetween("chibido-excavator-boom", "chibidoland", [-104.7, 2.4, 118], [-100.2, 4.2, 118], 0.38, materials.orange);
    addBeamBetween("chibido-excavator-arm", "chibidoland", [-100.2, 4.2, 118], [-97.6, 1.2, 118], 0.32, materials.orange);
    const bucket = addBox("chibido-excavator-bucket", "chibidoland", [2.1, 1.2, 2.5], [-96.9, 0.65, 118], materials.orange, { rotationZ: -0.3 });
    addAnimation((seconds) => { bucket.rotation.z = -0.3 + Math.sin(seconds * 0.8) * 0.18; });

    // 09 小さな小屋 / 04 壁越えミニボルダリング / 12 ミニスライダー
    addBox("chibido-little-hut", "chibidoland", [9, 4.8, 7], [-72, 2.4, 113], materials.purple, { solid: true });
    addCone("chibido-little-hut-roof", "chibidoland", 6, 4, [-72, 6.8, 113], materials.coral, { segments: 4, rotationY: Math.PI / 4 });
    for (let index = 0; index < 9; index += 1) {
      addSphere(`chibido-boulder-hold-${index}`, "chibidoland", 0.3, [-76.6, 0.8 + (index % 3) * 1.1, 110.7 + Math.floor(index / 3) * 1.4], [materials.yellow, materials.lime, materials.blue][index % 3], { scaleZ: 0.45 });
    }
    addRamp("chibido-slide", "chibidoland", [-76, 3.8, 116], [-84, 0.15, 122], 3.2, materials.yellow, { areaId: area.id });

    // 03 三角ネットトンネル
    for (let index = 0; index < 8; index += 1) {
      const x = -116 + index * 4.4;
      addBeamBetween(`chibido-net-top-${index}`, "chibidoland", [x, 3.1, 122], [x + 4, 3.1, 122], 0.07, materials.rope);
      addBeamBetween(`chibido-net-bottom-${index}`, "chibidoland", [x, 0.5, 122], [x + 4, 0.5, 122], 0.07, materials.rope);
      addBeamBetween(`chibido-net-diagonal-${index}`, "chibidoland", [x, 0.5, 122], [x + 4, 3.1, 122], 0.06, materials.rope);
    }

    // 05 ウェーブな平均台
    const wavePoints = [[-94, 102.5], [-90, 104.4], [-86, 102.5], [-82, 104.4], [-78, 102.5]];
    wavePoints.slice(0, -1).forEach(([x, z], index) => {
      const next = wavePoints[index + 1];
      addBeamBetween(`chibido-wave-balance-${index}`, "chibidoland", [x, 0.58, z], [next[0], 0.58, next[1]], 0.24, [materials.coral, materials.yellow, materials.lime, materials.blue][index]);
    });

    // 06 ハシゴときづち / 07 わなげ / 08 ボール投げ / 10 〇×わたり
    for (const x of [-94, -91]) addBox(`chibido-hammer-ladder-post-${x}`, "chibidoland", [0.25, 3.4, 0.25], [x, 1.7, 124], materials.wood);
    for (let index = 0; index < 5; index += 1) addBeamBetween(`chibido-hammer-ladder-rung-${index}`, "chibidoland", [-94, 0.7 + index * 0.62, 124], [-91, 0.7 + index * 0.62, 124], 0.11, materials.yellow);
    addBox("chibido-hammer-head", "chibidoland", [2.4, 0.7, 0.8], [-89.2, 3.55, 124], materials.coral);
    addBeamBetween("chibido-hammer-handle", "chibidoland", [-90.3, 3.25, 124], [-91.8, 1.6, 124], 0.13, materials.wood);
    for (let index = 0; index < 4; index += 1) {
      addBox(`chibido-ring-toss-pole-${index}`, "chibidoland", [0.16, 1.4 + index * 0.2, 0.16], [-85 + index * 2.1, 0.7 + index * 0.1, 124], materials.steel);
      addTorus(`chibido-ring-toss-ring-${index}`, "chibidoland", 0.8, 0.16, [-85 + index * 2.1, 1.25 + index * 0.12, 124], [materials.pink, materials.yellow, materials.lime, materials.blue][index], { rotationX: Math.PI / 2, segments: 16 });
    }
    addBox("chibido-ball-target", "chibidoland", [4.6, 3.6, 0.45], [-62.5, 1.8, 124], materials.white);
    for (let index = 0; index < 3; index += 1) addTorus(`chibido-ball-target-ring-${index}`, "chibidoland", 0.72, 0.18, [-64 + index * 1.5, 2, 123.72], [materials.coral, materials.yellow, materials.blue][index], { segments: 16 });
    for (let index = 0; index < 6; index += 1) {
      const mark = index % 2 ? "×" : "〇";
      const texture = createSignTexture(mark, index % 2 ? "CROSS" : "CIRCLE", index % 2 ? "#48a7df" : "#ff7192");
      const markMaterial = createMaterial(`chibido-ox-${index}`, 0xffffff, { map: texture, roughness: 0.72 });
      addPlayableBox(`chibido-ox-step-${index}`, "chibidoland", [3.6, 0.45, 3.6], [-131 + index * 4.5, 0.23, 102], markMaterial, { areaId: area.id });
    }
    defineRoute(area.id, [
      { ...area.start, id: "chibido-start" },
      { x: -110, y: 0.45 + PLAYER_FOOT_OFFSET, z: 108, id: "shape-steps" },
      { x: -102, y: PLAYER_GROUND_Y, z: 118, id: "power-shovel" },
      { x: -91, y: PLAYER_GROUND_Y, z: 122, id: "triangle-net" },
      { x: -72, y: PLAYER_GROUND_Y, z: 116, id: "little-hut" },
      { x: -61, y: PLAYER_GROUND_Y, z: 122, id: "chibido-goal" },
    ]);
  }

  function buildMtKingdom() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "mt-kingdom");
    addZonePortal(area, -92, 129, Math.PI);
    for (const x of [-100, -84]) {
      addBox(`kingdom-gate-tower-${x}`, "mt-kingdom", [7, 11, 7], [x, 5.5, 146], materials.stone, { solid: true });
      addCone(`kingdom-gate-roof-${x}`, "mt-kingdom", 5.8, 5.8, [x, 13.5, 146], materials.purple, { segments: 4, rotationY: Math.PI / 4 });
      for (let crenel = -2; crenel <= 2; crenel += 1) {
        addBox(`kingdom-crenel-${x}-${crenel}`, "mt-kingdom", [1.15, 1.3, 1.15], [x + crenel * 1.35, 11.6, 143], materials.white);
      }
    }
    addBox("kingdom-gate-arch", "mt-kingdom", [10.5, 4.2, 3.2], [-92, 8.7, 146], materials.stone);
    addRamp("kingdom-castle-incline", "mt-kingdom", [-92, 0.15, 137], [-92, 4.25, 151], 6.3, materials.camo, { areaId: area.id });
    addPlayableBox("kingdom-wall-top", "mt-kingdom", [17, 0.5, 7], [-92, 4.0, 154], materials.lightWood, { areaId: area.id });
    for (let index = 0; index < 6; index += 1) {
      const z = 159 + index * 3.1;
      const x = -99 + (index % 2) * 14;
      addPlayableBox(`kingdom-zigzag-${index}`, "mt-kingdom", [6.2, 0.42, 2.3], [x, 0.38 + index * 0.1, z], [materials.purple, materials.yellow, materials.teal][index % 3], { areaId: area.id });
      if (index > 0) {
        addBeamBetween(`kingdom-zigzag-rope-${index}`, "mt-kingdom", [x, 2.2, z], [x, 4.8, z], 0.06, materials.rope);
      }
    }
    for (let index = 0; index < 7; index += 1) {
      const x = -111 + index * 6.1;
      addTorus(`kingdom-ring-road-${index}`, "mt-kingdom", 1.35, 0.2, [x, 2.1, 178], index % 2 ? materials.yellow : materials.coral, { rotationY: Math.PI / 2, segments: 16 });
    }
    const dragonPath = [
      [-111, 184, 1.4], [-105, 187, 1.7], [-99, 185, 2.1], [-93, 190, 2.4], [-86, 187, 2.7],
      [-80, 192, 2.3], [-74, 190, 2.0], [-68, 196, 2.2],
    ];
    dragonPath.forEach(([x, z, y], index) => {
      addSphere(`kingdom-dragon-body-${index}`, "dragon", 2.3, [x, y, z], index % 2 ? materials.lime : materials.teal, { scaleX: 1.35, scaleY: 0.8, scaleZ: 1.1, segments: 8 });
      addSurface(`dragon-back-${index}`, x, z, 4.8, 4.2, y + 1.45, { areaId: area.id });
      if (index < dragonPath.length - 1) {
        const next = dragonPath[index + 1];
        addBeamBetween(`dragon-spine-${index}`, "dragon", [x, y + 0.7, z], [next[0], next[2] + 0.7, next[1]], 0.58, materials.lime);
      }
      addCone(`dragon-spike-${index}`, "dragon", 0.6, 1.8, [x, y + 2.6, z], materials.yellow, { segments: 5 });
    });
    addBox("kingdom-dragon-head", "dragon", [7.2, 5.2, 7.8], [-63, 4.2, 199], materials.teal, { rotationY: 0.55 });
    addBox("kingdom-dragon-snout", "dragon", [5, 2.1, 3.8], [-59.5, 3.4, 196], materials.lime, { rotationY: 0.55 });
    for (const side of [-1, 1]) {
      const eye = addSphere(`kingdom-dragon-eye-${side}`, "dragon", 0.62, [-65 + side * 2.1, 6.3, 196.5], materials.yellow, { segments: 8 });
      addAnimation((seconds) => {
        eye.scale.setScalar(0.58 + Math.sin(seconds * 2.1 + side) * 0.07);
      });
    }
    for (let index = 0; index < 5; index += 1) {
      addBeamBetween(`kingdom-rope-maze-${index}`, "mt-kingdom", [-120 + index * 4.8, 0.4, 196], [-112 + index * 3, 5.8, 184], 0.1, [materials.rope, materials.coral, materials.yellow][index % 3]);
    }
    const sword = addBox("kingdom-sword", "interaction", [0.45, 6.4, 0.8], [-116, 3.5, 166], materials.steel, { rotationZ: -0.08 });
    addBox("kingdom-sword-hilt", "interaction", [3.5, 0.4, 0.7], [-116, 5.8, 166], materials.yellow);
    addRock(-116, 166, 2.2, 2);
    registerInteraction({
      id: "kingdom-sword",
      label: "王国の剣を引き抜く",
      point: { x: -116, y: 1.1, z: 166 },
      radius: 4,
      areaId: area.id,
      activate() {
        sword.userData.pulledAt = performance.now();
        handle.notify?.("⚔️ 王国の剣を引き抜いた！");
        playTone(420, 0.13, "triangle");
        window.setTimeout(() => playTone(660, 0.18, "triangle"), 120);
      },
    });
    addAnimation((seconds, now) => {
      const pulledAt = sword.userData.pulledAt;
      if (!pulledAt) return;
      const progress = clamp((now - pulledAt) / 900, 0, 1);
      sword.position.y = 3.5 + Math.sin(progress * Math.PI / 2) * 3.2;
      sword.rotation.z = -0.08 + progress * 0.18;
    });
    defineRoute(area.id, [
      { ...area.start, id: "kingdom-start" },
      { x: -92, y: 4.25 + PLAYER_FOOT_OFFSET, z: 153, id: "castle-wall" },
      { x: -99, y: 0.55 + PLAYER_FOOT_OFFSET, z: 168, id: "zigzag-road" },
      { x: -93, y: PLAYER_GROUND_Y, z: 178, id: "ring-road" },
      { x: -92, y: 3.5 + PLAYER_FOOT_OFFSET, z: 190, id: "dragon-back" },
      { x: -61, y: PLAYER_GROUND_Y, z: 199, id: "dragon-goal", radius: 4.5 },
    ]);
  }

  function buildWaterCourse() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "wonder-amembo");
    addZonePortal(area, -166, 112, Math.PI / 2);
    addBox("amembo-water-basin", "water-course", [140, 0.16, 66], [-238, 0.07, 112], materials.water, { castShadow: false, receiveShadow: true });
    addHazard("amembo-pond", -238, 112, 140, 66, "water");
    for (const z of [79.5, 144.5]) {
      addPlayableBox(`amembo-bank-${z}`, "water-course", [144, 0.44, 2.5], [-238, 0.1, z], materials.stone, { areaId: area.id });
    }
    for (const x of [-308.5, -167.5]) {
      addPlayableBox(`amembo-bank-${x}`, "water-course", [2.5, 0.44, 67], [x, 0.1, 112], materials.stone, { areaId: area.id });
    }

    const platformColors = [materials.yellow, materials.orange, materials.lime, materials.purple, materials.teal, materials.coral];
    const coursePlatforms = [];
    for (let index = 0; index < 26; index += 1) {
      const x = -170 - index * 5.2;
      const z = 112 + Math.sin(index * 1.28) * 3.2;
      const y = 0.38 + Math.sin(index * 0.8) * 0.09;
      const entry = addPlayableBox(`amembo-step-${index}`, "water-course", [3.25, 0.52, index % 4 === 0 ? 4.2 : 3.25], [x, y / 2, z], platformColors[index % platformColors.length], { areaId: area.id, dynamic: index % 5 === 2 });
      coursePlatforms.push(entry);
      if (index % 5 === 2) {
        addAnimation((seconds) => {
          entry.surface.previousX = entry.surface.x;
          entry.surface.previousZ = entry.surface.z;
          entry.surface.previousY = entry.surface.y;
          entry.mesh.position.y = y / 2 + Math.sin(seconds * 1.8 + index) * 0.18;
          entry.mesh.rotation.z = Math.sin(seconds * 1.35 + index) * 0.08;
          entry.surface.y = entry.mesh.position.y + 0.26;
        });
      }
    }

    for (let index = 0; index < 8; index += 1) {
      const x = -190 - index * 7.2;
      const z = 91 + Math.sin(index) * 2.2;
      const log = addCylinder(`amembo-zigzag-log-${index}`, "water-course", 0.72, 7, [x, 0.5, z], index % 2 ? materials.wood : materials.lightWood, { rotationZ: Math.PI / 2, rotationY: index % 2 ? 0.25 : -0.25 });
      addSurface(`amembo-zigzag-log-${index}`, x, z, 7, 1.7, 0.88, { areaId: area.id, object: log });
    }

    for (let index = 0; index < 9; index += 1) {
      const x = -198 - index * 8.2;
      addBeamBetween(`amembo-monkey-frame-${index}`, "water-course", [x, 0.1, 133], [x, 6.2, 133], 0.24, materials.darkWood);
      if (index < 8) addBeamBetween(`amembo-monkey-bar-${index}`, "water-course", [x, 5.9, 133], [x - 8.2, 5.9, 133], 0.12, materials.steel);
    }

    for (let index = 0; index < 7; index += 1) {
      const x = -205 - index * 14;
      const ball = addSphere(`amembo-hanging-ball-${index}`, "water-course", 1.25, [x, 2.3, 126], index % 2 ? materials.yellow : materials.coral, { scaleY: 1.2 });
      addBeamBetween(`amembo-ball-rope-${index}`, "water-course", [x, 3.4, 126], [x, 7.2, 126], 0.08, materials.rope);
      addAnimation((seconds) => {
        ball.position.x = x + Math.sin(seconds * 1.15 + index) * 0.7;
        ball.rotation.z = Math.sin(seconds * 1.15 + index) * 0.2;
      });
    }

    addBox("amembo-three-second-wall", "water-course", [0.75, 7.5, 19], [-272, 3.75, 96], materials.camo, { rotationZ: -0.04 });
    for (let index = 0; index < 7; index += 1) {
      addPlayableBox(`amembo-wall-ledge-${index}`, "water-course", [0.95 - index * 0.07, 0.28, 2.1], [-271.2, 0.5 + index * 0.75, 88 + index * 2.7], materials.yellow, { areaId: area.id });
    }

    for (let index = 0; index < 22; index += 1) {
      const drop = addSphere(`amembo-sparkle-${index}`, "water-effect", 0.13 + (index % 3) * 0.04, [-230 + (index % 11) * 5.8, 0.25 + Math.floor(index / 11), 83 + (index % 2) * 58], materials.foam, { segments: 6 });
      sparkleParticles.push(drop);
      addAnimation((seconds) => {
        drop.position.y = 0.2 + ((seconds * (0.8 + (index % 4) * 0.12) + index * 0.31) % 1.8);
        drop.material.opacity = 0.3 + Math.sin(seconds * 2 + index) * 0.16;
      });
    }

    defineRoute(area.id, [
      { ...area.start, id: "amembo-start" },
      { x: -201, y: 0.48 + PLAYER_FOOT_OFFSET, z: 115, id: "single-bridge" },
      { x: -232, y: 0.48 + PLAYER_FOOT_OFFSET, z: 110, id: "floating-island" },
      { x: -263, y: 0.48 + PLAYER_FOOT_OFFSET, z: 114, id: "double-ball" },
      { x: -289, y: 0.48 + PLAYER_FOOT_OFFSET, z: 109, id: "water-dash" },
      { x: -301, y: 0.48 + PLAYER_FOOT_OFFSET, z: 114, id: "super-jump", radius: 4.2 },
    ]);
  }

  function buildYahhoy() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "yahhoy");
    addZonePortal(area, -299, 169, Math.PI);
    addBox("yahhoy-field", "yahhoy", [135, 0.08, 54], [-235, 0.035, 181], materials.grassDark, { castShadow: false });

    for (let index = 0; index < 7; index += 1) {
      const x = -290 + index * 8;
      const seesaw = addPlayableBox(`yahhoy-seesaw-${index}`, "yahhoy", [7, 0.3, 2.2], [x, 0.65, 173 + Math.sin(index) * 2.4], index % 2 ? materials.yellow : materials.coral, { areaId: area.id, dynamic: true });
      addCylinder(`yahhoy-seesaw-pivot-${index}`, "yahhoy", 0.48, 2.4, [x, 0.5, seesaw.mesh.position.z], materials.steel, { rotationZ: Math.PI / 2 });
      addAnimation((seconds) => {
        seesaw.surface.previousY = seesaw.surface.y;
        seesaw.mesh.rotation.z = Math.sin(seconds * 1.3 + index) * 0.19;
        seesaw.surface.y = 0.8 + Math.sin(seconds * 1.3 + index) * 0.07;
      });
    }

    for (let index = 0; index < 7; index += 1) {
      const x = -285 + index * 6.8;
      const drum = addCylinder(`yahhoy-drum-${index}`, "yahhoy", 1.45, 3.8, [x, 1.5, 190], [materials.orange, materials.teal, materials.purple][index % 3], { rotationZ: Math.PI / 2, segments: 12 });
      addSurface(`yahhoy-drum-${index}`, x, 190, 3.8, 2.9, 2.8, { areaId: area.id, object: drum });
      addAnimation((seconds) => {
        drum.rotation.x = seconds * (index % 2 ? 0.9 : -0.9);
      });
    }

    for (let wall = 0; wall < 3; wall += 1) {
      const x = -239 + wall * 9;
      const height = 2.5 + wall * 1.25;
      addBox(`yahhoy-three-wall-${wall}`, "yahhoy", [1.3, height, 12], [x, height / 2, 173], [materials.coral, materials.yellow, materials.teal][wall]);
      addRamp(`yahhoy-wall-ramp-${wall}`, "yahhoy", [x - 4, 0.12, 173], [x, height + 0.15, 173], 4.3, [materials.coral, materials.yellow, materials.teal][wall], { areaId: area.id });
      addRamp(`yahhoy-wall-down-${wall}`, "yahhoy", [x, height + 0.15, 173], [x + 4, 0.12, 173], 4.3, [materials.coral, materials.yellow, materials.teal][wall], { areaId: area.id });
    }

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const x = -234 + column * 4.2 + (row % 2) * 2.1;
        const z = 190 + row * 5;
        addCylinder(`yahhoy-pole-${row}-${column}`, "yahhoy", 0.22, 4 + ((row + column) % 3), [x, 2.2, z], [materials.coral, materials.yellow, materials.blue][(row + column) % 3], { segments: 8, solid: true });
      }
    }

    addRamp("yahhoy-warped-wall", "warped-wall", [-211, 0.15, 181], [-198, 9.2, 181], 13, materials.camo, { areaId: area.id });
    addPlayableBox("yahhoy-warped-top", "warped-wall", [9, 0.55, 15], [-195, 9.1, 181], materials.yellow, { areaId: area.id });
    addRamp("yahhoy-giant-slide", "warped-wall", [-191, 9.15, 181], [-178, 0.15, 181], 8, materials.purple, { areaId: area.id });
    for (let lane = 0; lane < 3; lane += 1) {
      addBeamBetween(`yahhoy-wall-rope-${lane}`, "warped-wall", [-205, 8.5, 176 + lane * 5], [-212, 0.7, 176 + lane * 5], 0.08, materials.rope);
    }
    const bell = addCylinder("yahhoy-wall-bell", "interaction", 0.65, 0.8, [-196, 10.25, 181], materials.yellow, { segments: 10 });
    registerInteraction({
      id: "yahhoy-bell",
      label: "頂上のベルを鳴らす",
      point: { x: -196, y: 9.2, z: 181 },
      radius: 4,
      areaId: area.id,
      activate() {
        bell.userData.ringAt = performance.now();
        handle.notify?.("🔔 そり立つ壁のベルを鳴らした！");
        playTone(880, 0.38, "sine");
      },
    });
    addAnimation((seconds, now) => {
      const progress = bell.userData.ringAt ? clamp((now - bell.userData.ringAt) / 900, 0, 1) : 1;
      bell.rotation.z = progress < 1 ? Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.55 : 0;
    });
    defineRoute(area.id, [
      { ...area.start, id: "yahhoy-start" },
      { x: -264, y: 0.8 + PLAYER_FOOT_OFFSET, z: 173, id: "seesaw" },
      { x: -245, y: 2.8 + PLAYER_FOOT_OFFSET, z: 190, id: "rolling-drums" },
      { x: -222, y: PLAYER_GROUND_Y, z: 199, id: "pole-labyrinth" },
      { x: -195, y: 9.4 + PLAYER_FOOT_OFFSET, z: 181, id: "warped-wall" },
      { x: -174, y: PLAYER_GROUND_Y, z: 181, id: "yahhoy-goal" },
    ]);
  }

  function buildDeKairiki() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "de-kairiki");
    addZonePortal(area, -104, 204, Math.PI);
    for (let step = 0; step < 12; step += 1) {
      const y = 0.45 + step * 0.68;
      addPlayableBox(`kairiki-super-stair-${step}`, "de-kairiki", [7.5, 0.42, 2.5], [-104, y - 0.21, 214 + step * 2.3], step % 2 ? materials.coral : materials.orange, { areaId: area.id });
    }
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const x = -142 + column * 5.3;
        const z = 235 + row * 4;
        addBeamBetween(`kairiki-rope-forest-${row}-${column}`, "de-kairiki", [x, 0.2, z], [x + Math.sin(column) * 2.2, 7.5, z + Math.cos(row) * 1.7], 0.085, [materials.rope, materials.yellow, materials.coral][(row + column) % 3]);
      }
    }

    const fortX = -88;
    const fortZ = 250;
    for (const [offsetX, offsetZ] of [[-6, -7], [6, -7], [-6, 7], [6, 7]]) {
      addBox(`kairiki-fort-post-${offsetX}-${offsetZ}`, "fortress", [0.9, 13, 0.9], [fortX + offsetX, 6.5, fortZ + offsetZ], materials.darkWood, { solid: true });
    }
    addPlayableBox("kairiki-fort-platform", "fortress", [15, 0.65, 16], [fortX, 9.1, fortZ], materials.lightWood, { areaId: area.id });
    for (let side = 0; side < 4; side += 1) {
      const rotationY = side * Math.PI / 2;
      addBox(`kairiki-fort-banner-${side}`, "fortress", [5, 2.5, 0.18], [fortX + Math.sin(rotationY) * 7.2, 11.2, fortZ + Math.cos(rotationY) * 7.2], side % 2 ? materials.coral : materials.yellow, { rotationY });
    }
    addRamp("kairiki-fort-climb", "fortress", [-104, 8.35, 239], [-94, 9.45, 245], 4, materials.wood, { areaId: area.id });
    for (let index = 0; index < 16; index += 1) {
      const amount = index / 15;
      const z = 259 + amount * 27;
      const y = 9.25 - Math.sin(amount * Math.PI) * 1.1;
      const plank = addPlayableBox(`kairiki-bridge-plank-${index}`, "suspension-bridge", [4.4, 0.3, 1.3], [fortX, y, z], index % 2 ? materials.wood : materials.lightWood, { areaId: area.id, dynamic: true });
      addAnimation((seconds) => {
        plank.surface.previousY = plank.surface.y;
        plank.mesh.position.y = y + Math.sin(seconds * 1.35 + index * 0.46) * 0.08;
        plank.mesh.rotation.z = Math.sin(seconds * 1.2 + index) * 0.045;
        plank.surface.y = plank.mesh.position.y + 0.15;
      });
      for (const x of [fortX - 2.6, fortX + 2.6]) {
        addBeamBetween(`kairiki-bridge-hanger-${index}-${x}`, "suspension-bridge", [x, y, z], [x, y + 2.4, z], 0.055, materials.rope);
      }
    }
    addRamp("kairiki-bridge-descent", "fortress", [fortX, 9.1, 286], [fortX, 0.15, 297], 5, materials.wood, { areaId: area.id });

    for (let index = 0; index < 8; index += 1) {
      const ring = addTorus(`kairiki-ring-action-${index}`, "de-kairiki", 1.1, 0.18, [-139 + index * 6.2, 5.4 + Math.sin(index) * 0.5, 263], materials.yellow, { rotationY: Math.PI / 2, segments: 16 });
      addBeamBetween(`kairiki-ring-rope-${index}`, "de-kairiki", [ring.position.x, ring.position.y + 1, 263], [ring.position.x, 8.4, 263], 0.07, materials.rope);
      addAnimation((seconds) => {
        ring.rotation.z = Math.sin(seconds * 1.2 + index) * 0.28;
      });
    }

    const finishBell = addCylinder("kairiki-finish-bell", "interaction", 0.9, 1.1, [-88, 3.5, 302], materials.yellow, { segments: 12 });
    addBeamBetween("kairiki-bell-frame-left", "de-kairiki", [-92, 0, 302], [-92, 6.5, 302], 0.3, materials.darkWood);
    addBeamBetween("kairiki-bell-frame-right", "de-kairiki", [-84, 0, 302], [-84, 6.5, 302], 0.3, materials.darkWood);
    addBeamBetween("kairiki-bell-frame-top", "de-kairiki", [-92, 6.3, 302], [-84, 6.3, 302], 0.3, materials.darkWood);
    registerInteraction({
      id: "kairiki-bell",
      label: "怪力の鐘を鳴らす",
      point: { x: -88, y: PLAYER_GROUND_Y, z: 302 },
      radius: 4,
      areaId: area.id,
      activate() {
        finishBell.userData.ringAt = performance.now();
        handle.notify?.("💪 あの鐘を鳴らした！マッスル！");
        playTone(620, 0.42, "sine");
      },
    });
    defineRoute(area.id, [
      { ...area.start, id: "kairiki-start" },
      { x: -104, y: 8.1 + PLAYER_FOOT_OFFSET, z: 239, id: "super-stairs" },
      { x: -88, y: 9.45 + PLAYER_FOOT_OFFSET, z: 250, id: "great-fort" },
      { x: -88, y: 8.3 + PLAYER_FOOT_OFFSET, z: 274, id: "log-bridge" },
      { x: -88, y: PLAYER_GROUND_Y, z: 298, id: "bell-yard" },
      { x: -88, y: PLAYER_GROUND_Y, z: 304, id: "kairiki-goal", radius: 4 },
    ]);
  }

  function buildMecyaForest() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "mecya-forest");
    addZonePortal(area, -170, 240, Math.PI / 2);
    const random = seededRandom(717);
    for (let index = 0; index < 38; index += 1) {
      const x = -176 - random() * 125;
      const z = 218 + random() * 65;
      if (Math.abs(z - 250) < 8 && index % 3 !== 0) continue;
      addTree(x, z, 0.78 + random() * 0.46, 100 + index, "forest");
    }

    for (let step = 0; step < 10; step += 1) {
      const x = -175 - step * 3.1;
      const y = 0.5 + step * 0.72;
      addPlayableBox(`forest-mirror-stair-${step}`, "mecya-forest", [3.4, 0.42, 5], [x, y - 0.21, 250], step % 2 ? materials.teal : materials.lightWood, { areaId: area.id });
    }
    for (let index = 0; index < 14; index += 1) {
      const x = -207 - index * 4.7;
      const z = 250 + Math.sin(index * 1.1) * 4.2;
      const y = 7.2 - Math.sin(index / 13 * Math.PI) * 0.9;
      const island = addPlayableBox(`forest-island-${index}`, "mecya-forest", [3.2, 0.34, 3.2], [x, y - 0.17, z], [materials.wood, materials.yellow, materials.teal][index % 3], { areaId: area.id, dynamic: true });
      addBeamBetween(`forest-island-hanger-${index}`, "mecya-forest", [x, y, z], [x, 12.5, z], 0.065, materials.rope);
      addAnimation((seconds) => {
        island.surface.previousX = island.surface.x;
        island.surface.previousZ = island.surface.z;
        island.surface.previousY = island.surface.y;
        island.mesh.position.x = x + Math.sin(seconds * 0.92 + index) * 0.32;
        island.mesh.position.z = z + Math.cos(seconds * 0.83 + index) * 0.25;
        island.mesh.position.y = y - 0.17 + Math.sin(seconds * 1.15 + index) * 0.12;
        island.mesh.rotation.z = Math.sin(seconds * 0.9 + index) * 0.07;
        island.surface.x = island.mesh.position.x;
        island.surface.z = island.mesh.position.z;
        island.surface.y = island.mesh.position.y + 0.17;
      });
    }
    for (let row = 0; row < 8; row += 1) {
      addBeamBetween(`forest-spider-horizontal-${row}`, "mecya-forest", [-262, 3.3 + row * 0.9, 237], [-282, 3.3 + row * 0.9, 237], 0.065, materials.rope);
    }
    for (let column = 0; column < 11; column += 1) {
      addBeamBetween(`forest-spider-vertical-${column}`, "mecya-forest", [-262 - column * 2, 3.2, 237], [-262 - column * 2, 10, 237], 0.065, materials.rope);
    }
    for (let index = 0; index < 12; index += 1) {
      const x = -258 - index * 3.1;
      addTorus(`forest-net-tunnel-${index}`, "mecya-forest", 2.35, 0.12, [x, 8.7, 264], materials.rope, { rotationY: Math.PI / 2, segments: 16 });
      if (index < 11) addPlayableBox(`forest-tunnel-floor-${index}`, "mecya-forest", [3.2, 0.28, 3.1], [x, 6.35, 264], materials.wood, { areaId: area.id });
    }
    const logSwing = addCylinder("forest-log-swing", "mecya-forest", 0.9, 7, [-277, 8.2, 224], materials.wood, { rotationZ: Math.PI / 2 });
    addBeamBetween("forest-log-swing-rope-left", "mecya-forest", [-280, 8.2, 224], [-280, 14, 224], 0.08, materials.rope);
    addBeamBetween("forest-log-swing-rope-right", "mecya-forest", [-274, 8.2, 224], [-274, 14, 224], 0.08, materials.rope);
    addAnimation((seconds) => {
      logSwing.rotation.x = Math.sin(seconds * 0.82) * 0.38;
      logSwing.position.z = 224 + Math.sin(seconds * 0.82) * 1.3;
    });
    addPlayableBox("forest-zip-launch-platform", "zipline", [12, 0.6, 12], [-294, 12.1, 250], materials.lightWood, { areaId: area.id });
    for (const [offsetX, offsetZ] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
      addBox(`forest-zip-launch-post-${offsetX}-${offsetZ}`, "zipline", [0.75, 13, 0.75], [-294 + offsetX, 6.5, 250 + offsetZ], materials.darkWood, { solid: true });
    }
    addRamp("forest-launch-ramp", "mecya-forest", [-290, 6.5, 264], [-294, 12.4, 256], 4.2, materials.wood, { areaId: area.id });
    defineRoute(area.id, [
      { ...area.start, id: "forest-start" },
      { x: -201, y: 7.2 + PLAYER_FOOT_OFFSET, z: 250, id: "mirror-stairs" },
      { x: -231, y: 6.4 + PLAYER_FOOT_OFFSET, z: 251, id: "island-hopping" },
      { x: -260, y: 6.7 + PLAYER_FOOT_OFFSET, z: 249, id: "zigzag-crossing" },
      { x: -281, y: 6.5 + PLAYER_FOOT_OFFSET, z: 264, id: "net-tunnel" },
      { x: -294, y: 12.4 + PLAYER_FOOT_OFFSET, z: 250, id: "forest-goal", radius: 4.5 },
    ]);
  }

  function buildMtKingActivities() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "mt-king");
    addZonePortal(area, -106, 284, Math.PI);
    addBox("mtking-sports-field", "mt-king", [104, 0.08, 40], [-106, 0.035, 308], materials.grassDark, { castShadow: false });
    for (let index = 0; index < 5; index += 1) {
      const x = -145 + index * 12;
      const trampoline = addPlayableBox(`mtking-trampoline-${index}`, "mt-king", [8.5, 0.55, 8.5], [x, 0.28, 296], materials.lime, { areaId: area.id });
      trampoline.surface.trampoline = true;
      addTorus(`mtking-trampoline-ring-${index}`, "mt-king", 4.5, 0.35, [x, 0.58, 296], materials.blue, { rotationX: Math.PI / 2, segments: 24 });
      for (let post = 0; post < 8; post += 1) {
        const angle = post / 8 * Math.PI * 2;
        const postX = x + Math.cos(angle) * 4.6;
        const postZ = 296 + Math.sin(angle) * 4.6;
        addBox(`mtking-trampoline-net-post-${index}-${post}`, "mt-king", [0.12, 3.8, 0.12], [postX, 1.9, postZ], materials.steel);
        const nextAngle = (post + 1) / 8 * Math.PI * 2;
        const nextX = x + Math.cos(nextAngle) * 4.6;
        const nextZ = 296 + Math.sin(nextAngle) * 4.6;
        addBeamBetween(`mtking-trampoline-net-top-${index}-${post}`, "mt-king", [postX, 3.8, postZ], [nextX, 3.8, nextZ], 0.045, materials.white);
        for (let netRow = 0; netRow < 4; netRow += 1) {
          const rowY = 0.72 + netRow * 0.76;
          addBeamBetween(`mtking-trampoline-net-row-${index}-${post}-${netRow}`, "mt-king", [postX, rowY, postZ], [nextX, rowY, nextZ], 0.026, materials.white);
        }
        for (let strand = 1; strand <= 3; strand += 1) {
          const amount = strand / 4;
          const strandX = lerp(postX, nextX, amount);
          const strandZ = lerp(postZ, nextZ, amount);
          addBeamBetween(`mtking-trampoline-net-strand-${index}-${post}-${strand}`, "mt-king", [strandX, 0.62, strandZ], [strandX, 3.8, strandZ], 0.024, materials.white);
        }
      }
      addAnimation((seconds) => {
        trampoline.mesh.scale.y = 0.5 + Math.sin(seconds * 2.5 + index) * 0.05;
      });
    }
    addBox("mtking-slide-hill", "mt-king", [28, 10, 24], [-75, 5, 308], materials.grass);
    addRamp("mtking-grass-slide", "mt-king", [-87, 10.3, 308], [-57, 0.15, 308], 8.5, materials.lime, { areaId: area.id });
    let rideSled = null;
    for (let lane = -1; lane <= 1; lane += 1) {
      addBox(`mtking-slide-lane-${lane}`, "mt-king", [30, 0.08, 0.3], [-72, 5.2, 308 + lane * 2.7], lane === 0 ? materials.yellow : materials.white, { rotationZ: -0.33 });
      const sledGroup = new constructors.Group();
      sledGroup.name = `mtking-slide-sled-group-${lane}`;
      sledGroup.position.set(-86 + Math.abs(lane) * 1.15, 10.1 - Math.abs(lane) * 0.18, 308 + lane * 2.7);
      sledGroup.rotation.z = -0.33;
      root.add(sledGroup);
      addBox(`mtking-slide-sled-${lane}`, "mt-king", [3.15, 0.34, 2.15], [0, 0, 0], lane === 0 ? materials.orange : materials.coral, { parent: sledGroup });
      addBox(`mtking-slide-sled-nose-${lane}`, "mt-king", [0.38, 0.78, 2.15], [1.38, 0.34, 0], lane === 0 ? materials.yellow : materials.pink, { rotationZ: 0.28, parent: sledGroup });
      for (const lateral of [-0.82, 0.82]) {
        addBeamBetween(`mtking-slide-sled-runner-${lane}-${lateral}`, "mt-king", [-1.35, -0.28, lateral], [1.35, -0.28, lateral], 0.075, materials.steel, { parent: sledGroup, segments: 10 });
      }
      addBeamBetween(`mtking-slide-sled-rope-${lane}`, "mt-king", [1.45, 0.46, 0], [3.1, 0.82, 0], 0.07, materials.rope, { parent: sledGroup });
      if (lane === 0) rideSled = sledGroup;
    }
    registerInteraction({
      id: "mtking-grass-sled",
      label: "芝すべり：ソリに乗る",
      point: { x: -87, y: 10.5 + PLAYER_FOOT_OFFSET, z: 308 },
      radius: 4.5,
      areaId: area.id,
      activate: () => beginLocalRide(
        "mtking-grass-sled",
        area.id,
        { x: -87, y: 10.5 + PLAYER_FOOT_OFFSET, z: 308 },
        { x: -57, y: 0.25 + PLAYER_FOOT_OFFSET, z: 308 },
        3_400,
        rideSled,
        "芝すべり",
        1,
        -PLAYER_FOOT_OFFSET,
        0.12,
      ),
    });
    addBox("mtking-boat-pond", "mt-king", [44, 0.15, 25], [-126, 0.07, 317], materials.water, { castShadow: false });
    addHazard("mtking-boat-pond", -126, 317, 44, 25, "water");
    addPlayableBox("mtking-boat-dock", "mt-king", [17, 0.5, 5], [-126, 0.25, 303], materials.wood, { areaId: area.id });
    let rideBoatGroup = null;
    for (let index = 0; index < 3; index += 1) {
      const baseX = -139 + index * 13;
      const boatGroup = new constructors.Group();
      boatGroup.name = `mtking-pedal-boat-group-${index}`;
      boatGroup.position.set(baseX, 0, 317);
      boatGroup.rotation.y = index * 0.5;
      root.add(boatGroup);
      addBox(`mtking-pedal-boat-${index}`, "mt-king", [5.2, 0.85, 3.1], [0, 0.25, 0], materials.white, { parent: boatGroup });
      addBox(`mtking-pedal-boat-seat-${index}`, "mt-king", [2.5, 1.45, 2.2], [0, 1.2, 0], materials.red, { parent: boatGroup });
      addBox(`mtking-pedal-boat-window-${index}`, "mt-king", [1.7, 0.75, 0.12], [0, 1.55, -1.15], materials.blue, { parent: boatGroup });
      addBox(`mtking-pedal-boat-roof-${index}`, "mt-king", [3.1, 0.2, 2.6], [0, 2.08, 0], materials.red, { parent: boatGroup });
      for (const side of [-1, 1]) {
        addBeamBetween(`mtking-pedal-windshield-frame-${index}-${side}`, "mt-king", [side * 0.92, 1.14, -1.22], [side * 0.92, 1.96, -1.22], 0.055, materials.black, { parent: boatGroup });
      }
      addBeamBetween(`mtking-pedal-windshield-frame-top-${index}`, "mt-king", [-0.92, 1.96, -1.22], [0.92, 1.96, -1.22], 0.055, materials.black, { parent: boatGroup });
      const steeringWheel = addTorus(`mtking-pedal-steering-wheel-${index}`, "mt-king", 0.42, 0.075, [0, 1.22, -0.82], materials.black, { segments: 16, parent: boatGroup });
      for (let spoke = 0; spoke < 3; spoke += 1) {
        const angle = spoke / 3 * Math.PI * 2;
        addBeamBetween(`mtking-pedal-steering-spoke-${index}-${spoke}`, "mt-king", [0, 1.22, -0.84], [Math.cos(angle) * 0.34, 1.22 + Math.sin(angle) * 0.34, -0.84], 0.035, materials.black, { parent: boatGroup });
      }
      addBeamBetween(`mtking-pedal-crank-${index}`, "mt-king", [-0.56, 0.72, -0.3], [0.56, 0.72, -0.3], 0.08, materials.steel, { parent: boatGroup, segments: 10 });
      addBox(`mtking-pedal-left-${index}`, "mt-king", [0.5, 0.12, 0.28], [-0.72, 0.67, -0.3], materials.black, { parent: boatGroup });
      addBox(`mtking-pedal-right-${index}`, "mt-king", [0.5, 0.12, 0.28], [0.72, 0.77, -0.3], materials.black, { parent: boatGroup });
      for (const lateral of [-1.95, 1.95]) addTorus(`mtking-pedal-wheel-${index}-${lateral}`, "mt-king", 0.72, 0.14, [lateral, 0.45, 0], materials.red, { rotationY: Math.PI / 2, segments: 12, parent: boatGroup });
      if (index === 0) rideBoatGroup = boatGroup;
      addAnimation((seconds) => {
        const isRiding = index === 0 && gameplay.ride?.id === "mtking-pedal-boat";
        steeringWheel.rotation.z = isRiding
          ? -(gameplay.ride.steeringOffset || 0) * 0.42
          : Math.sin(seconds * 0.8 + index) * 0.55;
        if (isRiding) return;
        const x = baseX + Math.sin(seconds * 0.45 + index) * 0.65;
        const z = 317 + Math.sin(seconds * 0.55 + index * 2) * 3.2;
        boatGroup.position.set(x, 0, z);
        boatGroup.rotation.y = index * 0.5 + Math.sin(seconds * 0.3 + index) * 0.3;
      });
    }
    registerInteraction({
      id: "mtking-pedal-boat",
      label: "ペダルボートに乗って池を周遊",
      point: { x: -134, y: 0.55 + PLAYER_FOOT_OFFSET, z: 303 },
      radius: 6,
      areaId: area.id,
      activate: () => beginPathRide(
        "mtking-pedal-boat",
        area.id,
        [
          { x: -139, y: 0.68 + PLAYER_FOOT_OFFSET, z: 315 },
          { x: -143, y: 0.68 + PLAYER_FOOT_OFFSET, z: 321 },
          { x: -126, y: 0.68 + PLAYER_FOOT_OFFSET, z: 325 },
          { x: -109, y: 0.68 + PLAYER_FOOT_OFFSET, z: 319 },
          { x: -116, y: 0.68 + PLAYER_FOOT_OFFSET, z: 310 },
          { x: -126, y: 0.68 + PLAYER_FOOT_OFFSET, z: 304 },
        ],
        12_000,
        rideBoatGroup,
        "ペダルボート",
        2,
        -0.68 - PLAYER_FOOT_OFFSET,
      ),
    });
    defineRoute(area.id, [
      { ...area.start, id: "mtking-start" },
      { x: -145, y: 0.6 + PLAYER_FOOT_OFFSET, z: 296, id: "trampoline" },
      { x: -87, y: 10.5 + PLAYER_FOOT_OFFSET, z: 308, id: "grass-slide-top" },
      { x: -58, y: PLAYER_GROUND_Y, z: 308, id: "grass-slide-bottom" },
      { x: -126, y: 0.52 + PLAYER_FOOT_OFFSET, z: 303, id: "boat-dock", radius: 4 },
    ]);
  }

  function buildZipSlides() {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === "zip-slide");
    const goStart = { x: -448, y: 12.4 + PLAYER_FOOT_OFFSET, z: 225 };
    const goEnd = { x: -214, y: 3.095 + PLAYER_FOOT_OFFSET, z: 121 };
    const returnStart = { x: -205, y: 10.95 + PLAYER_FOOT_OFFSET, z: 132 };
    const returnEnd = { x: -386, y: 3.295 + PLAYER_FOOT_OFFSET, z: 219 };
    const goCableStart = { ...goStart, y: goStart.y + 1.2 };
    const goCableEnd = { ...goEnd, y: goEnd.y + 1.2 };
    const returnCableStart = { ...returnStart, y: returnStart.y + 1.2 };
    const returnCableEnd = { ...returnEnd, y: returnEnd.y + 1.2 };
    addBeamBetween("zip-go-cable", "zipline", [goCableStart.x, goCableStart.y, goCableStart.z], [goCableEnd.x, goCableEnd.y, goCableEnd.z], 0.11, materials.steel, { segments: 8 });
    addBeamBetween("zip-go-safety", "zipline", [goCableStart.x + 0.6, goCableStart.y - 0.5, goCableStart.z], [goCableEnd.x + 0.6, goCableEnd.y - 0.5, goCableEnd.z], 0.055, materials.rope);
    addBeamBetween("zip-return-cable", "zipline", [returnCableStart.x, returnCableStart.y, returnCableStart.z], [returnCableEnd.x, returnCableEnd.y, returnCableEnd.z], 0.11, materials.steel, { segments: 8 });
    addBeamBetween("zip-return-safety", "zipline", [returnCableStart.x - 0.6, returnCableStart.y - 0.5, returnCableStart.z], [returnCableEnd.x - 0.6, returnCableEnd.y - 0.5, returnCableEnd.z], 0.055, materials.rope);

    addPlayableBox("zip-go-launch", "zipline", [14, 0.6, 12], [goStart.x, 12.1, goStart.z], materials.lightWood, { areaId: area.id });
    for (const [offsetX, offsetZ] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) {
      addBox(`zip-go-launch-post-${offsetX}-${offsetZ}`, "zipline", [0.7, 13, 0.7], [goStart.x + offsetX, 6.5, goStart.z + offsetZ], materials.darkWood, { solid: true });
    }
    for (let step = 0; step < 13; step += 1) {
      const y = 0.5 + step * 0.91;
      addPlayableBox(`zip-go-stair-${step}`, "zipline", [5.5, 0.42, 2.2], [goStart.x, y - 0.21, 195 + step * 2.2], step % 2 ? materials.orange : materials.wood, { areaId: area.id });
    }

    addPlayableBox("zip-go-landing", "zipline", [14, 0.55, 12], [goEnd.x, 2.82, goEnd.z], materials.lightWood, { areaId: area.id });
    for (const [offsetX, offsetZ] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) {
      addBox(`zip-go-landing-post-${offsetX}-${offsetZ}`, "zipline", [0.65, 4, 0.65], [goEnd.x + offsetX, 2, goEnd.z + offsetZ], materials.darkWood, { solid: true });
    }
    for (let step = 0; step < 12; step += 1) {
      const y = 0.5 + step * 0.88;
      addPlayableBox(`zip-return-stair-${step}`, "zipline", [5.5, 0.42, 2.2], [returnStart.x, y - 0.21, 105 + step * 2.2], step % 2 ? materials.orange : materials.wood, { areaId: area.id });
    }
    addPlayableBox("zip-return-launch", "zipline", [12, 0.6, 12], [returnStart.x, 10.65, returnStart.z], materials.lightWood, { areaId: area.id });
    addPlayableBox("zip-return-landing", "zipline", [13, 0.55, 12], [returnEnd.x, 3.02, returnEnd.z], materials.lightWood, { areaId: area.id });

    const trolleyGo = addBox("zip-go-trolley", "zipline", [1.3, 0.5, 0.85], [goCableStart.x, goCableStart.y, goCableStart.z], materials.steel);
    const trolleyReturn = addBox("zip-return-trolley", "zipline", [1.3, 0.5, 0.85], [returnCableStart.x, returnCableStart.y, returnCableStart.z], materials.steel);
    const addOrientationHandle = (prefix, trolley) => {
      addBox(`${prefix}-handle-silver-housing`, "zipline-control-handle", [0.9, 0.62, 0.5], [0, -0.42, 0], materials.steel, { parent: trolley });
      addCylinder(`${prefix}-handle-red-axis`, "zipline-control-handle", 0.22, 0.68, [0, -0.43, -0.3], materials.red, { rotationX: Math.PI / 2, segments: 16, parent: trolley });
      for (const lateral of [-0.58, 0.58]) {
        addBox(`${prefix}-handle-red-edge-${lateral}`, "zipline-control-handle", [0.18, 1.5, 0.22], [lateral, -1.35, 0], materials.red, { parent: trolley });
        addBox(`${prefix}-handle-black-grip-${lateral}`, "zipline-control-handle", [0.12, 1.22, 0.25], [lateral, -1.32, -0.02], materials.black, { parent: trolley });
        addBeamBetween(`${prefix}-harness-line-${lateral}`, "zipline-control-handle", [lateral, -1.2, 0], [lateral * 1.35, -1.75, 0.18], 0.065, materials.black, { parent: trolley });
      }
      addBox(`${prefix}-handle-red-bottom`, "zipline-control-handle", [1.34, 0.2, 0.22], [0, -2.02, 0], materials.red, { parent: trolley });
      addBox(`${prefix}-handle-black-bottom-grip`, "zipline-control-handle", [1.12, 0.13, 0.25], [0, -1.99, -0.02], materials.black, { parent: trolley });
    };
    addOrientationHandle("zip-go-control", trolleyGo);
    addOrientationHandle("zip-return-control", trolleyReturn);
    trolleyGo.rotation.y = Math.atan2(goEnd.x - goStart.x, goEnd.z - goStart.z);
    trolleyReturn.rotation.y = Math.atan2(returnEnd.x - returnStart.x, returnEnd.z - returnStart.z);
    addAnimation((seconds) => {
      if (!gameplay.ride || gameplay.ride.id !== "zip-go") {
        const amount = easeInOut((Math.sin(seconds * 0.36) + 1) / 2);
        trolleyGo.position.set(lerp(goCableStart.x, goCableEnd.x, amount), lerp(goCableStart.y, goCableEnd.y, amount) - Math.sin(amount * Math.PI) * 1.4, lerp(goCableStart.z, goCableEnd.z, amount));
      }
      if (!gameplay.ride || gameplay.ride.id !== "zip-return") {
        const amount = easeInOut((Math.sin(seconds * 0.31 + 2.1) + 1) / 2);
        trolleyReturn.position.set(lerp(returnCableStart.x, returnCableEnd.x, amount), lerp(returnCableStart.y, returnCableEnd.y, amount) - Math.sin(amount * Math.PI) * 1.1, lerp(returnCableStart.z, returnCableEnd.z, amount));
      }
    });
    registerInteraction({
      id: "zip-go",
      label: "256m級ロングジップ（行き）",
      point: goStart,
      radius: 4.2,
      areaId: area.id,
      activate: () => beginZipRide("zip-go", goStart, goEnd, 10_800, trolleyGo),
    });
    registerInteraction({
      id: "zip-return",
      label: "201m級ロングジップ（帰り）",
      point: returnStart,
      radius: 4.2,
      areaId: area.id,
      activate: () => beginZipRide("zip-return", returnStart, returnEnd, 10_200, trolleyReturn),
    });
    defineRoute(area.id, [
      { ...area.start, id: "zip-start", radius: 4.5 },
      { x: goEnd.x, y: goEnd.y, z: goEnd.z, id: "zip-goal", radius: 5 },
    ]);
  }

  function buildAreaWayfinding() {
    const locations = [
      ["chibidoland", -135, 88, Math.PI],
      ["mt-kingdom", -111, 125, Math.PI],
      ["wonder-amembo", -158, 137, Math.PI / 2],
      ["yahhoy", -282, 154, Math.PI],
      ["de-kairiki", -75, 205, Math.PI],
      ["mecya-forest", -157, 231, Math.PI / 2],
      ["mt-king", -76, 281, Math.PI],
      ["zip-slide", -288, 222, Math.PI / 2],
    ];
    for (const [areaId, x, z, rotationY] of locations) {
      const area = AREA_DEFINITIONS.find((candidate) => candidate.id === areaId);
      addBox(`wayfinding-${areaId}-post`, "signage", [0.3, 3.4, 0.3], [x, 1.7, z], materials.darkWood);
      const texture = createSignTexture(area.short, `${area.icon} ${area.japanese}`, area.color);
      const signMaterial = createMaterial(`wayfinding-${areaId}`, 0xffffff, { map: texture, roughness: 0.6, side: 2 });
      addPlane(`wayfinding-${areaId}`, "signage", [5.6, 2.1], [x, 3, z], signMaterial, { rotationY });
    }
  }

  function registerInteraction(definition) {
    const interaction = { radius: ACTION_DISTANCE, ...definition };
    interactions.push(interaction);
    return interaction;
  }

  function registerEntryInteraction() {
    registerInteraction({
      id: "enter-adventure",
      label: "GREENIAで遊ぶ",
      activeLabel: "GREENIAを出る",
      point: { x: FACILITY.entrance.x, y: PLAYER_GROUND_Y, z: FACILITY.entrance.z },
      radius: 6,
      allowWhenInactive: true,
      activate: () => gameplay.active ? exitPlayMode() : enterPlayMode(),
    });
  }

  function playTone(frequency = 440, duration = 0.12, type = "sine") {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      gameplay.audioContext ||= new Context();
      const oscillator = gameplay.audioContext.createOscillator();
      const gain = gameplay.audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, gameplay.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, gameplay.audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, gameplay.audioContext.currentTime + duration);
      oscillator.connect(gain).connect(gameplay.audioContext.destination);
      oscillator.start();
      oscillator.stop(gameplay.audioContext.currentTime + duration + 0.02);
    } catch {
      // Audio is optional and may be blocked by the browser.
    }
  }

  function installUi() {
    const style = document.createElement("style");
    style.id = "voxcel-athletic-styles";
    style.textContent = `
.voxcel-athletic-action{position:fixed;left:50%;bottom:76px;z-index:42;transform:translateX(-50%);min-width:250px;padding:13px 20px;border:1px solid rgba(255,255,255,.3);border-radius:15px;background:linear-gradient(135deg,rgba(11,72,57,.96),rgba(27,157,124,.94));box-shadow:0 12px 34px rgba(0,0,0,.42);color:#fff;font:850 13px/1.2 system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.voxcel-athletic-action:hover{filter:brightness(1.12)}.voxcel-athletic-action:active{transform:translateX(-50%) scale(.97)}.voxcel-athletic-action:focus-visible{outline:3px solid #ffe078;outline-offset:3px}.voxcel-athletic-action[hidden]{display:none!important}.voxcel-athletic-action:disabled{cursor:default;opacity:.82}
.voxcel-athletic-hud{position:fixed;top:12px;left:50%;z-index:38;display:grid;width:min(720px,calc(100vw - 300px));transform:translateX(-50%);overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:17px;background:linear-gradient(135deg,rgba(8,26,31,.92),rgba(18,74,61,.88));box-shadow:0 10px 35px rgba(0,0,0,.34);color:#fff;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:auto}
.voxcel-athletic-hud[hidden]{display:none!important}.voxcel-athletic-hud-main{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:9px 13px}.voxcel-athletic-brand{font-size:10px;font-weight:950;letter-spacing:.12em;color:#8ff0c7}.voxcel-athletic-area{margin-top:2px;overflow:hidden;font-size:14px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.voxcel-athletic-stat{min-width:62px;text-align:center}.voxcel-athletic-stat strong{display:block;color:#ffe47a;font:900 15px/1.1 ui-monospace,SFMono-Regular,monospace}.voxcel-athletic-stat span{display:block;margin-top:2px;color:rgba(255,255,255,.55);font-size:7px;font-weight:800;letter-spacing:.12em}.voxcel-athletic-progress{height:4px;background:rgba(255,255,255,.1)}.voxcel-athletic-progress>i{display:block;width:0;height:100%;background:linear-gradient(90deg,#55dfad,#ffe15a,#ff795d);box-shadow:0 0 12px rgba(255,225,90,.75);transition:width .18s ease}.voxcel-athletic-course-strip{display:flex;gap:5px;padding:7px 9px 9px;overflow-x:auto;border-top:1px solid rgba(255,255,255,.08);scrollbar-width:none}.voxcel-athletic-course-strip::-webkit-scrollbar{display:none}.voxcel-athletic-course{flex:0 0 auto;padding:5px 8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;font:850 8px/1 system-ui;cursor:pointer;white-space:nowrap}.voxcel-athletic-course:hover,.voxcel-athletic-course.is-active{border-color:#ffe47a;background:rgba(255,228,122,.16)}.voxcel-athletic-course.is-complete::after{content:' ✓';color:#7bf0b6}.voxcel-athletic-help{padding:5px 10px 7px;color:rgba(255,255,255,.62);font-size:8px;font-weight:750;text-align:center}
.voxcel-athletic-mobile{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:45;display:none;grid-template-columns:repeat(2,58px);gap:9px;pointer-events:none}.voxcel-athletic-mobile[hidden]{display:none!important}.voxcel-athletic-mobile button{display:grid;place-items:center;width:58px;height:58px;border:1px solid rgba(255,255,255,.26);border-radius:50%;background:rgba(8,33,40,.86);box-shadow:0 6px 20px rgba(0,0,0,.36);color:#fff;font:900 11px/1 system-ui;pointer-events:auto;touch-action:none}.voxcel-athletic-mobile .jump{grid-row:1 / span 2;width:72px;height:72px;align-self:end;margin-left:-14px;background:linear-gradient(145deg,rgba(32,150,117,.95),rgba(17,92,113,.95));font-size:24px}.voxcel-athletic-mobile button:active{transform:scale(.92);filter:brightness(1.2)}
body.voxcel-athletic-playing #voxcelAthleticAction{bottom:88px}
@media(max-width:900px){.voxcel-athletic-hud{top:max(112px,env(safe-area-inset-top) + 104px);width:calc(100vw - 20px)}.voxcel-athletic-hud-main{grid-template-columns:minmax(0,1fr) auto auto;padding:7px 10px}.voxcel-athletic-area{font-size:12px}.voxcel-athletic-help{display:none}.voxcel-athletic-course-strip{padding-block:6px}.voxcel-athletic-action{bottom:max(92px,env(safe-area-inset-bottom) + 82px);width:min(270px,68vw);min-width:0;padding:11px 13px;font-size:12px}.voxcel-athletic-mobile:not([hidden]){display:grid}}
@media(max-height:560px) and (orientation:landscape){.voxcel-athletic-hud{top:6px;left:50%;width:min(610px,calc(100vw - 260px))}.voxcel-athletic-course-strip{display:none}.voxcel-athletic-mobile{grid-template-columns:repeat(3,48px)}.voxcel-athletic-mobile button,.voxcel-athletic-mobile .jump{width:48px;height:48px;margin:0}.voxcel-athletic-action{bottom:10px}}
@media(prefers-reduced-motion:reduce){.voxcel-athletic-progress>i{transition:none}}
`;
    document.head.append(style);

    actionButton = document.createElement("button");
    actionButton.id = "voxcelAthleticAction";
    actionButton.className = "voxcel-athletic-action";
    actionButton.type = "button";
    actionButton.hidden = true;
    actionButton.setAttribute("aria-live", "polite");
    actionButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateNearestInteraction();
    });
    document.body.append(actionButton);

    hud = document.createElement("section");
    hud.id = "voxcelAthleticHud";
    hud.className = "voxcel-athletic-hud";
    hud.hidden = true;
    hud.setAttribute("aria-label", "GREENIA アスレチック情報");
    hud.innerHTML = `
      <div class="voxcel-athletic-hud-main">
        <div><div class="voxcel-athletic-brand">GREENIA VOXCEL ADVENTURE</div><div class="voxcel-athletic-area" data-athletic-area>自由探索</div></div>
        <div class="voxcel-athletic-stat"><strong data-athletic-time>00:00.0</strong><span>TIME</span></div>
        <div class="voxcel-athletic-stat"><strong data-athletic-clear>0/8</strong><span>AREAS</span></div>
      </div>
      <div class="voxcel-athletic-progress"><i data-athletic-progress></i></div>
      <div class="voxcel-athletic-course-strip" data-athletic-courses></div>
      <div class="voxcel-athletic-help">WASD / 矢印：移動　SPACE：ジャンプ　SHIFT：ダッシュ　E：操作　R：復帰　ESC：退出</div>
    `;
    const strip = hud.querySelector("[data-athletic-courses]");
    for (const area of AREA_DEFINITIONS) {
      const button = document.createElement("button");
      button.className = "voxcel-athletic-course";
      button.type = "button";
      button.dataset.areaId = area.id;
      button.textContent = `${area.icon} ${area.short}`;
      button.setAttribute("aria-label", `${area.name}へ移動`);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        beginArea(area.id, { teleport: true, reset: true });
      });
      strip.append(button);
    }
    document.body.append(hud);

    mobileControls = document.createElement("div");
    mobileControls.id = "voxcelAthleticMobile";
    mobileControls.className = "voxcel-athletic-mobile";
    mobileControls.hidden = true;
    mobileControls.innerHTML = `
      <button class="jump" type="button" data-athletic-control="jump" aria-label="ジャンプ">↑</button>
      <button type="button" data-athletic-control="action" aria-label="操作">E 操作</button>
      <button type="button" data-athletic-control="respawn" aria-label="チェックポイントへ戻る">R 復帰</button>
    `;
    const press = (control) => (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (control === "jump") gameplay.jumpQueued = true;
      if (control === "action") activateNearestInteraction();
      if (control === "respawn") requestRespawn("manual");
    };
    for (const button of mobileControls.querySelectorAll("button")) {
      button.addEventListener("pointerdown", press(button.dataset.athleticControl));
    }
    document.body.append(mobileControls);
  }

  function formatTime(milliseconds) {
    const safe = Math.max(0, finite(milliseconds));
    const minutes = Math.floor(safe / 60_000);
    const seconds = Math.floor((safe % 60_000) / 1_000);
    const tenths = Math.floor((safe % 1_000) / 100);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }

  function ensureAreaRun(areaId, reset = false) {
    const route = routeDefinitions.get(areaId);
    let run = gameplay.areaRuns.get(areaId);
    if (!run || reset) {
      run = {
        areaId,
        status: "ready",
        checkpointIndex: 0,
        reached: new Set([0]),
        elapsedMs: 0,
        bestMs: run?.bestMs ?? null,
        finalTimeMs: null,
        falls: 0,
        branchChoice: null,
      };
      gameplay.areaRuns.set(areaId, run);
    }
    if (route && run.checkpointIndex >= route.points.length) run.checkpointIndex = route.points.length - 1;
    return run;
  }

  function setPlayerPosition(point, options = {}) {
    const player = handle.playerRoot.position;
    const previous = { x: player.x, y: player.y, z: player.z };
    player.set(point.x, point.y ?? PLAYER_GROUND_Y, point.z);
    const deltaX = player.x - previous.x;
    const deltaY = player.y - previous.y;
    const deltaZ = player.z - previous.z;
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.x += deltaX;
      handle.playerShadow.position.z += deltaZ;
      handle.playerShadow.position.y = (point.y ?? PLAYER_GROUND_Y) - PLAYER_FOOT_OFFSET;
    }
    if (handle.camera?.position) {
      handle.camera.position.x += deltaX;
      handle.camera.position.y += deltaY;
      handle.camera.position.z += deltaZ;
    }
    if (Number.isFinite(options.yaw)) handle.setCameraYaw?.(options.yaw);
    gameplay.velocityX = 0;
    gameplay.velocityY = 0;
    gameplay.velocityZ = 0;
    gameplay.grounded = true;
    gameplay.currentSurfaceId = options.surfaceId || "ground";
    window.__voxcelEnhancements?.acceptNextMove?.();
  }

  function enterPlayMode() {
    if (gameplay.active) return true;
    if (handle.state?.vehicle || handle.state?.insideBld || handle.state?.arrestPhase) return false;
    gameplay.active = true;
    gameplay.mode = "running";
    gameplay.lastUpdateAt = performance.now();
    gameplay.checkpoint = { ...FACILITY.entrance, id: "entrance", areaId: null, index: 0 };
    handle.setMovementLocked?.(true);
    handle.movementLocked = true;
    document.body.classList.add("voxcel-athletic-playing");
    hud.hidden = false;
    mobileControls.hidden = false;
    releaseAllKeys();
    handle.notify?.("🧗 GREENIA VOXCELへようこそ！SPACEでジャンプ、Eで遊具を操作");
    playTone(520, 0.12, "triangle");
    window.setTimeout(() => playTone(700, 0.17, "triangle"), 110);
    updateUi();
    return true;
  }

  function cancelRide() {
    gameplay.ride = null;
    gameplay.ziplineProgress = null;
  }

  function exitPlayMode(options = {}) {
    if (!gameplay.active) return false;
    gameplay.active = false;
    gameplay.mode = "idle";
    gameplay.activeAreaId = null;
    cancelRide();
    handle.setMovementLocked?.(false);
    handle.movementLocked = false;
    document.body.classList.remove("voxcel-athletic-playing");
    hud.hidden = true;
    mobileControls.hidden = true;
    releaseAllKeys();
    if (options.teleport !== false) {
      setPlayerPosition({ x: FACILITY.entrance.x, y: PLAYER_GROUND_Y, z: FACILITY.entrance.z - 2.5 }, { yaw: Math.PI });
    }
    if (options.notify !== false) handle.notify?.("🌲 GREENIA VOXCELを退出しました");
    updateUi();
    return true;
  }

  function beginArea(areaId, options = {}) {
    const route = routeDefinitions.get(areaId);
    if (!route) return false;
    if (!gameplay.active && !enterPlayMode()) return false;
    cancelRide();
    const run = ensureAreaRun(areaId, options.reset ?? true);
    run.status = "running";
    run.checkpointIndex = 0;
    run.reached = new Set([0]);
    run.elapsedMs = 0;
    run.finalTimeMs = null;
    run.falls = 0;
    gameplay.activeAreaId = areaId;
    gameplay.mode = "running";
    const start = route.points[0];
    gameplay.checkpoint = { ...start, areaId, index: 0 };
    if (options.teleport !== false) {
      setPlayerPosition(start, { yaw: route.area.yaw, surfaceId: `${areaId}-start` });
      if (Number.isFinite(route.area.cameraPitch)) {
        const cameraState = handle.getCameraState?.() || {};
        handle.setCameraState?.({
          ...cameraState,
          yaw: route.area.yaw,
          pitch: route.area.cameraPitch,
          distance: route.area.cameraDistance,
          targetDistance: route.area.cameraDistance,
        });
      }
    }
    handle.notify?.(`${route.area.icon} ${route.area.name} スタート！チェックポイントを順番に進もう`);
    playTone(540, 0.1, "square");
    window.setTimeout(() => playTone(720, 0.13, "square"), 90);
    updateUi();
    return true;
  }

  function startChallenge(id) {
    const legacy = { water: "wonder-amembo", wall: "yahhoy", zipline: "zip-slide" };
    return beginArea(legacy[id] || id, { teleport: true, reset: true });
  }

  function completeArea(areaId, detail = "") {
    const route = routeDefinitions.get(areaId);
    const run = ensureAreaRun(areaId);
    if (!route || run.status === "completed") return;
    run.status = "completed";
    run.finalTimeMs = run.elapsedMs;
    run.bestMs = run.bestMs === null ? run.finalTimeMs : Math.min(run.bestMs, run.finalTimeMs);
    run.checkpointIndex = route.points.length - 1;
    gameplay.completedAreas.add(areaId);
    gameplay.activeAreaId = null;
    gameplay.mode = "completed";
    handle.state.joy = Math.min(100, finite(handle.state.joy, 0) + 12);
    handle.notify?.(`🏁 ${route.area.name} CLEAR! ${formatTime(run.finalTimeMs)}${detail ? `　${detail}` : ""}`);
    playTone(660, 0.12, "triangle");
    window.setTimeout(() => playTone(880, 0.14, "triangle"), 120);
    window.setTimeout(() => playTone(1040, 0.2, "triangle"), 250);
    window.setTimeout(() => {
      if (gameplay.active && gameplay.mode === "completed") gameplay.mode = "running";
    }, 900);
    updateUi();
  }

  function requestRespawn(reason = "fall") {
    if (!gameplay.active || gameplay.mode === "respawning") return false;
    cancelRide();
    gameplay.mode = "respawning";
    gameplay.lastRespawnReason = reason;
    gameplay.respawnAt = performance.now() + 620;
    gameplay.velocityX = 0;
    gameplay.velocityY = 0;
    gameplay.velocityZ = 0;
    if (reason !== "manual") gameplay.fallCount += 1;
    const run = gameplay.activeAreaId ? ensureAreaRun(gameplay.activeAreaId) : null;
    if (run && reason !== "manual") {
      run.falls += 1;
      run.elapsedMs += 2_500;
    }
    handle.notify?.(reason === "water" ? "💦 落水！チェックポイントへ戻ります" : "↩️ チェックポイントへ戻ります");
    playTone(reason === "water" ? 180 : 260, 0.2, "sawtooth");
    updateUi();
    return true;
  }

  function finishRespawn() {
    gameplay.respawnCount += 1;
    setPlayerPosition(gameplay.checkpoint, {
      yaw: routeDefinitions.get(gameplay.checkpoint.areaId)?.area?.yaw,
      surfaceId: gameplay.checkpoint.id,
    });
    gameplay.mode = gameplay.activeAreaId ? "running" : "running";
    gameplay.respawnAt = 0;
    updateUi();
  }

  function beginLocalRide(id, areaId, start, end, durationMs, trolley, label, checkpointIndex = null, trolleyOffsetY = 1.2, sagAmount = 1.45) {
    if (gameplay.ride || !gameplay.active || gameplay.activeAreaId !== areaId) return false;
    gameplay.mode = "ziplining";
    gameplay.ride = {
      id,
      kind: "course",
      areaId,
      label,
      start: { ...start },
      end: { ...end },
      durationMs,
      startedAt: performance.now(),
      elapsedMs: 0,
      trolley,
      checkpointIndex,
      trolleyOffsetY,
      sagAmount,
    };
    gameplay.ziplineProgress = 0;
    gameplay.velocityX = 0;
    gameplay.velocityY = 0;
    gameplay.velocityZ = 0;
    handle.notify?.(`🪂 ${label} スタート！`);
    playTone(380, 0.14, "triangle");
    return true;
  }

  function beginPathRide(id, areaId, waypoints, durationMs, trolley, label, checkpointIndex = null, trolleyOffsetY = 1.2, options = {}) {
    if (gameplay.ride || !gameplay.active || gameplay.activeAreaId !== areaId || !Array.isArray(waypoints) || waypoints.length < 2) return false;
    gameplay.mode = "ziplining";
    gameplay.ride = {
      id,
      kind: "path-course",
      areaId,
      label,
      start: { ...waypoints[0] },
      end: { ...waypoints.at(-1) },
      waypoints: waypoints.map((point) => ({ ...point })),
      durationMs,
      startedAt: performance.now(),
      elapsedMs: 0,
      trolley,
      trolleyOffsetY,
      checkpointIndex,
      sagAmount: 0,
    };
    gameplay.ziplineProgress = 0;
    gameplay.velocityX = 0;
    gameplay.velocityY = 0;
    gameplay.velocityZ = 0;
    handle.notify?.(options.startMessage || `🚣 ${label} スタート！ペダルで池を一周`);
    playTone(360, 0.14, "triangle");
    return true;
  }

  function beginZipRide(id, start, end, durationMs, trolley) {
    if (gameplay.ride || !gameplay.active) return false;
    const areaId = "zip-slide";
    if (gameplay.activeAreaId !== areaId) {
      const run = ensureAreaRun(areaId, true);
      run.status = "running";
      gameplay.activeAreaId = areaId;
      gameplay.checkpoint = { ...start, id: `${id}-launch`, areaId, index: 0 };
    }
    gameplay.mode = "ziplining";
    gameplay.ride = { id, kind: "long-zip", areaId, start: { ...start }, end: { ...end }, durationMs, startedAt: performance.now(), elapsedMs: 0, trolley, bodyYawOffset: 0 };
    gameplay.ziplineProgress = 0;
    gameplay.velocityX = 0;
    gameplay.velocityY = 0;
    gameplay.velocityZ = 0;
    handle.notify?.("🪂 ロングジップ出発！A/D・左右で操作ハンドルを使い体の向きを調整");
    playTone(340, 0.16, "triangle");
    return true;
  }

  function updateZipRide(now, deltaMs) {
    const ride = gameplay.ride;
    if (!ride) return;
    ride.elapsedMs += deltaMs;
    const progress = clamp(ride.elapsedMs / ride.durationMs, 0, 1);
    const amount = easeInOut(progress);
    let segmentStart = ride.start;
    let segmentEnd = ride.end;
    let segmentAmount = amount;
    if (ride.waypoints?.length > 1) {
      const scaled = amount * (ride.waypoints.length - 1);
      const segmentIndex = Math.min(ride.waypoints.length - 2, Math.floor(scaled));
      segmentStart = ride.waypoints[segmentIndex];
      segmentEnd = ride.waypoints[segmentIndex + 1];
      segmentAmount = scaled - segmentIndex;
    }
    const sag = Math.sin(segmentAmount * Math.PI) * (ride.sagAmount ?? 1.45);
    const point = {
      x: lerp(segmentStart.x, segmentEnd.x, segmentAmount),
      y: lerp(segmentStart.y, segmentEnd.y, segmentAmount) - sag,
      z: lerp(segmentStart.z, segmentEnd.z, segmentAmount),
    };
    const travelYaw = Math.atan2(segmentEnd.x - segmentStart.x, segmentEnd.z - segmentStart.z);
    if (ride.id === "mtking-pedal-boat") {
      const steeringInput = readMovementInput().horizontal;
      ride.steeringOffset = clamp((ride.steeringOffset || 0) + steeringInput * deltaMs * 0.0018, -1.7, 1.7);
      ride.steeringYawOffset = steeringInput * 0.16;
      point.x += Math.cos(travelYaw) * ride.steeringOffset;
      point.z -= Math.sin(travelYaw) * ride.steeringOffset;
    } else {
      ride.steeringYawOffset = 0;
    }
    setPlayerPositionDuringFrame(point);
    if (ride.kind === "long-zip") {
      const input = readMovementInput();
      ride.bodyYawOffset = clamp((ride.bodyYawOffset || 0) + input.horizontal * deltaMs * 0.0024, -Math.PI * 0.78, Math.PI * 0.78);
      handle.playerRoot.rotation.y = travelYaw + ride.bodyYawOffset;
      if (ride.trolley) ride.trolley.rotation.y = travelYaw;
    } else {
      handle.playerRoot.rotation.y = travelYaw + (ride.steeringYawOffset || 0);
      if (ride.trolley && ride.kind === "path-course") ride.trolley.rotation.y = travelYaw + (ride.steeringYawOffset || 0);
    }
    if (ride.trolley) ride.trolley.position.set(point.x, point.y + (ride.trolleyOffsetY ?? 1.2), point.z);
    gameplay.ziplineProgress = progress;
    const rideAreaId = ride.areaId || "zip-slide";
    const run = ensureAreaRun(rideAreaId);
    run.elapsedMs += deltaMs;
    if (progress >= 1) {
      const finishedId = ride.id;
      const frontLanding = ride.kind !== "long-zip" || Math.abs(ride.bodyYawOffset || 0) <= 0.42;
      gameplay.ride = null;
      gameplay.ziplineProgress = 1;
      setPlayerPosition({ x: ride.end.x, y: ride.end.y, z: ride.end.z }, { surfaceId: `${finishedId}-landing` });
      if (ride.kind === "course" || ride.kind === "path-course") {
        gameplay.mode = "running";
        if (Number.isInteger(ride.checkpointIndex)) {
          const route = routeDefinitions.get(ride.areaId);
          const checkpointPoint = route?.points?.[ride.checkpointIndex];
          run.checkpointIndex = Math.max(run.checkpointIndex, ride.checkpointIndex);
          run.reached.add(ride.checkpointIndex);
          if (checkpointPoint) gameplay.checkpoint = { ...checkpointPoint, areaId: ride.areaId, index: ride.checkpointIndex };
        }
        handle.notify?.(`✨ ${ride.label} クリア！`);
        playTone(680, 0.18, "triangle");
        return;
      }
      if (finishedId === "zip-go") {
        gameplay.mode = "running";
        gameplay.checkpoint = { x: ride.end.x, y: ride.end.y, z: ride.end.z, id: "zip-go-landing", areaId: "zip-slide", index: 0 };
        handle.notify?.(`🪂 行き256mをクリア！${frontLanding ? "正面着地成功。" : "次はハンドルで正面を向こう。"} 階段を上り帰り201mへ`);
        playTone(620, 0.16, "triangle");
      } else {
        gameplay.mode = "running";
        const run = ensureAreaRun("zip-slide");
        run.checkpointIndex = 1;
        run.reached.add(1);
        gameplay.checkpoint = { ...routeDefinitions.get("zip-slide").points[1], areaId: "zip-slide", index: 1 };
        completeArea("zip-slide", frontLanding ? "帰り201m・正面着地成功" : "帰り201m完走");
      }
    }
  }

  function insideRect(x, z, rectangle, padding = 0) {
    return (
      x >= rectangle.x - rectangle.width / 2 + padding &&
      x <= rectangle.x + rectangle.width / 2 - padding &&
      z >= rectangle.z - rectangle.depth / 2 + padding &&
      z <= rectangle.z + rectangle.depth / 2 - padding
    );
  }

  function hazardAt(x, z) {
    return hazards.find((hazard) => insideRect(x, z, hazard, 0.1)) || null;
  }

  function surfaceHeightAt(surface, x, z) {
    return surface.heightAt ? surface.heightAt(x, z) : surface.y;
  }

  function surfaceCandidates(x, z) {
    return surfaces
      .filter((surface) => surface.contains
        ? surface.contains(x, z)
        : insideRect(x, z, surface, Math.min(PLAYER_RADIUS * 0.18, surface.width * 0.08, surface.depth * 0.08)))
      .map((surface) => ({ surface, y: surfaceHeightAt(surface, x, z) }))
      .sort((left, right) => right.y - left.y);
  }

  function groundHeightAt(x, z) {
    if (!pointInsideBounds({ x, z }, FACILITY.bounds, 0.2)) return null;
    if (hazardAt(x, z)) return null;
    return GROUND_SURFACE_Y;
  }

  function supportBelow(x, z, y, allowance = 0.7) {
    const candidates = surfaceCandidates(x, z).filter((candidate) => candidate.y <= y + allowance);
    if (candidates.length) return candidates[0];
    const ground = groundHeightAt(x, z);
    return ground === null ? null : { surface: { id: "ground", trampoline: false }, y: ground };
  }

  function resolveHorizontal(previousX, previousZ, targetX, targetZ, y) {
    let x = clamp(targetX, FACILITY.bounds.minX + PLAYER_RADIUS, FACILITY.bounds.maxX - PLAYER_RADIUS);
    let z = clamp(targetZ, FACILITY.bounds.minZ + PLAYER_RADIUS, FACILITY.bounds.maxZ - PLAYER_RADIUS);
    for (const blocker of blockers) {
      if (y < blocker.minY - 0.2 || y > blocker.maxY + 0.2) continue;
      if (!blockerContains(x, z, blocker, PLAYER_RADIUS)) continue;
      const xOnlyBlocked = blockerContains(x, previousZ, blocker, PLAYER_RADIUS);
      const zOnlyBlocked = blockerContains(previousX, z, blocker, PLAYER_RADIUS);
      if (!xOnlyBlocked) z = previousZ;
      else if (!zOnlyBlocked) x = previousX;
      else {
        x = previousX;
        z = previousZ;
      }
    }
    return { x, z };
  }

  function setPlayerPositionDuringFrame(point) {
    const player = handle.playerRoot.position;
    const deltaX = point.x - player.x;
    const deltaY = point.y - player.y;
    const deltaZ = point.z - player.z;
    player.set(point.x, point.y, point.z);
    if (handle.camera?.position) {
      handle.camera.position.x += deltaX;
      handle.camera.position.y += deltaY;
      handle.camera.position.z += deltaZ;
    }
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.x = point.x;
      handle.playerShadow.position.z = point.z;
    }
    window.__voxcelEnhancements?.acceptNextMove?.();
  }

  function applyDynamicSurfaceCarry() {
    if (!gameplay.grounded || !gameplay.currentSurfaceId) return;
    const surface = dynamicSurfaces.find((candidate) => candidate.id === gameplay.currentSurfaceId);
    if (!surface) return;
    const deltaX = surface.x - surface.previousX;
    const deltaY = surface.y - surface.previousY;
    const deltaZ = surface.z - surface.previousZ;
    if (Math.abs(deltaX) + Math.abs(deltaY) + Math.abs(deltaZ) < 0.0001) return;
    setPlayerPositionDuringFrame({
      x: handle.playerRoot.position.x + deltaX,
      y: handle.playerRoot.position.y + deltaY,
      z: handle.playerRoot.position.z + deltaZ,
    });
  }

  function readMovementInput() {
    const bridge = handle.getMovementInput?.() || {};
    let horizontal = 0;
    let vertical = 0;
    if (gameplay.keys.has("a") || gameplay.keys.has("arrowleft")) horizontal -= 1;
    if (gameplay.keys.has("d") || gameplay.keys.has("arrowright")) horizontal += 1;
    if (gameplay.keys.has("w") || gameplay.keys.has("arrowup")) vertical += 1;
    if (gameplay.keys.has("s") || gameplay.keys.has("arrowdown")) vertical -= 1;
    horizontal += finite(bridge.touchX);
    vertical -= finite(bridge.touchY);
    const magnitude = Math.hypot(horizontal, vertical);
    if (magnitude > 1) {
      horizontal /= magnitude;
      vertical /= magnitude;
    }
    return { horizontal, vertical };
  }

  function updateManualPhysics(now, deltaSeconds) {
    if (gameplay.mode === "respawning") {
      if (now >= gameplay.respawnAt) finishRespawn();
      return;
    }
    if (gameplay.ride) {
      updateZipRide(now, deltaSeconds * 1000);
      return;
    }
    if (window.__voxcelMap?.isOpen) return;

    applyDynamicSurfaceCarry();
    const player = handle.playerRoot.position;
    const previous = { x: player.x, y: player.y, z: player.z };
    const previousFeetY = previous.y - PLAYER_FOOT_OFFSET;
    const input = readMovementInput();
    const sprinting = gameplay.keys.has("shift");
    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
    const yaw = finite(handle.getCameraYaw?.(), Math.PI);
    const directionX = Math.cos(yaw) * input.horizontal - Math.sin(yaw) * input.vertical;
    const directionZ = -Math.sin(yaw) * input.horizontal - Math.cos(yaw) * input.vertical;
    const acceleration = gameplay.grounded ? 14 : 7.5;
    const targetVelocityX = directionX * speed;
    const targetVelocityZ = directionZ * speed;
    const blend = 1 - Math.exp(-acceleration * deltaSeconds);
    gameplay.velocityX = lerp(gameplay.velocityX, targetVelocityX, blend);
    gameplay.velocityZ = lerp(gameplay.velocityZ, targetVelocityZ, blend);
    if (Math.hypot(input.horizontal, input.vertical) < 0.04) {
      const friction = Math.exp(-(gameplay.grounded ? 16 : 2.4) * deltaSeconds);
      gameplay.velocityX *= friction;
      gameplay.velocityZ *= friction;
    }

    if (gameplay.jumpQueued && gameplay.grounded) {
      gameplay.velocityY = JUMP_VELOCITY;
      gameplay.grounded = false;
      gameplay.currentSurfaceId = null;
      gameplay.jumpCount += 1;
      playTone(310, 0.06, "square");
    }
    gameplay.jumpQueued = false;
    if (!gameplay.grounded) gameplay.velocityY -= GRAVITY * deltaSeconds;

    const horizontal = resolveHorizontal(
      previous.x,
      previous.z,
      previous.x + gameplay.velocityX * deltaSeconds,
      previous.z + gameplay.velocityZ * deltaSeconds,
      previousFeetY,
    );
    let nextFeetY = previousFeetY + gameplay.velocityY * deltaSeconds;
    let landedSurface = null;
    const candidates = surfaceCandidates(horizontal.x, horizontal.z);
    if (gameplay.velocityY <= 0) {
      for (const candidate of candidates) {
        if (previousFeetY >= candidate.y - 0.12 && nextFeetY <= candidate.y + 0.18) {
          nextFeetY = candidate.y;
          landedSurface = candidate.surface;
          break;
        }
      }
      if (!landedSurface) {
        const ground = groundHeightAt(horizontal.x, horizontal.z);
        if (ground !== null && previousFeetY >= ground - 0.12 && nextFeetY <= ground + 0.16) {
          nextFeetY = ground;
          landedSurface = { id: "ground", trampoline: false };
        }
      }
    }
    if (gameplay.grounded && !landedSurface) {
      const support = supportBelow(horizontal.x, horizontal.z, previousFeetY, 0.78);
      if (support && Math.abs(support.y - previousFeetY) <= 0.78) {
        nextFeetY = support.y;
        landedSurface = support.surface;
      }
    }
    if (landedSurface) {
      gameplay.grounded = true;
      gameplay.velocityY = 0;
      gameplay.currentSurfaceId = landedSurface.id;
      if (landedSurface.trampoline) {
        gameplay.grounded = false;
        gameplay.velocityY = 11.6;
        gameplay.currentSurfaceId = null;
        playTone(220, 0.07, "sine");
        window.setTimeout(() => playTone(420, 0.08, "sine"), 60);
      }
    } else {
      gameplay.grounded = false;
      gameplay.currentSurfaceId = null;
    }

    const movedDistance = Math.hypot(horizontal.x - previous.x, horizontal.z - previous.z);
    gameplay.distanceTravelled += movedDistance;
    const nextRootY = nextFeetY + PLAYER_FOOT_OFFSET;
    setPlayerPositionDuringFrame({ x: horizontal.x, y: nextRootY, z: horizontal.z });
    if (movedDistance > 0.012) handle.playerRoot.rotation.y = Math.atan2(horizontal.x - previous.x, horizontal.z - previous.z);
    const support = supportBelow(horizontal.x, horizontal.z, nextFeetY, 0.25);
    if (handle.playerShadow?.position) {
      handle.playerShadow.position.y = support?.y ?? Math.max(-0.2, nextFeetY - 0.4);
      handle.playerShadow.visible = nextFeetY > -1.2;
    }
    const activeHazard = hazardAt(horizontal.x, horizontal.z);
    if ((activeHazard && nextFeetY < 0.04) || nextFeetY < -2.2) requestRespawn(activeHazard?.type || "fall");
  }

  function updateAreaProgress(deltaMs) {
    const areaId = gameplay.activeAreaId;
    if (!areaId || gameplay.mode !== "running" || window.__voxcelMap?.isOpen) return;
    const route = routeDefinitions.get(areaId);
    const run = ensureAreaRun(areaId);
    if (!route || run.status !== "running") return;
    run.elapsedMs += deltaMs;
    const player = handle.playerRoot.position;
    let nextIndex = run.checkpointIndex + 1;
    let next = route.points[nextIndex];
    if (!next) return;
    if (areaId === "mecya-forest" && run.checkpointIndex === 30) {
      const easyOption = route.points[33];
      if (distance3d(player, easyOption) <= easyOption.radius) {
        nextIndex = 33;
        next = easyOption;
        run.branchChoice = "easy-net-bridge";
      }
    } else if (areaId === "mecya-forest" && run.checkpointIndex === 32) {
      const mergePoint = route.points[34];
      if (distance3d(player, mergePoint) <= mergePoint.radius) {
        nextIndex = 34;
        next = mergePoint;
        run.branchChoice = "hard-net-canyon-tarroir";
      }
    }
    if (distance3d(player, next) > next.radius) return;
    run.checkpointIndex = nextIndex;
    run.reached.add(nextIndex);
    gameplay.checkpoint = { ...next, areaId, index: nextIndex };
    const branchNotice = next.branchOption === "easy" ? "（易：ネットブリッジ）" : next.branchOption === "hard" ? "（難ルート）" : next.branchOption === "merge" ? "（分岐合流）" : "";
    handle.notify?.(nextIndex === route.points.length - 1
      ? `🏁 ${route.area.name} ${next.officialId || "GOAL"} ${next.name} CLEAR！`
      : `🚩 ${next.officialId || `CHECK ${nextIndex}`} ${next.name}${branchNotice}　${nextIndex + 1}/${route.points.length}`);
    playTone(560 + nextIndex * 40, 0.1, "triangle");
    if (nextIndex === route.points.length - 1 && areaId !== "zip-slide") completeArea(areaId);
  }

  function nearestInteraction() {
    if (!handle?.playerRoot?.visible || handle.state?.vehicle || handle.state?.insideBld || handle.state?.arrestPhase || window.__voxcelMap?.isOpen) return null;
    const player = handle.playerRoot.position;
    return interactions
      .filter((interaction) => gameplay.active || interaction.allowWhenInactive)
      .map((interaction) => ({ interaction, distance: distance3d(player, interaction.point) }))
      .filter(({ interaction, distance }) => distance <= interaction.radius)
      .sort((left, right) => left.distance - right.distance)[0]?.interaction || null;
  }

  function activateNearestInteraction() {
    const interaction = interactions.find((candidate) => candidate.id === gameplay.nearestInteractionId) || nearestInteraction();
    if (!interaction) {
      if (gameplay.active) gameplay.jumpQueued = true;
      return false;
    }
    return interaction.activate?.() !== false;
  }

  function updateUi() {
    if (!actionButton || !hud) return;
    const interaction = nearestInteraction();
    gameplay.nearestInteractionId = interaction?.id || null;
    const signature = `${gameplay.active}:${gameplay.mode}:${interaction?.id || "none"}`;
    if (signature !== lastNearestActionSignature) {
      lastNearestActionSignature = signature;
      if (interaction) {
        const interactionLabel = gameplay.active && interaction.activeLabel ? interaction.activeLabel : interaction.label;
        actionButton.hidden = false;
        actionButton.disabled = gameplay.mode === "respawning";
        actionButton.textContent = `E　${interactionLabel}`;
        actionButton.setAttribute("aria-label", interactionLabel);
      } else if (gameplay.active) {
        actionButton.hidden = false;
        actionButton.disabled = false;
        actionButton.textContent = "SPACE　ジャンプ";
        actionButton.setAttribute("aria-label", "ジャンプ");
      } else {
        actionButton.hidden = true;
      }
    }
    if (!gameplay.active) return;
    hud.hidden = false;
    mobileControls.hidden = false;
    const route = gameplay.activeAreaId ? routeDefinitions.get(gameplay.activeAreaId) : null;
    const run = gameplay.activeAreaId ? ensureAreaRun(gameplay.activeAreaId) : null;
    const currentPoint = route && run ? route.points[run.checkpointIndex] : null;
    hud.querySelector("[data-athletic-area]").textContent = route
      ? `${route.area.icon} ${route.area.name}　${run.checkpointIndex + 1}/${route.points.length} ${currentPoint?.name || route.area.japanese}`
      : gameplay.mode === "respawning" ? "チェックポイントへ復帰中…" : "自由探索 — 下のコースを選択";
    hud.querySelector("[data-athletic-time]").textContent = formatTime(run?.elapsedMs || 0);
    hud.querySelector("[data-athletic-clear]").textContent = `${gameplay.completedAreas.size}/${AREA_DEFINITIONS.length}`;
    const progress = route && run ? (run.checkpointIndex / Math.max(1, route.points.length - 1)) * 100 : (gameplay.completedAreas.size / AREA_DEFINITIONS.length) * 100;
    hud.querySelector("[data-athletic-progress]").style.width = `${clamp(progress, 0, 100)}%`;
    for (const button of hud.querySelectorAll("[data-area-id]")) {
      button.classList.toggle("is-active", button.dataset.areaId === gameplay.activeAreaId);
      button.classList.toggle("is-complete", gameplay.completedAreas.has(button.dataset.areaId));
    }
  }

  function releaseAllKeys() {
    gameplay.keys.clear();
    gameplay.jumpQueued = false;
    for (const key of ["w", "a", "s", "d", "Shift", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
    }
  }

  function handleKeyDown(event) {
    const key = String(event.key || "").toLowerCase();
    if (!gameplay.active) {
      if (key === "e" && !event.repeat && nearestInteraction()?.id === "enter-adventure") {
        event.preventDefault();
        event.stopImmediatePropagation();
        enterPlayMode();
      }
      return;
    }
    if (window.__voxcelMap?.isOpen) return;
    const controlled = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", " ", "spacebar", "e", "r", "escape"]);
    if (!controlled.has(key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) gameplay.keys.add(key);
    if ((key === " " || key === "spacebar") && !event.repeat) gameplay.jumpQueued = true;
    if (key === "e" && !event.repeat) activateNearestInteraction();
    if (key === "r" && !event.repeat) requestRespawn("manual");
    if (key === "escape" && !event.repeat) exitPlayMode();
  }

  function handleKeyUp(event) {
    const key = String(event.key || "").toLowerCase();
    gameplay.keys.delete(key);
  }

  function updateAnimations(now) {
    const seconds = now / 1000;
    for (const texture of waterTextures) {
      if (texture?.offset) {
        texture.offset.x = (seconds * 0.012) % 1;
        texture.offset.y = (seconds * 0.02) % 1;
      }
    }
    animatedFlags.forEach((flag, index) => {
      flag.rotation.z = Math.sin(seconds * 3 + index * 1.2) * 0.055;
      flag.scale.x = (flag.userData.baseScaleX || 1) * (0.965 + Math.sin(seconds * 4 + index) * 0.035);
    });
    for (const animation of animations) animation(seconds, now);
  }

  function setManagedCloudsVisible(visible) {
    for (const cloud of managedClouds) cloud.visible = visible;
  }

  function updateCloudVisibility() {
    const player = handle.playerRoot.position;
    const nearFacility = (
      player.x >= FACILITY.bounds.minX - 35 &&
      player.x <= FACILITY.bounds.maxX + 35 &&
      player.z >= FACILITY.bounds.minZ - 35 &&
      player.z <= FACILITY.bounds.maxZ + 35
    );
    // The city's large camera-facing cloud cards can cross the low athletic camera.
    // Keep the park sightlines clear, then restore them automatically back in town.
    setManagedCloudsVisible(!nearFacility);
  }

  function update(now) {
    const player = handle.playerRoot.position;
    const nearFacility = (
      player.x >= FACILITY.bounds.minX - 40 &&
      player.x <= FACILITY.bounds.maxX + 40 &&
      player.z >= FACILITY.bounds.minZ - 40 &&
      player.z <= FACILITY.bounds.maxZ + 40
    );
    updateCloudVisibility();
    if (gameplay.active || nearFacility) updateAnimations(now);
    if (gameplay.active) {
      if (handle.state?.vehicle || handle.state?.insideBld || handle.state?.arrestPhase || !handle.playerRoot.visible) {
        exitPlayMode({ teleport: false, notify: false });
        handle.notify?.("🧗 アスレチック操作を終了し、街の操作へ戻りました");
        gameplay.lastUpdateAt = now;
        return;
      }
      const frameMs = now - (gameplay.lastUpdateAt || now);
      const deltaMs = frameMs > 500 ? 0 : clamp(frameMs, 0, 250);
      let remainingSeconds = deltaMs / 1000;
      while (remainingSeconds > 0) {
        const stepSeconds = Math.min(1 / 60, remainingSeconds);
        updateManualPhysics(now, stepSeconds);
        remainingSeconds -= stepSeconds;
      }
      updateAreaProgress(deltaMs);
      handle.setMovementLocked?.(true);
      handle.movementLocked = true;
    }
    gameplay.lastUpdateAt = now;
    updateUi();
  }

  function guardedUpdate(now) {
    try {
      update(now);
    } catch (error) {
      if (gameplay.active) exitPlayMode({ teleport: false, notify: false });
      setManagedCloudsVisible(true);
      throw error;
    }
  }

  function registerMapLocation() {
    const map = window.__voxcelMap;
    if (!map?.registerLocation) return false;
    map.registerLocation({
      id: FACILITY.legacyId,
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
    const activeRoute = gameplay.activeAreaId ? routeDefinitions.get(gameplay.activeAreaId) : null;
    const activeRun = gameplay.activeAreaId ? ensureAreaRun(gameplay.activeAreaId) : null;
    return {
      ready: state.ready,
      reason: state.reason,
      version: SYSTEM_VERSION,
      id: FACILITY.legacyId,
      canonicalId: FACILITY.id,
      name: FACILITY.name,
      controlMode: "manual",
      fieldExpanded: true,
      facility: {
        id: FACILITY.legacyId,
        canonicalId: FACILITY.id,
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
      materialCount: state.materialCount,
      textureCount: state.textureCount,
      animationCount: state.animationCount,
      dynamicPlatformCount: state.dynamicPlatformCount,
      surfaceCount: state.surfaceCount,
      hazardCount: state.hazardCount,
      blockerCount: state.blockerCount,
      officialAttractionCount: state.officialAttractionCount,
      officialAttractionMeshCount: state.officialAttractionMeshCount,
      officialAttractions: officialRepresentations.map((representation) => ({
        areaId: representation.areaId,
        number: representation.number,
        officialId: representation.officialId,
        name: representation.name,
        sourceUrl: representation.sourceUrl,
        template: representation.template,
        detailProfile: representation.detailProfile || null,
        courseNumber: representation.courseNumber ?? null,
        publishedLengthMeters: representation.publishedLengthMeters ?? null,
        publishedHeightMeters: representation.publishedHeightMeters ?? null,
        publishedWidthMeters: representation.publishedWidthMeters ?? null,
        publishedAngleDegrees: representation.publishedAngleDegrees ?? null,
        publishedWeightsKg: representation.publishedWeightsKg ?? null,
        publishedWeightCount: representation.publishedWeightCount ?? null,
        publishedTargetCount: representation.publishedTargetCount ?? null,
        publishedPoleCount: representation.publishedPoleCount ?? null,
        publishedPanelCount: representation.publishedPanelCount ?? null,
        publishedRopeCount: representation.publishedRopeCount ?? null,
        publishedJoystickCount: representation.publishedJoystickCount ?? null,
        publishedHydraulicCylinderCount: representation.publishedHydraulicCylinderCount ?? null,
        publishedOperationStageCount: representation.publishedOperationStageCount ?? null,
        publishedTrackTreadCount: representation.publishedTrackTreadCount ?? null,
        publishedTrackRollerCount: representation.publishedTrackRollerCount ?? null,
        publishedFacetCount: representation.publishedFacetCount ?? null,
        publishedEntryStepCount: representation.publishedEntryStepCount ?? null,
        publishedRopeRailLevels: representation.publishedRopeRailLevels ?? null,
        publishedDeckLevels: representation.publishedDeckLevels ?? null,
        publishedLadderRungCount: representation.publishedLadderRungCount ?? null,
        publishedLedgeCount: representation.publishedLedgeCount ?? null,
        publishedParallelRopeCount: representation.publishedParallelRopeCount ?? null,
        publishedTopTieCount: representation.publishedTopTieCount ?? null,
        publishedRequiredPullCount: representation.publishedRequiredPullCount ?? null,
        publishedSuspensionRopeCount: representation.publishedSuspensionRopeCount ?? null,
        publishedHandRopeCount: representation.publishedHandRopeCount ?? null,
        targetInteractionRadius: representation.targetInteractionRadius ?? null,
        railTravelLimit: representation.railTravelLimit ?? null,
        gongContactVerified: Boolean(representation.gongContactAt),
        stairStepCount: representation.stairStepCount ?? null,
        stairTurnCount: representation.stairTurnCount ?? null,
        deckHeightMeters: representation.deckHeightMeters ?? null,
        rideLength: representation.rideLength ?? null,
        rideDurationMs: representation.rideDurationMs ?? null,
        x: representation.x,
        y: representation.y,
        z: representation.z,
        meshCount: representation.meshCount,
        playable: representation.playable,
        interactive: Boolean(representation.interactive),
      })),
      roles: [...state.roles].sort(),
      roleCounts: Object.fromEntries([...state.roleCounts.entries()].sort()),
      rootAttached: root?.parent === handle?.scene,
      mapRegistered: state.mapRegistered,
      research: RESEARCH_SUMMARY,
      gameplayMode: gameplay.mode,
      playModeActive: gameplay.active,
      grounded: gameplay.grounded,
      verticalVelocity: gameplay.velocityY,
      activeChallenge: gameplay.activeAreaId,
      elapsedMs: activeRun?.elapsedMs || 0,
      finalTimeMs: activeRun?.finalTimeMs ?? null,
      checkpointIndex: activeRun?.checkpointIndex ?? 0,
      checkpointCount: activeRoute?.points.length ?? 0,
      checkpointsReached: activeRun ? [...activeRun.reached].sort((a, b) => a - b) : [],
      lastCheckpoint: { ...gameplay.checkpoint },
      fallCount: gameplay.fallCount,
      respawnCount: gameplay.respawnCount,
      lastRespawnReason: gameplay.lastRespawnReason,
      jumpCount: gameplay.jumpCount,
      distanceTravelled: gameplay.distanceTravelled,
      ziplineProgress: gameplay.ziplineProgress,
      activeRideId: gameplay.ride?.id || null,
      activeRideKind: gameplay.ride?.kind || null,
      bodyYawOffset: gameplay.ride?.bodyYawOffset ?? null,
      interactionCount: interactions.length,
      nearestInteraction: gameplay.nearestInteractionId,
      completedChallenges: [...gameplay.completedAreas].sort(),
      challengesStarted: [...gameplay.areaRuns.values()].filter((run) => run.status !== "ready").length,
      challengesCompleted: gameplay.completedAreas.size,
      challenges: AREA_DEFINITIONS.map((area) => {
        const route = routeDefinitions.get(area.id);
        const run = ensureAreaRun(area.id);
        return {
          id: area.id,
          name: area.name,
          japanese: area.japanese,
          icon: area.icon,
          officialPoints: area.officialPoints,
          samples: [...area.samples],
          start: { ...route?.points[0] },
          finish: { ...route?.points.at(-1) },
          checkpoints: route?.points.map((point) => ({ ...point })) || [],
          checkpointIndex: run.checkpointIndex,
          elapsedMs: run.elapsedMs,
          finalTimeMs: run.finalTimeMs,
          bestMs: run.bestMs,
          falls: run.falls,
          branchChoice: run.branchChoice || null,
          active: gameplay.activeAreaId === area.id,
          completed: gameplay.completedAreas.has(area.id),
          status: gameplay.activeAreaId === area.id ? gameplay.mode : run.status,
        };
      }),
      initializedAt: state.initializedAt,
    };
  }

  function initialize(runtimeHandle) {
    handle = runtimeHandle;
    constructors = resolveConstructors();
    if (!constructors.Group || !constructors.Vector3 || !constructors.Mesh || !constructors.BoxGeometry || !constructors.Material) {
      throw new Error("required Three.js constructors are unavailable");
    }
    root = new constructors.Group();
    root.name = "GreeniaVoxcelAdventureRoot";
    root.userData.voxcelAthletic = true;
    root.userData.voxcelAthleticFacility = FACILITY.id;
    handle.scene.add(root);
    managedClouds.push(...handle.scene.children.filter((object) => (
      object.visible && object.userData?.voxcelCloud && object.children.length === 2
    )));

    clearOriginalSite();
    buildPalette();
    buildTerrainAndEntrance();
    buildChibidoland();
    buildMtKingdom();
    buildWaterCourse();
    buildYahhoy();
    buildDeKairiki();
    buildMecyaForest();
    buildMtKingActivities();
    buildZipSlides();
    buildCompleteOfficialCourses();
    buildAreaWayfinding();
    registerEntryInteraction();
    installUi();
    registerMapLocation();
    handle.scene.updateMatrixWorld(true);
    window.__voxcelEnhancements.refreshColliders();

    unregisterBeforeRender = window.__voxcelEnhancements.registerBeforeRender(guardedUpdate);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", releaseAllKeys);
    state.ready = true;
    state.reason = "ready";
    state.initializedAt = Date.now();

    window.__voxcelAthletics = {
      ready: true,
      version: SYSTEM_VERSION,
      root,
      facility: { ...FACILITY, bounds: { ...FACILITY.bounds }, entrance: { ...FACILITY.entrance } },
      getState: snapshot,
      enterPlayMode,
      exitPlayMode,
      startChallenge,
      teleportToArea: (id) => beginArea(id, { teleport: true, reset: true }),
      respawn: () => requestRespawn("manual"),
      activateInteraction: (id) => {
        const interaction = interactions.find((candidate) => candidate.id === id);
        return interaction ? interaction.activate?.() !== false : false;
      },
      refreshColliders: () => window.__voxcelEnhancements.refreshColliders(),
      unregisterBeforeRender: () => {
        if (gameplay.active) exitPlayMode({ teleport: false, notify: false });
        setManagedCloudsVisible(true);
        window.removeEventListener("keydown", handleKeyDown, true);
        window.removeEventListener("keyup", handleKeyUp, true);
        window.removeEventListener("blur", releaseAllKeys);
        const result = unregisterBeforeRender?.();
        unregisterBeforeRender = null;
        return result;
      },
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
      typeof runtimeHandle.getMovementInput === "function" &&
      window.__voxcelEnhancements?.ready &&
      window.__voxcelMap?.ready
    ) {
      window.clearInterval(timer);
      try {
        initialize(runtimeHandle);
      } catch (error) {
        state.reason = error instanceof Error ? error.message : String(error);
        console.error("GREENIA VOXCEL system failed to initialize.", error);
        window.__voxcelAthletics = { ready: false, version: SYSTEM_VERSION, reason: state.reason, getState: snapshot };
      }
      return;
    }
    if (performance.now() - startedAt > 15_000) {
      window.clearInterval(timer);
      state.reason = "runtime-bridge-timeout";
      window.__voxcelAthletics = { ready: false, version: SYSTEM_VERSION, reason: state.reason, getState: snapshot };
    }
  }, 20);
})();
