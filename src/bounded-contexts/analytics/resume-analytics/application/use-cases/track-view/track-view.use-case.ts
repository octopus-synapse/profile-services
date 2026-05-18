import { LoggerPort } from '@/shared-kernel';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { pseudoAnonymize } from '@/shared-kernel/crypto/pseudo-anonymize';
import { AnalyticsConsentRequiredException } from '../../../../domain/exceptions/analytics.exceptions';
import { TRAFFIC_SOURCES } from '../../../domain/value-objects/traffic-sources';
import type { TrackView } from '../../../interfaces';
import { AnalyticsEventBusPort } from '../../ports/analytics-event-bus.port';
import { ResumeOwnershipPort, ViewTrackingRepositoryPort } from '../../ports/resume-analytics.port';

export class TrackViewUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly viewTrackingRepo: ViewTrackingRepositoryPort,
    private readonly eventBus: AnalyticsEventBusPort,
    private readonly logger: LoggerPort,
    private readonly config: ConfigPort,
  ) {}

  async execute(input: TrackView): Promise<void> {
    if (input.consent === false) {
      throw new AnalyticsConsentRequiredException();
    }
    await this.ownership.verifyResumeExists(input.resumeId);

    const ipHash = this.anonymizeIP(input.ip);
    const source = this.detectSource(input.referer);

    await this.viewTrackingRepo.trackView({
      resumeId: input.resumeId,
      ipHash,
      userAgent: input.userAgent,
      referer: input.referer,
      country: input.country,
      city: input.city,
      source,
    });

    const now = new Date();
    const totalViews = await this.viewTrackingRepo.countViews(input.resumeId, new Date(0), now);

    this.eventBus.emit(`analytics:${input.resumeId}:view`, {
      type: 'view',
      resumeId: input.resumeId,
      data: { views: totalViews, timestamp: now },
    });
  }

  private anonymizeIP(ip: string): string {
    return pseudoAnonymize(ip, this.config);
  }

  private detectSource(referer?: string): string {
    if (!referer) return 'direct';
    // P2-#15: parse the URL and compare hostname *labels* instead of
    // substring includes. `https://evil.com/?ref=google.com` used to
    // be classified as "google" via the previous `includes` match.
    // `URL.canParse` pre-checks without a try/catch so this stays a
    // pure function.
    if (!URL.canParse(referer)) return 'other';
    const labels = new Set(new URL(referer).hostname.toLowerCase().split('.'));
    for (const [domain, source] of Object.entries(TRAFFIC_SOURCES)) {
      if (labels.has(domain.toLowerCase())) return source;
    }
    return 'other';
  }
}
