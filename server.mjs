import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const root = process.cwd();

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
  const pathname = url.pathname === "/" ? "/voxcel-city.html" : url.pathname;
  const filePath = join(root, pathname);

  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
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
