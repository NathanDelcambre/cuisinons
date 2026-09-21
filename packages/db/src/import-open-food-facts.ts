import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { Readable, type Readable as NodeReadable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { prisma } from './client';

const PRODUCTS_SOURCE =
  process.env.OFF_PRODUCTS_SOURCE ??
  'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
const LOCATIONS_SOURCE =
  process.env.OPEN_PRICES_LOCATIONS_SOURCE ??
  'https://prices.openfoodfacts.org/data/locations.jsonl.gz';
const PRICES_SOURCE =
  process.env.OPEN_PRICES_SOURCE ?? 'https://prices.openfoodfacts.org/data/prices.jsonl.gz';
const RAW_CATEGORY_TAGS_SOURCE =
  process.env.OPEN_PRICES_CATEGORY_TAGS_SOURCE ??
  'https://raw.githubusercontent.com/openfoodfacts/open-prices-frontend/main/src/data/category-tags.json';
const RAW_CATEGORY_TRANSLATIONS_SOURCE =
  process.env.OPEN_PRICES_CATEGORY_TRANSLATIONS_SOURCE ??
  'https://raw.githubusercontent.com/openfoodfacts/open-prices-frontend/main/src/data/categories/fr.json';
const MAX_PRODUCTS = Number(process.env.OFF_MAX_PRODUCTS ?? 50_000);
const STAPLE_QUOTA = Math.min(MAX_PRODUCTS, Number(process.env.OFF_STAPLE_QUOTA ?? 10_000));
const MAX_ALLOWED_PRODUCTS = 150_000;
const MIN_PRODUCT_COMPLETENESS = 0.95;
const MIN_PRICE_RETENTION = 0.25;
const USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT ??
  'Cuisinons/0.1 (https://github.com/NathanDelcambre/cuisinons)';

type Json = Record<string, unknown>;
type Retailer = 'LECLERC' | 'U' | 'CARREFOUR' | 'AUCHAN' | 'LIDL' | 'INTERMARCHE';
type ProductRow = {
  barcode: string;
  name: string;
  normalizedName: string;
  searchText: string;
  brand: string | null;
  imageUrl: string | null;
  packageQuantity: number | null;
  packageUnit: string | null;
  categories: string[];
  nutriScore: string | null;
  novaGroup: number | null;
  popularity: number;
  isStaple: boolean;
  isBulk: boolean;
  sourceUpdatedAt: string | null;
  score: number;
};

const STAPLE_TAGS = new Set([
  'en:rices',
  'en:pastas',
  'en:flours',
  'en:eggs',
  'en:milks',
  'en:butters',
  'en:vegetable-oils',
  'en:canned-foods',
  'en:legumes',
  'en:breads',
  'en:potatoes',
  'en:sugars',
  'en:salts',
  'en:frozen-vegetables',
  'en:spices',
  'en:peppers',
  'en:black-peppers',
  'en:herbs',
  'en:aromatic-herbs',
  'en:dried-fruits',
  'en:rolled-oats',
  'en:oat-flakes',
]);
const STAPLE_WORDS = new Set([
  'riz',
  'pates',
  'pate',
  'farine',
  'oeuf',
  'oeufs',
  'lait',
  'beurre',
  'huile',
  'lentilles',
  'haricots',
  'pois',
  'pain',
  'sucre',
  'sel',
  'tomates',
  'thon',
  'poivre',
  'paprika',
  'cumin',
  'curcuma',
  'cannelle',
  'avoine',
]);
const RETAILER_TERMS: Array<[Retailer, string[]]> = [
  ['LECLERC', ['e leclerc', 'leclerc']],
  ['U', ['super u', 'hyper u', 'u express', 'utile']],
  ['CARREFOUR', ['carrefour']],
  ['AUCHAN', ['auchan']],
  ['LIDL', ['lidl']],
  ['INTERMARCHE', ['intermarche']],
];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function asNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function packageSize(quantity: unknown, rawUnit: unknown) {
  const amount = asNumber(quantity);
  const unit = asString(rawUnit)?.toLowerCase();
  if (!amount || amount <= 0 || !unit) return null;
  if (unit === 'g') return { quantity: amount, unit: 'G' };
  if (unit === 'kg') return { quantity: amount * 1000, unit: 'G' };
  if (unit === 'ml') return { quantity: amount, unit: 'ML' };
  if (unit === 'cl') return { quantity: amount * 10, unit: 'ML' };
  if (unit === 'l') return { quantity: amount * 1000, unit: 'ML' };
  return { quantity: amount, unit: unit.toUpperCase() };
}

function productFromJson(item: Json): ProductRow | null {
  const barcode = asString(item.code);
  const name = asString(item.product_name_fr) ?? asString(item.product_name);
  const countries = asStrings(item.countries_tags);
  if (
    !barcode ||
    !/^\d{8,14}$/.test(barcode) ||
    !name ||
    !countries.some((tag) => tag === 'en:france' || tag === 'fr:france')
  )
    return null;
  const categories = asStrings(item.categories_tags);
  const normalizedName = normalize(name);
  const brand = asString(item.brands);
  const popularity = Math.max(0, Math.trunc(asNumber(item.unique_scans_n) ?? 0));
  const nutriScore = asString(item.nutriscore_grade)?.toLowerCase() ?? null;
  const healthBonus: Record<string, number> = { a: 40, b: 30, c: 20, d: 10, e: 0 };
  const nameWords = new Set(normalizedName.split(' '));
  const isStaple =
    categories.some((tag) => STAPLE_TAGS.has(tag)) ||
    [...STAPLE_WORDS].some((word) => nameWords.has(word));
  const size = packageSize(item.product_quantity, item.product_quantity_unit);
  const modified = asNumber(item.last_modified_t);
  return {
    barcode,
    name,
    normalizedName,
    searchText: normalize(`${name} ${brand ?? ''} ${categories.join(' ')}`),
    brand,
    imageUrl: asString(item.image_front_url) ?? asString(item.image_url),
    packageQuantity: size?.quantity ?? null,
    packageUnit: size?.unit ?? null,
    categories,
    nutriScore,
    novaGroup: asNumber(item.nova_group),
    popularity,
    isStaple,
    isBulk: false,
    sourceUpdatedAt: modified ? new Date(modified * 1000).toISOString() : null,
    score: popularity * 100 + (nutriScore ? (healthBonus[nutriScore] ?? 0) : 0),
  };
}

class TopRows {
  private readonly rows: ProductRow[] = [];
  constructor(private readonly limit: number) {}
  add(row: ProductRow) {
    if (this.limit === 0) return;
    if (this.rows.length < this.limit) {
      this.rows.push(row);
      this.up(this.rows.length - 1);
    } else if (row.score > this.rows[0]!.score) {
      this.rows[0] = row;
      this.down(0);
    }
  }
  values() {
    return this.rows.sort((a, b) => b.score - a.score);
  }
  private up(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.rows[parent]!.score <= this.rows[index]!.score) break;
      [this.rows[parent], this.rows[index]] = [this.rows[index]!, this.rows[parent]!];
      index = parent;
    }
  }
  private down(index: number) {
    while (true) {
      const left = index * 2 + 1,
        right = left + 1;
      let smallest = index;
      if (left < this.rows.length && this.rows[left]!.score < this.rows[smallest]!.score)
        smallest = left;
      if (right < this.rows.length && this.rows[right]!.score < this.rows[smallest]!.score)
        smallest = right;
      if (smallest === index) return;
      [this.rows[index], this.rows[smallest]] = [this.rows[smallest]!, this.rows[index]!];
      index = smallest;
    }
  }
}

async function sourceStream(source: string): Promise<NodeReadable> {
  let stream: NodeReadable;
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok || !response.body) throw new Error(`${source}: HTTP ${response.status}`);
    stream = Readable.fromWeb(response.body as never);
  } else stream = createReadStream(source);
  return source.endsWith('.gz') ? stream.pipe(createGunzip()) : stream;
}
async function* jsonLines(source: string): AsyncGenerator<Json> {
  const lines = createInterface({ input: await sourceStream(source), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as Json;
    } catch {
      /* ignore */
    }
  }
}
async function jsonArray(source: string): Promise<Json[]> {
  const response = await fetch(source, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error(`${source}: tableau JSON attendu`);
  return value.filter((item): item is Json => typeof item === 'object' && item !== null);
}
function chunks<T>(rows: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size));
  return result;
}

const UPSERT_PRODUCTS = `INSERT INTO "OpenFoodProduct" ("barcode","name","normalizedName","searchText","brand","imageUrl","packageQuantity","packageUnit","categories","nutriScore","novaGroup","popularity","isStaple","isBulk","isActive","sourceUpdatedAt","importBatchId","updatedAt") SELECT x."barcode",x."name",x."normalizedName",x."searchText",x."brand",x."imageUrl",x."packageQuantity",x."packageUnit",x."categories",x."nutriScore",x."novaGroup",x."popularity",x."isStaple",x."isBulk",true,x."sourceUpdatedAt",x."importBatchId",NOW() FROM jsonb_to_recordset($1::jsonb) AS x("barcode" text,"name" text,"normalizedName" text,"searchText" text,"brand" text,"imageUrl" text,"packageQuantity" numeric,"packageUnit" text,"categories" text[],"nutriScore" text,"novaGroup" int,"popularity" int,"isStaple" boolean,"isBulk" boolean,"sourceUpdatedAt" timestamp,"importBatchId" text) ON CONFLICT ("barcode") DO UPDATE SET "name"=EXCLUDED."name","normalizedName"=EXCLUDED."normalizedName","searchText"=EXCLUDED."searchText","brand"=EXCLUDED."brand","imageUrl"=EXCLUDED."imageUrl","packageQuantity"=EXCLUDED."packageQuantity","packageUnit"=EXCLUDED."packageUnit","categories"=EXCLUDED."categories","nutriScore"=EXCLUDED."nutriScore","novaGroup"=EXCLUDED."novaGroup","popularity"=EXCLUDED."popularity","isStaple"=EXCLUDED."isStaple","isBulk"=EXCLUDED."isBulk","isActive"=true,"sourceUpdatedAt"=EXCLUDED."sourceUpdatedAt","importBatchId"=EXCLUDED."importBatchId","updatedAt"=NOW()`;
const UPSERT_PRICES = `INSERT INTO "OpenFoodPrice" ("id","productBarcode","retailer","locationId","storeName","price","currency","observedAt","importBatchId","updatedAt") SELECT x."id",x."productBarcode",x."retailer"::"Retailer",x."locationId",x."storeName",x."price",x."currency",x."observedAt",x."importBatchId",NOW() FROM jsonb_to_recordset($1::jsonb) AS x("id" text,"productBarcode" text,"retailer" text,"locationId" int,"storeName" text,"price" numeric,"currency" text,"observedAt" date,"importBatchId" text) ON CONFLICT ("productBarcode","retailer") DO UPDATE SET "locationId"=EXCLUDED."locationId","storeName"=EXCLUDED."storeName","price"=EXCLUDED."price","currency"=EXCLUDED."currency","observedAt"=EXCLUDED."observedAt","importBatchId"=EXCLUDED."importBatchId","updatedAt"=NOW()`;

async function selectProducts(pricedBarcodes: Set<string>) {
  const priced = new TopRows(MAX_PRODUCTS);
  const staples = new TopRows(STAPLE_QUOTA);
  const others = new TopRows(MAX_PRODUCTS);
  for await (const item of jsonLines(PRODUCTS_SOURCE)) {
    const row = productFromJson(item);
    if (!row) continue;
    if (pricedBarcodes.has(row.barcode)) {
      priced.add(row);
      continue;
    }
    (row.isStaple ? staples : others).add(row);
  }
  const keptPriced = priced.values();
  const seen = new Set(keptPriced.map((row) => row.barcode));
  const room = Math.max(0, MAX_PRODUCTS - keptPriced.length);
  const extraStaples = staples
    .values()
    .filter((row) => !seen.has(row.barcode))
    .slice(0, room);
  for (const row of extraStaples) seen.add(row.barcode);
  const extraOthers = others
    .values()
    .filter((row) => !seen.has(row.barcode))
    .slice(0, room - extraStaples.length);
  return [...keptPriced, ...extraStaples, ...extraOthers];
}
function retailerFor(location: Json): Retailer | null {
  if (
    asString(location.osm_address_country_code)?.toUpperCase() !== 'FR' ||
    !['supermarket', 'convenience', 'discount'].includes(asString(location.osm_tag_value) ?? '')
  )
    return null;
  const label = normalize(
    `${asString(location.osm_name) ?? ''} ${asString(location.osm_brand) ?? ''}`,
  );
  return (
    RETAILER_TERMS.find(([, terms]) => terms.some((term) => label.includes(term)))?.[0] ?? null
  );
}
type PriceRow = {
  id: string;
  productBarcode: string;
  retailer: Retailer;
  locationId: number;
  storeName: string | null;
  price: number;
  currency: string;
  observedAt: string;
  importBatchId: string;
};

type RawCategory = { name: string; englishName: string };

async function loadRawCategories() {
  const [allowedRows, frenchRows] = await Promise.all([
    jsonArray(RAW_CATEGORY_TAGS_SOURCE),
    jsonArray(RAW_CATEGORY_TRANSLATIONS_SOURCE),
  ]);
  const frenchNames = new Map(
    frenchRows.flatMap((row) => {
      const id = asString(row.id);
      const name = asString(row.name);
      return id && name ? ([[id, name]] as const) : [];
    }),
  );
  return new Map<string, RawCategory>(
    allowedRows.flatMap((row) => {
      const id = asString(row.id);
      const englishName = asString(row.name);
      if (!id || !englishName) return [];
      return [[id, { name: frenchNames.get(id) ?? englishName, englishName }]];
    }),
  );
}

function rawProduct(categoryTag: string, category: RawCategory, observedAt: string): ProductRow {
  const name = `${category.name} en vrac`;
  return {
    barcode: `openprices:${categoryTag}`,
    name,
    normalizedName: normalize(name),
    searchText: normalize(`${name} ${category.englishName} ${categoryTag}`),
    brand: null,
    imageUrl: null,
    packageQuantity: 1000,
    packageUnit: 'G',
    categories: [categoryTag],
    nutriScore: null,
    novaGroup: null,
    popularity: 0,
    isStaple: true,
    isBulk: true,
    sourceUpdatedAt: `${observedAt}T00:00:00.000Z`,
    score: 0,
  };
}

async function loadRetailerLocations() {
  const locations = new Map<number, { retailer: Retailer; name: string | null }>();
  for await (const item of jsonLines(LOCATIONS_SOURCE)) {
    const id = asNumber(item.id);
    const retailer = retailerFor(item);
    if (id !== null && retailer)
      locations.set(id, { retailer, name: asString(item.osm_name) ?? asString(item.osm_brand) });
  }
  return locations;
}

/** Tous les derniers prix France des six enseignes, même si le produit n’est pas encore au catalogue. */
async function collectLatestPrices(
  batchId: string,
  locations: Map<number, { retailer: Retailer; name: string | null }>,
  rawCategories: Map<string, RawCategory>,
) {
  const latest = new Map<string, PriceRow>();
  const rawProducts = new Map<string, ProductRow>();
  for await (const item of jsonLines(PRICES_SOURCE)) {
    const productCode = asString(item.product_code);
    const categoryTag = asString(item.category_tag);
    const rawCategory = categoryTag ? rawCategories.get(categoryTag) : null;
    const isBulk = !productCode && rawCategory && item.price_per === 'KILOGRAM';
    const barcode = productCode ?? (isBulk ? `openprices:${categoryTag}` : null);
    const locationId = asNumber(item.location_id);
    const location = locationId === null ? null : locations.get(locationId);
    const observedAt = asString(item.date);
    const price = asNumber(item.price);
    if (
      !barcode ||
      !location ||
      locationId === null ||
      !observedAt ||
      !price ||
      price <= 0 ||
      item.currency !== 'EUR'
    )
      continue;
    const key = `${barcode}|${location.retailer}`;
    const previous = latest.get(key);
    if (previous && previous.observedAt >= observedAt) continue;
    if (isBulk && categoryTag && rawCategory) {
      rawProducts.set(barcode, rawProduct(categoryTag, rawCategory, observedAt));
    }
    latest.set(key, {
      id: randomUUID(),
      productBarcode: barcode,
      retailer: location.retailer,
      locationId,
      storeName: location.name,
      price,
      currency: 'EUR',
      observedAt,
      importBatchId: batchId,
    });
  }
  return { latest, rawProducts: [...rawProducts.values()] };
}

async function writePrices(batchId: string, latest: Map<string, PriceRow>, barcodes: Set<string>) {
  const rows = [...latest.values()].filter((row) => barcodes.has(row.productBarcode));
  const previousPriceCount = await prisma.openFoodPrice.count();
  if (previousPriceCount > 0 && rows.length < previousPriceCount * MIN_PRICE_RETENTION) {
    throw new Error(
      `Import Open Prices incomplet: ${rows.length} prix trouves pour ${previousPriceCount} existants.`,
    );
  }
  for (const batch of chunks(rows, 500))
    await prisma.$executeRawUnsafe(UPSERT_PRICES, JSON.stringify(batch));
  await prisma.openFoodPrice.deleteMany({ where: { importBatchId: { not: batchId } } });
  return rows.length;
}

async function main() {
  if (!Number.isInteger(MAX_PRODUCTS) || MAX_PRODUCTS < 1 || MAX_PRODUCTS > MAX_ALLOWED_PRODUCTS)
    throw new Error(`OFF_MAX_PRODUCTS doit etre compris entre 1 et ${MAX_ALLOWED_PRODUCTS}.`);
  if (!Number.isInteger(STAPLE_QUOTA) || STAPLE_QUOTA < 0)
    throw new Error('OFF_STAPLE_QUOTA doit etre un entier positif.');
  const batchId = randomUUID();
  await prisma.openFoodImport.create({ data: { id: batchId } });
  try {
    const locations = await loadRetailerLocations();
    const rawCategories = await loadRawCategories();
    const { latest: latestPrices, rawProducts } = await collectLatestPrices(
      batchId,
      locations,
      rawCategories,
    );
    const pricedBarcodes = new Set([...latestPrices.values()].map((row) => row.productBarcode));
    const packagedProducts = await selectProducts(pricedBarcodes);
    const minimumExpectedProducts = Math.floor(MAX_PRODUCTS * MIN_PRODUCT_COMPLETENESS);
    if (packagedProducts.length < minimumExpectedProducts) {
      throw new Error(
        `Import Open Food Facts incomplet: ${packagedProducts.length} produits trouves, ${minimumExpectedProducts} minimum attendus.`,
      );
    }
    const products = [...packagedProducts, ...rawProducts];
    for (const batch of chunks(products, 500)) {
      const rows = batch.map(({ score: _score, ...row }) => ({ ...row, importBatchId: batchId }));
      await prisma.$executeRawUnsafe(UPSERT_PRODUCTS, JSON.stringify(rows));
    }
    const priceCount = await writePrices(
      batchId,
      latestPrices,
      new Set(products.map((product) => product.barcode)),
    );
    // Un produit qui disparaît du dump ne doit plus être proposé. S'il est
    // encore présent dans une réserve, on conserve toutefois sa fiche afin de
    // pouvoir afficher et consommer proprement le stock réel restant.
    await prisma.openFoodProduct.updateMany({
      where: { importBatchId: { not: batchId } },
      data: { isActive: false },
    });
    await prisma.openFoodProduct.deleteMany({
      where: {
        isActive: false,
        pantryItems: { none: {} },
        pantryConsumptions: { none: {} },
      },
    });
    await prisma.openFoodImport.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        productCount: products.length,
        priceCount,
      },
    });
    console.log(`Import termine: ${products.length} produits, ${priceCount} prix.`);
  } catch (error) {
    await prisma.openFoodImport.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
void main();
