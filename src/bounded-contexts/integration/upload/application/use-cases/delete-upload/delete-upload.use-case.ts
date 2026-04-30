/**
 * Forwards a delete to the file storage adapter.
 *
 * NOTE: there is NO ownership check here. The legacy security spec
 * documents this as a known gap (BUG-027): the controller currently
 * accepts any key. Wiring an authorization check belongs in a
 * follow-up — this use case preserves the existing behavior so the
 * refactor stays scope-bounded.
 */

import type { LoggerPort } from '@/shared-kernel';
import { FileStoragePort } from '../../../domain/ports/file-storage.port';

const CTX = 'DeleteUploadUseCase';

export class DeleteUploadUseCase {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(key: string): Promise<boolean> {
    const deleted = await this.storage.deleteFile(key);
    if (deleted) this.logger.log(`File deleted key=${key}`, CTX);
    return deleted;
  }
}
