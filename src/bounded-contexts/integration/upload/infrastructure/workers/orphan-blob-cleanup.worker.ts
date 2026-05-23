/**
 * P1-060 — orphan blob cleanup worker (DEFERRED, UNWIRED).
 *
 * MinIO/S3 stores the actual file bytes; the `Upload` table records
 * ownership + metadata. A failed DB write between the two leaves a
 * blob with no DB row — orphan storage that grows unbounded.
 *
 * This worker is **intentionally unregistered**. The bootstrap does NOT
 * call `OrphanBlobCleanupWorker.run` — wiring is gated on two pieces of
 * infrastructure that don't ship yet:
 *
 *   1. `S3UploadService.listObjects(prefix, cursor)` — paginated key
 *      enumeration with bucket-millions tolerance.
 *   2. `Upload.deletedAt` schema column — so pass 1 (DB-side cleanup
 *      retry) can find rows where the blob delete failed.
 *
 * BUG_REPORT P2-#31 originally read "wired in cron but no-op" — the
 * cron registration has since been removed, so the file is dead code
 * pending implementation. Leaving the class in place keeps the design
 * intent visible until a follow-up lands both prerequisites + the
 * dry-run-then-enable rollout (7 days of structured logs before any
 * delete is issued).
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
