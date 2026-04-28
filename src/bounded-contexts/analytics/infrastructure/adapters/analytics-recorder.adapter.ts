import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { AnalyticsRecorder } from '../../application/handlers';

/**
 * Adapter that implements the AnalyticsRecorder port.
 *
 * Decision: This adapter records resume creation events for analytics tracking.
 * It creates an initial ResumeAnalytics record when a resume is created.
 *
 * Trade-off: Initial scores are set to 0. Full score calculation happens
 * when user explicitly requests analytics via the controller.
 */
@Injectable()
export class AnalyticsRecorderAdapter implements AnalyticsRecorder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async recordResumeCreation(resumeId: string, userId: string): Promise<void> {
    this.logger.debug(
      `Recording analytics for new resume: ${resumeId}, user: ${userId}`,
      'AnalyticsRecorderAdapter',
    );

    // Score columns were moved out of ResumeAnalytics into the scoring/
    // subsystem (see docs/scoring/README.md). This row is kept as an
    // anchor for view-tracking only.
    await this.prisma.resumeAnalytics.create({ data: { resumeId } });
  }
}
