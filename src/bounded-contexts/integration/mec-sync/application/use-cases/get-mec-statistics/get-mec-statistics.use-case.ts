/**
 * Aggregate MEC statistics for the public stats endpoint.
 */

import type { MecStats } from '../../../schemas/mec.schema';
import { MecStatsService } from '../../services/mec-stats.service';

export class GetMecStatisticsUseCase {
  constructor(private readonly statsService: MecStatsService) {}

  execute(): Promise<MecStats> {
    return this.statsService.getMecStatistics();
  }
}
