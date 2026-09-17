import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/public/ingredients');
mkdirSync(dir, { recursive: true });

const slugs = [
  'cat-legumes','cat-fruits','cat-feculents','cat-cereales','cat-legumineuses','cat-viandes','cat-poissons',
  'cat-fruits-de-mer','cat-charcuterie','cat-oeufs','cat-fromages','cat-laitiers','cat-matieres-grasses',
  'cat-noix','cat-epices','cat-aromates','cat-sauces','cat-condiments','cat-preparations','cat-boulangerie',
  'cat-patisserie','cat-sucres','cat-boissons','cat-vegetarien','cat-transformes','cat-autres',
  'poulet','dinde','boeuf','veau','porc','jambon','lardon','saucisse','agneau','canard','saumon','thon',
  'cabillaud','crevette','moule','huitre','oeuf','lait','yaourt','skyr','fromage-blanc','creme','beurre',
  'huile-olive','huile','fromage','riz','pates','quinoa','avoine','semoule','pain','pomme-de-terre',
  'patate-douce','carotte','tomate','oignon','ail','echalote','poireau','courgette','aubergine','poivron',
  'brocoli','chou-fleur','chou','epinard','salade','concombre','champignon','haricot-vert','petit-pois',
  'mais','lentille','pois-chiche','haricot-sec','tofu','pomme','banane','fraise','framboise','myrtille',
  'orange','citron','avocat','mangue','raisin','poire','peche','abricot','ananas','kiwi','melon','pasteque',
  'amande','noix','noisette','cacahuete','graines','sucre','miel','chocolat','cacao','farine','levure',
  'sel','poivre','basilic','persil','thym','ciboulette','moutarde','vinaigre','sauce-soja','ketchup',
  'mayonnaise','eau','cafe','the','vin','biere','lait-coco','gingembre','epice','vanille','truite',
  'sardine','anchois','calamar','fenouil','betterave','celeri','navet','radis','asperge','artichaut','potiron',
];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function svg(slug: string) {
  const h = hash(slug);
  const hue = h % 360;
  const hue2 = (hue + 40) % 360;
  const isCat = slug.startsWith('cat-');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${slug}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 42% ${isCat ? 78 : 64}%)"/>
      <stop offset="1" stop-color="hsl(${hue2} 38% 88%)"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="54" fill="url(#g)" />
  <ellipse cx="64" cy="78" rx="${28 + (h % 10)}" ry="${18 + (h % 8)}" fill="hsla(0,0%,100%,0.55)"/>
  <path d="M44 54c8-18 32-18 40 0" fill="none" stroke="hsla(30,20%,25%,0.35)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="${50 + (h % 20)}" cy="${48 + (h % 12)}" r="6" fill="hsla(0,0%,100%,0.8)"/>
</svg>
`;
}

for (const slug of slugs) {
  writeFileSync(join(dir, `${slug}.svg`), svg(slug));
}

console.log(`Wrote ${slugs.length} original SVG icons.`);
