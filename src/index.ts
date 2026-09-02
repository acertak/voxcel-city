import {
  type AppLoginEnv,
  enforceAppLogin,
  protectAuthenticatedResponse,
} from './app-login';

interface VoxcelEnv extends AppLoginEnv {
  ASSETS: Fetcher;
}

const APP_LOGIN_BRAND = Object.freeze({
  id: 'voxcel-city',
  title: 'Voxcel City',
  subtitle: 'この街は非公開です。アプリ専用アカウントでログインしてください。',
  accent: '#fb7185',
});

const PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t}";
const ENHANCED_PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t,pedestrians:Mg,camera:qt,renderer:Me,state:u,buildings:it,buildingViews:Je,entrances:_s,decorativeBuildings:HD,vehicles:wt,trafficLights:de,stopLines:J8,movementLocked:!1,getMovementInput:()=>({left:!!(me.a||me.arrowleft),right:!!(me.d||me.arrowright),forward:!!(me.w||me.arrowup),backward:!!(me.s||me.arrowdown),touchX:z4?W8.x:0,touchY:z4?W8.y:0}),setMovementLocked:(locked)=>{window.__voxcelPlayer.movementLocked=!!locked},getCameraYaw:()=>be,setCameraYaw:(yaw)=>{if(Number.isFinite(yaw))be=yaw},getCameraState:()=>({yaw:be,pitch:De,distance:bD,targetDistance:A8}),setCameraState:(next={})=>{Number.isFinite(next.yaw)&&(be=next.yaw),Number.isFinite(next.pitch)&&(De=Math.max(-.3,Math.min(1.2,next.pitch))),Number.isFinite(next.distance)&&(bD=Math.max(4,Math.min(260,next.distance))),Number.isFinite(next.targetDistance)&&(A8=Math.max(4,Math.min(260,next.targetDistance)))},enterBuilding:c4,exitBuilding:ug,notify:PP}";
const BASE_MOVEMENT_INPUT = "z4&&(P+=W8.x,e-=W8.y),ka(t,A)";
const LOCKABLE_MOVEMENT_INPUT =
  "z4&&(P+=W8.x,e-=W8.y),window.__voxcelPlayer?.movementLocked&&(P=0,e=0),ka(t,A)";
const LEGACY_AVATAR_LOADER_ENABLED = false;

function prepareAppShell(html: string): string {
  let prepared = html;

  if (prepared.includes(PLAYER_HANDLE) && !prepared.includes("buildingViews:Je")) {
    prepared = prepared.replace(PLAYER_HANDLE, ENHANCED_PLAYER_HANDLE);
  } else if (!prepared.includes("window.__voxcelPlayer")) {
    prepared = prepared.replace(
      "N.add(_t);var be=",
      `N.add(_t);${ENHANCED_PLAYER_HANDLE};var be=`,
    );
  }

  if (prepared.includes(BASE_MOVEMENT_INPUT)) {
    prepared = prepared.replace(BASE_MOVEMENT_INPUT, LOCKABLE_MOVEMENT_INPUT);
  }

  if (
    LEGACY_AVATAR_LOADER_ENABLED &&
    !prepared.includes("avatar-loader.js") &&
    !prepared.includes("__voxcelInlineAvatarLoader")
  ) {
    prepared = prepared.replace(
      "</body>",
      '<script type="module" src="/avatar-loader.js"></script></body>',
    );
  }

  return prepared;
}

export default {
  async fetch(request: Request, env: VoxcelEnv): Promise<Response> {
    const authResponse = await enforceAppLogin(request, env, APP_LOGIN_BRAND);
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetUrl = new URL(pathname, request.url);
    assetUrl.search = url.search;

    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));

    if (pathname !== "/index.html" || !assetResponse.ok) {
      return protectAuthenticatedResponse(assetResponse, pathname);
    }

    const html = prepareAppShell(await assetResponse.text());
    const headers = new Headers(assetResponse.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    headers.delete("Content-Length");

    return protectAuthenticatedResponse(new Response(html, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    }), pathname);
  },
};
