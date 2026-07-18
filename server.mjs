import { createServer } from "node:http";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const root = process.cwd();

const PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t}";
const ENHANCED_PLAYER_HANDLE =
  "window.__voxcelPlayer={scene:N,playerRoot:CA,playerShadow:_t,pedestrians:Mg,camera:qt,renderer:Me,state:u,buildings:it,buildingViews:Je}";
const LEGACY_AVATAR_LOADER_ENABLED = false;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
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
