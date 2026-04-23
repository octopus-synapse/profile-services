import { Injectable } from '@nestjs/common';
import { evaluateFlags } from '../../domain/feature-flag-graph';
import type { FlagRecord } from '../../domain/types';
import { FlagStateService } from '../services/flag-state.service';

export interface FlagAdminRow extends FlagRecord {
  effectiveGlobal: boolean;
  blockedBy: string[];
}

@Injectable()
export class ListFlagsUseCase {
  constructor(private readonly state: FlagStateService) {}

  async execute(): Promise<FlagAdminRow[]> {
    const flags = await this.state.getAll();
    // Global view: no role restriction applied — just whether parents and own
    // `enabled` are ON. Role-scoped evaluation is the user-facing concern.
    const evaluated = evaluateFlags(
      flags.map((f) => ({ ...f, enabledForRoles: [] })),
      [],
    );
    const byKey = new Map(flags.map((f) => [f.key, f]));

    return flags.map((f) => ({
      ...f,
      effectiveGlobal: evaluated[f.key] === true,
      blockedBy: f.dependsOn.filter((d) => {
        const parent = byKey.get(d);
        return parent ? !parent.enabled : false;
      }),
    }));
  }
}
