/**
 * Get View Stats Use Case
 *
 * Retrieves view statistics for a resume.
 */

import { LoggerPort } from '@/shared-kernel';
import type { ViewStats, ViewStatsOptions } from '../../../interfaces';
import { ViewStatsProviderPort } from '../../ports/facade.ports';
import { ResumeOwnershipPort, ViewTrackingRepositoryPort } from '../../ports/resume-analytics.port';

export class GetViewStatsUseCase extends ViewStatsProviderPort {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly viewTrackingRepo: ViewTrackingRepositoryPort,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async execute(resumeId: string, userId: string, options: ViewStatsOptions): Promise<ViewStats> {
    await this.ownership.verifyOwnership(resumeId, userId);
    return this.getViewStats(resumeId, options);
  }

  async getViewStats(resumeId: string, options: ViewStatsOptions): Promise<ViewStats> {
    const { startDate, endDate } = this.getDateRange(options.period);

    const [totalViews, uniqueVisitors] = await Promise.all([
      this.viewTrackingRepo.countViews(resumeId, startDate, endDate),
      this.viewTrackingRepo.countUniqueVisitors(resumeId, startDate, endDate),
    ]);

    return { totalViews, uniqueVisitors, viewsByDay: [], topSources: [] };
  }

  private getDateRange(period: 'day' | 'week' | 'month' | 'year'): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }
}
