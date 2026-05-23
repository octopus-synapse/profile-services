/**
 * Delete an uploaded file with strict ownership enforcement (P0-005).
 *
 * Closes BUG-027: the previous use case forwarded any `key` straight to
 * S3, so user A could delete user B's uploads if they knew the key.
 *
 * Resolution flow:
 *   1. Look up the `Upload` table for the key.
 *   2. Row present → require `userId === currentUserId`. Mismatch → 403.
 *   3. Row missing → 403. Legacy uploads without an `Upload` row must be
 *      backfilled offline (`scripts/backfill-upload-table.ts`).
 *
 * P2-#6 hardening: the previous "lazy-backfill on first delete" path
 * allowed a malicious caller to seed claims for any key matching their
 * own userId prefix, which (combined with the historic permissive upload
 * service) gave a phantom claim on legacy orphans. The offline backfill
 * is the single source of truth now.
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
    if (owner === null || owner !== currentUserId) {
      throw new OwnershipAccessDeniedException();
    }
  }
}
