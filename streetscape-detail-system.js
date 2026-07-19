(() => {
  "use strict";

  if (window.__voxcelStreetscape?.ready) return;

  const SYSTEM_VERSION = 1;
  const SIGN_LIFT = 0.35;
  const STOP_LINE_OFFSET = 10.2;
  const CROSSWALK_CENTER_OFFSET = 6;
  const CROSSWALK_DEPTH = 5.8;
  const STOP_LINE_DEPTH = 0.2;
  const ROAD_CENTERLINES = Object.freeze({
    x: Object.freeze([0, 44]),
    z: Object.freeze([-70, 0, 70]),
  });

  const state = {
    ready: false,
    reason: "initializing",
    elevatedSignCount: 0,
    vehicleSignalCount: 0,
    removedCenterBarCount: 0,
    pedestrianSignalCount: 0,
    roadFacingPedestrianSignalCount: 0,
    stopLineCount: 0,
    crosswalkStripeCount: 0,
  };

  let handle = null;
  let pollingTimer = null;

  function closeTo(value, expected, epsilon = 0.025) {
    return Number.isFinite(value) && Math.abs(value - expected) <= epsilon;
  }

  function geometrySize(mesh) {
    const parameters = mesh?.geometry?.parameters;
    if (!parameters) return null;
    return {
      width: Number(parameters.width),
      height: Number(parameters.height),
      depth: Number(parameters.depth),
    };
  }

  function nearest(value, candidates) {
    return candidates.reduce((best, candidate) => (
      Math.abs(value - candidate) < Math.abs(value - best) ? candidate : best
    ));
  }

  function parseIntersectionCenter(intersectionId) {
    const [x, z] = String(intersectionId || "").split(",").map(Number);
    return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null;
  }

  function elevateBuildingSigns() {
    for (const [buildingId, view] of Object.entries(handle?.buildingViews || {})) {
      const sign = view?.roofSign || view?.rooftopSign;
      if (!sign?.isMesh || sign.userData?.voxcelStreetscapeSignLifted) continue;
      sign.userData ||= {};
      sign.userData.voxcelStreetscapeSignOriginalY = sign.position.y;
      sign.userData.voxcelStreetscapeSignLift = SIGN_LIFT;
      sign.userData.voxcelStreetscapeSignLifted = true;
      sign.userData.voxcelBuildingId ||= buildingId;
      sign.position.y += SIGN_LIFT;
      state.elevatedSignCount += 1;
    }
  }

  function isCenterSignalBar(mesh) {
    const size = geometrySize(mesh);
    return Boolean(
      mesh?.isMesh &&
      size &&
      closeTo(size.width, 0.88) &&
      closeTo(size.height, 0.2) &&
      closeTo(size.depth, 0.18) &&
      closeTo(mesh.position.x, 6.15) &&
      closeTo(mesh.position.y, 3.72) &&
      closeTo(mesh.position.z, 0.34)
    );
  }

  function removeVehicleSignalCenterBars() {
    for (const signal of handle?.trafficLights || []) {
      if (signal.kind !== "vehicle" || !signal.group) continue;
      state.vehicleSignalCount += 1;
      const centerBar = signal.group.children.find(isCenterSignalBar);
      if (!centerBar) continue;
      signal.group.remove(centerBar);
      centerBar.geometry?.dispose?.();
      signal.group.userData ||= {};
      signal.group.userData.voxcelCenterSignalBarRemoved = true;
      state.removedCenterBarCount += 1;
    }
  }

  function facePedestrianSignalsTowardRoad() {
    for (const signal of handle?.trafficLights || []) {
      if (signal.kind !== "pedestrian" || !signal.group) continue;
      state.pedestrianSignalCount += 1;
      const center = parseIntersectionCenter(signal.intersectionId);
      if (!center) continue;
      const deltaX = signal.crossAxis === "ns" ? center.x - signal.group.position.x : 0;
      const deltaZ = signal.crossAxis === "ew" ? center.z - signal.group.position.z : 0;
      const distance = Math.hypot(deltaX, deltaZ);
      if (distance < 0.001) continue;
      signal.group.rotation.y = Math.atan2(deltaX, deltaZ);
      signal.group.userData ||= {};
      signal.group.userData.voxcelFacesRoad = true;
      signal.group.userData.voxcelRoadFacingDot = (
        Math.sin(signal.group.rotation.y) * deltaX +
        Math.cos(signal.group.rotation.y) * deltaZ
      ) / distance;
      state.roadFacingPedestrianSignalCount += 1;
    }
  }

  function isStopLine(mesh) {
    const size = geometrySize(mesh);
    if (!mesh?.isMesh || mesh.geometry?.type !== "PlaneGeometry" || !size) return false;
    return (
      closeTo(mesh.position.y, 0.028) &&
      (
        (closeTo(size.width, 3) && closeTo(size.height, STOP_LINE_DEPTH)) ||
        (closeTo(size.width, STOP_LINE_DEPTH) && closeTo(size.height, 3))
      )
    );
  }

  function isCrosswalkStripe(mesh) {
    const size = geometrySize(mesh);
    if (!mesh?.isMesh || mesh.geometry?.type !== "PlaneGeometry" || !size) return false;
    return (
      closeTo(mesh.position.y, 0.026) &&
      (
        (closeTo(size.width, 0.75) && closeTo(size.height, CROSSWALK_DEPTH)) ||
        (closeTo(size.width, CROSSWALK_DEPTH) && closeTo(size.height, 0.75))
      )
    );
  }

  function separateStopLinesFromCrosswalks() {
    handle.scene.traverse((object) => {
      if (isCrosswalkStripe(object)) {
        object.userData ||= {};
        object.userData.voxcelCrosswalkStripe = true;
        state.crosswalkStripeCount += 1;
        return;
      }
      if (!isStopLine(object)) return;
      const size = geometrySize(object);
      if (size.width > size.height) {
        const centerZ = nearest(object.position.z, ROAD_CENTERLINES.z);
        object.position.z = centerZ + Math.sign(object.position.z - centerZ) * STOP_LINE_OFFSET;
      } else {
        const centerX = nearest(object.position.x, ROAD_CENTERLINES.x);
        object.position.x = centerX + Math.sign(object.position.x - centerX) * STOP_LINE_OFFSET;
      }
      object.name = `StreetStopLine:${state.stopLineCount}`;
      object.userData ||= {};
      object.userData.voxcelStopLine = true;
      object.userData.voxcelStopLineOffset = STOP_LINE_OFFSET;
      state.stopLineCount += 1;
    });

    for (const stopLine of handle?.stopLines || []) {
      const center = parseIntersectionCenter(stopLine.intersectionId);
      if (!center) continue;
      if (stopLine.axis === "ns") {
        stopLine.z = center.z + Math.sign(stopLine.z - center.z) * STOP_LINE_OFFSET;
      } else if (stopLine.axis === "ew") {
        stopLine.x = center.x + Math.sign(stopLine.x - center.x) * STOP_LINE_OFFSET;
      }
    }
  }

  function snapshot() {
    const crosswalkOuterOffset = CROSSWALK_CENTER_OFFSET + CROSSWALK_DEPTH / 2;
    const stopLineInnerOffset = STOP_LINE_OFFSET - STOP_LINE_DEPTH / 2;
    return {
      ready: state.ready,
      reason: state.reason,
      version: SYSTEM_VERSION,
      signLift: SIGN_LIFT,
      elevatedSignCount: state.elevatedSignCount,
      vehicleSignalCount: state.vehicleSignalCount,
      removedCenterBarCount: state.removedCenterBarCount,
      pedestrianSignalCount: state.pedestrianSignalCount,
      roadFacingPedestrianSignalCount: state.roadFacingPedestrianSignalCount,
      stopLineCount: state.stopLineCount,
      crosswalkStripeCount: state.crosswalkStripeCount,
      streetMarkings: {
        crosswalkCenterOffset: CROSSWALK_CENTER_OFFSET,
        crosswalkOuterOffset,
        stopLineOffset: STOP_LINE_OFFSET,
        stopLineInnerOffset,
        minimumGap: Number((stopLineInnerOffset - crosswalkOuterOffset).toFixed(3)),
      },
    };
  }

  function initialize(runtimeHandle) {
    if (state.ready) return;
    handle = runtimeHandle;
    elevateBuildingSigns();
    removeVehicleSignalCenterBars();
    facePedestrianSignalsTowardRoad();
    separateStopLinesFromCrosswalks();
    state.ready = true;
    state.reason = null;
    window.__voxcelStreetscape = {
      ready: true,
      version: SYSTEM_VERSION,
      getState: snapshot,
    };
    window.dispatchEvent(new CustomEvent("voxcel:streetscape-ready", {
      detail: snapshot(),
    }));
  }

  function runtimeReady(runtimeHandle) {
    return Boolean(
      runtimeHandle?.scene?.traverse &&
      runtimeHandle?.buildingViews &&
      Array.isArray(runtimeHandle?.trafficLights) &&
      Array.isArray(runtimeHandle?.stopLines) &&
      window.__voxcelBuildingFrontages?.ready
    );
  }

  function start() {
    if (runtimeReady(window.__voxcelPlayer)) {
      initialize(window.__voxcelPlayer);
      return;
    }
    const startedAt = performance.now();
    pollingTimer = window.setInterval(() => {
      if (runtimeReady(window.__voxcelPlayer)) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
        initialize(window.__voxcelPlayer);
      } else if (performance.now() - startedAt > 15000) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
        state.reason = "extended-runtime-bridge-missing";
        window.__voxcelStreetscape = {
          ready: false,
          version: SYSTEM_VERSION,
          reason: state.reason,
          getState: snapshot,
        };
      }
    }, 20);
  }

  window.__voxcelStreetscape = {
    ready: false,
    version: SYSTEM_VERSION,
    reason: state.reason,
    getState: snapshot,
  };
  start();
})();
