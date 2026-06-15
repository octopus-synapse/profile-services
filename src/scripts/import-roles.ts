/**
 * roles:import — populate the `RoleTitle` job-title dictionary (Add
 * Experience role autocomplete) from the free taxonomy releases:
 *
 *   esco — ESCO v1.2 occupations, EN + PT (~3k occupations + ~30k alt
 *          labels per language). Fetched from the public ESCO API
 *          (ec.europa.eu/esco/api — the CSV portal sits behind a
 *          captcha'd email form, the API doesn't); one paginated sweep
 *          carries every language, so EN and PT come from the same pass.
 *   cbo  — CBO 2002 (Ministério do Trabalho), PT only (~2.4k ocupações +
 *          ~7k sinônimos). Fetched from the datasets-br/cbo GitHub
 *          mirror (the official mtecbo.gov.br portal is a JSF app that
 *          is frequently "temporariamente indisponível"); override the
 *          source file with CBO_LISTA_URL if the mirror moves.
 *   onet — O*NET (US DoL), EN only (~1k titles + ~56k alternate titles).
 *          Downloaded automatically from onetcenter.org
 *          (override the release with ONET_DB_VERSION, default db_30_1).
 *
 * Usage:
 *   bun run roles:import --source=all            # esco → cbo → onet
 *   bun run roles:import --source=esco|cbo|onet
 *
 * Prereqs: `DATABASE_URL` set and the 20260610000000_add_role_titles
 * migration applied. Everything downloads on the fly — no data dir needed.
 *
 * Idempotency: each source is delete-then-reinsert. Cross-source dedup
 * falls out of the unique (lang, normalizedLabel) + `skipDuplicates` —
 * run sources in the `all` order so ESCO (which carries the conceptUri)
 * wins overlapping titles.
 */

import {
  PrismaClient,
  type RoleSeniority,
  type RoleTitleLang,
  type RoleTitleSource,
} from '@prisma/client';
import { createPrismaClientOptions } from '../bounded-contexts/platform/prisma/prisma-client-options';
import { foldRoleText } from '../bounded-contexts/roles/domain/services/role-search-ranking';
import { generateCuratedRoleVariants } from './role-catalog/generate-role-variants';
import { ROLE_CATALOG } from './role-catalog/role-catalog.data';

const BATCH = 5000;
const ONET_VERSION = process.env.ONET_DB_VERSION ?? 'db_30_1';
const ONET_BASE = `https://www.onetcenter.org/dl_files/database/${ONET_VERSION}_text`;
// Community mirror of the official CBO 2002 tables (codigo,termo,tipo).
const CBO_LISTA_URL =
  process.env.CBO_LISTA_URL ??
  'https://raw.githubusercontent.com/datasets-br/cbo/master/data/lista.csv';

interface RoleTitleRow {
  label: string;
  normalizedLabel: string;
  lang: RoleTitleLang;
  source: RoleTitleSource;
  sourceId: string | null;
  isPreferred: boolean;
  /** CURATED only — null for imported occupational titles. */
  seniority?: RoleSeniority | null;
  /** CURATED only — catalog key grouping this occupation's variants. */
  baseRoleKey?: string | null;
}

function parseArgs(): { source: string } {
  let source = 'all';
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--source=')) source = arg.slice('--source='.length);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!['all', 'esco', 'cbo', 'onet', 'curated'].includes(source)) {
    throw new Error(`--source must be all|esco|cbo|onet|curated, got "${source}"`);
  }
  return { source };
}

/** Minimal RFC4180 parser — ESCO's `altLabels` cell is quoted and
 *  newline-separated, so a naive line split corrupts the file. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

/** Dedupes within a source by (lang, normalizedLabel); preferred wins. */
function collect(rows: Iterable<Omit<RoleTitleRow, 'normalizedLabel'>>): RoleTitleRow[] {
  const byKey = new Map<string, RoleTitleRow>();
  for (const row of rows) {
    const label = row.label.replace(/\s+/g, ' ').trim();
    const normalizedLabel = foldRoleText(label);
    if (normalizedLabel.length < 2) continue;
    const key = `${row.lang}:${normalizedLabel}`;
    const existing = byKey.get(key);
    if (!existing || (row.isPreferred && !existing.isPreferred)) {
      byKey.set(key, { ...row, label, normalizedLabel });
    }
  }
  return [...byKey.values()];
}

const prisma = new PrismaClient(createPrismaClientOptions());

async function replaceSource(source: RoleTitleSource, rows: RoleTitleRow[]): Promise<void> {
  await prisma.roleTitle.deleteMany({ where: { source } });
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    // skipDuplicates: a title another source already owns is kept there
    // (the `all` order makes ESCO win cross-source overlaps).
    const result = await prisma.roleTitle.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
  }
  console.log(
    `✓ ${source}: ${inserted} titles inserted (${rows.length - inserted} already owned by another source)`,
  );
}

const ESCO_API = 'https://ec.europa.eu/esco/api/search';
// 100-item pages make the API time out server-side (consistent 500s after
// ~20s on heavier pages); 50 stays comfortably under it.
const ESCO_PAGE = 50;
const ESCO_RETRIES = 3;

interface EscoOccupation {
  uri?: string;
  preferredLabel?: Record<string, string>;
  alternativeLabel?: Record<string, string[]>;
}

/** ESCO pt labels carry both gender forms in one string
 *  ("Animador 3D/Animadora 3D") — emit each variant separately. */
function splitGenderVariants(label: string): string[] {
  return label.split('/').map((variant) => variant.trim());
}

async function importEsco(): Promise<void> {
  const rows: Array<Omit<RoleTitleRow, 'normalizedLabel'>> = [];
  let total = Number.POSITIVE_INFINITY;
  let skipped = 0;

  // NOTE: the API's `offset` is a page index, not a row offset (the `next`
  // link after offset=0 is offset=1 regardless of `limit`). Returns null on
  // persistent failure so the caller can split the window.
  const fetchPage = async (limit: number, page: number): Promise<EscoOccupation[] | null> => {
    const url = `${ESCO_API}?type=occupation&full=true&limit=${limit}&offset=${page}&language=en`;
    for (let attempt = 1; attempt <= ESCO_RETRIES; attempt++) {
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as {
          total: number;
          _embedded?: { results?: EscoOccupation[] };
        };
        total = body.total;
        return body._embedded?.results ?? [];
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
    return null;
  };

  // A handful of records 500 at any page size (server-side rendering bug —
  // e.g. occupation #493 in v1.2.1); split the failing window down to
  // single rows so only the poisoned record is skipped.
  const fetchRows = async (
    start: number,
    span: number,
    limit: number,
  ): Promise<EscoOccupation[]> => {
    const out: EscoOccupation[] = [];
    for (let s = start; s < start + span; s += limit) {
      const page = await fetchPage(limit, s / limit);
      if (page) {
        out.push(...page);
      } else if (limit === 1) {
        skipped++;
        console.log(`  ! skipping occupation #${s} (persistent API 500)`);
      } else {
        out.push(...(await fetchRows(s, limit, limit === ESCO_PAGE ? 10 : 1)));
      }
    }
    return out;
  };

  let occupations = 0;
  for (let start = 0; start < total; start += ESCO_PAGE) {
    const results = await fetchRows(start, ESCO_PAGE, ESCO_PAGE);
    if (!Number.isFinite(total)) throw new Error('ESCO API unreachable (no page succeeded)');
    for (const occupation of results) {
      const sourceId = occupation.uri ?? null;
      for (const lang of ['EN', 'PT'] as const) {
        const key = lang.toLowerCase();
        const preferred = occupation.preferredLabel?.[key];
        for (const variant of preferred ? splitGenderVariants(preferred) : []) {
          rows.push({ label: variant, lang, source: 'ESCO', sourceId, isPreferred: true });
        }
        for (const alt of occupation.alternativeLabel?.[key] ?? []) {
          for (const variant of splitGenderVariants(alt)) {
            rows.push({ label: variant, lang, source: 'ESCO', sourceId, isPreferred: false });
          }
        }
      }
    }
    occupations += results.length;
    if (occupations % 500 < ESCO_PAGE) console.log(`  …${occupations}/${total} occupations`);
  }
  console.log(
    `  esco: ${occupations} occupations (${skipped} skipped) → ${rows.length} labels parsed`,
  );
  await replaceSource('ESCO', collect(rows));
}

async function importCbo(): Promise<void> {
  console.log(`↓ ${CBO_LISTA_URL}`);
  const res = await fetch(CBO_LISTA_URL);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${CBO_LISTA_URL}`);
  const rows: Array<Omit<RoleTitleRow, 'normalizedLabel'>> = [];
  const counts = { ocupacao: 0, sinonimo: 0, skipped: 0 };
  for (const cells of parseCsv(await res.text(), ',')) {
    const [code, label, tipo] = cells;
    // Skips the header row — CBO codes are numeric ("6125-10").
    if (!code || !label || !/^\d/.test(code.trim())) continue;
    // "Família" rows are collective category names ("Trabalhadores
    // agrícolas…"), not titles a person holds — exclude them.
    if (tipo === 'Família') {
      counts.skipped++;
      continue;
    }
    const isPreferred = tipo === 'Ocupação';
    rows.push({ label, lang: 'PT', source: 'CBO', sourceId: code.trim(), isPreferred });
    if (isPreferred) counts.ocupacao++;
    else counts.sinonimo++;
  }
  console.log(
    `  cbo: ${counts.ocupacao} ocupações + ${counts.sinonimo} sinônimos parsed (${counts.skipped} famílias skipped)`,
  );
  await replaceSource('CBO', collect(rows));
}

async function importOnet(): Promise<void> {
  const fetchTsv = async (file: string): Promise<string[][]> => {
    const url = `${ONET_BASE}/${encodeURIComponent(file)}`;
    console.log(`↓ ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
    return (await res.text())
      .split('\n')
      .slice(1) // header
      .filter(Boolean)
      .map((line) => line.split('\t'));
  };

  const rows: Array<Omit<RoleTitleRow, 'normalizedLabel'>> = [];
  for (const cells of await fetchTsv('Occupation Data.txt')) {
    const [soc, label] = cells;
    if (!soc || !label) continue;
    rows.push({ label, lang: 'EN', source: 'ONET', sourceId: soc, isPreferred: true });
  }
  for (const cells of await fetchTsv('Alternate Titles.txt')) {
    const [soc, label] = cells;
    if (!soc || !label) continue;
    rows.push({ label, lang: 'EN', source: 'ONET', sourceId: soc, isPreferred: false });
  }
  console.log(`  onet: ${rows.length} labels parsed (${ONET_VERSION})`);
  await replaceSource('ONET', collect(rows));
}

/** Curated seniority variants (Estagiário/Júnior/Pleno/Sênior/Trainee + EN)
 *  generated from the base catalog — the levels occupational taxonomies
 *  don't model. Runs last so it only fills titles ESCO/CBO/O*NET lack. */
async function importCurated(): Promise<void> {
  const variants = generateCuratedRoleVariants(ROLE_CATALOG);
  const rows: Array<Omit<RoleTitleRow, 'normalizedLabel'>> = variants.map((variant) => ({
    label: variant.label,
    lang: variant.lang,
    source: 'CURATED',
    // sourceId mirrors baseRoleKey so EN↔PT variants of one occupation share it.
    sourceId: variant.baseRoleKey,
    isPreferred: variant.isPreferred,
    seniority: variant.seniority,
    baseRoleKey: variant.baseRoleKey,
  }));
  console.log(
    `  curated: ${ROLE_CATALOG.length} base occupations → ${rows.length} variant labels generated`,
  );
  await replaceSource('CURATED', collect(rows));
}

async function main(): Promise<void> {
  const { source } = parseArgs();
  console.log(`💼 Role-title import — source="${source}"`);
  // `all` runs in dedup-precedence order: ESCO rows carry the conceptUri,
  // so they should own any title that also exists in CBO/O*NET. CURATED is
  // last so it only adds the seniority variants the taxonomies lack.
  if (source === 'all' || source === 'esco') await importEsco();
  if (source === 'all' || source === 'cbo') await importCbo();
  if (source === 'all' || source === 'onet') await importOnet();
  if (source === 'all' || source === 'curated') await importCurated();
  const counts = await prisma.roleTitle.groupBy({ by: ['source', 'lang'], _count: { _all: true } });
  for (const c of counts) console.log(`  ${c.source}/${c.lang}: ${c._count._all} titles`);
  console.log('✅ Role-title import complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
