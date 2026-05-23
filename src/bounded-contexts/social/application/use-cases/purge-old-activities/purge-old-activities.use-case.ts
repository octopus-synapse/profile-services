import { ValidationException } from '@/shared-kernel/exceptions';
import { ActivityRepositoryPort } from '../../ports/activity.port';

export class PurgeOldActivitiesUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(days: number): Promise<number> {
    // P2-#17: `days <= 0` would set the cutoff to now (or the future)
    // and wipe every row. Refuse explicitly so a typo / negative env
    // var can't truncate the table silently.
    if (!Number.isInteger(days) || days < 1) {
      throw new ValidationException(
        `PurgeOldActivities: days must be an integer >= 1 (got ${days})`,
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.repository.deleteOlderThan(cutoffDate);
  }
}
