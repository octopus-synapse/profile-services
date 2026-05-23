#!/usr/bin/env bun
/**
 * P0-005 follow-up: backfill the `Upload` table with rows for legacy
 * MinIO keys that pre-date the table.
 *
 * Without this script, legacy uploads stay in "limbo" — the per-delete
 * lazy backfill (in `DeleteUploadUseCase`) eventually catches up, but
 * a user requesting LGPD right-to-erasure may need the rows present
 * up-front so a single bulk-delete sweep can scope the right keys.
 *
 * Approach:
 *   1. Stream every object in `MINIO_BUCKET` via the official `minio`
 *      SDK (`listObjectsV2`, recursive). The stream paginates
 *      transparently — we just consume it.
 *   2. For each key, infer `userId` using the same path-convention rule
 *      `inferOwnerFromKeyPath()` uses in the lazy-backfill use case.
 *   3. INSERT a row only when (a) inferred userId looks valid AND
 *      (b) no row already exists for that key. Idempotent — safe to
 *      re-run after a partial pass.
 *
 * Flags:
 *   --dry-run     log what WOULD be inserted, write nothing.
 *   --max=<N>     cap the number of objects scanned (default: unlimited).
 *
 * Run:
 *   bun run scripts/backfill-upload-table.ts --dry-run
 *   bun run scripts/backfill-upload-table.ts --max=10000
 */

import { PrismaClient } from '@prisma/client';
import { type BucketItem, Client as MinioClient } from 'minio';
import { inferOwnerFromKeyPath } from '@/bounded-contexts/integration/upload/application/use-cases/delete-upload/delete-upload.use-case';

interface Args {
  readonly dryRun: boolean;
  readonly max: number;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let max = Number.POSITIVE_INFINITY;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--max=')) {
      const n = parseInt(arg.slice('--max='.length), 10);
      if (Number.isInteger(n) && n > 0) max = n;
    }
  }
  return { dryRun, max };
}

interface ParsedEndpoint {
  readonly endPoint: string;
  readonly port: number;
  readonly useSSL: boolean;
}

function parseEndpoint(url: string): ParsedEndpoint {
  const u = new URL(url);
  const useSSL = u.protocol === 'https:';
  const port = u.port ? Number(u.port) : useSSL ? 443 : 80;
  return { endPoint: u.hostname, port, useSSL };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;
  if (!endpoint || !accessKey || !secretKey || !bucket) {
    // eslint-disable-next-line no-console
    console.error(
      'backfill-upload-table: MINIO_* env vars not configured (need ENDPOINT, ACCESS_KEY, SECRET_KEY, BUCKET).',
    );
    return 2;
  }

  const parsed = parseEndpoint(endpoint);
  const minio = new MinioClient({
    endPoint: parsed.endPoint,
    port: parsed.port,
    useSSL: parsed.useSSL,
    accessKey,
    secretKey,
  });
  const prisma = new PrismaClient();

  let scanned = 0;
  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoOwner = 0;

  try {
    const stream = minio.listObjectsV2(bucket, '', true);
    for await (const obj of stream as AsyncIterable<BucketItem>) {
      if (scanned >= args.max) break;
      scanned += 1;
      const key = obj.name;
      if (!key) continue;
      const owner = inferOwnerFromKeyPath(key);
      if (!owner) {
        skippedNoOwner += 1;
        continue;
      }

      const existing = await prisma.upload.findUnique({
        where: { key },
        select: { key: true },
      });
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      if (args.dryRun) {
        // eslint-disable-next-line no-console
        console.log(`[dry-run] would insert key=${key} userId=${owner}`);
      } else {
        await prisma.upload.create({
          data: {
            key,
            userId: owner,
            sizeBytes: typeof obj.size === 'number' ? obj.size : null,
          },
        });
      }
      inserted += 1;
      if (inserted % 100 === 0) {
        // eslint-disable-next-line no-console
        console.log(`progress: scanned=${scanned} inserted=${inserted}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `backfill-upload-table done (${args.dryRun ? 'dry-run' : 'live'}): scanned=${scanned} inserted=${inserted} skippedExisting=${skippedExisting} skippedNoOwner=${skippedNoOwner}`,
    );
    return 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `backfill-upload-table: failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`backfill-upload-table: unexpected error: ${err}`);
    process.exit(2);
  });
