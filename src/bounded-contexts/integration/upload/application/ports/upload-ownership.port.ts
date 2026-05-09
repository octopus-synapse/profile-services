/**
 * Source-of-truth port for S3 upload ownership (P0-005).
 *
 * Backed by the `Upload` table — every PUT through `S3UploadService`
 * inserts a row, and `DeleteUploadUseCase` consults it before forwarding
 * to S3. The port stays repository-agnostic so tests can stub it
 * without provisioning Prisma.
 *
 * Lazy backfill semantics: `findOwner` returns `null` for legacy keys
 * inserted before the table existed. `recordIfMissing` is the
 * idempotent insert used by the use case to backfill on first delete
 * (after path-based ownership inference clears the requester).
 */

export interface UploadRecord {
  readonly key: string;
  readonly userId: string;
}

export abstract class UploadOwnershipPort {
  /** Returns the recorded owner for the key, or `null` when no row
   *  exists (legacy upload — caller may attempt lazy backfill). */
  abstract findOwner(key: string): Promise<string | null>;

  /** Record a new upload's ownership (called from S3UploadService
   *  after a successful PUT). Throws on duplicate key. */
  abstract record(record: {
    key: string;
    userId: string;
    contentType?: string;
    sizeBytes?: number;
  }): Promise<void>;

  /** Idempotent insert for lazy backfill — silent no-op if a row
   *  already exists for the key. */
  abstract recordIfMissing(record: { key: string; userId: string }): Promise<void>;
}
