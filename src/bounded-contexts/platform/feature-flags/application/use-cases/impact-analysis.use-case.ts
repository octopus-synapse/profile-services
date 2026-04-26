import { Injectable } from '@nestjs/common';
import { FeatureFlagNotFoundException } from '../../domain/exceptions/feature-flag.exceptions';
import { buildImpactTree } from '../../domain/feature-flag-graph';
import type { FlagImpactTree } from '../../domain/types';
import { FlagStateService } from '../services/flag-state.service';

@Injectable()
export class ImpactAnalysisUseCase {
  constructor(private readonly state: FlagStateService) {}

  async execute(key: string): Promise<FlagImpactTree> {
    const flags = await this.state.getAll();
    const target = flags.find((f) => f.key === key);
    if (!target) throw new FeatureFlagNotFoundException(key);
    return buildImpactTree(flags, key);
  }
}
