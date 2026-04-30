/**
 * Page through the persisted MEC sync log rows, newest first.
 */

import type { SyncLogRow } from '../../../domain/ports/mec-sync-log.repository.port';
import { MecSyncService } from '../../services/mec-sync.service';

export class GetSyncHistoryUseCase {
  constructor(private readonly orchestrator: MecSyncService) {}

  execute(limit: number): Promise<SyncLogRow[]> {
    return this.orchestrator.getSyncHistory(limit);
  }
}
