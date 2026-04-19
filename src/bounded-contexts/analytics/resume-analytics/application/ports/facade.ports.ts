/**
 * Facade Ports
 *
 * Abstractions for application-layer services consumed by other use-cases.
 * Concrete use-cases implement these ports so that composers (dashboard, benchmark)
 * depend on contracts, not on sibling use-case classes (DIP on the application layer).
 */

import type { ResumeForAnalytics } from '../../domain/types';
import type { ATSScoreResult, ViewStats, ViewStatsOptions } from '../../interfaces';

export abstract class AtsScoringPort {
  abstract calculate(resume: ResumeForAnalytics, resumeId?: string): Promise<ATSScoreResult>;
}

export abstract class ViewStatsProviderPort {
  abstract getViewStats(resumeId: string, options: ViewStatsOptions): Promise<ViewStats>;
}
