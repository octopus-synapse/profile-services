import type { ActivityRepositoryPort } from '../../ports/activity.port';

export class PurgeOldActivitiesUseCase {
  constructor(private readonly repository: ActivityRepositoryPort) {}

  async execute(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.repository.deleteOlderThan(cutoffDate);
  }
}
