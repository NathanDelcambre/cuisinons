import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import catalog from "./recipe-photo-catalog.json" with { type: "json" };

const assets = "C:/Users/dataa/.cursor/projects/c-Users-dataa-Desktop-Sides-Cuisinons/assets";
const dest = join(dirname(fileURLToPath(import.meta.url)), "../apps/web/public/recipes");
mkdirSync(dest, { recursive: true });

let copied = 0;
const missing = [];
for (const item of catalog) {
  const src = join(assets, `recipe-${item.id}.png`);
  if (!existsSync(src)) {
    missing.push(item.id);
    continue;
  }
  copyFileSync(src, join(dest, `${item.id}.png`));
  copied += 1;
}
console.log(`copied ${copied}/${catalog.length} recipe pngs to ${dest}`);
if (missing.length) {
  console.error(`missing ${missing.length}: ${missing.join(", ")}`);
  process.exitCode = 1;
}
