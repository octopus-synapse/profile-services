import type { ConfigPort } from '@/shared-kernel/config/config.port';
import type { DomainEvent } from '@/shared-kernel/event-bus';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { DogStatsdClient, tag } from './dogstatsd.client';
import { TelemetrySanitizer } from './telemetry-sanitizer';

export interface HttpRequestTelemetry {
  readonly method: string;
  readonly route: string;
  readonly status: number;
  readonly durationMs: number;
}

export class DatadogTelemetryService implements Lifecycle {
  readonly enabled: boolean;
  readonly productEventsEnabled: boolean;
  readonly env: string;
  readonly service: string;
  readonly version: string;
  readonly sanitizer: TelemetrySanitizer;

  private readonly dogstatsd: DogStatsdClient;

  constructor(
    private readonly config: ConfigPort,
    private readonly logger: LoggerPort,
  ) {
    this.enabled = config.env.DD_OBSERVABILITY_ENABLED === true;
    this.productEventsEnabled = this.enabled && config.env.DD_PRODUCT_EVENTS_ENABLED === true;
    this.env = config.env.DD_ENV ?? config.env.NODE_ENV;
    this.service = config.env.DD_SERVICE ?? 'profile-services';
    this.version = config.env.DD_VERSION ?? config.env.APP_VERSION ?? 'unknown';
    this.sanitizer = new TelemetrySanitizer(config);
    this.dogstatsd = new DogStatsdClient(
      {
        enabled: this.enabled,
        host: config.env.DD_DOGSTATSD_HOST ?? config.env.DD_AGENT_HOST ?? '127.0.0.1',
        port: config.env.DD_DOGSTATSD_PORT ?? 8125,
        namespace: 'profile_services.',
        constantTags: [`env:${this.env}`, `service:${this.service}`, `version:${this.version}`],
      },
      logger,
    );
  }

  async init(): Promise<void> {
    await this.dogstatsd.init();
  }

  async dispose(): Promise<void> {
    await this.dogstatsd.dispose();
  }

  hashIdentifier(value: string | undefined | null): string | undefined {
    return this.sanitizer.hashIdentifier(value);
  }

  recordHttpRequest(input: HttpRequestTelemetry): void {
    if (!this.enabled) return;
    const statusClass = `${Math.floor(input.status / 100)}xx`;
    const tags = compactTags([
      tag('method', input.method),
      tag('route', input.route),
      tag('status', input.status),
      tag('status_class', statusClass),
    ]);
    this.dogstatsd.increment('http.requests', 1, tags);
    this.dogstatsd.histogram('http.request.duration_ms', input.durationMs, tags);
    if (input.status >= 500) this.dogstatsd.increment('http.errors', 1, tags);
  }

  recordDomainEvent(event: DomainEvent): void {
    if (!this.enabled) return;
    const eventTags = this.sanitizer.lowCardinalityTags(event);
    const tags = compactTags(Object.entries(eventTags).map(([key, value]) => tag(key, value)));
    this.dogstatsd.increment('domain.events', 1, tags);
    this.logger.log('Domain event telemetry', 'DatadogTelemetry', {
      telemetry: this.sanitizer.sanitizeDomainEvent(event),
    });

    if (!this.productEventsEnabled) return;
    this.dogstatsd.event(
      `profile-services ${event.eventType}`,
      `Domain event ${event.eventType} occurred in ${this.env}`,
      tags,
    );
  }
}

function compactTags(tags: ReadonlyArray<string | undefined>): string[] {
  return tags.filter((value): value is string => typeof value === 'string' && value.length > 0);
}
