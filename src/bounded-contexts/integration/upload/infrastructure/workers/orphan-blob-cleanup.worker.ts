/**
 * P1-060 — orphan blob cleanup worker (stub).
 *
 * MinIO/S3 stores the actual file bytes; the `Upload` table records
 * ownership + metadata. A failed DB write between the two leaves a
 * blob with no DB row — orphan storage that grows unbounded.
 *
 * This worker reconciles them: enumerate every object under the
 * `posts/`, `photos/`, and `logos/` prefixes; drop any blob older
 * than `ORPHAN_GRACE_HOURS` whose key has no matching `Upload` row.
 *
 * IMPORTANT: this file currently exposes the wrapped `runGuardedJob`
 * skeleton without the MinIO list-objects implementation — that
 * requires either upgrading `S3UploadService` to expose a
 * `listObjects(prefix, cursor)` method or piping the MinIO admin
 * client straight in. Both are non-trivial because they need to
 * paginate (a single bucket can have millions of keys) and respect
 * the same configuration knobs as the rest of the storage stack.
 *
 * The skeleton lives here so the wiring + cron schedule are visible
 * during review and the implementation PR is a contained edit. The
 * worker registers via the same `JobQueuePort.register` path as the
 * rest of the platform jobs; the cron runs daily at 03:30 UTC
 * (chosen to overlap with the lowest traffic window).
 */

import type { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';

const CTX = 'OrphanBlobCleanupWorker';
const EXPECTED_DURATION_MS = 5 * 60_000; // 5 minutes p99 estimate
/** Don't delete a blob younger than this — covers the
 *  Upload-row-write-after-blob-write race window. */
const ORPHAN_GRACE_HOURS = 24;

export class OrphanBlobCleanupWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: S3UploadService,
    private readonly logger: LoggerPort,
    private readonly lock: DistributedLockPort,
  ) {}

  async run(): Promise<void> {
    await runGuardedJob(
      {
        name: CTX,
        expectedDurationMs: EXPECTED_DURATION_MS,
        failureMode: 'LOG_AND_CONTINUE',
        lock: this.lock,
        logger: this.logger,
      },
      async () => {
        // TODO(P1-060) — wire up the actual reconciliation pass:
        //   1. Enumerate Upload rows older than ORPHAN_GRACE_HOURS
        //      that already have a `deletedAt` set (deleted from DB
        //      but the blob delete may have failed).
        //   2. Issue best-effort `storage.deleteObject(key)` for each.
        //   3. Optionally enumerate raw S3 keys with no Upload row at
        //      all (covers crash-after-PUT-before-INSERT race) and
        //      delete those too.
        // Both passes must be paginated — a bucket can hold millions
        // of objects.
        this.logger.warn(
          'Orphan blob cleanup is wired but no-ops until the reconciliation impl lands',
          CTX,
          { graceHours: ORPHAN_GRACE_HOURS },
        );
        // touch deps so TS can see they're held — drop when impl lands
        void this.prisma;
        void this.storage;
      },
    );
  }
}
