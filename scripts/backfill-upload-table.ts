#!/usr/bin/env bun
/**
 * P0-005 follow-up: backfill the `Upload` table with rows for legacy
 * S3 keys that pre-date the table.
 *
 * Without this script, legacy uploads stay in "limbo" — the per-delete
 * lazy backfill (in `DeleteUploadUseCase`) eventually catches up, but
 * a user requesting LGPD right-to-erasure may need the rows present
 * up-front so a single bulk-delete sweep can scope the right keys.
 *
 * Approach:
 *   1. List every object in `MINIO_BUCKET` via `ListObjectsV2`,
 *      paginating with `ContinuationToken` until the bucket is drained.
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

import { type _Object, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
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

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    // eslint-disable-next-line no-console
    console.error(
      'backfill-upload-table: MINIO_* env vars not configured (need ENDPOINT, ACCESS_KEY, SECRET_KEY, BUCKET).',
    );
    return 2;
  }

  const s3 = new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  const prisma = new PrismaClient();

  let scanned = 0;
  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoOwner = 0;
  let token: string | undefined;

  try {
    do {
      const out = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: token,
          MaxKeys: 1000,
        }),
      );
      const contents: _Object[] = out.Contents ?? [];
      for (const obj of contents) {
        if (scanned >= args.max) break;
        scanned += 1;
        if (!obj.Key) continue;
        const owner = inferOwnerFromKeyPath(obj.Key);
        if (!owner) {
          skippedNoOwner += 1;
          continue;
        }

        const existing = await prisma.upload.findUnique({
          where: { key: obj.Key },
          select: { key: true },
        });
        if (existing) {
          skippedExisting += 1;
          continue;
        }

        if (args.dryRun) {
          // eslint-disable-next-line no-console
          console.log(`[dry-run] would insert key=${obj.Key} userId=${owner}`);
        } else {
          await prisma.upload.create({
            data: {
              key: obj.Key,
              userId: owner,
              sizeBytes: typeof obj.Size === 'number' ? obj.Size : null,
            },
          });
        }
        inserted += 1;
        if (inserted % 100 === 0) {
          // eslint-disable-next-line no-console
          console.log(`progress: scanned=${scanned} inserted=${inserted}`);
        }
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token && scanned < args.max);

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
