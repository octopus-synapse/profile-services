import { LoggerPort } from '@/shared-kernel';
import { evaluateFlags } from '../../domain/feature-flag-graph.service';
import type { FlagEvaluationSnapshot } from '../../domain/types';
import type { FlagCachePort } from '../ports/flag-cache.port';
import { FlagStateService } from '../services/flag-state.service';

export class EvaluateFlagsUseCase {
  constructor(
    private readonly state: FlagStateService,
    private readonly cache: FlagCachePort,
    private readonly logger: LoggerPort,
  ) {
    void this.logger;
  }

  async execute(userRoles: readonly string[]): Promise<FlagEvaluationSnapshot> {
    const fingerprint = this.cache.fingerprintRoles(userRoles);
    const cached = await this.cache.getSnapshot(fingerprint);
    if (cached) return cached;

    const flags = await this.state.getAll();
    const snapshot = evaluateFlags(flags, userRoles);
    await this.cache.setSnapshot(fingerprint, snapshot);
    return snapshot;
  }

  /**
   * Check a single flag for a given user. Uses the full snapshot so the
   * dependency chain is resolved correctly (a flag can be OFF because of an
   * ancestor, not its own toggle).
   */
  async isEnabled(key: string, userRoles: readonly string[]): Promise<boolean> {
    const snapshot = await this.execute(userRoles);
    return snapshot[key] === true;
  }
}
