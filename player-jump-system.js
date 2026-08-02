(() => {
  "use strict";

  if (window.__voxcelJump?.__voxcelJumpSystem) return;

  const SYSTEM_VERSION = 1;
  const RUNTIME_TIMEOUT_MS = 25_000;
  const GRAVITY = 21;
  const JUMP_VELOCITY = 8.2;
  // Releasing the key early clips the arc, so tapping hops and holding clears the full height.
  const SHORT_HOP_VELOCITY = 3.4;
  const JUMP_BUFFER_MS = 170;
  const MAX_JUMP_HEIGHT = 2.6;
  const SHADOW_BASE_OPACITY = 0.18;
  const SHADOW_BASE_SCALE = 1;

  const runtime = {
    ready: false,
    reason: "initializing",
    handle: null,
    airborne: false,
    velocity: 0,
    groundY: 1.2,
    appliedY: null,
    jumpHeld: false,
    bufferedUntil: 0,
    jumpCount: 0,
    landingCount: 0,
    peakHeight: 0,
    lastPeakHeight: 0,
    blockedReason: null,
    button: null,
    lastFrameAt: 0,
    unregisterBeforeRender: null,
  };

  const api = {
    __voxcelJumpSystem: true,
    version: SYSTEM_VERSION,
    getState,
    requestJump,
  };
  Object.defineProperties(api, {
    ready: { enumerable: true, get: () => runtime.ready },
    airborne: { enumerable: true, get: () => runtime.airborne },
    velocity: { enumerable: true, get: () => runtime.velocity },
    height: {
      enumerable: true,
      get: () => (runtime.handle ? runtime.handle.playerRoot.position.y - runtime.groundY : 0),
    },
  });
  window.__voxcelJump = api;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function blockedReason() {
    const handle = runtime.handle;
    if (!handle) return "no-runtime";
    if (handle.state?.vehicle) return "riding";
    if (handle.movementLocked) return "movement-locked";
    if (handle.state?.arrestPhase) return "arrested";
    if (window.__voxcelMap?.isOpen) return "map-open";
    // The elevator cabin is barely taller than the player; a hop would clip its ceiling.
    if (window.__voxcelEnhancements?.isElevatorSceneActive?.()) return "elevator";
    if (document.getElementById("mO")?.classList.contains("show")) return "modal-open";
    if (!handle.playerRoot?.visible) return "player-hidden";
    return null;
  }

  function requestJump() {
    runtime.bufferedUntil = performance.now() + JUMP_BUFFER_MS;
    return !blockedReason();
  }

  function isJumpKey(event) {
    const key = String(event.key || "").toLowerCase();
    return key === " " || key === "spacebar" || String(event.code || "").toLowerCase() === "space";
  }

  function handleKeyDown(event) {
    if (!isJumpKey(event)) return;
    // Space would otherwise re-fire whichever HUD button still holds focus.
    event.preventDefault();
    runtime.jumpHeld = true;
    if (event.repeat) return;
    requestJump();
  }

  function handleKeyUp(event) {
    if (!isJumpKey(event)) return;
    runtime.jumpHeld = false;
  }

  function releaseInput() {
    runtime.jumpHeld = false;
  }

  function mountTouchButton() {
    if (!isTouchDevice() || runtime.button) return;
    const bar = document.querySelector(".bb");
    if (!bar) return;

    const style = document.createElement("style");
    style.textContent = `
.voxcel-jump-btn{pointer-events:auto;padding:12px 20px;border-radius:14px;border:1px solid rgba(255,255,255,.2);
background:linear-gradient(135deg,rgba(93,219,106,.38),rgba(111,212,255,.3));color:#fff;font-size:14px;
font-weight:800;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;
box-shadow:0 6px 20px rgba(0,0,0,.28);touch-action:none;user-select:none}
.voxcel-jump-btn:active{transform:scale(.94)}
`;
    document.head.append(style);

    const button = document.createElement("button");
    button.id = "voxcelJumpBtn";
    button.type = "button";
    button.className = "voxcel-jump-btn";
    button.textContent = "⤴ ジャンプ";
    button.setAttribute("aria-label", "ジャンプ");
    const press = (event) => {
      event.preventDefault();
      runtime.jumpHeld = true;
      requestJump();
    };
    const release = (event) => {
      event.preventDefault();
      runtime.jumpHeld = false;
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
    bar.append(button);
    runtime.button = button;
  }

  function updateShadow(height) {
    const shadow = runtime.handle.playerShadow;
    if (!shadow) return;
    const amount = clamp(height / MAX_JUMP_HEIGHT, 0, 1);
    shadow.scale.setScalar(SHADOW_BASE_SCALE * (1 - amount * 0.42));
    if (shadow.material) shadow.material.opacity = SHADOW_BASE_OPACITY * (1 - amount * 0.62);
  }

  function update(now) {
    const handle = runtime.handle;
    if (!handle) return;
    const dt = runtime.lastFrameAt
      ? clamp((now - runtime.lastFrameAt) / 1000, 0.001, 1 / 15)
      : 1 / 60;
    runtime.lastFrameAt = now;

    const position = handle.playerRoot.position;
    const blocked = blockedReason();
    runtime.blockedReason = blocked;

    if (blocked) {
      if (runtime.airborne) {
        position.y = runtime.groundY;
        runtime.airborne = false;
        runtime.velocity = 0;
      }
      runtime.appliedY = null;
      runtime.bufferedUntil = 0;
      runtime.groundY = position.y;
      updateShadow(0);
      return;
    }

    // Anything else that repositions the player (respawn, entering a shop, a teleport test
    // hook) wins: drop the arc and re-baseline on whatever height the game just set.
    if (runtime.appliedY !== null && Math.abs(position.y - runtime.appliedY) > 0.0005) {
      runtime.airborne = false;
      runtime.velocity = 0;
      runtime.appliedY = null;
    }
    if (!runtime.airborne) runtime.groundY = position.y;

    if (!runtime.airborne && now < runtime.bufferedUntil) {
      runtime.bufferedUntil = 0;
      runtime.airborne = true;
      runtime.velocity = JUMP_VELOCITY;
      runtime.jumpCount += 1;
      runtime.peakHeight = 0;
    }

    if (runtime.airborne) {
      runtime.velocity -= GRAVITY * dt;
      if (!runtime.jumpHeld && runtime.velocity > SHORT_HOP_VELOCITY) {
        runtime.velocity = SHORT_HOP_VELOCITY;
      }
      let nextY = position.y + runtime.velocity * dt;
      if (nextY <= runtime.groundY) {
        nextY = runtime.groundY;
        runtime.airborne = false;
        runtime.velocity = 0;
        runtime.landingCount += 1;
        runtime.lastPeakHeight = runtime.peakHeight;
      }
      const delta = nextY - position.y;
      position.y = nextY;
      if (handle.camera) handle.camera.position.y += delta;
      runtime.appliedY = nextY;
      runtime.peakHeight = Math.max(runtime.peakHeight, nextY - runtime.groundY);
    } else {
      runtime.appliedY = position.y;
    }

    updateShadow(position.y - runtime.groundY);
  }

  function getState() {
    const position = runtime.handle?.playerRoot?.position;
    return {
      ready: runtime.ready,
      version: SYSTEM_VERSION,
      reason: runtime.reason,
      airborne: runtime.airborne,
      height: position ? Math.round((position.y - runtime.groundY) * 1000) / 1000 : 0,
      groundY: Math.round(runtime.groundY * 1000) / 1000,
      velocity: Math.round(runtime.velocity * 1000) / 1000,
      jumpCount: runtime.jumpCount,
      landingCount: runtime.landingCount,
      peakHeight: Math.round(Math.max(runtime.peakHeight, runtime.lastPeakHeight) * 1000) / 1000,
      jumpHeld: runtime.jumpHeld,
      blockedReason: runtime.blockedReason,
      touchButtonMounted: Boolean(runtime.button),
    };
  }

  function initialize(handle) {
    runtime.handle = handle;
    runtime.groundY = handle.playerRoot.position.y;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseInput);
    mountTouchButton();
    runtime.unregisterBeforeRender = window.__voxcelEnhancements.registerBeforeRender(update);
    runtime.ready = true;
    runtime.reason = "ready";
    window.dispatchEvent(new CustomEvent("voxcel:jump-ready", { detail: getState() }));
  }

  const startedAt = performance.now();
  const timer = window.setInterval(() => {
    const handle = window.__voxcelPlayer;
    if (
      handle?.playerRoot?.position &&
      handle?.playerShadow &&
      handle?.camera?.position &&
      handle?.state &&
      window.__voxcelEnhancements?.ready
    ) {
      window.clearInterval(timer);
      try {
        initialize(handle);
      } catch (error) {
        runtime.reason = error instanceof Error ? error.message : String(error);
        console.error("Voxcel jump system failed to initialize.", error);
      }
      return;
    }
    if (performance.now() - startedAt > RUNTIME_TIMEOUT_MS) {
      window.clearInterval(timer);
      runtime.reason = "runtime-bridge-timeout";
    }
  }, 30);
})();
