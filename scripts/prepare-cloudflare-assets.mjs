import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".cloudflare-assets");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of [
  "index.html",
  "texture-atlas-system.js",
  "city-world-system.js",
  "building-frontage-system.js",
  "city-map-system.js",
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

console.log(`Prepared Cloudflare assets at ${output}`);
