import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import type { Request } from 'express';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import { FeatureFlagToggledEvent } from '../../domain/events/feature-flag-toggled.event';
import { FeatureFlagRepositoryPort } from '../../domain/ports/feature-flag.repository.port';
import type { FlagRecord } from '../../domain/types';
import { RedisFlagCache } from '../../infrastructure/cache/redis-flag-cache.service';
import { FlagStateService } from '../services/flag-state.service';

export interface ToggleFlagInput {
  key: string;
  enabled?: boolean;
  enabledForRoles?: string[];
  actorId: string;
  request?: Request;
}

@Injectable()
export class ToggleFlagUseCase {
  constructor(
    private readonly repo: FeatureFlagRepositoryPort,
    private readonly cache: RedisFlagCache,
    private readonly state: FlagStateService,
    private readonly audit: AuditLogService,
    private readonly events: EventPublisher,
  ) {}

  async execute(input: ToggleFlagInput): Promise<FlagRecord> {
    const current = await this.repo.findByKey(input.key);
    if (!current) throw new NotFoundException(`Feature flag "${input.key}" not found`);
    if (current.deprecated) {
      throw new BadRequestException(
        `Flag "${input.key}" is deprecated and cannot be toggled. Remove it from the registry or re-add and redeploy.`,
      );
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

    await this.audit.log(
      input.actorId,
      AuditAction.FEATURE_FLAG_TOGGLED,
      'FeatureFlag',
      input.key,
      { before, after },
      input.request,
    );

    this.events.publish(
      new FeatureFlagToggledEvent({ key: input.key, before, after, actorId: input.actorId }),
    );

    return updated;
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
        throw new ConflictException(
          `Cannot enable "${flag.key}": parent flag "${parent.key}" is disabled`,
        );
      }
      stack.push(...parent.dependsOn);
    }
  }
}
