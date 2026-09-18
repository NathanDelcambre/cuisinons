import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import catalog from "./ingredient-icon-catalog.json" with { type: "json" };

const assets = "C:/Users/dataa/.cursor/projects/c-Users-dataa-Desktop-Sides-Cuisinons/assets";
const dest = join(dirname(fileURLToPath(import.meta.url)), "../apps/web/public/ingredients");
mkdirSync(dest, { recursive: true });

let copied = 0;
const missing = [];
for (const item of catalog) {
  const src = join(assets, `ing-${item.slug}.png`);
  if (!existsSync(src)) {
    missing.push(item.slug);
    continue;
  }
  copyFileSync(src, join(dest, `${item.slug}.png`));
  copied += 1;
}
console.log(`copied ${copied}/${catalog.length} pngs to ${dest}`);
if (missing.length) {
  console.error(`missing ${missing.length}: ${missing.join(", ")}`);
  process.exit(1);
}
