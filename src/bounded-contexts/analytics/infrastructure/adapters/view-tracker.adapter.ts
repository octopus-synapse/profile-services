import { Injectable } from '@nestjs/common';
import { LoggerPort } from '@/shared-kernel';
import { ViewTracker } from '../../application/handlers';

/**
 * Adapter that implements the ViewTracker port.
 *
 * Decision: This adapter tracks which fields were updated in a resume.
 * Currently logs for observability; can be extended to store update patterns.
 *
 * Trade-off: Minimal implementation to enable handler registration.
 * The actual analytics tracking happens through ViewTrackingService
 * when external viewers access resumes.
 */
@Injectable()
export class ViewTrackerAdapter implements ViewTracker {
  constructor(private readonly logger: LoggerPort) {}

  async trackResumeUpdate(resumeId: string, fields: readonly string[]): Promise<void> {
    this.logger.debug(
      `Resume ${resumeId} updated fields: ${fields.join(', ')}`,
      'ViewTrackerAdapter',
    );

    // Future: Could track update frequency patterns for analytics
    // e.g., which sections are most frequently edited
    return Promise.resolve();
  }
}
