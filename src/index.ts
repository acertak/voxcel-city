interface Env {
  ASSETS: Fetcher;
}

const PLAYER_HOOK =
  "N.add(_t);window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t};var be=";

function prepareAppShell(html: string): string {
  let prepared = html;

  if (!prepared.includes("window.__voxcelPlayer")) {
    prepared = prepared.replace("N.add(_t);var be=", PLAYER_HOOK);
  }

  if (!prepared.includes("avatar-loader.js") && !prepared.includes("__voxcelInlineAvatarLoader")) {
    prepared = prepared.replace(
      "</body>",
      '<script type="module" src="/avatar-loader.js"></script></body>',
    );
  }

  return prepared;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
