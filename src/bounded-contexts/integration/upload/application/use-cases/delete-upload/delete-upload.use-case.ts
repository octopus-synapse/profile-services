/**
 * Delete an uploaded file with strict ownership enforcement (P0-005).
 *
 * Closes BUG-027: the previous use case forwarded any `key` straight to
 * S3, so user A could delete user B's uploads if they knew the key.
 *
 * Resolution flow:
 *   1. Look up the `Upload` table for the key.
 *   2. Row exists → require `userId === currentUserId`. Mismatch → 403.
 *   3. Row missing (legacy upload) → infer userId from the path
 *      convention `<userId>/...`. If the inferred id matches the
 *      requester, lazy-backfill the row and proceed. Otherwise → 403.
 *   4. Forward to S3.
 *
 * The lazy backfill keeps the migration zero-downtime: legacy uploads
 * uploaded before the `Upload` table existed remain deletable by their
 * actual owner (LGPD right-to-erasure) and progressively become
 * tracked rows on first delete.
 */

import type { LoggerPort } from '@/shared-kernel';
import { OwnershipAccessDeniedException } from '@/shared-kernel/authorization';
import { FileStoragePort } from '../../../domain/ports/file-storage.port';
import type { UploadOwnershipPort } from '../../ports/upload-ownership.port';

const CTX = 'DeleteUploadUseCase';

export class DeleteUploadUseCase {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly ownership: UploadOwnershipPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(key: string, currentUserId: string): Promise<boolean> {
    await this.assertOwnership(key, currentUserId);
    const deleted = await this.storage.deleteFile(key);
    if (deleted) this.logger.log(`File deleted key=${key} by=${currentUserId}`, CTX);
    return deleted;
  }

  private async assertOwnership(key: string, currentUserId: string): Promise<void> {
    const owner = await this.ownership.findOwner(key);
    if (owner !== null) {
      if (owner !== currentUserId) throw new OwnershipAccessDeniedException();
      return;
    }
    // Legacy upload (pre-Upload-table): infer owner from path convention.
    const inferred = inferOwnerFromKeyPath(key);
    if (inferred === null || inferred !== currentUserId) {
      throw new OwnershipAccessDeniedException();
    }
    // Backfill so subsequent deletes hit the fast path.
    await this.ownership.recordIfMissing({ key, userId: currentUserId });
    this.logger.log(`Upload ownership lazy-backfilled key=${key} userId=${currentUserId}`, CTX);
  }
}

/**
 * Path convention: S3 keys for user-scoped uploads start with the
 * userId segment (`<userId>/<file>` or `<prefix>/<userId>/<file>`).
 * Returns the second-to-last hierarchy segment when it looks like a
 * user identifier (UUID-like or non-empty token), else `null`.
 */
export function inferOwnerFromKeyPath(key: string): string | null {
  const parts = key.split('/').filter((p) => p.length > 0);
  if (parts.length < 2) return null;
  // Most common convention: `<userId>/<file>` — first segment.
  // Fallback: `<prefix>/<userId>/<file>` — second segment.
  // Pick whichever looks like an id (UUID-ish or 16+ chars).
  const candidates = parts.length >= 3 ? [parts[1], parts[0]] : [parts[0]];
  const idLike = candidates.find((c) => looksLikeId(c));
  return idLike ?? null;
}

function looksLikeId(s: string): boolean {
  // UUID v4/v7 hex form (with or without dashes), or any opaque token
  // 16+ chars without slashes/dots — defensive enough for paths the
  // app actually generates while rejecting common fixed prefixes
  // (`exports`, `profile`, `logos`, ...).
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  if (/^[0-9a-f]{32}$/i.test(s)) return true;
  return s.length >= 16 && !/[\\.\s]/.test(s);
}
