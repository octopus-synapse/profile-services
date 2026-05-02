import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { FeatureFlagToggledEvent } from '../../domain/events/feature-flag-toggled.event';
import {
  FeatureFlagDeprecatedException,
  FeatureFlagInvalidInputException,
  FeatureFlagNotFoundException,
  FeatureFlagParentDisabledException,
} from '../../domain/exceptions/feature-flag.exceptions';
import { FeatureFlagRepositoryPort } from '../../domain/ports/feature-flag.repository.port';
import type { FlagRecord } from '../../domain/types';
import type { FlagAuditPort } from '../ports/flag-audit.port';
import type { FlagCachePort } from '../ports/flag-cache.port';
import { FlagStateService } from '../services/flag-state.service';

export interface ToggleFlagInput {
  key: string;
  enabled?: boolean;
  enabledForRoles?: string[];
  actorId: string;
  /** Untyped on purpose — opaque request handle the audit adapter
   *  uses to extract IP / UA / referer. The Nest adapter passes
   *  Express's `Request`; the Elysia adapter passes the `HttpCtx`. */
  request?: unknown;
}

export class ToggleFlagUseCase {
  constructor(
    private readonly repo: FeatureFlagRepositoryPort,
    private readonly cache: FlagCachePort,
    private readonly state: FlagStateService,
    private readonly audit: FlagAuditPort,
    private readonly events: EventBusPort,
    private readonly logger: LoggerPort,
  ) {
    void this.logger;
  }

  async execute(input: ToggleFlagInput): Promise<FlagRecord> {
    this.assertValidInput(input);

    const current = await this.repo.findByKey(input.key);
    if (!current) throw new FeatureFlagNotFoundException(input.key);
    if (current.deprecated) {
      throw new FeatureFlagDeprecatedException(input.key);
    }

    if (input.enabled === true && !current.enabled) {
      await this.assertParentsEnabled(current);
    }

    const before = { enabled: current.enabled, enabledForRoles: [...current.enabledForRoles] };
    const updated = await this.repo.update(input.key, {
      enabled: input.enabled,
      enabledForRoles: input.enabledForRoles,
    });
    const after = { enabled: updated.enabled, enabledForRoles: [...updated.enabledForRoles] };

    this.state.markStale();
    await this.cache.invalidateAll(input.key);

    await this.audit.logFlagToggle({
      actorId: input.actorId,
      flagKey: input.key,
      changes: { before, after },
      request: input.request,
    });

    this.events.publish(
      new FeatureFlagToggledEvent({ key: input.key, before, after, actorId: input.actorId }),
    );

    return updated;
  }

  /**
   * Reject zero-information toggle calls before we hit the repository.
   * The route layer also validates with zod, but ports are exposed
   * outside HTTP (CLI bootstrap, integration tests) so we keep the
   * domain guard.
   */
  private assertValidInput(input: ToggleFlagInput): void {
    if (!input.key || input.key.trim().length === 0) {
      throw new FeatureFlagInvalidInputException('key must be a non-empty string');
    }
    if (!input.actorId || input.actorId.trim().length === 0) {
      throw new FeatureFlagInvalidInputException('actorId must be a non-empty string');
    }
    if (input.enabled === undefined && input.enabledForRoles === undefined) {
      throw new FeatureFlagInvalidInputException(
        'at least one of "enabled" or "enabledForRoles" must be provided',
      );
    }
  }

  /**
   * Enforce: you can't turn ON a flag whose any ancestor is OFF. Walk the
   * DAG and surface the first blocking parent so the UI can show a clear
   * "Bloqueado por: X" message.
   */
  private async assertParentsEnabled(flag: FlagRecord): Promise<void> {
    if (flag.dependsOn.length === 0) return;
    const all = await this.state.getAll();
    const byKey = new Map(all.map((f) => [f.key, f]));
    const stack = [...flag.dependsOn];
    const seen = new Set<string>();

    while (stack.length > 0) {
      const k = stack.pop();
      if (k === undefined) break; // unreachable — while-guard above — but satisfies the type narrow
      if (seen.has(k)) continue;
      seen.add(k);
      const parent = byKey.get(k);
      if (!parent) continue;
      if (!parent.enabled) {
        throw new FeatureFlagParentDisabledException(flag.key, parent.key);
      }
      stack.push(...parent.dependsOn);
    }
  }
}
