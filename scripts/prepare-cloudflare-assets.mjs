import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".cloudflare-assets");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of ["index.html", "avatar-loader.js", "assets", "images", "models"]) {
  const source = join(root, name);
  if (existsSync(source)) {
    await cp(source, join(output, name), { recursive: true, force: true });
  }
}

const publicDirectory = join(root, "public");
if (existsSync(publicDirectory)) {
  await cp(publicDirectory, output, { recursive: true, force: true });
}

console.log(`Prepared Cloudflare assets at ${output}`);
