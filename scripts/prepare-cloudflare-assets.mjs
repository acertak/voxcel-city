import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".cloudflare-assets");
const playerHandle =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t}";
const enhancedPlayerHandle =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t,pedestrians:Mg,camera:qt,renderer:Me,state:u,buildings:it,buildingViews:Je,entrances:_s,decorativeBuildings:HD,vehicles:wt,trafficLights:de,stopLines:J8,roadRects:Ks,sceneryTrees:Xs,movementLocked:!1,getMovementInput:()=>({left:!!(me.a||me.arrowleft),right:!!(me.d||me.arrowright),forward:!!(me.w||me.arrowup),backward:!!(me.s||me.arrowdown),touchX:z4?W8.x:0,touchY:z4?W8.y:0}),setMovementLocked:(locked)=>{window.__voxcelPlayer.movementLocked=!!locked},getCameraYaw:()=>be,setCameraYaw:(yaw)=>{if(Number.isFinite(yaw))be=yaw},getCameraState:()=>({yaw:be,pitch:De,distance:bD,targetDistance:A8}),setCameraState:(next={})=>{Number.isFinite(next.yaw)&&(be=next.yaw),Number.isFinite(next.pitch)&&(De=Math.max(-.3,Math.min(1.2,next.pitch))),Number.isFinite(next.distance)&&(bD=Math.max(4,Math.min(260,next.distance))),Number.isFinite(next.targetDistance)&&(A8=Math.max(4,Math.min(260,next.targetDistance)))},enterBuilding:c4,exitBuilding:ug,notify:PP}";
const baseMovementInput = "z4&&(P+=W8.x,e-=W8.y),ka(t,A)";
const lockableMovementInput =
  "z4&&(P+=W8.x,e-=W8.y),window.__voxcelPlayer?.movementLocked&&(P=0,e=0),ka(t,A)";

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of [
  "index.html",
  "texture-atlas-system.js",
  "city-world-system.js",
  "building-frontage-system.js",
  "streetscape-detail-system.js",
  "city-map-system.js",
  "ring-road-system.js",
  "player-jump-system.js",
  "athletic-park-system.js",
  "modular-character-system.js",
  "vehicle-detail-system.js",
  "world-enhancements.js",
  "assets",
  "images",
]) {
  const source = join(root, name);
  if (existsSync(source)) {
    await cp(source, join(output, name), { recursive: true, force: true });
  }
}

const modelsDirectory = join(root, "models");
const outputModelsDirectory = join(output, "models");
if (existsSync(modelsDirectory)) {
  await mkdir(outputModelsDirectory, { recursive: true });
  for (const entry of await readdir(modelsDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".glb")) continue;
    await cp(
      join(modelsDirectory, entry.name),
      join(outputModelsDirectory, entry.name),
      { force: true },
    );
  }
}

const publicDirectory = join(root, "public");
if (existsSync(publicDirectory)) {
  await cp(publicDirectory, output, { recursive: true, force: true });
}

const outputIndex = join(output, "index.html");
if (existsSync(outputIndex)) {
  let html = await readFile(outputIndex, "utf8");

  if (html.includes(playerHandle) && !html.includes("buildingViews:Je")) {
    html = html.replace(playerHandle, enhancedPlayerHandle);
  } else if (!html.includes("window.__voxcelPlayer")) {
    html = html.replace(
      "N.add(_t);var be=",
      `N.add(_t);${enhancedPlayerHandle};var be=`,
    );
  }

  if (html.includes(baseMovementInput)) {
    html = html.replace(baseMovementInput, lockableMovementInput);
  }

  await writeFile(outputIndex, html);
}

console.log(`Prepared Cloudflare assets at ${output}`);
