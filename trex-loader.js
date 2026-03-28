import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const TREX_MODEL_URL = new URL("./models/trex-roar.glb", import.meta.url).href;
const TREX_SCALE = 7;
const TREX_SPAWN = new THREE.Vector3(110, 0, 10);
const TREX_GROUND_OFFSET = -1.7;
const TREX_FORWARD_OFFSET = 0;
const TREX_CHASE_SPEED = 11.5;
const TREX_ACCEL_LERP = 4.8;
const TREX_DECEL_LERP = 7.5;
const TREX_TURN_SPEED = 5.5;
const TREX_STOP_DISTANCE = 7.5;
const TREX_ROAR_DISTANCE = 9;
const TREX_ROAR_COOLDOWN = 3.6;

const loader = new GLTFLoader();
const playerWorld = new THREE.Vector3();
const toPlayer = new THREE.Vector3();

window.__voxcelTRex ??= {
  spawned: false,
  sample() {
    return {
      spawned: false,
      position: null,
      speed: 0,
      distanceToPlayer: Infinity,
      mode: "missing",
      activeClip: null,
    };
  },
};

function findClip(animations, pattern) {
  return animations.find((clip) => pattern.test(clip.name)) ?? null;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function dampAngle(current, target, speed, dt) {
  const delta = normalizeAngle(target - current);
  return current + delta * Math.min(1, speed * dt);
}

function chooseWalkClip(animations) {
  return (
    findClip(animations, /walk/i) ??
    findClip(animations, /run/i) ??
    animations[0] ??
    null
  );
}

async function spawnTRex() {
  if (window.__voxcelTRex.spawned) return;

  const handle = window.__voxcelPlayer;
  if (!handle?.scene || !handle?.playerRoot) {
    setTimeout(spawnTRex, 300);
    return;
  }

  const gltf = await loader.loadAsync(TREX_MODEL_URL);
  const model = gltf.scene;

  const sourceBox = new THREE.Box3().setFromObject(model);
  const size = sourceBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = TREX_SCALE / maxDim;
  model.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  model.position.set(
    TREX_SPAWN.x,
    -scaledBox.min.y + TREX_GROUND_OFFSET,
    TREX_SPAWN.z,
  );
  model.rotation.y = TREX_FORWARD_OFFSET;

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  handle.scene.add(model);

  const mixer = gltf.animations.length > 0 ? new THREE.AnimationMixer(model) : null;
  const walkClip = chooseWalkClip(gltf.animations);
  const roarClip = findClip(gltf.animations, /roar/i);
  const walkAction = mixer && walkClip ? mixer.clipAction(walkClip) : null;
  const roarAction = mixer && roarClip ? mixer.clipAction(roarClip) : null;

  if (walkAction) {
    walkAction.enabled = true;
    walkAction.setLoop(THREE.LoopRepeat);
    walkAction.play();
  }

  if (roarAction) {
    roarAction.enabled = true;
    roarAction.clampWhenFinished = true;
    roarAction.setLoop(THREE.LoopOnce, 1);
  }

  const state = {
    spawned: true,
    speed: 0,
    distanceToPlayer: Infinity,
    mode: "idle",
    activeClip: walkClip?.name ?? null,
  };

  let roaring = false;
  let roarCooldown = 0;

  function activateWalk() {
    if (!walkAction || roaring) return;
    walkAction.enabled = true;
    walkAction.paused = false;
    if (!walkAction.isRunning()) {
      walkAction.reset().play();
    }
    walkAction.timeScale = THREE.MathUtils.clamp(
      0.7 + state.speed / TREX_CHASE_SPEED,
      0.7,
      1.35,
    );
    state.activeClip = walkAction.getClip().name;
  }

  function activateRoar() {
    if (!roarAction || roaring || roarCooldown > 0) return;
    roaring = true;
    roarCooldown = TREX_ROAR_COOLDOWN;
    state.mode = "roar";
    state.activeClip = roarAction.getClip().name;

    if (walkAction) {
      walkAction.crossFadeTo(roarAction, 0.18, false);
    }
    roarAction.reset().play();
  }

  if (mixer && roarAction) {
    mixer.addEventListener("finished", (event) => {
      if (event.action !== roarAction) return;
      roaring = false;
      if (walkAction) {
        walkAction.reset().play();
      }
    });
  }

  window.__voxcelTRex = {
    spawned: true,
    model,
    mixer,
    sample() {
      return {
        spawned: state.spawned,
        position: {
          x: model.position.x,
          y: model.position.y,
          z: model.position.z,
          rotationY: model.rotation.y,
        },
        speed: state.speed,
        distanceToPlayer: state.distanceToPlayer,
        mode: state.mode,
        activeClip: state.activeClip,
      };
    },
  };

  let lastTime = performance.now();

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    handle.playerRoot.getWorldPosition(playerWorld);
    toPlayer.subVectors(playerWorld, model.position);
    toPlayer.y = 0;

    const distance = toPlayer.length();
    const desiredSpeed = distance > TREX_STOP_DISTANCE ? TREX_CHASE_SPEED : 0;
    const lerpRate = desiredSpeed > state.speed ? TREX_ACCEL_LERP : TREX_DECEL_LERP;

    state.distanceToPlayer = distance;
    state.speed = THREE.MathUtils.lerp(
      state.speed,
      desiredSpeed,
      Math.min(1, lerpRate * dt),
    );

    if (distance > 0.0001) {
      const desiredYaw = Math.atan2(toPlayer.x, toPlayer.z) + TREX_FORWARD_OFFSET;
      model.rotation.y = dampAngle(model.rotation.y, desiredYaw, TREX_TURN_SPEED, dt);
    }

    if (state.speed > 0.02 && distance > TREX_STOP_DISTANCE) {
      const step = Math.min(state.speed * dt, Math.max(0, distance - TREX_STOP_DISTANCE));
      model.position.addScaledVector(toPlayer.normalize(), step);
      if (!roaring) {
        state.mode = "chase";
      }
      activateWalk();
    } else if (distance <= TREX_ROAR_DISTANCE) {
      state.mode = roaring ? "roar" : "close";
      activateRoar();
    } else if (!roaring) {
      state.mode = "idle";
    }

    roarCooldown = Math.max(0, roarCooldown - dt);

    if (walkAction && !roaring) {
      walkAction.paused = state.speed < 0.08;
      if (!walkAction.paused) {
        walkAction.timeScale = THREE.MathUtils.clamp(
          0.7 + state.speed / TREX_CHASE_SPEED,
          0.7,
          1.35,
        );
      }
      state.activeClip = walkAction.getClip().name;
    }

    if (mixer) mixer.update(dt);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  console.log("[TRex] Spawned at", TREX_SPAWN);
}

spawnTRex().catch((error) => {
  console.error("[TRex] Failed to spawn:", error);
});
