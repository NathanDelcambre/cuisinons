import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/public/ingredients');
mkdirSync(dir, { recursive: true });

/** Palette Cuisinons (globals.css). */
const C = {
  cream: '#f4f2ef',
  ring: '#f2cdb8',
  ink: '#2f2b27',
  muted: '#8a8178',
  sage: '#648374',
  sage2: '#4f6a5d',
  sageLite: '#c7dad0',
  peach: '#d9946f',
  peachLite: '#f2cdb8',
  tomato: '#c45c4a',
  tomatoLite: '#d97767',
  gold: '#c9a06a',
  yolk: '#e8b298',
  white: '#fffaf6',
  paper: '#fffdf9',
};

function disc(inner: string): string {
  return `<circle cx="64" cy="64" r="56" fill="${C.cream}"/>
  <circle cx="64" cy="64" r="56" fill="none" stroke="${C.ring}" stroke-width="1.25" opacity=".7"/>
  ${inner}`;
}

function wrap(slug: string, inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${slug}">
  ${disc(inner)}
</svg>
`;
}

const ICONS: Record<string, string> = {
  pomme: `<ellipse cx="64" cy="70" rx="24" ry="26" fill="${C.tomato}"/>
    <ellipse cx="56" cy="62" rx="8" ry="12" fill="${C.tomatoLite}" opacity=".55"/>
    <path d="M64 44c0 8 8 10 8 16" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
    <path d="M70 48c10-2 14 6 10 12" fill="${C.sage}" />`,
  banane: `<path d="M36 78c8 18 48 22 60-4 2-6-4-10-10-8-18 6-34 4-44-8-4-4-10-2-6 20z" fill="${C.gold}"/>
    <path d="M42 70c12 10 34 12 48 2" fill="none" stroke="${C.yolk}" stroke-width="3" stroke-linecap="round"/>`,
  fraise: `<path d="M64 36c14 4 26 20 24 36-2 18-16 30-24 30s-22-12-24-30c-2-16 10-32 24-36z" fill="${C.tomato}"/>
    <path d="M50 40c8-10 20-10 28 0-8 4-20 4-28 0z" fill="${C.sage}"/>
    <circle cx="58" cy="58" r="2" fill="${C.gold}"/><circle cx="70" cy="62" r="2" fill="${C.gold}"/>
    <circle cx="62" cy="72" r="2" fill="${C.gold}"/>`,
  framboise: `<circle cx="54" cy="58" r="10" fill="${C.tomato}"/><circle cx="70" cy="56" r="10" fill="${C.tomatoLite}"/>
    <circle cx="52" cy="72" r="9" fill="${C.tomatoLite}"/><circle cx="68" cy="74" r="10" fill="${C.tomato}"/>
    <circle cx="62" cy="64" r="9" fill="${C.tomato}"/>
    <path d="M60 44c2 8 8 10 12 8" fill="none" stroke="${C.sage}" stroke-width="3" stroke-linecap="round"/>`,
  myrtille: `<circle cx="52" cy="68" r="14" fill="#5a6d8a"/><circle cx="72" cy="62" r="15" fill="#4a5c78"/>
    <circle cx="64" cy="78" r="12" fill="#6b7d99"/>
    <circle cx="70" cy="56" r="3" fill="${C.sageLite}"/>`,
  orange: `<circle cx="64" cy="66" r="26" fill="${C.peach}"/>
    <circle cx="64" cy="66" r="18" fill="none" stroke="${C.yolk}" stroke-width="1.5"/>
    <path d="M64 40c4 6 10 8 14 6" fill="${C.sage}"/>`,
  citron: `<ellipse cx="64" cy="66" rx="22" ry="28" fill="${C.gold}" transform="rotate(-18 64 66)"/>
    <ellipse cx="60" cy="62" rx="8" ry="12" fill="${C.yolk}" opacity=".5" transform="rotate(-18 60 62)"/>
    <path d="M78 44c4 6 2 10-2 12" fill="${C.sage}"/>`,
  avocat: `<ellipse cx="62" cy="68" rx="22" ry="30" fill="${C.sage2}"/>
    <ellipse cx="62" cy="68" rx="14" ry="20" fill="${C.sageLite}"/>
    <circle cx="62" cy="70" r="8" fill="${C.ink}"/>
    <circle cx="60" cy="68" r="2.5" fill="${C.peachLite}"/>`,
  mangue: `<path d="M54 38c18-8 36 8 34 30-2 22-18 38-32 36-16-2-22-24-16-40 4-10 8-20 14-26z" fill="${C.peach}"/>
    <path d="M58 48c10 8 16 22 12 34" fill="none" stroke="${C.tomatoLite}" stroke-width="2" opacity=".5"/>
    <ellipse cx="70" cy="42" rx="6" ry="4" fill="${C.sage}"/>`,
  raisin: `<circle cx="54" cy="58" r="9" fill="#7a6a9a"/><circle cx="70" cy="56" r="9" fill="#6d5d8c"/>
    <circle cx="50" cy="74" r="9" fill="#6d5d8c"/><circle cx="66" cy="72" r="10" fill="#7a6a9a"/>
    <circle cx="80" cy="70" r="8" fill="#8a7aaa"/>
    <path d="M64 40c0 10 6 14 10 14" fill="none" stroke="${C.sage}" stroke-width="3" stroke-linecap="round"/>`,
  poire: `<path d="M64 40c12 4 20 16 18 30-2 16-10 28-18 30s-16-14-18-30c-2-14 6-26 18-30z" fill="${C.sage}"/>
    <ellipse cx="58" cy="62" rx="6" ry="10" fill="${C.sageLite}" opacity=".6"/>
    <path d="M64 38c0 8 6 10 8 14" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  peche: `<ellipse cx="58" cy="68" rx="22" ry="24" fill="${C.peach}"/>
    <ellipse cx="72" cy="68" rx="18" ry="22" fill="${C.peachLite}"/>
    <path d="M64 44c8-2 12 4 10 10" fill="${C.sage}"/>`,
  abricot: `<circle cx="60" cy="68" r="22" fill="${C.peach}"/>
    <circle cx="72" cy="66" r="18" fill="${C.yolk}"/>
    <path d="M64 46c6 0 10 6 8 10" fill="${C.sage}"/>`,
  ananas: `<path d="M48 56c0-4 32-4 32 0v36c0 8-8 14-16 14s-16-6-16-14z" fill="${C.gold}"/>
    <path d="M52 64h24M52 74h24M52 84h24" stroke="${C.peach}" stroke-width="2"/>
    <path d="M64 32l-10 24h20z" fill="${C.sage}"/><path d="M54 40l10-16 10 16" fill="${C.sage2}"/>`,
  kiwi: `<ellipse cx="64" cy="66" rx="26" ry="22" fill="${C.sage2}"/>
    <ellipse cx="64" cy="66" rx="18" ry="14" fill="${C.sage}"/>
    <circle cx="64" cy="66" r="6" fill="${C.white}"/>
    <circle cx="58" cy="62" r="1.6" fill="${C.ink}"/><circle cx="70" cy="62" r="1.6" fill="${C.ink}"/>
    <circle cx="58" cy="70" r="1.6" fill="${C.ink}"/><circle cx="70" cy="70" r="1.6" fill="${C.ink}"/>`,
  melon: `<path d="M36 78c8-28 48-28 56 0 2 8-8 16-28 16s-30-8-28-16z" fill="${C.sage}"/>
    <path d="M44 76c6-16 34-16 40 0" fill="${C.peachLite}"/>`,
  pasteque: `<path d="M32 70c8-24 56-24 64 0 4 10-12 22-32 22s-36-12-32-22z" fill="${C.sage}"/>
    <path d="M40 70c6-16 42-16 48 0-4 8-16 14-24 14s-20-6-24-14z" fill="${C.tomato}"/>
    <circle cx="56" cy="72" r="2" fill="${C.ink}"/><circle cx="68" cy="74" r="2" fill="${C.ink}"/>`,

  carotte: `<path d="M64 44l14 52c2 8-4 10-14 10s-16-2-14-10z" fill="${C.peach}"/>
    <path d="M64 44l6 48c1 6-2 8-6 8s-7-2-6-8z" fill="${C.yolk}" opacity=".5"/>
    <path d="M58 40c-8-14-2-22 6-16m0 0c4-12 14-10 10 2m0 0c10-8 14 2 4 10" fill="none" stroke="${C.sage}" stroke-width="4" stroke-linecap="round"/>`,
  tomate: `<circle cx="64" cy="70" r="24" fill="${C.tomato}"/>
    <ellipse cx="56" cy="64" rx="7" ry="10" fill="${C.tomatoLite}" opacity=".5"/>
    <path d="M54 48c6 8 14 8 20 0-6 2-14 2-20 0z" fill="${C.sage}"/>`,
  oignon: `<ellipse cx="64" cy="72" rx="22" ry="24" fill="${C.peachLite}"/>
    <path d="M50 60c8 18 20 18 28 0" fill="none" stroke="${C.peach}" stroke-width="2"/>
    <path d="M58 46c2-10 10-10 12 0" fill="${C.sage}"/>`,
  ail: `<ellipse cx="52" cy="72" rx="12" ry="16" fill="${C.white}"/>
    <ellipse cx="64" cy="70" rx="13" ry="18" fill="${C.paper}"/>
    <ellipse cx="76" cy="72" rx="12" ry="16" fill="${C.white}"/>
    <path d="M64 50c4-12 12-8 10 0" fill="${C.sageLite}"/>`,
  echalote: `<ellipse cx="64" cy="70" rx="14" ry="26" fill="${C.peach}"/>
    <path d="M58 56c4 16 8 16 12 0" fill="none" stroke="${C.tomatoLite}" stroke-width="2"/>
    <path d="M64 42c2-8 8-6 6 2" fill="${C.sage}"/>`,
  poireau: `<rect x="58" y="40" width="12" height="44" rx="6" fill="${C.white}"/>
    <rect x="58" y="70" width="12" height="22" rx="6" fill="${C.sageLite}"/>
    <path d="M50 36c8 10 10 18 14 28M78 36c-8 10-10 18-14 28" fill="none" stroke="${C.sage}" stroke-width="5" stroke-linecap="round"/>`,
  courgette: `<ellipse cx="64" cy="66" rx="16" ry="32" fill="${C.sage}" transform="rotate(-24 64 66)"/>
    <ellipse cx="60" cy="58" rx="5" ry="12" fill="${C.sageLite}" opacity=".5" transform="rotate(-24 60 58)"/>
    <circle cx="78" cy="42" r="5" fill="${C.sage2}"/>`,
  aubergine: `<ellipse cx="64" cy="72" rx="18" ry="28" fill="#6a4c7a"/>
    <path d="M56 46c6 4 14 4 18 0-4-8-14-8-18 0z" fill="${C.sage}"/>
    <ellipse cx="58" cy="66" rx="5" ry="10" fill="#8a6a9a" opacity=".5"/>`,
  poivron: `<path d="M48 56c0-10 8-16 16-16s16 6 16 16c8 4 12 16 8 28-4 12-14 18-24 18s-20-6-24-18c-4-12 0-24 8-28z" fill="${C.tomato}"/>
    <path d="M60 40c2 8 8 10 12 8" fill="${C.sage}"/>`,
  brocoli: `<circle cx="50" cy="56" r="14" fill="${C.sage}"/><circle cx="70" cy="50" r="16" fill="${C.sage2}"/>
    <circle cx="78" cy="64" r="13" fill="${C.sage}"/><circle cx="58" cy="66" r="12" fill="${C.sage}"/>
    <rect x="58" y="72" width="12" height="22" rx="4" fill="${C.yolk}"/>`,
  'chou-fleur': `<circle cx="50" cy="60" r="12" fill="${C.white}"/><circle cx="66" cy="52" r="14" fill="${C.paper}"/>
    <circle cx="80" cy="62" r="12" fill="${C.white}"/><circle cx="64" cy="68" r="13" fill="${C.paper}"/>
    <path d="M48 78c8 8 24 8 32 0" fill="${C.sage}"/>`,
  chou: `<ellipse cx="64" cy="68" rx="26" ry="24" fill="${C.sage}"/>
    <ellipse cx="64" cy="68" rx="16" ry="16" fill="${C.sageLite}"/>
    <path d="M54 60c6 10 14 10 20 0" fill="none" stroke="${C.sage2}" stroke-width="2"/>`,
  epinard: `<path d="M40 78c8-28 24-36 28-20 2 8-4 22-16 28-10 6-16 2-12-8z" fill="${C.sage}"/>
    <path d="M60 70c10-24 28-28 32-12 2 10-8 22-20 26-12 4-16-2-12-14z" fill="${C.sage2}"/>`,
  salade: `<path d="M40 72c6-22 20-28 24-12 2 10-6 22-16 26-10 4-12-2-8-14z" fill="${C.sageLite}"/>
    <path d="M56 68c8-24 24-26 28-10 2 10-8 22-20 26-10 4-14 0-8-16z" fill="${C.sage}"/>
    <path d="M70 74c6-18 18-20 20-8 2 8-6 16-14 18-8 2-10-2-6-10z" fill="${C.sage2}"/>`,
  concombre: `<ellipse cx="64" cy="66" rx="14" ry="34" fill="${C.sage}" transform="rotate(50 64 66)"/>
    <ellipse cx="58" cy="62" rx="4" ry="12" fill="${C.sageLite}" opacity=".5" transform="rotate(50 58 62)"/>`,
  champignon: `<path d="M40 64c4-22 44-22 48 0 2 6-8 8-24 8s-26-2-24-8z" fill="${C.peach}"/>
    <rect x="56" y="68" width="16" height="22" rx="6" fill="${C.white}"/>
    <circle cx="52" cy="58" r="3" fill="${C.peachLite}"/>`,
  'haricot-vert': `<path d="M36 80c16-28 44-40 60-28 4 4-2 8-8 6-16-6-34 4-46 22-2 4-8 4-6 0z" fill="${C.sage}"/>
    <path d="M48 70c10-8 24-12 36-8" fill="none" stroke="${C.sage2}" stroke-width="2"/>`,
  'petit-pois': `<circle cx="48" cy="68" r="11" fill="${C.sage}"/><circle cx="64" cy="60" r="12" fill="${C.sage2}"/>
    <circle cx="80" cy="68" r="11" fill="${C.sage}"/>
    <path d="M40 78c12 10 36 10 48 0" fill="none" stroke="${C.sageLite}" stroke-width="4" stroke-linecap="round"/>`,
  mais: `<ellipse cx="64" cy="70" rx="16" ry="28" fill="${C.gold}"/>
    <path d="M54 54h20M52 64h24M52 74h24M54 84h20" stroke="${C.yolk}" stroke-width="2"/>
    <path d="M50 42c8 8 14 8 28 0-8 16-20 16-28 0z" fill="${C.sage}"/>`,
  fenouil: `<ellipse cx="64" cy="86" rx="16" ry="10" fill="${C.white}"/>
    <path d="M50 80c0-28 8-40 14-44m0 0c6 4 14 16 14 44M64 36c-8 16-4 28 0 40 4-12 8-24 0-40z" fill="none" stroke="${C.sage}" stroke-width="4" stroke-linecap="round"/>`,
  betterave: `<circle cx="64" cy="74" r="22" fill="#8a4a62"/>
    <path d="M58 54c-4-16 4-22 8-12m0 0c6-14 14-8 8 6" fill="none" stroke="${C.sage}" stroke-width="3" stroke-linecap="round"/>`,
  celeri: `<rect x="46" y="44" width="10" height="48" rx="4" fill="${C.sageLite}"/>
    <rect x="59" y="40" width="10" height="52" rx="4" fill="${C.sage}"/>
    <rect x="72" y="46" width="10" height="46" rx="4" fill="${C.sageLite}"/>`,
  navet: `<ellipse cx="64" cy="74" rx="22" ry="20" fill="${C.white}"/>
    <path d="M44 68c8-16 32-16 40 0" fill="${C.peachLite}"/>
    <path d="M64 52c2-12 10-12 10-2" fill="${C.sage}"/>`,
  radis: `<circle cx="64" cy="74" r="18" fill="${C.tomato}"/>
    <path d="M50 66c8-10 20-10 28 0" fill="${C.white}"/>
    <path d="M60 54c0-12 8-16 10-6" fill="${C.sage}"/>`,
  asperge: `<rect x="60" y="46" width="8" height="48" rx="4" fill="${C.sage}"/>
    <path d="M64 36c-8 8-6 16 0 18 6-2 8-10 0-18z" fill="${C.sage2}"/>
    <path d="M54 70h20M54 80h20" stroke="${C.sageLite}" stroke-width="2"/>`,
  artichaut: `<ellipse cx="64" cy="78" rx="18" ry="14" fill="${C.sage2}"/>
    <path d="M46 70c8-8 14-6 18 2m0 0c4-10 14-12 20-2m-20-10c0-12 8-18 10-8" fill="none" stroke="${C.sage}" stroke-width="5" stroke-linecap="round"/>`,
  potiron: `<ellipse cx="64" cy="72" rx="30" ry="22" fill="${C.peach}"/>
    <path d="M44 72c4-14 12-18 20-18m0 0c8 0 16 4 20 18" fill="none" stroke="${C.tomatoLite}" stroke-width="2"/>
    <rect x="60" y="44" width="8" height="12" rx="3" fill="${C.sage}"/>`,

  poulet: `<ellipse cx="58" cy="72" rx="22" ry="16" fill="${C.peach}"/>
    <path d="M76 64c12-4 18 6 12 16-8 4-16 0-18-8z" fill="${C.peachLite}"/>
    <circle cx="44" cy="66" r="7" fill="${C.peach}"/>
    <path d="M38 64l-8-4" stroke="${C.tomato}" stroke-width="3" stroke-linecap="round"/>`,
  dinde: `<ellipse cx="60" cy="74" rx="24" ry="16" fill="${C.peach}"/>
    <path d="M80 62c10-8 18 0 12 12-8 6-18 4-20-4z" fill="${C.yolk}"/>
    <circle cx="44" cy="68" r="8" fill="${C.peachLite}"/>`,
  boeuf: `<path d="M36 70c4-16 20-22 28-10 4-12 20-16 28-2 8 12 4 28-8 32-12 4-20-4-20-4s-8 8-20 4c-12-4-16-12-8-20z" fill="${C.tomato}"/>
    <path d="M52 66c6 8 18 8 24 0" fill="none" stroke="${C.ink}" stroke-width="2" opacity=".35"/>`,
  veau: `<path d="M40 72c4-14 18-20 24-8 4-10 18-14 26 0 6 12 2 24-10 28-10 4-18-2-18-2s-6 6-16 2c-10-4-12-10-6-20z" fill="${C.peach}"/>`,
  porc: `<ellipse cx="64" cy="70" rx="26" ry="18" fill="${C.peachLite}"/>
    <circle cx="42" cy="68" r="10" fill="${C.peach}"/>
    <ellipse cx="36" cy="70" rx="6" ry="4" fill="${C.peachLite}"/>
    <circle cx="40" cy="66" r="1.6" fill="${C.ink}"/><circle cx="46" cy="66" r="1.6" fill="${C.ink}"/>`,
  jambon: `<path d="M44 48c24-8 48 8 40 36-6 20-28 24-40 8-10-14-8-36 0-44z" fill="${C.tomatoLite}"/>
    <path d="M52 58c12 8 22 20 18 30" fill="none" stroke="${C.white}" stroke-width="3" opacity=".5"/>`,
  lardon: `<rect x="34" y="56" width="28" height="14" rx="4" fill="${C.peachLite}"/>
    <rect x="50" y="66" width="30" height="14" rx="4" fill="${C.tomatoLite}"/>
    <rect x="66" y="54" width="26" height="14" rx="4" fill="${C.peach}"/>`,
  saucisse: `<path d="M34 72c8-16 20-20 30-8 10-16 28-16 36 2 4 10-4 18-16 16-12 10-28 8-36-2-8 6-18 4-14-8z" fill="${C.tomato}"/>
    <path d="M50 66c6 6 12 6 18 0M70 64c6 6 10 6 16 0" stroke="${C.ink}" stroke-width="2" opacity=".25"/>`,
  agneau: `<ellipse cx="64" cy="76" rx="24" ry="14" fill="${C.peachLite}"/>
    <circle cx="48" cy="62" r="12" fill="${C.white}"/>
    <circle cx="44" cy="60" r="2" fill="${C.ink}"/>`,
  canard: `<ellipse cx="62" cy="74" rx="22" ry="14" fill="${C.sage2}"/>
    <circle cx="46" cy="64" r="9" fill="${C.sage}"/>
    <path d="M38 64l-10 2c2 4 8 4 12 0z" fill="${C.gold}"/>`,

  saumon: `<path d="M28 70c12-18 40-22 56-8 8 6 18 6 20 0-4 14-16 20-28 16-18 12-40 8-48-8z" fill="${C.peach}"/>
    <path d="M52 64c8 8 20 8 28 0" fill="none" stroke="${C.tomatoLite}" stroke-width="2"/>`,
  thon: `<path d="M26 68c14-20 46-22 62-6 6 6 16 4 18-2-6 16-18 24-32 20-20 10-44 4-48-12z" fill="#4a6a82"/>
    <path d="M70 60l16-12" stroke="#3a5468" stroke-width="4" stroke-linecap="round"/>`,
  cabillaud: `<path d="M28 70c12-16 38-20 54-8 8 6 18 6 22 0-6 14-18 20-30 16-16 10-38 6-46-8z" fill="${C.sageLite}"/>`,
  truite: `<path d="M28 70c12-16 40-20 56-6 6 6 16 4 20-2-6 14-18 20-30 16-18 10-40 6-46-8z" fill="${C.peachLite}"/>
    <circle cx="46" cy="66" r="2" fill="${C.ink}"/>`,
  sardine: `<path d="M30 64c10-12 32-14 46-4 6 4 14 4 18 0-4 10-14 16-24 12-14 8-32 4-40-8z" fill="#7a9aaa"/>
    <path d="M34 72c10-10 28-12 42-4" fill="none" stroke="${C.white}" stroke-width="1.5" opacity=".5"/>`,
  anchois: `<path d="M32 66c8-10 28-12 40-2 6 4 14 2 18-2-4 10-14 14-22 10-12 6-30 4-36-6z" fill="${C.ink}"/>`,
  crevette: `<path d="M44 80c-8-8-8-20 2-28 12-8 28-4 32 8 2 8-6 12-12 8 8 4 12 14 4 20-8 6-18 2-26-8z" fill="${C.peach}"/>
    <path d="M72 52c8-8 16-6 20 0" fill="none" stroke="${C.peachLite}" stroke-width="3" stroke-linecap="round"/>`,
  moule: `<path d="M44 50c-8 12-8 32 4 40 10 8 28 6 36-8 8-14 4-32-8-38-12-6-24 0-32 6z" fill="${C.ink}"/>
    <path d="M52 58c6 16 16 24 28 22" fill="none" stroke="${C.muted}" stroke-width="2"/>`,
  huitre: `<ellipse cx="64" cy="70" rx="28" ry="18" fill="${C.muted}"/>
    <ellipse cx="64" cy="68" rx="18" ry="12" fill="${C.sageLite}"/>
    <ellipse cx="64" cy="68" rx="8" ry="6" fill="${C.peachLite}"/>`,
  calamar: `<ellipse cx="64" cy="52" rx="16" ry="18" fill="${C.peachLite}"/>
    <path d="M52 64v28M58 66v30M64 66v32M70 66v30M76 64v28" stroke="${C.peach}" stroke-width="4" stroke-linecap="round"/>`,

  oeuf: `<ellipse cx="64" cy="66" rx="22" ry="28" fill="${C.white}"/>
    <ellipse cx="64" cy="70" rx="12" ry="10" fill="${C.gold}"/>`,
  lait: `<path d="M50 40h28l8 12v44c0 8-8 12-22 12s-22-4-22-12V52z" fill="${C.white}"/>
    <rect x="50" y="36" width="28" height="10" rx="3" fill="${C.sageLite}"/>`,
  yaourt: `<rect x="44" y="48" width="40" height="40" rx="8" fill="${C.white}"/>
    <ellipse cx="64" cy="50" rx="20" ry="8" fill="${C.peachLite}"/>
    <path d="M48 62h32" stroke="${C.sageLite}" stroke-width="3"/>`,
  skyr: `<rect x="46" y="46" width="36" height="42" rx="8" fill="${C.paper}"/>
    <ellipse cx="64" cy="48" rx="18" ry="7" fill="${C.sageLite}"/>
    <path d="M54 68h20" stroke="${C.peach}" stroke-width="3" stroke-linecap="round"/>`,
  'fromage-blanc': `<rect x="42" y="50" width="44" height="36" rx="10" fill="${C.white}"/>
    <ellipse cx="64" cy="52" rx="22" ry="8" fill="${C.paper}"/>`,
  creme: `<ellipse cx="64" cy="74" rx="24" ry="16" fill="${C.white}"/>
    <path d="M48 70c4-16 12-24 16-12 4-14 16-16 18-2 2 8-4 18-16 18s-20-2-18-4z" fill="${C.paper}"/>`,
  beurre: `<rect x="36" y="56" width="56" height="28" rx="6" fill="${C.gold}"/>
    <rect x="42" y="62" width="44" height="8" rx="2" fill="${C.yolk}" opacity=".6"/>`,
  fromage: `<path d="M36 80l28-40 28 40z" fill="${C.gold}"/>
    <circle cx="58" cy="66" r="4" fill="${C.yolk}"/><circle cx="70" cy="72" r="3" fill="${C.yolk}"/>`,
  'huile-olive': `<path d="M58 36c8 0 12 8 8 16h-12c-4-8 0-16 4-16z" fill="${C.sage}"/>
    <rect x="50" y="50" width="28" height="42" rx="8" fill="${C.sage2}"/>
    <rect x="56" y="58" width="16" height="18" rx="3" fill="${C.sageLite}" opacity=".5"/>`,
  huile: `<path d="M58 36c8 0 12 8 8 16h-12c-4-8 0-16 4-16z" fill="${C.gold}"/>
    <rect x="50" y="50" width="28" height="42" rx="8" fill="${C.yolk}"/>`,

  riz: `<ellipse cx="64" cy="82" rx="28" ry="10" fill="${C.peachLite}"/>
    <ellipse cx="50" cy="68" rx="6" ry="10" fill="${C.white}" transform="rotate(-30 50 68)"/>
    <ellipse cx="64" cy="64" rx="6" ry="10" fill="${C.paper}" transform="rotate(10 64 64)"/>
    <ellipse cx="76" cy="70" rx="6" ry="10" fill="${C.white}" transform="rotate(28 76 70)"/>
    <ellipse cx="58" cy="74" rx="5" ry="9" fill="${C.paper}" transform="rotate(-10 58 74)"/>`,
  pates: `<path d="M36 60c16 20 40 20 56 0" fill="none" stroke="${C.gold}" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 74c14 14 34 14 50 0" fill="none" stroke="${C.yolk}" stroke-width="8" stroke-linecap="round"/>`,
  quinoa: `<circle cx="50" cy="62" r="6" fill="${C.gold}"/><circle cx="64" cy="54" r="6" fill="${C.yolk}"/>
    <circle cx="78" cy="62" r="6" fill="${C.gold}"/><circle cx="56" cy="74" r="6" fill="${C.yolk}"/>
    <circle cx="72" cy="74" r="6" fill="${C.gold}"/>`,
  avoine: `<ellipse cx="48" cy="70" rx="8" ry="16" fill="${C.gold}" transform="rotate(-30 48 70)"/>
    <ellipse cx="64" cy="64" rx="8" ry="16" fill="${C.yolk}"/>
    <ellipse cx="80" cy="70" rx="8" ry="16" fill="${C.gold}" transform="rotate(30 80 70)"/>`,
  semoule: `<circle cx="50" cy="60" r="4" fill="${C.gold}"/><circle cx="64" cy="54" r="4" fill="${C.yolk}"/>
    <circle cx="78" cy="60" r="4" fill="${C.gold}"/><circle cx="46" cy="74" r="4" fill="${C.yolk}"/>
    <circle cx="62" cy="70" r="4" fill="${C.gold}"/><circle cx="78" cy="74" r="4" fill="${C.yolk}"/>
    <circle cx="54" cy="84" r="4" fill="${C.gold}"/>`,
  pain: `<ellipse cx="64" cy="78" rx="32" ry="16" fill="${C.peach}"/>
    <path d="M36 76c8-24 48-24 56 0" fill="${C.yolk}"/>
    <path d="M50 64c4-4 8-4 10 0M64 60c4-4 8-4 10 0" stroke="${C.peach}" stroke-width="2"/>`,
  'pomme-de-terre': `<ellipse cx="64" cy="68" rx="26" ry="20" fill="${C.gold}"/>
    <circle cx="54" cy="64" r="3" fill="${C.ink}" opacity=".35"/><circle cx="72" cy="70" r="2.5" fill="${C.ink}" opacity=".35"/>`,
  'patate-douce': `<ellipse cx="64" cy="68" rx="28" ry="18" fill="${C.peach}" transform="rotate(-16 64 68)"/>
    <ellipse cx="60" cy="66" rx="10" ry="8" fill="${C.yolk}" opacity=".45"/>`,
  farine: `<ellipse cx="64" cy="80" rx="26" ry="12" fill="${C.white}"/>
    <path d="M48 78c4-22 12-32 16-18 4-16 16-20 18-4 2 10-2 22-10 24s-22 2-24-2z" fill="${C.paper}"/>`,
  lentille: `<ellipse cx="50" cy="68" rx="10" ry="7" fill="${C.peach}"/><ellipse cx="66" cy="60" rx="10" ry="7" fill="${C.tomatoLite}"/>
    <ellipse cx="78" cy="72" rx="10" ry="7" fill="${C.peach}"/>`,
  'pois-chiche': `<circle cx="50" cy="66" r="10" fill="${C.gold}"/><circle cx="68" cy="58" r="11" fill="${C.yolk}"/>
    <circle cx="74" cy="74" r="10" fill="${C.gold}"/>`,
  'haricot-sec': `<ellipse cx="50" cy="68" rx="9" ry="14" fill="${C.tomato}" transform="rotate(-20 50 68)"/>
    <ellipse cx="70" cy="64" rx="9" ry="14" fill="${C.tomatoLite}" transform="rotate(18 70 64)"/>`,
  tofu: `<rect x="40" y="48" width="48" height="40" rx="6" fill="${C.white}"/>
    <path d="M40 64h48M64 48v40" stroke="${C.sageLite}" stroke-width="2"/>`,

  amande: `<ellipse cx="64" cy="66" rx="14" ry="24" fill="${C.peachLite}" transform="rotate(-20 64 66)"/>
    <ellipse cx="64" cy="66" rx="8" ry="16" fill="${C.yolk}" transform="rotate(-20 64 66)"/>`,
  noix: `<circle cx="56" cy="66" r="16" fill="${C.peach}"/><circle cx="74" cy="66" r="14" fill="${C.yolk}"/>
    <path d="M64 52v28" stroke="${C.ink}" stroke-width="2" opacity=".3"/>`,
  noisette: `<circle cx="64" cy="70" r="20" fill="${C.peach}"/>
    <path d="M52 56c8-8 20-8 24 0-8 4-16 4-24 0z" fill="${C.sage}"/>`,
  cacahuete: `<ellipse cx="54" cy="72" rx="12" ry="16" fill="${C.gold}"/>
    <ellipse cx="74" cy="60" rx="12" ry="16" fill="${C.yolk}"/>`,
  graines: `<ellipse cx="48" cy="66" rx="5" ry="10" fill="${C.ink}"/><ellipse cx="60" cy="58" rx="5" ry="10" fill="${C.gold}"/>
    <ellipse cx="72" cy="66" rx="5" ry="10" fill="${C.ink}"/><ellipse cx="84" cy="58" rx="5" ry="10" fill="${C.gold}"/>`,

  sucre: `<path d="M44 80l20-36 20 36z" fill="${C.white}"/>
    <rect x="48" y="76" width="32" height="10" rx="2" fill="${C.paper}"/>`,
  miel: `<path d="M48 48h32l8 12H40z" fill="${C.gold}"/>
    <rect x="44" y="60" width="40" height="28" rx="4" fill="${C.yolk}"/>`,
  chocolat: `<rect x="40" y="48" width="48" height="36" rx="4" fill="#6b4636"/>
    <path d="M40 66h48M64 48v36" stroke="#5a382c" stroke-width="3"/>`,
  cacao: `<ellipse cx="50" cy="70" rx="12" ry="18" fill="#6b4636" transform="rotate(-30 50 70)"/>
    <ellipse cx="74" cy="66" rx="12" ry="18" fill="#5a382c" transform="rotate(24 74 66)"/>`,
  levure: `<circle cx="52" cy="70" r="12" fill="${C.peachLite}"/><circle cx="70" cy="60" r="14" fill="${C.yolk}"/>
    <circle cx="76" cy="76" r="10" fill="${C.peach}"/>`,

  sel: `<rect x="50" y="40" width="28" height="48" rx="6" fill="${C.white}"/>
    <circle cx="64" cy="54" r="3" fill="${C.muted}"/><path d="M58 88h12v6H58z" fill="${C.muted}"/>`,
  poivre: `<rect x="52" y="42" width="24" height="44" rx="6" fill="${C.ink}"/>
    <circle cx="64" cy="54" r="3" fill="${C.muted}"/><path d="M58 86h12v8H58z" fill="${C.ink}"/>`,
  basilic: `<path d="M64 88c-16-8-24-28-8-40 4 10 10 14 8 40z" fill="${C.sage}"/>
    <path d="M64 88c16-8 24-28 8-40-4 10-10 14-8 40z" fill="${C.sage2}"/>
    <path d="M64 48v40" stroke="${C.sageLite}" stroke-width="2"/>`,
  persil: `<path d="M48 80c-4-20 8-32 16-18 2-16 16-20 16-4 8-12 20-4 12 12-4 12-16 16-24 8-8 12-18 10-20 2z" fill="${C.sage}"/>`,
  thym: `<path d="M64 36v56" stroke="${C.sage2}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="58" cy="52" rx="6" ry="4" fill="${C.sage}"/><ellipse cx="70" cy="60" rx="6" ry="4" fill="${C.sage}"/>
    <ellipse cx="58" cy="70" rx="6" ry="4" fill="${C.sage}"/><ellipse cx="70" cy="78" rx="6" ry="4" fill="${C.sage}"/>`,
  ciboulette: `<path d="M50 96c0-40 4-56 8-60M64 96c0-48 0-60 0-64M78 96c-2-40-6-56-10-60" fill="none" stroke="${C.sage}" stroke-width="4" stroke-linecap="round"/>`,
  gingembre: `<path d="M44 70c0-12 8-20 16-16 2-12 14-16 20-6 8-6 20 0 16 12 8 4 8 16-2 20-4 10-16 12-24 4-8 8-22 4-26-14z" fill="${C.peach}"/>`,
  epice: `<rect x="50" y="44" width="28" height="44" rx="6" fill="${C.tomato}"/>
    <circle cx="64" cy="56" r="4" fill="${C.gold}"/><path d="M58 88h12v8H58z" fill="${C.ink}"/>`,
  vanille: `<path d="M44 84c8-36 12-48 16-52m8 4c4 8 12 40 16 52" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 48c8 4 16 4 24 0" stroke="${C.gold}" stroke-width="3"/>`,

  moutarde: `<rect x="50" y="40" width="28" height="52" rx="6" fill="${C.gold}"/>
    <rect x="56" y="48" width="16" height="20" rx="3" fill="${C.yolk}"/>`,
  vinaigre: `<rect x="52" y="38" width="24" height="54" rx="6" fill="${C.tomatoLite}"/>
    <rect x="58" y="46" width="12" height="16" rx="2" fill="${C.white}" opacity=".4"/>`,
  'sauce-soja': `<rect x="52" y="38" width="24" height="54" rx="6" fill="${C.ink}"/>
    <rect x="58" y="46" width="12" height="12" rx="2" fill="${C.muted}"/>`,
  ketchup: `<path d="M56 36h16l4 12H52z" fill="${C.tomato}"/>
    <rect x="50" y="48" width="28" height="44" rx="8" fill="${C.tomatoLite}"/>`,
  mayonnaise: `<path d="M56 36h16l4 12H52z" fill="${C.gold}"/>
    <rect x="50" y="48" width="28" height="44" rx="8" fill="${C.white}"/>`,

  eau: `<path d="M64 36c18 20 24 36 24 46 0 14-10 24-24 24s-24-10-24-24c0-10 6-26 24-46z" fill="#7aa0b8"/>
    <ellipse cx="58" cy="72" rx="6" ry="8" fill="${C.white}" opacity=".4"/>`,
  cafe: `<ellipse cx="64" cy="78" rx="24" ry="10" fill="${C.white}"/>
    <path d="M44 50h40v28c0 8-8 12-20 12s-20-4-20-12z" fill="#6b4636"/>
    <path d="M84 56c10 0 12 10 4 14" fill="none" stroke="${C.white}" stroke-width="4"/>`,
  the: `<ellipse cx="64" cy="80" rx="24" ry="10" fill="${C.white}"/>
    <path d="M44 52h40v26c0 8-8 12-20 12s-20-4-20-12z" fill="${C.sage}"/>
    <path d="M84 58c10 0 12 10 4 14" fill="none" stroke="${C.sage2}" stroke-width="4"/>`,
  vin: `<path d="M50 40h28v8c0 16-6 24-14 28-8-4-14-12-14-28z" fill="${C.tomato}"/>
    <rect x="60" y="76" width="8" height="16" fill="${C.ink}"/>
    <rect x="52" y="92" width="24" height="6" rx="2" fill="${C.ink}"/>`,
  biere: `<rect x="48" y="44" width="32" height="48" rx="6" fill="${C.gold}"/>
    <rect x="48" y="44" width="32" height="14" fill="${C.white}"/>
    <path d="M80 56c8 0 10 10 2 14" fill="none" stroke="${C.gold}" stroke-width="4"/>`,
  'lait-coco': `<circle cx="64" cy="66" r="24" fill="${C.white}"/>
    <circle cx="64" cy="66" r="14" fill="${C.paper}"/>
    <circle cx="58" cy="62" r="3" fill="${C.ink}"/><circle cx="70" cy="62" r="3" fill="${C.ink}"/>
    <circle cx="64" cy="72" r="3" fill="${C.ink}"/>`,

  'cat-legumes': `<ellipse cx="48" cy="72" rx="14" ry="18" fill="${C.sage}"/><circle cx="72" cy="70" r="18" fill="${C.tomato}"/>
    <path d="M64 44c8 6 12 14 10 20" fill="${C.sage2}"/>`,
  'cat-fruits': `<circle cx="52" cy="70" r="18" fill="${C.tomato}"/><ellipse cx="76" cy="68" rx="16" ry="20" fill="${C.gold}"/>
    <path d="M70 50c8-2 12 6 8 12" fill="${C.sage}"/>`,
  'cat-feculents': `<ellipse cx="64" cy="70" rx="26" ry="20" fill="${C.gold}"/>
    <circle cx="54" cy="66" r="3" fill="${C.ink}" opacity=".3"/>`,
  'cat-cereales': `<ellipse cx="50" cy="68" rx="8" ry="16" fill="${C.gold}"/><ellipse cx="64" cy="62" rx="8" ry="16" fill="${C.yolk}"/>
    <ellipse cx="78" cy="68" rx="8" ry="16" fill="${C.gold}"/>`,
  'cat-legumineuses': `<ellipse cx="50" cy="68" rx="10" ry="14" fill="${C.peach}"/><ellipse cx="70" cy="64" rx="12" ry="16" fill="${C.sage}"/>`,
  'cat-viandes': `<path d="M40 70c4-16 20-22 26-8 4-12 20-16 28-2 6 12 2 26-10 30-12 4-18-4-18-4s-8 8-18 4c-12-4-14-10-8-20z" fill="${C.tomato}"/>`,
  'cat-poissons': `<path d="M30 68c12-16 40-20 56-6 8 6 18 4 20-2-6 14-18 20-30 16-18 10-40 6-46-8z" fill="#4a6a82"/>`,
  'cat-fruits-de-mer': `<path d="M44 80c-8-8-8-20 2-28 12-8 28-4 32 8" fill="${C.peach}"/>
    <ellipse cx="78" cy="72" rx="14" ry="10" fill="${C.ink}"/>`,
  'cat-charcuterie': `<path d="M44 50c22-8 44 8 36 34-6 18-26 22-36 8-10-12-8-34 0-42z" fill="${C.tomatoLite}"/>`,
  'cat-oeufs': `<ellipse cx="64" cy="66" rx="22" ry="28" fill="${C.white}"/><ellipse cx="64" cy="70" rx="12" ry="10" fill="${C.gold}"/>`,
  'cat-fromages': `<path d="M36 80l28-40 28 40z" fill="${C.gold}"/><circle cx="60" cy="68" r="4" fill="${C.yolk}"/>`,
  'cat-laitiers': `<rect x="48" y="42" width="32" height="48" rx="6" fill="${C.white}"/><rect x="48" y="42" width="32" height="12" fill="${C.sageLite}"/>`,
  'cat-matieres-grasses': `<rect x="38" y="58" width="52" height="24" rx="6" fill="${C.gold}"/>`,
  'cat-noix': `<circle cx="54" cy="68" r="16" fill="${C.peach}"/><circle cx="74" cy="66" r="14" fill="${C.yolk}"/>`,
  'cat-epices': `<rect x="50" y="42" width="28" height="48" rx="6" fill="${C.tomato}"/><circle cx="64" cy="56" r="4" fill="${C.gold}"/>`,
  'cat-aromates': `<path d="M64 88c-16-8-24-28-8-40 4 10 10 14 8 40z" fill="${C.sage}"/><path d="M64 88c16-8 24-28 8-40-4 10-10 14-8 40z" fill="${C.sage2}"/>`,
  'cat-sauces': `<rect x="52" y="38" width="24" height="54" rx="6" fill="${C.tomato}"/>`,
  'cat-condiments': `<rect x="46" y="44" width="16" height="40" rx="4" fill="${C.gold}"/><rect x="66" y="44" width="16" height="40" rx="4" fill="${C.ink}"/>`,
  'cat-preparations': `<circle cx="64" cy="66" r="24" fill="${C.peachLite}"/><path d="M52 66h24M64 54v24" stroke="${C.peach}" stroke-width="4" stroke-linecap="round"/>`,
  'cat-boulangerie': `<ellipse cx="64" cy="78" rx="30" ry="14" fill="${C.peach}"/><path d="M38 76c8-22 44-22 52 0" fill="${C.yolk}"/>`,
  'cat-patisserie': `<path d="M44 80c4-28 12-36 20-16 4-22 16-28 20-8 4 12 4 24-4 24H48z" fill="${C.peachLite}"/>
    <circle cx="64" cy="52" r="6" fill="${C.tomato}"/>`,
  'cat-sucres': `<path d="M44 80l20-36 20 36z" fill="${C.white}"/>`,
  'cat-boissons': `<path d="M50 40h28v8c0 16-6 24-14 28-8-4-14-12-14-28z" fill="${C.tomato}"/>
    <rect x="60" y="76" width="8" height="16" fill="${C.ink}"/>`,
  'cat-vegetarien': `<circle cx="64" cy="66" r="22" fill="${C.sage}"/><path d="M64 48c8 8 12 16 8 24" fill="${C.sageLite}"/>`,
  'cat-transformes': `<rect x="40" y="48" width="48" height="36" rx="6" fill="${C.muted}"/>
    <path d="M52 66h24" stroke="${C.white}" stroke-width="4" stroke-linecap="round"/>`,
  'cat-autres': `<circle cx="64" cy="66" r="20" fill="${C.peachLite}"/>
    <path d="M56 66h16M64 58v16" stroke="${C.peach}" stroke-width="4" stroke-linecap="round"/>`,
};

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

let missing = 0;
for (const slug of slugs) {
  const inner = ICONS[slug];
  if (!inner) {
    missing += 1;
    writeFileSync(join(dir, `${slug}.svg`), wrap(slug, `<circle cx="64" cy="66" r="22" fill="${C.peachLite}"/>`));
    continue;
  }
  writeFileSync(join(dir, `${slug}.svg`), wrap(slug, inner));
}

console.log(`Wrote ${String(slugs.length)} SVG icons (${String(missing)} fallbacks).`);
