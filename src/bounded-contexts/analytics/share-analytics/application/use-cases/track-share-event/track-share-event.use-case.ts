/**
 * Track Share Event Use Case
 *
 * Tracks VIEW/DOWNLOAD events on shared resumes with GDPR-compliant IP anonymization.
 * Enriches records with UA-derived deviceType/browser/os and optional geo lookup.
 */

import { createHash } from 'node:crypto';
import type { ShareAnalyticsRepositoryPort } from '../../../ports';
import type { GeoLookupPort } from '../../../ports/geo-lookup.port';
import type { AnalyticsEvent } from '../../ports/share-analytics.port';
import { parseUserAgent } from '../../utils/parse-user-agent';

interface TrackEvent {
  shareId: string;
  event: AnalyticsEvent;
  ip: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export class TrackShareEventUseCase {
  constructor(
    private readonly repository: ShareAnalyticsRepositoryPort,
    private readonly geoLookup: GeoLookupPort,
  ) {}

  async execute(dto: TrackEvent) {
    const ipHash = this.anonymizeIP(dto.ip);
    const parsed = parseUserAgent(dto.userAgent);

    let country = dto.country;
    let city = dto.city;
    if (country === undefined || city === undefined) {
      const geo = await this.geoLookup.lookup(dto.ip);
      if (geo) {
        country ??= geo.country ?? undefined;
        city ??= geo.city ?? undefined;
      }
    }

    return this.repository.create({
      shareId: dto.shareId,
      event: dto.event,
      ipHash,
      userAgent: dto.userAgent,
      referer: dto.referer,
      country,
      city,
      deviceType:
        dto.deviceType ?? (parsed.deviceType === 'unknown' ? undefined : parsed.deviceType),
      browser: dto.browser ?? parsed.browser ?? undefined,
      os: dto.os ?? parsed.os ?? undefined,
    });
  }

  private anonymizeIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }
}
