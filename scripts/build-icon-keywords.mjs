import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import catalog from "./ingredient-icon-catalog.json" with { type: "json" };

const extra = [
  ["bœuf", "boeuf"],
  ["œuf", "oeuf"],
  ["œufs", "oeuf"],
  ["huile d olive", "huile-olive"],
  ["huile d'olive", "huile-olive"],
  ["creme fraiche", "creme"],
  ["crème fraîche", "creme"],
  ["fromage blanc", "fromage-blanc"],
  ["pomme de terre", "pomme-de-terre"],
  ["patate douce", "patate-douce"],
  ["petit pois", "petit-pois"],
  ["pois chiche", "pois-chiche"],
  ["haricot vert", "haricot-vert"],
  ["haricot rouge", "haricot-rouge"],
  ["sauce soja", "sauce-soja"],
  ["lait de coco", "lait-de-coco"],
  ["creme de coco", "creme-de-coco"],
  ["fromage râpé", "fromage-rape"],
  ["yaourt grec", "yaourt-grec"],
  ["whey chocolat", "whey-chocolat"],
  ["whey vanille", "whey-vanille"],
  ["colin", "cabillaud"],
  ["lard", "lardon"],
  ["bacon", "bacon"],
  ["nuggets", "nugget"],
  ["steak", "steak"],
  ["courge", "potiron"],
  ["pâtes", "pates"],
  ["thé", "the"],
  ["café", "cafe"],
  ["bière", "biere"],
  ["maïs", "mais"],
  ["échalote", "echalote"],
  ["épinard", "epinard"],
  ["pêche", "peche"],
  ["pastèque", "pasteque"],
  ["huître", "huitre"],
  ["mûre", "mure"],
  ["clémentine", "clementine"],
  ["céleri", "celeri"],
];

/** @type {Map<string, string>} */
const map = new Map();
for (const [keyword, slug] of extra) {
  map.set(keyword.toLowerCase(), slug);
}
for (const item of catalog) {
  map.set(item.fr.toLowerCase(), item.slug);
  map.set(item.slug.replaceAll("-", " "), item.slug);
  map.set(item.slug, item.slug);
}

const rows = [...map.entries()]
  .filter(([keyword]) => keyword.trim().length >= 3)
  .sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], "fr"));

const body = rows
  .map(([keyword, slug]) => `  [${JSON.stringify(keyword)}, ${JSON.stringify(slug)}]`)
  .join(",\n");

const out = join(dirname(fileURLToPath(import.meta.url)), "../packages/db/src/icon-keywords.generated.ts");
writeFileSync(
  out,
  `/** Generated from scripts/ingredient-icon-catalog.json — do not edit by hand. */\n` +
    `export const DEDICATED_KEYWORDS: Array<[string, string]> = [\n${body},\n];\n`,
);
console.log(`wrote ${rows.length} keywords to ${out}`);
