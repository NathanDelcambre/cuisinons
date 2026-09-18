import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, "recipe-photo-catalog.json"), "utf8"));

const SURFACES = [
  "a warm walnut wood table",
  "a soft cream linen tablecloth",
  "a pale grey stone countertop",
  "a light oak cutting board on a rustic table",
  "a warm terracotta tiled surface",
  "a matte off-white concrete surface",
];

const ANGLES = [
  "shot at a 45 degree angle",
  "shot from directly overhead as a flat lay",
  "shot from a low three-quarter angle close to the table",
  "shot at eye level with the plate filling the frame",
];

const LIGHTS = [
  "soft morning window light coming from the left with gentle shadows",
  "diffused daylight from behind creating a soft rim of backlight",
  "warm late-afternoon side light with long soft shadows",
  "bright even overcast daylight, airy and fresh",
];

const PROPS = [
  "a linen napkin and an olive wood spoon just outside the plate",
  "a few scattered fresh herbs and a small pinch bowl of sea salt",
  "a vintage fork resting beside the dish",
  "a glass of water and crumbs on the table, lived-in and natural",
  "nothing else on the table, clean and minimal",
];

function vessel(item) {
  const t = `${item.name} ${item.en}`.toLowerCase();
  if (/(vinaigrette|marinade|sauce|cacik|zaalouk|chutney)/.test(t))
    return "served in a small artisanal ceramic pinch bowl";
  if (/(gaspacho|velout|soupe|harira|dahl|soup)/.test(t))
    return "served in a deep hand-thrown stoneware soup bowl";
  if (/(porridge|overnight)/.test(t)) return "served in a clear glass jar";
  if (/bowl/.test(t)) return "served in a wide deep ceramic bowl";
  if (/(salade|salad|tabou|coleslaw)/.test(t))
    return "served in a large shallow ceramic salad bowl";
  if (/(papillote|parchment)/.test(t))
    return "served in an opened parchment paper papillote on a baking tray";
  if (/(gratin|tian|crumble|farci|stuffed|cocotte|four|baked|roulés)/.test(t))
    return "served in a rustic enamelled ceramic baking dish, straight from the oven";
  if (/(plaque|sheet-pan|sheet pan)/.test(t))
    return "served on a well-used metal sheet pan";
  if (/(poêle|skillet|frittata|saut|plancha|piccata)/.test(t))
    return "served in a black cast-iron skillet";
  if (/(brochette|skewer)/.test(t))
    return "served on a wooden serving board";
  if (/(pancake)/.test(t)) return "stacked on a small ceramic plate";
  if (/(pâtes|pasta|nouilles|noodle)/.test(t))
    return "twirled in a wide pasta plate";
  return "plated on a handmade speckled ceramic plate";
}

const items = catalog.map((item, i) => ({
  id: item.id,
  name: item.name,
  prompt: [
    `Photorealistic editorial cookbook photograph of ${item.en}, ${vessel(item)}, on ${SURFACES[i % SURFACES.length]}.`,
    `${ANGLES[(i * 3) % ANGLES.length].replace(/^s/, "S")}, ${LIGHTS[(i * 5) % LIGHTS.length]}.`,
    `${PROPS[(i * 7) % PROPS.length].replace(/^./, (c) => c.toUpperCase())}.`,
    "Real food, freshly cooked and appetizing, honest home cooking rather than styled restaurant plating, natural saturated colours, visible texture and glistening sauce, shallow depth of field with a crisp focal point and a softly blurred background.",
    "Shot on a full-frame camera with a 50mm lens. No text, no watermark, no logo, no hands, no people, no cutlery in the food, no packaging.",
  ].join(" "),
}));

const SLICES = 8;
const perSlice = Math.ceil(items.length / SLICES);
for (let s = 0; s < SLICES; s += 1) {
  const slice = items.slice(s * perSlice, (s + 1) * perSlice);
  const file = join(here, `recipe-slice-${s}.json`);
  if (!slice.length) {
    if (existsSync(file)) unlinkSync(file);
    continue;
  }
  writeFileSync(file, `${JSON.stringify(slice, null, 2)}\n`);
  console.log(`recipe-slice-${s}.json: ${slice.length}`);
}
console.log(`total ${items.length}`);
