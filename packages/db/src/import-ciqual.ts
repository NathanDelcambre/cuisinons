import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import {
  mapCiqualToUxCategory,
  normalizeSearchText,
  parseCiqualNutrient,
  uxSubCategory,
  type NutrientValue,
  type UxCategory,
} from '@cuisinons/shared';
import './load-env';
import { prisma } from './client';
import { applyDedicatedIcons } from './icons';

const CIQUAL_VERSION = '2025';
const CIQUAL_DATE = new Date('2025-11-03T00:00:00.000Z');
const EXPECTED_MD5 = '0d9758ce23f3f13dd63a005bc1bb4f2c';
const DATASET_API =
  'https://entrepot.recherche.data.gouv.fr/api/datasets/:persistentId/?persistentId=doi:10.57745/RDMHWY';

function kindAndAmount(value: NutrientValue): {
  kind: 'VALUE' | 'TRACES' | 'LESS_THAN' | 'ABSENT' | 'NA';
  amount: number | null;
} {
  if (value.kind === 'VALUE') return { kind: 'VALUE', amount: value.amount };
  if (value.kind === 'LESS_THAN') return { kind: 'LESS_THAN', amount: value.amount };
  return { kind: value.kind, amount: null };
}

function findHeader(headers: string[], candidates: RegExp[]): number {
  for (const [index, header] of headers.entries()) {
    for (const candidate of candidates) {
      if (candidate.test(header)) return index;
    }
  }
  return -1;
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text;
  }
  if (typeof value === 'object' && 'result' in value) {
    return String((value as { result: unknown }).result ?? '');
  }
  return String(value);
}

async function downloadCiqual(targetFile: string): Promise<void> {
  const datasetRes = await fetch(DATASET_API, { headers: { Accept: 'application/json' } });
  if (!datasetRes.ok) {
    throw new Error(`Impossible de lire le catalogue Ciqual (${String(datasetRes.status)}).`);
  }
  const dataset = (await datasetRes.json()) as {
    data?: {
      latestVersion?: {
        files?: Array<{ label?: string; dataFile?: { id?: number; md5?: string } }>;
      };
    };
  };
  const files = dataset.data?.latestVersion?.files ?? [];
  const xlsx = files.find((file) => (file.label ?? '').toLowerCase().endsWith('.xlsx'));
  const fileId = xlsx?.dataFile?.id;
  if (!fileId) {
    throw new Error('Fichier Ciqual 2025 xlsx introuvable sur le dépôt officiel.');
  }
  const downloadUrl = `https://entrepot.recherche.data.gouv.fr/api/access/datafile/${String(fileId)}`;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok || !fileRes.body) {
    throw new Error(`Téléchargement Ciqual échoué (${String(fileRes.status)}).`);
  }
  await pipeline(Readable.fromWeb(fileRes.body), createWriteStream(targetFile));
}

async function ensureWorkbook(root: string): Promise<string> {
  const dir = path.join(root, '.data');
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, 'ciqual-2025.xlsx');
  try {
    await access(target);
    const buf = await readFile(target);
    const md5 = createHash('md5').update(buf).digest('hex');
    if (md5 === EXPECTED_MD5) {
      return target;
    }
    console.warn(`Checksum Ciqual inattendu (${md5}), nouveau téléchargement.`);
  } catch {
    // missing
  }
  console.log('Téléchargement de la table Ciqual 2025 (Anses, etalab 2.0)…');
  await downloadCiqual(target);
  const buf = await readFile(target);
  const md5 = createHash('md5').update(buf).digest('hex');
  if (md5 !== EXPECTED_MD5) {
    console.warn(`Checksum MD5 ${md5} (attendu ${EXPECTED_MD5}). Import poursuivi.`);
  }
  return target;
}

export async function importCiqual(): Promise<{ count: number }> {
  const root = path.resolve(process.cwd(), '../..');
  const file = await ensureWorkbook(root);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet =
    workbook.worksheets.find((s) => /ciqual|alim|compo/i.test(s.name)) ?? workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Classeur Ciqual vide.');
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cellString(cell.value).replace(/\s+/g, ' ').trim();
  });

  const codeIdx = findHeader(headers, [/^alim_code$/i, /code.?aliment/i]);
  const nameIdx = findHeader(headers, [/^alim_nom_fr$/i, /nom.?fr/i]);
  const groupIdx = findHeader(headers, [/^alim_grp_nom_fr$/i, /groupe/i]);
  const subIdx = findHeader(headers, [/^alim_ssgrp_nom_fr$/i, /sous.?groupe/i]);
  const subSubIdx = findHeader(headers, [/^alim_ssssgrp_nom_fr$/i]);
  const kcalIdx = findHeader(headers, [/kcal.*100/i, /énergie.*kcal/i, /energie.*kcal/i]);
  const proteinIdx = findHeader(headers, [/prot[eé]ines.*6\.?25/i, /prot[eé]ines/i]);
  const carbIdx = findHeader(headers, [/^glucides/i]);
  const fatIdx = findHeader(headers, [/^lipides/i]);
  const fiberIdx = findHeader(headers, [/fibres/i]);
  const sugarIdx = findHeader(headers, [/^sucres/i]);
  const saltIdx = findHeader(headers, [/^sel/i]);

  if (codeIdx < 0 || nameIdx < 0 || kcalIdx < 0) {
    throw new Error(
      `Colonnes Ciqual introuvables. En-têtes: ${headers.filter(Boolean).slice(0, 20).join(' | ')}`,
    );
  }

  const rows: Array<{
    ciqualCode: number;
    nameFr: string;
    nameNormalized: string;
    groupName: string;
    subGroupName: string | null;
    subSubGroupName: string | null;
    uxCategory: UxCategory;
    uxSubCategory: string;
    energy: NutrientValue;
    protein: NutrientValue;
    carb: NutrientValue;
    fat: NutrientValue;
    fiber: NutrientValue;
    sugar: NutrientValue;
    salt: NutrientValue;
  }> = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (idx: number) => (idx >= 0 ? cellString(row.getCell(idx + 1).value) : '');
    const code = Number(get(codeIdx));
    const nameFr = get(nameIdx).trim();
    if (!Number.isFinite(code) || nameFr.length === 0) return;
    const groupName = get(groupIdx) || 'Non classé';
    const subGroupName = get(subIdx) || null;
    const category = mapCiqualToUxCategory({
      groupName,
      subGroupName,
      foodName: nameFr,
    });
    rows.push({
      ciqualCode: code,
      nameFr,
      nameNormalized: normalizeSearchText(nameFr),
      groupName,
      subGroupName,
      subSubGroupName: get(subSubIdx) || null,
      uxCategory: category,
      uxSubCategory: uxSubCategory({ category, subGroupName }),
      energy: parseCiqualNutrient(get(kcalIdx)),
      protein: parseCiqualNutrient(get(proteinIdx)),
      carb: parseCiqualNutrient(get(carbIdx)),
      fat: parseCiqualNutrient(get(fatIdx)),
      fiber: parseCiqualNutrient(get(fiberIdx)),
      sugar: parseCiqualNutrient(get(sugarIdx)),
      salt: parseCiqualNutrient(get(saltIdx)),
    });
  });

  const chunkSize = 10;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (row) => {
        const energy = kindAndAmount(row.energy);
        const protein = kindAndAmount(row.protein);
        const carb = kindAndAmount(row.carb);
        const fat = kindAndAmount(row.fat);
        const fiber = kindAndAmount(row.fiber);
        const sugar = kindAndAmount(row.sugar);
        const salt = kindAndAmount(row.salt);
        await prisma.ingredient.upsert({
          where: { ciqualCode: row.ciqualCode },
          update: {
            nameFr: row.nameFr,
            nameNormalized: row.nameNormalized,
            groupName: row.groupName,
            subGroupName: row.subGroupName,
            subSubGroupName: row.subSubGroupName,
            uxCategory: row.uxCategory,
            uxSubCategory: row.uxSubCategory,
            energyKcalKind: energy.kind,
            energyKcal: energy.amount,
            proteinKind: protein.kind,
            proteinG: protein.amount,
            carbKind: carb.kind,
            carbG: carb.amount,
            fatKind: fat.kind,
            fatG: fat.amount,
            fiberKind: fiber.kind,
            fiberG: fiber.amount,
            sugarKind: sugar.kind,
            sugarG: sugar.amount,
            saltKind: salt.kind,
            saltG: salt.amount,
            source: 'Ciqual',
            sourceVersion: CIQUAL_VERSION,
            sourceDate: CIQUAL_DATE,
          },
          create: {
            ciqualCode: row.ciqualCode,
            nameFr: row.nameFr,
            nameNormalized: row.nameNormalized,
            groupName: row.groupName,
            subGroupName: row.subGroupName,
            subSubGroupName: row.subSubGroupName,
            uxCategory: row.uxCategory,
            uxSubCategory: row.uxSubCategory,
            energyKcalKind: energy.kind,
            energyKcal: energy.amount,
            proteinKind: protein.kind,
            proteinG: protein.amount,
            carbKind: carb.kind,
            carbG: carb.amount,
            fatKind: fat.kind,
            fatG: fat.amount,
            fiberKind: fiber.kind,
            fiberG: fiber.amount,
            sugarKind: sugar.kind,
            sugarG: sugar.amount,
            saltKind: salt.kind,
            saltG: salt.amount,
            source: 'Ciqual',
            sourceVersion: CIQUAL_VERSION,
            sourceDate: CIQUAL_DATE,
          },
        });
      }),
    );
  }

  await applyDedicatedIcons();
  return { count: rows.length };
}

if (process.argv[1] && process.argv[1].includes('import-ciqual')) {
  importCiqual()
    .then((result) => {
      console.log(`Import Ciqual 2025 terminé : ${String(result.count)} aliments.`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
