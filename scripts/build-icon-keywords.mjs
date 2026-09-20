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
  ["petits pois", "petit-pois"],
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
  ["crevettes", "crevette"],
  ["moules", "moule"],
  ["blinis", "blini"],
  ["pangas", "pangasius"],
  ["longan", "longane"],
  ["canele", "cannele"],
  ["canelé", "cannele"],
  ["sésame", "graine-de-sesame"],
  ["sesame", "graine-de-sesame"],
  ["lin", "graine-de-lin"],
  ["tournesol", "graine-de-tournesol"],
  ["chia", "graine-de-chia"],
  ["bambou", "pousse-bambou"],
  ["christophine", "chayote"],
  ["chouchou", "chayote"],
  ["plie", "carrelet"],
];

const INVARIABLE = new Set([
  "pois",
  "riz",
  "mais",
  "ananas",
  "cassis",
  "radis",
  "puits",
  "bois",
  "temps",
  "corps",
  "os",
  "gros",
  "brebis",
  "mais",
]);

function pluralizeWord(word) {
  if (word.length < 3 || INVARIABLE.has(word) || /[sxz]$/.test(word)) return word;
  if (word.endsWith("al") && word.length > 3) return `${word.slice(0, -2)}aux`;
  if (word.endsWith("eau") || word.endsWith("eu") || word.endsWith("ou")) return `${word}x`;
  return `${word}s`;
}

function pluralizePhrase(phrase) {
  return phrase
    .split(/\s+/)
    .filter(Boolean)
    .map(pluralizeWord)
    .join(" ");
}

/** @type {Map<string, string>} */
const map = new Map();
function setKeyword(keyword, slug) {
  const key = keyword.trim().toLowerCase();
  if (key.length < 3) return;
  if (!map.has(key)) map.set(key, slug);
  const plural = pluralizePhrase(key);
  if (plural !== key && !map.has(plural)) map.set(plural, slug);
}

for (const [keyword, slug] of extra) {
  setKeyword(keyword, slug);
}
for (const item of catalog) {
  setKeyword(item.fr, item.slug);
  setKeyword(item.slug.replaceAll("-", " "), item.slug);
  setKeyword(item.slug, item.slug);
  for (const alias of item.aliases ?? []) {
    setKeyword(alias, item.slug);
  }
}

const rows = [...map.entries()].sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], "fr"));

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
