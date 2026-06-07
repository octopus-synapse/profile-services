/**
 * geo:import — populate the GeoNames tables (GeoCountry / GeoAdmin1 / GeoCity)
 * from the public GeoNames dumps. Read by `PrismaGeoLookupAdapter` when
 * `GEO_SOURCE=postgres`.
 *
 * Prereqs:
 *   1. `DATABASE_URL` set.
 *   2. Tables migrated:  `bun run prisma:migrate`  (creates the geo.prisma models).
 *   3. `unzip` available on PATH (used for the city dump archive).
 *
 * Usage:
 *   bun run geo:import                          # GEONAMES_DATASET=allCountries (every populated place, ~4.8M, heavy)
 *   GEONAMES_DATASET=cities1000 bun run geo:import   # lighter subset (~150k)
 *
 * Datasets (https://download.geonames.org/export/dump):
 *   allCountries | cities500 | cities1000 | cities5000 | cities15000
 * Only feature class 'P' (populated places) is imported as cities. The city
 * dump is streamed line-by-line and inserted in batches so even allCountries
 * (~1.5GB unzipped) stays within a modest memory budget.
 *
 * Index note: matching uses a prefix over `searchName`. For large datasets,
 * add a trigram/`text_pattern_ops` index on `searchName` via raw SQL so the
 * prefix scan is index-backed (requires the extension to be on the cluster's
 * allowlist — see scripts/check-pg-extensions.ts).
 */

import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { createInterface } from 'node:readline';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../bounded-contexts/platform/prisma/prisma-client-options';

const BASE = 'https://download.geonames.org/export/dump';
const DATASET = process.env.GEONAMES_DATASET ?? 'allCountries';
const TMP = path.join('tmp', 'geonames');
const BATCH = 5000;

type CityRow = {
  id: number;
  name: string;
  searchName: string;
  countryCode: string;
  admin1Code: string | null;
  population: bigint;
  latitude: number | null;
  longitude: number | null;
};

/** Accent- and case-insensitive normalisation matching the adapter. */
function norm(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

async function download(file: string): Promise<string> {
  await mkdir(TMP, { recursive: true });
  const dest = path.join(TMP, file);
  const url = `${BASE}/${file}`;
  console.log(`↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  await Bun.write(dest, res);
  console.log(`  ↳ ${(Bun.file(dest).size / 1e6).toFixed(1)} MB`);
  return dest;
}

const prisma = new PrismaClient(createPrismaClientOptions());

async function importCountries(): Promise<void> {
  const file = await download('countryInfo.txt');
  const text = await readFile(file, 'utf8');
  const rows = text
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('\t'))
    .filter((c) => c[0] && c[4])
    .map((c) => ({ code: c[0] as string, name: c[4] as string, searchName: norm(c[4] as string) }));

  await prisma.geoCountry.deleteMany();
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.geoCountry.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true });
  }
  console.log(`✓ countries: ${rows.length}`);
}

async function importAdmin1(): Promise<void> {
  const file = await download('admin1CodesASCII.txt');
  const text = await readFile(file, 'utf8');
  const rows = text
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter((c) => c[0] && c[1])
    .map((c) => {
      const [countryCode, admin1Code] = (c[0] as string).split('.');
      return {
        id: c[0] as string,
        countryCode: countryCode ?? '',
        admin1Code: admin1Code ?? '',
        name: c[1] as string,
        searchName: norm((c[2] ?? c[1]) as string),
      };
    });

  await prisma.geoAdmin1.deleteMany();
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.geoAdmin1.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true });
  }
  console.log(`✓ admin1 (states): ${rows.length}`);
}

async function importCities(): Promise<void> {
  const zip = await download(`${DATASET}.zip`);
  console.log('  ↳ unzipping…');
  await Bun.$`unzip -o ${zip} -d ${TMP}`.quiet();
  const txt = path.join(TMP, `${DATASET}.txt`);

  console.log('  ↳ clearing existing cities…');
  await prisma.geoCity.deleteMany();

  const rl = createInterface({
    input: createReadStream(txt, 'utf8'),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  let batch: CityRow[] = [];
  let total = 0;

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    await prisma.geoCity.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
    batch = [];
    if (total % 50_000 < BATCH) console.log(`  …${total} cities`);
  };

  // GeoNames `geoname` columns (tab-separated):
  // 0 id · 1 name · 2 asciiname · 4 lat · 5 lon · 6 featureClass · 7 featureCode
  // · 8 countryCode · 10 admin1Code · 14 population
  for await (const line of rl) {
    if (!line) continue;
    const c = line.split('\t');
    if (c[6] !== 'P') continue; // populated places only
    const id = Number(c[0]);
    if (!Number.isFinite(id)) continue;
    batch.push({
      id,
      name: c[1] ?? '',
      searchName: norm(c[2] || c[1] || ''),
      countryCode: c[8] ?? '',
      admin1Code: c[10] || null,
      population: BigInt(c[14] || '0'),
      latitude: c[4] ? Number(c[4]) : null,
      longitude: c[5] ? Number(c[5]) : null,
    });
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  console.log(`✓ cities (feature class P): ${total}`);
}

async function main(): Promise<void> {
  console.log(`🌍 GeoNames import — dataset="${DATASET}"`);
  await importCountries();
  await importAdmin1();
  await importCities();
  await rm(TMP, { recursive: true, force: true });
  console.log('✅ GeoNames import complete. Set GEO_SOURCE=postgres to serve it.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
