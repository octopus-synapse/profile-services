/**
 * Trigger one MEC synchronization run. Returns the orchestrator's
 * result so the controller can serialize the counts directly.
 */

import type { SyncResult } from '../../../domain/entities/mec-row';
import { MecSyncService } from '../../services/mec-sync.service';

export class TriggerMecSyncUseCase {
  constructor(private readonly orchestrator: MecSyncService) {}

  execute(triggeredBy: string = 'api'): Promise<SyncResult> {
    return this.orchestrator.sync(triggeredBy);
  }
}
