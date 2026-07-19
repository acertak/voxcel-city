interface Env {
  ASSETS: Fetcher;
  MYCRAFT_AUTH: Fetcher;
}

const BASIC_AUTH_CHALLENGE = 'Basic realm="MyCraft"';

function unauthorized(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": BASIC_AUTH_CHALLENGE,
    },
  });
}

async function authorizeWithMycraft(request: Request, env: Env): Promise<Response | null> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const authResponse = await env.MYCRAFT_AUTH.fetch(
      new Request("https://mycraft.internal/healthz", {
        headers: { Authorization: authorization },
      }),
    );

    return authResponse.ok ? null : unauthorized();
  } catch {
    return new Response("Authentication service unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

const PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t}";
const ENHANCED_PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t,pedestrians:Mg,camera:qt,renderer:Me,state:u,buildings:it,buildingViews:Je,entrances:_s,decorativeBuildings:HD,enterBuilding:c4,exitBuilding:ug,notify:PP}";
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const authFailure = await authorizeWithMycraft(request, env);
    if (authFailure) return authFailure;

    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetUrl = new URL(pathname, request.url);
    assetUrl.search = url.search;

    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));

    if (pathname !== "/index.html" || !assetResponse.ok) {
      return assetResponse;
    }

    const html = prepareAppShell(await assetResponse.text());
    const headers = new Headers(assetResponse.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    headers.delete("Content-Length");

    return new Response(html, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
