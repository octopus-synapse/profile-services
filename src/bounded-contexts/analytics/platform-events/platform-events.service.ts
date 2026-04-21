import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { TrackEventsBodyDto } from './dto/track-event.dto';

@Injectable()
export class PlatformEventsService {
  private readonly logger = new Logger(PlatformEventsService.name);
  private readonly posthogHost?: string;
  private readonly posthogApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.posthogHost = config.get<string>('POSTHOG_HOST');
    this.posthogApiKey = config.get<string>('POSTHOG_API_KEY');
  }

  async ingest(userId: string | null, body: TrackEventsBodyDto): Promise<{ accepted: number }> {
    const rows = body.events.map((e) => ({
      userId,
      event: e.event,
      props: (e.props ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      occurredAt: new Date(e.occurredAt),
    }));

    // Always persist to PlatformEvent first — backend audit trail + fallback if
    // PostHog is down. PostHog forward is best-effort so a PostHog outage never
    // drops user-facing requests.
    const result = await this.prisma.platformEvent.createMany({ data: rows });
    void this.forwardToPostHog(userId, body);
    return { accepted: result.count };
  }

  private async forwardToPostHog(userId: string | null, body: TrackEventsBodyDto): Promise<void> {
    if (!this.posthogHost || !this.posthogApiKey) return;
    const batch = body.events.map((e) => ({
      event: e.event,
      properties: { ...(e.props ?? {}), distinct_id: userId ?? 'anonymous' },
      timestamp: e.occurredAt,
      distinct_id: userId ?? 'anonymous',
    }));
    try {
      await fetch(`${this.posthogHost.replace(/\/$/, '')}/batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.posthogApiKey, batch }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (err) {
      this.logger.warn(`PostHog forward failed: ${(err as Error).message}`);
    }
  }
}
