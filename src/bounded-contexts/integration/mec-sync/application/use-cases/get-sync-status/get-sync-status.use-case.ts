/**
 * Surface the current sync status: in-flight flag, last metadata
 * snapshot, and last log row. The controller serializes these via the
 * flexible passthrough schema.
 */

import type { SyncMetadata } from '../../../domain/entities/mec-row';
import type { SyncLogRow } from '../../../domain/ports/mec-sync-log.repository.port';
import { MecSyncService } from '../../services/mec-sync.service';

export interface SyncStatusResult {
  isRunning: boolean;
  metadata: SyncMetadata | null;
  lastSync: SyncLogRow | null;
}

export class GetSyncStatusUseCase {
  constructor(private readonly orchestrator: MecSyncService) {}

  async execute(): Promise<SyncStatusResult> {
    const [isRunning, metadata, lastSync] = await Promise.all([
      this.orchestrator.isSyncRunning(),
      this.orchestrator.getSyncMetadata(),
      this.orchestrator.getLastSyncLog(),
    ]);
    return { isRunning, metadata, lastSync };
  }
}
