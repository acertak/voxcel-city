import { createServer } from "node:http";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const root = process.cwd();

const PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t}";
const ENHANCED_PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t,pedestrians:Mg,camera:qt,renderer:Me,state:u,buildings:it,buildingViews:Je,entrances:_s,decorativeBuildings:HD,vehicles:wt,trafficLights:de,stopLines:J8,roadRects:Ks,sceneryTrees:Xs,movementLocked:!1,getMovementInput:()=>({left:!!(me.a||me.arrowleft),right:!!(me.d||me.arrowright),forward:!!(me.w||me.arrowup),backward:!!(me.s||me.arrowdown),touchX:z4?W8.x:0,touchY:z4?W8.y:0}),setMovementLocked:(locked)=>{window.__voxcelPlayer.movementLocked=!!locked},getCameraYaw:()=>be,setCameraYaw:(yaw)=>{if(Number.isFinite(yaw))be=yaw},getCameraState:()=>({yaw:be,pitch:De,distance:bD,targetDistance:A8}),setCameraState:(next={})=>{Number.isFinite(next.yaw)&&(be=next.yaw),Number.isFinite(next.pitch)&&(De=Math.max(-.3,Math.min(1.2,next.pitch))),Number.isFinite(next.distance)&&(bD=Math.max(4,Math.min(260,next.distance))),Number.isFinite(next.targetDistance)&&(A8=Math.max(4,Math.min(260,next.targetDistance)))},enterBuilding:c4,exitBuilding:ug,notify:PP}";
const BASE_MOVEMENT_INPUT = "z4&&(P+=W8.x,e-=W8.y),ka(t,A)";
const LOCKABLE_MOVEMENT_INPUT =
  "z4&&(P+=W8.x,e-=W8.y),window.__voxcelPlayer?.movementLocked&&(P=0,e=0),ka(t,A)";
const LEGACY_AVATAR_LOADER_ENABLED = false;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(root, pathname);

  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const contentType = contentTypes[extname(filePath)] || "application/octet-stream";

    if (pathname === "/index.html") {
      let html = readFileSync(filePath, "utf8");
      if (html.includes(PLAYER_HANDLE) && !html.includes("buildingViews:Je")) {
        html = html.replace(PLAYER_HANDLE, ENHANCED_PLAYER_HANDLE);
      } else if (!html.includes("window.__voxcelPlayer")) {
        html = html.replace(
          "N.add(_t);var be=",
          `N.add(_t);${ENHANCED_PLAYER_HANDLE};var be=`,
        );
      }
      if (html.includes(BASE_MOVEMENT_INPUT)) {
        html = html.replace(BASE_MOVEMENT_INPUT, LOCKABLE_MOVEMENT_INPUT);
      }
      if (
        LEGACY_AVATAR_LOADER_ENABLED &&
        !html.includes("avatar-loader.js") &&
        !html.includes("__voxcelInlineAvatarLoader")
      ) {
        html = html.replace(
          "</body>",
          '<script type="module" src="/avatar-loader.js"></script></body>',
        );
      }
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      });
      res.end(html);
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}).listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}`);
});
